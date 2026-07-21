import { stableHash } from "@football/engine";
import type { ChallengeSpec } from "@football/protocol";
import { describe, expect, it } from "vitest";
import { computeScore, hashCareerState, replayChallenge, validateCommandLog } from "./replay";

const challenge: ChallengeSpec = {
  id: "00000000-0000-4000-8000-000000000001",
  seed: "worker-test-seed",
  profile: { nationality: "FR", position: "CM", preferredFoot: "right" },
  rulesVersion: "1.0.0",
  difficulty: "standard",
  constraints: { simulationsAllowed: false, maxCommands: 100 },
  expiresAt: "2099-01-01T00:00:00.000Z",
};

describe("authoritative challenge replay", () => {
  it("recrée un état dont le hash est identique à celui du moteur", async () => {
    const { initial, final } = replayChallenge(challenge, []);
    expect(await hashCareerState(final)).toBe(stableHash(final));
    expect(computeScore(initial, final).score).toBeGreaterThanOrEqual(0);
  });

  it("rejette la simulation lorsqu'elle est verrouillée", () => {
    expect(() => validateCommandLog([{ type: "SIMULATE_MATCH" }], challenge)).toThrowError(/interdite/);
  });
});
