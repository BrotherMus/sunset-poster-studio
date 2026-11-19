// The poster layouts. Each one is a guillotine tree of slanted cuts (cols / rows below) chosen per aspect ratio, so
// one layout adapts to 1080 x 1080, 1080 x 1350 and 1920 x 1080: buildLayout cuts the poster into convex panels,
// then insets each by half the border so thick ink borders open between them, and says where the caption sits.
import {
  clipPolygonToHalfPlane,
  insetConvexPolygon,
  polygonBounds,
  rectPolygon,
  rotatedRectPolygon,
} from './geometry.js';

const hero = { leaf: true, hero: true };
const tile = { leaf: true };

/** Columns side by side, widths in proportion to `weights`; `skew` leans each cut (a number or one per cut). */
function cols(weights, children, skew = 0) {
  return { dir: 'cols', weights, children, skew };
}

/** Rows stacked top to bottom, heights in proportion to `weights`; `skew` tilts each cut. */
function rows(weights, children, skew = 0) {
  return { dir: 'rows', weights, children, skew };
}

const repeat = (n, node) => Array.from({ length: n }, () => node);

/**
 * Every layout: a name for the picker and, for each aspect class, its cut tree and caption spot. A caption spot is
 * the centre of the title block (x, y as fractions of the poster), its widest line (maxW) and its type size (size,
 * a fraction of the poster's short side).
 */
