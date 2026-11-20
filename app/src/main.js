// Sunset Poster Studio: wires the editor. Photos in (picker, drop, samples) -> panels (source, crop, role tag, stamp)
// -> caption, poster extras, layout, grade and effects -> live preview -> Export PNG at the exact size. A `?shot=`
// query sets up a fixed scene for screenshots.
import { LAYOUTS, buildLayout, countLayoutPanels } from './layouts.js';
import { GRADES, findGrade, gradeSwatchCss } from './grades.js';
import { SCENES } from './scenes.js';
import { renderPoster } from './poster.js';
import { loadLetteringFonts } from './lettering.js';
import { readPhotoFiles, loadSamplePhotos } from './photos.js';
import { attachPanelEditing } from './panel-drag.js';
import { exportPosterPng, renderPosterPng } from './export.js';
import { runShot } from './shots.js';
import {
  POSTER_SIZES, addPhotos, assignPhotoToPanel, createPosterState, defaultCrop, fillPanelsFromPhoto, removePhoto,
  spreadPhotosAcrossPanels, surprisePoster, visiblePanelCount,
} from './state.js';

const state = createPosterState();
const $ = (id) => document.getElementById(id);
const canvas = $('poster');
const wrap = $('canvas-wrap');
const status = $('status');
let currentLayout = null;
let activePhoto = 0;
let renderQueued = false;
let shotMode = null;

/** Sizes the preview to fit the stage and redraws it on the next frame. */
function requestRender() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => {
    renderQueued = false;
    drawPreview();
  });
}

function drawPreview() {
  const { w, h } = state.size;
  if (shotMode === 'cover') {
    currentLayout = renderPoster(canvas, state, { pixelScale: 1 });
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    return;
  }
  const box = wrap.getBoundingClientRect();
  const fit = Math.min((box.width - 4) / w, (box.height - 4) / h);
  if (!(fit > 0)) return; // the stage has no size yet (first frame, or a hidden tab)
  const pixelScale = Math.min(1, fit * (window.devicePixelRatio || 1));
  currentLayout = renderPoster(canvas, state, { pixelScale, highlight: state.selected });
  canvas.style.width = `${Math.floor(w * fit)}px`;
  canvas.style.height = `${Math.floor(h * fit)}px`;
}

/** Everything that changes the poster goes through here: redraw and refresh the controls that mirror state. */
function update({ controls = true } = {}) {
  if (state.selected >= visiblePanelCount(state)) state.selected = 0;
  if (controls) syncControls();
  requestRender();
}

function setStatus(text) {
  status.textContent = text;
}

// ---- Size switch -----------------------------------------------------------------------------------------------
function buildSizeSwitch() {
  const names = { square: 'Square', portrait: 'Portrait', wide: 'Wide' };
  for (const size of POSTER_SIZES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.size = size.id;
    b.innerHTML = `${names[size.id]}<small>${size.label}</small>`;
    b.addEventListener('click', () => {
      state.size = { ...size };
      buildLayoutList();
      update();
    });
    $('size-switch').append(b);
  }
}

// ---- Photo tray ------------------------------------------------------------------------------------------------
function renderPhotoTray() {
  const tray = $('photo-tray');
  tray.replaceChildren();
  state.photos.forEach((photo, i) => {
    const used = state.panels.slice(0, visiblePanelCount(state)).filter((p) => p.source === `photo:${i}`).length;
    const b = document.createElement('div');
    b.className = `thumb${i === activePhoto ? ' active' : ''}`;
    b.draggable = true;
    b.title = `${photo.name}: click to put it in the selected panel, or drag it onto a panel`;
    b.innerHTML = `<img alt="" src="${photo.thumb}"><span class="count">×${used}</span><button class="remove" type="button" title="Remove photo">×</button>`;
    b.addEventListener('click', (event) => {
      if (event.target.classList.contains('remove')) {
        removePhoto(state, i);
        activePhoto = Math.max(0, Math.min(activePhoto, state.photos.length - 1));
        update();
        return;
      }
      activePhoto = i;
      assignPhotoToPanel(state, state.selected, i);
      setStatus(`Photo ${i + 1} is in panel ${state.selected + 1}. Drag on the poster to move it.`);
      update();
    });
    b.addEventListener('dragstart', (event) => event.dataTransfer.setData('text/x-photo-index', String(i)));
    tray.append(b);
  });
}

async function takePhotos(files, panelIndex = -1) {
  const photos = await readPhotoFiles(files);
  if (!photos.length) {
    setStatus('Those files are not images this browser can read.');
    return;
  }
  const first = state.photos.length;
  addPhotos(state, photos);
  if (panelIndex >= 0) {
    assignPhotoToPanel(state, panelIndex, first);
    state.selected = panelIndex;
  }
  activePhoto = first;
  setStatus(`${photos.length} photo${photos.length > 1 ? 's' : ''} added. Click a panel, then drag to crop or scroll to zoom.`);
  update();
}

