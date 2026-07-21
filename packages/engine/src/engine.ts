import {
  CLUBS,
  MATCH_SITUATIONS,
  STORY_EVENTS,
  clubsFor,
  eventById,
  type ChoiceEffects,
} from "@football/content";
import {
  CONTENT_VERSION,
  RULES_VERSION,
  SCHEMA_VERSION,
  type AttributeKey,
  type Attributes,
  type CareerCommand,
  type CareerState,
  type ClubRef,
  type Difficulty,
  type DomainEvent,
  type Fixture,
  type Language,
  type LocalizedText,
  type MatchAction,
  type MatchInput,
  type MatchResolution,
  type MatchScenario,
  type PlayFamily,
  type PlayerIdentity,
  type Position,
  type Relations,
  type StandingRow,
} from "@football/protocol";
import { stableHash } from "./hash";
import { nextFloat, nextInt, seedPrng } from "./prng";

const ATTRIBUTE_KEYS: AttributeKey[] = ["technique", "finishing", "passing", "vision", "defense", "physical", "mental", "charisma"];

const POSITION_FAMILY: Record<Position, PlayFamily> = {
  GK: "keeper", LB: "defender", CB: "defender", RB: "defender", DM: "support", CM: "creator", AM: "creator",
  LW: "support", RW: "support", SS: "finisher", ST: "finisher", CF: "finisher",
};

const weights = (technique: number, finishing: number, passing: number, vision: number, defense: number, physical: number, mental: number, charisma: number): Attributes =>
  ({ technique, finishing, passing, vision, defense, physical, mental, charisma });

export const OVERALL_WEIGHTS: Record<Position, Attributes> = {
  GK: weights(5, 0, 8, 7, 36, 20, 20, 4),
  LB: weights(12, 3, 15, 10, 24, 20, 12, 4),
  CB: weights(7, 2, 9, 10, 32, 23, 14, 3),
  RB: weights(12, 3, 15, 10, 24, 20, 12, 4),
  DM: weights(12, 3, 17, 16, 22, 16, 11, 3),
  CM: weights(17, 5, 22, 20, 10, 11, 11, 4),
  AM: weights(20, 13, 20, 24, 3, 7, 9, 4),
  LW: weights(24, 19, 14, 13, 3, 14, 8, 5),
  RW: weights(24, 19, 14, 13, 3, 14, 8, 5),
  SS: weights(21, 25, 13, 16, 2, 10, 9, 4),
  ST: weights(15, 34, 8, 9, 2, 18, 10, 4),
  CF: weights(19, 28, 13, 14, 2, 11, 9, 4),
};

const ACTION_WEIGHTS: Record<MatchAction, Partial<Attributes>> = {
  pass: { passing: 45, vision: 35, technique: 20 },
  "through-ball": { passing: 35, vision: 40, technique: 25 },
  dribble: { technique: 60, physical: 20, mental: 20 },
  shot: { finishing: 60, technique: 22, mental: 18 },
  position: { vision: 38, mental: 37, physical: 25 },
  intercept: { defense: 48, vision: 27, mental: 25 },
  tackle: { defense: 50, physical: 32, mental: 18 },
  save: { defense: 54, mental: 28, physical: 18 },
  distribute: { passing: 44, vision: 34, technique: 22 },
};

const DIFFICULTY_THRESHOLD: Record<Difficulty, number> = { assisted: 48, standard: 56, expert: 64 };

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function eventText(fr: string, en: string): LocalizedText {
  return { fr, en };
}

function domainEvent(state: CareerState, type: DomainEvent["type"], text: LocalizedText, payload?: DomainEvent["payload"]): DomainEvent {
  return { id: `${state.season}-${state.week}-${state.commandCount}-${type}`, type, text, payload };
}

export function familyForPosition(position: Position): PlayFamily {
  return POSITION_FAMILY[position];
}

export function calculateOverall(attributes: Attributes, position: Position): number {
  const positionWeights = OVERALL_WEIGHTS[position];
  const total = ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key] * positionWeights[key], 0);
  return Math.round(total / 100);
}

