import { Archive, Building2, Globe2, Settings, Shield, UserRound } from "lucide-react";
import type { Language } from "@football/protocol";
import { t, type CopyKey } from "../i18n";

export type AppView = "career" | "player" | "club" | "world" | "archives";

const items: { key: AppView; copy: CopyKey; icon: typeof UserRound }[] = [
  { key: "career", copy: "career", icon: Shield },
  { key: "player", copy: "player", icon: UserRound },
  { key: "club", copy: "club", icon: Building2 },
  { key: "world", copy: "world", icon: Globe2 },
  { key: "archives", copy: "archives", icon: Archive }
];

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? "brand-mark compact" : "brand-mark"} aria-label="Football Chapter">
      <span>FC</span><small>16·24</small>
    </div>
  );
}

export function TopNavigation({ view, language, onView, onSettings }: {
  view: AppView; language: Language; onView: (view: AppView) => void; onSettings: () => void;
}) {
  return (
    <header className="topbar">
      <BrandMark compact />
      <nav aria-label="Navigation principale">
        {items.map(({ key, copy }) => (
          <button key={key} className={view === key ? "active" : ""} onClick={() => onView(key)}>{t(language, copy)}</button>
        ))}
      </nav>
      <button className="icon-button" aria-label={t(language, "settings")} onClick={onSettings}><Settings /></button>
    </header>
  );
}

export function MobileNavigation({ view, language, onView }: {
  view: AppView; language: Language; onView: (view: AppView) => void;
}) {
  return (
    <nav className="mobile-nav" aria-label="Navigation mobile">
      {items.slice(0, 4).map(({ key, copy, icon: Icon }) => (
        <button key={key} className={view === key ? "active" : ""} onClick={() => onView(key)}>
          <Icon /><span>{t(language, copy)}</span>
        </button>
      ))}
    </nav>
  );
}