// ---- Layout and grade pickers ----------------------------------------------------------------------------------
/** Draws a layout's panels as a small diagram in the picker, in the current poster shape. */
function drawLayoutThumb(thumb, layoutId) {
  const k = 96 / Math.max(state.size.w, state.size.h);
  thumb.width = Math.round(state.size.w * k);
  thumb.height = Math.round(state.size.h * k);
  const ctx = thumb.getContext('2d');
  const built = buildLayout(layoutId, thumb.width, thumb.height, 4);
  ctx.fillStyle = '#0a0410';
  ctx.fillRect(0, 0, thumb.width, thumb.height);
  const colors = ['#ff9a3c', '#ff5f6d', '#d4357f', '#8a3bd1', '#3fb6e0', '#ffc46b', '#ff7a9a', '#5ad6c8'];
  built.panels.forEach((panel, i) => {
    if (panel.poly.length < 3) return;
    ctx.beginPath();
    panel.poly.forEach((p, j) => (j ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    ctx.closePath();
    ctx.fillStyle = colors[i % colors.length];
    ctx.fill();
    if (panel.floating) {
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0a0410';
      ctx.stroke();
    }
  });
}

function buildLayoutList() {
  const list = $('layout-list');
  list.replaceChildren();
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.layout = layout.id;
    b.title = `${layout.name}: ${countLayoutPanels(layout)} panels`;
    const thumb = document.createElement('canvas');
    drawLayoutThumb(thumb, layout.id);
    b.append(thumb, layout.name);
    b.addEventListener('click', () => {
      state.layoutId = layout.id;
      update();
    });
    list.append(b);
  }
}

function buildGradeList() {
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.grade = grade.id;
    b.style.background = gradeSwatchCss(grade);
    b.textContent = grade.name;
    b.addEventListener('click', () => {
      state.gradeId = grade.id;
      update();
    });
    $('grade-list').append(b);
  }
}

// ---- Panel inspector -------------------------------------------------------------------------------------------
function syncPanelInspector() {
  const panel = state.panels[state.selected];
  $('panel-number').textContent = `${state.selected + 1} of ${visiblePanelCount(state)}`;
  const select = $('panel-source');
  select.replaceChildren();
  state.photos.forEach((photo, i) => select.add(new Option(`Photo ${i + 1} · ${photo.name}`, `photo:${i}`)));
  SCENES.forEach((scene) => select.add(new Option(`Scene · ${scene.name}`, `scene:${scene.id}`)));
  select.value = panel.source;
  $('panel-zoom').value = panel.crop.zoom;
  $('panel-role').value = state.roles[state.selected] ?? '';
  $('panel-stamp').value = state.stamps[state.selected] ?? '';
  const isPhoto = panel.source.startsWith('photo:');
  $('panel-zoom').disabled = !isPhoto;
  $('panel-flip').disabled = !isPhoto;
}

function selectPanel(index) {
  state.selected = index;
  syncPanelInspector();
  requestRender();
}

// ---- Keeping controls in step with the state -------------------------------------------------------------------
function syncControls() {
  for (const b of $('size-switch').children) b.classList.toggle('active', b.dataset.size === state.size.id);
  for (const b of $('layout-list').children) b.classList.toggle('active', b.dataset.layout === state.layoutId);
  for (const b of $('grade-list').children) b.classList.toggle('active', b.dataset.grade === state.gradeId);
  for (const b of $('caption-position').children) b.classList.toggle('active', b.dataset.value === state.caption.position);
  $('caption-title').value = state.caption.title;
  $('caption-sub').value = state.caption.sub;
  $('caption-tag').value = state.caption.tag;
  $('caption-scale').value = state.caption.scale;
  $('caption-slab').checked = state.caption.slab;
  for (const key of Object.keys(state.fx)) $(`fx-${key}`).value = state.fx[key];
  for (const input of document.querySelectorAll('[data-extra]')) input.checked = Boolean(state.extras[input.dataset.extra]);
  for (const input of document.querySelectorAll('[data-extra-text]')) input.value = state.extras[input.dataset.extraText];
  renderPhotoTray();
  syncPanelInspector();
}

