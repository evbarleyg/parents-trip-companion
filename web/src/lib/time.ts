import type { ItineraryItem } from '../types';

export function parseClockToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = value.match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function nowMinutes(now = new Date()): number {
  return now.getHours() * 60 + now.getMinutes();
}

export function isNowInItem(item: ItineraryItem, minutes: number): boolean {
  const start = parseClockToMinutes(item.startTime);
  const end = parseClockToMinutes(item.endTime);

  if (start === null) return false;
  if (end === null) return minutes >= start;
  return minutes >= start && minutes <= end;
}

export function minutesUntilStart(item: ItineraryItem, minutes: number): number | null {
  const start = parseClockToMinutes(item.startTime);
  if (start === null) return null;
  return start - minutes;
}

export function getCurrentAndNext(items: ItineraryItem[], minutes = nowMinutes()): {
  current: ItineraryItem | null;
  next: ItineraryItem | null;
} {
  const sorted = [...items].sort((a, b) => {
    const aStart = parseClockToMinutes(a.startTime) ?? 0;
    const bStart = parseClockToMinutes(b.startTime) ?? 0;
    return aStart - bStart;
  });

  let current: ItineraryItem | null = null;
  let next: ItineraryItem | null = null;

  for (const item of sorted) {
    if (isNowInItem(item, minutes)) {
      current = item;
      continue;
    }

    const until = minutesUntilStart(item, minutes);
    if (until !== null && until > 0) {
      next = item;
      break;
    }
  }

  if (!current && sorted.length > 0 && !next) {
    next = sorted[0];
  }

  return { current, next };
}
