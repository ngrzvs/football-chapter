import type { ChallengeSpec } from "@football/protocol";

export interface Bindings {
  DB?: D1Database;
  CONTENT_BUCKET?: R2Bucket;
  ASSETS?: Fetcher;
  ENVIRONMENT?: "development" | "preview" | "production";
  TURNSTILE_SECRET?: string;
  HMAC_SECRET?: string;
  ADMIN_API_KEY?: string;
  PREVIOUS_RULES_VERSION?: string;
}

export interface ChallengeRow {
  id: string;
  seed: string;
  profile_json: string;
  rules_version: string;
  difficulty: "standard";
  constraints_json: string;
  signature: string;
  created_at: string;
  expires_at: string;
}

export interface RunRow {
  id: string;
  challenge_id: string;
  pseudonym: string;
  position: string;
  score: number;
  breakdown_json: string;
  final_hash: string;
  replay_hash: string;
  result_signature: string;
  command_count: number;
  created_at: string;
}

export function rowToChallenge(row: ChallengeRow): ChallengeSpec {
  return {
    id: row.id,
    seed: row.seed,
    profile: JSON.parse(row.profile_json) as ChallengeSpec["profile"],
    rulesVersion: row.rules_version,
    difficulty: "standard",
    constraints: JSON.parse(row.constraints_json) as ChallengeSpec["constraints"],
    expiresAt: row.expires_at,
    signature: row.signature,
  };
}
