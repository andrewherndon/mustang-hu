import { useEffect, useRef, useState } from "react";

/**
 * A live camera (front grille or rear). Uses a real USB camera when one whose
 * name matches is connected (V4L2 via getUserMedia); until then an animated
 * placeholder: a dim night-road scene with sensor noise, so designs can be
 * judged with a "feed" in place.
 */
export type CameraKind = "front" | "rear";

const MATCH: Record<CameraKind, RegExp> = { front: /front|grille|grill/i, rear: /rear|back|reverse/i };

export function useCameraStream(kind: CameraKind) {
  const [stream, setStream] = useState<MediaStream | null>(null);
  useEffect(() => {
    let cancelled = false, s: MediaStream | null = null;
    (async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        const devs = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "videoinput");
        const dev = devs.find((d) => MATCH[kind].test(d.label));
        if (!dev) return;
        s = await navigator.mediaDevices.getUserMedia({ video: { deviceId: dev.deviceId } });
        if (!cancelled) setStream(s); else s.getTracks().forEach((t) => t.stop());
      } catch { /* no camera: placeholder */ }
    })();
    return () => { cancelled = true; s?.getTracks().forEach((t) => t.stop()); };
  }, [kind]);
  return stream;
}

interface Props {
  kind: CameraKind;
  className?: string;
  /** CSS filter applied to the feed (e.g. phosphor green, monochrome). */
  filter?: string;
  label?: boolean;
}

export function CameraFeed({ kind, className, filter, label = true }: Props) {
  const stream = useCameraStream(kind);
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (video.current && stream) video.current.srcObject = stream;
  }, [stream]);
  return (
    <div className={`camfeed ${className ?? ""}`}>
      {stream
        ? <video ref={video} autoPlay muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover", filter, transform: kind === "rear" ? "scaleX(-1)" : undefined }} />
        : <PlaceholderFeed kind={kind} filter={filter} />}
      {label && <span className="camfeed-label">{kind === "front" ? "FRONT" : "REAR"}{stream ? "" : " · NO SIGNAL"}</span>}
    </div>
  );
}

function PlaceholderFeed({ kind, filter }: { kind: CameraKind; filter?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current!, ctx = el.getContext("2d")!;
    el.width = 320; el.height = 180;
    let raf = 0, t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 1;
      if (t % 2) return;                                   // ~30 fps is plenty
      const g = ctx.createLinearGradient(0, 0, 0, 180);
      g.addColorStop(0, "#0b0f16"); g.addColorStop(0.45, "#141b26"); g.addColorStop(1, "#262b31");
      ctx.fillStyle = g; ctx.fillRect(0, 0, 320, 180);
      // road and lane dashes moving towards the camera
      ctx.fillStyle = "#2f3338";
      ctx.beginPath(); ctx.moveTo(150, 80); ctx.lineTo(170, 80); ctx.lineTo(320, 180); ctx.lineTo(0, 180); ctx.fill();
      ctx.strokeStyle = "rgba(255,240,200,0.75)"; ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const p = ((i / 6) + (kind === "front" ? t / 240 : -t / 240) + 10) % 1;
        const y = 80 + p * p * 100, len = 4 + p * 18;
        ctx.beginPath(); ctx.moveTo(160, y); ctx.lineTo(160, Math.min(180, y + len)); ctx.stroke();
      }
      // street lights
      for (let i = 0; i < 4; i++) {
        const p = ((i / 4) + t / 360) % 1, x = 160 + (40 + p * 220) * (i % 2 ? 1 : -1) * p;
        ctx.fillStyle = `rgba(255,200,120,${0.25 + p * 0.5})`;
        ctx.beginPath(); ctx.arc(x, 70 - p * 50, 1 + p * 3, 0, 7); ctx.fill();
      }
      // sensor noise
      const img = ctx.getImageData(0, 0, 320, 180), d = img.data;
      for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 22; d[i] += n; d[i + 1] += n; d[i + 2] += n; }
      ctx.putImageData(img, 0, 0);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kind]);
  return <canvas ref={ref} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", filter }} />;
}

/** Full-screen reversing view: rear camera with parking guide lines. */
export function RearView({ onClose, accent = "#ffd60a" }: { onClose?: () => void; accent?: string }) {
  return (
    <div className="rearview" onClick={onClose}>
      <CameraFeed kind="rear" className="rearview-feed" label={false} />
      <svg className="rearview-guides" viewBox="0 0 100 60" preserveAspectRatio="none">
        <path d="M18 60 L36 22" stroke="#ff3b30" strokeWidth="0.6" fill="none" />
        <path d="M82 60 L64 22" stroke="#ff3b30" strokeWidth="0.6" fill="none" />
        <path d="M27 41 L73 41" stroke={accent} strokeWidth="0.5" />
        <path d="M33 29 L67 29" stroke="#34c759" strokeWidth="0.5" />
      </svg>
      <div className="rearview-tag">R · REAR CAMERA</div>
    </div>
  );
}
