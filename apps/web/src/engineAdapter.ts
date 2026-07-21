import * as Engine from "@football/engine";
import type { CareerCommand, CareerState, Difficulty, Language, PlayerIdentity } from "@football/protocol";

type EngineApi = {
  createCareer: (...args: unknown[]) => CareerState;
  advanceCareer: (state: CareerState, command: CareerCommand) => { state: CareerState; events: unknown[] };
};

const api = Engine as unknown as EngineApi;

export function createFreshCareer(identity: PlayerIdentity, difficulty: Difficulty, language: Language): CareerState {
  if (!api.createCareer) throw new Error("Le moteur de carrière n’est pas disponible.");
  const seed = `chapter-${identity.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${identity.shirtNumber}`;
  // Le contrat public accepte le seed et l'identité comme entrées déterministes.
  return api.createCareer(seed, identity, difficulty, language);
}

export function applyCareerCommand(state: CareerState, command: CareerCommand): CareerState {
  return api.advanceCareer(state, command).state;
}
