import { useEffect, useRef } from "react";
import { ditherDraw, type DitherOpts } from "./dither";
import { CameraFeed } from "./CameraFeed";

/**
 * A still image dithered once (or re-dithered on resize). For pre-made art,
 * prefer tools/dither.sh at build time; this is for images that should match
 * a palette chosen at runtime.
 */
export function DitherImage({ src, opts, className }: { src: string; opts: DitherOpts; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(opts);
  useEffect(() => {
    const el = ref.current!, img = new Image(), work = document.createElement("canvas");
    let alive = true;
    const draw = () => {
      if (!alive || !img.naturalWidth) return;
      const r = el.getBoundingClientRect();
      el.width = Math.max(1, Math.round(r.width)); el.height = Math.max(1, Math.round(r.height));
      ditherDraw(img, img.naturalWidth, img.naturalHeight, el, opts, work);
    };
    img.onload = draw; img.src = src;
    const ro = new ResizeObserver(draw); ro.observe(el);
    return () => { alive = false; ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, key]);
  return <canvas ref={ref} className={className} style={{ width: "100%", height: "100%", display: "block" }} />;
}

/**
 * Live-dither whatever canvas/video its children render (camera feed, road
 * render): the children are drawn hidden and sampled ~15 times a second.
 */
export function DitherLive({ opts, className, fps = 15, children }: { opts: DitherOpts; className?: string; fps?: number; children: React.ReactNode }) {
  const host = useRef<HTMLDivElement>(null);
  const out = useRef<HTMLCanvasElement>(null);
  const live = useRef(opts);
  live.current = opts;
  useEffect(() => {
    const work = document.createElement("canvas");
    const t = window.setInterval(() => {
      const el = out.current, src = host.current?.querySelector("video, canvas") as HTMLVideoElement | HTMLCanvasElement | null;
      if (!el || !src) return;
      const sw = src instanceof HTMLVideoElement ? src.videoWidth : src.width, sh = src instanceof HTMLVideoElement ? src.videoHeight : src.height;
      if (!sw || !sh) return;
      const r = el.getBoundingClientRect();
      if (!r.width) return;
      if (el.width !== Math.round(r.width)) { el.width = Math.round(r.width); el.height = Math.round(r.height); }
      ditherDraw(src, sw, sh, el, live.current, work);
    }, 1000 / fps);
    return () => window.clearInterval(t);
  }, [fps]);
  return (
    <div className={className} style={{ position: "relative", overflow: "hidden" }}>
      <div ref={host} style={{ position: "absolute", inset: 0, opacity: 0, pointerEvents: "none" }}>{children}</div>
      <canvas ref={out} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }} />
    </div>
  );
}

/** The front camera, live-dithered into a palette. */
export function DitherCamera({ opts, className, fps = 15 }: { opts: DitherOpts; className?: string; fps?: number }) {
  return <DitherLive opts={opts} className={className} fps={fps}><CameraFeed kind="front" label={false} /></DitherLive>;
}
