// Sunset Poster Studio's page: holds the design and the photo library, builds the controls, keeps the live preview
// drawn, and wires photos in (picker, drag and drop, samples), panel editing, Surprise me and Export PNG.
import { COLOR_GRADES } from './color-grades.js';
import { exportPosterPng } from './export-png.js';
import { loadPosterFonts } from './font-loader.js';
import { attachPanelEditor } from './panel-editor.js';
import { loadPhotoFile, loadPhotoUrl, smartCrops } from './photo-library.js';
import { CAPTION_STYLES } from './poster-caption.js';
import {
  POSTER_SIZES, activePanelCount, assignPhotoToSlot, createDesign, designSize, fillPanelsFromPhotos, forgetPhoto, surpriseDesign,
} from './poster-design.js';
import { POSTER_LAYOUTS, layoutPoster, tracePolygon } from './poster-layouts.js';
import { renderPoster } from './render-poster.js';
import { runScreenshotScene } from './screenshot-scenes.js';
import { freshSeed } from './seeded-random.js';

const EFFECT_SLIDERS = [
  ['gradeAmount', 'Grade strength', 0, 1.2],
  ['wash', 'Sunset wash', 0, 1],
  ['glow', 'Glow', 0, 1],
  ['leaks', 'Light leaks', 0, 1],
  ['vignette', 'Vignette', 0, 1],
  ['grain', 'Film grain', 0, 0.6],
  ['border', 'Borders', 0, 2.5],
  ['keyline', 'Neon keyline', 0, 1],
];
const SAMPLE_PHOTOS = ['boulevard', 'pier'];

const $ = (id) => document.getElementById(id);
const studio = {
  design: createDesign(),
  photos: [],
  photosById: new Map(),
  selectedSlot: 0,
  panels: [],
  fullSizePreview: false,
};
const preview = $('preview-canvas');
let renderQueued = false;

/** Redraws the preview on the next frame (once, however many changes come in before it). */
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    renderPreview();
  });
}

/** Sizes the preview canvas to fit the stage at screen resolution (or the full poster size) and draws the poster. */
function renderPreview() {
  const { width, height } = designSize(studio.design);
  let scale = 1;
  if (!studio.fullSizePreview) {
    const stage = $('stage').getBoundingClientRect();
    const fit = Math.min((stage.width - 36) / width, (stage.height - 36) / height);
    scale = Math.min(1, Math.max(0.2, fit * (window.devicePixelRatio || 1)));
  }
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  if (!studio.fullSizePreview) preview.style.aspectRatio = `${width} / ${height}`;
  const editor = document.body.classList.contains('shot-cover') ? null : { selectedSlot: studio.selectedSlot };
  studio.panels = renderPoster(preview, studio.design, studio.photosById, editor);
  syncPanelControls();
}

/** Adds image files to the library. The first photos fill every panel; later ones go into the selected panel. */
async function addPhotos(files) {
  const images = [...files].filter((file) => file.type.startsWith('image/'));
  if (!images.length) return setStatus('Those files are not images.');
  const wasEmpty = studio.photos.length === 0;
  const added = [];
  for (const file of images) {
    try {
      added.push(await loadPhotoFile(file));
    } catch {
      setStatus(`Could not read ${file.name}.`);
    }
  }
  addToLibrary(added, wasEmpty);
}

/** Puts loaded photos in the library and onto the poster. */
function addToLibrary(added, refillAll) {
  if (!added.length) return;
  for (const photo of added) {
    studio.photos.push(photo);
    studio.photosById.set(photo.id, photo);
  }
  if (refillAll) {
    fillPanelsFromPhotos(studio.design, studio.photos);
  } else {
    assignPhotoToSlot(studio.design, studio.selectedSlot, added[0]);
  }
  setStatus(`${added.length} photo${added.length > 1 ? 's' : ''} added. Click a thumbnail to place it in the selected panel.`);
  buildPhotoStrip();
  requestRender();
}

/** Loads the bundled sample photos (free to use) by name. */
async function addSamplePhotos(names = SAMPLE_PHOTOS) {
  const wasEmpty = studio.photos.length === 0;
  const added = await Promise.all(names.map((name) => loadPhotoUrl(`samples/${name}.jpg`, name)));
  addToLibrary(added, wasEmpty);
}

