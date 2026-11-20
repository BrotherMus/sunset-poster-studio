// Poster grids. Each layout is a tree of tilted cuts through the poster plus optional "floating" cards on top, given
// separately for wide (1920 x 1080), square (1080 x 1080) and tall (1080 x 1350) posters so it adapts to the size.
// A cut node is { cut: 'v' | 'h', at: [fractions], tilt: [degrees], kids: [...] }; a kid of 0 is a panel.
import { clipPolygonByHalfPlane, insetConvexPolygon, polygonBounds, rectPolygon, rotatedRectPolygon } from './geometry.js';

export const MAX_PANELS = 8;

const P = 0;

export const LAYOUTS = [
  {
    id: 'hero-stack',
    name: 'Hero + Stack',
    variants: {
      wide: { tree: { cut: 'v', at: [0.6], tilt: [10], kids: [P, { cut: 'h', at: [0.35, 0.67], tilt: [-9, 7], kids: [P, P, P] }] }, caption: { x: 0.31, y: 0.78, w: 0.56 } },
      square: { tree: { cut: 'v', at: [0.6], tilt: [9], kids: [P, { cut: 'h', at: [0.34, 0.66], tilt: [-9, 8], kids: [P, P, P] }] }, caption: { x: 0.34, y: 0.78, w: 0.62 } },
      tall: { tree: { cut: 'h', at: [0.6], tilt: [-8], kids: [P, { cut: 'v', at: [0.34, 0.67], tilt: [10, -9], kids: [P, P, P] }] }, caption: { x: 0.5, y: 0.57, w: 0.86 } },
    },
  },
  {
    id: 'tilted-six',
    name: 'Tilted Six',
    variants: {
      wide: { tree: { cut: 'h', at: [0.5], tilt: [-3], kids: [{ cut: 'v', at: [0.33, 0.66], tilt: [8, -6], kids: [P, P, P] }, { cut: 'v', at: [0.36, 0.7], tilt: [-7, 7], kids: [P, P, P] }] }, caption: { x: 0.5, y: 0.5, w: 0.52 } },
      square: { tree: { cut: 'h', at: [0.5], tilt: [-4], kids: [{ cut: 'v', at: [0.36, 0.68], tilt: [7, -6], kids: [P, P, P] }, { cut: 'v', at: [0.32, 0.64], tilt: [-6, 7], kids: [P, P, P] }] }, caption: { x: 0.5, y: 0.5, w: 0.74 } },
      tall: { tree: { cut: 'h', at: [0.34, 0.67], tilt: [-4, 4], kids: [{ cut: 'v', at: [0.55], tilt: [8], kids: [P, P] }, { cut: 'v', at: [0.45], tilt: [-9], kids: [P, P] }, { cut: 'v', at: [0.52], tilt: [7], kids: [P, P] }] }, caption: { x: 0.5, y: 0.5, w: 0.84 } },
    },
  },
  {
    id: 'cross-cut',
    name: 'Cross Cut',
    variants: {
      wide: { tree: { cut: 'h', at: [0.52], tilt: [-7], kids: [{ cut: 'v', at: [0.5], tilt: [14], kids: [P, P] }, { cut: 'v', at: [0.5], tilt: [14], kids: [P, P] }] }, floats: [{ cx: 0.5, cy: 0.47, w: 0.4, h: 0.5, rot: -5 }], caption: { x: 0.5, y: 0.84, w: 0.6 } },
      square: { tree: { cut: 'h', at: [0.5], tilt: [-8], kids: [{ cut: 'v', at: [0.5], tilt: [12], kids: [P, P] }, { cut: 'v', at: [0.5], tilt: [12], kids: [P, P] }] }, floats: [{ cx: 0.5, cy: 0.44, w: 0.42, h: 0.5, rot: -5 }], caption: { x: 0.5, y: 0.84, w: 0.82 } },
      tall: { tree: { cut: 'h', at: [0.5], tilt: [-9], kids: [{ cut: 'v', at: [0.5], tilt: [10], kids: [P, P] }, { cut: 'v', at: [0.5], tilt: [10], kids: [P, P] }] }, floats: [{ cx: 0.5, cy: 0.44, w: 0.52, h: 0.6, rot: -5 }], caption: { x: 0.5, y: 0.84, w: 0.86 } },
    },
  },
  {
    id: 'slash-triptych',
    name: 'Slash Triptych',
    variants: {
      wide: { tree: { cut: 'v', at: [0.34, 0.67], tilt: [13, 13], kids: [P, P, P] }, caption: { x: 0.5, y: 0.8, w: 0.6 } },
      square: { tree: { cut: 'v', at: [0.34, 0.67], tilt: [12, 12], kids: [P, P, P] }, caption: { x: 0.5, y: 0.8, w: 0.82 } },
      tall: { tree: { cut: 'h', at: [0.33, 0.64], tilt: [-9, -9], kids: [P, P, P] }, caption: { x: 0.5, y: 0.82, w: 0.86 } },
    },
  },
  {
    id: 'cover-wall',
    name: 'Cover Wall',
    variants: {
      wide: { tree: { cut: 'v', at: [0.24, 0.76], tilt: [6, -6], kids: [{ cut: 'h', at: [0.34, 0.67], tilt: [-6, 5], kids: [P, P, P] }, { cut: 'h', at: [0.66], tilt: [-4], kids: [P, P] }, { cut: 'h', at: [0.4, 0.72], tilt: [6, -5], kids: [P, P, P] }] }, caption: { x: 0.5, y: 0.8, w: 0.5 } },
      square: { tree: { cut: 'h', at: [0.27, 0.73], tilt: [-4, 4], kids: [{ cut: 'v', at: [0.34, 0.67], tilt: [8, -7], kids: [P, P, P] }, { cut: 'v', at: [0.6], tilt: [6], kids: [P, P] }, { cut: 'v', at: [0.33, 0.66], tilt: [-7, 8], kids: [P, P, P] }] }, caption: { x: 0.5, y: 0.66, w: 0.8 } },
      tall: { tree: { cut: 'h', at: [0.24, 0.74], tilt: [-4, 4], kids: [{ cut: 'v', at: [0.34, 0.67], tilt: [8, -7], kids: [P, P, P] }, { cut: 'v', at: [0.6], tilt: [5], kids: [P, P] }, { cut: 'v', at: [0.33, 0.66], tilt: [-7, 8], kids: [P, P, P] }] }, caption: { x: 0.5, y: 0.68, w: 0.86 } },
    },
  },
  {
    id: 'split-hero',
    name: 'Split Hero',
    variants: {
      wide: { tree: { cut: 'v', at: [0.5], tilt: [15], kids: [P, P] }, floats: [{ cx: 0.88, cy: 0.5, w: 0.3, h: 0.36, rot: 6 }, { cx: 0.12, cy: 0.48, w: 0.28, h: 0.34, rot: -6 }], caption: { x: 0.5, y: 0.82, w: 0.6 } },
      square: { tree: { cut: 'v', at: [0.5], tilt: [13], kids: [P, P] }, floats: [{ cx: 0.86, cy: 0.52, w: 0.3, h: 0.34, rot: 6 }, { cx: 0.14, cy: 0.5, w: 0.28, h: 0.32, rot: -6 }], caption: { x: 0.5, y: 0.82, w: 0.84 } },
      tall: { tree: { cut: 'h', at: [0.5], tilt: [-12], kids: [P, P] }, floats: [{ cx: 0.84, cy: 0.35, w: 0.32, h: 0.3, rot: 6 }, { cx: 0.16, cy: 0.66, w: 0.32, h: 0.3, rot: -6 }], caption: { x: 0.5, y: 0.86, w: 0.86 } },
    },
  },
];

