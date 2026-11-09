/**
 * How each app looks in the shell. Which apps exist, their titles and whether
 * they are running come from the daemon (daemon/hu_daemon.py APPS).
 *
 * Icons are the apps' official artwork in public/icons/ (from each web app's
 * manifest, or Google's product-logo CDN), shown on a white rounded tile.
 * An app without an icon gets a neutral tile with its initial.
 */
const ICONS: Record<string, string> = {
  aa: "/icons/android_auto.png",
  stremio: "/icons/stremio.png",
  youtube: "/icons/youtube.png",
  gmail: "/icons/gmail.png",
  calendar: "/icons/calendar.png",
  chess: "/icons/chess.png",
  "chess-offline": "/icons/chess-offline.svg",
  gomoku: "/icons/gomoku.svg",
  android: "/icons/android.png",
  browser: "/icons/chrome.png",
};

export function AppIcon({ id, title, size }: { id: string; title: string; size: number }) {
  const src = ICONS[id];
  return (
    <span className="app-icon" style={{ width: size, height: size, borderRadius: size * 0.27 }}>
      {src ? <img src={src} alt="" draggable={false} /> : <b style={{ fontSize: size * 0.42 }}>{title[0]}</b>}
    </span>
  );
}
