// Small seeded random numbers, so "Surprise me", the painted scenes and the film grain repeat exactly for a seed.

/** mulberry32: a fast 32-bit seeded generator returning floats in [0, 1). */
export function createRandom(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  next.range = (lo, hi) => lo + (hi - lo) * next();
  next.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * next());
  next.pick = (list) => list[Math.floor(next() * list.length)];
  return next;
}

/** A seed from a string (FNV-1a), for seeds named in a URL. */
export function seedFromText(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return h >>> 0;
}
