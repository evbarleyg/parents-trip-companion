import type { TripActualMoment } from '../types';

const DAD_TEXT_SOURCE = 'Dad updates (B-G-M Fam thread)';
const DAD_PHOTO_SOURCE = 'Dad photo dump (EXIF date + itinerary geocode fallback)';

interface DayGeo {
  region: string;
  lat: number;
  lng: number;
}

const GEO_BY_DATE: Record<string, DayGeo> = {
  '2026-02-05': { region: 'Dubai Creek', lat: 25.2637, lng: 55.3075 },
  '2026-02-07': { region: 'Downtown Dubai', lat: 25.1972, lng: 55.2744 },
  '2026-02-09': { region: 'Abu Dhabi / Al Maha Desert', lat: 24.8043, lng: 55.5793 },
  '2026-02-10': { region: 'Dubai Group Hotel', lat: 25.253, lng: 55.3323 },
  '2026-02-12': { region: 'Oman - Salalah', lat: 17.0151, lng: 54.0924 },
  '2026-02-13': { region: 'Oman - Dhofar Mountains', lat: 17.2662, lng: 54.1037 },
  '2026-02-14': { region: 'Oman - Muscat', lat: 23.588, lng: 58.3829 },
  '2026-02-15': { region: 'Oman - Muscat Coastline', lat: 23.658, lng: 58.398 },
  '2026-02-16': { region: 'Oman - Wahiba Sands', lat: 22.4802, lng: 58.7374 },
  '2026-02-18': { region: 'Oman - Jebel Akhdar', lat: 23.0721, lng: 57.6675 },
  '2026-02-19': { region: 'Oman - Jebel Shams', lat: 23.2376, lng: 57.2635 },
};

const DAD_TEXT_UPDATES: Record<string, Array<{ id: string; whenLabel: string; text: string }>> = {
  '2026-02-07': [
    {
      id: 'dad-text-2026-02-07-number-1',
      whenLabel: 'Sat, Feb 7 - Dad update #1',
      text: 'It is early Saturday in Dubai. We are adjusting to the time shift, staying in Jumeirah Beach, and heading out for boat transit water sites before moving on to Abu Dhabi tomorrow.',
    },
  ],
  '2026-02-08': [
    {
      id: 'dad-text-2026-02-08-number-2',
      whenLabel: 'Sun, Feb 8 - Dad update #2',
      text: 'Sunday morning update from Dubai before taxi to Abu Dhabi. Notes mention boat ride around the Palm, Dubai Mall and Burj Khalifa, then Louvre Abu Dhabi and Super Bowl watch planning.',
    },
  ],
  '2026-02-10': [
    {
      id: 'dad-text-2026-02-10-number-3',
      whenLabel: 'Tue, Feb 10 - Dad update #3',
      text: 'Good morning from Al Maha Desert Conservation Reserve. After Abu Dhabi and Super Bowl celebration, the plan was birding at Al Maha before returning to urban Dubai to meet the Oman tour group.',
    },
  ],
  '2026-02-13': [
    {
      id: 'dad-text-2026-02-13-number-4',
      whenLabel: 'Fri, Feb 13 - Dad update #4',
      text: 'Good morning from Salalah, Oman. Notes mention mosque, archaeology sites, coast, and a camel farm stop where Susan milked a camel before a Salalah mountain 4x4 day.',
    },
  ],
  '2026-02-16': [
    {
      id: 'dad-text-2026-02-16-number-6',
      whenLabel: 'Mon, Feb 16 - Dad update #6',
      text: 'Good morning from Muscat. They had arrived two days earlier from Salalah and were leaving for desert days, with references to ruins, souk scenes, snorkeling island, and Ramadan decorations.',
    },
  ],
  '2026-02-19': [
    {
      id: 'dad-text-2026-02-19-number-7',
      whenLabel: 'Thu, Feb 19 - Dad update #7',
      text: 'Hello from Jebel Akhdar at 6,000 feet. Third night in the mountain area before heading back toward Muscat after valley tours, mountain hikes, and hotel time above canyon views.',
    },
  ],
};

