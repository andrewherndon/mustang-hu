import { useEffect, useState } from "react";
import { formatDate, formatTime, useClock } from "../useClock";
import { ANDROID_ICON_BASE, type AndroidApp, type AppState, type Layout, type Media, type MediaAction } from "../daemon";
import { AppIcon } from "../apps";
import { MustangGraphic } from "./MustangGraphic";

interface Props {
  hidden: boolean;
  motion: boolean;
  aaConnected: boolean;
  apps: Record<string, AppState>;
  androidApps: AndroidApp[];
  media: Media | null;
  onOpen: (layout: Layout) => void;
  onLaunchAndroid: (pkg: string) => void;
  onMedia: (action: MediaAction) => void;
}

/** Home screen order for Linux apps (apps not listed here follow, in the daemon's order). */
const ORDER = ["aa", "youtube", "stremio", "gmail", "calendar", "android", "chess-offline", "gomoku", "chess", "browser"];

type Source = "linux" | "android";
const SOURCE_KEY = "hu.appSource";

function useSource(): [Source, (s: Source) => void] {
  const [source, setSource] = useState<Source>(() => {
    try { return localStorage.getItem(SOURCE_KEY) === "android" ? "android" : "linux"; } catch { return "linux"; }
  });
  useEffect(() => {
    try { localStorage.setItem(SOURCE_KEY, source); } catch { /* not persisted */ }
  }, [source]);
  return [source, setSource];
}

/**
 * Home: clock, car and now playing on the left; apps on the right. A toggle in
 * the corner switches the app grid between the Linux apps (web apps, games,
 * Android Auto) and the apps installed in Android.
 */
export function Home({ hidden, motion, aaConnected, apps, androidApps, media, onOpen, onLaunchAndroid, onMedia }: Props) {
  const now = useClock();
  const [source, setSource] = useSource();
  const ids = [...ORDER.filter((id) => apps[id]), ...Object.keys(apps).filter((id) => !ORDER.includes(id))];

  return (
    <div className="home" data-hidden={hidden}>
      <div className="home-left">
        <div className="clock">{formatTime(now)}</div>
        <div className="clock-date">{formatDate(now)}</div>

        <MustangGraphic playing={!hidden && motion} />

        <NowPlaying media={media} aaConnected={aaConnected} onMedia={onMedia} />
      </div>

      <div className="apps-panel">
        <div className="source-toggle" role="tablist">
          <button role="tab" data-on={source === "linux"} onClick={() => setSource("linux")}>Linux</button>
          <button role="tab" data-on={source === "android"} onClick={() => setSource("android")}>Android</button>
        </div>

        {source === "linux" ? (
          <div className="app-grid">
            {ids.map((id) => {
              const app = apps[id];
              const disabled = id === "aa" && !aaConnected;
              return (
                <button key={id} className="app" disabled={disabled} onClick={() => onOpen(id)}>
                  <AppIcon id={id} title={app.title} size={116} />
                  <span className="app-label">{app.title}</span>
                  {id === "aa" && aaConnected && <span className="app-badge app-badge-live" />}
                  {id !== "aa" && app.running && <span className="app-badge" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="app-grid">
            {androidApps.length === 0 && <div className="apps-empty">No Android apps found</div>}
            {androidApps.map((a) => (
              <button key={a.pkg} className="app" onClick={() => onLaunchAndroid(a.pkg)}>
                <AppIcon id={a.pkg} title={a.title} size={116} src={a.icon ? ANDROID_ICON_BASE + a.icon : undefined} />
                <span className="app-label">{a.title}</span>
                {media?.package === a.pkg && media.playing && <span className="app-badge app-badge-live" />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function NowPlaying({ media, aaConnected, onMedia }: { media: Media | null; aaConnected: boolean; onMedia: (a: MediaAction) => void }) {
  if (!media) {
    return (
      <div className="nowplaying">
        <div className="np-art" />
        <div className="np-text">
          <div className="np-title">Nothing playing</div>
          <div className="np-sub">{aaConnected ? "Start music in Android Auto" : "Play something in an Android app"}</div>
        </div>
      </div>
    );
  }
  return (
    <div className="nowplaying" data-playing={media.playing}>
      <div className="np-art np-art-app">
        <img src={`${ANDROID_ICON_BASE}/android-icons/${media.package}.png`} alt="" draggable={false} />
      </div>
      <div className="np-text">
        <div className="np-title">{media.title}</div>
        <div className="np-sub">{[media.artist, media.app].filter(Boolean).join(" · ")}</div>
      </div>
      <div className="np-controls">
        <button onClick={() => onMedia("previous")} aria-label="Previous">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M6 6h2v12H6zM20 6v12L9.5 12z" /></svg>
        </button>
        <button className="np-play" onClick={() => onMedia("play-pause")} aria-label={media.playing ? "Pause" : "Play"}>
          {media.playing
            ? <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M7 5h4v14H7zM13 5h4v14h-4z" /></svg>
            : <svg viewBox="0 0 24 24" width="32" height="32" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}
        </button>
        <button onClick={() => onMedia("next")} aria-label="Next">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor"><path d="M16 6h2v12h-2zM4 6v12l10.5-6z" /></svg>
        </button>
      </div>
    </div>
  );
}
