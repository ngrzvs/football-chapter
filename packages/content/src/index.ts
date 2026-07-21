import { z } from "zod";
import type {
  AttributeKey,
  ClubRef,
  CountryCode,
  LocalizedText,
  MatchAction,
  PlayFamily,
  RelationKey,
  Vec2,
} from "@football/protocol";

export interface ChoiceEffects {
  attributes?: Partial<Record<AttributeKey, number>>;
  relations?: Partial<Record<RelationKey, number>>;
  energy?: number;
  morale?: number;
  reputation?: number;
  money?: number;
}

export interface StoryChoice {
  id: string;
  label: LocalizedText;
  effects: ChoiceEffects;
}

export interface StoryEvent {
  id: string;
  category: "coach" | "team" | "family" | "media" | "agent" | "supporters";
  title: LocalizedText;
  body: LocalizedText;
  choices: [StoryChoice, StoryChoice];
  minAge: number;
  maxAge: number;
  weight: number;
  relationGate?: { key: RelationKey; below?: number; above?: number };
  arcId?: string;
}

export interface NarrativeArc {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  chapters: [LocalizedText, LocalizedText, LocalizedText];
  minSeason: number;
}

export interface MatchSituationTemplate {
  id: string;
  family: PlayFamily;
  title: LocalizedText;
  objective: LocalizedText;
  allowedActions: MatchAction[];
  ball: Vec2;
  playerPosition: Vec2;
  opponentPositions: Vec2[];
  teammatePositions: Vec2[];
  pressure: [number, number];
  clock: [number, number];
}

const countryNames: Record<CountryCode, string[]> = {
  FR: ["Montclair", "Belle-Rive", "Valmont", "Rochebrune", "Port-Lumière", "Saint-Lys", "Grandville", "Ardenne", "Côte-Verte", "Aubrac", "Lac-d'Or", "Montferrand", "Villedune", "Aurore", "Rivage", "Beaumont", "Cèdre", "Aigues", "Vallière", "Étoile-sur-Mer", "Lorienne", "Sologne", "Noroît", "Champdor"],
  EN: ["Ashbourne", "Kingsport", "Redwick", "Northcastle", "Westmere", "Bridgeford", "Oakhampton", "Ravensbury", "Greenwich Vale", "Stonehaven", "Crownfield", "Eastmoor", "Foxbridge", "Hartchester", "Marlowe", "Whitcombe", "Lakeside", "Briarwich", "Dunwall", "Rosebury", "Highcross", "Wexford Vale", "Ironhill", "Southbank"],
  ES: ["Puerto Claro", "Valdeoro", "Sierra Azul", "Costa Nueva", "Monteverde", "Río Blanco", "Campo Real", "Santa Aurora", "Bahía Sol", "Las Encinas", "Villamar", "Alto Duero", "Estrella Sur", "Loma Roja", "Mar Serena", "Fuente Clara", "Peña Dorada", "Cerro Norte", "Olivares", "Luz del Mar", "Valle Luna", "Costa Brava Nueva", "Mirador", "Reino Azul"],
  IT: ["Montechiaro", "Porto Nuovo", "Valdoro", "Rocca Verde", "San Celeste", "Borgo Alto", "Costa d'Ambra", "Lago Reale", "Pianura", "Fonteluce", "Villa Nova", "Colle Rosso", "Marina Blu", "Castelvento", "Aurora Nord", "Valle d'Argento", "Riva Bianca", "Stella Sud", "Boscoverde", "Città del Sole", "Porta Reale", "Monte Rosa Nuovo", "Fiume Alto", "Torrechiara"],
  DE: ["Adlerhafen", "Grünwald", "Kronberg", "Rheinstadt", "Nordtal", "Sonnenfeld", "Eichenfurt", "Falkenheim", "Westbruck", "Bergsee", "Rotwald", "Silberstadt", "Hochland", "Elbhafen", "Wiesental", "Steinburg", "Lindenau", "Morgenrot", "Tannenberg", "Küstenwald", "Havelstadt", "Donaufeld", "Königstal", "Blauheim"],
  BR: ["Aurora Paulista", "Vale Verde", "Porto Dourado", "Serra Nova", "Estrela Carioca", "União do Sol", "Atlético Horizonte", "Real Amazônia", "Praia Azul", "Ferroviário Central", "Nação Mineira", "Jardim Sul", "Vila Imperial", "Rio Claro", "Ouro Negro", "Palmeira do Norte", "Litoral Forte", "Coração Baiano", "Metrópole", "Guará Vermelho", "Nova Esperança", "Cruzeiro do Vale", "Santa Vitória", "Pioneiros"],
};

