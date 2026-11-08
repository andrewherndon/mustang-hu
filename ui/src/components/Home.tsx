import { useMemo, useState } from "react";
import { formatDate, formatTime, useClock } from "../useClock";
import type { AppState, Layout } from "../daemon";
import { appLook } from "../apps";
import { AlphabetStrip } from "./AlphabetStrip";

interface Props {
  hidden: boolean;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  onOpen: (layout: Layout) => void;
}

/** Favourites shown on the home screen, in order (all apps go in the A–Z strip). */
const FAVORITES = ["aa", "youtube", "stremio", "gmail", "calendar", "android", "chess", "browser"];

/**
 * Niagara-inspired home: big clock, now playing, a two-column favourites list,
 * and an alphabet strip on the right edge for every app.
 */
export function Home({ hidden, aaConnected, apps, onOpen }: Props) {
  const now = useClock();
  const [scrub, setScrub] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  const entries = Object.entries(apps);
  const byLetter = useMemo(() => {
    const m = new Map<string, [string, AppState][]>();
    for (const [id, app] of entries) {
      const l = app.title[0].toUpperCase();
      m.set(l, [...(m.get(l) ?? []), [id, app]]);
    }
    m.set("★", FAVORITES.filter((id) => apps[id]).map((id) => [id, apps[id]] as [string, AppState]));
    return m;
  }, [apps]);           // eslint-disable-line react-hooks/exhaustive-deps

  const letter = scrub ?? picked;
  const letterApps = letter ? byLetter.get(letter) ?? [] : [];
  const favorites = FAVORITES.filter((id) => apps[id]);

  const open = (id: string) => {
    setPicked(null);
    if (id === "aa" && !aaConnected) return;
    onOpen(id);
  };

  const row = (id: string, app: AppState) => {
    const look = appLook(id);
    const disabled = id === "aa" && !aaConnected;
    return (
      <button key={id} className="fav" onClick={() => open(id)} data-disabled={disabled}>
        <span className="fav-icon" style={{ background: look.tint[0], color: look.tint[1] }}>{look.icon(30)}</span>
        <span className="fav-label">{app.title}</span>
        {id === "aa" && aaConnected && <span className="fav-dot" />}
        {id !== "aa" && app.running && <span className="fav-running" />}
      </button>
    );
  };

  return (
    <div className="home" data-hidden={hidden}
         onPointerDown={(e) => !(e.target as Element).closest(".letter-panel, .alpha") && setPicked(null)}>
      <div className="home-left">
        <div className="clock">{formatTime(now)}</div>
        <div className="clock-date">{formatDate(now)}</div>

        <div className="nowplaying">
          <div className="np-art" />
          <div className="np-text">
            <div className="np-title">Nothing playing</div>
            <div className="np-sub">{aaConnected ? "Start music in Android Auto" : "Connect your phone"}</div>
          </div>
        </div>

        <div className="favs" data-dimmed={letter !== null}>
          {favorites.map((id) => row(id, apps[id]))}
        </div>
      </div>

      {/* Apps for the letter under the finger (or the last letter picked). */}
      <div className="letter-panel" data-open={letter !== null && letter !== "★"}>
        <div className="letter-big">{letter !== "★" ? letter : ""}</div>
        {letterApps.length === 0 && <div className="letter-empty">No apps</div>}
        {letterApps.map(([id, app]) => row(id, app))}
      </div>

      <AlphabetStrip
        available={new Set([...byLetter.entries()].filter(([, v]) => v.length).map(([k]) => k))}
        onScrub={setScrub}
        onPick={(l) => setPicked(l === "★" ? null : l)}
      />
    </div>
  );
}
