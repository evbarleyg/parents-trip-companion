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
  'actual-photo-batch-001-79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652': {
    id: 'actual-photo-batch-001-79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652',
    src: '/actuals/79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652.jpeg',
    alt: 'Trip photo (79303757406__19D2462D-044B-4FC1-B12D-BF14A41A4652.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (79303757406__19D2462D-044B-4FC1-B12D-BF14A41A4652.jpeg).',
  },
  'actual-photo-batch-002-img-1126-2': {
    id: 'actual-photo-batch-002-img-1126-2',
    src: '/actuals/img-1126-2.jpeg',
    alt: 'Trip photo (IMG_1126 2.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1126 2.jpeg).',
  },
  'actual-photo-batch-003-img-1126': {
    id: 'actual-photo-batch-003-img-1126',
    src: '/actuals/img-1126.jpeg',
    alt: 'Trip photo (IMG_1126.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1126.jpeg).',
  },
  'actual-photo-batch-004-img-1128': {
    id: 'actual-photo-batch-004-img-1128',
    src: '/actuals/img-1128.jpeg',
    alt: 'Trip photo (IMG_1128.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1128.jpeg).',
  },
  'actual-photo-batch-005-img-1130': {
    id: 'actual-photo-batch-005-img-1130',
    src: '/actuals/img-1130.jpeg',
    alt: 'Trip photo (IMG_1130.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1130.jpeg).',
  },
  'actual-photo-batch-006-img-1135': {
    id: 'actual-photo-batch-006-img-1135',
    src: '/actuals/img-1135.jpeg',
    alt: 'Trip photo (IMG_1135.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1135.jpeg).',
  },
  'actual-photo-batch-007-img-1139': {
    id: 'actual-photo-batch-007-img-1139',
    src: '/actuals/img-1139.jpeg',
    alt: 'Trip photo (IMG_1139.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1139.jpeg).',
  },
  'actual-photo-batch-008-img-1145': {
    id: 'actual-photo-batch-008-img-1145',
    src: '/actuals/img-1145.jpeg',
    alt: 'Trip photo (IMG_1145.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1145.jpeg).',
  },
  'actual-photo-batch-009-img-1150': {
    id: 'actual-photo-batch-009-img-1150',
    src: '/actuals/img-1150.jpeg',
    alt: 'Trip photo (IMG_1150.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1150.jpeg).',
  },
  'actual-photo-batch-010-img-1152': {
    id: 'actual-photo-batch-010-img-1152',
    src: '/actuals/img-1152.jpeg',
    alt: 'Trip photo (IMG_1152.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1152.jpeg).',
  },
  'actual-photo-batch-011-img-1154': {
    id: 'actual-photo-batch-011-img-1154',
    src: '/actuals/img-1154.jpeg',
    alt: 'Trip photo (IMG_1154.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1154.jpeg).',
  },
  'actual-photo-batch-012-img-1156': {
    id: 'actual-photo-batch-012-img-1156',
    src: '/actuals/img-1156.jpeg',
    alt: 'Trip photo (IMG_1156.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1156.jpeg).',
  },
  'actual-photo-batch-013-img-1168': {
    id: 'actual-photo-batch-013-img-1168',
    src: '/actuals/img-1168.jpeg',
    alt: 'Trip photo (IMG_1168.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1168.jpeg).',
  },
  'actual-photo-batch-014-img-1169': {
    id: 'actual-photo-batch-014-img-1169',
    src: '/actuals/img-1169.jpeg',
    alt: 'Trip photo (IMG_1169.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1169.jpeg).',
  },
  'actual-photo-batch-015-img-1172': {
    id: 'actual-photo-batch-015-img-1172',
    src: '/actuals/img-1172.jpeg',
    alt: 'Trip photo (IMG_1172.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1172.jpeg).',
  },
  'actual-photo-batch-016-img-1187': {
    id: 'actual-photo-batch-016-img-1187',
    src: '/actuals/img-1187.jpeg',
    alt: 'Trip photo (IMG_1187.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1187.jpeg).',
  },
  'actual-photo-batch-017-img-1190': {
    id: 'actual-photo-batch-017-img-1190',
    src: '/actuals/img-1190.jpeg',
    alt: 'Trip photo (IMG_1190.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1190.jpeg).',
  },
  'actual-photo-batch-018-img-1192': {
    id: 'actual-photo-batch-018-img-1192',
    src: '/actuals/img-1192.jpeg',
    alt: 'Trip photo (IMG_1192.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1192.jpeg).',
  },
  'actual-photo-batch-019-img-1197': {
    id: 'actual-photo-batch-019-img-1197',
    src: '/actuals/img-1197.jpeg',
    alt: 'Trip photo (IMG_1197.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1197.jpeg).',
  },
  'actual-photo-batch-020-img-1198': {
    id: 'actual-photo-batch-020-img-1198',
    src: '/actuals/img-1198.jpeg',
    alt: 'Trip photo (IMG_1198.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1198.jpeg).',
  },
  'actual-photo-batch-021-img-1200': {
    id: 'actual-photo-batch-021-img-1200',
    src: '/actuals/img-1200.jpeg',
    alt: 'Trip photo (IMG_1200.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1200.jpeg).',
  },
  'actual-photo-batch-022-img-1210': {
    id: 'actual-photo-batch-022-img-1210',
    src: '/actuals/img-1210.jpeg',
    alt: 'Trip photo (IMG_1210.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1210.jpeg).',
  },
  'actual-photo-batch-023-img-1216': {
    id: 'actual-photo-batch-023-img-1216',
    src: '/actuals/img-1216.jpeg',
    alt: 'Trip photo (IMG_1216.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1216.jpeg).',
  },
  'actual-photo-batch-024-img-1231': {
    id: 'actual-photo-batch-024-img-1231',
    src: '/actuals/img-1231.jpeg',
    alt: 'Trip photo (IMG_1231.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1231.jpeg).',
  },
  'actual-photo-batch-025-img-1232': {
    id: 'actual-photo-batch-025-img-1232',
    src: '/actuals/img-1232.png',
    alt: 'Trip photo (IMG_1232.png) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1232.png).',
  },
  'actual-photo-batch-026-img-1233': {
    id: 'actual-photo-batch-026-img-1233',
    src: '/actuals/img-1233.jpeg',
    alt: 'Trip photo (IMG_1233.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1233.jpeg).',
  },
  'actual-photo-batch-027-img-1234': {
    id: 'actual-photo-batch-027-img-1234',
    src: '/actuals/img-1234.jpeg',
    alt: 'Trip photo (IMG_1234.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1234.jpeg).',
  },
  'actual-photo-batch-028-img-1238': {
    id: 'actual-photo-batch-028-img-1238',
    src: '/actuals/img-1238.jpeg',
    alt: 'Trip photo (IMG_1238.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1238.jpeg).',
  },
  'actual-photo-batch-029-img-1239': {
    id: 'actual-photo-batch-029-img-1239',
    src: '/actuals/img-1239.jpeg',
    alt: 'Trip photo (IMG_1239.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1239.jpeg).',
  },
  'actual-photo-batch-030-img-1241': {
    id: 'actual-photo-batch-030-img-1241',
    src: '/actuals/img-1241.jpeg',
    alt: 'Trip photo (IMG_1241.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1241.jpeg).',
  },
  'actual-photo-batch-031-img-1243': {
    id: 'actual-photo-batch-031-img-1243',
    src: '/actuals/img-1243.jpeg',
    alt: 'Trip photo (IMG_1243.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1243.jpeg).',
  },
  'actual-photo-batch-032-img-1244': {
    id: 'actual-photo-batch-032-img-1244',
    src: '/actuals/img-1244.jpeg',
    alt: 'Trip photo (IMG_1244.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1244.jpeg).',
  },
  'actual-photo-batch-033-img-1253': {
    id: 'actual-photo-batch-033-img-1253',
    src: '/actuals/img-1253.jpeg',
    alt: 'Trip photo (IMG_1253.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_1253.jpeg).',
  },
  'actual-photo-batch-034-img-3024': {
    id: 'actual-photo-batch-034-img-3024',
    src: '/actuals/img-3024.jpeg',
    alt: 'Trip photo (IMG_3024.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_3024.jpeg).',
  },
  'actual-photo-batch-035-img-4017': {
    id: 'actual-photo-batch-035-img-4017',
    src: '/actuals/img-4017.jpeg',
    alt: 'Trip photo (IMG_4017.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_4017.jpeg).',
  },
  'actual-photo-batch-036-img-4024': {
    id: 'actual-photo-batch-036-img-4024',
    src: '/actuals/img-4024.jpeg',
    alt: 'Trip photo (IMG_4024.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_4024.jpeg).',
  },
  'actual-photo-batch-037-img-4041': {
    id: 'actual-photo-batch-037-img-4041',
    src: '/actuals/img-4041.jpeg',
    alt: 'Trip photo (IMG_4041.jpeg) shared by Susan/Jim',
    caption: 'Family trip photo shared by Susan/Jim (IMG_4041.jpeg).',
  },
};