export const LAYOUTS = [
  {
    id: 'hero-tiles',
    name: 'Hero + Tiles',
    wide: {
      tree: cols([0.63, 0.37], [hero, rows([1, 1, 1], repeat(3, tile), [0.05, -0.05])], 0.16),
      caption: { x: 0.31, y: 0.8, maxW: 0.56, size: 0.15 },
    },
    square: {
      tree: rows([0.64, 0.36], [hero, cols([1, 1, 1], repeat(3, tile), [0.16, 0.16])], -0.06),
      caption: { x: 0.5, y: 0.53, maxW: 0.86, size: 0.15 },
    },
    tall: {
      tree: rows([0.6, 0.4], [hero, cols([1.1, 1], [rows([1, 1], repeat(2, tile), 0.08), tile], 0.12)], -0.07),
      caption: { x: 0.5, y: 0.45, maxW: 0.88, size: 0.16 },
    },
  },
  {
    id: 'skew-grid',
    name: 'Skewed Six',
    wide: {
      tree: rows([1, 1], [cols([1, 1.25, 1], repeat(3, tile), 0.2), cols([1.15, 1, 1], repeat(3, tile), -0.2)], -0.04),
      caption: { x: 0.5, y: 0.5, maxW: 0.8, size: 0.16 },
    },
    square: {
      tree: rows([1, 1, 1], [cols([1, 1.2], [tile, hero], 0.14), cols([1.2, 1], [tile, tile], -0.14), cols([1, 1.1], [tile, tile], 0.14)], 0.05),
      caption: { x: 0.5, y: 0.5, maxW: 0.86, size: 0.14 },
    },
    tall: {
      tree: rows([1, 1, 1], [cols([1, 1.2], [tile, hero], 0.12), cols([1.2, 1], [tile, tile], -0.12), cols([1, 1.1], [tile, tile], 0.12)], 0.06),
      caption: { x: 0.5, y: 0.5, maxW: 0.88, size: 0.15 },
    },
  },
  {
    id: 'mosaic',
    name: 'Crime Mosaic',
    wide: {
      tree: cols(
        [0.26, 0.48, 0.26],
        [rows([1.25, 1], [tile, tile], 0.12), hero, rows([0.9, 1.2, 0.8], repeat(3, tile), [-0.1, 0.1])],
        [0.14, -0.14],
      ),
      caption: { x: 0.5, y: 0.82, maxW: 0.62, size: 0.15 },
    },
    square: {
      tree: rows(
        [0.3, 0.7],
        [cols([1, 1.3, 1], repeat(3, tile), [0.2, -0.2]), cols([0.64, 0.36], [hero, rows([1, 1], [tile, tile], -0.12)], 0.12)],
        0.05,
      ),
      caption: { x: 0.4, y: 0.84, maxW: 0.7, size: 0.12 },
    },
    tall: {
      tree: rows(
        [0.24, 0.5, 0.26],
        [cols([1, 1.3], [tile, tile], 0.25), hero, cols([1, 1, 1], repeat(3, tile), [0.2, 0.2])],
        [0.07, -0.07],
      ),
      caption: { x: 0.5, y: 0.66, maxW: 0.88, size: 0.15 },
    },
  },
  {
    id: 'diagonal-duo',
    name: 'Diagonal Duo',
    wide: {
      tree: rows([0.73, 0.27], [cols([1.1, 1], [hero, tile], 0.42), cols([1, 1, 1, 1], repeat(4, tile), 0.25)], 0.03),
      caption: { x: 0.5, y: 0.62, maxW: 0.7, size: 0.15 },
    },
    square: {
      tree: rows([0.72, 0.28], [cols([1, 1], [hero, tile], 0.45), cols([1, 1, 1], repeat(3, tile), 0.25)], -0.04),
      caption: { x: 0.5, y: 0.6, maxW: 0.86, size: 0.14 },
    },
    tall: {
      tree: rows([0.4, 0.38, 0.22], [hero, tile, cols([1, 1, 1], repeat(3, tile), 0.25)], [0.2, -0.2]),
      caption: { x: 0.5, y: 0.4, maxW: 0.9, size: 0.15 },
    },
  },
  {
    id: 'triple-slash',
    name: 'Triple Slash',
    wide: {
      tree: cols([1, 1.15, 1], [tile, hero, tile], [0.3, 0.3]),
      caption: { x: 0.5, y: 0.78, maxW: 0.78, size: 0.17 },
    },
    square: {
      tree: cols([1, 1.2, 1], [tile, hero, tile], [0.22, 0.22]),
      caption: { x: 0.5, y: 0.76, maxW: 0.86, size: 0.15 },
    },
    tall: {
      tree: rows([1, 1.2, 1], [tile, hero, tile], [0.16, 0.16]),
      caption: { x: 0.5, y: 0.5, maxW: 0.9, size: 0.16 },
    },
  },
  {
    id: 'tilted-cards',
    name: 'Tilted Cards',
    // Not a cut tree: a full-bleed backdrop photo with three turned cards on top (see buildTiltedCards).
    cards: true,
    wide: { caption: { x: 0.33, y: 0.78, maxW: 0.6, size: 0.15 } },
    square: { caption: { x: 0.5, y: 0.8, maxW: 0.86, size: 0.14 } },
    tall: { caption: { x: 0.5, y: 0.82, maxW: 0.88, size: 0.14 } },
  },
];

/** Which variant of a layout fits a poster of w x h: wide, square or tall. */
export function aspectClass(w, h) {
  const r = w / h;
  if (r > 1.25) return 'wide';
  if (r < 0.9) return 'tall';
  return 'square';
}

export function findLayout(id) {
  return LAYOUTS.find((l) => l.id === id) ?? LAYOUTS[0];
}

/** The border width between panels, in poster pixels, for a poster of w x h and a border slider value (0..2). */
export function borderWidth(w, h, borderScale = 1) {
  return Math.round(Math.min(w, h) * 0.02 * borderScale);
}

/**
 * Cuts the poster into panels. Returns { panels, caption, gutter, frame }: each panel has its polygon (poly), its
 * bounds, whether it is the hero, and for cards the border it is stroked with.
 */
