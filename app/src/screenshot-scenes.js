// Reproducible scenes for screenshots, from the URL: ?shot=cover draws the poster alone at its full export size
// (so a window of that size shows the exported pixels 1:1); ?shot=editor shows the whole studio with photos loaded.
// Other parameters set the design: size, layout, grade, style, title, sub, position, scale, photos (sample names),
// surprise (a seed), select (a panel number), look.<key>=value, and slotN=photo,zoom,fx,fy[,flip] for exact crops.
// window.__shotReady turns true (and the title gains " ready") once the scene is painted.
import { surpriseDesign } from './poster-design.js';

/** Sets up the scene the query asks for, using the studio's own functions, then marks the page ready. */
export async function runScreenshotScene(query, app) {
  const { studio } = app;
  const design = studio.design;
  const shot = query.get('shot');
  if (shot === 'cover') {
    document.body.classList.add('shot-cover');
    studio.fullSizePreview = true;
  }
  if (query.get('size')) design.sizeId = query.get('size');
  const sampleNames = (query.get('photos') ?? 'boulevard,pier').split(',').filter(Boolean);
  await app.addSamplePhotos(sampleNames);

  if (query.get('surprise')) surpriseDesign(design, studio.photos, Number(query.get('surprise')));
  if (query.get('layout')) design.layoutId = query.get('layout');
  if (query.get('grade')) design.gradeId = query.get('grade');
  if (query.get('style')) design.caption.style = query.get('style');
  if (query.has('title')) design.caption.title = query.get('title');
  if (query.has('sub')) design.caption.sub = query.get('sub');
  if (query.get('position')) design.caption.position = query.get('position');
  if (query.get('scale')) design.caption.scale = Number(query.get('scale'));
  if (query.get('seed')) design.seed = Number(query.get('seed'));
  for (const [key, value] of query) {
    if (key.startsWith('look.')) {
      const name = key.slice(5);
      design.look[name] = name === 'borderColor' ? value : name === 'alternate' ? value === '1' : Number(value);
    }
    const slotMatch = /^slot(\d+)$/.exec(key);
    if (slotMatch) applySlotCrop(design.slots[Number(slotMatch[1]) - 1], value, studio.photos);
  }

  app.syncPickers();
  app.buildPhotoStrip();
  if (query.get('select')) app.selectSlot(Number(query.get('select')) - 1);
  app.renderPreview();
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
  document.title += ' ready';
}

/** Sets one slot from "photoName,zoom,fx,fy[,flip]". */
function applySlotCrop(slot, value, photos) {
  if (!slot) return;
  const [name, zoom, fx, fy, flip] = value.split(',');
  const photo = photos.find((p) => p.name === name);
  if (photo) slot.photoId = photo.id;
  if (zoom) slot.zoom = Number(zoom);
  if (fx) slot.fx = Number(fx);
  if (fy) slot.fy = Number(fy);
  slot.flip = flip === '1';
}
