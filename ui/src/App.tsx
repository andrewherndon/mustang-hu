import { useEffect, useState } from "react";
import { MOCK, useDaemon } from "./daemon";
import { Home } from "./components/Home";
import { Dock } from "./components/Dock";
import { DevBar } from "./components/DevBar";
import { Keyboard } from "./components/Keyboard";
import { Controls } from "./components/Controls";
import { DitherBackdrop } from "./components/DitherBackdrop";
import { Appearance } from "./components/Appearance";
import { useAppearance } from "./theme";
import { DesignHost } from "./designs/DesignHost";
import { DesignSettings } from "./designs/DesignSettings";
import { findDesign } from "./designs/registry";

const DESIGN_KEY = "hu.design";
/** Chosen design: ?design=<id> overrides (for previews), else remembered on the device. */
function useDesign(): [string, (id: string) => void] {
  const [design, setDesign] = useState(() => {
    const q = new URLSearchParams(location.search).get("design");
    if (q) return q;
    try { return localStorage.getItem(DESIGN_KEY) ?? "classic"; } catch { return "classic"; }
  });
  const pick = (id: string) => { setDesign(id); try { localStorage.setItem(DESIGN_KEY, id); } catch { /* not kept */ } };
  return [design, pick];
}

/**
 * Chromium on the Surface runs at --force-device-scale-factor=2, so the
 * 2880x1920 panel is a 1440x960 CSS-pixel stage. All layout is in stage px.
 * In a desktop browser (mock mode) the stage is scaled to fit the window.
 * On the Surface it is never scaled: when the on-screen keyboard is up, Sway
 * shrinks this window and the bottom of the stage simply sits behind it.
 */
const SCALE = 2;

function useFitScale(width: number, height: number) {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    if (!MOCK || new URLSearchParams(location.search).has("shot")) return;
    const update = () =>
      setFit(Math.min(window.innerWidth / width, window.innerHeight / height, 1));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);
  return fit;
}

export function App() {
  const daemon = useDaemon();
  const [designId, setDesignId] = useState("classic");
  const [chosen, pickDesign] = useDesign();
  const [reverse, setReverse] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => setDesignId(chosen), [chosen]);
  const design = findDesign(designId);
  const { appearance: ap } = useAppearance();
  const fitScale = useFitScale(1440, 960);

  const settings = (
    <DesignSettings current={designId} onPick={pickDesign}
                    androidPreload={daemon.state.settings.androidPreload}
                    onAndroidPreload={(v) => daemon.setSetting("androidPreload", v)}
                    reverse={reverse} onReverse={setReverse} onClose={() => setSettingsOpen(false)} />
  );

  if (design) {
    return (
      <div className="viewport" data-mock={MOCK}>
        <div className="stage" style={{ width: 1440, height: 960, transform: `scale(${fitScale})` }}>
          <DesignHost design={design} daemon={daemon} hue={ap.hue} motion={ap.motion}
                      reverse={reverse} onReverse={setReverse}
                      openSettings={() => setSettingsOpen(true)} settingsOpen={settingsOpen} settings={settings} />
        </div>
      </div>
    );
  }
  return <ClassicShell daemon={daemon} openDesigns={() => setSettingsOpen(true)} designSheet={settingsOpen ? settings : null} />;
}

