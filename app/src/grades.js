// Colour grades: each grade is a set of gradient maps (a photo's brightness mapped through a run of colours, the
// duotone / multitone look), the poster's ink and lettering colours, and the warm wash and light leak laid on top.
// Panels take the grade's maps in turn, so neighbouring tiles come out in different tints of one palette.

export const GRADES = [
  {
    id: 'sunset',
    name: 'Sunset Strip',
    maps: [
      [[0, '#1b0630'], [0.3, '#7a1550'], [0.55, '#e8432f'], [0.78, '#ff9a3c'], [1, '#ffe9b8']],
      [[0, '#12062e'], [0.35, '#5b1f7a'], [0.6, '#e0407a'], [0.85, '#ffb07a'], [1, '#fff0d8']],
      [[0, '#081a2e'], [0.35, '#1f5a7a'], [0.62, '#e86a5a'], [0.85, '#ffc27a'], [1, '#fff4e0']],
    ],
    mix: 0.78,
    ink: '#12081c',
    wash: ['#ff4f7b', '#ffb347'],
    leak: '#ff7a2f',
    slab: '#ff2e7e',
    slabShadow: '#5a0b3a',
    titleFill: ['#fffbe8', '#ffd25e'],
    titleOutline: '#16061f',
    titleShadow: '#8a1fb0',
    sub: '#62f3ff',
    subGlow: '#00b7ff',
  },
  {
    id: 'neon',
    name: 'Neon Drive',
    maps: [
      [[0, '#090018'], [0.3, '#3a0a6e'], [0.55, '#c2188f'], [0.8, '#ff6ec7'], [1, '#f2e6ff']],
      [[0, '#00101c'], [0.35, '#003f6b'], [0.6, '#00a6c8'], [0.85, '#7ff0ff'], [1, '#effdff']],
      [[0, '#0b0020'], [0.35, '#4b1590'], [0.6, '#7a52ff'], [0.82, '#ff4fd8'], [1, '#fff0fb']],
    ],
    mix: 0.82,
    ink: '#05010d',
    wash: ['#ff2fb3', '#2fe6ff'],
    leak: '#ff2fd0',
    slab: '#00e1ff',
    slabShadow: '#0a1a6b',
    titleFill: ['#ffffff', '#ffc9f0'],
    titleOutline: '#1a0030',
    titleShadow: '#ff1f9e',
    sub: '#ff4fd0',
    subGlow: '#ff00aa',
  },
  {
    id: 'golden',
    name: 'Golden Hour',
    maps: [
      [[0, '#1f0e04'], [0.35, '#7a3410'], [0.6, '#d9782a'], [0.82, '#ffc65a'], [1, '#fff6d6']],
      [[0, '#1a0812'], [0.35, '#6e2430'], [0.6, '#d0603a'], [0.85, '#ffcf7a'], [1, '#fff8e8']],
      [[0, '#10120a'], [0.4, '#4e4a1c'], [0.65, '#c98f3a'], [0.85, '#ffd98a'], [1, '#fffaf0']],
    ],
    mix: 0.7,
    ink: '#1a0d05',
    wash: ['#ffb347', '#ff6a3d'],
    leak: '#ffb02e',
    slab: '#ffb21f',
    slabShadow: '#6b2a05',
    titleFill: ['#ffffff', '#fff0c2'],
    titleOutline: '#2a1004',
    titleShadow: '#c2410c',
    sub: '#ffffff',
    subGlow: '#ff8a00',
  },
  {
    id: 'night',
    name: 'Midnight',
    maps: [
      [[0, '#01020a'], [0.35, '#0a1a4a'], [0.62, '#2a5fa8'], [0.85, '#8fd3ff'], [1, '#eef9ff']],
      [[0, '#03010c'], [0.35, '#1d0b45'], [0.62, '#6b2fa8'], [0.85, '#ff7ad9'], [1, '#fff0fa']],
      [[0, '#000a0c'], [0.4, '#06384a'], [0.65, '#1aa3a3'], [0.85, '#b5ffe9'], [1, '#f2fffb']],
    ],
    mix: 0.85,
    ink: '#02030a',
    wash: ['#3a2fff', '#ff2e8a'],
    leak: '#ff3d9a',
    slab: '#ff2e63',
    slabShadow: '#160a40',
    titleFill: ['#ffffff', '#c9ecff'],
    titleOutline: '#000000',
    titleShadow: '#2a4dff',
    sub: '#ff6bd6',
    subGlow: '#ff2ea6',
  },
  {
    id: 'pastel',
    name: 'Vice Pastel',
    maps: [
      [[0, '#2a0f3a'], [0.4, '#c0457e'], [0.7, '#ff9fb8'], [1, '#fff1f4']],
      [[0, '#0d2a3a'], [0.4, '#2a8fa0'], [0.7, '#7fe3d6'], [1, '#f0fffb']],
      [[0, '#2a1240'], [0.45, '#8a5ad0'], [0.75, '#ffb3e0'], [1, '#fff5fb']],
    ],
    mix: 0.75,
    ink: '#1c0b26',
    wash: ['#ff7ab8', '#4fe0d0'],
    leak: '#ff9ad0',
    slab: '#20d3c2',
    slabShadow: '#0b3d4a',
    titleFill: ['#ffffff', '#ffe0ef'],
    titleOutline: '#2a0b3d',
    titleShadow: '#ff4f9a',
    sub: '#ff4fa0',
    subGlow: '#ff2f8a',
  },
  {
    id: 'duotone',
    name: 'Duotone Heat',
    maps: [
      [[0, '#1a0640'], [1, '#ffb347']],
      [[0, '#002a4d'], [1, '#ff5fa2']],
      [[0, '#2d0036'], [1, '#3ff2d2']],
    ],
    mix: 0.92,
    ink: '#0d0420',
    wash: ['#ff5f6d', '#ffc371'],
    leak: '#ff5f6d',
    slab: '#ffd23f',
    slabShadow: '#3d0a52',
    titleFill: ['#ffffff', '#fff3c4'],
    titleOutline: '#14052a',
    titleShadow: '#ff2f6d',
    sub: '#3ff2d2',
    subGlow: '#00ffc8',
  },
];

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** '#rrggbb' to [r, g, b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const lutCache = new Map();

/** A 256-step colour table for a gradient map's stops ([position 0..1, '#hex'] pairs): 768 bytes, r g b per step. */
export function buildGradientMapLut(stops) {
  const key = JSON.stringify(stops);
  if (lutCache.has(key)) return lutCache.get(key);
  const lut = new Uint8ClampedArray(256 * 3);
  const rgb = stops.map(([pos, hex]) => [pos, hexToRgb(hex)]);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    let k = 0;
    while (k < rgb.length - 2 && t > rgb[k + 1][0]) k++;
    const [p0, c0] = rgb[k];
    const [p1, c1] = rgb[k + 1];
    const f = p1 > p0 ? Math.min(1, Math.max(0, (t - p0) / (p1 - p0))) : 0;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = c0[c] + (c1[c] - c0[c]) * f;
  }
  lutCache.set(key, lut);
  return lut;
}

