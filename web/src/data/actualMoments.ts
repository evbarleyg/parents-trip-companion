import type { TripActualMoment } from '../types';

const SOURCE = 'B-G-M Fam iMessage export (photos/messages shared by Susan Barley and Jim Greenfield)';

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
        {
          id: 'actual-photo-2026-02-07-mall',
          src: '/actuals/jim-dubai-mall.png',
          alt: 'Jim standing inside Dubai Mall',
          caption: 'Jim at Dubai Mall (shared in family thread).',
        },
        {
          id: 'actual-photo-2026-02-07-mojito',
          src: '/actuals/jim-mojito-dubai.png',
          alt: 'Jim with a lemon mint drink in Dubai Mall',
          caption: 'Lemon mint mojito NA iced drink from Hawker Market in Dubai Mall (Susan/Jim share).',
        },
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
      photos: [
        {
          id: 'actual-photo-2026-02-13-camel-milk',
          src: '/actuals/oman-camel-milk.png',
          alt: 'Susan and travel group near a large bowl of camel milk',
          caption: 'Camel milk tasting moment with Susan (shared in family thread).',
        },
      ],
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
    photos: moment.photos.map((photo) => ({ ...photo })),
  }));
}
