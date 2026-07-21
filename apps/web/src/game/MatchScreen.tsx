import { Suspense, useMemo, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { CircleDot, Expand, Goal, MoveRight, Pause, Play, Route, Shield, Sparkles } from "lucide-react";
import * as THREE from "three";
import type { CareerState, Language, MatchAction, MatchInput, MatchScenario } from "@football/protocol";
import { actionNames, localize, t } from "../i18n";

function CameraRig() {
  const { camera } = useThree();
  camera.lookAt(0, 0, -5);
  return null;
}

function PlayerFigure({ x, z, color, number, selected = false }: { x: number; z: number; color: string; number: number; selected?: boolean }) {
  return <group position={[x, 0, z]}>
    {selected && <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .03, 0]}><ringGeometry args={[1.1, 1.35, 32]} /><meshBasicMaterial color="#ffc51b" transparent opacity={.9} /></mesh>}
    <mesh position={[0, 1.25, 0]}><cylinderGeometry args={[.34, .42, 1.2, 10]} /><meshStandardMaterial color={color} roughness={.85} /></mesh>
    <mesh position={[0, 2.08, 0]}><sphereGeometry args={[.3, 16, 12]} /><meshStandardMaterial color="#8b5c43" roughness={.9} /></mesh>
    <mesh position={[-.2, .46, 0]}><cylinderGeometry args={[.1, .12, .85, 8]} /><meshStandardMaterial color="#101414" /></mesh>
    <mesh position={[.2, .46, 0]}><cylinderGeometry args={[.1, .12, .85, 8]} /><meshStandardMaterial color="#101414" /></mesh>
    <sprite position={[0, 1.35, .43]} scale={[.4, .4, 1]}><spriteMaterial color="#eeeae0" /></sprite>
    <pointLight color={selected ? "#ffc51b" : color} intensity={selected ? 1.2 : .1} distance={4} position={[0, 2, 0]} />
  </group>;
}

function PitchLines() {
  const lineMaterial = <meshBasicMaterial color="#ecf0e7" transparent opacity={.75} />;
  return <group position={[0, .025, 0]}>
    <mesh><boxGeometry args={[70, .035, .08]} />{lineMaterial}</mesh>
    <mesh position={[0, 0, -44]}><boxGeometry args={[70, .035, .08]} />{lineMaterial}</mesh>
    <mesh position={[-35, 0, -22]}><boxGeometry args={[.08, .035, 44]} />{lineMaterial}</mesh>
    <mesh position={[35, 0, -22]}><boxGeometry args={[.08, .035, 44]} />{lineMaterial}</mesh>
    <mesh position={[0, 0, -30]}><boxGeometry args={[28, .035, .08]} />{lineMaterial}</mesh>
    <mesh position={[-14, 0, -37]}><boxGeometry args={[.08, .035, 14]} />{lineMaterial}</mesh>
    <mesh position={[14, 0, -37]}><boxGeometry args={[.08, .035, 14]} />{lineMaterial}</mesh>
  </group>;
}

function GoalFrame() {
  const material = <meshStandardMaterial color="#f2f1e9" roughness={.35} />;
  return <group position={[0, 0, -43]}>
    <mesh position={[-4, 1.3, 0]}><boxGeometry args={[.13, 2.6, .13]} />{material}</mesh>
    <mesh position={[4, 1.3, 0]}><boxGeometry args={[.13, 2.6, .13]} />{material}</mesh>
    <mesh position={[0, 2.6, 0]}><boxGeometry args={[8, .13, .13]} />{material}</mesh>
    <gridHelper args={[8, 10, "#cbd1ca", "#cbd1ca"]} position={[0, 1.25, -.8]} rotation={[Math.PI / 2, 0, 0]} />
  </group>;
}

function normalizePoint(value: number, axis: "x" | "y") {
  if (Math.abs(value) <= 1.1) return axis === "x" ? (value - .5) * 58 : (value - .5) * 34 - 13;
  return axis === "x" ? (value / 100 - .5) * 58 : (value / 100 - .5) * 34 - 13;
}