const palettes: [string, string][] = [
  ["#71e665", "#0e261a"], ["#ffd84a", "#161a24"], ["#ef5350", "#f5f1e8"], ["#56a8ff", "#081b35"],
  ["#f4f1e8", "#222831"], ["#be7cff", "#181028"], ["#ff8c42", "#3b1810"], ["#55d6be", "#101f32"],
];

export const CLUBS: ClubRef[] = (Object.keys(countryNames) as CountryCode[]).flatMap((country) =>
  countryNames[country].map((name, index) => {
    const division = (index < 12 ? 1 : 2) as 1 | 2;
    const palette = palettes[(index + country.charCodeAt(0)) % palettes.length]!;
    return {
      id: `${country.toLowerCase()}-${division}-${String((index % 12) + 1).padStart(2, "0")}`,
      name: `${name} ${index % 3 === 0 ? "Athletic" : index % 3 === 1 ? "Union" : "FC"}`,
      shortName: name.replace(/[^A-Za-zÀ-ÿ]/g, "").slice(0, 3).toUpperCase(),
      country,
      division,
      colors: palette,
      prestige: Math.min(92, (division === 1 ? 62 : 42) + ((index * 7 + country.charCodeAt(1)) % 25)),
    };
  }),
);

const eventSeeds: Array<{
  category: StoryEvent["category"];
  title: LocalizedText;
  body: LocalizedText;
  labels: [LocalizedText, LocalizedText];
  effects: [ChoiceEffects, ChoiceEffects];
}> = [
  { category: "coach", title: { fr: "Séance supplémentaire", en: "Extra session" }, body: { fr: "Le coach te propose de travailler après l'entraînement.", en: "The coach offers extra work after training." }, labels: [{ fr: "Rester travailler", en: "Stay and work" }, { fr: "Préserver mon énergie", en: "Save my energy" }], effects: [{ attributes: { technique: 1 }, relations: { coach: 4 }, energy: -8 }, { energy: 7, relations: { coach: -2 } }] },
  { category: "team", title: { fr: "Le nouveau du vestiaire", en: "The new teammate" }, body: { fr: "Une recrue peine à trouver sa place dans le groupe.", en: "A new signing is struggling to settle in." }, labels: [{ fr: "L'intégrer", en: "Welcome him" }, { fr: "Rester concentré", en: "Stay focused" }], effects: [{ relations: { team: 6 }, morale: 3 }, { attributes: { mental: 1 }, relations: { team: -2 } }] },
  { category: "media", title: { fr: "Question piège", en: "Loaded question" }, body: { fr: "Un journaliste insiste sur ton temps de jeu.", en: "A journalist presses you about playing time." }, labels: [{ fr: "Réponse collective", en: "Team-first answer" }, { fr: "Afficher mes ambitions", en: "State my ambition" }], effects: [{ relations: { media: 4, team: 3 }, reputation: 1 }, { reputation: 4, relations: { coach: -3, media: 2 } }] },
  { category: "family", title: { fr: "Une date importante", en: "An important date" }, body: { fr: "Ta famille espère te voir malgré le calendrier chargé.", en: "Your family hopes to see you despite the busy schedule." }, labels: [{ fr: "Faire le déplacement", en: "Make the trip" }, { fr: "Récupérer au club", en: "Recover at the club" }], effects: [{ relations: { family: 7 }, energy: -5, morale: 4 }, { energy: 10, relations: { family: -4 } }] },
  { category: "agent", title: { fr: "Premiers intérêts", en: "Early interest" }, body: { fr: "Ton agent évoque une piste sans garantie de temps de jeu.", en: "Your agent mentions interest with no guarantee of minutes." }, labels: [{ fr: "Écouter l'offre", en: "Hear the offer" }, { fr: "Fermer la porte", en: "Close the door" }], effects: [{ relations: { agent: 5, coach: -2 }, reputation: 2 }, { relations: { coach: 4, agent: -3 }, morale: 2 }] },
  { category: "supporters", title: { fr: "Au pied du virage", en: "By the home end" }, body: { fr: "Les supporters demandent quelques minutes après le match.", en: "Supporters ask for a few minutes after the match." }, labels: [{ fr: "Aller les saluer", en: "Go and greet them" }, { fr: "Rentrer récupérer", en: "Head in to recover" }], effects: [{ relations: { supporters: 7 }, reputation: 2, energy: -3 }, { energy: 6, relations: { supporters: -2 } }] },
  { category: "coach", title: { fr: "Nouveau rôle", en: "New role" }, body: { fr: "Le staff teste un rôle plus exigeant tactiquement.", en: "The staff tests you in a more demanding tactical role." }, labels: [{ fr: "Accepter le défi", en: "Accept the challenge" }, { fr: "Garder mes repères", en: "Keep my role" }], effects: [{ attributes: { vision: 1, mental: 1 }, energy: -7, relations: { coach: 5 } }, { morale: 3, relations: { coach: -2 } }] },
  { category: "team", title: { fr: "Tension à l'entraînement", en: "Training-ground tension" }, body: { fr: "Un duel appuyé déclenche une dispute.", en: "A heavy challenge starts an argument." }, labels: [{ fr: "Désamorcer", en: "Calm things down" }, { fr: "Ne rien lâcher", en: "Stand my ground" }], effects: [{ relations: { team: 5 }, attributes: { mental: 1 } }, { attributes: { physical: 1 }, relations: { team: -4 }, reputation: 1 }] },
  { category: "media", title: { fr: "Portrait de la semaine", en: "Feature of the week" }, body: { fr: "Une émission veut raconter ton parcours.", en: "A show wants to tell your story." }, labels: [{ fr: "Ouvrir les portes", en: "Let them in" }, { fr: "Rester discret", en: "Stay private" }], effects: [{ relations: { media: 6, supporters: 3 }, reputation: 4, energy: -3 }, { relations: { family: 3 }, morale: 2 }] },
  { category: "family", title: { fr: "Conseil d'enfance", en: "Childhood advice" }, body: { fr: "Un proche te rappelle ce qui t'a mené jusqu'ici.", en: "A relative reminds you what got you here." }, labels: [{ fr: "Prendre du recul", en: "Take perspective" }, { fr: "Redoubler d'efforts", en: "Work even harder" }], effects: [{ morale: 7, relations: { family: 5 } }, { attributes: { mental: 1 }, energy: -6 }] },
  { category: "agent", title: { fr: "Négociation d'image", en: "Image negotiation" }, body: { fr: "Une collaboration locale correspond à tes valeurs.", en: "A local collaboration fits your values." }, labels: [{ fr: "Signer", en: "Sign" }, { fr: "Attendre", en: "Wait" }], effects: [{ money: 850, reputation: 2, relations: { agent: 3 } }, { reputation: 1, relations: { agent: -1 } }] },
  { category: "supporters", title: { fr: "Le maillot d'un enfant", en: "A child's shirt" }, body: { fr: "Un jeune supporter t'attend à la sortie.", en: "A young supporter waits outside for you." }, labels: [{ fr: "Prendre le temps", en: "Make time" }, { fr: "Envoyer un cadeau", en: "Send a gift" }], effects: [{ relations: { supporters: 6 }, morale: 4, energy: -2 }, { relations: { supporters: 4 }, money: -120 }] },
  { category: "coach", title: { fr: "Analyse vidéo", en: "Video review" }, body: { fr: "Une séquence révèle un détail dans ton placement.", en: "A clip reveals a detail in your positioning." }, labels: [{ fr: "Étudier la séquence", en: "Study the clip" }, { fr: "Faire confiance à l'instinct", en: "Trust instinct" }], effects: [{ attributes: { vision: 1, defense: 1 }, energy: -4 }, { attributes: { technique: 1 }, morale: 2 }] },
  { category: "team", title: { fr: "Dîner du groupe", en: "Team dinner" }, body: { fr: "Le vestiaire organise une soirée avant une semaine calme.", en: "The squad plans dinner before a quiet week." }, labels: [{ fr: "Participer", en: "Join in" }, { fr: "Décliner", en: "Skip it" }], effects: [{ relations: { team: 7 }, morale: 5, energy: -3, money: -80 }, { energy: 6, relations: { team: -3 } }] },
  { category: "media", title: { fr: "Rumeur de transfert", en: "Transfer rumour" }, body: { fr: "Ton nom circule à l'approche du mercato.", en: "Your name is circulating before the window." }, labels: [{ fr: "Ne pas commenter", en: "No comment" }, { fr: "Clarifier ma position", en: "Clarify my position" }], effects: [{ relations: { media: -1 }, morale: 3 }, { relations: { media: 4, coach: 2 }, reputation: 2 }] },
  { category: "family", title: { fr: "Nouveau départ", en: "A new start" }, body: { fr: "Un changement de club bouleverserait aussi tes proches.", en: "A club move would affect your family too." }, labels: [{ fr: "Décider ensemble", en: "Decide together" }, { fr: "Priorité à la carrière", en: "Career comes first" }], effects: [{ relations: { family: 7, agent: -1 }, morale: 3 }, { relations: { agent: 4, family: -5 }, reputation: 2 }] },
  { category: "agent", title: { fr: "Clause et durée", en: "Clause and term" }, body: { fr: "Ton agent propose de privilégier la liberté future.", en: "Your agent suggests prioritising future flexibility." }, labels: [{ fr: "Contrat plus court", en: "Shorter contract" }, { fr: "Sécuriser maintenant", en: "Secure the future" }], effects: [{ relations: { agent: 5 }, reputation: 2 }, { money: 650, morale: 3 }] },
  { category: "supporters", title: { fr: "Message après la défaite", en: "Message after defeat" }, body: { fr: "Le public attend une réaction après un match difficile.", en: "The crowd expects a response after a difficult match." }, labels: [{ fr: "Assumer publiquement", en: "Take responsibility" }, { fr: "Répondre sur le terrain", en: "Answer on the pitch" }], effects: [{ relations: { supporters: 5, media: 3 }, reputation: 2 }, { attributes: { mental: 1 }, energy: -5 }] },
  { category: "coach", title: { fr: "Brassard provisoire", en: "Temporary armband" }, body: { fr: "Le capitaine est absent et le coach hésite.", en: "The captain is out and the coach is undecided." }, labels: [{ fr: "Me porter volontaire", en: "Volunteer" }, { fr: "Soutenir un cadre", en: "Back a senior player" }], effects: [{ attributes: { charisma: 1 }, relations: { coach: 3 }, reputation: 3 }, { relations: { team: 5 }, morale: 2 }] },
  { category: "team", title: { fr: "Le jeune à conseiller", en: "A youngster needs advice" }, body: { fr: "Un joueur de l'académie te demande de l'aide.", en: "An academy player asks you for guidance." }, labels: [{ fr: "Le prendre sous mon aile", en: "Mentor him" }, { fr: "Le renvoyer au staff", en: "Refer him to staff" }], effects: [{ relations: { team: 6 }, attributes: { charisma: 1 }, energy: -3 }, { relations: { coach: 2 }, energy: 2 }] },
];