const DAD_PHOTO_META: Record<string, { capturedAt: string; originalName: string }> = {
  'dad-2026-02-05-79198991565-244df404-a1ce-4c62-8ffa-605a7db358d0.jpeg': {
    capturedAt: '2026:02:05 17:11:55',
    originalName: '79198991565__244DF404-A1CE-4C62-8FFA-605A7DB358D0.jpeg',
  },
  'dad-2026-02-05-img-1034.jpeg': { capturedAt: '2026:02:05 19:35:04', originalName: 'IMG_1034.jpeg' },
  'dad-2026-02-07-img-0561.jpeg': { capturedAt: '2026:02:07 11:37:44', originalName: 'IMG_0561.jpeg' },
  'dad-2026-02-07-img-0562.jpeg': { capturedAt: '2026:02:07 11:38:52', originalName: 'IMG_0562.jpeg' },
  'dad-2026-02-07-img-0565.jpeg': { capturedAt: '2026:02:07 16:35:42', originalName: 'IMG_0565.jpeg' },
  'dad-2026-02-07-img-1055.jpeg': { capturedAt: '2026:02:07 15:43:31', originalName: 'IMG_1055.jpeg' },
  'dad-2026-02-07-img-1062.jpeg': { capturedAt: '2026:02:07 16:37:31', originalName: 'IMG_1062.jpeg' },
  'dad-2026-02-09-img-0579.jpeg': { capturedAt: '2026:02:09 05:19:18', originalName: 'IMG_0579.jpeg' },
  'dad-2026-02-09-img-0584.jpeg': { capturedAt: '2026:02:09 17:09:33', originalName: 'IMG_0584.jpeg' },
  'dad-2026-02-10-img-1085.jpeg': { capturedAt: '2026:02:10 06:56:31', originalName: 'IMG_1085.jpeg' },
  'dad-2026-02-12-img-0601.jpeg': { capturedAt: '2026:02:12 06:41:08', originalName: 'IMG_0601.jpeg' },
  'dad-2026-02-12-img-0607.jpeg': { capturedAt: '2026:02:12 14:20:59', originalName: 'IMG_0607.jpeg' },
  'dad-2026-02-12-img-0610.jpeg': { capturedAt: '2026:02:12 16:02:33', originalName: 'IMG_0610.jpeg' },
  'dad-2026-02-12-img-0611.jpeg': { capturedAt: '2026:02:12 16:04:37', originalName: 'IMG_0611.jpeg' },
  'dad-2026-02-12-img-1130.jpeg': { capturedAt: '2026:02:12 16:05:43', originalName: 'IMG_1130.jpeg' },
  'dad-2026-02-12-img-1139.jpeg': { capturedAt: '2026:02:12 18:17:36', originalName: 'IMG_1139.jpeg' },
  'dad-2026-02-13-img-0623.jpeg': { capturedAt: '2026:02:13 11:45:02', originalName: 'IMG_0623.jpeg' },
  'dad-2026-02-13-img-1150.jpeg': { capturedAt: '2026:02:13 11:59:46', originalName: 'IMG_1150.jpeg' },
  'dad-2026-02-13-img-1154.jpeg': { capturedAt: '2026:02:13 12:22:24', originalName: 'IMG_1154.jpeg' },
  'dad-2026-02-13-img-1156.jpeg': { capturedAt: '2026:02:13 12:47:53', originalName: 'IMG_1156.jpeg' },
  'dad-2026-02-13-img-1169.jpeg': { capturedAt: '2026:02:13 16:27:18', originalName: 'IMG_1169.jpeg' },
  'dad-2026-02-14-img-0644.jpeg': { capturedAt: '2026:02:14 16:33:21', originalName: 'IMG_0644.jpeg' },
  'dad-2026-02-15-img-1190.jpeg': { capturedAt: '2026:02:15 10:06:25', originalName: 'IMG_1190.jpeg' },
  'dad-2026-02-15-img-1197.jpeg': { capturedAt: '2026:02:15 18:56:10', originalName: 'IMG_1197.jpeg' },
  'dad-2026-02-18-img-0676.jpeg': { capturedAt: '2026:02:18 07:09:52', originalName: 'IMG_0676.jpeg' },
  'dad-2026-02-18-img-0679.jpeg': { capturedAt: '2026:02:18 07:10:12', originalName: 'IMG_0679.jpeg' },
  'dad-2026-02-18-img-1253.jpeg': { capturedAt: '2026:02:18 18:39:20', originalName: 'IMG_1253.jpeg' },
  'dad-2026-02-19-img-0686.jpeg': { capturedAt: '2026:02:19 11:36:41', originalName: 'IMG_0686.jpeg' },
  'dad-2026-02-19-img-1304.jpeg': { capturedAt: '2026:02:19 16:10:40', originalName: 'IMG_1304.jpeg' },
};

