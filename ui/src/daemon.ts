import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyPress } from "./components/Keyboard";

/** Mirrors the daemon protocol (daemon/hu_daemon.py). Rects are physical pixels. */
export type AppId = "aa" | "stremio";
/** "home", or the app shown in the slot (the 16:9 area above the dock). */
export type Layout = "home" | AppId;
export interface Rect { x: number; y: number; width: number; height: number }
export interface AppState { title: string; running: boolean }
export interface DaemonState {
  aa: { connected: boolean };
  apps: Record<AppId, AppState>;
  layout: Layout;
  aaRect: Rect;
  /** The shell's keyboard: open, allowed for the current app, height in physical px. */
  keyboard: { open: boolean; available: boolean; height: number };
  screen: { width: number; height: number };
}

const DAEMON_URL = "ws://localhost:8765";

/** Defaults match the Surface; used until the daemon answers, and in mock mode. */
export const DEFAULT_STATE: DaemonState = {
  aa: { connected: false },
  apps: {
    aa: { title: "Android Auto", running: false },
    stremio: { title: "Stremio", running: false },
  },
  layout: "home",
  aaRect: { x: 0, y: 0, width: 2880, height: 1620 },
  keyboard: { open: false, available: false, height: 760 },
  screen: { width: 2880, height: 1920 },
};

/**
 * Mock mode (open the app with ?mock) simulates the daemon so the UI can be
 * designed in a desktop browser on the Mac: a phone can be "connected" from
 * the dev toolbar and layout changes apply locally.
 */
export const MOCK = new URLSearchParams(location.search).has("mock");

export function useDaemon() {
  const [state, setState] = useState<DaemonState>(DEFAULT_STATE);
  const [online, setOnline] = useState(MOCK);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (MOCK) return;
    let closed = false;
    let retry: number | undefined;

    const connect = () => {
      const socket = new WebSocket(DAEMON_URL);
      ws.current = socket;
      socket.onopen = () => setOnline(true);
      socket.onmessage = (e) => {
        const msg = JSON.parse(e.data);
        if (msg.type === "state") setState(msg as DaemonState);
      };
      socket.onclose = () => {
        setOnline(false);
        if (!closed) retry = window.setTimeout(connect, 1000);
      };
    };
    connect();
    return () => {
      closed = true;
      window.clearTimeout(retry);
      ws.current?.close();
    };
  }, []);

  const setLayout = useCallback((layout: Layout) => {
    if (MOCK) {
      setState((s) => {
        const kb = { ...s.keyboard, open: false, available: layout !== "home" && layout !== "aa" };
        if (layout === "aa" && !s.aa.connected) return { ...s, layout: "home", keyboard: { ...kb, available: false } };
        if (layout === "home" || layout === "aa") return { ...s, layout, keyboard: kb };
        // Web apps "launch" on first open, like the real daemon.
        return { ...s, layout, keyboard: kb, apps: { ...s.apps, [layout]: { ...s.apps[layout], running: true } } };
      });
      return;
    }
    ws.current?.send(JSON.stringify({ type: "setLayout", layout }));
  }, []);

  const [mockTyped, setMockTyped] = useState("");

  const setKeyboard = useCallback((open: boolean) => {
    if (MOCK) {
      setState((s) => ({ ...s, keyboard: { ...s.keyboard, open: open && s.keyboard.available } }));
      return;
    }
    ws.current?.send(JSON.stringify({ type: "keyboard", open }));
  }, []);

  const sendKey = useCallback((k: KeyPress) => {
    if (MOCK) {
      setMockTyped((t) => ("text" in k ? t + k.text : k.key === "BackSpace" ? t.slice(0, -1) : t));
      return;
    }
    ws.current?.send(JSON.stringify({ type: "key", ...k }));
  }, []);

  /** Mock only: simulate plugging the phone in or out (the daemon auto-opens AA). */
  const mockSetConnected = useCallback((connected: boolean) => {
    setState((s) => ({
      ...s,
      aa: { connected },
      apps: { ...s.apps, aa: { ...s.apps.aa, running: connected } },
      layout: connected ? "aa" : s.layout === "aa" ? "home" : s.layout,
    }));
  }, []);

  return { state, online, setLayout, setKeyboard, sendKey, mockTyped, mockSetConnected };
}
