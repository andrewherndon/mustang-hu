import { useEffect, useMemo, useState } from "react";
import { ANDROID_ICON_BASE, MOCK, type useDaemon } from "../daemon";
import { ICONS } from "../apps";
import { Keyboard } from "../components/Keyboard";
import { useCarData } from "./kit/car";
import { RearView } from "./kit/CameraFeed";
import type { Design, DesignContext, UApp } from "./kit/types";
import "./kit/kit.css";

const SCALE = 2;
const LINUX_ORDER = ["aa", "youtube", "stremio", "gmail", "calendar", "chess-offline", "gomoku", "chess", "browser"];

interface Props {
  design: Design;
  daemon: ReturnType<typeof useDaemon>;
  hue: number;
  motion: boolean;
  reverse: boolean;
  onReverse: (r: boolean) => void;
  openSettings: () => void;
  settingsOpen: boolean;
  settings: React.ReactNode;
}

/**
 * Runs one design full-screen: builds the shared context (apps, car data,
 * slot, actions) and adds the parts every design shares: the app-slot
 * placeholder (mock), the Android loading screen, the keyboard, the settings
 * sheet and the reversing camera.
 */
export function DesignHost({ design, daemon, hue, motion, reverse, onReverse, openSettings, settingsOpen, settings }: Props) {
  const { state, online, setLayout, setKeyboard, sendKey, setVolume, setMute, setBrightness, launchAndroid, mediaControl, setSlot } = daemon;
  const car = useCarData();

  // Put the app slot where this design wants it.
  const wantY = design.slot === "bottom" ? 300 : 0;
  useEffect(() => { if (state.aaRect.y !== wantY) setSlot(wantY as 0 | 300); }, [wantY, state.aaRect.y, setSlot]);

  const apps = useMemo<UApp[]>(() => {
    const linux = [...LINUX_ORDER.filter((id) => state.apps[id]), ...Object.keys(state.apps).filter((id) => !LINUX_ORDER.includes(id) && id !== "android")]
      .map<UApp>((id) => ({
        key: id, title: state.apps[id].title, icon: ICONS[id], kind: id === "aa" ? "aa" : "linux",
        running: id === "aa" ? state.aa.connected : state.apps[id].running,
        active: state.layout === id,
        disabled: id === "aa" && !state.aa.connected,
        open: () => setLayout(id),
      }));
    const android = state.androidApps.map<UApp>((a) => ({
      key: `android:${a.pkg}`, title: a.title, icon: a.icon ? ANDROID_ICON_BASE + a.icon : undefined, kind: "android",
      running: state.androidRecent.includes(a.pkg),
      active: state.layout === "android" && state.androidFront === a.pkg,
      open: () => launchAndroid(a.pkg),
    }));
    return [...linux, ...android];
  }, [state.apps, state.aa.connected, state.layout, state.androidApps, state.androidRecent, state.androidFront, setLayout, launchAndroid]);

  const running = useMemo(() => {
    const recentAndroid = state.androidRecent.map((p) => apps.find((a) => a.key === `android:${p}`)).filter(Boolean) as UApp[];
    return [...apps.filter((a) => a.kind !== "android" && a.running && a.kind !== "aa"), ...recentAndroid];
  }, [apps, state.androidRecent]);

  const appOpen = state.layout !== "home";
  const currentApp = apps.find((a) => a.active) ?? (state.layout === "android" ? { key: "android", title: "Android", kind: "android", running: true, active: true, open: () => setLayout("android") } as UApp : null);
  const slot = { x: state.aaRect.x / SCALE, y: state.aaRect.y / SCALE, width: state.aaRect.width / SCALE, height: state.aaRect.height / SCALE };

  const ctx: DesignContext = {
    state, online, car, apps, running, appOpen, currentApp, slot,
    goHome: () => setLayout("home"), openLayout: setLayout, openSettings,
    openKeyboard: () => setKeyboard(true),
    media: state.media, mediaControl, setVolume, setMute, setBrightness,
    reverse, hue, motion, mock: MOCK,
  };
  const Component = design.Component;
  const kbOpen = state.keyboard.open;

  return (
    <div className={`design design-${design.id}`} data-app-open={appOpen}>
      <Component ctx={ctx} />

      {MOCK && appOpen && (
        <div className="mock-slot" style={{ left: slot.x, top: kbOpen ? 0 : slot.y, width: slot.width, height: kbOpen ? 960 - 380 : slot.height }}>
          {currentApp?.title ?? state.layout} renders here
        </div>
      )}
      {state.androidBooting && (
        <div className="android-loading" style={{ left: slot.x, top: slot.y, width: slot.width, height: slot.height }}>
          <div className="android-loading-spinner" />
          <div className="android-loading-title">Starting Android…</div>
          <div className="android-loading-sub">This takes about 15 seconds the first time</div>
        </div>
      )}
      {kbOpen && (
        <div className="design-kb"><Keyboard height={380} onKey={sendKey} onClose={() => setKeyboard(false)} /></div>
      )}
      {reverse && <RearView onClose={() => onReverse(false)} />}
      {settingsOpen && settings}
      {MOCK && !new URLSearchParams(location.search).has("shot") && <MockBar reverse={reverse} onReverse={onReverse} daemon={daemon} />}
    </div>
  );
}

function MockBar({ reverse, onReverse, daemon }: { reverse: boolean; onReverse: (r: boolean) => void; daemon: ReturnType<typeof useDaemon> }) {
  const [open, setOpen] = useState(true);
  if (!open) return <button className="mockbar-mini" onClick={() => setOpen(true)}>dev</button>;
  return (
    <div className="mockbar">
      <button onClick={() => daemon.mockSetConnected(!daemon.state.aa.connected)}>{daemon.state.aa.connected ? "unplug phone" : "plug phone"}</button>
      <button onClick={() => onReverse(!reverse)}>{reverse ? "exit reverse" : "reverse"}</button>
      <button onClick={() => daemon.launchAndroid("mock.spotify")}>play music</button>
      <button onClick={() => setOpen(false)}>×</button>
    </div>
  );
}
