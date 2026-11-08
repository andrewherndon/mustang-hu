/**
 * Animated gradient background: a dark base, a broad diagonal colour band
 * and two soft glows, each slowly drifting on its own long loop.
 *
 * Performance: every layer is a plain gradient (no CSS blur filters), and only
 * `transform` is animated, so the GPU just moves pre-rendered layers around.
 * The animation pauses when an app covers the screen (see styles.css).
 */
export function Backdrop() {
  return (
    <div className="backdrop" aria-hidden>
      <div className="bd-band bd-band-1" />
      <div className="bd-band bd-band-2" />
      <div className="bd-curve" />
      <div className="bd-glow bd-glow-1" />
      <div className="bd-glow bd-glow-2" />
      <div className="bd-vignette" />
    </div>
  );
}
