// Direct editing on the preview canvas: click a panel to select it, drag to pan its photo, scroll (or pinch-zoom
// trackpad) to zoom it, and drop a photo file or a tray thumbnail onto a panel to put it there.
import { pointInPolygon } from './geometry.js';
import { placePhotoInFrame, resolvePanelSource } from './poster.js';

/** Converts a pointer event to poster coordinates. */
function posterPoint(canvas, state, event) {
  const r = canvas.getBoundingClientRect();
  return { x: ((event.clientX - r.left) / r.width) * state.size.w, y: ((event.clientY - r.top) / r.height) * state.size.h };
}

/** Finds the top-most panel under a poster point (floating cards first, as they sit on top). */
export function findPanelAt(layout, point) {
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    const panel = layout.panels[i];
    if (panel.poly.length > 2 && pointInPolygon(point, panel.poly)) return panel;
  }
  return null;
}

/** Moves a panel's focus point by a drag of (dx, dy) poster pixels. */
export function panPanelPhoto(state, panel, dx, dy) {
  const src = resolvePanelSource(state, panel.index);
  if (src.kind !== 'photo') return false;
  const crop = state.panels[panel.index].crop;
  // Undo the card's turn so the photo follows the pointer on a tilted card too.
  const r = (-panel.frame.rot * Math.PI) / 180;
  let lx = dx * Math.cos(r) - dy * Math.sin(r);
  const ly = dx * Math.sin(r) + dy * Math.cos(r);
  if (crop.flip) lx = -lx;
  const place = placePhotoInFrame(src.photo.image, panel.frame, crop);
  crop.fx = place.fx - lx / place.w;
  crop.fy = place.fy - ly / place.h;
  const clamped = placePhotoInFrame(src.photo.image, panel.frame, crop);
  crop.fx = clamped.fx;
  crop.fy = clamped.fy;
  return true;
}

/**
 * Wires pointer, wheel and drop handling on the preview canvas. `hooks` gives getState(), getLayout(),
 * onSelect(index), onChange() and onDropFiles(files, panelIndex).
 */
export function attachPanelEditing(canvas, wrap, hooks) {
  let drag = null;

  canvas.addEventListener('pointerdown', (event) => {
    const state = hooks.getState();
    const point = posterPoint(canvas, state, event);
    const panel = findPanelAt(hooks.getLayout(), point);
    if (!panel) return;
    hooks.onSelect(panel.index);
    drag = { panel, last: point };
    canvas.setPointerCapture(event.pointerId);
    canvas.classList.add('dragging');
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag) return;
    const state = hooks.getState();
    const point = posterPoint(canvas, state, event);
    if (panPanelPhoto(state, drag.panel, point.x - drag.last.x, point.y - drag.last.y)) hooks.onChange();
    drag.last = point;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    const state = hooks.getState();
    const panel = findPanelAt(hooks.getLayout(), posterPoint(canvas, state, event));
    if (!panel) return;
    event.preventDefault();
    if (state.selected !== panel.index) hooks.onSelect(panel.index);
    const crop = state.panels[panel.index].crop;
    crop.zoom = Math.min(4, Math.max(1, crop.zoom * Math.exp(-event.deltaY * 0.0015)));
    hooks.onChange();
  }, { passive: false });

  // Drops: files from the desktop, or a thumbnail dragged from the photo tray.
  wrap.addEventListener('dragover', (event) => {
    event.preventDefault();
    wrap.classList.add('over');
  });
  wrap.addEventListener('dragleave', () => wrap.classList.remove('over'));
  wrap.addEventListener('drop', (event) => {
    event.preventDefault();
    wrap.classList.remove('over');
    const state = hooks.getState();
    const panel = findPanelAt(hooks.getLayout(), posterPoint(canvas, state, event));
    const trayIndex = event.dataTransfer.getData('text/x-photo-index');
    if (trayIndex !== '' && panel) {
      hooks.onDropTrayPhoto(Number(trayIndex), panel.index);
    } else if (event.dataTransfer.files.length) {
      hooks.onDropFiles(event.dataTransfer.files, panel ? panel.index : -1);
    }
  });
}
