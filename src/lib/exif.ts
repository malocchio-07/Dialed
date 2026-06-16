import exifr from 'exifr';

export type PhotoMeta = {
  lat: number | null;
  lng: number | null;
  /** YYYY-MM-DD, from the EXIF capture date. */
  dateTaken: string | null;
  camera: string | null;
};

const EMPTY: PhotoMeta = { lat: null, lng: null, dateTaken: null, camera: null };

/** Reads GPS, capture date, and camera model from a photo's EXIF data, client-side. */
export async function extractPhotoMeta(file: File): Promise<PhotoMeta> {
  try {
    const tags = await exifr.parse(file, { gps: true });
    if (!tags) return EMPTY;

    const date: Date | undefined = tags.DateTimeOriginal ?? tags.CreateDate;
    const camera = [tags.Make, tags.Model].filter(Boolean).join(' ').trim() || null;

    return {
      lat: typeof tags.latitude === 'number' ? tags.latitude : null,
      lng: typeof tags.longitude === 'number' ? tags.longitude : null,
      dateTaken: date instanceof Date && !isNaN(date.getTime()) ? date.toISOString().split('T')[0] : null,
      camera,
    };
  } catch {
    return EMPTY;
  }
}
