// pure image-space -> screen-space mapping for the last screenshot taken.
// the model only ever sees and emits coordinates in the pixel space of the
// screenshot in front of it; all mapping back to signed virtual-desktop
// screen coordinates lives here.

export interface ShotMapping {
  /** 1-based index of the captured display, for region re-captures (zoom). */
  displayIndex: number;
  /** signed virtual-desktop origin of the capture: the display's for a
   * full shot, the visible window's for a window shot. */
  originX: number;
  originY: number;
  /** signed virtual-desktop origin of the captured display. */
  displayX: number;
  displayY: number;
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

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** the part of a window its display shows, in screen coordinates: a window
 * capture is clamped to the display, so this is what the image holds. */
export function clipToDisplay(win: Rect, display: Rect): Rect {
  const x = Math.max(display.x, win.x);
  const y = Math.max(display.y, win.y);
  return {
    x,
    y,
    width: Math.min(win.x + win.width, display.x + display.width) - x,
    height: Math.min(win.y + win.height, display.y + display.height) - y,
  };
}

/** a rectangle of the last screenshot's image as a capture region, which is
 * relative to the display, not to the shot: a window shot starts inside it. */
export function regionOnDisplay(
  shot: ShotMapping,
  ix: number,
  iy: number,
  iw: number,
  ih: number,
): { x: number; y: number; w: number; h: number } {
  const topLeft = mapToScreen(shot, ix, iy);
  return {
    x: topLeft.x - shot.displayX,
    y: topLeft.y - shot.displayY,
    w: Math.ceil(iw / shot.scale),
    h: Math.ceil(ih / shot.scale),
  };
}
