import Dexie, { type EntityTable } from "dexie";
import type { CareerCommand, CareerState, SaveEnvelope } from "@football/protocol";

interface StoredSave extends SaveEnvelope { id: "career" }

const database = new Dexie("football-chapter") as Dexie & { saves: EntityTable<StoredSave, "id"> };
database.version(1).stores({ saves: "id,updatedAt,rulesVersion,contentVersion" });

export async function loadCareer(): Promise<{ state: CareerState; commands: CareerCommand[] } | undefined> {
  const saved = await database.saves.get("career");
  if (!saved) return undefined;
  return { state: saved.snapshot, commands: saved.commands };
}

export async function saveCareer(state: CareerState, commands: CareerCommand[]): Promise<void> {
  await database.saves.put({
    id: "career",
    schemaVersion: state.schemaVersion,
    rulesVersion: state.rulesVersion,
    contentVersion: state.contentVersion,
    seed: state.seed,
    prng: state.prng,
    snapshot: state,
    commands,
    updatedAt: new Date().toISOString()
  });
}

export async function clearCareer(): Promise<void> {
  await database.saves.delete("career");
}
