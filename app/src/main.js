// Sunset Poster Studio: wires the editor. The poster state lives here; every control edits it and asks for a redraw
// of the live preview, and "Export PNG" draws it again at the exact chosen size. A `?shot=` query sets up a fixed
// scene for a screenshot instead (./shots.js).
import { LAYOUTS, buildLayout } from './layouts.js';
import { GRADES } from './grades.js';
import { renderPoster, exportPosterPng, exportFileName, panelCrop, DEFAULT_EFFECTS } from './poster-renderer.js';
import { panCrop, zoomCrop } from './photo-crop.js';
import { attachPanelEditor } from './panel-editor.js';
import { loadPhotoFile, loadPhotoUrl, imageFilesOf } from './photo-library.js';
import { surprisePoster, surpriseCrops } from './surprise.js';
import { mulberry32 } from './random.js';
import { TITLE_FONT, SCRIPT_FONT } from './caption-lettering.js';
import { runShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const canvas = $('poster-canvas');

/** Everything the poster is made of. Photos are referenced by id; panels[i] holds panel i's photo and crop. */
let poster = {
  w: 1920,
  h: 1080,
  layoutId: 'mosaic',
  gradeId: 'sunset',
  title: 'Sunset Heist',
  subline: 'one last job',
  captionPos: 'auto',
  titleScale: 1,
  slab: true,
  effects: { ...DEFAULT_EFFECTS },
  panels: [],
  seed: 1,
};
/** The photo library: { id, name, image, thumbUrl, sample } in the order they were added. */
let library = [];
let selected = 0;
let layout = buildLayout(poster.layoutId, poster.w, poster.h);
let renderQueued = false;

const drawables = () => new Map(library.map((p) => [p.id, p.image]));
const photoIds = () => library.map((p) => p.id);
const findPhoto = (id) => library.find((p) => p.id === id);
/** Panel i's crop as drawn: its own, or the starter crop for its place (wide for the hero). */
const cropOf = (i) => panelCrop(poster, i, photoIds(), !!layout.panels[i]?.hero);

/** Redraws the preview on the next frame (many edits in one frame draw once). */
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    drawPreview();
  });
}

/** Sizes the preview canvas to fit the stage and draws the poster into it at that scale. */
function drawPreview() {
  const frame = $('canvas-frame');
  const fit = Math.min(frame.clientWidth / poster.w, frame.clientHeight / poster.h);
  const cssW = Math.max(50, Math.floor(poster.w * fit));
  const cssH = Math.max(50, Math.floor(poster.h * fit));
  const scale = Math.min(1, (cssW * (window.devicePixelRatio || 1)) / poster.w);
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  layout = renderPoster(canvas, poster, drawables(), { scale, selected });
  if (selected >= layout.panels.length) {
    selected = 0;
    requestRender();
  }
  syncPanelControls();
}

/** Changes the poster and redraws. */
function updatePoster(changes) {
  poster = { ...poster, ...changes };
  requestRender();
}

/** Replaces panel i's photo and crop. */
function setPanel(i, crop) {
  const panels = [...poster.panels];
  for (let k = 0; k <= i; k++) panels[k] = panels[k] ?? cropOf(k);
  panels[i] = crop;
  updatePoster({ panels });
}

/** Panel i's crop with its photo and box, ready for panCrop / zoomCrop. */
function panelContext(i) {
  const crop = cropOf(i);
  const photo = findPhoto(crop.photoId)?.image;
  const bounds = layout.panels[i]?.bounds;
  return { crop, photo, bounds };
}

function selectPanel(i) {
  if (i === selected) return;
  selected = i;
  requestRender();
}

// ---------- Photos ----------

/** Adds image files. The first photos a person adds replace the demo samples. Returns the new photo ids. */
async function addPhotoFiles(files) {
  const images = imageFilesOf(files);
  if (!images.length) {
    showStatus('Those files are not images');
    return [];
  }
  const added = [];
  for (const file of images) {
    try {
      added.push(await loadPhotoFile(file));
    } catch {
      showStatus(`Could not read ${file.name}`);
    }
  }
  if (!added.length) return [];
  const onlySamples = library.every((p) => p.sample);
  library = onlySamples ? added : [...library, ...added];
  if (onlySamples) poster = { ...poster, panels: [] };
  renderPhotoStrip();
  requestRender();
  showStatus(`${added.length} photo${added.length > 1 ? 's' : ''} added`);
  return added.map((p) => p.id);
}

