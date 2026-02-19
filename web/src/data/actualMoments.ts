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
          alt: 'Jim standing inside Dubai Mall (shared by Susan/Jim)',
          caption: 'Jim at Dubai Mall (shared by Susan/Jim in family thread).',
        },
        {
          id: 'actual-photo-2026-02-07-mojito',
          src: '/actuals/jim-mojito-dubai.png',
          alt: 'Jim with a lemon mint drink in Dubai Mall (shared by Susan/Jim)',
          caption: 'Lemon mint mojito NA iced drink from Hawker Market in Dubai Mall (shared by Susan/Jim).',
        },
      ],
    },
    {
      id: 'actual-2026-02-07-waterfront',
      source: SOURCE,
      whenLabel: 'Sat, Feb 7 - Afternoon',
      text: 'Dubai waterfront photo shared in the family thread.',
      photos: [
        {
          id: 'actual-photo-2026-02-07-wheel',
          src: '/actuals/dubai-wheel.png',
          alt: 'Dubai waterfront with giant observation wheel and pool foreground (shared by Susan/Jim)',
          caption: 'Dubai waterfront and skyline (shared by Susan/Jim).',
        },
      ],
    },
  ],
  '2026-02-12': [
    {
      id: 'actual-2026-02-12-oman-coast',
      source: SOURCE,
      whenLabel: 'Thu, Oman Coast - AM',
      text: 'Extracted message snippet: The coast of Oman. Arabian Sea.',
      photos: [
        {
          id: 'actual-photo-2026-02-12-coast',
          src: '/actuals/oman-coast-arabian-sea.png',
          alt: 'Rocky Omani coastline along the Arabian Sea (shared by Susan/Jim)',
          caption: 'Coast of Oman, Arabian Sea (shared by Susan/Jim).',
        },
        {
          id: 'actual-photo-2026-02-12-jim-coast',
          src: '/actuals/jim-oman-coast.png',
          alt: 'Jim on a viewing platform above the Oman coast (shared by Susan/Jim)',
          caption: 'Jim on the Oman coastal overlook (shared by Susan/Jim).',
        },
      ],
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
          id: 'actual-photo-2026-02-13-camels',
          src: '/actuals/oman-camels.png',
          alt: 'Camels in an enclosure in Oman (shared by Susan/Jim)',
          caption: 'Camel stop in Oman (shared by Susan/Jim).',
        },
        {
          id: 'actual-photo-2026-02-13-camel-milk',
          src: '/actuals/oman-camel-milk.png',
          alt: 'Susan and travel group near a large bowl of camel milk (shared by Susan/Jim)',
          caption: 'Camel milk tasting moment (shared by Susan/Jim).',
        },
      ],
    },
    {
      id: 'actual-2026-02-13-sunset',
      source: SOURCE,
      whenLabel: 'Fri, Sunset',
      text: 'Sunset photo shared in the same Oman leg thread.',
      photos: [
        {
          id: 'actual-photo-2026-02-13-sunset',
          src: '/actuals/desert-sunset.png',
          alt: 'Sunset over desert coastline with old stone buildings (shared by Susan/Jim)',
          caption: 'Sunset close of day in Oman (shared by Susan/Jim).',
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
      photos: [
        {
          id: 'actual-photo-2026-02-18-family-dinner',
          src: '/actuals/family-dinner-palms.png',
          alt: 'Family dinner under palm trees at night in Oman (shared by Susan/Jim)',
          caption: 'Evening gathering during the Ramadan/iftar part of the Oman leg (shared by Susan/Jim).',
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
          alt: 'Cold drink on a beachside table at Maldives resort (shared by Susan/Jim)',
          caption: 'Resort lunch by the water (shared by Susan/Jim).',
        },
      ],
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
