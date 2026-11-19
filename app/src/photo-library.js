// The person's photos, read on their own machine: from the file picker, a drop on the page, or (for the demo and
// the screenshots) the two sample photos under app/samples/. Nothing is uploaded: files are decoded in the browser.

let nextPhotoId = 1;

/** Decodes an image File into a photo { id, name, image, thumbUrl }. */
export async function loadPhotoFile(file) {
  const thumbUrl = URL.createObjectURL(file);
  let image;
  try {
    image = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    image = await loadImageElement(thumbUrl);
  }
  return { id: `p${nextPhotoId++}`, name: file.name.replace(/\.[^.]+$/, ''), image, thumbUrl };
}

/** Loads a photo that ships with the app (a path under app/) into a photo record. */
export async function loadPhotoUrl(url, name) {
  const image = await loadImageElement(url);
  return { id: `p${nextPhotoId++}`, name, image, thumbUrl: url };
}

/** An <img> for a URL, resolved once it has decoded. */
export function loadImageElement(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not read ${url}`));
    img.src = url;
  });
}

/** The image files among a FileList or DataTransfer's files. */
export function imageFilesOf(files) {
  return [...(files ?? [])].filter((f) => f.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(f.name));
}
