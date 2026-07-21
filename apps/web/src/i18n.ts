import type { Language, LocalizedText, MatchAction, Position, PreparationKind } from "@football/protocol";

const dictionary = {
  fr: {
    career: "Carrière", player: "Joueur", club: "Club", world: "Monde", archives: "Archives",
    season: "Saison", week: "Journée", playMatch: "Jouer le match", simulate: "Simulation rapide",
    next: "Continuer", choosePreparation: "Prépare ta semaine", preparationHelp: "Un choix. Un impact. Puis le terrain.",
    training: "Entraînement", recovery: "Récupération", relationship: "Relation", media: "Médias", agent: "Agent",
    overall: "OVR", energy: "Énergie", form: "Forme", morale: "Moral", value: "Valeur",
    inbox: "Boîte de réception", challengeTitle: "Le capitaine te met à l’épreuve",
    challengeText: "Il attend que tu élèves ton niveau quand le match se tend. Ta réponse se jouera sur le terrain.",
    relations: "Relations", coach: "Coach", team: "Équipe", supporters: "Supporters", family: "Famille",
    standard: "Standard", assisted: "Assisté", expert: "Expert", language: "Langue", difficulty: "Difficulté",
    yourCareer: "Écris ton chapitre", start: "Commencer la carrière", name: "Nom du joueur", nationality: "Nationalité",
    position: "Poste", preferredFoot: "Pied fort", left: "Gauche", right: "Droit", number: "Numéro",
    matchObjective: "Objectif", power: "Puissance", release: "Relâcher pour jouer", createChance: "Crée une occasion",
    review: "Bilan du match", continueWeek: "Passer à la semaine suivante", decision: "Décision",
    newCareer: "Nouvelle carrière", settings: "Réglages", fullscreen: "Plein écran", offline: "Sauvegarde locale",
    noHistory: "Ton histoire commence maintenant.", attributes: "Attributs", contract: "Contrat", salary: "Salaire",
    appearances: "Matchs", goals: "Buts", assists: "Passes décisives", age: "ans", table: "Classement",
    globalOverview: "Le monde du football", countryDetail: "Le pays actif est simulé en détail. Les autres évoluent par agrégats.",
    chapter: "Chapitre", achievements: "Exploits", pantheon: "Panthéon", cosmetic: "Récompenses cosmétiques uniquement",
    makeChoice: "Choisis ta réponse", calm: "Calmer le jeu", answerPitch: "Répondre sur le terrain",
    saveReady: "Prêt hors ligne", menu: "Menu", close: "Fermer"
  },
  en: {
    career: "Career", player: "Player", club: "Club", world: "World", archives: "Archives",
    season: "Season", week: "Matchday", playMatch: "Play match", simulate: "Quick simulation",
    next: "Continue", choosePreparation: "Prepare your week", preparationHelp: "One choice. One impact. Then the pitch.",
    training: "Training", recovery: "Recovery", relationship: "Relationship", media: "Media", agent: "Agent",
    overall: "OVR", energy: "Energy", form: "Form", morale: "Morale", value: "Value",
    inbox: "Inbox", challengeTitle: "The captain tests you",
    challengeText: "He expects you to raise your game when pressure rises. Your answer belongs on the pitch.",
    relations: "Relations", coach: "Coach", team: "Team", supporters: "Supporters", family: "Family",
    standard: "Standard", assisted: "Assisted", expert: "Expert", language: "Language", difficulty: "Difficulty",
    yourCareer: "Write your chapter", start: "Start career", name: "Player name", nationality: "Nationality",
    position: "Position", preferredFoot: "Preferred foot", left: "Left", right: "Right", number: "Number",
    matchObjective: "Objective", power: "Power", release: "Release to play", createChance: "Create a chance",
    review: "Match review", continueWeek: "Move to next week", decision: "Decision",
    newCareer: "New career", settings: "Settings", fullscreen: "Fullscreen", offline: "Local save",
    noHistory: "Your story starts now.", attributes: "Attributes", contract: "Contract", salary: "Salary",
    appearances: "Apps", goals: "Goals", assists: "Assists", age: "years old", table: "Table",
    globalOverview: "The football world", countryDetail: "The active country is simulated in detail. Others progress by aggregates.",
    chapter: "Chapter", achievements: "Achievements", pantheon: "Hall of fame", cosmetic: "Cosmetic rewards only",
    makeChoice: "Choose your answer", calm: "Calm the game", answerPitch: "Answer on the pitch",
    saveReady: "Offline ready", menu: "Menu", close: "Close"
  }
} as const;

export type CopyKey = keyof typeof dictionary.fr;
export const t = (language: Language, key: CopyKey) => dictionary[language][key];
export const localize = (language: Language, text?: LocalizedText) => text?.[language] ?? "";

export const positionNames: Record<Position, LocalizedText> = {
  GK: { fr: "Gardien", en: "Goalkeeper" }, LB: { fr: "Latéral gauche", en: "Left back" },
  CB: { fr: "Défenseur central", en: "Centre back" }, RB: { fr: "Latéral droit", en: "Right back" },
  DM: { fr: "Milieu défensif", en: "Defensive midfielder" }, CM: { fr: "Milieu central", en: "Central midfielder" },
  AM: { fr: "Milieu offensif", en: "Attacking midfielder" }, LW: { fr: "Ailier gauche", en: "Left winger" },
  RW: { fr: "Ailier droit", en: "Right winger" }, SS: { fr: "Second attaquant", en: "Second striker" },
  ST: { fr: "Avant-centre", en: "Striker" }, CF: { fr: "Attaquant libre", en: "Centre forward" }
};

export const preparationNames: Record<PreparationKind, LocalizedText> = {
  training: { fr: "Entraînement", en: "Training" }, recovery: { fr: "Récupération", en: "Recovery" },
  relationship: { fr: "Relation", en: "Relationship" }, media: { fr: "Médias", en: "Media" },
  agent: { fr: "Agent", en: "Agent" }
};

export const actionNames: Record<MatchAction, LocalizedText> = {
  pass: { fr: "Passe", en: "Pass" }, "through-ball": { fr: "Passe en profondeur", en: "Through ball" },
  dribble: { fr: "Dribble", en: "Dribble" }, shot: { fr: "Tir", en: "Shot" }, position: { fr: "Placement", en: "Position" },
  intercept: { fr: "Interception", en: "Intercept" }, tackle: { fr: "Tacle", en: "Tackle" },
  save: { fr: "Arrêt", en: "Save" }, distribute: { fr: "Relance", en: "Distribute" }
};
