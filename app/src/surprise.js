// "Surprise me": a new layout, grade and set of photo crops from one seed, keeping the person's own title and photos.
import { LAYOUTS, buildLayout } from './layouts.js';
import { GRADES } from './grades.js';
import { mulberry32, between, pick } from './random.js';

export const SUBLINE_IDEAS = [
  'one last job',
  'paradise has a price',
  'heat on the boulevard',
  'nobody leaves the coast',
  'live fast, drive faster',
  'summer of bad ideas',
  'the sun never sets on crime',
  'no one sleeps tonight',
];

/**
 * Random crops for `count` panels. Hero panels (indexes in `heroes`) stay wide; the tiles zoom into different
 * spots, aimed mostly at the upper middle of the photo, where faces and skylines usually are.
 */
export function surpriseCrops(rand, count, photoIds, heroes = [0]) {
  const crops = [];
  const start = Math.floor(rand() * Math.max(1, photoIds.length));
  for (let i = 0; i < count; i++) {
    const photoId = photoIds.length ? photoIds[(start + i) % photoIds.length] : undefined;
    const hero = heroes.includes(i);
    crops.push({
      photoId,
      zoom: hero ? between(rand, 1, 1.15) : between(rand, 1.3, 2.3),
      fx: hero ? between(rand, 0.4, 0.6) : between(rand, 0.25, 0.75),
      fy: hero ? between(rand, 0.3, 0.45) : rand() < 0.7 ? between(rand, 0.15, 0.4) : between(rand, 0.4, 0.75),
    });
  }
  return crops;
}

/** The indexes of a layout's hero panels at this poster size. */
export function heroIndexes(layoutId, w, h) {
  return buildLayout(layoutId, w, h).panels.flatMap((p, i) => (p.hero ? [i] : []));
}

/** The poster after a "Surprise me" click with this seed: layout, grade, crops and effects changed together. */
export function surprisePoster(poster, photoIds, seed) {
  const rand = mulberry32(seed);
  const others = (list, current) => list.filter((x) => x.id !== current);
  const layout = pick(rand, others(LAYOUTS, poster.layoutId));
  const grade = pick(rand, others(GRADES, poster.gradeId));
  return {
    ...poster,
    seed,
    layoutId: layout.id,
    gradeId: grade.id,
    panels: surpriseCrops(rand, 8, photoIds, heroIndexes(layout.id, poster.w, poster.h)),
    subline: poster.subline?.trim() ? poster.subline : pick(rand, SUBLINE_IDEAS),
    captionPos: 'auto',
    effects: {
      ...poster.effects,
      strength: between(rand, 0.85, 1),
      grain: between(rand, 0.4, 0.7),
      glow: between(rand, 0.45, 0.8),
      vignette: between(rand, 0.4, 0.7),
      leak: between(rand, 0.4, 0.8),
      varyTint: rand() > 0.2,
    },
  };
}
