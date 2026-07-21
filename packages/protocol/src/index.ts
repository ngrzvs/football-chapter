export const SCHEMA_VERSION = 1;
export const RULES_VERSION = "1.0.0";
export const CONTENT_VERSION = "1.0.0";

export type Language = "fr" | "en";
export type Difficulty = "assisted" | "standard" | "expert";
export type CountryCode = "FR" | "EN" | "ES" | "IT" | "DE" | "BR";
export type AttributeKey =
  | "technique" | "finishing" | "passing" | "vision"
  | "defense" | "physical" | "mental" | "charisma";
export type RelationKey = "coach" | "team" | "supporters" | "family" | "agent" | "media";
export type Position = "GK" | "LB" | "CB" | "RB" | "DM" | "CM" | "AM" | "LW" | "RW" | "SS" | "ST" | "CF";
export type PlayFamily = "finisher" | "creator" | "support" | "defender" | "keeper";
export type CareerPhase = "preparation" | "match" | "decision" | "review" | "chapter-end";
export type PreparationKind = "training" | "recovery" | "relationship" | "media" | "agent";
export type MatchAction = "pass" | "through-ball" | "dribble" | "shot" | "position" | "intercept" | "tackle" | "save" | "distribute";

export interface LocalizedText { fr: string; en: string }
export interface PrngState { a: number; b: number; c: number; d: number }
export type Attributes = Record<AttributeKey, number>;
export type Relations = Record<RelationKey, number>;

export interface PlayerIdentity {
  name: string;
  nationality: CountryCode;
  position: Position;
  preferredFoot: "left" | "right";
  shirtNumber: number;
  avatar: { skin: number; face: number; hair: number; build: number };
}

export interface PlayerState {
  identity: PlayerIdentity;
  age: number;
  attributes: Attributes;
  overall: number;
  potential: number;
  form: number;
  energy: number;
  morale: number;
  reputation: number;
  marketValue: number;
  salary: number;
  money: number;
  injuryWeeks: number;
  role: "academy" | "prospect" | "rotation" | "starter" | "star";
  traits: string[];
  seasonStats: SeasonStats;
}

export interface SeasonStats {
  appearances: number; starts: number; goals: number; assists: number;
  cleanSheets: number; ratingTotal: number; minutes: number; trophies: number;
}

export interface ClubRef { id: string; name: string; shortName: string; country: CountryCode; division: 1 | 2; colors: [string, string]; prestige: number }
export interface ContractState { clubId: string; startSeason: number; endSeason: number; weeklySalary: number; squadRole: PlayerState["role"]; releaseClause?: number }
export interface Fixture { id: string; week: number; homeClubId: string; awayClubId: string; competition: "league" | "cup" | "continental" | "national"; played: boolean; homeScore?: number; awayScore?: number; isMajor: boolean }
export interface StandingRow { clubId: string; played: number; won: number; drawn: number; lost: number; gf: number; ga: number; points: number }
export interface Notification { id: string; kind: "info" | "good" | "warning" | "story"; text: LocalizedText; week: number }
export interface CareerHistory { season: number; clubId: string; appearances: number; goals: number; assists: number; averageRating: number; trophies: number }

export interface CareerState {
  schemaVersion: number;
  rulesVersion: string;
  contentVersion: string;
  seed: string;
  prng: PrngState;
  language: Language;
  difficulty: Difficulty;
  season: number;
  week: number;
  phase: CareerPhase;
  player: PlayerState;
  activeCountry: CountryCode;
  club: ClubRef;
  contract: ContractState;
  relations: Relations;
  fixtures: Fixture[];
  standings: StandingRow[];
  pendingScenario?: MatchScenario;
  pendingEventId?: string;
  notifications: Notification[];
  history: CareerHistory[];
  achievements: string[];
  commandCount: number;
}

export type CareerCommand =
  | { type: "PREPARE"; kind: PreparationKind }
  | { type: "START_MATCH" }
  | { type: "MATCH_ACTION"; input: MatchInput }
  | { type: "SIMULATE_MATCH" }
  | { type: "DECIDE"; eventId: string; choiceId: string }
  | { type: "ADVANCE_WEEK" }
  | { type: "ACCEPT_CONTRACT"; clubId: string; salary: number; years: number }
  | { type: "ADVANCE_SEASON" };

export interface DomainEvent { id: string; type: "attribute" | "relation" | "match" | "injury" | "trophy" | "story" | "finance" | "notification"; text: LocalizedText; payload?: Record<string, string | number | boolean> }
export interface Vec2 { x: number; y: number }
export interface ScenarioActor { id: string; team: "player" | "opponent"; role: string; position: Vec2 }
export interface MatchScenario {
  id: string;
  templateId: string;
  family: PlayFamily;
  clock: number;
  homeScore: number;
  awayScore: number;
  actors: ScenarioActor[];
  ball: Vec2;
  objective: LocalizedText;
  allowedActions: MatchAction[];
  pressure: number;
  difficulty: Difficulty;
  attemptsRemaining: number;
}
export interface MatchInput { action: MatchAction; target?: string; direction: Vec2; power: number; timing: number }
export interface MatchResolution { success: boolean; quality: number; rating: number; narration: LocalizedText; ballEnd: Vec2 }

export interface ChallengeSpec { id: string; seed: string; profile: Pick<PlayerIdentity, "nationality" | "position" | "preferredFoot">; rulesVersion: string; difficulty: "standard"; constraints: { simulationsAllowed: boolean; maxCommands: number }; expiresAt: string; signature?: string }
export interface RunSubmission { pseudonym: string; commands: CareerCommand[]; finalHash: string; turnstileToken: string }
export interface RunResult { score: number; breakdown: Record<"performance" | "results" | "progression" | "honours" | "reputation" | "finances", number>; positionRank: number; replayHash: string; signature: string }
export interface SaveEnvelope { schemaVersion: number; rulesVersion: string; contentVersion: string; seed: string; prng: PrngState; snapshot: CareerState; commands: CareerCommand[]; updatedAt: string }

