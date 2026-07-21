import { ArrowRight, Dumbbell, HeartPulse, Mail, MessageSquare, Mic2, Shield, Sparkles, UsersRound } from "lucide-react";
import type { CareerCommand, CareerState, Language, PreparationKind, RelationKey } from "@football/protocol";
import { localize, positionNames, preparationNames, t } from "../i18n";

const relationIcon = { coach: Shield, team: UsersRound, supporters: Sparkles, family: HeartPulse, agent: UsersRound, media: Mic2 } as const;
const prepIcon = { training: Dumbbell, recovery: HeartPulse, relationship: UsersRound, media: Mic2, agent: MessageSquare } as const;

function ClubCrest({ label = "FC", small = false }: { label?: string; small?: boolean }) {
  return <div className={small ? "club-crest small" : "club-crest"}><span>{label.slice(0, 2)}</span><small>2019</small></div>;
}

function Stat({ label, value, accent }: { label: string; value: string | number; accent?: "green" | "yellow" }) {
  return <div className="hero-stat"><span>{label}</span><strong className={accent ?? ""}>{value}</strong></div>;
}

function RelationRow({ state, relation, language }: { state: CareerState; relation: RelationKey; language: Language }) {
  const Icon = relationIcon[relation];
  const value = state.relations[relation];
  const label = relation === "team" ? t(language, "team") : relation === "supporters" ? t(language, "supporters") : relation === "family" ? t(language, "family") : relation === "coach" ? t(language, "coach") : relation === "agent" ? t(language, "agent") : t(language, "media");
  return <div className="relation-row"><Icon /><span>{label}</span><div className="relation-track"><i style={{ width: `${value}%` }} /></div><strong>{value}</strong></div>;
}

