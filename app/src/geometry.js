// Polygon helpers for the poster panels: every panel is a convex polygon (an array of [x, y] points in poster pixels).
// Layouts cut the poster with slanted lines (clipPolygonToHalfPlane), then shrink each piece to open the thick
// borders between panels (insetConvexPolygon).

/** Signed area of a polygon: positive when its points run clockwise on screen (y pointing down). */
export function polygonArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

/** The axis-aligned box around a polygon: { x, y, w, h }. */
export function polygonBounds(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** The centre of mass of a polygon's points (good enough for labels and sorting). */
export function polygonCentre(poly) {
  let x = 0, y = 0;
  for (const p of poly) { x += p[0]; y += p[1]; }
  return [x / poly.length, y / poly.length];
}

/** A rectangle as a polygon, clockwise from the top-left corner. */
export function rectPolygon(x, y, w, h) {
  return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
}

/** A w x h rectangle centred on (cx, cy), turned by `angle` radians: the tilted cards. */
export function rotatedRectPolygon(cx, cy, w, h, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [
    cx + x * c - y * s,
    cy + x * s + y * c,
  ]);
}

/**
 * Keeps the part of a convex polygon on one side of the line through `a` and `b`: the left side when `keepLeft`
 * (cross product of b - a and p - a not negative), else the right. Sutherland-Hodgman against one edge.
 */
export function clipPolygonToHalfPlane(poly, a, b, keepLeft) {
  const side = (p) => {
    const v = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
    return keepLeft ? v : -v;
  };
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const sp = side(p), sq = side(q);
    if (sp >= 0) out.push(p);
    if ((sp >= 0) !== (sq >= 0)) {
      const t = sp / (sp - sq);
      out.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
    }
  }
  return out;
}

/** Drops points that sit on top of their neighbour, which would break the inset maths. */
export function removeDuplicatePoints(poly, epsilon = 0.5) {
  const out = [];
  for (const p of poly) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p[0] - last[0], p[1] - last[1]) > epsilon) out.push(p);
  }
  while (out.length > 1) {
    const first = out[0], last = out[out.length - 1];
    if (Math.hypot(first[0] - last[0], first[1] - last[1]) > epsilon) break;
    out.pop();
  }
  return out;
}

/** Moves every edge of a convex polygon inwards by `d` pixels and returns the smaller polygon (or [] if it vanishes). */
export function insetConvexPolygon(poly, d) {
  const pts = removeDuplicatePoints(poly);
  if (pts.length < 3 || d <= 0) return pts;
  const clockwise = polygonArea(pts) > 0;
  const lines = pts.map((p, i) => {
    const q = pts[(i + 1) % pts.length];
    const dx = q[0] - p[0], dy = q[1] - p[1];
    const len = Math.hypot(dx, dy) || 1;
    // Inward normal: to the right of the edge for a clockwise (screen) polygon.
    const nx = (clockwise ? -dy : dy) / len;
    const ny = (clockwise ? dx : -dx) / len;
    return { p: [p[0] + nx * d, p[1] + ny * d], dir: [dx, dy] };
  });
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l1 = lines[(i - 1 + lines.length) % lines.length];
    const l2 = lines[i];
    const hit = intersectLines(l1.p, l1.dir, l2.p, l2.dir);
    out.push(hit ?? l2.p);
  }
  // A polygon inset past its own width flips over: its area changes sign.
  if (polygonArea(out) * polygonArea(pts) <= 0) return [];
  return out;
}

/** Where the line through p1 along d1 meets the line through p2 along d2, or null when they are parallel. */
export function intersectLines(p1, d1, p2, d2) {
  const den = d1[0] * d2[1] - d1[1] * d2[0];
  if (Math.abs(den) < 1e-9) return null;
  const t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den;
  return [p1[0] + d1[0] * t, p1[1] + d1[1] * t];
}

/** True when (x, y) lies inside the polygon (even-odd rule). */
export function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Adds the polygon as a closed path on a 2D context (no fill or stroke). */
export function tracePolygon(ctx, poly) {
  ctx.beginPath();
  poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}
