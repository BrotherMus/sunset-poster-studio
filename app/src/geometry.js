// Polygon helpers for the poster grid: every panel is a convex polygon, cut from the poster by tilted lines and then
// shrunk so thick borders show between the panels. Points are {x, y} in poster pixels (y grows downwards).

/** Signed area of a polygon: positive when its points run clockwise on screen. */
export function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** Keeps the part of a convex polygon where dot(v - point, normal) >= 0 (Sutherland-Hodgman against one line). */
export function clipPolygonByHalfPlane(poly, point, normal) {
  const out = [];
  const side = (v) => (v.x - point.x) * normal.x + (v.y - point.y) * normal.y;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const sa = side(a);
    const sb = side(b);
    if (sa >= 0) out.push(a);
    if ((sa >= 0) !== (sb >= 0)) {
      const t = sa / (sa - sb);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return out;
}

/** The axis-aligned box around a polygon. */
export function polygonBounds(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of poly) {
    if (p.x < x0) x0 = p.x;
    if (p.y < y0) y0 = p.y;
    if (p.x > x1) x1 = p.x;
    if (p.y > y1) y1 = p.y;
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/** Moves every edge of a convex polygon inwards by `distance`, so neighbouring panels leave a gutter between them. */
export function insetConvexPolygon(poly, distance) {
  if (poly.length < 3 || distance <= 0) return poly.slice();
  const clockwise = signedArea(poly) > 0;
  const lines = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    if (len < 1e-6) continue;
    // Inward normal of edge a->b: for clockwise-on-screen polygons it is (-dy, dx).
    let nx = -(b.y - a.y) / len;
    let ny = (b.x - a.x) / len;
    if (!clockwise) { nx = -nx; ny = -ny; }
    lines.push({ p: { x: a.x + nx * distance, y: a.y + ny * distance }, d: { x: (b.x - a.x) / len, y: (b.y - a.y) / len } });
  }
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const l1 = lines[(i + lines.length - 1) % lines.length];
    const l2 = lines[i];
    const hit = intersectLines(l1.p, l1.d, l2.p, l2.d);
    if (hit) out.push(hit);
  }
  // A panel too thin for its gutter collapses: keep it out of the grid rather than drawing a twisted shape.
  return signedArea(out) * signedArea(poly) > 0 ? out : [];
}

/** Where two infinite lines meet, or null when they are parallel. */
export function intersectLines(p1, d1, p2, d2) {
  const den = d1.x * d2.y - d1.y * d2.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
  return { x: p1.x + d1.x * t, y: p1.y + d1.y * t };
}

/** Even-odd point-in-polygon test, used to find which panel the pointer is over. */
export function pointInPolygon(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if ((a.y > pt.y) !== (b.y > pt.y) && pt.x < ((b.x - a.x) * (pt.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/** A rectangle as a clockwise polygon. */
export function rectPolygon(x, y, w, h) {
  return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
}

/** A rectangle of size w x h centred on (cx, cy) and turned by `degrees`. */
export function rotatedRectPolygon(cx, cy, w, h, degrees) {
  const r = (degrees * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => ({
    x: cx + x * c - y * s,
    y: cy + x * s + y * c,
  }));
}

/** How many device pixels one unit of the context's current transform covers. Canvas shadow blurs ignore the
 * transform, so blurs given in poster pixels are multiplied by this to look the same in the preview and the PNG. */
export function deviceScale(ctx) {
  const t = ctx.getTransform();
  return Math.hypot(t.a, t.b) || 1;
}

/** Traces a polygon as the current canvas path. */
export function tracePolygon(ctx, poly) {
  ctx.beginPath();
  poly.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
  ctx.closePath();
}