/** Removes a photo from the library and from every panel that showed it. */
function removePhoto(photoId) {
  studio.photos = studio.photos.filter((photo) => photo.id !== photoId);
  studio.photosById.delete(photoId);
  forgetPhoto(studio.design, photoId, studio.photos);
  buildPhotoStrip();
  requestRender();
}

/** The library strip: one thumbnail per photo with how many panels use it; click places it in the selected panel. */
function buildPhotoStrip() {
  const strip = $('photo-strip');
  strip.replaceChildren(...studio.photos.map((photo) => {
    const thumb = thumbButton(photo, () => placePhoto(photo));
    const uses = studio.design.slots.slice(0, activePanelCount(studio.design)).filter((slot) => slot.photoId === photo.id).length;
    const badge = document.createElement('span');
    badge.className = 'uses';
    badge.textContent = `${uses}×`;
    const remove = document.createElement('span');
    remove.className = 'remove';
    remove.textContent = '✕';
    remove.title = `Remove ${photo.name}`;
    remove.addEventListener('click', (event) => {
      event.stopPropagation();
      removePhoto(photo.id);
    });
    thumb.append(badge, remove);
    return thumb;
  }));
  buildPanelPhotoPicker();
}

/** A thumbnail button for a photo. */
function thumbButton(photo, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'thumb';
  button.title = photo.name;
  const img = document.createElement('img');
  img.src = photo.thumb;
  img.alt = photo.name;
  button.append(img);
  button.addEventListener('click', onClick);
  return button;
}

/** Puts a photo in the selected panel. */
function placePhoto(photo) {
  assignPhotoToSlot(studio.design, studio.selectedSlot, photo);
  buildPhotoStrip();
  requestRender();
}

/** The selected panel's photo choices. */
function buildPanelPhotoPicker() {
  const slot = studio.design.slots[studio.selectedSlot];
  $('panel-photo-picker').replaceChildren(...studio.photos.map((photo) => {
    const thumb = thumbButton(photo, () => placePhoto(photo));
    thumb.classList.toggle('selected', slot.photoId === photo.id);
    return thumb;
  }));
}

/** Selects a photo panel by its number (0-based). */
function selectSlot(index) {
  const count = activePanelCount(studio.design);
  studio.selectedSlot = ((index % count) + count) % count;
  buildPanelPhotoPicker();
  requestRender();
}

/** Brings the panel section in line with the selected slot. */
function syncPanelControls() {
  const count = activePanelCount(studio.design);
  if (studio.selectedSlot >= count) studio.selectedSlot = 0;
  const slot = studio.design.slots[studio.selectedSlot];
  $('panel-number').textContent = String(studio.selectedSlot + 1);
  $('panel-count').textContent = String(count);
  $('panel-zoom').value = String(slot.zoom);
  $('panel-flip').setAttribute('aria-pressed', String(slot.flip));
}

/** The size switch: one button per post size, with a little shape of its proportions. */
function buildSizeSwitch() {
  $('size-switch').replaceChildren(...POSTER_SIZES.map((size) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('role', 'radio');
    button.dataset.size = size.id;
    const shape = document.createElement('span');
    shape.className = 'shape';
    shape.style.width = `${Math.round((size.width / Math.max(size.width, size.height)) * 16)}px`;
    shape.style.height = `${Math.round((size.height / Math.max(size.width, size.height)) * 16)}px`;
    button.append(shape, `${size.width}×${size.height}`);
    button.addEventListener('click', () => {
      studio.design.sizeId = size.id;
      syncPickers();
      requestRender();
    });
    return button;
  }));
}

/** The layout picker: each layout drawn small at the current size, its title tile in sunset orange. */
function buildLayoutPicker() {
  const { width, height } = designSize(studio.design);
  $('layout-picker').replaceChildren(...POSTER_LAYOUTS.map((layout) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.layout = layout.id;
    const icon = document.createElement('canvas');
    icon.width = 72;
    icon.height = Math.round((72 * height) / width);
    drawLayoutIcon(icon, layout.id);
    button.append(icon, layout.name);
    button.addEventListener('click', () => {
      studio.design.layoutId = layout.id;
      syncPickers();
      buildPhotoStrip();
      requestRender();
    });
    return button;
  }));
}

