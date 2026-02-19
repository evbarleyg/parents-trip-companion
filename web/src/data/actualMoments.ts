import type { TripActualMoment, TripActualPhoto } from '../types';

const SOURCE = 'B-G-M Fam iMessage export (photos/messages shared by Susan Barley and Jim Greenfield)';

const VERIFIED_PHOTO_MANIFEST: Record<string, TripActualPhoto> = {
  'actual-photo-2026-02-07-mall': {
    id: 'actual-photo-2026-02-07-mall',
    src: '/actuals/jim-dubai-mall.png',
    alt: 'Jim standing inside Dubai Mall',
    caption: 'Jim at Dubai Mall (shared in family thread).',
  },
  'actual-photo-2026-02-07-mojito': {
    id: 'actual-photo-2026-02-07-mojito',
    src: '/actuals/jim-mojito-dubai.png',
    alt: 'Jim with a lemon mint drink in Dubai Mall',
    caption: 'Lemon mint mojito NA iced drink from Hawker Market in Dubai Mall (Susan/Jim share).',
  },
  'actual-photo-2026-02-13-camel-milk': {
    id: 'actual-photo-2026-02-13-camel-milk',
    src: '/actuals/oman-camel-milk.png',
    alt: 'Susan and travel group near a large bowl of camel milk',
    caption: 'Camel milk tasting moment with Susan (shared in family thread).',
  },
};

const ALLOWED_MOMENT_PHOTO_IDS: Record<string, string[]> = {
  'actual-2026-02-07-dubai-mall': ['actual-photo-2026-02-07-mall', 'actual-photo-2026-02-07-mojito'],
  'actual-2026-02-13-camels': ['actual-photo-2026-02-13-camel-milk'],
};

function sanitizeMomentPhotos(moment: TripActualMoment): TripActualPhoto[] {
  const allowed = new Set(ALLOWED_MOMENT_PHOTO_IDS[moment.id] || []);

  return moment.photos
    .map((photo) => VERIFIED_PHOTO_MANIFEST[photo.id])
    .filter((photo): photo is TripActualPhoto => Boolean(photo) && allowed.has(photo.id))
    .map((photo) => ({ ...photo }));
}

const ACTUAL_MOMENTS_BY_DATE: Record<string, TripActualMoment[]> = {
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
      id: 'actual-2026-02-07-dubai-mall',
      source: SOURCE,
      whenLabel: 'Sat, Feb 7 - AM',
      text: 'Extracted message snippet: Jim at the Dubai Mall. We are in search of a beer. Photo set shared into the family thread by Susan/Jim.',
      photos: [
        { id: 'actual-photo-2026-02-07-mall', src: '', alt: '', caption: '' },
        { id: 'actual-photo-2026-02-07-mojito', src: '', alt: '', caption: '' },
      ],
    },
  ],
  '2026-02-12': [
    {
      id: 'actual-2026-02-12-oman-coast',
      source: SOURCE,
      whenLabel: 'Thu, Oman Coast - AM',
      text: 'Extracted message snippet from Jim: The coast of Oman. Arabian Sea.',
      photos: [],
    },
  ],
  '2026-02-13': [
    {
      id: 'actual-2026-02-13-camels',
      source: SOURCE,
      whenLabel: 'Fri, Oman Desert - PM',
      text: 'Extracted message snippet: I milked a camel and we drank the milk. Quite good.',
      photos: [{ id: 'actual-photo-2026-02-13-camel-milk', src: '', alt: '', caption: '' }],
    },
  ],
  '2026-02-18': [
    {
      id: 'actual-2026-02-18-ramadan-iftar',
      source: SOURCE,
      whenLabel: 'Wed, Feb 18 - PM (Oman)',
      text: 'The dry run of the lavish iftar dinner buffet to break the fast after each day of Ramadan. Incredible food, beautiful lights and tents. We were so lucky to experience it. Fasting/Ramadan starts the early morning of the 19th in Oman. Shared by Susan and Jim in the family thread.',
      photos: [],
    },
  ],
};

export function getActualMomentsForDate(date: string): TripActualMoment[] {
  const moments = ACTUAL_MOMENTS_BY_DATE[date];
  if (!moments) return [];

  return moments.map((moment) => ({
    ...moment,
    photos: sanitizeMomentPhotos(moment),
  }));
}
