import type { TripPlan } from '../types';

function partsToDateKey(parts: Intl.DateTimeFormatPart[]): string {
  const year = parts.find((part) => part.type === 'year')?.value || '';
  const month = parts.find((part) => part.type === 'month')?.value || '';
  const day = parts.find((part) => part.type === 'day')?.value || '';

  if (!year || !month || !day) {
    return '';
  }

  return `${year}-${month}-${day}`;
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const key = partsToDateKey(formatter.formatToParts(date));
    if (key) return key;
  } catch {
    // Fall through to local date fallback.
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayInTripRange(plan: Pick<TripPlan, 'days' | 'startDate' | 'timezone'>, now = new Date()): string {
  const today = dateKeyInTimeZone(now, plan.timezone);
  if (plan.days.some((day) => day.date === today)) {
    return today;
  }
  return plan.startDate;
}
