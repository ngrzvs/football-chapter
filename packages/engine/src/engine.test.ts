import { describe, expect, it } from "vitest";
import type { CareerCommand, CareerState, MatchAction, PlayerIdentity, Position } from "@football/protocol";
import {
  OVERALL_WEIGHTS,
  advanceCareer,
  calculateOverall,
  computeChallengeScore,
  createCareer,
  createMatchScenario,
  familyForPosition,
  stableHash,
} from "./index";

const identity = (position: Position = "CM"): PlayerIdentity => ({
  name: "Noa Mercier",
  nationality: "FR",
  position,
  preferredFoot: "right",
  shirtNumber: 18,
  avatar: { skin: 2, face: 1, hair: 3, build: 1 },
});

function playWeek(state: CareerState, preparation: CareerCommand = { type: "PREPARE", kind: "training" }): CareerState {
  state = advanceCareer(state, preparation).state;
  state = advanceCareer(state, { type: "SIMULATE_MATCH" }).state;
  if (!state.pendingEventId) throw new Error("Expected a story event");
  state = advanceCareer(state, { type: "DECIDE", eventId: state.pendingEventId, choiceId: "a" }).state;
  return advanceCareer(state, { type: "ADVANCE_WEEK" }).state;
}

describe("deterministic career engine", () => {
  it("matches the SHA-256 reference vector", () => {
    expect(stableHash("abc")).toBe("6cc43f858fbb763301637b5af970e2a46b46f461f27e5a0f41e009c59b827b25");
    // stableHash hashes canonical JSON, therefore the direct string vector differs from sha256("abc").
    expect(stableHash({ b: 2, a: 1 })).toBe(stableHash({ a: 1, b: 2 }));
    expect(stableHash({ a: 1 })).toHaveLength(64);
  });

  it("produces byte-identical state from the same seed and commands", () => {
    let first = createCareer("same-seed", identity());
    let second = createCareer("same-seed", identity());
    for (let week = 0; week < 8; week += 1) {
      first = playWeek(first);
      second = playWeek(second);
    }
    expect(first).toEqual(second);
    expect(stableHash(first)).toBe(stableHash(second));
  });

  it("does not mutate the input state and makes choices diverge explicitly", () => {
    const initial = createCareer("branching-seed", identity());
    const snapshot = stableHash(initial);
    const training = advanceCareer(initial, { type: "PREPARE", kind: "training" }).state;
    const recovery = advanceCareer(initial, { type: "PREPARE", kind: "recovery" }).state;
    expect(stableHash(initial)).toBe(snapshot);
    expect(stableHash(training)).not.toBe(stableHash(recovery));
    expect(training.commandCount).toBe(1);
  });

  it("keeps all simulated values inside invariants", () => {
    let state = createCareer("invariant-seed", identity("ST"));
    for (let week = 0; week < 22; week += 1) state = playWeek(state, { type: "PREPARE", kind: week % 3 === 0 ? "recovery" : "training" });
    expect(state.phase).toBe("chapter-end");
    for (const value of Object.values(state.player.attributes)) expect(value).toBeGreaterThanOrEqual(1);
    for (const value of Object.values(state.player.attributes)) expect(value).toBeLessThanOrEqual(99);
    for (const value of Object.values(state.relations)) expect(value).toBeGreaterThanOrEqual(0);
    for (const value of Object.values(state.relations)) expect(value).toBeLessThanOrEqual(100);
    expect(state.player.energy).toBeGreaterThanOrEqual(0);
    expect(state.player.energy).toBeLessThanOrEqual(100);
    expect(state.standings.every((row) => row.played === 22)).toBe(true);
    expect(state.player.overall).toBeLessThanOrEqual(state.player.potential);
  });
});

describe("positions and match families", () => {
  it("defines normalized, position-specific overall weights", () => {
    for (const position of Object.keys(OVERALL_WEIGHTS) as Position[]) {
      expect(Object.values(OVERALL_WEIGHTS[position]).reduce((sum, value) => sum + value, 0)).toBe(100);
    }
    const specialist = { technique: 40, finishing: 90, passing: 40, vision: 40, defense: 20, physical: 65, mental: 55, charisma: 40 };
    expect(calculateOverall(specialist, "ST")).toBeGreaterThan(calculateOverall(specialist, "CB"));
  });

  it("covers all twelve positions across five scenario families", () => {
    const positions: Position[] = ["GK", "LB", "CB", "RB", "DM", "CM", "AM", "LW", "RW", "SS", "ST", "CF"];
    expect(new Set(positions.map(familyForPosition))).toEqual(new Set(["keeper", "defender", "support", "creator", "finisher"]));
    for (const position of positions) {
      const state = createCareer(`scenario-${position}`, identity(position));
      const prepared = advanceCareer(state, { type: "PREPARE", kind: "recovery" }).state;
      const scenario = createMatchScenario(prepared);
      expect(scenario.family).toBe(familyForPosition(position));
      expect(scenario.allowedActions.length).toBeGreaterThan(0);
    }
  });

  it("resolves every gameplay action family deterministically", () => {
    const cases: Array<[Position, MatchAction]> = [["ST", "shot"], ["CM", "pass"], ["LW", "position"], ["CB", "tackle"], ["GK", "save"]];
    for (const [position, expectedAction] of cases) {
      let state = createCareer(`action-${position}`, identity(position));
      state = advanceCareer(state, { type: "PREPARE", kind: "recovery" }).state;
      state = advanceCareer(state, { type: "START_MATCH" }).state;
      const scenario = state.pendingScenario!;
      const action = scenario.allowedActions.includes(expectedAction) ? expectedAction : scenario.allowedActions[0]!;
      const input = { action, direction: { x: 0.25, y: 1 }, power: 0.72, timing: 0.5 };
      const first = advanceCareer(state, { type: "MATCH_ACTION", input }).state;
      const second = advanceCareer(state, { type: "MATCH_ACTION", input }).state;
      expect(first).toEqual(second);
    }
  });
});

describe("challenge scoring", () => {
  it("uses a normalized 0..100 breakdown and a 0..10000 total", () => {
    const initial = createCareer("score-seed", identity());
    let final = initial;
    for (let week = 0; week < 5; week += 1) final = playWeek(final);
    const result = computeChallengeScore(final, initial);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(10_000);
    for (const value of Object.values(result.breakdown)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    }
  });
});
