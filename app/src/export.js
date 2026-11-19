// Export: draws the poster again at scale 1 on a canvas of exactly the chosen size and saves it as a PNG.
import { renderPoster } from './poster.js';

/** Renders the poster at its exact pixel size and resolves to a PNG blob. */
export function renderPosterPng(state) {
  const canvas = document.createElement('canvas');
  renderPoster(canvas, state, { pixelScale: 1 });
  if (canvas.width !== state.size.w || canvas.height !== state.size.h) throw new Error('export size mismatch');
  return new Promise((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('PNG encoding failed'))), 'image/png'));
}

/** A file name such as vice-beach-1920x1080.png from the title and size. */
export function exportFileName(state) {
  const slug = state.caption.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'sunset-poster';
  return `${slug}-${state.size.w}x${state.size.h}.png`;
}

/** Saves the poster as a PNG download. */
export async function exportPosterPng(state) {
  const blob = await renderPosterPng(state);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFileName(state);
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return a.download;
}