function initialAttributes(position: Position): Attributes {
  const family = familyForPosition(position);
  const bases: Record<PlayFamily, Attributes> = {
    finisher: weights(57, 61, 49, 52, 31, 55, 50, 48),
    creator: weights(59, 47, 61, 62, 41, 49, 54, 49),
    support: weights(56, 47, 57, 55, 50, 57, 54, 47),
    defender: weights(47, 31, 50, 49, 61, 59, 55, 43),
    keeper: weights(42, 20, 48, 50, 64, 58, 58, 46),
  };
  return { ...bases[family] };
}

function generateFixtures(club: ClubRef, season: number): Fixture[] {
  const divisionClubs = clubsFor(club.country, club.division).slice().sort((a, b) => a.id.localeCompare(b.id));
  if (!divisionClubs.some((candidate) => candidate.id === club.id)) divisionClubs[divisionClubs.length - 1] = club;
  let rotation = divisionClubs.map((candidate) => candidate.id);
  const rounds: Fixture[][] = [];
  for (let round = 0; round < rotation.length - 1; round += 1) {
    const fixtures: Fixture[] = [];
    for (let index = 0; index < rotation.length / 2; index += 1) {
      const left = rotation[index]!;
      const right = rotation[rotation.length - 1 - index]!;
      const flip = (round + index) % 2 === 1;
      const homeClubId = flip ? right : left;
      const awayClubId = flip ? left : right;
      fixtures.push({
        id: `s${season}-w${round + 1}-${homeClubId}-${awayClubId}`,
        week: round + 1,
        homeClubId,
        awayClubId,
        competition: "league",
        played: false,
        isMajor: (round + 1) % 5 === 0 || round === rotation.length - 2,
      });
    }
    rounds.push(fixtures);
    rotation = [rotation[0]!, rotation[rotation.length - 1]!, ...rotation.slice(1, -1)];
  }
  const reverse = rounds.map((fixtures, round) => fixtures.map((fixture) => ({
    ...fixture,
    id: `s${season}-w${round + 12}-${fixture.awayClubId}-${fixture.homeClubId}`,
    week: round + 12,
    homeClubId: fixture.awayClubId,
    awayClubId: fixture.homeClubId,
  })));
  return [...rounds.flat(), ...reverse.flat()];
}

function createStandings(club: ClubRef): StandingRow[] {
  return clubsFor(club.country, club.division).map((candidate) => ({
    clubId: candidate.id, played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0,
  }));
}

export function createCareer(
  seed: string,
  identity: PlayerIdentity,
  difficulty: Difficulty = "standard",
  language: Language = "fr",
): CareerState {
  if (!seed.trim()) throw new Error("A career seed is required");
  let prng = seedPrng(seed);
  const divisionClubs = clubsFor(identity.nationality, 2);
  const clubDraw = nextInt(prng, 0, divisionClubs.length - 1);
  prng = clubDraw.state;
  const club = divisionClubs[clubDraw.value]!;
  const attributes = initialAttributes(identity.position);
  for (const key of ATTRIBUTE_KEYS) {
    const draw = nextInt(prng, -4, 4);
    prng = draw.state;
    attributes[key] = clamp(attributes[key] + draw.value);
  }
  const potentialDraw = nextInt(prng, 78, 94);
  prng = potentialDraw.state;
  const player = {
    identity: clone(identity),
    age: 16,
    attributes,
    overall: calculateOverall(attributes, identity.position),
    potential: potentialDraw.value,
    form: 55,
    energy: 88,
    morale: 68,
    reputation: 8,
    marketValue: 300_000,
    salary: 500,
    money: 1_200,
    injuryWeeks: 0,
    role: "academy" as const,
    traits: [],
    seasonStats: { appearances: 0, starts: 0, goals: 0, assists: 0, cleanSheets: 0, ratingTotal: 0, minutes: 0, trophies: 0 },
  };
  return {
    schemaVersion: SCHEMA_VERSION,
    rulesVersion: RULES_VERSION,
    contentVersion: CONTENT_VERSION,
    seed,
    prng,
    language,
    difficulty,
    season: 1,
    week: 1,
    phase: "preparation",
    player,
    activeCountry: club.country,
    club,
    contract: { clubId: club.id, startSeason: 1, endSeason: 3, weeklySalary: 500, squadRole: "academy" },
    relations: { coach: 52, team: 50, supporters: 42, family: 70, agent: 48, media: 38 },
    fixtures: generateFixtures(club, 1),
    standings: createStandings(club),
    notifications: [{ id: "career-start", kind: "story", text: eventText("Ton premier contrat professionnel commence ici.", "Your first professional contract starts here."), week: 1 }],
    history: [],
    achievements: [],
    commandCount: 0,
  };
}

