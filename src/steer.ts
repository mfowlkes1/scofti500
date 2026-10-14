// Steering on a phone: the thumb pad, or tilt the phone like a wheel. Asked once, after the first car
// pick (Michael, 2026-10-13: the store racing games all offer it); the pause screen changes it later.
// Saved as scofti500:steer ("tilt" or "thumb").

import { viewAngle } from "./turn";

const KEY = "scofti500:steer";
export type SteerMode = "tilt" | "thumb";

export const touchScreen = () => matchMedia("(pointer: coarse)").matches;

export function savedSteer(): SteerMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "tilt" || v === "thumb" ? v : null;
  } catch {
    return null;
  }
}

export function steerMode(): SteerMode {
  return savedSteer() ?? "thumb";
}

/** saves the choice; tilt asks for the motion sensor first (iPhones want that from a tap) */
export async function setSteer(m: SteerMode): Promise<SteerMode> {
  if (m === "tilt") {
    const ask = (DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<string> }).requestPermission;
    if (ask) {
      try {
        if ((await ask.call(DeviceOrientationEvent)) !== "granted") m = "thumb";
      } catch {
        m = "thumb";
      }
    }
  }
  try {
    localStorage.setItem(KEY, m);
  } catch {
    // not remembered
  }
  return m;
}

// ---- reading the tilt ----
// Which way is up, seen on the screen: from the phone's beta and gamma, turned by the screen's own
// rotation. Level is the wheel straight; turn it clockwise and the car goes right. A few degrees do
// nothing, full lock at about 25.
let angle = 0;
let lastEvent = 0;
addEventListener("deviceorientation", (e) => {
  if (e.beta == null || e.gamma == null) return;
  const b = (e.beta * Math.PI) / 180;
  const g = (e.gamma * Math.PI) / 180;
  const ux = -Math.cos(b) * Math.sin(g);
  const uy = Math.sin(b);
  const rot = (viewAngle() * Math.PI) / 180;
  const sx = ux * Math.cos(rot) - uy * Math.sin(rot);
  const sy = ux * Math.sin(rot) + uy * Math.cos(rot);
  // lying flat there's no wheel to read: hold the last angle
  if (Math.hypot(sx, sy) < 0.25) return;
  const a = (Math.atan2(-sx, sy) * 180) / Math.PI;
  // a little smoothing so the hands' shake doesn't wobble the car
  angle += (a - angle) * 0.5;
  lastEvent = performance.now();
});

/** the tilt as a steer, -1 left to 1 right; null when the phone isn't sending any */
export function tiltSteer(): number | null {
  if (performance.now() - lastEvent > 1000) return null;
  const dead = 3;
  const full = 25;
  const over = Math.max(0, Math.abs(angle) - dead) / (full - dead);
  return Math.sign(angle) * Math.min(1, Math.pow(over, 1.2));
}