const variants = [
  { suffix: "rookie", ages: [16, 18] as const, label: { fr: "Premiers pas", en: "First steps" } },
  { suffix: "breakthrough", ages: [17, 20] as const, label: { fr: "Éclosion", en: "Breakthrough" } },
  { suffix: "established", ages: [19, 22] as const, label: { fr: "Confirmation", en: "Established" } },
  { suffix: "pressure", ages: [20, 24] as const, label: { fr: "Sous pression", en: "Under pressure" } },
  { suffix: "international", ages: [21, 24] as const, label: { fr: "Nouveau statut", en: "New status" } },
  { suffix: "legacy", ages: [22, 24] as const, label: { fr: "Tracer la suite", en: "Shape what follows" } },
];

export const STORY_EVENTS: StoryEvent[] = eventSeeds.flatMap((seed, seedIndex) =>
  variants.map((variant, variantIndex) => ({
    id: `event-${String(seedIndex + 1).padStart(2, "0")}-${variant.suffix}`,
    category: seed.category,
    title: { fr: `${seed.title.fr} · ${variant.label.fr}`, en: `${seed.title.en} · ${variant.label.en}` },
    body: seed.body,
    choices: [
      { id: "a", label: seed.labels[0], effects: seed.effects[0] },
      { id: "b", label: seed.labels[1], effects: seed.effects[1] },
    ],
    minAge: variant.ages[0],
    maxAge: variant.ages[1],
    weight: 1 + ((seedIndex + variantIndex) % 3),
    arcId: seedIndex < 16 ? `arc-${String(seedIndex + 1).padStart(2, "0")}` : undefined,
  })),
);

