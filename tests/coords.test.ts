import { describe, expect, test } from "bun:test";
import {
  clipToDisplay,
  inImageBounds,
  mapToImage,
  mapToScreen,
  regionOnDisplay,
  type ShotMapping,
} from "../src/coords.ts";

const shot: ShotMapping = {
  displayIndex: 2,
  originX: -1920,
  originY: 0,
  displayX: -1920,
  displayY: 0,
  scale: 0.5,
  imageWidth: 960,
  imageHeight: 540,
};

describe("mapToScreen", () => {
  test("round-trips image coords through scale and signed origin", () => {
    expect(mapToScreen(shot, 0, 0)).toEqual({ x: -1920, y: 0 });
    expect(mapToScreen(shot, 960, 540)).toEqual({ x: 0, y: 1080 });
    expect(mapToScreen(shot, 480, 270)).toEqual({ x: -960, y: 540 });
  });

  test("identity at scale 1 and zero origin", () => {
    const flat: ShotMapping = { ...shot, originX: 0, scale: 1 };
    expect(mapToScreen(flat, 123, 456)).toEqual({ x: 123, y: 456 });
  });
});

describe("mapToImage", () => {
  test("inverts mapToScreen", () => {
    expect(mapToImage(shot, -1920, 0)).toEqual({ x: 0, y: 0 });
    expect(mapToImage(shot, -960, 540)).toEqual({ x: 480, y: 270 });
    expect(mapToImage(shot, 0, 1080)).toEqual({ x: 960, y: 540 });
  });
});

describe("inImageBounds", () => {
  test("accepts interior, rejects edges past the end", () => {
    expect(inImageBounds(shot, 0, 0)).toBe(true);
    expect(inImageBounds(shot, 959, 539)).toBe(true);
    expect(inImageBounds(shot, 960, 539)).toBe(false);
    expect(inImageBounds(shot, -1, 0)).toBe(false);
  });
});

describe("regionOnDisplay", () => {
  // a 1512x890 window at (0, 33), shown as a 1280-wide image
  const win: ShotMapping = {
    displayIndex: 1,
    originX: 0,
    originY: 33,
    displayX: 0,
    displayY: 0,
    scale: 1280 / 1512,
    imageWidth: 1280,
    imageHeight: 753,
  };

  test("a window shot's region starts at the window, not the display's top", () => {
    expect(regionOnDisplay(win, 0, 0, 300, 56)).toEqual({
      x: 0,
      y: 33,
      w: 355,
      h: 67,
    });
  });

  test("is relative to the window's own display", () => {
    const second: ShotMapping = {
      ...win,
      displayIndex: 2,
      originX: 2000,
      originY: 100,
      displayX: 1920,
      displayY: 0,
      scale: 1,
    };
    expect(regionOnDisplay(second, 0, 0, 50, 40)).toEqual({
      x: 80,
      y: 100,
      w: 50,
      h: 40,
    });
    const left: ShotMapping = {
      ...second,
      originX: -1800,
      originY: 40,
      displayX: -1920,
      scale: 0.5,
    };
    expect(regionOnDisplay(left, 10, 20, 50, 40)).toEqual({
      x: 140,
      y: 80,
      w: 100,
      h: 80,
    });
  });

  test("a full-display shot keeps the region it always had", () => {
    expect(regionOnDisplay(shot, 480, 270, 100, 50)).toEqual({
      x: 960,
      y: 540,
      w: 200,
      h: 100,
    });
  });
});

describe("clipToDisplay", () => {
  const display = { x: 0, y: 0, width: 1512, height: 982 };

  test("a window inside its display is whole", () => {
    expect(
      clipToDisplay({ x: 0, y: 33, width: 1512, height: 890 }, display),
    ).toEqual({ x: 0, y: 33, width: 1512, height: 890 });
  });

  test("a window past the left and top loses what hangs off", () => {
    expect(
      clipToDisplay({ x: -200, y: -50, width: 800, height: 600 }, display),
    ).toEqual({ x: 0, y: 0, width: 600, height: 550 });
  });

  test("a window past the right and bottom loses what hangs off", () => {
    expect(
      clipToDisplay({ x: 1200, y: 700, width: 800, height: 600 }, display),
    ).toEqual({ x: 1200, y: 700, width: 312, height: 282 });
  });

  test("on a display at a negative origin", () => {
    expect(
      clipToDisplay(
        { x: -2000, y: 40, width: 500, height: 300 },
        { x: -1920, y: 0, width: 1920, height: 1080 },
      ),
    ).toEqual({ x: -1920, y: 40, width: 420, height: 300 });
  });
});
