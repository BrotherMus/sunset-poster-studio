// Direct editing on the live preview: click a panel to select it, drag to pan its photo, scroll to zoom it. The
// photo's focus point moves with the pointer and stays inside the range where the photo still covers the panel.
import { cropPlacement } from './render-poster.js';
import { pointInPolygon } from './poster-layouts.js';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

/**
 * Wires pointer and wheel editing onto the preview canvas. `hooks` gives getPanels() (the last rendered panels in
 * canvas pixels), getSlot(index), getPhoto(slot), select(index) and changed() to redraw after an edit.
 */
export function attachPanelEditor(canvas, hooks) {
  let drag = null;

  const toCanvasPoint = (event) => {
    const rect = canvas.getBoundingClientRect();
    return [((event.clientX - rect.left) * canvas.width) / rect.width, ((event.clientY - rect.top) * canvas.height) / rect.height];
  };

  const panelAt = ([x, y]) => {
    const panels = hooks.getPanels();
    for (let i = panels.length - 1; i >= 0; i--) {
      if (panels[i].kind === 'photo' && pointInPolygon(x, y, panels[i].polygon)) return panels[i];
    }
    return null;
  };

  canvas.addEventListener('pointerdown', (event) => {
    const point = toCanvasPoint(event);
    const panel = panelAt(point);
    if (!panel) return;
    hooks.select(panel.slot);
    const slot = hooks.getSlot(panel.slot);
    const photo = hooks.getPhoto(slot);
    if (!photo) return;
    canvas.setPointerCapture(event.pointerId);
    drag = { panel, start: point, fx: slot.fx, fy: slot.fy };
    canvas.classList.add('dragging');
  });

  canvas.addEventListener('pointermove', (event) => {
    const point = toCanvasPoint(event);
    if (!drag) {
      canvas.style.cursor = panelAt(point) ? 'grab' : 'default';
      return;
    }
    const slot = hooks.getSlot(drag.panel.slot);
    const photo = hooks.getPhoto(slot);
    if (!photo) return;
    const { w: bw, h: bh } = drag.panel.bounds;
    const placement = cropPlacement(photo, slot, bw, bh);
    const dx = (point[0] - drag.start[0]) / placement.w;
    const dy = (point[1] - drag.start[1]) / placement.h;
    slot.fx = clampFocus(drag.fx + (slot.flip ? dx : -dx), bw, placement.w);
    slot.fy = clampFocus(drag.fy - dy, bh, placement.h);
    hooks.changed();
  });

  const endDrag = () => {
    drag = null;
    canvas.classList.remove('dragging');
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  canvas.addEventListener('wheel', (event) => {
    const panel = panelAt(toCanvasPoint(event));
    if (!panel) return;
    event.preventDefault();
    hooks.select(panel.slot);
    const slot = hooks.getSlot(panel.slot);
    slot.zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, slot.zoom * Math.exp(-event.deltaY * 0.0015)));
    hooks.changed();
  }, { passive: false });
}

/** Keeps a focus fraction where a photo `size` pixels long still covers a panel `box` pixels long. */
function clampFocus(value, box, size) {
  const margin = Math.min(0.5, box / (2 * size));
  return Math.max(margin, Math.min(1 - margin, value));
}

export { MIN_ZOOM, MAX_ZOOM };
