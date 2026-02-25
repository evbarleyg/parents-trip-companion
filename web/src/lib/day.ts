import type { TripDay } from '../types';
import { formatDateLabel } from './format';

export function dayHasMedia(day: TripDay): boolean {
  return day.actualMoments?.some((moment) => moment.photos.length > 0) ?? false;
}

export function dayMediaCount(day: TripDay): number {
  return day.actualMoments?.reduce((total, moment) => total + moment.photos.length, 0) ?? 0;
}

export function dayHasPhotos(day: TripDay): boolean {
  return dayHasMedia(day);
}

export function dayPhotoCount(day: TripDay): number {
  return dayMediaCount(day);
}

export function dayOptionLabel(day: TripDay, todayDate: string): string {
  const suffix: string[] = [];
  if (day.date === todayDate) suffix.push('TODAY');
  if (dayHasMedia(day)) suffix.push('MEDIA');

  return `${formatDateLabel(day.date)} - ${day.region}${suffix.length ? ` - ${suffix.join(' - ')}` : ''}`;
}