/** Which shape of a layout suits a poster of this width and height. */
export function posterShape(width, height) {
  const aspect = width / height;
  if (aspect > 1.2) return 'wide';
  if (aspect < 0.9) return 'tall';
  return 'square';
}

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** How many panels a layout has (the same in every size, so photo assignments survive a size switch). */
export function countLayoutPanels(layout) {
  const v = layout.variants.wide;
  const count = (node) => (node === P ? 1 : node.kids.reduce((n, k) => n + count(k), 0));
  return count(v.tree) + (v.floats?.length ?? 0);
}

/** Cuts one node's polygon into its kids' polygons along tilted lines measured in the node's own box. */
function cutPolygon(poly, node) {
  const b = polygonBounds(poly);
  const pieces = [];
  const lines = node.at.map((at, i) => {
    const a = ((node.tilt?.[i] ?? 0) * Math.PI) / 180;
    if (node.cut === 'v') {
      return { point: { x: b.x + at * b.w, y: b.y + b.h / 2 }, normal: { x: Math.cos(a), y: -Math.sin(a) } };
    }
    return { point: { x: b.x + b.w / 2, y: b.y + at * b.h }, normal: { x: -Math.sin(a), y: Math.cos(a) } };
  });
  for (let i = 0; i <= lines.length; i++) {
    let piece = poly;
    if (i > 0) piece = clipPolygonByHalfPlane(piece, lines[i - 1].point, lines[i - 1].normal);
    if (i < lines.length) piece = clipPolygonByHalfPlane(piece, lines[i].point, { x: -lines[i].normal.x, y: -lines[i].normal.y });
    pieces.push(piece);
  }
  return pieces;
}

