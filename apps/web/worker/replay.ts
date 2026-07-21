import { advanceCareer, computeChallengeScore, createCareer, stableHash } from "@football/engine";
import {
  RULES_VERSION,
  type CareerCommand,
  type CareerState,
  type ChallengeSpec,
  type PlayerIdentity,
  type RunResult,
} from "@football/protocol";
import { ApiError } from "./security";

const COMMAND_TYPES = new Set<CareerCommand["type"]>([
  "PREPARE",
  "START_MATCH",
  "MATCH_ACTION",
  "SIMULATE_MATCH",
  "DECIDE",
  "ADVANCE_WEEK",
  "ACCEPT_CONTRACT",
  "ADVANCE_SEASON",
]);

export function validateCommandLog(commands: unknown, challenge: ChallengeSpec): CareerCommand[] {
  if (!Array.isArray(commands) || commands.length > challenge.constraints.maxCommands) {
    throw new ApiError(422, "invalid_command_log", "Le journal de commandes est absent ou trop long.");
  }
  for (const command of commands) {
    if (!command || typeof command !== "object" || !COMMAND_TYPES.has((command as CareerCommand).type)) {
      throw new ApiError(422, "invalid_command", "Le journal contient une commande inconnue.");
    }
    if (!challenge.constraints.simulationsAllowed && (command as CareerCommand).type === "SIMULATE_MATCH") {
      throw new ApiError(422, "simulation_forbidden", "La simulation de match est interdite pour ce défi.");
    }
  }
  return commands as CareerCommand[];
}

function challengeIdentity(challenge: ChallengeSpec): PlayerIdentity {
  return {
    name: "Challenge Player",
    nationality: challenge.profile.nationality,
    position: challenge.profile.position,
    preferredFoot: challenge.profile.preferredFoot,
    shirtNumber: challenge.profile.position === "GK" ? 1 : 10,
    avatar: { skin: 2, face: 1, hair: 2, build: 1 },
  };
}

export function replayChallenge(challenge: ChallengeSpec, commands: CareerCommand[]): { initial: CareerState; final: CareerState } {
  if (challenge.rulesVersion !== RULES_VERSION) {
    throw new ApiError(422, "unsupported_rules_version", "Cette version des règles n'est pas disponible dans ce Worker.");
  }

  const initial = createCareer(challenge.seed, challengeIdentity(challenge), "standard", "fr");
  let final = initial;
  try {
    for (const command of commands) final = advanceCareer(final, command).state;
  } catch {
    throw new ApiError(422, "invalid_replay", "Le journal ne peut pas être rejoué avec ces règles.");
  }
  return { initial, final };
}

export function computeScore(initial: CareerState, state: CareerState): Pick<RunResult, "score" | "breakdown"> {
  return computeChallengeScore(state, initial);
}

export async function hashCareerState(state: CareerState): Promise<string> {
  return stableHash(state);
}

export async function hashReplay(challengeId: string, commands: CareerCommand[]): Promise<string> {
  return stableHash({ challengeId, commands });
}
