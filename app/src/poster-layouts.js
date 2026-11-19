// Multi-panel poster layouts. Most are a tree of tilted cuts: each cut splits a convex polygon in two along a line
// leaning a few degrees off the vertical or horizontal, so the tiles always meet edge to edge whatever the poster
// size, and the thick borders are drawn along those cuts. Each layout has its own tree for landscape, portrait and
// square posters, plus a default spot for the caption.

const PHOTO = { kind: 'photo' };
const TITLE = { kind: 'title' };

/** A cut across x (a leaning vertical line) at `at` of the polygon's width, `tilt` degrees off vertical. */
function cutAcross(at, tilt, left, right) {
  return { axis: 'x', at, tilt, children: [left, right] };
}

/** A cut down y (a leaning horizontal line) at `at` of the polygon's height, `tilt` degrees off horizontal. */
function cutDown(at, tilt, top, bottom) {
  return { axis: 'y', at, tilt, children: [top, bottom] };
}

const P = PHOTO;
const T = TITLE;

export const POSTER_LAYOUTS = [
  {
    id: 'hero-four',
    name: 'Hero + Four',
    trees: {
      landscape: cutAcross(0.5, 6, P, cutDown(0.5, -5, cutAcross(0.47, -7, P, P), cutAcross(0.53, 6, P, P))),
      portrait: cutDown(0.52, -5, P, cutAcross(0.5, 6, cutDown(0.5, -6, P, P), cutDown(0.5, 5, P, P))),
      square: cutAcross(0.56, 5, P, cutDown(0.36, -6, P, cutDown(0.52, 5, P, P))),
    },
    caption: { landscape: [0.5, 0.84, 0.86], portrait: [0.5, 0.86, 0.9], square: [0.5, 0.85, 0.9] },
  },
  {
    id: 'title-mosaic',
    name: 'Title Mosaic',
    trees: {
      landscape: cutAcross(0.46, 4, cutDown(0.57, -4, P, T),
        cutAcross(0.5, -5, cutDown(0.38, 5, P, cutDown(0.5, -4, P, P)), cutDown(0.55, 4, P, P))),
      portrait: cutDown(0.6, -4, cutAcross(0.58, 5, P, cutDown(0.5, -6, P, P)),
        cutDown(0.56, 5, T, cutAcross(0.5, -6, P, P))),
      square: cutAcross(0.52, 5, cutDown(0.6, -5, P, T), cutDown(0.5, 4, cutAcross(0.5, -6, P, P), P)),
    },
    caption: 'title',
  },
  {
    id: 'shattered-six',
    name: 'Shattered Six',
    trees: {
      landscape: cutAcross(0.34, 9, cutDown(0.56, -7, P, P),
        cutAcross(0.52, -8, cutDown(0.4, 6, P, P), cutDown(0.58, -6, P, P))),
      portrait: cutDown(0.34, -7, cutAcross(0.56, 9, P, P),
        cutDown(0.52, 6, cutAcross(0.4, -8, P, P), cutAcross(0.58, 7, P, P))),
      square: cutAcross(0.4, 8, cutDown(0.5, -7, P, P), cutDown(0.5, 6, cutAcross(0.5, -9, P, P), cutAcross(0.45, 8, P, P))),
    },
    caption: { landscape: [0.5, 0.5, 0.8], portrait: [0.5, 0.52, 0.92], square: [0.5, 0.5, 0.9] },
  },
  {
    id: 'slash-triptych',
    name: 'Slash Triptych',
    trees: {
      landscape: cutAcross(0.35, 14, P, cutAcross(0.5, 14, P, P)),
      portrait: cutDown(0.36, -10, P, cutDown(0.5, -10, P, P)),
      square: cutAcross(0.36, 12, P, cutAcross(0.5, 12, P, P)),
    },
    caption: { landscape: [0.5, 0.82, 0.8], portrait: [0.5, 0.86, 0.9], square: [0.5, 0.84, 0.88] },
  },
  {
    id: 'horizon-strip',
    name: 'Horizon Strip',
    trees: {
      landscape: cutDown(0.64, -3, P, cutAcross(0.33, 10, P, cutAcross(0.5, 10, P, P))),
      portrait: cutDown(0.6, -4, P, cutAcross(0.33, 9, P, cutAcross(0.5, 9, P, P))),
      square: cutDown(0.62, -4, P, cutAcross(0.33, 9, P, cutAcross(0.5, 9, P, P))),
    },
    caption: { landscape: [0.5, 0.5, 0.8], portrait: [0.5, 0.48, 0.92], square: [0.5, 0.5, 0.9] },
  },
  {
    id: 'twin-slash',
    name: 'Twin Slash',
    trees: {
      landscape: cutDown(0.71, -3, cutAcross(0.5, 16, P, P), T),
      portrait: cutDown(0.73, -3, cutDown(0.5, -12, P, P), T),
      square: cutDown(0.69, -3, cutAcross(0.5, 14, P, P), T),
    },
    caption: 'title',
  },
  {
    id: 'postcard-stack',
    name: 'Postcard Stack',
    cards: {
      landscape: [[0.62, 0.3, -7], [0.86, 0.4, 6], [0.72, 0.72, 4]],
      portrait: [[0.27, 0.25, -8], [0.73, 0.27, 7], [0.5, 0.5, -3]],
      square: [[0.25, 0.27, -8], [0.75, 0.26, 7], [0.5, 0.5, -3]],
    },
    caption: { landscape: [0.28, 0.72, 0.5], portrait: [0.5, 0.82, 0.9], square: [0.5, 0.82, 0.9] },
  },
];

