import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Languages, RotateCcw, X } from "lucide-react";
import type { CareerCommand, CareerState, Difficulty, Language, MatchInput, PlayerIdentity } from "@football/protocol";
import { CareerHub } from "./components/Hub";
import { MobileNavigation, TopNavigation, type AppView } from "./components/Chrome";
import { Onboarding } from "./components/Onboarding";
import { SecondaryView } from "./components/Views";
import { MatchScreen } from "./game/MatchScreen";
import { applyCareerCommand, createFreshCareer } from "./engineAdapter";
import { clearCareer, loadCareer, saveCareer } from "./persistence";
import { t } from "./i18n";

export function App() {
  const [career, setCareer] = useState<CareerState>();
  const [commands, setCommands] = useState<CareerCommand[]>([]);
  const commandsRef = useRef<CareerCommand[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<AppView>("career");
  const [matchOpen, setMatchOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [error, setError] = useState<string>();
  const [visualTime, setVisualTime] = useState(0);

  useEffect(() => {
    loadCareer().then((saved) => {
      if (saved) { setCareer(saved.state); setCommands(saved.commands); commandsRef.current = saved.commands; return; }
      const demo = new URLSearchParams(window.location.search).get("demo");
      if (demo === "hub" || demo === "match") {
        const identity: PlayerIdentity = { name: "Malik Diallo", nationality: "FR", position: "CM", preferredFoot: "right", shirtNumber: 8, avatar: { skin: 4, face: 2, hair: 3, build: 2 } };
        let state = createFreshCareer(identity, "standard", "fr");
        if (demo === "match") {
          state = applyCareerCommand(state, { type: "PREPARE", kind: "training" });
          state = applyCareerCommand(state, { type: "START_MATCH" });
          setMatchOpen(true);
        }
        setCareer(state);
      }
    }).catch(() => setError("La sauvegarde locale n’a pas pu être restaurée.")).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === "f") {
        if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    window.advanceTime = (ms: number) => setVisualTime((value) => value + Math.max(0, ms));
    window.render_game_to_text = () => JSON.stringify(career ? {
      coordinateSystem: "MatchScenario coordinates: normalized x/y from 0 to 1; origin top-left, x right, y down.",
      mode: matchOpen ? "match" : view,
      phase: career.phase,
      season: career.season,
      week: career.week,
      player: { name: career.player.identity.name, position: career.player.identity.position, overall: career.player.overall, energy: career.player.energy, form: career.player.form, morale: career.player.morale },
      score: career.pendingScenario ? { home: career.pendingScenario.homeScore, away: career.pendingScenario.awayScore, clock: career.pendingScenario.clock } : null,
      scenario: career.pendingScenario ? { id: career.pendingScenario.id, objective: career.pendingScenario.objective[career.language], actions: career.pendingScenario.allowedActions, attempts: career.pendingScenario.attemptsRemaining, ball: career.pendingScenario.ball, actors: career.pendingScenario.actors.map((actor) => ({ id: actor.id, team: actor.team, x: actor.position.x, y: actor.position.y })) } : null
    } : { mode: loading ? "loading" : "onboarding" });
    window.__footballState = career;
  }, [career, loading, matchOpen, view]);

  const runCommand = useCallback((command: CareerCommand) => {
    if (!career) return undefined;
    try {
      const next = applyCareerCommand(career, command);
      const nextCommands = [...commandsRef.current, command];
      commandsRef.current = nextCommands;
      setCommands(nextCommands);
      setCareer(next);
      setError(undefined);
      void saveCareer(next, nextCommands);
      return next;
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Commande refusée par le moteur.");
      return undefined;
    }
  }, [career]);

  const startCareer = (identity: PlayerIdentity, difficulty: Difficulty, language: Language) => {
    try {
      const state = createFreshCareer(identity, difficulty, language);
      commandsRef.current = [];
      setCommands([]);
      setCareer(state);
      setView("career");
      void saveCareer(state, []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Impossible de démarrer la carrière."); }
  };

  const playMatch = () => {
    const next = career?.pendingScenario ? career : runCommand({ type: "START_MATCH" });
    if (next?.pendingScenario) { setVisualTime(0); setMatchOpen(true); }
  };

  const playAction = (input: MatchInput) => {
    const next = runCommand({ type: "MATCH_ACTION", input });
    if (!next?.pendingScenario || next.phase !== "match") setMatchOpen(false);
  };

  const simulate = () => {
    runCommand({ type: "SIMULATE_MATCH" });
    setMatchOpen(false);
  };

  const reset = async () => {
    await clearCareer();
    commandsRef.current = [];
    setCommands([]);
    setCareer(undefined);
    setMatchOpen(false);
    setSettingsOpen(false);
  };

  if (loading) return <div className="boot-screen"><div className="boot-mark">FC</div><span /></div>;
  if (!career) return <><Onboarding onStart={startCareer} />{error && <div className="error-toast" role="alert">{error}</div>}</>;
  const language = career.language;

  if (matchOpen && career.pendingScenario) return <><MatchScreen state={career} language={language} visualTime={visualTime} onAction={playAction} onSimulate={simulate} />{error && <div className="error-toast" role="alert">{error}</div>}</>;

  return <div className="app-shell">
    <TopNavigation view={view} language={language} onView={setView} onSettings={() => setSettingsOpen(true)} />
    <main className="app-content">{view === "career" ? <CareerHub state={career} language={language} onCommand={runCommand} onPlay={playMatch} /> : <SecondaryView view={view} state={career} language={language} />}</main>
    <MobileNavigation view={view} language={language} onView={setView} />
    {settingsOpen && <div className="modal-backdrop" role="presentation" onMouseDown={() => setSettingsOpen(false)}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><header><h2 id="settings-title">{t(language, "settings")}</h2><button aria-label={t(language, "close")} onClick={() => setSettingsOpen(false)}><X /></button></header><div className="settings-row"><Languages /><div><strong>{t(language, "language")}</strong><span>{language === "fr" ? "Français" : "English"}</span></div><Check /></div><div className="settings-row"><Check /><div><strong>{t(language, "difficulty")}</strong><span>{t(language, career.difficulty)}</span></div></div><button className="danger-button" onClick={reset}><RotateCcw />{t(language, "newCareer")}</button><small>{commands.length} commandes sauvegardées · {career.rulesVersion}</small></section></div>}
    {error && <div className="error-toast" role="alert">{error}</div>}
  </div>;
}