/** The original shell ("Classic" design). */
function ClassicShell({ daemon, openDesigns, designSheet }: { daemon: ReturnType<typeof useDaemon>; openDesigns: () => void; designSheet: React.ReactNode }) {
  const { state, online, setLayout, setKeyboard, sendKey, setVolume, setMute, setBrightness, launchAndroid, mediaControl, setSetting, setSlot, mockTyped, mockSetConnected } = daemon;
  // Classic keeps the app slot at the top.
  useEffect(() => { if (state.aaRect.y !== 0) setSlot(0); }, [state.aaRect.y, setSlot]);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const { appearance, update: updateAppearance } = useAppearance();
  const stageW = state.screen.width / SCALE;
  const stageH = state.screen.height / SCALE;
  const aa = {
    x: state.aaRect.x / SCALE,
    y: state.aaRect.y / SCALE,
    width: state.aaRect.width / SCALE,
    height: state.aaRect.height / SCALE,
  };
  const dockHeight = stageH - (aa.y + aa.height);
  const fit = useFitScale(stageW, stageH);
  // Something occupies the slot: Android Auto or a web app (placed there by Sway).
  const slotVisible = state.layout !== "home";
  // While the keyboard is open it replaces the dock; the daemon shrinks the app above it.
  const kbOpen = state.keyboard.open;
  const kbHeight = state.keyboard.height / SCALE;

  return (
    <div className="viewport" data-mock={MOCK}>
      <div
        className="stage"
        data-layout={state.layout}
        style={{ width: stageW, height: stageH, transform: `scale(${fit})` }}
      >
        <DitherBackdrop hue={appearance.hue} running={state.layout === "home" && appearance.motion} />
        {/* Area above the dock: the home screen, or the slot an app (Android Auto, Stremio) is placed into. */}
        <section className="main" style={{ height: kbOpen ? stageH - kbHeight : aa.y + aa.height }}>
          <Home
            hidden={slotVisible}
            motion={appearance.motion}
            aaConnected={state.aa.connected}
            apps={state.apps}
            androidApps={state.androidApps}
            media={state.media}
            onOpen={setLayout}
            onLaunchAndroid={launchAndroid}
            onMedia={mediaControl}
          />
          {appearanceOpen && state.layout === "home" && (
            <Appearance appearance={appearance} onChange={updateAppearance} onClose={() => setAppearanceOpen(false)}
                        androidPreload={state.settings.androidPreload}
                        onAndroidPreload={(v) => setSetting("androidPreload", v)}
                        onDesigns={() => { setAppearanceOpen(false); openDesigns(); }} />
          )}
          {state.androidBooting && (
            <div className="android-loading" style={{ left: aa.x, top: aa.y, width: aa.width, height: aa.height }}>
              <div className="android-loading-spinner" />
              <div className="android-loading-title">Starting Android…</div>
              <div className="android-loading-sub">This takes about 15 seconds the first time</div>
            </div>
          )}
          {/* On the Surface the app window covers this slot; in a desktop browser it is a placeholder. */}
          <div className="aa-slot" aria-hidden={!slotVisible}
               style={{ left: aa.x, top: aa.y, width: aa.width, height: kbOpen ? stageH - kbHeight : aa.height }}>
            {MOCK && slotVisible && (
              <span>{state.apps[state.layout]?.title} renders here{kbOpen && <> · typed: “{mockTyped}”</>}</span>
            )}
          </div>
        </section>

        {kbOpen ? (
          <Keyboard height={kbHeight} onKey={sendKey} onClose={() => setKeyboard(false)} />
        ) : controlsOpen ? (
          <Controls
            height={dockHeight}
            volume={state.volume}
            brightness={state.brightness}
            onVolume={setVolume}
            onMute={setMute}
            onBrightness={setBrightness}
            onClose={() => setControlsOpen(false)}
          />
        ) : (
          <Dock
            height={dockHeight}
            layout={state.layout}
            aaConnected={state.aa.connected}
            apps={state.apps}
            androidApps={state.androidApps}
            androidFront={state.androidFront}
            androidRecent={state.androidRecent}
            onLaunchAndroid={launchAndroid}
            online={online}
            keyboardAvailable={state.keyboard.available}
            onOpen={setLayout}
            onKeyboard={() => setKeyboard(true)}
            onControls={() => setControlsOpen(true)}
            onSettings={() => {
              setLayout("home");
              setAppearanceOpen(true);
            }}
            volume={state.volume}
          />
        )}
      </div>

      {designSheet}
      {MOCK && <DevBar connected={state.aa.connected} onConnected={mockSetConnected} />}
    </div>
  );
}
