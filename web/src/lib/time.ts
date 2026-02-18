import type { ItineraryItem } from '../types';

export function parseClockToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  // Supports:
  // - 24h: "09:30", "9:30"
  // - 12h: "9:30 am", "9:30pm", "12:05 AM"
  const match = normalized.match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/i);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const meridiem = match[3]?.toLowerCase();

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return null;
  }

  if (meridiem) {
    if (hours < 1 || hours > 12) return null;
    if (meridiem === 'am') {
      if (hours === 12) hours = 0;
    } else if (hours !== 12) {
      hours += 12;
    }
  }

  if (hours < 0 || hours > 23) return null;
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

  // Overnight range, e.g. 23:00 -> 01:00
  if (end < start) {
    return minutes >= start || minutes <= end;
  }

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