const ALLOWED_MOMENT_PHOTO_IDS: Record<string, string[]> = {
  'actual-2026-02-07-dubai-mall': ['actual-photo-2026-02-07-mall', 'actual-photo-2026-02-07-mojito'],
  'actual-2026-02-12-photo-batch': ['actual-photo-batch-002-img-1126-2', 'actual-photo-batch-003-img-1126', 'actual-photo-batch-004-img-1128', 'actual-photo-batch-005-img-1130', 'actual-photo-batch-006-img-1135', 'actual-photo-batch-007-img-1139'],
  'actual-2026-02-13-camels': ['actual-photo-2026-02-13-camel-milk'],
  'actual-2026-02-13-photo-batch': ['actual-photo-batch-008-img-1145', 'actual-photo-batch-009-img-1150', 'actual-photo-batch-010-img-1152', 'actual-photo-batch-011-img-1154', 'actual-photo-batch-012-img-1156', 'actual-photo-batch-013-img-1168', 'actual-photo-batch-014-img-1169', 'actual-photo-batch-015-img-1172', 'actual-photo-batch-035-img-4017', 'actual-photo-batch-036-img-4024', 'actual-photo-batch-037-img-4041'],
  'actual-2026-02-14-photo-batch': ['actual-photo-batch-016-img-1187'],
  'actual-2026-02-15-photo-batch': ['actual-photo-batch-017-img-1190', 'actual-photo-batch-018-img-1192', 'actual-photo-batch-019-img-1197', 'actual-photo-batch-020-img-1198'],
  'actual-2026-02-16-photo-batch': ['actual-photo-batch-021-img-1200', 'actual-photo-batch-022-img-1210', 'actual-photo-batch-023-img-1216'],
  'actual-2026-02-17-photo-batch': ['actual-photo-batch-001-79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652', 'actual-photo-batch-024-img-1231', 'actual-photo-batch-026-img-1233', 'actual-photo-batch-027-img-1234', 'actual-photo-batch-028-img-1238', 'actual-photo-batch-029-img-1239', 'actual-photo-batch-034-img-3024'],
  'actual-2026-02-18-photo-batch': ['actual-photo-batch-030-img-1241', 'actual-photo-batch-031-img-1243', 'actual-photo-batch-032-img-1244', 'actual-photo-batch-033-img-1253'],
  'actual-2026-02-24-photo-batch': ['actual-photo-batch-025-img-1232'],
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
    {
      id: 'actual-2026-02-12-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-12 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-12).',
      photos: [
        { id: 'actual-photo-batch-002-img-1126-2', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-003-img-1126', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-004-img-1128', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-005-img-1130', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-006-img-1135', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-007-img-1139', src: '', alt: '', caption: '' },
      ],
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
    {
      id: 'actual-2026-02-13-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-13 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-13).',
      photos: [
        { id: 'actual-photo-batch-008-img-1145', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-009-img-1150', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-010-img-1152', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-011-img-1154', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-012-img-1156', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-013-img-1168', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-014-img-1169', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-015-img-1172', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-035-img-4017', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-036-img-4024', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-037-img-4041', src: '', alt: '', caption: '' },
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
    {
      id: 'actual-2026-02-18-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-18 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-18).',
      photos: [
        { id: 'actual-photo-batch-030-img-1241', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-031-img-1243', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-032-img-1244', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-033-img-1253', src: '', alt: '', caption: '' },
      ],
    },
  ],
  '2026-02-24': [
    {
      id: 'actual-2026-02-24-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-24 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-24).',
      photos: [
        { id: 'actual-photo-batch-025-img-1232', src: '', alt: '', caption: '' },
      ],
    },
  ],
  '2026-02-14': [
    {
      id: 'actual-2026-02-14-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-14 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-14).',
      photos: [
        { id: 'actual-photo-batch-016-img-1187', src: '', alt: '', caption: '' },
      ],
    },
  ],
  '2026-02-15': [
    {
      id: 'actual-2026-02-15-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-15 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-15).',
      photos: [
        { id: 'actual-photo-batch-017-img-1190', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-018-img-1192', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-019-img-1197', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-020-img-1198', src: '', alt: '', caption: '' },
      ],
    },
  ],
  '2026-02-16': [
    {
      id: 'actual-2026-02-16-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-16 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-16).',
      photos: [
        { id: 'actual-photo-batch-021-img-1200', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-022-img-1210', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-023-img-1216', src: '', alt: '', caption: '' },
      ],
    },
  ],
  '2026-02-17': [
    {
      id: 'actual-2026-02-17-photo-batch',
      source: SOURCE,
      whenLabel: '2026-02-17 - Imported photo set',
      text: 'Imported family-thread photos grouped by EXIF capture date (2026-02-17).',
      photos: [
        { id: 'actual-photo-batch-001-79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-024-img-1231', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-026-img-1233', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-027-img-1234', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-028-img-1238', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-029-img-1239', src: '', alt: '', caption: '' },
        { id: 'actual-photo-batch-034-img-3024', src: '', alt: '', caption: '' },
      ],
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
