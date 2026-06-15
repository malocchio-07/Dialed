'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import Map, { Marker, Popup, NavigationControl, GeolocateControl } from 'react-map-gl/mapbox';
import type { MapRef } from 'react-map-gl/mapbox';
import type { PhotoSpot } from '@/types';
import { MapPin, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import 'mapbox-gl/dist/mapbox-gl.css';

type Props = {
  spots: PhotoSpot[];
  onAddSpot?: (lat: number, lng: number) => void;
};

export function SpotMap({ spots, onAddSpot }: Props) {
  const mapRef = useRef<MapRef>(null);
  const [popup, setPopup] = useState<PhotoSpot | null>(null);
  const [addingMode, setAddingMode] = useState(false);
  const [newMarker, setNewMarker] = useState<{ lat: number; lng: number } | null>(null);

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

  return (
    <div className="relative w-full h-full">
      <Map
        ref={mapRef}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        initialViewState={{
          longitude: -118.2437,
          latitude: 34.0522,
          zoom: 10,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        onClick={handleMapClick}
        cursor={addingMode ? 'crosshair' : 'auto'}
      >
        <NavigationControl position="top-right" />
        <GeolocateControl
          position="top-right"
          trackUserLocation
          showUserHeading
        />

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
                href={`/spots/${popup.id}`}
                className="block text-center text-xs font-medium bg-[var(--accent)] text-black rounded-lg py-1.5 mt-1 hover:bg-[var(--accent-dim)] transition-colors"
              >
                View spot
              </Link>
            </div>
          </Popup>
        )}
      </Map>

      {/* Add mode controls */}
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

      {/* Spot count */}
      {spots.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-[var(--card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-xs text-[var(--muted)] z-10">
          {spots.length} saved spot{spots.length !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}
