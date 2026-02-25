import type { ItineraryItem, TripDay, TripPatch, TripPlan } from '../types';

function cloneDay(day: TripDay): TripDay {
  return {
    ...day,
    summaryItems: day.summaryItems.map((item) => ({ ...item })),
    detailItems: day.detailItems.map((item) => ({ ...item })),
    actualMoments: day.actualMoments?.map((moment) => ({
      ...moment,
      photos: moment.photos.map((photo) => ({ ...photo })),
      videos: (moment.videos || []).map((video) => ({ ...video })),
    })),
  };
}

function normalizeForKey(value: string): string {
  return value.trim().toLowerCase().replaceAll(/\s+/g, ' ');
}

function itemKey(item: ItineraryItem): string {
  return [
    normalizeForKey(item.title),
    normalizeForKey(item.startTime || ''),
    normalizeForKey(item.location || ''),
  ].join('|');
}

function mergeItem(existing: ItineraryItem, incoming: ItineraryItem): ItineraryItem {
  const existingNotes = existing.notes?.trim() || '';
  const incomingNotes = incoming.notes?.trim() || '';

  return {
    ...existing,
    ...incoming,
    title: incoming.title || existing.title,
    startTime: incoming.startTime || existing.startTime,
    endTime: incoming.endTime ?? existing.endTime,
    location: incoming.location || existing.location,
    notes: incomingNotes.length >= existingNotes.length ? incomingNotes || existingNotes : existingNotes,
    category: incoming.category || existing.category,
    lat: incoming.lat ?? existing.lat,
    lng: incoming.lng ?? existing.lng,
  };
}

function mergeItems(existing: ItineraryItem[], incoming: ItineraryItem[]): ItineraryItem[] {
  const byKey = new Map<string, ItineraryItem>();

  for (const item of existing) {
    byKey.set(itemKey(item), { ...item });
  }

  for (const item of incoming) {
    const key = itemKey(item);
    const prev = byKey.get(key);
    byKey.set(key, prev ? mergeItem(prev, item) : { ...item });
  }

  return [...byKey.values()].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
}

function summaryFromDetail(detail: ItineraryItem[]): ItineraryItem[] {
  return detail.slice(0, 3).map((item, index) => ({
    ...item,
    id: `${item.id || 'summary'}-summary-${index + 1}`,
    notes: item.notes,
  }));
}

function detailFromSummary(summary: ItineraryItem[]): ItineraryItem[] {
  return summary.map((item, index) => ({
    ...item,
    id: `${item.id || 'detail'}-detail-${index + 1}`,
  }));
}

function mergeDay(existing: TripDay, incoming: TripDay): TripDay {
  const mergedSummary = mergeItems(existing.summaryItems, incoming.summaryItems);
  const mergedDetail = mergeItems(existing.detailItems, incoming.detailItems);

  const summaryItems = mergedSummary.length > 0 ? mergedSummary : summaryFromDetail(mergedDetail);
  const detailItems = mergedDetail.length > 0 ? mergedDetail : detailFromSummary(summaryItems);

  return {
    ...existing,
    region: incoming.region || existing.region,
    summaryItems,
    detailItems,
    activeView: detailItems.length > 0 ? 'detail' : 'summary',
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

  const days = [...byDate.values()]
    .map((day) => {
      const summaryItems = day.summaryItems.length > 0 ? day.summaryItems : summaryFromDetail(day.detailItems);
      const detailItems = day.detailItems.length > 0 ? day.detailItems : detailFromSummary(summaryItems);
      return {
        ...day,
        summaryItems,
        detailItems,
        activeView: detailItems.length > 0 ? 'detail' : day.activeView,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  return { ...plan, days };
}
