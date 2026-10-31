import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { renderScreenshot } from "../src/image.ts";

/** solid-red PNG standing in for a native capture frame. */
async function redPng(w: number, h: number): Promise<Buffer> {
  return sharp({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  })
    .png()
    .toBuffer();
}

describe("renderScreenshot", () => {
  test("downscales to maxEdge and records image-px-per-screen-point", async () => {
    // retina-style: 800x400 physical for a 400x200 logical area
    const shot = await renderScreenshot({
      png: await redPng(800, 400),
      logicalWidth: 400,
      logicalHeight: 200,
      maxEdge: 200,
    });
    expect(shot.width).toBe(200);
    expect(shot.height).toBe(100);
    expect(shot.scale).toBeCloseTo(0.5);
    const meta = await sharp(shot.data).metadata();
    expect(meta.format).toBe("webp");
    expect(meta.width).toBe(200);
  });

  test("keeps native size when under maxEdge", async () => {
    const shot = await renderScreenshot({
      png: await redPng(300, 100),
      logicalWidth: 300,
      logicalHeight: 100,
      maxEdge: 1280,
    });
    expect(shot.width).toBe(300);
    expect(shot.scale).toBeCloseTo(1);
  });

  test("draws the cursor crosshair at the scaled position", async () => {
    const shot = await renderScreenshot({
      png: await redPng(400, 200),
      logicalWidth: 400,
      logicalHeight: 200,
      cursor: { x: 200, y: 100 },
      maxEdge: 200, // scale 0.5 -> marker centered at image (100, 50)
    });
    const raw = await sharp(shot.data)
      .raw()
      .toBuffer({ resolveWithObject: true });
    const px = (x: number, y: number) => {
      const i = (y * raw.info.width + x) * raw.info.channels;
      return [raw.data[i], raw.data[i + 1], raw.data[i + 2]] as const;
    };
    const white = (x: number, y: number) => {
      const [, g, b] = px(x, y);
      return (g ?? 0) > 180 && (b ?? 0) > 180;
    };
    // the red inner lines cross at the centre
    const [rc, gc] = px(100, 50);
    expect(rc).toBeGreaterThan(180);
    expect(gc).toBeLessThan(60);
    // the white outline flanks both arms, off the red line
    for (const [x, y] of [
      [98, 44],
      [98, 56],
      [94, 48],
      [106, 48],
    ] as const)
      expect(white(x, y)).toBe(true);
    // just past the 25px marker the background is plain red again
    for (const [x, y] of [
      [114, 50],
      [100, 64],
    ] as const) {
      const [r, g] = px(x, y);
      expect(r).toBeGreaterThan(200);
      expect(g).toBeLessThan(50);
    }
    // far corner stays pure red
    const [r2, g2, b2] = px(10, 10);
    expect(r2).toBeGreaterThan(200);
    expect(g2).toBeLessThan(50);
    expect(b2).toBeLessThan(50);
  });

  test("skips the marker when the cursor is outside the captured area", async () => {
    const shot = await renderScreenshot({
      png: await redPng(100, 100),
      logicalWidth: 100,
      logicalHeight: 100,
      cursor: { x: 500, y: 500 },
    });
    const raw = await sharp(shot.data)
      .raw()
      .toBuffer({ resolveWithObject: true });
    // every sampled pixel stays red
    for (const [x, y] of [
      [0, 0],
      [50, 50],
      [99, 99],
    ] as const) {
      const i = (y * raw.info.width + x) * raw.info.channels;
      expect(raw.data[i]).toBeGreaterThan(200);
      expect(raw.data[i + 1]).toBeLessThan(50);
    }
  });
});