function playerFixture(state: CareerState): Fixture | undefined {
  return state.fixtures.find((fixture) => fixture.week === state.week && !fixture.played && (fixture.homeClubId === state.club.id || fixture.awayClubId === state.club.id));
}

function buildMatchScenario(state: CareerState): { scenario: MatchScenario; prng: CareerState["prng"] } {
  const fixture = playerFixture(state);
  if (!fixture) throw new Error("No playable fixture for this week");
  const family = familyForPosition(state.player.identity.position);
  const templates = MATCH_SITUATIONS.filter((template) => template.family === family);
  let prng = state.prng;
  const templateDraw = nextInt(prng, 0, templates.length - 1);
  prng = templateDraw.state;
  const template = templates[templateDraw.value]!;
  const clockDraw = nextInt(prng, template.clock[0], template.clock[1]);
  prng = clockDraw.state;
  const pressureDraw = nextInt(prng, template.pressure[0], template.pressure[1]);
  prng = pressureDraw.state;
  const scoreHome = nextInt(prng, 0, 2); prng = scoreHome.state;
  const scoreAway = nextInt(prng, 0, 2); prng = scoreAway.state;
  const actors = [
    { id: "player", team: "player" as const, role: state.player.identity.position, position: { ...template.playerPosition } },
    ...template.teammatePositions.map((position, index) => ({ id: `mate-${index + 1}`, team: "player" as const, role: "teammate", position: { ...position } })),
    ...template.opponentPositions.map((position, index) => ({ id: `opponent-${index + 1}`, team: "opponent" as const, role: index === 0 ? "marker" : "cover", position: { ...position } })),
  ];
  return {
    prng,
    scenario: {
      id: `${fixture.id}-${template.id}-${state.commandCount}`,
      templateId: template.id,
      family,
      clock: clockDraw.value,
      homeScore: scoreHome.value,
      awayScore: scoreAway.value,
      actors,
      ball: { ...template.ball },
      objective: template.objective,
      allowedActions: [...template.allowedActions],
      pressure: pressureDraw.value,
      difficulty: state.difficulty,
      attemptsRemaining: fixture.isMajor ? 3 : 1,
    },
  };
}

export function createMatchScenario(state: CareerState): MatchScenario {
  return buildMatchScenario(state).scenario;
}

function actionSkill(attributes: Attributes, action: MatchAction): number {
  const actionWeights = ACTION_WEIGHTS[action];
  return ATTRIBUTE_KEYS.reduce((sum, key) => sum + attributes[key] * (actionWeights[key] ?? 0), 0) / 100;
}

