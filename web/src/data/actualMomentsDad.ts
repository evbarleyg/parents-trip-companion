import type { TripActualMoment } from '../types';

const DAD_TEXT_SOURCE = 'Dad updates (B-G-M Fam thread)';
const MOM_TEXT_SOURCE = 'Mom updates (B-G-M Fam thread)';
const DAD_PHOTO_SOURCE = 'Dad photo dump (EXIF date + itinerary geocode fallback)';
const MOM_PHOTO_SOURCE = 'Mom photo dump (EXIF date + itinerary geocode fallback)';

interface DayGeo {
  region: string;
  lat: number;
  lng: number;
}

interface FamilyTextUpdate {
  id: string;
  whenLabel: string;
  text: string;
}

interface FamilyPhotoMeta {
  capturedAt: string;
  originalName: string;
}

interface BuildPhotoMomentOptions {
  source: string;
  whenLabel: string;
  momentIdPrefix: string;
  photoIdPrefix: string;
  altLead: string;
  dateMethodText: string;
  captionLead: string;
  captionMetaLabel: string;
}

// Dad's numbered text notes are pinned to itinerary dates.
// #1 is explicitly the Saturday Dubai note; the remaining notes follow itinerary sequence.
export const DAD_ITINERARY_TEXT_UPDATE_DATES: Record<number, string> = {
  1: '2026-02-07',
  2: '2026-02-08',
  3: '2026-02-10',
  4: '2026-02-13',
  6: '2026-02-16',
  7: '2026-02-19',
};

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
  '2026-02-20': { region: 'Oman - Nizwa / Muscat', lat: 22.9333, lng: 57.5333 },
  '2026-02-21': { region: 'Oman - Muscat', lat: 23.588, lng: 58.3829 },
};

const DAD_TEXT_UPDATES: Record<string, FamilyTextUpdate[]> = {
  '2026-02-07': [
    {
      id: 'dad-text-2026-02-07-number-1',
      whenLabel: 'Sat, Feb 7 - Dubai - Dad update #1',
      text: 'It is early Saturday in Dubai. We are adjusting to the time shift, staying in Jumeirah Beach, and heading out for boat transit water sites before moving on to Abu Dhabi tomorrow.',
    },
  ],
  '2026-02-08': [
    {
      id: 'dad-text-2026-02-08-number-2',
      whenLabel: 'Sun, Feb 8 - Dubai to Abu Dhabi - Dad update #2',
      text: 'Sunday morning update from Dubai before taxi to Abu Dhabi. Notes mention boat ride around the Palm, Dubai Mall and Burj Khalifa, then Louvre Abu Dhabi and Super Bowl watch planning.',
    },
  ],
  '2026-02-10': [
    {
      id: 'dad-text-2026-02-10-number-3',
      whenLabel: 'Tue, Feb 10 - Al Maha to Dubai - Dad update #3',
      text: 'Good morning from Al Maha Desert Conservation Reserve. After Abu Dhabi and Super Bowl celebration, the plan was birding at Al Maha before returning to urban Dubai to meet the Oman tour group.',
    },
  ],
  '2026-02-13': [
    {
      id: 'dad-text-2026-02-13-number-4',
      whenLabel: 'Fri, Feb 13 - Salalah Mountains day - Dad update #4',
      text: 'Good morning from Salalah, Oman. Notes mention mosque, archaeology sites, coast, and a camel farm stop where Susan milked a camel before a Salalah mountain 4x4 day.',
    },
  ],
  '2026-02-16': [
    {
      id: 'dad-text-2026-02-16-number-6',
      whenLabel: 'Mon, Feb 16 - Muscat to Wahiba Sands - Dad update #6',
      text: 'Good morning from Muscat. They had arrived two days earlier from Salalah and were leaving for desert days, with references to ruins, souk scenes, snorkeling island, and Ramadan decorations.',
    },
  ],
  '2026-02-19': [
    {
      id: 'dad-text-2026-02-19-number-7',
      whenLabel: 'Thu, Feb 19 - Jebel Akhdar/Jebel Shams - Dad update #7',
      text: 'Hello from Jebel Akhdar at 6,000 feet. Third night in the mountain area before heading back toward Muscat after valley tours, mountain hikes, and hotel time above canyon views.',
    },
  ],
};