const arcThemes: Array<[string, string, string, string]> = [
  ["Gagner sa place", "Earn your place", "Du centre de formation au onze de départ.", "From the academy to the starting eleven."],
  ["Le rival du vestiaire", "The squad rival", "Une concurrence qui peut te grandir ou t'isoler.", "A rivalry that can sharpen or isolate you."],
  ["La confiance du coach", "The coach's trust", "Des choix tactiques qui redéfinissent ton rôle.", "Tactical choices redefine your role."],
  ["La voix du public", "Voice of the crowd", "De l'espoir local au statut d'icône.", "From local hope to fan icon."],
  ["L'autre visage des médias", "The other face of media", "Apprendre à contrôler ton récit.", "Learn to control your own story."],
  ["Famille et distance", "Family and distance", "Les sacrifices derrière chaque transfert.", "The sacrifices behind every move."],
  ["La promesse de l'agent", "The agent's promise", "Ambition, loyauté et clauses cachées.", "Ambition, loyalty and hidden clauses."],
  ["Revenir plus fort", "Come back stronger", "Une blessure devient un tournant.", "An injury becomes a turning point."],
  ["Le brassard", "The armband", "Le leadership ne se résume pas à un titre.", "Leadership is more than a title."],
  ["Le grand départ", "The big move", "S'adapter à une nouvelle culture de football.", "Adapt to a new football culture."],
  ["L'appel des Espoirs", "Under-21 call", "Porter son pays change les attentes.", "Representing your country changes expectations."],
  ["La sélection", "The national team", "Une place parmi les meilleurs du pays.", "A place among the country's best."],
  ["La nuit continentale", "Continental night", "Transformer la pression en souvenir.", "Turn pressure into a defining memory."],
  ["Le contrat de trop", "One contract too many", "Choisir entre sécurité et progression.", "Choose between security and growth."],
  ["Transmettre", "Pass it on", "Aider la génération qui arrive.", "Help the generation coming through."],
  ["Le chapitre suivant", "The next chapter", "À 24 ans, le bilan ouvre encore le futur.", "At 24, reflection still opens the future."],
];

