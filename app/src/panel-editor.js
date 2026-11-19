// Direct editing on the live preview: click a panel to select it, drag to pan its photo, scroll to zoom, double-click
// to reset its crop, and drop a photo (from the computer or the photo strip) onto a panel to put it there.
import { pointInPolygon } from './geometry.js';

/** Which panel is under poster point (x, y): the last drawn wins, so turned cards beat the backdrop beneath. */
export function panelAt(layout, x, y) {
  for (let i = layout.panels.length - 1; i >= 0; i--) {
    if (pointInPolygon(x, y, layout.panels[i].poly)) return i;
  }
  return -1;
}

/**
 * Wires the preview canvas. `hooks` gives the current layout and poster and takes the edits:
 * { getLayout, getPoster, onSelect(i), onPan(i, dx, dy), onZoom(i, factor), onResetCrop(i),
 *   onDropFiles(i, files), onDropPhotoId(i, id) }.
 */
export function attachPanelEditor(canvas, hooks) {
  let drag = null;

  /** A pointer event's position in poster pixels. */
  const posterPoint = (e) => {
    const r = canvas.getBoundingClientRect();
    const poster = hooks.getPoster();
    return [((e.clientX - r.left) / r.width) * poster.w, ((e.clientY - r.top) / r.height) * poster.h];
  };

  canvas.addEventListener('pointerdown', (e) => {
    const [x, y] = posterPoint(e);
    const i = panelAt(hooks.getLayout(), x, y);
    if (i < 0) return;
    hooks.onSelect(i);
    drag = { i, x, y, id: e.pointerId };
    canvas.setPointerCapture(e.pointerId);
    canvas.classList.add('is-dragging');
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) {
      const [x, y] = posterPoint(e);
      canvas.style.cursor = panelAt(hooks.getLayout(), x, y) >= 0 ? 'grab' : 'default';
      return;
    }
    const [x, y] = posterPoint(e);
    hooks.onPan(drag.i, x - drag.x, y - drag.y);
    drag.x = x;
    drag.y = y;
  });
  const endDrag = () => {
    drag = null;
    canvas.classList.remove('is-dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener(
    'wheel',
    (e) => {
      const [x, y] = posterPoint(e);
      const i = panelAt(hooks.getLayout(), x, y);
      if (i < 0) return;
      e.preventDefault();
      hooks.onSelect(i);
      hooks.onZoom(i, Math.exp(-e.deltaY * 0.0015));
    },
    { passive: false },
  );

  canvas.addEventListener('dblclick', (e) => {
    const [x, y] = posterPoint(e);
    const i = panelAt(hooks.getLayout(), x, y);
    if (i >= 0) hooks.onResetCrop(i);
  });

  canvas.addEventListener('dragover', (e) => {
    e.preventDefault();
    const [x, y] = posterPoint(e);
    const i = panelAt(hooks.getLayout(), x, y);
    if (i >= 0) hooks.onSelect(i);
  });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const [x, y] = posterPoint(e);
    const i = panelAt(hooks.getLayout(), x, y);
    const id = e.dataTransfer.getData('text/x-photo-id');
    if (id) hooks.onDropPhotoId(i, id);
    else if (e.dataTransfer.files.length) hooks.onDropFiles(i, e.dataTransfer.files);
  });
}