const MOM_TEXT_UPDATES: Record<string, FamilyTextUpdate[]> = {
  '2026-02-20': [
    {
      id: 'mom-text-2026-02-20-nizwa-ramadan',
      whenLabel: 'Fri, Feb 20 - Nizwa and Ramadan observations - Mom update',
      text: 'We went to Nizwa, a large area on a beautiful 1600 ft plateau filled with oases for dates and fruit, which are watered by these complex above and underground canals/aqueducts called falajs. Lots of old Omani history as tribes fought over these valuable areas, and the Persians, Ottomans and Portuguese tried to conquer them. None succeeded, so the Oman area was never colonized by outsiders, including Europeans. So, lots of fortresses. Today we went to Nizwa Fort and castle. Castle is from the 9th C and Fort (round part) 17th C. Ramadan started Thursday. We have had 2 days and things are different. Most restaurants are closed at lunch, except hotels, as most people are fasting: no water or food from sun up to sun down. We are asked to not eat or drink in front of those who may be fasting, including our drivers for the past 2 days. Breaking the fast is called iftar, and is a major food celebration with rituals. At sundown, break the fast with yogurt, lemon and dates. Then pray. Then eat. At the Chedi Hotel in Muscat, there is a lavish buffet with beautiful lights. In the mountain hotel, curtains are closed in the restaurant until after sundown so those who fast do not need to watch us eat.',
    },
  ],
  '2026-02-21': [
    {
      id: 'mom-text-2026-02-21-muscat-mosque',
      whenLabel: 'Sat, Feb 21 - Back in Muscat - Mom update',
      text: 'Today we are back in Muscat from the spectacular mountains of Oman. Some fun pics: men and women bathroom symbols. Today we visited the Sultan Qaboos Grand Mosque in Muscat. It is the most beautiful new building I have ever seen. It is enormous and was built in 4 years. It is a blend of Islamic styles and shows what can be done with ambition and unlimited budget.',
    },
  ],
};

const DAD_PHOTO_META: Record<string, FamilyPhotoMeta> = {
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

const MOM_PHOTO_META: Record<string, FamilyPhotoMeta> = {
  'mom-2026-02-20-img-1307.jpeg': { capturedAt: '2026:02:20 09:55:51', originalName: 'IMG_1307.jpeg' },
  'mom-2026-02-20-img-1308.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1308.jpeg' },
  'mom-2026-02-20-img-1309.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1309.jpeg' },
  'mom-2026-02-20-img-1312.jpeg': { capturedAt: '2026:02:20 09:46:53', originalName: 'IMG_1312.jpeg' },
  'mom-2026-02-20-img-1313.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1313.jpeg' },
  'mom-2026-02-20-img-1314.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1314.jpeg' },
  'mom-2026-02-20-img-1316.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1316.jpeg' },
  'mom-2026-02-20-img-1317.jpeg': { capturedAt: '2026:02:20 09:46:53', originalName: 'IMG_1317.jpeg' },
  'mom-2026-02-20-img-1318.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1318.jpeg' },
  'mom-2026-02-20-img-1319.jpeg': { capturedAt: '2026:02:20 09:46:54', originalName: 'IMG_1319.jpeg' },
  'mom-2026-02-21-img-1323.jpeg': { capturedAt: '2026:02:21 09:35:09', originalName: 'IMG_1323.jpeg' },
  'mom-2026-02-21-img-1325.jpeg': { capturedAt: '2026:02:21 09:35:08', originalName: 'IMG_1325.jpeg' },
  'mom-2026-02-21-img-1327.jpeg': { capturedAt: '2026:02:21 09:35:08', originalName: 'IMG_1327.jpeg' },
  'mom-2026-02-21-img-1328.jpeg': { capturedAt: '2026:02:21 09:35:08', originalName: 'IMG_1328.jpeg' },
  'mom-2026-02-21-img-1329.jpeg': { capturedAt: '2026:02:21 09:35:08', originalName: 'IMG_1329.jpeg' },
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

const MOM_PHOTOS_BY_DATE: Record<string, string[]> = {
  '2026-02-20': [
    'mom-2026-02-20-img-1307.jpeg',
    'mom-2026-02-20-img-1308.jpeg',
    'mom-2026-02-20-img-1309.jpeg',
    'mom-2026-02-20-img-1312.jpeg',
    'mom-2026-02-20-img-1313.jpeg',
    'mom-2026-02-20-img-1314.jpeg',
    'mom-2026-02-20-img-1316.jpeg',
    'mom-2026-02-20-img-1317.jpeg',
    'mom-2026-02-20-img-1318.jpeg',
    'mom-2026-02-20-img-1319.jpeg',
  ],
  '2026-02-21': [
    'mom-2026-02-21-img-1323.jpeg',
    'mom-2026-02-21-img-1325.jpeg',
    'mom-2026-02-21-img-1327.jpeg',
    'mom-2026-02-21-img-1328.jpeg',
    'mom-2026-02-21-img-1329.jpeg',
  ],
};

