// Colour grades: each is a gradient map (shadows -> highlights) blended over the photo after a contrast and
// saturation push, an alternate map so neighbouring panels differ, and the palette the rest of the poster uses
// (gutter ink, caption slab, lettering, glow and the painted sky scenes).

export const GRADES = [
  {
    id: 'sunset-strip',
    name: 'Sunset Strip',
    map: ['#1b0630', '#7a1060', '#f2305f', '#ff8a2a', '#ffd76e'],
    alt: ['#12052b', '#521677', '#e0308f', '#ff8c5a', '#ffe2b4'],
    mix: 0.84, contrast: 1.2, saturation: 1.25,
    palette: { ink: '#14051d', slab: '#ff2f7d', slabShade: '#9c0f4f', title: ['#fff6e0', '#ffc070'], titleShadow: '#3a0838', sub: '#ffe14d', glow: '#ff5fa2', sky: ['#2a0b4a', '#c42a6b', '#ff7b3a', '#ffd27a'], sun: ['#fff3b0', '#ff5d5d'], sea: '#3b0f52', neon: '#ff4fb0' },
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    map: ['#07041f', '#3a0f7a', '#c21fd0', '#ff4fd8', '#9ff8ff'],
    alt: ['#030a24', '#0d3f86', '#1fb7e0', '#7ff3ff', '#fff2ff'],
    mix: 0.76, contrast: 1.22, saturation: 1.3,
    palette: { ink: '#06031a', slab: '#14e5ff', slabShade: '#0a6c94', title: ['#ffffff', '#ffb3f3'], titleShadow: '#4a0a6b', sub: '#ff3fd2', glow: '#ff3fd2', sky: ['#0a0528', '#3b0c78', '#c01fa8', '#ff6ad5'], sun: ['#ffd1f6', '#ff2fb3'], sea: '#140a3d', neon: '#24f0ff' },
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    map: ['#1a0604', '#7a2210', '#e8561a', '#ffad2e', '#fff0b8'],
    alt: ['#1f0708', '#82201c', '#ec6a2a', '#ffc25a', '#fff6dc'],
    mix: 0.84, contrast: 1.26, saturation: 1.4,
    palette: { ink: '#1a0b04', slab: '#ffb21c', slabShade: '#a35a00', title: ['#fffdf5', '#ffe08a'], titleShadow: '#4a1c06', sub: '#ff5a36', glow: '#ffb84d', sky: ['#3d1608', '#b8431a', '#ff9a3c', '#ffe3a1'], sun: ['#fffbe0', '#ffb347'], sea: '#4d1f0c', neon: '#ffcf4d' },
  },
  {
    id: 'midnight-drive',
    name: 'Midnight Drive',
    map: ['#02040d', '#0b2140', '#155e7a', '#3fd0e0', '#e8fdff'],
    alt: ['#05030f', '#2a0c45', '#7a1f7a', '#e04fa8', '#ffe9f6'],
    mix: 0.82, contrast: 1.25, saturation: 1.15,
    palette: { ink: '#02030a', slab: '#ff3b6b', slabShade: '#7c0d2e', title: ['#e8fdff', '#7fe9ff'], titleShadow: '#1a0630', sub: '#7ff6ff', glow: '#3fd0e0', sky: ['#02030f', '#0c1f4a', '#3a2a8a', '#e0559f'], sun: ['#ffe4f2', '#ff5c9c'], sea: '#050b24', neon: '#3fe6ff' },
  },
  {
    id: 'vice-duotone',
    name: 'Vice Duotone',
    map: ['#2a0a4f', '#2a0a4f', '#ff3d8b', '#ffd0e4'],
    alt: ['#0a2e4f', '#0a2e4f', '#28d6c8', '#e6fff9'],
    mix: 0.92, contrast: 1.3, saturation: 1,
    palette: { ink: '#14062a', slab: '#28d6c8', slabShade: '#0b6b6e', title: ['#ffffff', '#ffd6ea'], titleShadow: '#2a0a4f', sub: '#ff3d8b', glow: '#ff3d8b', sky: ['#1a0638', '#5b1278', '#ff3d8b', '#ffc1a1'], sun: ['#fff0f6', '#ff6aa8'], sea: '#1d0b45', neon: '#ff3d8b' },
  },
  {
    id: 'tropic-heat',
    name: 'Tropic Heat',
    map: ['#04201f', '#0c4f4a', '#2a9a7f', '#ff9248', '#fff0d4'],
    alt: ['#1b0a20', '#5a1a45', '#e04a5a', '#ffb067', '#fff6e2'],
    mix: 0.72, contrast: 1.2, saturation: 1.35,
    palette: { ink: '#071514', slab: '#ff6b3d', slabShade: '#8e2a10', title: ['#fffaf0', '#ffe3b0'], titleShadow: '#0a2e2c', sub: '#3dffc8', glow: '#ff9a5c', sky: ['#0b2a3a', '#16696a', '#ff8a4a', '#ffd9a0'], sun: ['#fff7d6', '#ff8040'], sea: '#073235', neon: '#3dffc8' },
  },
];

