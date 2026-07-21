const MAX_PSEUDONYM_LENGTH = 24;
const BLOCKED_NAME_PARTS = [
  "admin",
  "moderator",
  "cloudflare",
  "destiny eleven",
  "copero",
];

export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 503,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function stableStringify(value: unknown): string {
  if (value === undefined) return "null";
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;

  return `{${Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
    .join(",")}}`;
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return toHex(digest);
}

export async function hmacSha256(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value)));
}

export function sanitizePseudonym(input: unknown): string {
  if (typeof input !== "string") throw new ApiError(422, "invalid_pseudonym", "Le pseudonyme est requis.");

  const normalized = input
    .normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.length < 2 || normalized.length > MAX_PSEUDONYM_LENGTH) {
    throw new ApiError(422, "invalid_pseudonym", "Le pseudonyme doit contenir entre 2 et 24 caractères.");
  }
  if (!/^[\p{L}\p{N} ._'’-]+$/u.test(normalized)) {
    throw new ApiError(422, "invalid_pseudonym", "Le pseudonyme contient des caractères non autorisés.");
  }

  const lower = normalized.toLocaleLowerCase("fr");
  if (BLOCKED_NAME_PARTS.some((part) => lower.includes(part))) {
    throw new ApiError(422, "reserved_pseudonym", "Ce pseudonyme est réservé.");
  }
  return normalized;
}

export async function readJsonLimited<T>(request: Request, maxBytes: number): Promise<T> {
  const announcedSize = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(announcedSize) && announcedSize > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Le corps de la requête dépasse la limite autorisée.");
  }

  const body = await request.text();
  if (new TextEncoder().encode(body).byteLength > maxBytes) {
    throw new ApiError(413, "payload_too_large", "Le corps de la requête dépasse la limite autorisée.");
  }
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new ApiError(400, "invalid_json", "Le corps JSON est invalide.");
  }
}

export function clientAddress(request: Request): string {
  return request.headers.get("CF-Connecting-IP") ?? "local-development";
}

interface TurnstileResponse {
  success: boolean;
  hostname?: string;
  action?: string;
  "error-codes"?: string[];
}

export async function verifyTurnstile(
  request: Request,
  token: unknown,
  secret: string | undefined,
  environment: string | undefined,
): Promise<void> {
  if (typeof token !== "string" || token.length === 0 || token.length > 2_048) {
    throw new ApiError(422, "invalid_turnstile_token", "Le jeton Turnstile est invalide.");
  }

  if (!secret) {
    if (environment !== "production" && token === "dev-pass") return;
    throw new ApiError(503, "turnstile_not_configured", "Turnstile n'est pas configuré sur cet environnement.");
  }

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", clientAddress(request));
  body.set("idempotency_key", crypto.randomUUID());

  let result: TurnstileResponse;
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
    });
    result = await response.json() as TurnstileResponse;
  } catch {
    throw new ApiError(503, "turnstile_unavailable", "La vérification anti-abus est temporairement indisponible.");
  }

  if (!result.success) {
    throw new ApiError(403, "turnstile_rejected", "La vérification anti-abus a échoué.");
  }
}

export async function enforceRateLimit(
  db: D1Database,
  secret: string,
  request: Request,
  route: string,
  limit: number,
  windowSeconds: number,
): Promise<void> {
  const now = Math.floor(Date.now() / 1_000);
  const bucket = Math.floor(now / windowSeconds);
  const key = await hmacSha256(secret, `${clientAddress(request)}:${route}:${bucket}`);

  await db
    .prepare(
      `INSERT INTO rate_limits (key, route, bucket, count, expires_at)
       VALUES (?, ?, ?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = count + 1`,
    )
    .bind(key, route, bucket, (bucket + 2) * windowSeconds)
    .run();

  const row = await db.prepare("SELECT count FROM rate_limits WHERE key = ?").bind(key).first<{ count: number }>();
  if ((row?.count ?? 0) > limit) {
    throw new ApiError(429, "rate_limited", "Trop de requêtes. Réessayez dans quelques minutes.");
  }
}