export function CareerHub({ state, language, onCommand, onPlay }: {
  state: CareerState; language: Language; onCommand: (command: CareerCommand) => void; onPlay: () => void;
}) {
  const player = state.player;
  const isPreparation = state.phase === "preparation";
  const isMatchReady = state.phase === "match";
  const isDecision = state.phase === "decision";
  const isReview = state.phase === "review";
  const value = player.marketValue >= 1_000_000 ? `${(player.marketValue / 1_000_000).toFixed(1).replace(".0", "")} M€` : `${Math.round(player.marketValue / 1000)} k€`;
  const shortClub = state.club.shortName || state.club.name.slice(0, 3).toUpperCase();

  return <div className="career-hub">
    <section className="hero-panel">
      <div className="hero-photo" aria-label={`${player.identity.name}, ${localize(language, positionNames[player.identity.position])}`} />
      <div className="hero-copy">
        <h1>{player.identity.name}</h1>
        <p><strong>{player.age} {t(language, "age")}</strong><i />{localize(language, positionNames[player.identity.position])}</p>
        <div className="club-identity"><ClubCrest label={shortClub} /><span>{state.club.name}</span></div>
      </div>
      <div className="stats-strip">
        <Stat label={t(language, "overall")} value={player.overall} />
        <Stat label={t(language, "energy")} value={player.energy} accent="green" />
        <Stat label={t(language, "form")} value={player.form} accent="green" />
        <Stat label={t(language, "morale")} value={player.morale} accent="yellow" />
        <Stat label={t(language, "value")} value={value} />
      </div>
    </section>

    <aside className="story-rail">
      <section className="inbox-panel">
        <div className="panel-title"><span>{t(language, "inbox")}</span><b>3</b></div>
        <div className="inbox-row"><Mail /><p><strong>{t(language, "coach")}</strong><span>{language === "fr" ? "Compte rendu d’entraînement" : "Training report"}</span></p><small>1 h</small></div>
        <div className="inbox-row"><Mail /><p><strong>{language === "fr" ? "Directeur sportif" : "Sporting director"}</strong><span>{language === "fr" ? "Point mercato mensuel" : "Monthly transfer update"}</span></p><small>5 h</small></div>
        <div className="inbox-row"><MessageSquare /><p><strong>{language === "fr" ? "Préparateur mental" : "Mental coach"}</strong><span>{language === "fr" ? "Séance individuelle conseillée" : "Individual session advised"}</span></p><small>1 j</small></div>
      </section>
      <section className="story-panel">
        <h2>{t(language, "challengeTitle")}</h2><p>{t(language, "challengeText")}</p>
        {isDecision ? <div className="decision-actions"><button onClick={() => onCommand({ type: "DECIDE", eventId: state.pendingEventId ?? "captain-test", choiceId: "pitch" })}>{t(language, "answerPitch")}<ArrowRight /></button><button onClick={() => onCommand({ type: "DECIDE", eventId: state.pendingEventId ?? "captain-test", choiceId: "calm" })}>{t(language, "calm")}</button></div> : <div className="story-watermark">8</div>}
      </section>
      <section className="relations-panel"><h3>{t(language, "relations")}</h3>{(["coach", "team", "supporters"] as RelationKey[]).map((relation) => <RelationRow key={relation} state={state} relation={relation} language={language} />)}</section>
    </aside>

    <section className="season-panel">
      <div className="season-kicker"><b>{t(language, "season")} {state.season}</b><i /><span>{state.club.country} · D{state.club.division}</span></div>
      <div className="timeline">
        {[state.week - 2, state.week - 1, state.week, state.week + 1, state.week + 2].map((week, index) => {
          const TimelineIcon = prepIcon[index === 3 ? "training" : "media"];
          return <div key={week} className={`timeline-node ${index === 2 ? "current" : index < 2 ? "done" : ""}`}><span>{t(language, "week")} {Math.max(1, week)}</span><div>{index === 2 ? <ClubCrest label={shortClub} small /> : index < 2 ? <b>{index === 0 ? "2–1" : "1–1"}</b> : <TimelineIcon />}</div><small>{index === 2 ? (language === "fr" ? "ACTUEL" : "CURRENT") : index < 2 ? (language === "fr" ? "TERMINÉ" : "DONE") : index === 3 ? t(language, "training") : t(language, "media")}</small></div>;
        })}
        <div className="fixture-focus"><span>{t(language, "week")} {state.week}</span><div><ClubCrest label={shortClub} small /><b>{state.club.name}<em>—</em>{language === "fr" ? "Olympique du Nord" : "Northern Olympic"}</b><ClubCrest label="NO" small /></div>
          {isMatchReady && <><button className="primary-button match-cta" onClick={onPlay}>{t(language, "playMatch")}<ArrowRight /></button><button className="text-button" onClick={() => onCommand({ type: "SIMULATE_MATCH" })}>{t(language, "simulate")}</button></>}
          {isReview && <button className="primary-button match-cta" onClick={() => onCommand({ type: "ADVANCE_WEEK" })}>{t(language, "continueWeek")}<ArrowRight /></button>}
          {isDecision && <span className="decision-prompt">{t(language, "makeChoice")}</span>}
        </div>
      </div>
      {isPreparation && <div className="preparation-band"><div><h2>{t(language, "choosePreparation")}</h2><p>{t(language, "preparationHelp")}</p></div><div className="preparation-actions">{(["training", "recovery", "relationship", "media", "agent"] as PreparationKind[]).map((kind) => { const Icon = prepIcon[kind]; return <button key={kind} onClick={() => onCommand({ type: "PREPARE", kind })}><Icon /><span>{localize(language, preparationNames[kind])}</span></button>; })}</div></div>}
    </section>

    <footer className="career-status"><strong>{player.identity.name}</strong><span>{t(language, "season")} {state.season}</span><span>{t(language, "week")} {state.week}</span><span>{player.seasonStats.minutes.toLocaleString(language)} MIN</span><span>{player.seasonStats.goals} {t(language, "goals")}</span><span>{player.seasonStats.assists} {t(language, "assists")}</span><small>{t(language, "saveReady")}</small></footer>
  </div>;
}