function formatGeo(geo: DayGeo): string {
  return `${geo.region} (${geo.lat.toFixed(4)}, ${geo.lng.toFixed(4)})`;
}

function buildSourceTextMoments(date: string, source: string, updatesByDate: Record<string, FamilyTextUpdate[]>): TripActualMoment[] {
  return (updatesByDate[date] || []).map((update) => ({
    id: update.id,
    source,
    whenLabel: update.whenLabel,
    text: update.text,
    photos: [],
  }));
}

function buildPhotoMoment(
  date: string,
  fileNames: string[],
  metaByFile: Record<string, FamilyPhotoMeta>,
  options: BuildPhotoMomentOptions,
): TripActualMoment {
  const geo = GEO_BY_DATE[date];

  return {
    id: `${options.momentIdPrefix}-${date}`,
    source: options.source,
    whenLabel: options.whenLabel,
    text: geo
      ? `${options.dateMethodText} GPS tags were missing in the shared export, so map location is inferred from the itinerary day anchor at ${formatGeo(geo)}.`
      : options.dateMethodText,
    photos: fileNames.map((fileName, index) => {
      const meta = metaByFile[fileName] || { capturedAt: 'unknown', originalName: fileName };
      const geoLabel = geo ? ` in ${geo.region}` : '';
      const geoCaption = geo ? ` | inferred map anchor: ${formatGeo(geo)}` : '';

      return {
        id: `${options.photoIdPrefix}-${date}-${index + 1}`,
        src: `/actuals/${fileName}`,
        alt: `${options.altLead} ${meta.originalName}${geoLabel} on ${date}`,
        caption: `${meta.originalName} | ${options.captionMetaLabel} ${meta.capturedAt}${options.captionLead}${geoCaption}`,
      };
    }),
  };
}

function buildTextMoments(date: string): TripActualMoment[] {
  return [
    ...buildSourceTextMoments(date, DAD_TEXT_SOURCE, DAD_TEXT_UPDATES),
    ...buildSourceTextMoments(date, MOM_TEXT_SOURCE, MOM_TEXT_UPDATES),
  ];
}

function buildPhotoMoments(date: string): TripActualMoment[] {
  const dadPhotos = DAD_PHOTOS_BY_DATE[date] || [];
  const momPhotos = MOM_PHOTOS_BY_DATE[date] || [];
  const moments: TripActualMoment[] = [];

  if (dadPhotos.length > 0) {
    moments.push(
      buildPhotoMoment(date, dadPhotos, DAD_PHOTO_META, {
        source: DAD_PHOTO_SOURCE,
        whenLabel: `${date} - EXIF photo set`,
        momentIdPrefix: 'dad-photos',
        photoIdPrefix: 'dad-photo',
        altLead: 'Dad travel photo',
        dateMethodText:
          'Photos were dated from EXIF creation metadata.',
        captionLead: '',
        captionMetaLabel: 'EXIF',
      }),
    );
  }

  if (momPhotos.length > 0) {
    moments.push(
      buildPhotoMoment(date, momPhotos, MOM_PHOTO_META, {
        source: MOM_PHOTO_SOURCE,
        whenLabel: `${date} - EXIF photo set`,
        momentIdPrefix: 'mom-photos',
        photoIdPrefix: 'mom-photo',
        altLead: 'Mom travel photo',
        dateMethodText:
          'Photos were dated from EXIF creation metadata.',
        captionLead: '',
        captionMetaLabel: 'EXIF',
      }),
    );
  }

  return moments;
}

function buildMomentsByDate(): Record<string, TripActualMoment[]> {
  const dates = new Set<string>([
    ...Object.keys(DAD_TEXT_UPDATES),
    ...Object.keys(MOM_TEXT_UPDATES),
    ...Object.keys(DAD_PHOTOS_BY_DATE),
    ...Object.keys(MOM_PHOTOS_BY_DATE),
  ]);
  const out: Record<string, TripActualMoment[]> = {};

  for (const date of [...dates].sort()) {
    out[date] = [...buildTextMoments(date), ...buildPhotoMoments(date)];
  }

  return out;
}

export const DAD_ACTUAL_MOMENTS_BY_DATE: Record<string, TripActualMoment[]> = buildMomentsByDate();