function wireControls() {
  $('photo-input').addEventListener('change', (event) => {
    takePhotos(event.target.files);
    event.target.value = '';
  });
  const zone = $('dropzone');
  zone.addEventListener('dragover', (event) => {
    event.preventDefault();
    zone.classList.add('over');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('over'));
  zone.addEventListener('drop', (event) => {
    event.preventDefault();
    zone.classList.remove('over');
    takePhotos(event.dataTransfer.files);
  });
  $('use-samples').addEventListener('click', async () => {
    addPhotos(state, await loadSamplePhotos());
    setStatus('Sample photos added.');
    update();
  });
  $('spread-photos').addEventListener('click', () => {
    if (!state.photos.length) return setStatus('Add a photo first.');
    spreadPhotosAcrossPanels(state);
    update();
  });
  $('fill-one').addEventListener('click', () => {
    if (!state.photos.length) return setStatus('Add a photo first.');
    fillPanelsFromPhoto(state, activePhoto);
    setStatus(`Every panel now shows photo ${activePhoto + 1}, each with its own crop.`);
    update();
  });

  for (const [id, key] of [['caption-title', 'title'], ['caption-sub', 'sub'], ['caption-tag', 'tag']]) {
    $(id).addEventListener('input', (event) => {
      state.caption[key] = event.target.value;
      update({ controls: false });
    });
  }
  $('caption-scale').addEventListener('input', (event) => {
    state.caption.scale = Number(event.target.value);
    update({ controls: false });
  });
  $('caption-slab').addEventListener('change', (event) => {
    state.caption.slab = event.target.checked;
    update({ controls: false });
  });
  for (const b of $('caption-position').children) {
    b.addEventListener('click', () => {
      state.caption.position = b.dataset.value;
      update();
    });
  }
  for (const key of Object.keys(state.fx)) {
    $(`fx-${key}`).addEventListener('input', (event) => {
      state.fx[key] = Number(event.target.value);
      update({ controls: false });
    });
  }

  // Poster extras: each switch and each text goes straight into state.extras.
  for (const input of document.querySelectorAll('[data-extra]')) {
    input.addEventListener('change', () => {
      state.extras[input.dataset.extra] = input.checked;
      update({ controls: false });
    });
  }
  for (const input of document.querySelectorAll('[data-extra-text]')) {
    input.addEventListener(input.tagName === 'SELECT' ? 'change' : 'input', () => {
      state.extras[input.dataset.extraText] = input.value;
      update({ controls: false });
    });
  }
  $('panel-role').addEventListener('input', (event) => {
    state.roles[state.selected] = event.target.value;
    update({ controls: false });
  });
  $('panel-stamp').addEventListener('input', (event) => {
    state.stamps[state.selected] = event.target.value;
    update({ controls: false });
  });

  $('panel-source').addEventListener('change', (event) => {
    state.panels[state.selected] = { source: event.target.value, crop: defaultCrop() };
    update();
  });
  $('panel-zoom').addEventListener('input', (event) => {
    state.panels[state.selected].crop.zoom = Number(event.target.value);
    update({ controls: false });
  });
  $('panel-flip').addEventListener('click', () => {
    const crop = state.panels[state.selected].crop;
    crop.flip = !crop.flip;
    update();
  });
  $('panel-reset').addEventListener('click', () => {
    state.panels[state.selected].crop = defaultCrop();
    update();
  });
  $('panel-next').addEventListener('click', () => selectPanel((state.selected + 1) % visiblePanelCount(state)));

  $('surprise').addEventListener('click', () => {
    surprisePoster(state, Date.now(), !state.caption.title.trim());
    buildLayoutList();
    setStatus(`Surprise: ${LAYOUTS.find((l) => l.id === state.layoutId).name} with the ${findGrade(state.gradeId).name} grade.`);
    update();
  });
  $('export').addEventListener('click', async () => {
    setStatus('Rendering the PNG…');
    try {
      const name = await exportPosterPng(state);
      setStatus(`Saved ${name} (${state.size.w} × ${state.size.h}).`);
    } catch (error) {
      setStatus(`Export failed: ${error.message}`);
    }
  });

  attachPanelEditing(canvas, wrap, {
    getState: () => state,
    getLayout: () => currentLayout,
    onSelect: selectPanel,
    onChange: () => {
      $('panel-zoom').value = state.panels[state.selected].crop.zoom;
      update({ controls: false });
    },
    onDropFiles: (files, panelIndex) => takePhotos(files, panelIndex),
    onDropTrayPhoto: (photoIndex, panelIndex) => {
      assignPhotoToPanel(state, panelIndex, photoIndex);
      state.selected = panelIndex;
      update();
    },
  });
  window.addEventListener('resize', requestRender);
}

async function start() {
  buildSizeSwitch();
  buildLayoutList();
  buildGradeList();
  wireControls();
  await loadLetteringFonts();
  const query = new URLSearchParams(location.search);
  if (query.get('shot')) {
    shotMode = query.get('shot');
    await runShot(query, { state, loadSamplePhotos, addPhotos, fillPanelsFromPhoto, spreadPhotosAcrossPanels, surprisePoster, rebuild: buildLayoutList });
  }
  update();
  // A handle for automation and checks: the live state and the exact-size PNG renderer.
  window.posterStudio = { state, renderPosterPng, update };
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}

start();
