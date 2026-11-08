import { useEffect, useState } from "react";
import { MOCK, useDaemon, type AppId } from "./daemon";
import { Home } from "./components/Home";
import { Dock } from "./components/Dock";
import { DevBar } from "./components/DevBar";

/**
 * Chromium on the Surface runs at --force-device-scale-factor=2, so the
 * 2880x1920 panel is a 1440x960 CSS-pixel stage. All layout is in stage px.
 * In a desktop browser the stage is scaled to fit the window instead.
 */
const SCALE = 2;

function useFitScale(width: number, height: number) {
  const [fit, setFit] = useState(1);
  useEffect(() => {
    const update = () =>
      setFit(Math.min(window.innerWidth / width, window.innerHeight / height, 1));
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [width, height]);
  return fit;
}

export function App() {
  const { state, online, setLayout, mockSetConnected } = useDaemon();
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

  return (
    <div className="viewport">
      <div
        className="stage"
        data-layout={state.layout}
        style={{ width: stageW, height: stageH, transform: `scale(${fit})` }}
      >
        {/* Area above the dock: the home screen, or the slot an app (Android Auto, Stremio) is placed into. */}
        <section className="main" style={{ height: aa.y + aa.height }}>
          <Home
            hidden={slotVisible}
            aaConnected={state.aa.connected}
            stremioRunning={state.apps.stremio.running}
            onOpen={setLayout}
          />
          {/* On the Surface the app window covers this slot; in a desktop browser it is a placeholder. */}
          <div className="aa-slot" aria-hidden={!slotVisible}
               style={{ left: aa.x, top: aa.y, width: aa.width, height: aa.height }}>
            {MOCK && slotVisible && <span>{state.apps[state.layout as AppId].title} renders here</span>}
          </div>
        </section>

        <Dock
          height={dockHeight}
          layout={state.layout}
          aaConnected={state.aa.connected}
          online={online}
          onOpen={setLayout}
        />
      </div>

      {MOCK && <DevBar connected={state.aa.connected} onConnected={mockSetConnected} />}
    </div>
  );
}
