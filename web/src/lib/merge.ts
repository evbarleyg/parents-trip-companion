import type { TripDay, TripPatch, TripPlan } from '../types';

function cloneDay(day: TripDay): TripDay {
  return {
    ...day,
    summaryItems: day.summaryItems.map((item) => ({ ...item })),
    detailItems: day.detailItems.map((item) => ({ ...item })),
    actualMoments: day.actualMoments?.map((moment) => ({
      ...moment,
      photos: moment.photos.map((photo) => ({ ...photo })),
    })),
  };
}

function mergeDay(existing: TripDay, incoming: TripDay): TripDay {
  return {
    ...existing,
    region: incoming.region || existing.region,
    summaryItems: existing.summaryItems.length > 0 ? existing.summaryItems : incoming.summaryItems,
    detailItems: incoming.detailItems.length > 0 ? incoming.detailItems : existing.detailItems,
    activeView: incoming.detailItems.length > 0 ? 'detail' : existing.activeView,
  };
}

export function applyTripPatch(plan: TripPlan, patch: TripPatch): TripPlan {
  const byDate = new Map(plan.days.map((day) => [day.date, cloneDay(day)]));

  for (const day of patch.daysUpdated) {
    const existing = byDate.get(day.date);
    if (!existing) {
      byDate.set(day.date, cloneDay(day));
      continue;
    }
    byDate.set(day.date, mergeDay(existing, day));
  }

  for (const day of patch.daysAdded) {
    const existing = byDate.get(day.date);
    if (existing) {
      byDate.set(day.date, mergeDay(existing, day));
      continue;
    }
    byDate.set(day.date, cloneDay(day));
  }

  const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  return { ...plan, days };
}