/**
 * Lays a layout out on a width x height poster with `gutter` pixels of border between panels. `insets` keeps bands
 * free along the top and bottom (for the press strip and the credits): the grid, its floating cards and the caption
 * spot all fit into the area between. Returns the panels in order (grid panels first, then floating cards) with their
 * inset polygon and box, where the caption goes, and the panel area.
 */
export function buildLayout(layoutId, width, height, gutter, insets = { top: 0, bottom: 0 }) {
  const layout = findLayout(layoutId);
  const variant = layout.variants[posterShape(width, height)];
  const top = insets.top ?? 0;
  const areaH = height - top - (insets.bottom ?? 0);
  const squeeze = areaH / height;
  const panels = [];
  const walk = (poly, node) => {
    if (node === P) {
      const inset = insetConvexPolygon(poly, gutter / 2);
      const bounds = polygonBounds(inset.length ? inset : poly);
      const frame = { cx: bounds.x + bounds.w / 2, cy: bounds.y + bounds.h / 2, w: bounds.w, h: bounds.h, rot: 0 };
      panels.push({ index: panels.length, poly: inset, bounds, frame, floating: false });
      return;
    }
    cutPolygon(poly, node).forEach((piece, i) => walk(piece, node.kids[i]));
  };
  walk(rectPolygon(gutter / 2, top + gutter / 2, width - gutter, areaH - gutter), variant.tree);
  const unit = Math.min(width, height);
  for (const f of variant.floats ?? []) {
    // A floating card's photo turns with the card, so its frame is the card itself rather than its bounding box.
    const frame = { cx: f.cx * width, cy: top + f.cy * areaH, w: f.w * unit * (width > height ? 1.15 : 1) * squeeze, h: f.h * unit * squeeze, rot: f.rot };
    const poly = rotatedRectPolygon(frame.cx, frame.cy, frame.w, frame.h, frame.rot);
    panels.push({ index: panels.length, poly, bounds: polygonBounds(poly), frame, floating: true });
  }
  const caption = { ...variant.caption, y: (top + variant.caption.y * areaH) / height };
  return { layout, shape: posterShape(width, height), panels, caption, area: { top, bottom: top + areaH } };
}
