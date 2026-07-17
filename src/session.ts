// per-connection state and the two composed behaviors built from existing
// protocol primitives: verified click (move -> read back -> correct once ->
// press) and calibration (relative-move scale probe at session start).

import type { RebindRemote } from "@rebind.gg/client-ts";
import {
  inImageBounds,
  mapToScreen,
  type Point,
  type ShotMapping,
} from "./coords.ts";

/** acceptable landing error. relative counts map 1:1 to pixels, but readback
 * (GetCursorPos) lags the just-sent USB move under load, so keep a small margin. */
export const CLICK_EPS_PX = 5;

/** OS cursor + SystemState refresh time after a move burst, before reading back.
 * too short and the readback is stale, the loop mis-corrects, and it diverges. */
const SETTLE_MS = 70;

/** correction passes: read real cursor, step the residual, repeat. */
const MOVE_MAX_PASSES = 6;
/** target pixels per glide step — smaller is smoother (more USB frames). */
const MOVE_STEP_PX = 40;
/** cap on glide steps in one pass, so a cross-screen move stays bounded. */
const MOVE_MAX_STEPS = 40;
/** delay between glide steps within a pass. */
const MOVE_STEP_MS = 8;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export type MouseButton = "left" | "right" | "middle";

const BUTTON_CODE: Record<MouseButton, string> = {
  left: "Mouse1",
  right: "Mouse2",
  middle: "Mouse3",
};

export interface ClickResult {
  ok: boolean;
  landed: Point;
  corrected: boolean;
}

export interface CalibrationResult {
  calibrated: boolean;
  /** input counts per screen pixel when the ratio is constant. */
  k?: number;
  reason?: string;
}

export class Session {
  lastShot: ShotMapping | null = null;
  calibration: CalibrationResult | null = null;

  constructor(readonly client: RebindRemote) {}

  /** map a point in the last screenshot's image space to screen coords. */
  mapImagePoint(ix: number, iy: number): Point {
    if (!this.lastShot) {
      throw new Error(
        "no screenshot taken yet — call the screenshot tool first",
      );
    }
    if (!inImageBounds(this.lastShot, ix, iy)) {
      throw new Error(
        `(${ix}, ${iy}) is outside the last screenshot (${this.lastShot.imageWidth}x${this.lastShot.imageHeight}) — take a fresh screenshot`,
      );
    }
    return mapToScreen(this.lastShot, ix, iy);
  }

  /**
   * Move the OS cursor to absolute screen (x, y).
   *
   * The relay's hid.move_smooth / hid.move_to derive their delta from a cached
   * cursor position that goes stale and flings the pointer to a screen edge
   * (observed: target (800,500) landing at (0,0)). Relative counts map 1:1 to
   * pixels, so we read the REAL cursor, glide the residual in small relative
   * steps (human-like, not an instant jump), then read back and correct against
   * the true cursor. Converges to the exact pixel, usually in a single pass.
   */
  async moveTo(x: number, y: number): Promise<Point & { passes: number }> {
    let at = await this.client.systemMouse();
    let passes = 0;
    while (passes < MOVE_MAX_PASSES) {
      const dx = x - at.x;
      const dy = y - at.y;
      const distance = Math.hypot(dx, dy);
      if (distance <= CLICK_EPS_PX) break;
      passes++;
      const steps = Math.min(
        MOVE_MAX_STEPS,
        Math.max(1, Math.round(distance / MOVE_STEP_PX)),
      );
      let sentX = 0;
      let sentY = 0;
      for (let s = 1; s <= steps; s++) {
        const nx = Math.round((dx * s) / steps) - sentX;
        const ny = Math.round((dy * s) / steps) - sentY;
        sentX += nx;
        sentY += ny;
        this.client.hidMove(nx, ny);
        if (s < steps) await sleep(MOVE_STEP_MS);
      }
      await sleep(SETTLE_MS);
      at = await this.client.systemMouse();
    }
    return { x: at.x, y: at.y, passes };
  }

  /** move (self-correcting), then press. */
  async verifiedClick(
    x: number,
    y: number,
    button: MouseButton = "left",
    double = false,
  ): Promise<ClickResult> {
    const target = { x, y };
    const at = await this.moveTo(x, y);
    const code = BUTTON_CODE[button];
    this.client.hidPress(code, 30);
    if (double) {
      await sleep(80);
      this.client.hidPress(code, 30);
    }
    return {
      ok: dist(at, target) <= CLICK_EPS_PX,
      landed: { x: at.x, y: at.y },
      corrected: at.passes > 1,
    };
  }

  /**
   * relative-move scale probe. moves to screen center (deterministic anchor
   * away from edge clamp), nudges by increasing counts on each axis, and
   * checks whether counts-per-pixel is constant. a magnitude-dependent ratio
   * means ballistics in the chain (EPP on, DPI mismatch, software fallback) —
   * recorded and surfaced to the agent instead of failing via missed clicks.
   */
  async calibrate(): Promise<CalibrationResult> {
    const done = (r: CalibrationResult): CalibrationResult => {
      this.calibration = r;
      return r;
    };
    // 8 as the smallest probe: large enough to dodge integer quantization,
    // small enough that ballistic acceleration curves still diverge by 256.
    const probes = [8, 64, 256];
    const res = await this.client.screenResolution();
    const saved = await this.client.systemMouse();
    const cx = Math.floor(res.width / 2);
    const cy = Math.floor(res.height / 2);

    const ratios: number[] = [];
    try {
      for (const axis of ["x", "y"] as const) {
        for (const n of probes) {
          const before = await this.moveTo(cx, cy);
          this.client.hidMove(axis === "x" ? n : 0, axis === "y" ? n : 0);
          await sleep(SETTLE_MS);
          const after = await this.client.systemMouse();
          const moved = axis === "x" ? after.x - before.x : after.y - before.y;
          if (moved <= 0) {
            return done({
              calibrated: false,
              reason: `${axis}-axis probe of ${n} counts produced no movement`,
            });
          }
          ratios.push(n / moved);
        }
      }
    } finally {
      await this.moveTo(saved.x, saved.y);
    }

    const mean = ratios.reduce((a, b) => a + b, 0) / ratios.length;
    const maxDev = Math.max(...ratios.map((r) => Math.abs(r - mean) / mean));
    if (maxDev > 0.15) {
      return done({
        calibrated: false,
        reason: `counts-per-pixel varies with magnitude (±${Math.round(maxDev * 100)}%) — pointer ballistics in the chain (enhance pointer precision, DPI mismatch, or software fallback)`,
      });
    }
    return done({ calibrated: true, k: mean });
  }
}