export function resolveMatchScenario(state: CareerState, scenario: MatchScenario, input: MatchInput): MatchResolution {
  if (!scenario.allowedActions.includes(input.action)) throw new Error(`Action ${input.action} is not allowed in this scenario`);
  const directionLength = Math.hypot(input.direction.x, input.direction.y);
  const normalizedDirection = directionLength > 0 ? { x: input.direction.x / directionLength, y: input.direction.y / directionLength } : { x: 0, y: 1 };
  const power = clamp(input.power, 0, 1);
  const timing = clamp(input.timing, 0, 1);
  const skill = actionSkill(state.player.attributes, input.action);
  const energyContribution = state.player.energy * 0.14;
  const pressureContribution = (100 - scenario.pressure) * 0.11;
  const powerPrecision = 100 - Math.abs(power - 0.72) * 145;
  const timingPrecision = 100 - Math.abs(timing - 0.5) * 170;
  const preferredDirection = state.player.identity.preferredFoot === "right" ? 1 : -1;
  const weakFootPenalty = normalizedDirection.x * preferredDirection < -0.35 ? 4 : 0;
  const jitterSeed = stableHash({ seed: state.seed, scenario: scenario.id, input, command: state.commandCount });
  const jitter = (Number.parseInt(jitterSeed.slice(0, 8), 16) / 0xffffffff - 0.5) * 14;
  const quality = clamp(skill * 0.58 + energyContribution + pressureContribution + powerPrecision * 0.09 + timingPrecision * 0.08 + jitter - weakFootPenalty);
  const success = quality >= DIFFICULTY_THRESHOLD[scenario.difficulty];
  const distance = 7 + power * 28;
  const ballEnd = {
    x: clamp(scenario.ball.x + normalizedDirection.x * distance, -34, 34),
    y: clamp(scenario.ball.y + normalizedDirection.y * distance, -48, 48),
  };
  const successText: LocalizedText = input.action === "save"
    ? eventText("Arrêt décisif !", "A decisive save!")
    : input.action === "shot"
      ? eventText("Le geste fait la différence !", "The move makes the difference!")
      : eventText("Action réussie sous pression.", "The action comes off under pressure.");
  const failureText = eventText("L'adversaire lit le geste.", "The opponent reads the move.");
  return { success, quality: Math.round(quality * 100) / 100, rating: Math.round((5.2 + quality / 45 + (success ? 0.35 : -0.3)) * 10) / 10, narration: success ? successText : failureText, ballEnd };
}

function updateStanding(standings: StandingRow[], fixture: Fixture): void {
  const home = standings.find((row) => row.clubId === fixture.homeClubId);
  const away = standings.find((row) => row.clubId === fixture.awayClubId);
  if (!home || !away || fixture.homeScore === undefined || fixture.awayScore === undefined) return;
  home.played += 1; away.played += 1;
  home.gf += fixture.homeScore; home.ga += fixture.awayScore;
  away.gf += fixture.awayScore; away.ga += fixture.homeScore;
  if (fixture.homeScore > fixture.awayScore) { home.won += 1; home.points += 3; away.lost += 1; }
  else if (fixture.homeScore < fixture.awayScore) { away.won += 1; away.points += 3; home.lost += 1; }
  else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
}

function drawGoals(state: CareerState, homeId: string, awayId: string): [number, number] {
  const homeClub = CLUBS.find((club) => club.id === homeId);
  const awayClub = CLUBS.find((club) => club.id === awayId);
  const homeDraw = nextFloat(state.prng); state.prng = homeDraw.state;
  const awayDraw = nextFloat(state.prng); state.prng = awayDraw.state;
  const homeStrength = (homeClub?.prestige ?? 50) / 100;
  const awayStrength = (awayClub?.prestige ?? 50) / 100;
  return [Math.min(5, Math.floor(homeDraw.value * 3.2 + homeStrength + 0.35)), Math.min(5, Math.floor(awayDraw.value * 3.2 + awayStrength))];
}