function removePhoto(id) {
  library = library.filter((p) => p.id !== id);
  poster = { ...poster, panels: poster.panels.map((c) => (c?.photoId === id ? { ...c, photoId: undefined } : c)) };
  renderPhotoStrip();
  requestRender();
}

/** Loads the sample photos that ship in app/samples/ (the demo and the screenshots). */
async function loadSamples(names) {
  const loaded = await Promise.all(names.map((n) => loadPhotoUrl(`samples/${n}.jpg`, n)));
  for (const p of loaded) p.sample = true;
  library = loaded;
  renderPhotoStrip();
  return Object.fromEntries(loaded.map((p) => [p.name, p.id]));
}

function renderPhotoStrip() {
  const strip = $('photo-strip');
  strip.replaceChildren();
  if (!library.length) {
    const note = document.createElement('p');
    note.className = 'empty-note';
    note.textContent = 'No photos yet: add one or more to fill the panels.';
    strip.append(note);
  }
  for (const photo of library) {
    const thumb = document.createElement('div');
    thumb.className = 'photo-thumb';
    thumb.dataset.photoId = photo.id;
    thumb.title = `${photo.name}: click to put it in the selected panel, or drag it onto a panel`;
    thumb.style.backgroundImage = `url("${photo.thumbUrl}")`;
    thumb.draggable = true;
    thumb.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/x-photo-id', photo.id));
    thumb.addEventListener('click', () => assignPhotoToPanel(selected, photo.id));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = '×';
    remove.title = 'Remove this photo';
    remove.addEventListener('click', (e) => {
      e.stopPropagation();
      removePhoto(photo.id);
    });
    thumb.append(remove);
    strip.append(thumb);
  }
}

function assignPhotoToPanel(i, photoId) {
  if (i < 0 || !findPhoto(photoId)) return;
  const { crop } = panelContext(i);
  setPanel(i, { ...crop, photoId });
}

// ---------- Panel controls ----------

function syncPanelControls() {
  const { crop } = panelContext(selected);
  $('panel-number').textContent = String(selected + 1);
  $('panel-count').textContent = `of ${layout.panels.length}${layout.panels[selected]?.hero ? ' · hero' : ''}`;
  const zoom = $('panel-zoom');
  if (document.activeElement !== zoom) zoom.value = String(crop.zoom ?? 1);
  const picker = $('panel-photo-picker');
  const ids = photoIds();
  if (picker.dataset.ids !== ids.join(',')) {
    picker.dataset.ids = ids.join(',');
    picker.replaceChildren(
      ...library.map((photo) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.dataset.photoId = photo.id;
        b.title = `Put ${photo.name} in this panel`;
        b.style.backgroundImage = `url("${photo.thumbUrl}")`;
        b.addEventListener('click', () => assignPhotoToPanel(selected, photo.id));
        return b;
      }),
    );
  }
  for (const b of picker.children) b.setAttribute('aria-pressed', String(b.dataset.photoId === crop.photoId));
  for (const t of $('photo-strip').children) t.classList.toggle('in-panel', t.dataset.photoId === crop.photoId);
}

$('panel-zoom').addEventListener('input', (e) => {
  const { crop, photo, bounds } = panelContext(selected);
  if (!photo || !bounds) return;
  setPanel(selected, zoomCrop(photo, bounds.w, bounds.h, crop, Number(e.target.value)));
});
$('reset-crop-button').addEventListener('click', () => resetCrop(selected));
$('fill-all-button').addEventListener('click', () => {
  const { crop } = panelContext(selected);
  if (!crop.photoId) return;
  const panels = layout.panels.map((_, i) => ({ ...cropOf(i), photoId: crop.photoId }));
  updatePoster({ panels });
  showStatus('One photo, every panel: drag each to frame a different detail');
});
$('shuffle-crops-button').addEventListener('click', () => {
  const rand = mulberry32((Math.random() * 2 ** 31) | 0);
  const heroes = layout.panels.flatMap((p, i) => (p.hero ? [i] : []));
  const fresh = surpriseCrops(rand, layout.panels.length, photoIds(), heroes);
  const panels = fresh.map((c, i) => ({ ...c, photoId: cropOf(i).photoId }));
  updatePoster({ panels });
});

