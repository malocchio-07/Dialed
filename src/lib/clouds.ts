import type { Map as MapboxMap } from 'mapbox-gl';

// Live cloud cover from RainViewer's free satellite-infrared tiles.
// No API key required — https://www.rainviewer.com/api.html
const FRAMES_URL = 'https://api.rainviewer.com/public/weather-maps.json';

const SOURCE_ID = 'rv-clouds';
const LAYER_ID = 'rv-clouds-layer';

/** Kept for call-site compatibility; RainViewer needs no key so this is always true. */
export function cloudsAvailable(): boolean {
  return true;
}

export async function addCloudLayer(map: MapboxMap): Promise<void> {
  if (map.getLayer(LAYER_ID)) return;

  let path: string | undefined;
  let host: string | undefined;
  try {
    const res = await fetch(FRAMES_URL);
    if (!res.ok) return;
    const data = await res.json();
    host = data?.host;
    const frames = data?.satellite?.infrared;
    path = Array.isArray(frames) && frames.length ? frames[frames.length - 1]?.path : undefined;
  } catch {
    return;
  }
  if (!host || !path) return;
  // The map may have been torn down or the layer added while we were fetching.
  if (!map.getStyle() || map.getLayer(LAYER_ID)) return;

  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      tiles: [`${host}${path}/256/{z}/{x}/{y}/0/0_0.png`],
      tileSize: 256,
      // RainViewer only serves tiles up to z7; without this, city-level zooms
      // request nonexistent tiles and the layer renders nothing. With it,
      // mapbox overzooms (stretches) the z7 tiles instead.
      maxzoom: 7,
      attribution: '© RainViewer',
    });
  }
  // Opacity (rather than layer ordering) keeps roads/labels readable without
  // having to know where in Standard's layer stack to insert this.
  map.addLayer({ id: LAYER_ID, type: 'raster', source: SOURCE_ID, paint: { 'raster-opacity': 0.6 } });
}

export function removeCloudLayer(map: MapboxMap): void {
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}
