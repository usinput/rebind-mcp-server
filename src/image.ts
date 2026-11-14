// the model-facing image pipeline: decode the native-resolution PNG from
// Screen.Capture, downscale to the vision sweet spot, draw the cursor
// crosshair in image space, and encode webp for the MCP image block.

import sharp from "sharp";

/** long-edge target. XGA-ish is the vision-accuracy sweet spot and keeps the
 * payload small; raise only when small text must be read (use zoom instead). */
export const DEFAULT_MAX_EDGE = 1280;

/** odd so the center lands on a pixel. */
const CROSSHAIR_SIZE = 25;

export interface RenderedShot {
  /** webp bytes for the MCP image content block. */
  data: Buffer;
  width: number;
  height: number;
  /** image pixels per screen point of the captured area. */
  scale: number;
}

function crosshairSvg(): Buffer {
  const s = CROSSHAIR_SIZE;
  const c = (s - 1) / 2;
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}">` +
      `<line x1="${c}" y1="0" x2="${c}" y2="${s}" stroke="white" stroke-width="5"/>` +
      `<line x1="0" y1="${c}" x2="${s}" y2="${c}" stroke="white" stroke-width="5"/>` +
      `<line x1="${c}" y1="0" x2="${c}" y2="${s}" stroke="red" stroke-width="2"/>` +
      `<line x1="0" y1="${c}" x2="${s}" y2="${c}" stroke="red" stroke-width="2"/>` +
      `</svg>`,
  );
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(Math.max(v, lo), Math.max(lo, hi));

export async function renderScreenshot(opts: {
  /** native-resolution lossless PNG from Screen.Capture. */
  png: Buffer;
  /** logical size of the captured area in screen points. */
  logicalWidth: number;
  logicalHeight: number;
  /** cursor relative to the captured area, in screen points; omit to skip the marker. */
  cursor?: { x: number; y: number };
  maxEdge?: number;
}): Promise<RenderedShot> {
  const maxEdge = opts.maxEdge ?? DEFAULT_MAX_EDGE;
  const meta = await sharp(opts.png).metadata();
  const nativeW = meta.width;
  const nativeH = meta.height;
  if (!nativeW || !nativeH) throw new Error("could not decode capture PNG");

  let outW = nativeW;
  let outH = nativeH;
  const long = Math.max(nativeW, nativeH);
  let img = sharp(opts.png);
  if (long > maxEdge) {
    const f = maxEdge / long;
    outW = Math.max(1, Math.round(nativeW * f));
    outH = Math.max(1, Math.round(nativeH * f));
    img = img.resize(outW, outH);
  }
  const scale = outW / opts.logicalWidth;

  if (opts.cursor) {
    const px = Math.round(opts.cursor.x * scale);
    const py = Math.round(opts.cursor.y * scale);
    // skip the marker when the cursor sits outside the captured area
    if (px >= 0 && px < outW && py >= 0 && py < outH) {
      const half = (CROSSHAIR_SIZE - 1) / 2;
      img = img.composite([
        {
          input: crosshairSvg(),
          left: clamp(px - half, 0, outW - CROSSHAIR_SIZE),
          top: clamp(py - half, 0, outH - CROSSHAIR_SIZE),
        },
      ]);
    }
  }

  const data = await img.webp({ quality: 80 }).toBuffer();
  return { data, width: outW, height: outH, scale };
}
