// Seeded randomness, so "Surprise me" and the screenshot scenes give the same poster for the same seed.

/** Returns a function giving floats in [0, 1) from a 32-bit seed (mulberry32). */
export function createRandom(seed) {
  let a = seed >>> 0;
  return function nextRandom() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A float between `min` and `max`. */
export function randomBetween(random, min, max) {
  return min + (max - min) * random();
}

/** One item of `list`, picked at random. */
export function pickRandom(random, list) {
  return list[Math.floor(random() * list.length) % list.length];
}

/** A fresh seed from the clock and Math.random, for interactive use. */
export function freshSeed() {
  return (Date.now() ^ Math.floor(Math.random() * 0xffffffff)) >>> 0;
}
