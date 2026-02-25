import type { TripActualMoment } from '../types';
import { DAD_ACTUAL_MOMENTS_BY_DATE } from './actualMomentsDad';

const SOURCE = 'B-G-M Fam iMessage export (Susan Barley / Jim Greenfield)';
const MOM_UPDATE_SOURCE = 'Mom updates (B-G-M Fam thread)';

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
  '2026-02-25': [
    {
      id: 'actual-2026-02-25-mom-speedboat-update',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Wed, Feb 25 - Morning',
      text: 'Private speedboat outing to look for manta rays and juvenile whale sharks was overcrowded in the water, no whale sharks appeared, and the boat ran out of gas on the return. Mom also reported getting some sunburn.',
      photos: [],
    },
    {
      id: 'actual-2026-02-25-mom-sunset-snorkel-update',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Wed, Feb 25 - Sunset',
      text: 'Sunset followed an incredible snorkel with eagle rays, a hawksbill turtle, anemones with anemonefish, sharks, and dense fish/coral life.',
      photos: [
        {
          id: 'actual-photo-2026-02-25-mom-sunset-1372',
          src: '/actuals/mom-2026-02-25-img-1372.jpeg',
          alt: 'Sunset over Maldives overwater villas with the sun near the horizon.',
          caption: 'Sunset at the overwater villas after the reef snorkel day.',
        },
        {
          id: 'actual-photo-2026-02-25-mom-sunset-1373',
          src: '/actuals/mom-2026-02-25-img-1373.jpeg',
          alt: 'Maldives sunset framed by overwater villas and flower planters in the lagoon.',
          caption: 'Second sunset angle from the same Maldives evening.',
        },
      ],
    },
  ],
};

function cloneMoment(moment: TripActualMoment): TripActualMoment {
  return {
    ...moment,
    photos: moment.photos.map((photo) => ({ ...photo })),
    videos: (moment.videos || []).map((video) => ({ ...video })),
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
