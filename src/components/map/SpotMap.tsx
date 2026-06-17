'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type ShadeMap from 'mapbox-gl-shadow-simulator';
import type { PhotoSpot } from '@/types';
import { MapPin, X, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SHADEMAP_KEY,
  TERRAIN_SOURCE,
  shadowsAvailable,
  ensureBuildingSource,
  getBuildingFeatures,
} from '@/lib/shademap';
import { cloudsAvailable, addCloudLayer, removeCloudLayer } from '@/lib/clouds';
import { getSunPosition, getLightPhase, LIGHT_PHASE_TINT } from '@/lib/sun';
import { ShadowControls } from './ShadowControls';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';

type Focus = { lat: number; lng: number; zoom?: number };

type Props = {
  spots: PhotoSpot[];
  onAddSpot?: (lat: number, lng: number) => void;
  /** Show the sun & shade controls. */
  shadow?: boolean;
  /** Center the map on a single point (spot detail embed). */
  focus?: Focus;
  /** Compact embed: no add-spot UI, no spot count, single focus marker. */
  compact?: boolean;
};

const DEFAULT_CENTER = { lat: 40.7128, lng: -74.006 };
// Below this zoom, ShadeMap would have to process terrain/building shadows
// across too wide an area for mobile devices to handle reliably.
const MIN_SHADOW_ZOOM = 14;