/** The layout with this id, or the first one. */
export function findLayout(id) {
  return POSTER_LAYOUTS.find((layout) => layout.id === id) ?? POSTER_LAYOUTS[0];
}

/** 'landscape', 'portrait' or 'square' for a poster of this width and height. */
export function orientationOf(width, height) {
  const ratio = width / height;
  if (ratio > 1.25) return 'landscape';
  if (ratio < 0.9) return 'portrait';
  return 'square';
}

/**
 * Lays a layout out on a width x height poster. Returns the panels in drawing order, each with its polygon
 * ([x, y] points), its bounding box, its kind ('photo' or 'title'), the photo slot it shows (photo panels are
 * numbered 0, 1, 2... in order), and for cards a `card` flag; plus the caption anchor {x, y, maxWidth}.
 */
export function layoutPoster(layoutId, width, height) {
  const layout = findLayout(layoutId);
  const orientation = orientationOf(width, height);
  const panels = [];
  if (layout.trees) {
    const frame = [[0, 0], [width, 0], [width, height], [0, height]];
    splitPolygonByTree(frame, layout.trees[orientation], panels);
  } else {
    panels.push({ kind: 'photo', polygon: [[0, 0], [width, 0], [width, height], [0, height]] });
    const short = Math.min(width, height);
    for (const [cx, cy, degrees] of layout.cards[orientation]) {
      panels.push({ kind: 'photo', card: true, polygon: rotatedRectangle(cx * width, cy * height, short * 0.4, short * 0.48, degrees) });
    }
  }
  let slot = 0;
  for (const panel of panels) {
    panel.bounds = polygonBounds(panel.polygon);
    if (panel.kind === 'photo') panel.slot = slot++;
  }
  return { layout, orientation, panels, caption: captionAnchor(layout, orientation, panels, width, height) };
}

/** Where the caption goes: the title tile's centre, or the layout's spot as fractions of the poster. */
function captionAnchor(layout, orientation, panels, width, height) {
  const titlePanel = panels.find((panel) => panel.kind === 'title');
  if (layout.caption === 'title' && titlePanel) {
    const centre = polygonCentroid(titlePanel.polygon);
    const b = titlePanel.bounds;
    return { x: centre[0], y: centre[1], maxWidth: b.w * 0.88, maxHeight: b.h * 0.92, inTile: true };
  }
  const [fx, fy, fw] = layout.caption[orientation];
  return { x: fx * width, y: fy * height, maxWidth: fw * width, maxHeight: height * 0.36, inTile: false };
}

/** Walks a cut tree, splitting `polygon` at each cut and collecting the leaves as panels. */
function splitPolygonByTree(polygon, node, panels) {
  if (!node.axis) {
    panels.push({ kind: node.kind, polygon });
    return;
  }
  const b = polygonBounds(polygon);
  const radians = (node.tilt * Math.PI) / 180;
  let point;
  let direction;
  if (node.axis === 'x') {
    point = [b.x + b.w * node.at, b.y + b.h / 2];
    direction = [Math.sin(radians), Math.cos(radians)];
  } else {
    point = [b.x + b.w / 2, b.y + b.h * node.at];
    direction = [Math.cos(radians), Math.sin(radians)];
  }
  // For an x cut the left side has a positive cross product; for a y cut the top side has a negative one.
  const firstSign = node.axis === 'x' ? 1 : -1;
  splitPolygonByTree(clipToHalfPlane(polygon, point, direction, firstSign), node.children[0], panels);
  splitPolygonByTree(clipToHalfPlane(polygon, point, direction, -firstSign), node.children[1], panels);
}

/** Keeps the part of a convex polygon on one side of the line through `point` along `direction` (Sutherland-Hodgman). */
export function clipToHalfPlane(polygon, point, direction, sign) {
  const side = ([x, y]) => sign * (direction[0] * (y - point[1]) - direction[1] * (x - point[0]));
  const kept = [];
  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];
    const sc = side(current);
    const sn = side(next);
    if (sc >= 0) kept.push(current);
    if ((sc >= 0) !== (sn >= 0)) {
      const t = sc / (sc - sn);
      kept.push([current[0] + (next[0] - current[0]) * t, current[1] + (next[1] - current[1]) * t]);
    }
  }
  return kept;
}

/** The four corners of a w x h rectangle centred on (cx, cy), turned `degrees`. */
export function rotatedRectangle(cx, cy, w, h, degrees) {
  const r = (degrees * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]].map(([x, y]) => [cx + x * cos - y * sin, cy + x * sin + y * cos]);
}

/** {x, y, w, h} around a polygon. */
export function polygonBounds(polygon) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of polygon) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** The area-weighted centre of a polygon. */
export function polygonCentroid(polygon) {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < polygon.length; i++) {
    const [x0, y0] = polygon[i];
    const [x1, y1] = polygon[(i + 1) % polygon.length];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    cx += (x0 + x1) * cross;
    cy += (y0 + y1) * cross;
  }
  if (Math.abs(area) < 1e-6) return polygon[0];
  return [cx / (3 * area), cy / (3 * area)];
}

/** True when (x, y) lies inside the polygon (even-odd rule). */
export function pointInPolygon(x, y, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Traces a polygon as the context's current path. */
export function tracePolygon(ctx, polygon) {
  ctx.beginPath();
  polygon.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
}

/** How many photo panels a layout has at a given size. */
export function photoPanelCount(layoutId, width, height) {
  return layoutPoster(layoutId, width, height).panels.filter((panel) => panel.kind === 'photo').length;
}