export const NARRATIVE_ARCS: NarrativeArc[] = arcThemes.map(([fr, en, summaryFr, summaryEn], index) => ({
  id: `arc-${String(index + 1).padStart(2, "0")}`,
  title: { fr, en },
  summary: { fr: summaryFr, en: summaryEn },
  chapters: [
    { fr: "Le signal", en: "The signal" },
    { fr: "Le choix", en: "The choice" },
    { fr: "La conséquence", en: "The consequence" },
  ],
  minSeason: 1 + Math.floor(index / 2),
}));

const situationSeeds: Record<PlayFamily, Array<[LocalizedText, LocalizedText, MatchAction[], Vec2]>> = {
  finisher: [
    [{ fr: "Face au but", en: "Through on goal" }, { fr: "Bats le gardien.", en: "Beat the goalkeeper." }, ["shot", "dribble"], { x: 0, y: 30 }],
    [{ fr: "Centre en retrait", en: "Cutback" }, { fr: "Attaque la zone libre.", en: "Attack the open space." }, ["position", "shot"], { x: -10, y: 24 }],
    [{ fr: "Dernier défenseur", en: "Last defender" }, { fr: "Crée l'angle de frappe.", en: "Create a shooting angle." }, ["dribble", "shot"], { x: 8, y: 21 }],
    [{ fr: "Appel croisé", en: "Diagonal run" }, { fr: "Prends la profondeur.", en: "Break into space." }, ["position", "shot"], { x: -14, y: 18 }],
    [{ fr: "Deuxième ballon", en: "Second ball" }, { fr: "Réagis avant la défense.", en: "React before the defence." }, ["position", "shot"], { x: 5, y: 26 }],
    [{ fr: "Contre à deux", en: "Two-player break" }, { fr: "Choisis entre passe et frappe.", en: "Choose pass or shot." }, ["pass", "shot"], { x: 10, y: 16 }],
    [{ fr: "Angle fermé", en: "Tight angle" }, { fr: "Trouve une finition improbable.", en: "Find an unlikely finish." }, ["dribble", "shot"], { x: 18, y: 30 }],
    [{ fr: "Dernière minute", en: "Last minute" }, { fr: "Convertis l'ultime occasion.", en: "Convert the final chance." }, ["shot", "pass"], { x: 0, y: 25 }],
  ],
  creator: [
    [{ fr: "Ligne brisée", en: "Break the line" }, { fr: "Trouve l'intervalle.", en: "Find the gap." }, ["pass", "through-ball"], { x: 0, y: 2 }],
    [{ fr: "Renversement", en: "Switch of play" }, { fr: "Change le point d'attaque.", en: "Switch the point of attack." }, ["pass"], { x: -18, y: -2 }],
    [{ fr: "Entre les lignes", en: "Between the lines" }, { fr: "Retourne-toi sous pression.", en: "Turn under pressure." }, ["dribble", "through-ball"], { x: 2, y: 12 }],
    [{ fr: "Passe aveugle", en: "Blind-side pass" }, { fr: "Anticipe l'appel.", en: "Anticipate the run." }, ["through-ball", "pass"], { x: 12, y: 6 }],
    [{ fr: "Transition rapide", en: "Fast transition" }, { fr: "Lance le contre.", en: "Launch the counter." }, ["through-ball", "dribble"], { x: -5, y: -5 }],
    [{ fr: "Bloc compact", en: "Compact block" }, { fr: "Déplace la défense.", en: "Move the defence." }, ["pass", "dribble"], { x: 0, y: 8 }],
    [{ fr: "Une-deux", en: "Give-and-go" }, { fr: "Combine dans un espace réduit.", en: "Combine in tight space." }, ["pass", "position"], { x: 8, y: 14 }],
    [{ fr: "Dernière passe", en: "Final pass" }, { fr: "Offre une occasion nette.", en: "Create a clear chance." }, ["through-ball", "pass"], { x: -4, y: 20 }],
  ],
  support: [
    [{ fr: "Solution courte", en: "Short option" }, { fr: "Soutiens le porteur.", en: "Support the ball carrier." }, ["position", "pass"], { x: -8, y: -4 }],
    [{ fr: "Course intérieure", en: "Inside run" }, { fr: "Libère le couloir.", en: "Open the wide channel." }, ["position", "pass"], { x: 14, y: 5 }],
    [{ fr: "Sous le pressing", en: "Under the press" }, { fr: "Conserve puis ressors.", en: "Keep it and play out." }, ["dribble", "pass"], { x: 0, y: -8 }],
    [{ fr: "Deuxième vague", en: "Second wave" }, { fr: "Arrive au bon moment.", en: "Arrive at the right time." }, ["position", "shot"], { x: -3, y: 16 }],
    [{ fr: "Couverture", en: "Cover" }, { fr: "Sécurise la transition.", en: "Secure the transition." }, ["position", "intercept"], { x: 6, y: -10 }],
    [{ fr: "Appui-remise", en: "Layoff" }, { fr: "Joue en une touche.", en: "Play first time." }, ["pass"], { x: 4, y: 8 }],
    [{ fr: "Largeur", en: "Width" }, { fr: "Étire le bloc adverse.", en: "Stretch the opposition." }, ["position", "pass"], { x: 22, y: 3 }],
    [{ fr: "Course de sacrifice", en: "Decoy run" }, { fr: "Crée l'espace pour un partenaire.", en: "Create space for a teammate." }, ["position"], { x: -11, y: 12 }],
  ],
  defender: [
    [{ fr: "Duel de dernier recours", en: "Last-ditch duel" }, { fr: "Stoppe l'attaquant.", en: "Stop the attacker." }, ["tackle", "position"], { x: 0, y: -27 }],
    [{ fr: "Ligne de passe", en: "Passing lane" }, { fr: "Lis et intercepte.", en: "Read and intercept." }, ["intercept", "position"], { x: -8, y: -16 }],
    [{ fr: "Centre dangereux", en: "Dangerous cross" }, { fr: "Protège la surface.", en: "Protect the box." }, ["position", "intercept"], { x: 12, y: -23 }],
    [{ fr: "Course dans le dos", en: "Run in behind" }, { fr: "Rattrape puis temporise.", en: "Recover and delay." }, ["position", "tackle"], { x: -15, y: -18 }],
    [{ fr: "Un contre un", en: "One versus one" }, { fr: "Force l'attaquant à l'extérieur.", en: "Force the attacker wide." }, ["position", "tackle"], { x: 7, y: -25 }],
    [{ fr: "Ballon aérien", en: "Aerial ball" }, { fr: "Gagne le premier contact.", en: "Win first contact." }, ["intercept"], { x: 0, y: -20 }],
    [{ fr: "Relance risquée", en: "Risky buildup" }, { fr: "Récupère puis trouve une sortie.", en: "Win it and find an outlet." }, ["intercept", "pass"], { x: -4, y: -12 }],
    [{ fr: "Mur défensif", en: "Defensive wall" }, { fr: "Tiens jusqu'au coup de sifflet.", en: "Hold until the whistle." }, ["tackle", "intercept", "position"], { x: 3, y: -28 }],
  ],
  keeper: [
    [{ fr: "Face-à-face", en: "One-on-one" }, { fr: "Ferme l'angle.", en: "Narrow the angle." }, ["save", "position"], { x: 0, y: -32 }],
    [{ fr: "Frappe lointaine", en: "Long-range strike" }, { fr: "Lis la trajectoire.", en: "Read the flight." }, ["save"], { x: 0, y: -35 }],
    [{ fr: "Centre au second poteau", en: "Far-post cross" }, { fr: "Sors ou reste sur ta ligne.", en: "Claim it or hold your line." }, ["save", "position"], { x: 4, y: -34 }],
    [{ fr: "Relance rapide", en: "Quick release" }, { fr: "Lance la transition.", en: "Start the transition." }, ["distribute"], { x: 0, y: -38 }],
    [{ fr: "Pénalty", en: "Penalty" }, { fr: "Choisis le bon côté.", en: "Choose the right side." }, ["save"], { x: 0, y: -39 }],
    [{ fr: "Ballon dans les pieds", en: "Ball at feet" }, { fr: "Échappe au pressing.", en: "Beat the press." }, ["pass", "distribute"], { x: -3, y: -34 }],
    [{ fr: "Coup franc masqué", en: "Screened free kick" }, { fr: "Réagis tard mais juste.", en: "React late but correctly." }, ["save"], { x: 0, y: -36 }],
    [{ fr: "Ultime corner", en: "Final corner" }, { fr: "Sécurise le résultat.", en: "Protect the result." }, ["save", "distribute"], { x: 2, y: -35 }],
  ],
};

