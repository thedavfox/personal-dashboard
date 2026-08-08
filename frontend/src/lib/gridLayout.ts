interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Places a new widget below the lowest existing one so it never overlaps
 * without the user having to drag it into place first. */
export function nextLayout(existing: Rect[], size: { w: number; h: number }): Rect {
  const bottom = existing.reduce((max, r) => Math.max(max, r.y + r.h), 0);
  return { x: 0, y: bottom, w: size.w, h: size.h };
}
