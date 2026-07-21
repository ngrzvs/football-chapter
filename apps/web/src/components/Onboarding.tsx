import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import type { CountryCode, Difficulty, Language, PlayerIdentity, Position } from "@football/protocol";
import { BrandMark } from "./Chrome";
import { localize, positionNames, t } from "../i18n";

const countries: { value: CountryCode; fr: string; en: string }[] = [
  { value: "FR", fr: "France", en: "France" }, { value: "EN", fr: "Angleterre", en: "England" },
  { value: "ES", fr: "Espagne", en: "Spain" }, { value: "IT", fr: "Italie", en: "Italy" },
  { value: "DE", fr: "Allemagne", en: "Germany" }, { value: "BR", fr: "Brésil", en: "Brazil" }
];
const positions: Position[] = ["GK", "LB", "CB", "RB", "DM", "CM", "AM", "LW", "RW", "SS", "ST", "CF"];

export function Onboarding({ onStart }: { onStart: (identity: PlayerIdentity, difficulty: Difficulty, language: Language) => void }) {
  const [language, setLanguage] = useState<Language>("fr");
  const [step, setStep] = useState(0);
  const [name, setName] = useState("Malik Diallo");
  const [nationality, setNationality] = useState<CountryCode>("FR");
  const [position, setPosition] = useState<Position>("CM");
  const [foot, setFoot] = useState<"left" | "right">("right");
  const [number, setNumber] = useState(8);
  const [difficulty, setDifficulty] = useState<Difficulty>("standard");

  const submit = () => onStart({
    name: name.trim() || "Malik Diallo", nationality, position, preferredFoot: foot, shirtNumber: number,
    avatar: { skin: 4, face: 2, hair: 3, build: 2 }
  }, difficulty, language);

  useEffect(() => {
    const onEnter = (event: KeyboardEvent) => {
      if (event.key !== "Enter") return;
      event.preventDefault();
      if (step < 2) setStep((value) => value + 1); else submit();
    };
    window.addEventListener("keydown", onEnter);
    return () => window.removeEventListener("keydown", onEnter);
  }, [step, name, nationality, position, foot, number, difficulty, language]);

  return (
    <main className="onboarding">
      <div className="onboarding-image" aria-hidden="true" />
      <div className="onboarding-panel">
        <div className="onboarding-top"><BrandMark /><button className="language-toggle" onClick={() => setLanguage(language === "fr" ? "en" : "fr")}>{language.toUpperCase()}</button></div>
        <div className="step-meter"><span style={{ width: `${(step + 1) * 33.333}%` }} /></div>
        <section>
          <h1>{t(language, "yourCareer")}</h1>
          {step === 0 && <div className="form-stack">
            <label>{t(language, "name")}<input autoFocus value={name} maxLength={30} onChange={(event) => setName(event.target.value)} /></label>
            <label>{t(language, "nationality")}<select value={nationality} onChange={(event) => setNationality(event.target.value as CountryCode)}>{countries.map((country) => <option key={country.value} value={country.value}>{country[language]}</option>)}</select></label>
          </div>}
          {step === 1 && <div className="form-stack">
            <fieldset><legend>{t(language, "position")}</legend><div className="position-grid">{positions.map((item) => <button type="button" key={item} className={position === item ? "selected" : ""} onClick={() => setPosition(item)}><b>{item}</b><span>{localize(language, positionNames[item])}</span></button>)}</div></fieldset>
            <div className="form-row"><fieldset><legend>{t(language, "preferredFoot")}</legend><div className="segmented"><button type="button" className={foot === "left" ? "selected" : ""} onClick={() => setFoot("left")}>{t(language, "left")}</button><button type="button" className={foot === "right" ? "selected" : ""} onClick={() => setFoot("right")}>{t(language, "right")}</button></div></fieldset><label>{t(language, "number")}<input type="number" min="1" max="99" value={number} onChange={(event) => setNumber(Math.max(1, Math.min(99, Number(event.target.value))))} /></label></div>
          </div>}
          {step === 2 && <div className="difficulty-grid">{(["assisted", "standard", "expert"] as Difficulty[]).map((item) => <button key={item} type="button" className={difficulty === item ? "selected" : ""} onClick={() => setDifficulty(item)}><strong>{t(language, item)}</strong><span>{item === "assisted" ? "+20% aim" : item === "expert" ? "No assistance" : "Balanced rules"}</span></button>)}</div>}
        </section>
        <div className="onboarding-actions">
          <button className="ghost-button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}><ChevronLeft /></button>
          {step < 2 ? <button className="primary-button" onClick={() => setStep((value) => value + 1)}>{t(language, "next")}<ChevronRight /></button> : <button className="primary-button" onClick={submit}>{t(language, "start")}<ArrowRight /></button>}
        </div>
      </div>
    </main>
  );
}