function MatchWorld({ scenario, visualTime }: { scenario: MatchScenario; visualTime: number }) {
  const actors = scenario.actors.length ? scenario.actors : [
    { id: "player", team: "player" as const, role: "CM", position: { x: .38, y: .7 } },
    { id: "mate", team: "player" as const, role: "RW", position: { x: .68, y: .35 } },
    { id: "opp-1", team: "opponent" as const, role: "CB", position: { x: .55, y: .45 } },
    { id: "opp-2", team: "opponent" as const, role: "CB", position: { x: .72, y: .58 } }
  ];
  const ballStart = useMemo(() => ({ x: normalizePoint(scenario.ball.x, "x"), z: normalizePoint(scenario.ball.y, "y") }), [scenario.ball.x, scenario.ball.y]);
  const progress = Math.min(1, (visualTime % 1600) / 1600);
  const ballX = ballStart.x + progress * 16;
  const ballZ = ballStart.z - progress * 11;
  const ballY = .28 + Math.sin(progress * Math.PI) * 1.8;
  return <>
    <CameraRig />
    <color attach="background" args={["#101a12"]} />
    <fog attach="fog" args={["#0b100d", 58, 105]} />
    <ambientLight intensity={1.35} />
    <directionalLight color="#f3ebcf" intensity={2.4} position={[12, 34, 25]} />
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -22]}><planeGeometry args={[70, 44]} /><meshStandardMaterial color="#3f642d" roughness={1} /></mesh>
    {[-28, -14, 0, 14, 28].map((x) => <mesh key={x} rotation={[-Math.PI / 2, 0, 0]} position={[x, .012, -22]}><planeGeometry args={[14, 44]} /><meshStandardMaterial color={x % 28 === 0 ? "#456c31" : "#3c612b"} roughness={1} /></mesh>)}
    <PitchLines /><GoalFrame />
    {actors.map((actor, index) => <PlayerFigure key={actor.id} x={normalizePoint(actor.position.x, "x")} z={normalizePoint(actor.position.y, "y")} color={actor.team === "player" ? "#0d4b39" : "#e9e8df"} number={index + 4} selected={index === 0} />)}
    <mesh position={[ballX, ballY, ballZ]}><sphereGeometry args={[.24, 16, 12]} /><meshStandardMaterial color="#f7f6ef" metalness={.05} roughness={.45} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.1, -45]}><planeGeometry args={[130, 70]} /><meshStandardMaterial color="#10140f" /></mesh>
  </>;
}

const actionIcon: Record<MatchAction, typeof CircleDot> = {
  pass: MoveRight, "through-ball": Route, dribble: Sparkles, shot: Goal, position: CircleDot,
  intercept: Shield, tackle: Shield, save: Goal, distribute: MoveRight
};

export function MatchScreen({ state, language, visualTime, onAction, onSimulate }: {
  state: CareerState; language: Language; visualTime: number; onAction: (input: MatchInput) => void; onSimulate: () => void;
}) {
  const scenario = state.pendingScenario;
  const [selectedAction, setSelectedAction] = useState<MatchAction>(scenario?.allowedActions[0] ?? "pass");
  const [power, setPower] = useState(66);
  const [paused, setPaused] = useState(false);
  if (!scenario) return null;
  const submit = () => onAction({ action: selectedAction, target: scenario.actors.find((actor) => actor.team === "player")?.id, direction: { x: .72, y: -.35 }, power: power / 100, timing: .78 });
  return <main className="match-screen">
    <div className="match-canvas"><Canvas dpr={[1, 1.5]} camera={{ position: [0, 39, 43], fov: 43, near: .1, far: 150 }} gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}><Suspense fallback={null}><MatchWorld scenario={scenario} visualTime={visualTime} /></Suspense></Canvas></div>
    <div className="stadium-crowd" aria-hidden="true" />
    <header className="scoreboard"><b>{state.club.shortName}</b><strong>{scenario.homeScore} – {scenario.awayScore}</strong><b>OND</b><i /><em>{Math.floor(scenario.clock)}:{String(Math.floor((scenario.clock % 1) * 60)).padStart(2, "0")}</em><span>{t(language, "week")} {state.week}</span></header>
    <div className="match-tools"><button aria-label={paused ? "Play" : "Pause"} onClick={() => setPaused((value) => !value)}>{paused ? <Play /> : <Pause />}</button><button aria-label={t(language, "fullscreen")} onClick={() => document.documentElement.requestFullscreen()}><Expand /></button></div>
    <aside className="player-hud"><strong>{state.player.identity.name.split(" ").slice(-1)[0]?.toUpperCase()}</strong><span>{t(language, "energy")} <b>{state.player.energy}</b></span><i><em style={{ width: `${state.player.energy}%` }} /></i></aside>
    <div className="aim-trajectory" aria-hidden="true"><i /><span /></div>
    <div className="scenario-objective"><Sparkles /><span>{localize(language, scenario.objective) || t(language, "createChance")}</span></div>
    <section className="match-controls">
      <div className="power-control"><label htmlFor="power">{t(language, "power")}</label><input id="power" type="range" min="20" max="100" value={power} onChange={(event) => setPower(Number(event.target.value))} style={{ "--power": `${power}%` } as React.CSSProperties} /><button onClick={submit}>{t(language, "release")}</button></div>
      <div className="action-grid">{scenario.allowedActions.map((action) => { const Icon = actionIcon[action]; return <button key={action} className={selectedAction === action ? "selected" : ""} onClick={() => setSelectedAction(action)}><Icon /><span>{localize(language, actionNames[action])}</span></button>; })}</div>
      <button className="match-simulate" onClick={onSimulate}>{t(language, "simulate")}</button>
    </section>
  </main>;
}
