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
    if (!MOCK) return;
    const update = () =>
      setFit(Math.min(window.innerWidth / width, window.innerHeight / height, 1));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);
  return fit;
}

export function App() {
  const { state, online, setLayout, setKeyboard, sendKey, setVolume, setMute, setBrightness, launchAndroid, mediaControl, mockTyped, mockSetConnected } = useDaemon();
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
            <Appearance appearance={appearance} onChange={updateAppearance} onClose={() => setAppearanceOpen(false)} />
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

      {MOCK && <DevBar connected={state.aa.connected} onConnected={mockSetConnected} />}
    </div>
  );
}