function simulateWeek(state: CareerState, resolution?: MatchResolution, action?: MatchAction): DomainEvent[] {
  const events: DomainEvent[] = [];
  const fixtures = state.fixtures.filter((fixture) => fixture.week === state.week && !fixture.played);
  for (const fixture of fixtures) {
    let [homeScore, awayScore] = drawGoals(state, fixture.homeClubId, fixture.awayClubId);
    const isPlayerFixture = fixture.homeClubId === state.club.id || fixture.awayClubId === state.club.id;
    if (isPlayerFixture && resolution?.success) {
      const playerIsHome = fixture.homeClubId === state.club.id;
      if (action === "shot") {
        if (playerIsHome) homeScore += 1; else awayScore += 1;
        state.player.seasonStats.goals += 1;
        if (!state.achievements.includes("first-goal")) state.achievements.push("first-goal");
      } else if (action === "pass" || action === "through-ball" || action === "dribble") {
        if (playerIsHome) homeScore += 1; else awayScore += 1;
        state.player.seasonStats.assists += 1;
      } else if (action === "save") {
        if (playerIsHome) awayScore = Math.max(0, awayScore - 1); else homeScore = Math.max(0, homeScore - 1);
      }
    }
    fixture.homeScore = homeScore;
    fixture.awayScore = awayScore;
    fixture.played = true;
    updateStanding(state.standings, fixture);
    if (isPlayerFixture) {
      state.player.seasonStats.appearances += 1;
      if (state.player.role === "starter" || state.player.role === "star") state.player.seasonStats.starts += 1;
      state.player.seasonStats.minutes += state.player.role === "academy" ? 25 : state.player.role === "prospect" ? 52 : 82;
      const rating = resolution?.rating ?? 5.8 + (homeScore === awayScore ? 0.2 : 0.4);
      state.player.seasonStats.ratingTotal += rating;
      const opponentScore = fixture.homeClubId === state.club.id ? awayScore : homeScore;
      if (opponentScore === 0 && (familyForPosition(state.player.identity.position) === "defender" || familyForPosition(state.player.identity.position) === "keeper")) {
        state.player.seasonStats.cleanSheets += 1;
      }
      state.player.form = clamp(state.player.form + (rating - 6.2) * 4);
      state.player.morale = clamp(state.player.morale + (rating - 6) * 2);
      state.player.reputation = clamp(state.player.reputation + Math.max(0, rating - 6.3) * 0.8);
      state.player.energy = clamp(state.player.energy - 19);
      if (!state.achievements.includes("professional-debut")) state.achievements.push("professional-debut");
      events.push(domainEvent(state, "match", eventText(`Résultat : ${homeScore}–${awayScore}.`, `Result: ${homeScore}–${awayScore}.`), { homeScore, awayScore, rating }));
    }
  }
  return events;
}

function chooseStoryEvent(state: CareerState): string {
  const eligible = STORY_EVENTS.filter((event) => state.player.age >= event.minAge && state.player.age <= event.maxAge && (!event.relationGate || (
    (event.relationGate.below === undefined || state.relations[event.relationGate.key] < event.relationGate.below) &&
    (event.relationGate.above === undefined || state.relations[event.relationGate.key] > event.relationGate.above)
  )));
  const totalWeight = eligible.reduce((sum, event) => sum + event.weight, 0);
  const draw = nextFloat(state.prng); state.prng = draw.state;
  let cursor = draw.value * totalWeight;
  for (const event of eligible) {
    cursor -= event.weight;
    if (cursor <= 0) return event.id;
  }
  return eligible[eligible.length - 1]!.id;
}

function applyEffects(state: CareerState, effects: ChoiceEffects, events: DomainEvent[]): void {
  if (effects.attributes) {
    for (const key of ATTRIBUTE_KEYS) {
      const amount = effects.attributes[key];
      if (amount) {
        const growthRoom = Math.max(0.2, (state.player.potential - state.player.attributes[key]) / 20);
        state.player.attributes[key] = clamp(state.player.attributes[key] + amount * Math.min(1, growthRoom));
        events.push(domainEvent(state, "attribute", eventText(`${key} ${amount > 0 ? "+" : ""}${amount}`, `${key} ${amount > 0 ? "+" : ""}${amount}`), { attribute: key, amount }));
      }
    }
  }
  if (effects.relations) {
    for (const key of Object.keys(effects.relations) as Array<keyof Relations>) {
      const amount = effects.relations[key] ?? 0;
      state.relations[key] = clamp(state.relations[key] + amount);
      events.push(domainEvent(state, "relation", eventText(`Relation ${key} ${amount >= 0 ? "+" : ""}${amount}`, `${key} relationship ${amount >= 0 ? "+" : ""}${amount}`), { relation: key, amount }));
    }
  }
  if (effects.energy) state.player.energy = clamp(state.player.energy + effects.energy);
  if (effects.morale) state.player.morale = clamp(state.player.morale + effects.morale);
  if (effects.reputation) state.player.reputation = clamp(state.player.reputation + effects.reputation);
  if (effects.money) {
    state.player.money = Math.max(0, state.player.money + effects.money);
    events.push(domainEvent(state, "finance", eventText(`Solde ${effects.money >= 0 ? "+" : ""}${effects.money} €`, `Balance ${effects.money >= 0 ? "+" : ""}€${effects.money}`), { amount: effects.money }));
  }
}

