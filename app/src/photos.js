// Reads the person's photos on their own machine (file picker, drag and drop, or the bundled samples). Nothing is
// uploaded: each file becomes an object URL, is decoded, and is kept as a canvas no larger than the biggest poster
// panel needs, with a small thumbnail for the photo tray.

const MAX_PHOTO_SIDE = 2400;
let nextPhotoId = 1;

/** Loads an image element from a URL (an object URL or a file under app/). */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Could not read ${url}`));
    img.src = url;
  });
}

/** Draws an image into a canvas at most `maxSide` pixels on its long side. */
function shrinkToCanvas(img, maxSide) {
  const k = Math.min(1, maxSide / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round((img.naturalWidth || img.width) * k));
  canvas.height = Math.max(1, Math.round((img.naturalHeight || img.height) * k));
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/** True for a skin-like colour (a classic RGB skin rule), leaving out washed-out sky and very dark pixels. */
function looksLikeSkin(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return r > 95 && g > 40 && b > 20 && max - min > 15 && r - g > 15 && r > b && max < 250 && (r - b) / max < 0.62;
}

/**
 * Guesses where the person's face is, so automatic crops aim at it: among the connected patches of skin-coloured
 * pixels in a small copy of the photo, the one sized and shaped most like a face, preferring higher ones (a sunset
 * sky is skin-coloured too, but it is one huge patch). Returns a point in 0..1 photo coordinates, or the upper middle.
 */
export function estimateSubjectFocus(image) {
  const n = 72;
  const k = n / Math.max(image.width, image.height);
  const w = Math.max(1, Math.round(image.width * k));
  const h = Math.max(1, Math.round(image.height * k));
  const small = document.createElement('canvas');
  small.width = w;
  small.height = h;
  const ctx = small.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;
  const skin = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) skin[i] = looksLikeSkin(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) ? 1 : 0;
  const label = new Int32Array(w * h).fill(-1);
  let best = null;
  for (let start = 0; start < w * h; start++) {
    if (!skin[start] || label[start] >= 0) continue;
    // Flood-fill one patch, tracking its box and centre.
    const stack = [start];
    label[start] = start;
    let area = 0, sx = 0, sy = 0, x0 = w, y0 = h, x1 = 0, y1 = 0;
    while (stack.length) {
      const p = stack.pop();
      const x = p % w;
      const y = (p - x) / w;
      area++; sx += x; sy += y;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      for (const q of [p - 1, p + 1, p - w, p + w]) {
        if (q < 0 || q >= w * h || label[q] >= 0 || !skin[q]) continue;
        if ((q === p - 1 && x === 0) || (q === p + 1 && x === w - 1)) continue;
        label[q] = start;
        stack.push(q);
      }
    }
    const share = area / (w * h);
    const bw = x1 - x0 + 1;
    const bh = y1 - y0 + 1;
    const fill = area / (bw * bh);
    if (share < 0.005 || share > 0.14 || bh / bw < 0.6 || bh / bw > 2.6 || fill < 0.35) continue;
    const cy = (sy / area + 0.5) / h;
    const score = Math.sqrt(share) * fill * (1.25 - cy);
    // Faces merge with necks into one patch, so aim at its upper part rather than its centre.
    if (!best || score > best.score) best = { score, x: (sx / area + 0.5) / w, y: (y0 + bh * 0.28 + 0.5) / h };
  }
  return best ? { x: best.x, y: best.y } : { x: 0.5, y: 0.38 };
}

/** Turns a decoded image into a photo record: { id, name, image, thumb, focus }. */
export function makePhotoRecord(img, name) {
  const image = shrinkToCanvas(img, MAX_PHOTO_SIDE);
  return {
    id: nextPhotoId++,
    name,
    image,
    thumb: shrinkToCanvas(img, 160).toDataURL('image/jpeg', 0.8),
    focus: estimateSubjectFocus(image),
  };
}

/** Reads image files picked or dropped by the person, skipping anything that is not an image. */
export async function readPhotoFiles(files) {
  const photos = [];
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    try {
      photos.push(makePhotoRecord(await loadImageElement(url), file.name));
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  return photos;
}

/** Loads the two sample photos that ship in app/samples/. */
export async function loadSamplePhotos(names = ['boulevard', 'pier']) {
  const photos = [];
  for (const name of names) photos.push(makePhotoRecord(await loadImageElement(`samples/${name}.jpg`), `${name}.jpg`));
  return photos;
}
