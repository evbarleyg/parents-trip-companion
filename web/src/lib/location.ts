import type { ItineraryItem, TripDay, TripPlan, WhereAmIState } from '../types';
import { nowMinutes, parseClockToMinutes } from './time';

export function haversineMeters(a: [number, number], b: [number, number]): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const earthRadius = 6371000;

  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);

  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const y = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  return earthRadius * y;
}

function timeScore(item: ItineraryItem, minuteOfDay: number): number {
  const start = parseClockToMinutes(item.startTime);
  const end = parseClockToMinutes(item.endTime);

  if (start === null) return 10;

  if (end !== null && minuteOfDay >= start && minuteOfDay <= end) {
    return 60;
  }

  if (minuteOfDay >= start && end === null) {
    return 45;
  }

  const delta = Math.abs(minuteOfDay - start);
  return Math.max(0, 45 - Math.floor(delta / 8));
}

function distanceScore(item: ItineraryItem, coords: [number, number] | null): number {
  if (!coords) return 20;
  if (typeof item.lat !== 'number' || typeof item.lng !== 'number') return 15;
  const meters = haversineMeters(coords, [item.lat, item.lng]);
  if (meters < 400) return 40;
  if (meters < 1200) return 30;
  if (meters < 3000) return 20;
  if (meters < 6000) return 12;
  return 5;
}

export function scoreActiveItem(
  day: TripDay,
  coords: [number, number] | null,
  reference = new Date(),
): { item: ItineraryItem | null; confidence: 'high' | 'medium' | 'low' } {
  const items = day.detailItems.length > 0 && day.activeView === 'detail' ? day.detailItems : day.summaryItems;
  const minute = nowMinutes(reference);

  let winner: ItineraryItem | null = null;
  let winnerScore = -1;

  for (const item of items) {
    const score = timeScore(item, minute) + distanceScore(item, coords);
    if (score > winnerScore) {
      winnerScore = score;
      winner = item;
    }
  }

  if (!winner) {
    return { item: null, confidence: 'low' };
  }

  if (winnerScore >= 80) return { item: winner, confidence: 'high' };
  if (winnerScore >= 55) return { item: winner, confidence: 'medium' };
  return { item: winner, confidence: 'low' };
}

export function detectWhereAmI(
  plan: TripPlan,
  selectedDate: string,
  coords: [number, number] | null,
  mode: WhereAmIState['mode'],
): WhereAmIState {
  const day = plan.days.find((entry) => entry.date === selectedDate) || null;
  if (!day) {
    return {
      mode,
      currentLatLng: coords,
      activeDayId: null,
      activeItemId: null,
      confidence: 'low',
      lastUpdated: new Date().toISOString(),
    };
  }

  const scored = scoreActiveItem(day, coords);
  return {
    mode,
    currentLatLng: coords,
    activeDayId: day.date,
    activeItemId: scored.item?.id || null,
    confidence: scored.confidence,
    lastUpdated: new Date().toISOString(),
  };
}
