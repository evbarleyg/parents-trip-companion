import type { TripActualMoment } from '../types';
import { DAD_ACTUAL_MOMENTS_BY_DATE } from './actualMomentsDad';

const SOURCE = 'B-G-M Fam iMessage export (Susan Barley / Jim Greenfield)';

const FAMILY_ACTUAL_MOMENTS_BY_DATE: Record<string, TripActualMoment[]> = {
  '2026-02-03': [
    {
      id: 'actual-2026-02-03-kickoff',
      source: SOURCE,
      whenLabel: 'Tue, Feb 3 - PM',
      text: "Extracted message snippet: Susan Barley named the conversation 'B-G-M Fam'.",
      photos: [],
    },
  ],
  '2026-02-07': [
    {
      id: 'actual-2026-02-07-waterfront',
      source: SOURCE,
      whenLabel: 'Sat, Feb 7 - Afternoon',
      text: 'Dubai waterfront photo shared in the family thread.',
      photos: [
        {
          id: 'actual-photo-2026-02-07-wheel',
          src: '/actuals/dubai-wheel.png',
          alt: 'Dubai waterfront with giant observation wheel and pool foreground',
          caption: 'Dubai waterfront and skyline.',
        },
      ],
    },
  ],
  '2026-02-13': [
    {
      id: 'actual-2026-02-13-sunset',
      source: SOURCE,
      whenLabel: 'Fri, Sunset',
      text: 'Sunset photo shared in the same Oman leg thread.',
      photos: [
        {
          id: 'actual-photo-2026-02-13-sunset',
          src: '/actuals/desert-sunset.png',
          alt: 'Sunset over desert coastline with old stone buildings',
          caption: 'Sunset close of day in Oman.',
        },
      ],
    },
  ],
  '2026-02-18': [
    {
      id: 'actual-2026-02-18-ramadan-iftar',
      source: SOURCE,
      whenLabel: 'Wed, Feb 18 - PM (Oman)',
      text: 'The dry run of the lavish iftar dinner buffet to break the fast after each day of Ramadan. Incredible food, beautiful lights and tents. We were so lucky to experience it. Fasting/Ramadan starts the early morning of the 19th in Oman.',
      photos: [
        {
          id: 'actual-photo-2026-02-18-family-dinner',
          src: '/actuals/family-dinner-palms.png',
          alt: 'Family dinner under palm trees at night in Oman',
          caption: 'Evening gathering during the Ramadan/iftar part of the Oman leg.',
        },
      ],
    },
  ],
  '2026-02-24': [
    {
      id: 'actual-2026-02-24-maldives',
      source: SOURCE,
      whenLabel: 'Maldives Resort Day',
      text: 'Beachfront lunch photo from the family thread during the resort window.',
      photos: [
        {
          id: 'actual-photo-2026-02-24-lunch',
          src: '/actuals/maldives-beach-lunch.png',
          alt: 'Cold drink on a beachside table at Maldives resort',
          caption: 'Resort lunch by the water.',
        },
      ],
    },
  ],
};

function cloneMoment(moment: TripActualMoment): TripActualMoment {
  return {
    ...moment,
    photos: moment.photos.map((photo) => ({ ...photo })),
  };
}

function mergeActualMomentMaps(
  ...maps: Array<Record<string, TripActualMoment[]>>
): Record<string, TripActualMoment[]> {
  const merged: Record<string, TripActualMoment[]> = {};
  for (const map of maps) {
    for (const [date, moments] of Object.entries(map)) {
      const existing = merged[date] || [];
      merged[date] = existing.concat(moments.map(cloneMoment));
    }
  }
  return merged;
}

const ACTUAL_MOMENTS_BY_DATE = mergeActualMomentMaps(FAMILY_ACTUAL_MOMENTS_BY_DATE, DAD_ACTUAL_MOMENTS_BY_DATE);

export function getActualMomentsForDate(date: string): TripActualMoment[] {
  const moments = ACTUAL_MOMENTS_BY_DATE[date];
  if (!moments) return [];

  return moments.map(cloneMoment);
}

export function getAllSeedActualMoments(): TripActualMoment[] {
  return Object.values(ACTUAL_MOMENTS_BY_DATE).flatMap((moments) => moments.map(cloneMoment));
}
