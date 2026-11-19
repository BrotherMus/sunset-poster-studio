// Fixed scenes for reproducible screenshots, made only from the two sample photos in app/samples/.
//   ?shot=cover&scene=<name>   the scene's poster exported as a PNG by the app, shown alone filling the window
//   ?shot=editor&scene=<name>  the editor with the sample photos loaded and one panel selected
// window.__shotReady is set once the page is painted.

/** Each scene: the poster settings, and panel crops naming their sample photo (pier or boulevard). */
export const SCENES = {
  'wide-mosaic': {
    w: 1920, h: 1080, layoutId: 'mosaic', gradeId: 'sunset',
    title: 'Sunset Heist', subline: 'one last job',
    panels: [
      ['pier', 2.2, 0.42, 0.22],
      ['boulevard', 2.4, 0.2, 0.25],
      ['boulevard', 1.05, 0.5, 0.35],
      ['pier', 2.6, 0.8, 0.68],
      ['boulevard', 2.6, 0.62, 0.17],
      ['pier', 1.5, 0.5, 0.55],
      ['boulevard', 2.2, 0.15, 0.75],
    ],
  },
  'portrait-tiles': {
    w: 1080, h: 1350, layoutId: 'hero-tiles', gradeId: 'neon',
    title: 'Boulevard Queen', subline: 'paradise has a price',
    panels: [
      ['boulevard', 1.0, 0.5, 0.3],
      ['pier', 1.7, 0.82, 0.68],
      ['boulevard', 2.2, 0.18, 0.3],
      ['pier', 1.15, 0.4, 0.12],
    ],
  },
  'square-mosaic': {
    w: 1080, h: 1080, layoutId: 'mosaic', gradeId: 'night',
    title: 'Pier Pressure', subline: 'nobody leaves the coast',
    panels: [
      ['boulevard', 2.3, 0.12, 0.3],
      ['boulevard', 2.0, 0.56, 0.2],
      ['pier', 2.2, 0.85, 0.35],
      ['pier', 1.2, 0.4, 0.62],
      ['boulevard', 1.4, 0.5, 0.5],
      ['pier', 1.8, 0.8, 0.68],
    ],
  },
  'editor-wide': {
    w: 1920, h: 1080, layoutId: 'hero-tiles', gradeId: 'pastel',
    title: 'Coastline Kings', subline: 'live fast, drive faster',
    selected: 1,
    panels: [
      ['boulevard', 1.0, 0.5, 0.4],
      ['pier', 2.2, 0.42, 0.22],
      ['boulevard', 2.4, 0.2, 0.25],
      ['pier', 1.8, 0.8, 0.7],
    ],
  },
};

/** Sets up the scene the query names and either shows its exported PNG (cover) or the editor (editor). */
export async function runShot(query, studio) {
  const shot = query.get('shot');
  const scene = SCENES[query.get('scene') ?? (shot === 'editor' ? 'editor-wide' : 'wide-mosaic')] ?? SCENES['wide-mosaic'];
  const ids = await studio.loadSamples(['boulevard', 'pier']);
  const { panels, selected = 0, ...settings } = scene;
  // Optional overrides, for checking any layout, grade and size: &layout=…&grade=…&size=1080x1350
  if (query.get('layout')) settings.layoutId = query.get('layout');
  if (query.get('grade')) settings.gradeId = query.get('grade');
  const size = /^(\d+)x(\d+)$/.exec(query.get('size') ?? '');
  if (size) [settings.w, settings.h] = [Number(size[1]), Number(size[2])];
  studio.setPoster({
    ...settings,
    captionPos: 'auto',
    titleScale: 1,
    slab: true,
    seed: 2,
    panels: panels.map(([photo, zoom, fx, fy]) => ({ photoId: ids[photo], zoom, fx, fy })),
  });
  studio.select(selected);
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    const blob = await studio.exportBlob();
    const img = document.getElementById('shot-image');
    img.hidden = false;
    img.src = URL.createObjectURL(blob);
    await img.decode();
  } else {
    studio.draw();
  }
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