/** A small diagram of a layout: dark borders, photo tiles in a sunset ramp, the title tile in orange. */
function drawLayoutIcon(canvas, layoutId) {
  const ctx = canvas.getContext('2d');
  const plan = layoutPoster(layoutId, canvas.width, canvas.height);
  ctx.fillStyle = '#0b0610';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  plan.panels.forEach((panel, i) => {
    const t = i / Math.max(1, plan.panels.length - 1);
    ctx.fillStyle = panel.kind === 'title' ? '#ff9a3c' : `hsl(${320 - t * 60}, 70%, ${38 + t * 22}%)`;
    tracePolygon(ctx, panel.polygon);
    ctx.fill();
    ctx.strokeStyle = '#0b0610';
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

/** The grade picker: a swatch of each grade's gradient map. */
function buildGradePicker() {
  $('grade-picker').replaceChildren(...COLOR_GRADES.map((grade) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.grade = grade.id;
    const swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = `linear-gradient(90deg, ${grade.map.join(', ')})`;
    const label = document.createElement('span');
    label.className = 'label';
    label.textContent = grade.name;
    button.append(swatch, label);
    button.addEventListener('click', () => {
      studio.design.gradeId = grade.id;
      syncPickers();
      requestRender();
    });
    return button;
  }));
}

/** The lettering style chips. */
function buildCaptionStylePicker() {
  $('caption-style-picker').replaceChildren(...CAPTION_STYLES.map((style) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.style = style.id;
    button.textContent = style.name;
    button.addEventListener('click', () => {
      studio.design.caption.style = style.id;
      syncPickers();
      requestRender();
    });
    return button;
  }));
}

/** The effect sliders, two to a row. */
function buildEffectSliders() {
  $('effect-sliders').replaceChildren(...EFFECT_SLIDERS.map(([key, name, min, max]) => {
    const label = document.createElement('label');
    label.className = 'slider';
    const input = document.createElement('input');
    Object.assign(input, { type: 'range', min, max, step: 0.01, id: `look-${key}` });
    input.addEventListener('input', () => {
      studio.design.look[key] = Number(input.value);
      requestRender();
    });
    label.append(name, input);
    return label;
  }));
}

/** Shows every control's current value from the design (after a size change, a surprise or a scene). */
function syncPickers() {
  const d = studio.design;
  document.querySelectorAll('#size-switch button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.size === d.sizeId)));
  buildLayoutPicker();
  document.querySelectorAll('#layout-picker button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layout === d.layoutId)));
  document.querySelectorAll('#grade-picker button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.grade === d.gradeId)));
  document.querySelectorAll('#caption-style-picker button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.style === d.caption.style)));
  $('caption-title').value = d.caption.title;
  $('caption-sub').value = d.caption.sub;
  $('caption-position').value = d.caption.position;
  $('caption-scale').value = String(d.caption.scale);
  $('look-alternate').checked = d.look.alternate;
  $('look-border-color').value = d.look.borderColor;
  for (const [key] of EFFECT_SLIDERS) $(`look-${key}`).value = String(d.look[key]);
}

/** A short message under the preview. */
function setStatus(text) {
  $('status').textContent = text;
}

/** Wires every control that is not rebuilt. */
function wireControls() {
  $('photo-input').addEventListener('change', (event) => {
    addPhotos(event.target.files);
    event.target.value = '';
  });
  $('samples-button').addEventListener('click', () => addSamplePhotos());
  $('fill-panels-button').addEventListener('click', () => {
    if (!studio.photos.length) return setStatus('Add a photo first.');
    fillPanelsFromPhotos(studio.design, studio.photos, freshSeed());
    buildPhotoStrip();
    requestRender();
  });
  $('panel-prev').addEventListener('click', () => selectSlot(studio.selectedSlot - 1));
  $('panel-next').addEventListener('click', () => selectSlot(studio.selectedSlot + 1));
  $('panel-zoom').addEventListener('input', (event) => {
    studio.design.slots[studio.selectedSlot].zoom = Number(event.target.value);
    requestRender();
  });
  $('panel-flip').addEventListener('click', () => {
    const slot = studio.design.slots[studio.selectedSlot];
    slot.flip = !slot.flip;
    requestRender();
  });
  $('panel-recenter').addEventListener('click', () => {
    const slot = studio.design.slots[studio.selectedSlot];
    const photo = studio.photosById.get(slot.photoId);
    if (photo) Object.assign(slot, smartCrops(photo, 1)[0]);
    requestRender();
  });
  $('caption-title').addEventListener('input', (event) => {
    studio.design.caption.title = event.target.value;
    requestRender();
  });
  $('caption-sub').addEventListener('input', (event) => {
    studio.design.caption.sub = event.target.value;
    requestRender();
  });
  $('caption-position').addEventListener('change', (event) => {
    studio.design.caption.position = event.target.value;
    requestRender();
  });
  $('caption-scale').addEventListener('input', (event) => {
    studio.design.caption.scale = Number(event.target.value);
    requestRender();
  });
  $('look-alternate').addEventListener('change', (event) => {
    studio.design.look.alternate = event.target.checked;
    requestRender();
  });
  $('look-border-color').addEventListener('change', (event) => {
    studio.design.look.borderColor = event.target.value;
    requestRender();
  });
  $('surprise-button').addEventListener('click', () => {
    surpriseDesign(studio.design, studio.photos, freshSeed());
    syncPickers();
    buildPhotoStrip();
    requestRender();
    const pressed = (id) => document.querySelector(`#${id} button[aria-pressed="true"]`)?.textContent ?? '';
    setStatus(`Surprise: ${pressed('layout-picker')} in ${pressed('grade-picker')}, ${pressed('caption-style-picker')} lettering.`);
  });
  $('export-button').addEventListener('click', async () => {
    setStatus('Rendering…');
    try {
      const saved = await exportPosterPng(studio.design, studio.photosById);
      setStatus(`Saved ${saved.name} (${saved.width}×${saved.height}, ${Math.round(saved.bytes / 1024)} KB)`);
    } catch (error) {
      setStatus(`Export failed: ${error.message}`);
    }
  });
  wireFileDrop();
  attachPanelEditor(preview, {
    getPanels: () => studio.panels,
    getSlot: (index) => studio.design.slots[index],
    getPhoto: (slot) => studio.photosById.get(slot.photoId),
    select: (index) => {
      if (index === studio.selectedSlot) return;
      studio.selectedSlot = index;
      buildPanelPhotoPicker();
      requestRender();
    },
    changed: requestRender,
  });
  window.addEventListener('resize', requestRender);
}

/** Drag and drop of image files anywhere on the page. */
function wireFileDrop() {
  let depth = 0;
  const hasFiles = (event) => [...(event.dataTransfer?.types ?? [])].includes('Files');
  window.addEventListener('dragenter', (event) => {
    if (!hasFiles(event)) return;
    depth++;
    document.body.classList.add('dragging-files');
  });
  window.addEventListener('dragleave', () => {
    depth = Math.max(0, depth - 1);
    if (!depth) document.body.classList.remove('dragging-files');
  });
  window.addEventListener('dragover', (event) => {
    if (hasFiles(event)) event.preventDefault();
  });
  window.addEventListener('drop', (event) => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    depth = 0;
    document.body.classList.remove('dragging-files');
    addPhotos(event.dataTransfer.files);
  });
}

/** Starts the studio: fonts first, then the controls, then either a screenshot scene or the samples. */
async function startStudio() {
  await loadPosterFonts();
  buildSizeSwitch();
  buildGradePicker();
  buildCaptionStylePicker();
  buildEffectSliders();
  wireControls();
  syncPickers();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runScreenshotScene(query, {
      studio, addSamplePhotos, syncPickers, buildPhotoStrip, selectSlot, renderPreview,
    });
    return;
  }
  setStatus('Add your photos, or try the samples.');
  await addSamplePhotos();
}

startStudio();