function enforceInvariants(state: CareerState): void {
  for (const key of ATTRIBUTE_KEYS) state.player.attributes[key] = clamp(state.player.attributes[key], 1, 99);
  for (const key of Object.keys(state.relations) as Array<keyof Relations>) state.relations[key] = clamp(state.relations[key]);
  state.player.form = clamp(state.player.form);
  state.player.energy = clamp(state.player.energy);
  state.player.morale = clamp(state.player.morale);
  state.player.reputation = clamp(state.player.reputation);
  state.player.injuryWeeks = Math.max(0, Math.floor(state.player.injuryWeeks));
  state.player.marketValue = Math.max(0, Math.round(state.player.marketValue));
  state.player.salary = Math.max(0, Math.round(state.player.salary));
  state.player.money = Math.max(0, Math.round(state.player.money));
  state.player.overall = calculateOverall(state.player.attributes, state.player.identity.position);
  state.player.potential = clamp(state.player.potential, state.player.overall, 99);
  const appearances = state.player.seasonStats.appearances;
  if (state.player.overall >= 78 || appearances >= 18) state.player.role = "star";
  else if (state.player.overall >= 68 || appearances >= 12) state.player.role = "starter";
  else if (state.player.overall >= 60 || appearances >= 7) state.player.role = "rotation";
  else if (appearances >= 3) state.player.role = "prospect";
  state.player.marketValue = Math.max(state.player.marketValue, Math.round((state.player.overall ** 3) * 6.5 + state.player.reputation * 25_000));
}

export interface AdvanceResult { state: CareerState; events: DomainEvent[] }

