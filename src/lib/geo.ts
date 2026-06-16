const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * sinDLng * sinDLng;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Closest of `spots` to (lat, lng), or null if `spots` is empty. */
export function findClosestSpot<T extends { latitude: number; longitude: number }>(
  spots: T[],
  lat: number,
  lng: number
): { spot: T; distanceKm: number } | null {
  if (!spots.length) return null;
  return spots
    .map(spot => ({ spot, distanceKm: haversineDistanceKm(lat, lng, spot.latitude, spot.longitude) }))
    .reduce((closest, candidate) => (candidate.distanceKm < closest.distanceKm ? candidate : closest));
}