export function buildLayout(id, w, h, borderScale = 1) {
  const layout = findLayout(id);
  const variant = layout[aspectClass(w, h)];
  const gutter = borderWidth(w, h, borderScale);
  const frame = Math.round(gutter * 1.15);
  let panels;
  if (layout.cards) {
    panels = buildTiltedCards(w, h, gutter, frame);
  } else {
    const root = rectPolygon(frame - gutter / 2, frame - gutter / 2, w - 2 * frame + gutter, h - 2 * frame + gutter);
    const leaves = [];
    cutTree(variant.tree, root, leaves);
    panels = leaves
      .map((leaf) => ({ ...leaf, poly: insetConvexPolygon(leaf.poly, gutter / 2) }))
      .filter((p) => p.poly.length >= 3);
  }
  for (const p of panels) p.bounds = polygonBounds(p.poly);
  return { id: layout.id, panels, caption: variant.caption, gutter, frame };
}

/** Walks a cut tree over `poly`, pushing { poly, hero } for every leaf in reading order. */
function cutTree(node, poly, out) {
  if (node.leaf) {
    out.push({ poly, hero: !!node.hero });
    return;
  }
  const b = polygonBounds(poly);
  const total = node.weights.reduce((s, x) => s + x, 0);
  const cuts = [];
  let acc = 0;
  for (let i = 0; i < node.weights.length - 1; i++) {
    acc += node.weights[i];
    const t = acc / total;
    const skew = Array.isArray(node.skew) ? node.skew[i] ?? 0 : node.skew;
    if (node.dir === 'cols') {
      const x = b.x + b.w * t;
      // A cut running down the poster, leaning right at the top for a positive skew.
      cuts.push([[x + (skew * b.h) / 2, b.y - 1], [x - (skew * b.h) / 2, b.y + b.h + 1]]);
    } else {
      const y = b.y + b.h * t;
      cuts.push([[b.x - 1, y - (skew * b.w) / 2], [b.x + b.w + 1, y + (skew * b.w) / 2]]);
    }
  }
  node.children.forEach((child, i) => {
    let piece = poly;
    // cols: left of a downward cut is "keepLeft"; rows: below a rightward cut is "keepLeft".
    if (node.dir === 'cols') {
      if (i > 0) piece = clipPolygonToHalfPlane(piece, cuts[i - 1][0], cuts[i - 1][1], false);
      if (i < cuts.length) piece = clipPolygonToHalfPlane(piece, cuts[i][0], cuts[i][1], true);
    } else {
      if (i > 0) piece = clipPolygonToHalfPlane(piece, cuts[i - 1][0], cuts[i - 1][1], true);
      if (i < cuts.length) piece = clipPolygonToHalfPlane(piece, cuts[i][0], cuts[i][1], false);
    }
    if (piece.length >= 3) cutTree(child, piece, out);
  });
}

/** The Tilted Cards layout: a full-bleed backdrop (the hero) and three cards turned at angles, each with a border. */
function buildTiltedCards(w, h, gutter, frame) {
  const s = Math.min(w, h);
  const backdrop = { poly: rectPolygon(frame, frame, w - 2 * frame, h - 2 * frame), hero: true };
  const kind = aspectClass(w, h);
  const spots = {
    wide: [[0.72, 0.3, 0.42, 0.46, 0.08], [0.88, 0.62, 0.36, 0.42, -0.1], [0.66, 0.74, 0.32, 0.36, 0.05]],
    square: [[0.3, 0.28, 0.44, 0.38, -0.08], [0.72, 0.3, 0.4, 0.36, 0.09], [0.5, 0.56, 0.38, 0.3, -0.04]],
    tall: [[0.3, 0.24, 0.48, 0.34, -0.08], [0.72, 0.36, 0.44, 0.32, 0.08], [0.42, 0.56, 0.44, 0.28, -0.05]],
  }[kind];
  const cards = spots.map(([cx, cy, cw, ch, angle]) => ({
    poly: rotatedRectPolygon(cx * w, cy * h, cw * s, ch * s, angle),
    hero: false,
    card: true,
    border: gutter * 1.1,
  }));
  return [backdrop, ...cards];
}
