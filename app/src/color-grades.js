// Colour grades. Each grade is a gradient map (shadows to highlights) for the photos, a second map that alternate
// panels can take, and the palette for everything drawn around them: the sunset tile's sky and sun, the borders,
// the caption's slab, fill, outline and shadow, the glow and the light leaks.

export const COLOR_GRADES = [
  {
    id: 'sunset-boulevard',
    name: 'Sunset Boulevard',
    map: ['#14032c', '#4a0b58', '#a3166c', '#ee3466', '#ff7a3c', '#ffc65e', '#fff1cf'],
    altMap: ['#0e0634', '#331a7a', '#8a2a9a', '#e4407e', '#ff8a6a', '#ffd0a0', '#fff2ea'],
    strength: 0.82, contrast: 1.22, saturation: 1.3, gamma: 1.12,
    sky: ['#2a0b4a', '#7a1a6e', '#e2386a', '#ff7a3a', '#ffc65c'],
    sun: ['#fff27a', '#ffb43c', '#ff4f7b'],
    sea: ['#3b0f5c', '#140726'],
    palm: '#14051f',
    border: '#0f0518',
    slab: '#ff2e7e', titleFill: ['#fff7d6', '#ffd36b', '#ff8a3d'], outline: '#14051f', shadow: '#2ad4ff',
    sub: '#fff0f6', subGlow: '#ff3fa4', glow: '#ff9a5c', leaks: ['#ff7a2f', '#ff2e8a'],
  },
  {
    id: 'neon-nights',
    name: 'Neon Nights',
    map: ['#07021a', '#2c0a5e', '#8a12a8', '#ff2bd6', '#5ff1ff', '#f2ffff'],
    altMap: ['#020a1e', '#06306a', '#0d8fb0', '#2ff3ff', '#ff6be6', '#fff2ff'],
    strength: 0.84, contrast: 1.18, saturation: 1.2, gamma: 1.25,
    sky: ['#05021a', '#1d0a4f', '#6a12a0', '#e02bb8', '#ff7ad0'],
    sun: ['#ffe36b', '#ff4fb8', '#a12bff'],
    sea: ['#1a0950', '#05021a'],
    palm: '#05010f',
    border: '#05010f',
    slab: '#22e6ff', titleFill: ['#ffffff', '#ffd1f4', '#ff4fd1'], outline: '#0a0220', shadow: '#ff2bd6',
    sub: '#ffffff', subGlow: '#22e6ff', glow: '#ff4fe0', leaks: ['#ff2bd6', '#2ff3ff'],
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    map: ['#22061a', '#6a1430', '#c4402c', '#f7882e', '#ffb43c', '#ffd77a', '#fff0c4'],
    altMap: ['#2a0a2e', '#7a1a4a', '#d8404a', '#ff8a3a', '#ffcc66', '#fff0c0'],
    strength: 0.74, contrast: 1.18, saturation: 1.3, gamma: 1.12,
    sky: ['#3a1230', '#8a2a3a', '#e0603a', '#ffa53f', '#ffe08a'],
    sun: ['#fffbd0', '#ffd25a', '#ff8a2f'],
    sea: ['#5a2420', '#200a10'],
    palm: '#1a0806',
    border: '#1a0806',
    slab: '#ffb21e', titleFill: ['#ffffff', '#fff1c4', '#ffc65a'], outline: '#1a0806', shadow: '#d6284f',
    sub: '#fff8e6', subGlow: '#ff7a1e', glow: '#ffb85a', leaks: ['#ffb02f', '#ff5a2f'],
  },
  {
    id: 'midnight-drive',
    name: 'Midnight Drive',
    map: ['#01030c', '#06143a', '#173f86', '#2f8ad8', '#8fe3ff', '#eafcff'],
    altMap: ['#05020f', '#1c0b45', '#4a1a8a', '#9b3fd8', '#ff8ae6', '#fff0fb'],
    strength: 0.86, contrast: 1.2, saturation: 1.05, gamma: 2.2,
    sky: ['#01020c', '#06123a', '#1a2f7a', '#5a3ab0', '#d05ad0'],
    sun: ['#f2fbff', '#a6e8ff', '#5aa8ff'],
    sea: ['#0a1240', '#01020c'],
    palm: '#000208',
    border: '#000208',
    slab: '#ff3fb0', titleFill: ['#ffffff', '#cdf4ff', '#6ad7ff'], outline: '#01030c', shadow: '#7a3cff',
    sub: '#ffffff', subGlow: '#4fd8ff', glow: '#6ab8ff', leaks: ['#3f6bff', '#ff3fb0'],
  },
  {
    id: 'flamingo-duotone',
    name: 'Flamingo Duotone',
    map: ['#2a0a5a', '#ff4fa3', '#ffe9f2'],
    altMap: ['#062a4a', '#1fd6c4', '#f0fff9'],
    strength: 0.92, contrast: 1.15, saturation: 1,
    sky: ['#1f0a4a', '#5a1a8a', '#c43aa8', '#ff6fa3', '#ffd0a8'],
    sun: ['#fff6c0', '#ffa0c8', '#ff4fa3'],
    sea: ['#1fa8b0', '#0a2a4a'],
    palm: '#12062a',
    border: '#fff3e6',
    slab: '#1fd6c4', titleFill: ['#ffffff', '#ffe0ef', '#ff7ab8'], outline: '#2a0a5a', shadow: '#ff4fa3',
    sub: '#ffffff', subGlow: '#ff4fa3', glow: '#ff8ac0', leaks: ['#ff4fa3', '#1fd6c4'],
  },
  {
    id: 'tropic-heat',
    name: 'Tropic Heat',
    map: ['#04161c', '#0a4450', '#13857e', '#ff6a4a', '#ffa848', '#ffe39a', '#fff8e6'],
    altMap: ['#1a0a2a', '#5a1a5a', '#d83a6a', '#ff9a4a', '#ffe6a0', '#fffaf0'],
    strength: 0.72, contrast: 1.14, saturation: 1.18,
    sky: ['#0a2a3a', '#1a6a6a', '#f0803a', '#ffb84a', '#fff0a0'],
    sun: ['#ffffe0', '#ffe05a', '#ff8a3a'],
    sea: ['#0f6a6a', '#052222'],
    palm: '#041414',
    border: '#071414',
    slab: '#ff5a3a', titleFill: ['#ffffff', '#fff2b0', '#ffc23a'], outline: '#041414', shadow: '#16c8b0',
    sub: '#ffffff', subGlow: '#ff8a3a', glow: '#ffc06a', leaks: ['#ffb03a', '#16c8b0'],
  },
];

/** The grade with this id, or the first one. */
export function findGrade(id) {
  return COLOR_GRADES.find((grade) => grade.id === id) ?? COLOR_GRADES[0];
}

/** [r, g, b] from '#rrggbb'. */
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** 'rgba(...)' from '#rrggbb' and an alpha. */
export function hexWithAlpha(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * A 256-entry gradient map (flat Uint8ClampedArray of r, g, b) spreading `stops` evenly from black to white.
 * Lookups by luminance turn a photo into the grade's colours.
 */
export function buildGradientMap(stops) {
  const colors = stops.map(hexToRgb);
  const lut = new Uint8ClampedArray(256 * 3);
  for (let i = 0; i < 256; i++) {
    const position = (i / 255) * (colors.length - 1);
    const index = Math.min(colors.length - 2, Math.floor(position));
    const t = position - index;
    for (let c = 0; c < 3; c++) lut[i * 3 + c] = colors[index][c] + (colors[index + 1][c] - colors[index][c]) * t;
  }
  return lut;
}
