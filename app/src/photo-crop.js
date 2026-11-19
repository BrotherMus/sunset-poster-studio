// Crops a photo into a panel. A panel's crop is { zoom, fx, fy }: zoom 1 just covers the panel's box, higher zooms
// in; (fx, fy) is the point of the photo (0..1 across and down) placed at the panel's centre. Dragging moves that
// point, the wheel or slider changes zoom, and the crop is always clamped so the photo covers the whole panel.

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 5;

/** The scale and top-left corner at which `photo` is drawn to cover a box of bw x bh with this crop. */
export function cropPlacement(photo, bw, bh, crop) {
  const iw = photo.width, ih = photo.height;
  const scale = Math.max(bw / iw, bh / ih) * clampZoom(crop.zoom);
  const { fx, fy } = clampFocus(photo, bw, bh, crop);
  return { scale, x: bw / 2 - fx * iw * scale, y: bh / 2 - fy * ih * scale };
}

export function clampZoom(zoom) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number.isFinite(zoom) ? zoom : 1));
}

/** The crop's focus point, moved just enough that the photo still covers the box at this zoom. */
export function clampFocus(photo, bw, bh, crop) {
  const iw = photo.width, ih = photo.height;
  const scale = Math.max(bw / iw, bh / ih) * clampZoom(crop.zoom);
  const hx = bw / (2 * iw * scale);
  const hy = bh / (2 * ih * scale);
  return {
    fx: Math.min(1 - hx, Math.max(hx, crop.fx ?? 0.5)),
    fy: Math.min(1 - hy, Math.max(hy, crop.fy ?? 0.5)),
  };
}

/** Draws the cropped photo filling a bw x bh box at (0, 0) of the context. */
export function drawPhotoCrop(ctx, photo, bw, bh, crop) {
  const { scale, x, y } = cropPlacement(photo, bw, bh, crop);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(photo, x, y, photo.width * scale, photo.height * scale);
}

/** Pans a crop by a drag of (dx, dy) poster pixels over a panel box of bw x bh; returns the new crop. */
export function panCrop(photo, bw, bh, crop, dx, dy) {
  const scale = Math.max(bw / photo.width, bh / photo.height) * clampZoom(crop.zoom);
  const moved = { ...crop, fx: crop.fx - dx / (photo.width * scale), fy: crop.fy - dy / (photo.height * scale) };
  return { ...moved, ...clampFocus(photo, bw, bh, moved) };
}

/** Zooms a crop to `zoom`, keeping its focus point where it can; returns the new crop. */
export function zoomCrop(photo, bw, bh, crop, zoom) {
  const next = { ...crop, zoom: clampZoom(zoom) };
  return { ...next, ...clampFocus(photo, bw, bh, next) };
}
