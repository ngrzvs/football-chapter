import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import {
  RULES_VERSION,
  type ChallengeSpec,
  type CountryCode,
  type Position,
  type RunResult,
  type RunSubmission,
} from "@football/protocol";
import { getChallenge, getPositionRank, insertChallenge, insertRun, listRuns } from "./repository";
import { computeScore, hashCareerState, hashReplay, replayChallenge, validateCommandLog } from "./replay";
import {
  ApiError,
  enforceRateLimit,
  hmacSha256,
  readJsonLimited,
  sanitizePseudonym,
  stableStringify,
  verifyTurnstile,
} from "./security";
import type { Bindings, RunRow } from "./types";

const app = new Hono<{ Bindings: Bindings }>();
const MAX_RUN_BYTES = 512 * 1_024;
const MAX_ANALYTICS_BYTES = 32 * 1_024;
const COUNTRIES = new Set<CountryCode>(["FR", "EN", "ES", "IT", "DE", "BR"]);
const POSITIONS = new Set<Position>(["GK", "LB", "CB", "RB", "DM", "CM", "AM", "LW", "RW", "SS", "ST", "CF"]);
const ANALYTICS_KINDS = new Set([
  "screen_view",
  "career_created",
  "match_started",
  "match_resolved",
  "offline_ready",
  "challenge_submitted",
]);
const ANALYTICS_KEYS = new Set(["screen", "language", "difficulty", "position", "result", "durationMs", "fps", "deviceClass"]);
const ANALYTICS_VALUES: Record<string, ReadonlySet<string>> = {
  screen: new Set(["hub", "player", "club", "world", "archives", "match", "onboarding", "challenge"]),
  language: new Set(["fr", "en"]),
  difficulty: new Set(["assisted", "standard", "expert"]),
  position: new Set<string>(POSITIONS),
  result: new Set(["success", "failure", "simulated", "draw", "win", "loss"]),
  deviceClass: new Set(["low", "mid", "high"]),
};

app.use("*", secureHeaders());
app.use("/api/*", async (context, next) => {
  await next();
  context.header("Cache-Control", "no-store");
  context.header("X-Content-Type-Options", "nosniff");
});

function database(env: Bindings): D1Database {
  if (!env.DB) {
    throw new ApiError(
      503,
      "storage_not_configured",
      "D1 n'est pas configuré. Utilisez `wrangler dev` avec la migration locale appliquée.",
    );
  }
  return env.DB;
}

function signingSecret(env: Bindings): string {
  if (env.HMAC_SECRET) return env.HMAC_SECRET;
  if (env.ENVIRONMENT !== "production") return "development-only-hmac-secret";
  throw new ApiError(503, "signing_not_configured", "La clé de signature HMAC n'est pas configurée.");
}

function assertActive(challenge: ChallengeSpec): void {
  if (Date.parse(challenge.expiresAt) <= Date.now()) {
    throw new ApiError(422, "challenge_expired", "Ce défi a expiré.");
  }
}

function challengeId(raw: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw)) {
    throw new ApiError(404, "challenge_not_found", "Défi introuvable.");
  }
  return raw;
}

function parseChallengeBody(body: unknown): Pick<ChallengeSpec, "profile" | "constraints"> {
  const input = body as {
    profile?: { nationality?: unknown; position?: unknown; preferredFoot?: unknown };
    constraints?: { simulationsAllowed?: unknown; maxCommands?: unknown };
  };
  const nationality = input?.profile?.nationality;
  const position = input?.profile?.position;
  const preferredFoot = input?.profile?.preferredFoot;
  if (!COUNTRIES.has(nationality as CountryCode) || !POSITIONS.has(position as Position)) {
    throw new ApiError(422, "invalid_profile", "Le pays ou le poste imposé est invalide.");
  }
  if (preferredFoot !== "left" && preferredFoot !== "right") {
    throw new ApiError(422, "invalid_profile", "Le pied fort imposé est invalide.");
  }

  const requestedMax = Number(input.constraints?.maxCommands ?? 2_000);
  if (!Number.isInteger(requestedMax) || requestedMax < 50 || requestedMax > 5_000) {
    throw new ApiError(422, "invalid_constraints", "maxCommands doit être compris entre 50 et 5 000.");
  }
  return {
    profile: {
      nationality: nationality as CountryCode,
      position: position as Position,
      preferredFoot,
    },
    constraints: {
      simulationsAllowed: input.constraints?.simulationsAllowed === true,
      maxCommands: requestedMax,
    },
  };
}