export function SpotMap({ spots, onAddSpot, shadow = false, focus, compact = false }: Props) {
  const mapRef = useRef<MapRef>(null);
  const shadeRef = useRef<ShadeMap | null>(null);

  const [popup, setPopup] = useState<PhotoSpot | null>(null);
  const [addingMode, setAddingMode] = useState(false);
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  // Lightweight: opens the sun panel and drives the golden/blue hour tint + sunset forecast.
  const [panelOpen, setPanelOpen] = useState(false);
  // Heavy: actually renders ShadeMap's terrain/building shadow simulation.
  const [shadowSimOn, setShadowSimOn] = useState(false);
  const [cloudsOn, setCloudsOn] = useState(false);
  const [shadowDate, setShadowDate] = useState(() => new Date());
  const [tilt, setTilt] = useState(false);
  const [center, setCenter] = useState(focus ? { lat: focus.lat, lng: focus.lng } : DEFAULT_CENTER);

  const handleMapClick = useCallback((e: { lngLat: { lat: number; lng: number } }) => {
    if (!addingMode) return;
    setNewMarker({ lat: e.lngLat.lat, lng: e.lngLat.lng });
  }, [addingMode]);

  const confirmAdd = useCallback(() => {
    if (newMarker && onAddSpot) {
      onAddSpot(newMarker.lat, newMarker.lng);
      setNewMarker(null);
      setAddingMode(false);
    }
  }, [newMarker, onAddSpot]);

  useEffect(() => {
    if (!addingMode) setNewMarker(null);
  }, [addingMode]);

  // Create / tear down the ShadeMap overlay when 3D shadow sim toggles.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!shadowSimOn || !mapLoaded || !map || !shadowsAvailable()) return;

    let cancelled = false;
    (async () => {
      const { default: ShadeMapCtor } = await import('mapbox-gl-shadow-simulator');
      if (cancelled || !mapRef.current) return;
      const liveMap = mapRef.current.getMap();
      // Shadows over a city-wide view (low zoom) make ShadeMap fetch and
      // process terrain/building data across a huge area at once, which can
      // exceed mobile Safari's per-tab memory limit and crash the page.
      if (liveMap.getZoom() < MIN_SHADOW_ZOOM) {
        liveMap.jumpTo({ zoom: MIN_SHADOW_ZOOM });
      }
      ensureBuildingSource(liveMap);
      shadeRef.current = new ShadeMapCtor({
        apiKey: SHADEMAP_KEY,
        date: shadowDate,
        color: '#0a1020',
        opacity: 0.55,
        terrainSource: TERRAIN_SOURCE,
        getFeatures: async () => getBuildingFeatures(liveMap),
      }).addTo(liveMap);
    })();

    return () => {
      cancelled = true;
      if (shadeRef.current) {
        try { shadeRef.current.remove(); } catch { /* already gone */ }
        shadeRef.current = null;
      }
    };
    // shadowDate is applied via the effect below; don't recreate on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shadowSimOn, mapLoaded]);

  // Push date changes to the live overlay.
  useEffect(() => {
    if (shadeRef.current) {
      try { shadeRef.current.setDate(shadowDate); } catch { /* not ready */ }
    }
  }, [shadowDate]);

  // 3D tilt for building shadows.
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;
    map.easeTo({ pitch: tilt ? 55 : 0, duration: 500 });
  }, [tilt, mapLoaded]);

  // Live cloud cover overlay (independent of the sun/shadow simulation).
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || !mapLoaded) return;
    if (cloudsOn && cloudsAvailable()) {
      addCloudLayer(map);
    } else {
      removeCloudLayer(map);
    }
  }, [cloudsOn, mapLoaded]);

  // Fly to user's current location on first load (skip for embedded focus views).
  useEffect(() => {
    if (!mapLoaded || focus) return;
    navigator.geolocation?.getCurrentPosition(
      pos => {
        mapRef.current?.getMap()?.flyTo({
          center: [pos.coords.longitude, pos.coords.latitude],
          zoom: 12,
          duration: 1500,
        });
      },
      undefined,
      { timeout: 8000 },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  const sunAltitudeDeg = (getSunPosition(shadowDate, center.lat, center.lng).altitude * 180) / Math.PI;
  const lightTint = LIGHT_PHASE_TINT[getLightPhase(sunAltitudeDeg)];

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: focus ? focus.lng : DEFAULT_CENTER.lng,
          latitude: focus ? focus.lat : DEFAULT_CENTER.lat,
          zoom: focus ? focus.zoom ?? 16 : 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/standard"
        onClick={handleMapClick}
        onLoad={() => setMapLoaded(true)}
        onMoveEnd={(e) => setCenter({ lat: e.viewState.latitude, lng: e.viewState.longitude })}
        cursor={addingMode ? 'crosshair' : 'auto'}
      >
        <NavigationControl position="top-right" />
        {!compact && (
          <GeolocateControl position="top-right" trackUserLocation showUserHeading />
        )}

        {/* Saved spots */}
        {spots.map(spot => (
          <Marker
            key={spot.id}
            longitude={spot.longitude}
            latitude={spot.latitude}
            anchor="bottom"
            onClick={e => { e.originalEvent.stopPropagation(); setPopup(spot); }}
          >
            <button className="group flex flex-col items-center">
              <div className={cn(
                'w-8 h-8 rounded-full border-2 flex items-center justify-center transition-transform group-hover:scale-110',
                popup?.id === spot.id
                  ? 'bg-[var(--accent)] border-[var(--accent)] scale-110'
                  : 'bg-[var(--card)] border-[var(--border)]'
              )}>
                <MapPin className="w-4 h-4" strokeWidth={2}
                  color={popup?.id === spot.id ? 'black' : 'var(--accent)'}
                />
              </div>
            </button>
          </Marker>
        ))}

        {/* Focus marker (compact spot embed) */}
        {compact && focus && (
          <Marker longitude={focus.lng} latitude={focus.lat} anchor="bottom">
            <div className="w-8 h-8 rounded-full bg-[var(--accent)] border-2 border-[var(--accent)] flex items-center justify-center">
              <MapPin className="w-4 h-4" strokeWidth={2} color="black" />
            </div>
          </Marker>
        )}

        {/* New spot marker */}
        {newMarker && (
          <Marker longitude={newMarker.lng} latitude={newMarker.lat} anchor="bottom">
            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-emerald-300 flex items-center justify-center animate-pulse">
              <MapPin className="w-4 h-4 text-white" strokeWidth={2} />
            </div>
          </Marker>
        )}

        {/* Popup */}
        {popup && (
          <Popup
            longitude={popup.longitude}
            latitude={popup.latitude}
            anchor="bottom"
            onClose={() => setPopup(null)}
            closeButton={false}
            offset={40}
            className="!bg-transparent !p-0 !shadow-none"
          >
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 min-w-[180px] shadow-xl">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-sm leading-tight">{popup.name}</p>
                <button onClick={() => setPopup(null)} className="text-[var(--muted)] hover:text-[var(--foreground)]">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {popup.address && (
                <p className="text-xs text-[var(--muted)] mb-2 leading-tight">{popup.address}</p>
              )}
              {popup.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {popup.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="text-xs bg-[var(--border)] px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <Link
                href={`/spots?id=${popup.id}`}
                className="block text-center text-xs font-medium bg-[var(--accent)] text-black rounded-lg py-1.5 mt-1 hover:bg-[var(--accent-dim)] transition-colors"
              >
                View spot
              </Link>
            </div>
          </Popup>
        )}
      </Map>

      {/* Golden/blue hour color wash, driven by the scrubbable time */}
      {panelOpen && (
        <div
          className="absolute inset-0 z-[1] pointer-events-none transition-colors duration-700"
          style={{ backgroundColor: lightTint }}
        />
      )}

      {/* Add mode controls */}
      {!compact && onAddSpot && (
        <div className="absolute top-4 left-4 flex flex-col gap-2 z-10">
          {!addingMode ? (
            <button
              onClick={() => setAddingMode(true)}
              className="bg-[var(--accent)] text-black text-sm font-medium px-3 py-2 rounded-lg shadow-lg hover:bg-[var(--accent-dim)] transition-colors"
            >
              + Add spot
            </button>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3 shadow-xl max-w-[200px]">
              <p className="text-xs text-[var(--muted)] mb-2">
                {newMarker ? 'Confirm location?' : 'Tap the map to place a spot'}
              </p>
              <div className="flex gap-2">
                {newMarker && (
                  <button
                    onClick={confirmAdd}
                    className="flex-1 bg-emerald-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-emerald-500 transition-colors"
                  >
                    Confirm
                  </button>
                )}
                <button
                  onClick={() => setAddingMode(false)}
                  className="flex-1 bg-[var(--border)] text-[var(--foreground)] text-xs font-medium py-1.5 rounded-lg hover:bg-[var(--card-hover)] transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Shadow / sun controls */}
      {shadow && (
        <ShadowControls
          available={shadowsAvailable()}
          enabled={panelOpen}
          onToggle={setPanelOpen}
          simEnabled={shadowSimOn}
          onSimToggle={setShadowSimOn}
          date={shadowDate}
          onDateChange={setShadowDate}
          lat={center.lat}
          lng={center.lng}
          tilt={tilt}
          onTiltToggle={setTilt}
          cloudsOn={cloudsOn}
          onCloudsToggle={setCloudsOn}
          cloudsAvailable={cloudsAvailable()}
        />
      )}

      {/* Spot count */}
      {!compact && spots.length > 0 && !panelOpen && (
        <div className="absolute bottom-4 left-4 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] z-10">
          {spots.length} saved spot{spots.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Live cloud cover toggle — shown when the sun panel is closed (or absent).
          When the panel is open, the cloud button lives inside ShadowControls header. */}
      {(!shadow || !panelOpen) && (
        <button
          onClick={() => cloudsAvailable() && setCloudsOn(v => !v)}
          disabled={!cloudsAvailable()}
          title={cloudsAvailable() ? 'Toggle live cloud cover' : 'Add an OpenWeatherMap key to enable the cloud layer'}
          className={cn(
            'absolute bottom-4 right-4 z-10 flex items-center justify-center w-9 h-9 rounded-full shadow-lg transition-colors',
            cloudsOn
              ? 'bg-[var(--accent)] text-black'
              : 'bg-[var(--card)] border border-[var(--border)] text-[var(--muted)] hover:text-[var(--foreground)]',
            !cloudsAvailable() && 'opacity-50 cursor-not-allowed'
          )}
        >
          <Cloud className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
