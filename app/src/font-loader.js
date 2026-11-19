// Loads the two bundled OFL fonts (app/fonts/) under the names the caption code uses, before the first render,
// so canvas lettering never falls back to a system face. Their license texts sit beside them.
import { SCRIPT_FONT, TITLE_FONT } from './poster-caption.js';

const FONT_FILES = [
  [TITLE_FONT, 'fonts/anton/Anton-Regular.ttf'],
  [SCRIPT_FONT, 'fonts/pacifico/Pacifico-Regular.ttf'],
];

/** Loads and registers the poster fonts. Resolves once both can draw, or after any failure (with a fallback). */
export async function loadPosterFonts() {
  await Promise.all(FONT_FILES.map(async ([family, url]) => {
    try {
      const face = new FontFace(family, `url(${new URL(url, document.baseURI)})`);
      document.fonts.add(await face.load());
    } catch (error) {
      console.warn(`Font ${family} did not load; using a fallback.`, error);
    }
  }));
}
