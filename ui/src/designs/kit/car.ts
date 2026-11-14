import { useEffect, useRef, useState } from "react";

/**
 * Car data for the designs. Mocked until the ESP32 (engine) and USB GPS
 * (speed, heading) are connected: a looping drive cycle through a 1995 GT's
 * 5.0 V8 numbers, smoothed so gauges move like real ones.
 */
export interface CarData {
  speedMph: number;
  rpm: number;
  gear: "P" | "R" | "N" | "1" | "2" | "3" | "4" | "5";
  coolantF: number;
  oilPsi: number;
  voltage: number;
  fuelPct: number;
  gLat: number;          // lateral g
  gLong: number;         // longitudinal g
  headingDeg: number;
  tripMi: number;
  odometerMi: number;
  outsideF: number;
  parked: boolean;
  /** Mock AI detections in front of the car (road render). */
  objects: Detected[];
}

export interface Detected {
  id: number;
  kind: "car" | "truck" | "person" | "bike" | "cone";
  lane: number;          // -1 left, 0 ours, 1 right (fractions allowed)
  distM: number;         // metres ahead
}

const REDLINE = 6000;
export const CAR_REDLINE = REDLINE;

/** Target speed over a 180 s loop: idle, city, highway, slowdown. */
function targetSpeed(t: number) {
  const s = t % 180;
  if (s < 12) return 0;
  if (s < 40) return 32 + 6 * Math.sin(s / 3);
  if (s < 55) return 18;
  if (s < 120) return 66 + 4 * Math.sin(s / 5);
  if (s < 150) return 45;
  if (s < 170) return 20;
  return 0;
}

function gearFor(mph: number): CarData["gear"] {
  if (mph < 0.5) return "N";
  if (mph < 14) return "1";
  if (mph < 26) return "2";
  if (mph < 40) return "3";
  if (mph < 55) return "4";
  return "5";
}
const RATIO: Record<string, number> = { "1": 3.35, "2": 1.99, "3": 1.33, "4": 1.0, "5": 0.68 };

export function useCarData(hz = 20): CarData {
  const start = useRef(performance.now() - Math.random() * 60_000);
  const sim = useRef({ speed: 0, heading: 210, trip: 12.4, fuel: 0.71, objects: [] as Detected[], nextId: 1 });
  const [data, setData] = useState<CarData>(() => snapshot(sim.current, 0, 0));

  useEffect(() => {
    let last = performance.now();
    const timer = window.setInterval(() => {
      const now = performance.now();
      const dt = (now - last) / 1000; last = now;
      const t = (now - start.current) / 1000;
      const s = sim.current;
      const target = targetSpeed(t);
      const accel = Math.max(-6, Math.min(4, (target - s.speed) * 0.8));      // mph/s
      s.speed = Math.max(0, s.speed + accel * dt);
      s.heading = (s.heading + Math.sin(t / 9) * 6 * dt + 360) % 360;
      s.trip += (s.speed / 3600) * dt;
      s.fuel = Math.max(0.05, s.fuel - s.speed * dt * 2e-6);
      // Mock detections: objects approach (relative speed) and get respawned.
      s.objects = s.objects
        .map((o) => ({ ...o, distM: o.distM - (o.kind === "cone" || o.kind === "person" ? s.speed * 0.447 : (s.speed - 55) * 0.2) * dt }))
        .filter((o) => o.distM > 3 && o.distM < 90);
      while (s.objects.length < (s.speed > 5 ? 4 : 2)) {
        const kinds: Detected["kind"][] = ["car", "car", "car", "truck", "bike", "person"];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        s.objects.push({ id: s.nextId++, kind, lane: kind === "person" ? 1.6 : [-1, 0, 1][Math.floor(Math.random() * 3)], distM: 25 + Math.random() * 60 });
      }
      setData(snapshot(s, accel, t));
    }, 1000 / hz);
    return () => window.clearInterval(timer);
  }, [hz]);
  return data;
}

function snapshot(s: { speed: number; heading: number; trip: number; fuel: number; objects: Detected[] }, accel: number, t: number): CarData {
  const gear = gearFor(s.speed);
  const rpm = gear === "N" ? 750 + 30 * Math.sin(t * 3)
    // rpm = mph × gear ratio × axle (3.08) × 336 / tyre diameter (26")
    : Math.min(REDLINE, Math.max(800, s.speed * RATIO[gear] * 3.08 * 336 / 26 + Math.max(0, accel) * 250));
  return {
    speedMph: s.speed, rpm, gear,
    coolantF: 196 + 4 * Math.sin(t / 20), oilPsi: 25 + rpm / 150, voltage: 14.1 + 0.15 * Math.sin(t / 7),
    fuelPct: s.fuel * 100, gLat: 0.25 * Math.sin(t / 2.3) * Math.min(1, s.speed / 30), gLong: accel / 22,
    headingDeg: s.heading, tripMi: s.trip, odometerMi: 118_430 + s.trip, outsideF: 58,
    parked: s.speed < 0.5, objects: s.objects,
  };
}

export const compass = (deg: number) => ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(deg / 45) % 8];
