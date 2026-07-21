import { Award, Banknote, CalendarDays, Flag, ShieldCheck, Sparkles, Trophy, UsersRound } from "lucide-react";
import { CLUBS } from "@football/content";
import type { AttributeKey, CareerState, Language } from "@football/protocol";
import { localize, positionNames, t } from "../i18n";
import type { AppView } from "./Chrome";

const attributeLabels: Record<AttributeKey, { fr: string; en: string }> = {
  technique: { fr: "Technique", en: "Technique" }, finishing: { fr: "Finition", en: "Finishing" },
  passing: { fr: "Passe", en: "Passing" }, vision: { fr: "Vision", en: "Vision" }, defense: { fr: "Défense", en: "Defense" },
  physical: { fr: "Physique", en: "Physical" }, mental: { fr: "Mental", en: "Mental" }, charisma: { fr: "Charisme", en: "Charisma" }
};

function SectionHeader({ title, detail }: { title: string; detail?: string }) {
  return <header className="view-heading"><h1>{title}</h1>{detail && <p>{detail}</p>}</header>;
}

function PlayerView({ state, language }: { state: CareerState; language: Language }) {
  return <section className="subview player-view"><SectionHeader title={state.player.identity.name} detail={`${state.player.age} ${t(language, "age")} · ${localize(language, positionNames[state.player.identity.position])}`} /><div className="player-layout"><div className="player-card"><div className="player-card-photo" /><strong>{state.player.overall}</strong><span>OVR</span><small>#{state.player.identity.shirtNumber}</small></div><div className="attribute-list"><h2>{t(language, "attributes")}</h2>{Object.entries(state.player.attributes).map(([key, value]) => <div className="attribute-row" key={key}><span>{attributeLabels[key as AttributeKey][language]}</span><div><i style={{ width: `${value}%` }} /></div><strong>{value}</strong></div>)}</div><div className="contract-summary"><h2>{t(language, "contract")}</h2><p><ShieldCheck />{state.club.name}</p><p><CalendarDays />{language === "fr" ? "Jusqu’à la saison" : "Until season"} {state.contract.endSeason}</p><p><Banknote />{state.contract.weeklySalary.toLocaleString(language)} € / {language === "fr" ? "sem." : "week"}</p></div></div></section>;
}

function ClubView({ state, language }: { state: CareerState; language: Language }) {
  const top = state.standings.slice().sort((a, b) => b.points - a.points).slice(0, 8);
  return <section className="subview"><SectionHeader title={state.club.name} detail={`${state.club.country} · Division ${state.club.division}`} /><div className="club-overview"><div className="large-crest">{state.club.shortName}</div><div><span>{language === "fr" ? "Prestige" : "Prestige"}</span><strong>{state.club.prestige}</strong></div><div><span>{language === "fr" ? "Rôle" : "Role"}</span><strong>{state.player.role}</strong></div><div><span>{t(language, "salary")}</span><strong>{state.player.salary.toLocaleString(language)} €</strong></div></div><div className="standing-table"><h2>{t(language, "table")}</h2><div className="table-head"><span>#</span><span>{t(language, "club")}</span><span>MJ</span><span>PTS</span></div>{top.map((row, index) => { const club = CLUBS.find((item) => item.id === row.clubId); return <div className={row.clubId === state.club.id ? "active" : ""} key={row.clubId}><span>{index + 1}</span><span>{club?.name ?? row.clubId}</span><span>{row.played}</span><strong>{row.points}</strong></div>; })}</div></section>;
}

function WorldView({ state, language }: { state: CareerState; language: Language }) {
  const countries = ["FR", "EN", "ES", "IT", "DE", "BR"];
  return <section className="subview"><SectionHeader title={t(language, "globalOverview")} detail={t(language, "countryDetail")} /><div className="world-list">{countries.map((country) => { const clubs = CLUBS.filter((club) => club.country === country); return <article key={country} className={country === state.activeCountry ? "active" : ""}><Flag /><div><h2>{country}</h2><p>{clubs.length} {language === "fr" ? "clubs fictifs" : "fictional clubs"}</p></div><span>{country === state.activeCountry ? (language === "fr" ? "SIMULATION DÉTAILLÉE" : "DETAILED SIMULATION") : (language === "fr" ? "AGRÉGATS" : "AGGREGATES")}</span></article>; })}</div></section>;
}

function ArchivesView({ state, language }: { state: CareerState; language: Language }) {
  return <section className="subview"><SectionHeader title={t(language, "archives")} detail={`${t(language, "chapter")} ${state.season} · 16—24`} /><div className="archive-columns"><article><Trophy /><h2>{t(language, "achievements")}</h2>{state.achievements.length ? state.achievements.map((achievement) => <p key={achievement}>{achievement}</p>) : <p>{t(language, "noHistory")}</p>}</article><article><Award /><h2>{t(language, "pantheon")}</h2><p>{t(language, "cosmetic")}</p></article><article><Sparkles /><h2>{language === "fr" ? "Chronologie" : "Timeline"}</h2>{state.history.length ? state.history.map((row) => <p key={`${row.season}-${row.clubId}`}>{t(language, "season")} {row.season} · {row.goals} {t(language, "goals")}</p>) : <p>{t(language, "noHistory")}</p>}</article></div></section>;
}

export function SecondaryView({ view, state, language }: { view: Exclude<AppView, "career">; state: CareerState; language: Language }) {
  if (view === "player") return <PlayerView state={state} language={language} />;
  if (view === "club") return <ClubView state={state} language={language} />;
  if (view === "world") return <WorldView state={state} language={language} />;
  return <ArchivesView state={state} language={language} />;
}
