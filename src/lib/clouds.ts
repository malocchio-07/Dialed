import type { Map as MapboxMap } from 'mapbox-gl';

// Live cloud cover tiles from OpenWeatherMap's free "Weather maps 1.0" tier.
// Key is a public, client-side key obtained free from https://openweathermap.org/api.
export const OPENWEATHER_KEY = process.env.NEXT_PUBLIC_OPENWEATHER_KEY ?? '';

export function cloudsAvailable(): boolean {
  return OPENWEATHER_KEY.length > 0;
}

const SOURCE_ID = 'owm-clouds';
const LAYER_ID = 'owm-clouds-layer';

export function addCloudLayer(map: MapboxMap): void {
  if (!OPENWEATHER_KEY || map.getLayer(LAYER_ID)) return;
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: 'raster',
      tiles: [`https://tile.openweathermap.org/map/clouds_new/{z}/{x}/{y}.png?appid=${OPENWEATHER_KEY}`],
      tileSize: 256,
      attribution: '© OpenWeatherMap',
    });
  }
  // Opacity (rather than layer ordering) keeps roads/labels readable without
  // having to know where in Standard's layer stack to insert this.
  map.addLayer({ id: LAYER_ID, type: 'raster', source: SOURCE_ID, paint: { 'raster-opacity': 0.55 } });
}

export function removeCloudLayer(map: MapboxMap): void {
  if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID);
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}