function resetCrop(i) {
  const { crop } = panelContext(i);
  setPanel(i, { photoId: crop.photoId, zoom: 1, fx: 0.5, fy: 0.45 });
}

attachPanelEditor(canvas, {
  getLayout: () => layout,
  getPoster: () => poster,
  onSelect: selectPanel,
  onPan(i, dx, dy) {
    const { crop, photo, bounds } = panelContext(i);
    if (photo && bounds) setPanel(i, panCrop(photo, bounds.w, bounds.h, crop, dx, dy));
  },
  onZoom(i, factor) {
    const { crop, photo, bounds } = panelContext(i);
    if (photo && bounds) setPanel(i, zoomCrop(photo, bounds.w, bounds.h, crop, (crop.zoom ?? 1) * factor));
  },
  onResetCrop: resetCrop,
  async onDropFiles(i, files) {
    const ids = await addPhotoFiles(files);
    if (ids.length && i >= 0) assignPhotoToPanel(i, ids[0]);
  },
  onDropPhotoId: assignPhotoToPanel,
});

// ---------- Layout, grade, size, caption, effects ----------

/** Draws a small picture of each layout at the current poster shape for the layout buttons. */
function renderLayoutPicker() {
  const picker = $('layout-picker');
  picker.replaceChildren(
    ...LAYOUTS.map((l) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.layoutId = l.id;
      b.setAttribute('aria-pressed', String(l.id === poster.layoutId));
      const icon = document.createElement('canvas');
      const iw = 72, ih = Math.round((72 * poster.h) / poster.w);
      icon.width = iw * 2;
      icon.height = ih * 2;
      drawLayoutIcon(icon, l.id);
      const label = document.createElement('span');
      label.textContent = l.name;
      b.append(icon, label);
      b.addEventListener('click', () => {
        updatePoster({ layoutId: l.id });
        selected = 0;
        renderLayoutPicker();
      });
      return b;
    }),
  );
}

function drawLayoutIcon(icon, layoutId) {
  const ctx = icon.getContext('2d');
  const s = icon.width / poster.w;
  const l = buildLayout(layoutId, poster.w, poster.h, 1.6);
  ctx.fillStyle = '#0b0612';
  ctx.fillRect(0, 0, icon.width, icon.height);
  const tints = ['#ff3d8b', '#ff9a3c', '#3ff6ff', '#b36bff', '#ffd35e'];
  l.panels.forEach((p, i) => {
    ctx.beginPath();
    p.poly.forEach(([x, y], k) => (k ? ctx.lineTo(x * s, y * s) : ctx.moveTo(x * s, y * s)));
    ctx.closePath();
    ctx.fillStyle = p.hero ? '#ff6a5a' : tints[i % tints.length];
    ctx.globalAlpha = p.hero ? 1 : 0.75;
    ctx.fill();
    if (p.card) {
      ctx.globalAlpha = 1;
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#fff4e6';
      ctx.stroke();
    }
  });
}

function renderGradePicker() {
  $('grade-picker').replaceChildren(
    ...GRADES.map((g) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-pressed', String(g.id === poster.gradeId));
      const swatch = document.createElement('span');
      swatch.className = 'swatch';
      const stops = g.maps.map((m) => m[Math.floor(m.length / 2)][1]);
      swatch.style.background = `linear-gradient(90deg, ${g.maps[0][0][1]}, ${stops.join(', ')}, ${g.maps[0][g.maps[0].length - 1][1]})`;
      const name = document.createElement('span');
      name.className = 'name';
      name.textContent = g.name;
      b.append(swatch, name);
      b.addEventListener('click', () => {
        updatePoster({ gradeId: g.id });
        renderGradePicker();
      });
      return b;
    }),
  );
}