export const MATCH_SITUATIONS: MatchSituationTemplate[] = (Object.keys(situationSeeds) as PlayFamily[]).flatMap((family) =>
  situationSeeds[family].map(([title, objective, allowedActions, playerPosition], index) => ({
    id: `${family}-${String(index + 1).padStart(2, "0")}`,
    family,
    title,
    objective,
    allowedActions,
    ball: { ...playerPosition },
    playerPosition,
    opponentPositions: [
      { x: playerPosition.x - 5, y: playerPosition.y + (family === "defender" || family === "keeper" ? 7 : 6) },
      { x: playerPosition.x + 7, y: playerPosition.y + (family === "defender" || family === "keeper" ? 11 : 9) },
    ],
    teammatePositions: [
      { x: playerPosition.x - 12, y: playerPosition.y + 5 },
      { x: playerPosition.x + 11, y: playerPosition.y + 8 },
    ],
    pressure: [28 + index * 3, 58 + index * 4],
    clock: [8 + index * 9, Math.min(89, 18 + index * 10)],
  })),
);

const localizedTextSchema = z.object({ fr: z.string().min(1), en: z.string().min(1) });
const clubSchema = z.object({
  id: z.string(), name: z.string().min(2), shortName: z.string().min(2), country: z.enum(["FR", "EN", "ES", "IT", "DE", "BR"]),
  division: z.union([z.literal(1), z.literal(2)]), colors: z.tuple([z.string(), z.string()]), prestige: z.number().min(1).max(100),
});
const eventSchema = z.object({
  id: z.string(), category: z.enum(["coach", "team", "family", "media", "agent", "supporters"]),
  title: localizedTextSchema, body: localizedTextSchema,
  choices: z.tuple([z.object({ id: z.string(), label: localizedTextSchema, effects: z.record(z.string(), z.unknown()).or(z.object({}).passthrough()) }), z.object({ id: z.string(), label: localizedTextSchema, effects: z.record(z.string(), z.unknown()).or(z.object({}).passthrough()) })]),
  minAge: z.number().int().min(16), maxAge: z.number().int().max(24), weight: z.number().positive(), arcId: z.string().optional(),
});

export function validateContent(): { clubs: number; events: number; arcs: number; situations: number } {
  z.array(clubSchema).length(144).parse(CLUBS);
  z.array(eventSchema).length(120).parse(STORY_EVENTS);
  if (NARRATIVE_ARCS.length !== 16) throw new Error("Expected 16 narrative arcs");
  if (MATCH_SITUATIONS.length !== 40) throw new Error("Expected 40 match situations");
  return { clubs: CLUBS.length, events: STORY_EVENTS.length, arcs: NARRATIVE_ARCS.length, situations: MATCH_SITUATIONS.length };
}

export function clubsFor(country: CountryCode, division?: 1 | 2): ClubRef[] {
  return CLUBS.filter((club) => club.country === country && (division === undefined || club.division === division));
}

export function eventById(id: string): StoryEvent | undefined {
  return STORY_EVENTS.find((event) => event.id === id);
}

export function situationById(id: string): MatchSituationTemplate | undefined {
  return MATCH_SITUATIONS.find((situation) => situation.id === id);
}
