import type { UApp } from "./types";

/** An app's artwork, or its initial when it has none (mock Android apps). */
export function AppGlyph({ app, className, filter }: { app: UApp; className?: string; filter?: string }) {
  return app.icon
    ? <img className={className} src={app.icon} alt="" draggable={false} style={{ filter }} />
    : <span className={`${className ?? ""} glyph-letter`} data-kind={app.kind}>{app.title.slice(0, 1)}</span>;
}

/** Mock-or-real media line, shared phrasing. */
export const mediaLine = (m: { title: string; artist: string } | null, empty = "Nothing playing") =>
  m ? `${m.title} — ${m.artist}` : empty;