function syncSizeSwitch() {
  for (const b of $('size-switch').children) b.setAttribute('aria-checked', String(b.dataset.size === `${poster.w}x${poster.h}`));
}
$('size-switch').addEventListener('click', (e) => {
  const b = e.target.closest('button[data-size]');
  if (!b) return;
  const [w, h] = b.dataset.size.split('x').map(Number);
  updatePoster({ w, h });
  syncSizeSwitch();
  renderLayoutPicker();
});

$('title-input').addEventListener('input', (e) => updatePoster({ title: e.target.value }));
$('subline-input').addEventListener('input', (e) => updatePoster({ subline: e.target.value }));
$('caption-position').addEventListener('change', (e) => updatePoster({ captionPos: e.target.value }));
$('slab-toggle').addEventListener('change', (e) => updatePoster({ slab: e.target.checked }));
$('title-size').addEventListener('input', (e) => updatePoster({ titleScale: Number(e.target.value) }));

for (const input of document.querySelectorAll('[data-effect]')) {
  input.addEventListener('input', () => {
    const value = input.type === 'checkbox' ? input.checked : Number(input.value);
    updatePoster({ effects: { ...poster.effects, [input.dataset.effect]: value } });
  });
}

/** Puts the poster's values back into every control (after Surprise me or a shot scene). */
function syncControls() {
  $('title-input').value = poster.title;
  $('subline-input').value = poster.subline;
  $('caption-position').value = poster.captionPos;
  $('slab-toggle').checked = poster.slab !== false;
  $('title-size').value = String(poster.titleScale ?? 1);
  for (const input of document.querySelectorAll('[data-effect]')) {
    const v = poster.effects[input.dataset.effect];
    if (input.type === 'checkbox') input.checked = !!v;
    else input.value = String(v);
  }
  syncSizeSwitch();
  renderLayoutPicker();
  renderGradePicker();
}

// ---------- Surprise, export, drop anywhere ----------

$('surprise-button').addEventListener('click', () => {
  poster = surprisePoster(poster, photoIds(), (Math.random() * 2 ** 31) | 0);
  selected = 0;
  syncControls();
  requestRender();
});

$('export-button').addEventListener('click', async () => {
  const button = $('export-button');
  button.disabled = true;
  try {
    const blob = await exportPosterPng(poster, drawables());
    const name = exportFileName(poster);
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    showStatus(`Saved ${name} · ${poster.w} × ${poster.h}`);
  } finally {
    button.disabled = false;
  }
});

$('photo-input').addEventListener('change', async (e) => {
  await addPhotoFiles(e.target.files);
  e.target.value = '';
});
window.addEventListener('dragover', (e) => {
  e.preventDefault();
  document.body.classList.add('is-dropping');
});
window.addEventListener('dragleave', (e) => {
  if (!e.relatedTarget) document.body.classList.remove('is-dropping');
});
window.addEventListener('drop', async (e) => {
  e.preventDefault();
  document.body.classList.remove('is-dropping');
  if (e.dataTransfer.files.length) await addPhotoFiles(e.dataTransfer.files);
});
window.addEventListener('resize', requestRender);

let statusTimer;
function showStatus(text) {
  const el = $('status');
  el.textContent = text;
  el.classList.add('is-visible');
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => el.classList.remove('is-visible'), 2600);
}

// ---------- Start ----------

async function start() {
  await Promise.all([document.fonts.load(`80px ${TITLE_FONT}`), document.fonts.load(`80px ${SCRIPT_FONT}`)]);
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    await runShot(query, {
      loadSamples,
      setPoster(next) {
        poster = { ...poster, ...next, effects: { ...DEFAULT_EFFECTS, ...(next.effects ?? {}) } };
        syncControls();
      },
      select(i) {
        selected = i;
      },
      draw: drawPreview,
      exportBlob: () => exportPosterPng(poster, drawables()),
    });
    return;
  }
  await loadSamples(['boulevard', 'pier']);
  syncControls();
  requestRender();
}

renderPhotoStrip();
start();
