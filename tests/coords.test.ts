import { describe, expect, test } from "bun:test";
import {
  inImageBounds,
  mapToImage,
  mapToScreen,
  type ShotMapping,
} from "../src/coords.ts";

const shot: ShotMapping = {
  displayIndex: 2,
  originX: -1920,
  originY: 0,
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
