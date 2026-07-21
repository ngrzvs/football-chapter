import type { CareerState, PlayerIdentity, Position } from "@football/protocol";
import { advanceCareer, computeChallengeScore, createCareer, stableHash } from "./index";

declare const process: { argv: string[]; stdout: { write(value: string): void } };

const positions: Position[] = ["GK", "LB", "CB", "RB", "DM", "CM", "AM", "LW", "RW", "SS", "ST", "CF"];

function identity(index: number): PlayerIdentity {
  return {
    name: `Lab Player ${index}`,
    nationality: (["FR", "EN", "ES", "IT", "DE", "BR"] as const)[index % 6]!,
    position: positions[index % positions.length]!,
    preferredFoot: index % 4 === 0 ? "left" : "right",
    shirtNumber: 1 + (index % 30),
    avatar: { skin: index % 6, face: index % 5, hair: index % 8, build: index % 4 },
  };
}

function runCareer(index: number): CareerState {
  let state = createCareer(`lab-v1-${index}`, identity(index), "standard", index % 2 ? "en" : "fr");
  while (state.player.age < 24 || state.phase !== "chapter-end") {
    if (state.phase === "preparation") state = advanceCareer(state, { type: "PREPARE", kind: index % 5 === 0 ? "recovery" : "training" }).state;
    else if (state.phase === "match") state = advanceCareer(state, { type: "SIMULATE_MATCH" }).state;
    else if (state.phase === "decision") state = advanceCareer(state, { type: "DECIDE", eventId: state.pendingEventId!, choiceId: index % 3 === 0 ? "b" : "a" }).state;
    else if (state.phase === "review") state = advanceCareer(state, { type: "ADVANCE_WEEK" }).state;
    else if (state.phase === "chapter-end" && state.player.age < 24) state = advanceCareer(state, { type: "ADVANCE_SEASON" }).state;
  }
  return state;
}

const count = Math.max(1, Number.parseInt(process.argv[2] ?? "1000", 10));
const aggregates: Record<Position, { careers: number; overall: number; appearances: number; goals: number; assists: number; score: number }> = Object.fromEntries(
  positions.map((position) => [position, { careers: 0, overall: 0, appearances: 0, goals: 0, assists: 0, score: 0 }]),
) as Record<Position, { careers: number; overall: number; appearances: number; goals: number; assists: number; score: number }>;

let checksum = "";
for (let index = 0; index < count; index += 1) {
  const state = runCareer(index);
  const bucket = aggregates[state.player.identity.position];
  bucket.careers += 1;
  bucket.overall += state.player.overall;
  bucket.appearances += state.history.reduce((sum, item) => sum + item.appearances, 0) + state.player.seasonStats.appearances;
  bucket.goals += state.history.reduce((sum, item) => sum + item.goals, 0) + state.player.seasonStats.goals;
  bucket.assists += state.history.reduce((sum, item) => sum + item.assists, 0) + state.player.seasonStats.assists;
  bucket.score += computeChallengeScore(state).score;
  checksum = stableHash(`${checksum}:${stableHash(state)}`);
  if ((index + 1) % 1_000 === 0) process.stdout.write(`Simulated ${index + 1}/${count}\n`);
}

const report = Object.fromEntries(Object.entries(aggregates).map(([position, values]) => [position, values.careers ? {
  careers: values.careers,
  overall: values.overall / values.careers,
  appearances: values.appearances / values.careers,
  goals: values.goals / values.careers,
  assists: values.assists / values.careers,
  score: values.score / values.careers,
} : values]));
process.stdout.write(`${JSON.stringify({ careers: count, checksum, byPosition: report }, null, 2)}\n`);
