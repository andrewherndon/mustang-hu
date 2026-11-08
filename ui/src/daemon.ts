import { useCallback, useEffect, useRef, useState } from "react";

/** Mirrors the daemon protocol (daemon/hu_daemon.py). Rects are physical pixels. */
export type Layout = "home" | "aa";
export interface Rect { x: number; y: number; width: number; height: number }
export interface DaemonState {
  aa: { connected: boolean };
  layout: Layout;
  aaRect: Rect;
  screen: { width: number; height: number };
}

const DAEMON_URL = "ws://localhost:8765";

/** Defaults match the Surface; used until the daemon answers, and in mock mode. */
export const DEFAULT_STATE: DaemonState = {
  aa: { connected: false },
  layout: "home",
  aaRect: { x: 0, y: 0, width: 2880, height: 1620 },
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
      setState((s) => ({ ...s, layout: layout === "aa" && !s.aa.connected ? "home" : layout }));
      return;
    }
    ws.current?.send(JSON.stringify({ type: "setLayout", layout }));
  }, []);

  /** Mock only: simulate plugging the phone in or out (the daemon auto-opens AA). */
  const mockSetConnected = useCallback((connected: boolean) => {
    setState((s) => ({ ...s, aa: { connected }, layout: connected ? "aa" : "home" }));
  }, []);

  return { state, online, setLayout, mockSetConnected };
}