const DAD_PHOTOS_BY_DATE: Record<string, string[]> = {
  '2026-02-05': [
    'dad-2026-02-05-79198991565-244df404-a1ce-4c62-8ffa-605a7db358d0.jpeg',
    'dad-2026-02-05-img-1034.jpeg',
  ],
  '2026-02-07': [
    'dad-2026-02-07-img-0561.jpeg',
    'dad-2026-02-07-img-0562.jpeg',
    'dad-2026-02-07-img-0565.jpeg',
    'dad-2026-02-07-img-1055.jpeg',
    'dad-2026-02-07-img-1062.jpeg',
  ],
  '2026-02-09': ['dad-2026-02-09-img-0579.jpeg', 'dad-2026-02-09-img-0584.jpeg'],
  '2026-02-10': ['dad-2026-02-10-img-1085.jpeg'],
  '2026-02-12': [
    'dad-2026-02-12-img-0601.jpeg',
    'dad-2026-02-12-img-0607.jpeg',
    'dad-2026-02-12-img-0610.jpeg',
    'dad-2026-02-12-img-0611.jpeg',
    'dad-2026-02-12-img-1130.jpeg',
    'dad-2026-02-12-img-1139.jpeg',
  ],
  '2026-02-13': [
    'dad-2026-02-13-img-0623.jpeg',
    'dad-2026-02-13-img-1150.jpeg',
    'dad-2026-02-13-img-1154.jpeg',
    'dad-2026-02-13-img-1156.jpeg',
    'dad-2026-02-13-img-1169.jpeg',
  ],
  '2026-02-14': ['dad-2026-02-14-img-0644.jpeg'],
  '2026-02-15': ['dad-2026-02-15-img-1190.jpeg', 'dad-2026-02-15-img-1197.jpeg'],
  '2026-02-18': [
    'dad-2026-02-18-img-0676.jpeg',
    'dad-2026-02-18-img-0679.jpeg',
    'dad-2026-02-18-img-1253.jpeg',
  ],
  '2026-02-19': ['dad-2026-02-19-img-0686.jpeg', 'dad-2026-02-19-img-1304.jpeg'],
};

function formatGeo(geo: DayGeo): string {
  return `${geo.region} (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})`;
}

function buildTextMoments(date: string): TripActualMoment[] {
  const updates = DAD_TEXT_UPDATES[date] || [];
  return updates.map((update) => ({
    id: update.id,
    source: DAD_TEXT_SOURCE,
    whenLabel: update.whenLabel,
    text: update.text,
    photos: [],
  }));
}

function buildPhotoMoment(date: string, fileNames: string[]): TripActualMoment {
  const geo = GEO_BY_DATE[date];
  return {
    id: `dad-photos-${date}`,
    source: DAD_PHOTO_SOURCE,
    whenLabel: `${date} - EXIF photo set`,
    text: geo
      ? `Photos were dated from EXIF creation metadata. GPS tags were missing in the shared export, so map location is inferred from the itinerary day anchor at ${formatGeo(geo)}.`
      : 'Photos were dated from EXIF creation metadata. GPS tags were missing in the shared export.',
    photos: fileNames.map((fileName, index) => {
      const meta = DAD_PHOTO_META[fileName];
      const geoLabel = geo ? ` in ${geo.region}` : '';
      const geoCaption = geo ? ` | inferred map anchor: ${formatGeo(geo)}` : '';
      return {
        id: `dad-photo-${date}-${index + 1}`,
        src: `/actuals/${fileName}`,
        alt: `Dad travel photo ${meta.originalName}${geoLabel} on ${date}`,
        caption: `${meta.originalName} | EXIF ${meta.capturedAt}${geoCaption}`,
      };
    }),
  };
}

function buildMomentsByDate(): Record<string, TripActualMoment[]> {
  const dates = new Set<string>([...Object.keys(DAD_TEXT_UPDATES), ...Object.keys(DAD_PHOTOS_BY_DATE)]);
  const out: Record<string, TripActualMoment[]> = {};

  for (const date of [...dates].sort()) {
    const textMoments = buildTextMoments(date);
    const photos = DAD_PHOTOS_BY_DATE[date] || [];
    const photoMoment = photos.length > 0 ? [buildPhotoMoment(date, photos)] : [];
    out[date] = textMoments.concat(photoMoment);
  }

  return out;
}

export const DAD_ACTUAL_MOMENTS_BY_DATE: Record<string, TripActualMoment[]> = buildMomentsByDate();