function sanitizeAnalyticsPayload(source: unknown): Record<string, string | number> {
  if (!source || typeof source !== "object") return {};
  const payload: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(source as Record<string, unknown>)) {
    if (!ANALYTICS_KEYS.has(key)) continue;
    if ((key === "durationMs" || key === "fps") && typeof value === "number" && Number.isFinite(value)) {
      payload[key] = Math.max(0, Math.min(key === "fps" ? 240 : 3_600_000, Math.round(value)));
      continue;
    }
    if (typeof value === "string" && ANALYTICS_VALUES[key]?.has(value)) payload[key] = value;
  }
  return payload;
}

app.get("/api/health", (context) => context.json({ ok: true, rulesVersion: RULES_VERSION }));

app.post("/api/challenges", async (context) => {
  const db = database(context.env);
  const secret = signingSecret(context.env);
  await enforceRateLimit(db, secret, context.req.raw, "create-challenge", 8, 600);

  const body = await readJsonLimited<unknown>(context.req.raw, 16 * 1_024);
  const requested = parseChallengeBody(body);
  const challenge: ChallengeSpec = {
    id: crypto.randomUUID(),
    seed: crypto.randomUUID().replaceAll("-", ""),
    profile: requested.profile,
    rulesVersion: RULES_VERSION,
    difficulty: "standard",
    constraints: requested.constraints,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1_000).toISOString(),
  };
  challenge.signature = await hmacSha256(secret, stableStringify(challenge));
  await insertChallenge(db, challenge);
  return context.json({ challenge }, 201);
});

app.get("/api/challenges/:id", async (context) => {
  const challenge = await getChallenge(database(context.env), challengeId(context.req.param("id")));
  if (!challenge) throw new ApiError(404, "challenge_not_found", "Défi introuvable.");
  assertActive(challenge);
  return context.json({ challenge });
});

app.post("/api/challenges/:id/runs", async (context) => {
  const db = database(context.env);
  const secret = signingSecret(context.env);
  await enforceRateLimit(db, secret, context.req.raw, "submit-run", 12, 600);

  const challenge = await getChallenge(db, challengeId(context.req.param("id")));
  if (!challenge) throw new ApiError(404, "challenge_not_found", "Défi introuvable.");
  assertActive(challenge);

  const submission = await readJsonLimited<RunSubmission>(context.req.raw, MAX_RUN_BYTES);
  await verifyTurnstile(
    context.req.raw,
    submission?.turnstileToken,
    context.env.TURNSTILE_SECRET,
    context.env.ENVIRONMENT,
  );

  const pseudonym = sanitizePseudonym(submission?.pseudonym);
  const commands = validateCommandLog(submission?.commands, challenge);
  if (typeof submission?.finalHash !== "string" || !/^[a-f0-9]{64}$/i.test(submission.finalHash)) {
    throw new ApiError(422, "invalid_final_hash", "Le hash final est invalide.");
  }

  const { initial, final } = replayChallenge(challenge, commands);
  const authoritativeHash = await hashCareerState(final);
  if (authoritativeHash !== submission.finalHash.toLowerCase()) {
    throw new ApiError(422, "state_hash_mismatch", "Le résultat soumis ne correspond pas au rejeu autoritaire.");
  }

  const replayHash = await hashReplay(challenge.id, commands);
  const { score, breakdown } = computeScore(initial, final);
  const position = challenge.profile.position;
  const positionRank = await getPositionRank(db, challenge.id, position, score);
  const unsignedResult = { score, breakdown, positionRank, replayHash };
  const signature = await hmacSha256(secret, stableStringify(unsignedResult));
  const result: RunResult = { ...unsignedResult, signature };
  const now = new Date().toISOString();

  try {
    await insertRun(db, {
      id: crypto.randomUUID(),
      challenge_id: challenge.id,
      pseudonym,
      position,
      score,
      breakdown_json: JSON.stringify(breakdown),
      final_hash: authoritativeHash,
      replay_hash: replayHash,
      result_signature: signature,
      command_count: commands.length,
      created_at: now,
    });
  } catch (error) {
    if (String(error).toLowerCase().includes("unique")) {
      throw new ApiError(409, "duplicate_replay", "Ce replay a déjà été soumis.");
    }
    throw error;
  }

  return context.json({ result }, 201);
});

