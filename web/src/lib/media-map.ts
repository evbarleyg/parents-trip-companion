import type { TripDay } from '../types';

export interface ActualPhotoMapPoint {
  id: string;
  date: string;
  lat: number;
  lng: number;
  source: string;
  whenLabel: string;
  alt: string;
  caption: string;
}

export function getActualPhotoMapPointsForDay(day: TripDay): ActualPhotoMapPoint[] {
  return (day.actualMoments || []).flatMap((moment) =>
    moment.photos
      .filter((photo) => Number.isFinite(photo.lat) && Number.isFinite(photo.lng))
      .map((photo) => ({
        id: photo.id,
        date: day.date,
        lat: photo.lat as number,
        lng: photo.lng as number,
        source: moment.source,
        whenLabel: moment.whenLabel,
        alt: photo.alt,
        caption: photo.caption,
      })),
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineKm(a: [number, number], b: [number, number]): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(b[0] - a[0]);
  const dLng = toRadians(b[1] - a[1]);
  const lat1 = toRadians(a[0]);
  const lat2 = toRadians(b[0]);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);

  const h =
    sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;
  return 2 * earthRadiusKm * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function isPhotoPointNearItinerary(
  point: Pick<ActualPhotoMapPoint, 'lat' | 'lng'>,
  itineraryCoords: Array<[number, number]>,
  thresholdKm = 30,
): boolean {
  if (itineraryCoords.length === 0) return true;
  return itineraryCoords.some((coord) => haversineKm([point.lat, point.lng], coord) <= thresholdKm);
}
