import type { Map as MapboxMap, MapboxGeoJSONFeature } from 'mapbox-gl';

// ShadeMap (mapbox-gl-shadow-simulator) renders terrain + building shadows.
// The key is a public, client-side key obtained free from https://shademap.app/about/.
export const SHADEMAP_KEY = process.env.NEXT_PUBLIC_SHADEMAP_KEY ?? '';

export function shadowsAvailable(): boolean {
  return SHADEMAP_KEY.length > 0;
}

// Free, public AWS "terrarium" elevation tiles drive the terrain shadows.
export const TERRAIN_SOURCE = {
  tileSize: 256,
  maxZoom: 15,
  getSourceUrl: ({ x, y, z }: { x: number; y: number; z: number }) =>
    `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`,
  getElevation: ({ r, g, b }: { r: number; g: number; b: number; a: number }) =>
    r * 256 + g + b / 256 - 32768,
};

const BUILDING_SOURCE_ID = 'shade-buildings';
const BUILDING_PROBE_LAYER_ID = 'shade-buildings-probe';

/**
 * The Mapbox Standard style doesn't expose its buildings to querySourceFeatures,
 * so we inject the Streets v8 building source (rendered invisibly) purely so
 * ShadeMap's getFeatures() can read building footprints + heights.
 */
export function ensureBuildingSource(map: MapboxMap): void {
  if (!map.getSource(BUILDING_SOURCE_ID)) {
    map.addSource(BUILDING_SOURCE_ID, {
      type: 'vector',
      url: 'mapbox://mapbox.mapbox-streets-v8',
    });
  }
  if (!map.getLayer(BUILDING_PROBE_LAYER_ID)) {
    map.addLayer({
      id: BUILDING_PROBE_LAYER_ID,
      type: 'fill',
      source: BUILDING_SOURCE_ID,
      'source-layer': 'building',
      paint: { 'fill-opacity': 0 },
    });
  }
}

/**
 * Pull building polygons (with heights) for ShadeMap. Tries the injected
 * Streets source first, then falls back to a classic style's composite source.
 */
export function getBuildingFeatures(map: MapboxMap): MapboxGeoJSONFeature[] {
  for (const sourceId of [BUILDING_SOURCE_ID, 'composite']) {
    try {
      const features = map.querySourceFeatures(sourceId, { sourceLayer: 'building' });
      const filtered = features.filter(
        (f) =>
          f.properties &&
          f.properties.underground !== 'true' &&
          (f.properties.height || f.properties.render_height)
      );
      if (filtered.length) return filtered;
    } catch {
      // Source not present in this style — try the next one.
    }
  }
  return [];
}
