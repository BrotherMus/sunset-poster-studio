// Export: renders the design afresh at the exact post size (no editor marks) and saves it as a PNG download,
// named for its size. Nothing leaves the machine: the file is made in the page and handed to the browser.
import { designSize } from './poster-design.js';
import { renderPoster } from './render-poster.js';

/** A new canvas holding the finished poster at full size. */
export function renderPosterAtFullSize(design, photosById) {
  const { width, height } = designSize(design);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  renderPoster(canvas, design, photosById);
  return canvas;
}

/** A file name such as sunset-poster-sunset-heist-1920x1080.png. */
export function exportFileName(design) {
  const { width, height } = designSize(design);
  const slug = (design.caption.title || 'poster').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
  return `sunset-poster-${slug || 'poster'}-${width}x${height}.png`;
}

/** Renders and downloads the poster PNG. Resolves to {name, width, height, bytes}. */
export async function exportPosterPng(design, photosById) {
  const canvas = renderPosterAtFullSize(design, photosById);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('PNG encoding failed'))), 'image/png'));
  const name = exportFileName(design);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
  return { name, width: canvas.width, height: canvas.height, bytes: blob.size };
}
