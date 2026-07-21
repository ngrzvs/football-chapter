import type { ChallengeSpec } from "@football/protocol";
import type { ChallengeRow, RunRow } from "./types";
import { rowToChallenge } from "./types";

export async function getChallenge(db: D1Database, id: string): Promise<ChallengeSpec | null> {
  const row = await db
    .prepare(
      `SELECT id, seed, profile_json, rules_version, difficulty, constraints_json,
              signature, created_at, expires_at
       FROM challenges WHERE id = ?`,
    )
    .bind(id)
    .first<ChallengeRow>();
  return row ? rowToChallenge(row) : null;
}

export async function insertChallenge(db: D1Database, challenge: ChallengeSpec): Promise<void> {
  await db
    .prepare(
      `INSERT INTO challenges
       (id, seed, profile_json, rules_version, difficulty, constraints_json, signature, created_at, expires_at)
       VALUES (?, ?, ?, ?, 'standard', ?, ?, ?, ?)`,
    )
    .bind(
      challenge.id,
      challenge.seed,
      JSON.stringify(challenge.profile),
      challenge.rulesVersion,
      JSON.stringify(challenge.constraints),
      challenge.signature ?? "",
      new Date().toISOString(),
      challenge.expiresAt,
    )
    .run();
}

export async function insertRun(db: D1Database, row: RunRow): Promise<void> {
  await db
    .prepare(
      `INSERT INTO runs
       (id, challenge_id, pseudonym, position, score, breakdown_json, final_hash,
        replay_hash, result_signature, command_count, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      row.id,
      row.challenge_id,
      row.pseudonym,
      row.position,
      row.score,
      row.breakdown_json,
      row.final_hash,
      row.replay_hash,
      row.result_signature,
      row.command_count,
      row.created_at,
    )
    .run();
}

export async function getPositionRank(db: D1Database, challengeId: string, position: string, score: number): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS better FROM runs WHERE challenge_id = ? AND position = ? AND score > ?")
    .bind(challengeId, position, score)
    .first<{ better: number }>();
  return Number(row?.better ?? 0) + 1;
}

export async function listRuns(db: D1Database, challengeId: string, limit: number, offset: number): Promise<RunRow[]> {
  const result = await db
    .prepare(
      `SELECT id, challenge_id, pseudonym, position, score, breakdown_json, final_hash,
              replay_hash, result_signature, command_count, created_at
       FROM runs WHERE challenge_id = ?
       ORDER BY score DESC, created_at ASC LIMIT ? OFFSET ?`,
    )
    .bind(challengeId, limit, offset)
    .all<RunRow>();
  return result.results;
}