/**
 * Grades pixels in place: lifts contrast with an S-curve (`punch`, 0..1), maps brightness through the gradient map
 * and blends it over the photo's own colour by `mix` (0 keeps the photo, 1 is a pure gradient map).
 */
export function applyGradientMap(imageData, stops, mix, punch = 0.6) {
  const lut = buildGradientMapLut(stops);
  const d = imageData.data;
  const curve = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const t = i / 255;
    const s = t * t * (3 - 2 * t);
    curve[i] = 255 * (t + (s - t) * punch * 2);
  }
  // Brightness goes through a gamma of 1.25 before the map, so mid-tones land on the deeper, richer colours.
  const depth = new Uint8Array(256);
  for (let i = 0; i < 256; i++) depth[i] = Math.round(255 * Math.pow(i / 255, 1.25));
  const keep = 1 - mix;
  for (let i = 0; i < d.length; i += 4) {
    const r = curve[d[i]], g = curve[d[i + 1]], b = curve[d[i + 2]];
    const l = depth[(r * 77 + g * 150 + b * 29) >> 8];
    const j = l * 3;
    d[i] = r * keep + lut[j] * mix;
    d[i + 1] = g * keep + lut[j + 1] * mix;
    d[i + 2] = b * keep + lut[j + 2] * mix;
  }
  return imageData;
}