app.get("/api/challenges/:id/runs", async (context) => {
  const db = database(context.env);
  const challenge = await getChallenge(db, challengeId(context.req.param("id")));
  if (!challenge) throw new ApiError(404, "challenge_not_found", "Défi introuvable.");

  const limit = Math.min(100, Math.max(1, Number(context.req.query("limit") ?? 25) || 25));
  const offset = Math.min(10_000, Math.max(0, Number(context.req.query("offset") ?? 0) || 0));
  const runs = await listRuns(db, challenge.id, limit, offset);
  return context.json({
    runs: runs.map((run) => ({
      id: run.id,
      pseudonym: run.pseudonym,
      position: run.position,
      score: run.score,
      breakdown: JSON.parse(run.breakdown_json) as RunResult["breakdown"],
      replayHash: run.replay_hash,
      signature: run.result_signature,
      createdAt: run.created_at,
    })),
    page: { limit, offset, hasMore: runs.length === limit },
  });
});

app.get("/api/content/manifest", async (context) => {
  const object = await context.env.CONTENT_BUCKET?.get("manifest.json");
  if (!object) {
    return context.json({
      contentVersion: "1.0.0",
      source: "bundled",
      packs: [],
      note: "R2 absent ou manifest.json non publié; le hub reste utilisable avec le contenu embarqué.",
    });
  }
  if (object.size > 256 * 1_024) throw new ApiError(500, "invalid_manifest", "Le manifeste R2 est trop volumineux.");

  const manifest = await object.json<Record<string, unknown>>();
  context.header("ETag", object.httpEtag);
  context.header("Cache-Control", "public, max-age=300, stale-while-revalidate=86400");
  return context.json({ ...manifest, source: "r2" });
});

app.post("/api/analytics/batch", async (context) => {
  const body = await readJsonLimited<{
    consent?: unknown;
    events?: Array<{ kind?: unknown; payload?: unknown }>;
  }>(context.req.raw, MAX_ANALYTICS_BYTES);

  if (body?.consent !== true) return context.json({ accepted: 0, reason: "consent_required" }, 202);
  if (!Array.isArray(body.events) || body.events.length > 50) {
    throw new ApiError(422, "invalid_analytics_batch", "Le lot analytics doit contenir au plus 50 événements.");
  }

  const db = database(context.env);
  await enforceRateLimit(db, signingSecret(context.env), context.req.raw, "analytics", 30, 600);
  const accepted = body.events.flatMap((event) => {
    if (typeof event.kind !== "string" || !ANALYTICS_KINDS.has(event.kind)) return [];
    return [{ kind: event.kind, payload: sanitizeAnalyticsPayload(event.payload) }];
  });

  if (accepted.length) {
    await db.batch(
      accepted.map((event) => db
        .prepare("INSERT INTO analytics_events (id, kind, payload_json, created_at) VALUES (?, ?, ?, ?)")
        .bind(crypto.randomUUID(), event.kind, JSON.stringify(event.payload), new Date().toISOString())),
    );
  }
  return context.json({ accepted: accepted.length }, 202);
});

app.notFound(async (context) => {
  if (!context.req.path.startsWith("/api/") && context.env.ASSETS) {
    return context.env.ASSETS.fetch(context.req.raw);
  }
  return context.json({ error: { code: "not_found", message: "Route API introuvable." } }, 404);
});

app.onError((error, context) => {
  if (error instanceof ApiError) {
    return context.json({ error: { code: error.code, message: error.message } }, error.status);
  }
  console.error("Unhandled Worker error", error);
  return context.json({ error: { code: "internal_error", message: "Erreur interne du Worker." } }, 500);
});

export default {
  fetch(request: Request, env: Bindings, executionContext: ExecutionContext) {
    return app.fetch(request, env, executionContext);
  },
  async scheduled(_controller: ScheduledController, env: Bindings, executionContext: ExecutionContext) {
    if (!env.DB) return;
    const nowIso = new Date().toISOString();
    const nowSeconds = Math.floor(Date.now() / 1_000);
    const analyticsCutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1_000).toISOString();
    executionContext.waitUntil(env.DB.batch([
      env.DB.prepare("DELETE FROM challenges WHERE expires_at <= ?").bind(nowIso),
      env.DB.prepare("DELETE FROM rate_limits WHERE expires_at <= ?").bind(nowSeconds),
      env.DB.prepare("DELETE FROM analytics_events WHERE created_at <= ?").bind(analyticsCutoff),
    ]));
  },
};
export type { Bindings, RunRow };
