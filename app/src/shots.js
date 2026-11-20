// Reproducible scenes for screenshots. ?shot=cover draws the poster alone at its exact pixel size (what Export PNG
// writes); ?shot=editor shows the whole editor. Other keys set the scene:
//   size=square|portrait|wide  layout=<id>  grade=<id>  photos=boulevard,pier (samples under app/samples/)
//   fill=spread|scenes|one-<n>  src=photo:0,scene:palm-highway,...  crop=fx/fy/zoom[/f],...  (per panel, in order)
//   title= sub= tag= pos=auto|top|center|bottom  scale=<lettering size>  seed=<n> (runs Surprise me)  select=<panel>
//   strength= grain= vignette= glow= border=  slab=1 (the coloured slab behind the title)
//   roles=THE BOSS,THE DRIVER,...  stamps=,CORAL CAUSEWAY · 7:15 PM,...  (per panel, in order; empty keeps none)
//   quote= source= vol= seal= edge=jagged|scalloped sealspot=title|corner tagline= credits=  off=quote,seal,...  on=rays,...
import { POSTER_SIZES, defaultCrop } from './state.js';

const EXTRA_TEXT = { quote: 'quoteText', source: 'quoteSource', vol: 'vol', seal: 'sealText', edge: 'sealEdge', sealspot: 'sealSpot', tagline: 'taglineText', credits: 'creditsText' };

/** Applies the query's scene to the editor state; `api` passes the editor's own actions. */
export async function runShot(query, api) {
  const { state } = api;
  if (query.get('shot') === 'cover') document.body.classList.add('shot-cover');
  const size = POSTER_SIZES.find((s) => s.id === query.get('size'));
  if (size) state.size = { ...size };

  const samples = (query.get('photos') ?? 'boulevard,pier').split(',').filter(Boolean);
  if (samples.length) api.addPhotos(state, await api.loadSamplePhotos(samples));

  const fill = query.get('fill') ?? 'spread';
  if (fill === 'spread') api.spreadPhotosAcrossPanels(state);
  else if (fill === 'scenes') api.spreadPhotosAcrossPanels(state, true);
  else if (fill.startsWith('one-')) api.fillPanelsFromPhoto(state, Number(fill.slice(4)));

  if (query.has('seed')) api.surprisePoster(state, Number(query.get('seed')));
  if (query.has('layout')) state.layoutId = query.get('layout');
  if (query.has('grade')) state.gradeId = query.get('grade');

  (query.get('src') ?? '').split(',').forEach((source, i) => {
    if (source) state.panels[i] = { source, crop: defaultCrop() };
  });
  (query.get('crop') ?? '').split(',').forEach((spec, i) => {
    if (!spec) return;
    const [fx, fy, zoom, flip] = spec.split('/');
    state.panels[i].crop = { fx: Number(fx), fy: Number(fy), zoom: Number(zoom ?? 1), flip: flip === 'f' };
  });

  for (const key of ['title', 'sub', 'tag']) if (query.has(key)) state.caption[key] = query.get(key);
  if (query.has('pos')) state.caption.position = query.get('pos');
  if (query.has('scale')) state.caption.scale = Number(query.get('scale'));
  for (const key of Object.keys(state.fx)) if (query.has(key)) state.fx[key] = Number(query.get(key));
  if (query.has('slab')) state.caption.slab = query.get('slab') === '1';
  if (query.has('roles')) query.get('roles').split(',').forEach((role, i) => { state.roles[i] = role; });
  if (query.has('stamps')) state.stamps = state.stamps.map((_, i) => query.get('stamps').split(',')[i] ?? '');
  for (const [key, field] of Object.entries(EXTRA_TEXT)) if (query.has(key)) state.extras[field] = query.get(key);
  for (const key of (query.get('off') ?? '').split(',')) if (key in state.extras) state.extras[key] = false;
  for (const key of (query.get('on') ?? '').split(',')) if (key in state.extras) state.extras[key] = true;
  if (query.has('select')) state.selected = Number(query.get('select'));
  api.rebuild();
}