export function advanceCareer(current: CareerState, command: CareerCommand): AdvanceResult {
  const state = clone(current);
  const events: DomainEvent[] = [];
  state.commandCount += 1;

  switch (command.type) {
    case "PREPARE": {
      if (state.phase !== "preparation") throw new Error("Preparation is not available in the current phase");
      if (command.kind === "training") {
        const draw = nextInt(state.prng, 0, ATTRIBUTE_KEYS.length - 1); state.prng = draw.state;
        const key = ATTRIBUTE_KEYS[draw.value]!;
        applyEffects(state, { attributes: { [key]: 1 }, energy: -11, morale: 1 }, events);
      } else if (command.kind === "recovery") applyEffects(state, { energy: 20, morale: 4 }, events);
      else if (command.kind === "relationship") {
        const relationKeys = Object.keys(state.relations) as Array<keyof Relations>;
        const draw = nextInt(state.prng, 0, relationKeys.length - 1); state.prng = draw.state;
        applyEffects(state, { relations: { [relationKeys[draw.value]!]: 7 }, morale: 2 }, events);
      } else if (command.kind === "media") applyEffects(state, { reputation: 3, relations: { media: 4, supporters: 2 }, energy: -3 }, events);
      else applyEffects(state, { relations: { agent: 6 }, money: -50, reputation: 1 }, events);
      state.phase = "match";
      break;
    }
    case "START_MATCH": {
      if (state.phase !== "match" || state.pendingScenario) throw new Error("The match cannot be started now");
      if (state.player.injuryWeeks > 0) throw new Error("An injured player cannot start a match");
      const built = buildMatchScenario(state);
      state.prng = built.prng;
      state.pendingScenario = built.scenario;
      break;
    }
    case "MATCH_ACTION": {
      if (state.phase !== "match" || !state.pendingScenario) throw new Error("No active match scenario");
      const resolution = resolveMatchScenario(state, state.pendingScenario, command.input);
      events.push(domainEvent(state, "match", resolution.narration, { success: resolution.success, quality: resolution.quality, rating: resolution.rating }));
      events.push(...simulateWeek(state, resolution, command.input.action));
      state.pendingScenario = undefined;
      state.pendingEventId = chooseStoryEvent(state);
      state.phase = "decision";
      break;
    }
    case "SIMULATE_MATCH": {
      if (state.phase !== "match") throw new Error("There is no match to simulate");
      const performanceDraw = nextFloat(state.prng); state.prng = performanceDraw.state;
      const simulated: MatchResolution = {
        success: performanceDraw.value < (state.player.overall + state.player.form) / 210,
        quality: Math.round(performanceDraw.value * 100),
        rating: Math.round((5.2 + performanceDraw.value * 2.6) * 10) / 10,
        narration: eventText("Match simulé.", "Match simulated."),
        ballEnd: { x: 0, y: 0 },
      };
      const simulatedAction: Record<PlayFamily, MatchAction> = { finisher: "shot", creator: "pass", support: "pass", defender: "intercept", keeper: "save" };
      const family = familyForPosition(state.player.identity.position);
      const involvementChance: Record<PlayFamily, number> = { finisher: 0.48, creator: 0.42, support: 0.3, defender: 0.22, keeper: 0.35 };
      const involvement = nextFloat(state.prng); state.prng = involvement.state;
      events.push(...simulateWeek(state, simulated, involvement.value < involvementChance[family] ? simulatedAction[family] : undefined));
      state.pendingScenario = undefined;
      state.pendingEventId = chooseStoryEvent(state);
      state.phase = "decision";
      break;
    }
    case "DECIDE": {
      if (state.phase !== "decision" || state.pendingEventId !== command.eventId) throw new Error("This story decision is not active");
      const story = eventById(command.eventId);
      const choice = story?.choices.find((candidate) => candidate.id === command.choiceId);
      if (!story || !choice) throw new Error("Unknown story choice");
      applyEffects(state, choice.effects, events);
      events.push(domainEvent(state, "story", story.title, { eventId: story.id, choiceId: choice.id }));
      state.pendingEventId = undefined;
      state.phase = "review";
      break;
    }
    case "ADVANCE_WEEK": {
      if (state.phase !== "review") throw new Error("The week cannot be advanced yet");
      state.player.money += state.contract.weeklySalary;
      state.player.energy = clamp(state.player.energy + 12);
      if (state.player.injuryWeeks > 0) state.player.injuryWeeks -= 1;
      if (state.week >= 22) state.phase = "chapter-end";
      else { state.week += 1; state.phase = "preparation"; }
      break;
    }
    case "ACCEPT_CONTRACT": {
      const club = CLUBS.find((candidate) => candidate.id === command.clubId);
      if (!club) throw new Error("Unknown contract club");
      if (command.salary < 0 || command.years < 1 || command.years > 6) throw new Error("Invalid contract terms");
      state.club = club;
      state.activeCountry = club.country;
      state.contract = { clubId: club.id, startSeason: state.season, endSeason: state.season + command.years, weeklySalary: Math.round(command.salary), squadRole: state.player.role };
      state.player.salary = Math.round(command.salary);
      state.fixtures = generateFixtures(club, state.season);
      state.standings = createStandings(club);
      events.push(domainEvent(state, "finance", eventText(`Nouveau contrat avec ${club.name}.`, `New contract with ${club.name}.`), { clubId: club.id, salary: command.salary, years: command.years }));
      break;
    }
    case "ADVANCE_SEASON": {
      if (state.phase !== "chapter-end") throw new Error("The current season is not complete");
      const stats = state.player.seasonStats;
      state.history.push({ season: state.season, clubId: state.club.id, appearances: stats.appearances, goals: stats.goals, assists: stats.assists, averageRating: stats.appearances ? stats.ratingTotal / stats.appearances : 0, trophies: stats.trophies });
      if (state.player.age >= 24) break;
      state.season += 1;
      state.week = 1;
      state.player.age += 1;
      state.player.seasonStats = { appearances: 0, starts: 0, goals: 0, assists: 0, cleanSheets: 0, ratingTotal: 0, minutes: 0, trophies: 0 };
      state.player.energy = 92;
      state.player.form = clamp(state.player.form * 0.7 + 20);
      state.fixtures = generateFixtures(state.club, state.season);
      state.standings = createStandings(state.club);
      state.phase = "preparation";
      break;
    }
  }

  enforceInvariants(state);
  return { state, events };
}

