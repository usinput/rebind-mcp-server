// pure image-space -> screen-space mapping for the last screenshot taken.
// the model only ever sees and emits coordinates in the pixel space of the
// screenshot in front of it; all mapping back to signed virtual-desktop
// screen coordinates lives here.

export interface ShotMapping {
  /** 1-based index of the captured display, for region re-captures (zoom). */
  displayIndex: number;
  /** signed virtual-desktop origin of the captured display. */
  originX: number;
  originY: number;
  /** image pixels per screen point (capture scale x resize factor). */
  scale: number;
  /** dims of the image the model saw, for bounds checking. */
  imageWidth: number;
  imageHeight: number;
}

export interface Point {
  x: number;
  y: number;
}

export function mapToScreen(shot: ShotMapping, ix: number, iy: number): Point {
  return {
    x: Math.round(shot.originX + ix / shot.scale),
    y: Math.round(shot.originY + iy / shot.scale),
  };
}

export function mapToImage(shot: ShotMapping, sx: number, sy: number): Point {
  return {
    x: Math.round((sx - shot.originX) * shot.scale),
    y: Math.round((sy - shot.originY) * shot.scale),
  };
}

export function inImageBounds(
  shot: ShotMapping,
  ix: number,
  iy: number,
): boolean {
  return ix >= 0 && ix < shot.imageWidth && iy >= 0 && iy < shot.imageHeight;
}
