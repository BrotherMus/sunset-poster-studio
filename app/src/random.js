// Seeded randomness, so "Surprise me" can be replayed from its seed and screenshots come out the same every time.

/** A small fast seeded generator: returns a function giving numbers in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A number between lo and hi from the generator. */
export function between(rand, lo, hi) {
  return lo + (hi - lo) * rand();
}

/** One item of a list, picked by the generator. */
export function pick(rand, list) {
  return list[Math.floor(rand() * list.length)];
}