export type ChallengeBreakdown = Record<"performance" | "results" | "progression" | "honours" | "reputation" | "finances", number>;

export function computeChallengeScore(finalState: CareerState, initialState?: CareerState): { score: number; breakdown: ChallengeBreakdown } {
  const allAppearances = finalState.history.reduce((sum, season) => sum + season.appearances, 0) + finalState.player.seasonStats.appearances;
  const ratingTotal = finalState.history.reduce((sum, season) => sum + season.averageRating * season.appearances, 0) + finalState.player.seasonStats.ratingTotal;
  const averageRating = allAppearances ? ratingTotal / allAppearances : 5;
  const totalGoals = finalState.history.reduce((sum, season) => sum + season.goals, 0) + finalState.player.seasonStats.goals;
  const totalAssists = finalState.history.reduce((sum, season) => sum + season.assists, 0) + finalState.player.seasonStats.assists;
  const family = familyForPosition(finalState.player.identity.position);
  const outputPoints: Record<PlayFamily, number> = {
    finisher: totalGoals * 0.18 + totalAssists * 0.08,
    creator: totalGoals * 0.08 + totalAssists * 0.18,
    support: totalGoals * 0.06 + totalAssists * 0.16,
    defender: totalGoals * 0.08 + totalAssists * 0.08 + finalState.player.seasonStats.cleanSheets * 1.6,
    keeper: finalState.player.seasonStats.cleanSheets * 1.7,
  };
  const performance = clamp((averageRating - 4.5) * 24 + Math.min(22, outputPoints[family]));
  const table = finalState.standings.slice().sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga));
  const tableIndex = table.findIndex((row) => row.clubId === finalState.club.id);
  const resultStanding = tableIndex < 0 ? 0 : (table.length - 1 - tableIndex) / Math.max(1, table.length - 1) * 70;
  const trophies = finalState.history.reduce((sum, season) => sum + season.trophies, 0) + finalState.player.seasonStats.trophies;
  const results = clamp(resultStanding + trophies * 15);
  const initialOverall = initialState?.player.overall ?? 50;
  const progression = clamp((finalState.player.overall - initialOverall) * 7 + (finalState.player.age - 16) * 2);
  const honours = clamp(trophies * 24 + finalState.achievements.length * 7);
  const relationAverage = Object.values(finalState.relations).reduce((sum, value) => sum + value, 0) / 6;
  const reputation = clamp(finalState.player.reputation * 0.58 + relationAverage * 0.42);
  const finances = clamp(Math.log10(Math.max(10, finalState.player.marketValue)) * 10 + Math.log10(Math.max(10, finalState.player.salary)) * 7 + Math.log10(Math.max(10, finalState.player.money)) * 4 - 35);
  const breakdown = {
    performance: Math.round(performance * 100) / 100,
    results: Math.round(results * 100) / 100,
    progression: Math.round(progression * 100) / 100,
    honours: Math.round(honours * 100) / 100,
    reputation: Math.round(reputation * 100) / 100,
    finances: Math.round(finances * 100) / 100,
  };
  const score = breakdown.performance * 0.4 + breakdown.results * 0.2 + breakdown.progression * 0.15 + breakdown.honours * 0.1 + breakdown.reputation * 0.1 + breakdown.finances * 0.05;
  return { score: Math.round(score * 100), breakdown };
}