export function findGrade(id) {
  return GRADES.find((g) => g.id === id) ?? GRADES[0];
}

/** '#rrggbb' -> [r, g, b]. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 'rgba()' string for a palette colour with some transparency. */
export function withAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const lutCache = new Map();

/** 256-entry R, G and B tables for a gradient map whose colours are spaced evenly from black to white. */
export function buildGradientMapLut(stops) {
  const key = stops.join();
  if (lutCache.has(key)) return lutCache.get(key);
  const rgb = stops.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const t = (i / 255) * (rgb.length - 1);
    const k = Math.min(rgb.length - 2, Math.floor(t));
    const f = t - k;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = rgb[k][c] + (rgb[k + 1][c] - rgb[k][c]) * f;
  }
  lutCache.set(key, lut);
  return lut;
}

/** A smooth S-curve for contrast, as a 256-entry table. */
function buildContrastLut(contrast) {
  const lut = new Uint8ClampedArray(256);
  for (let i = 0; i < 256; i++) {
    const x = i / 255;
    const s = x * x * (3 - 2 * x); // smoothstep pulls toward an S
    const k = Math.min(1, Math.max(0, (contrast - 1) * 2.2));
    const y = 0.5 + (x * (1 - k) + s * k - 0.5) * contrast;
    lut[i] = Math.round(y * 255);
  }
  return lut;
}

/**
 * Grades pixels in place: contrast and saturation push, then the gradient map blended in by the grade's mix times
 * `strength` (0..1). `useAlt` picks the alternate map, so panels can alternate between two related tints.
 */
export function applyGradeToPixels(imageData, grade, strength, useAlt) {
  const data = imageData.data;
  const map = buildGradientMapLut(useAlt ? grade.alt : grade.map);
  // Poster punch: the grade's contrast and saturation pushes count double at full strength.
  const curve = buildContrastLut(1 + (grade.contrast - 1) * strength * 2);
  const sat = 1 + (grade.saturation - 1) * strength * 1.6;
  const m = Math.min(1, grade.mix * strength);
  for (let i = 0; i < data.length; i += 4) {
    let r = data[i], g = data[i + 1], b = data[i + 2];
    const l0 = 0.299 * r + 0.587 * g + 0.114 * b;
    r = curve[Math.max(0, Math.min(255, (l0 + (r - l0) * sat) | 0))];
    g = curve[Math.max(0, Math.min(255, (l0 + (g - l0) * sat) | 0))];
    b = curve[Math.max(0, Math.min(255, (l0 + (b - l0) * sat) | 0))];
    const l = (0.299 * r + 0.587 * g + 0.114 * b) | 0;
    const j = l * 3;
    data[i] = r + (map[j] - r) * m;
    data[i + 1] = g + (map[j + 1] - g) * m;
    data[i + 2] = b + (map[j + 2] - b) * m;
  }
  return imageData;
}

/** A CSS gradient showing a grade's map, used for the grade swatches in the editor. */
export function gradeSwatchCss(grade) {
  return `linear-gradient(135deg, ${grade.map.join(', ')})`;
}
