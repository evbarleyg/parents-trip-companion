import type { TripActualMoment, TripActualPhoto } from '../types';

const PHOTO_LIBRARY_SOURCE = 'Photo library export (EXIF date + GPS where available)';

interface PhotoSeed {
  id: string;
  src: string;
  originalName: string;
  capturedAt: string;
  label: string;
  alt?: string;
  caption?: string;
  lat?: number;
  lng?: number;
  convertedFromHeic?: boolean;
}

function formatGps(lat: number | undefined, lng: number | undefined): string {
  if (typeof lat !== 'number' || typeof lng !== 'number') return '';
  return ` | GPS ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

function buildPhoto(seed: PhotoSeed): TripActualPhoto {
  return {
    id: seed.id,
    src: seed.src,
    alt: seed.alt || `${seed.label} captured during the trip.`,
    caption:
      seed.caption ||
      `Captured ${seed.capturedAt}${seed.convertedFromHeic ? ' | rendered from HEIC for web use' : ''}${formatGps(
        seed.lat,
        seed.lng,
      )}`,
    lat: seed.lat,
    lng: seed.lng,
  };
}

function buildPhotoMoment(
  date: string,
  whenLabel: string,
  text: string,
  seeds: PhotoSeed[],
): TripActualMoment {
  return {
    id: `actual-${date}-photo-library`,
    source: PHOTO_LIBRARY_SOURCE,
    whenLabel,
    text,
    photos: seeds.map(buildPhoto),
  };
}

const PHOTO_SEEDS_BY_DATE: Record<string, PhotoSeed[]> = {
  '2026-02-28': [
    {
      id: 'actual-photo-2026-02-28-maldives-01',
      src: '/actuals/mom-2026-02-28-maldives-photo-01.jpeg',
      originalName: 'uuid=4D64A450-1A48-46B1-BB8C-EEB9C8D40E81&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:02:28 09:39:42',
      label: 'Maldives resort photo from February 28, 2026',
      alt: 'Morning view of the Machchafushi jetty with resort tables and the striped lighthouse.',
      caption: 'Morning at the Machchafushi jetty with the striped lighthouse in the distance.',
      lat: 3.594317,
      lng: 72.884256,
    },
    {
      id: 'actual-photo-2026-02-28-maldives-02',
      src: '/actuals/mom-2026-02-28-maldives-photo-02.jpeg',
      originalName: 'uuid=F4E94538-D93C-491D-8158-63551E7F92E5&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:02:28 13:52:42',
      label: 'Maldives resort photo from February 28, 2026',
      alt: 'Seafood lunch on a shaded table at the Maldives resort.',
      caption: 'Seafood lunch at the Maldives resort.',
      lat: 3.594069,
      lng: 72.883264,
    },
    {
      id: 'actual-photo-2026-02-28-maldives-03',
      src: '/actuals/mom-2026-02-28-maldives-photo-03.jpeg',
      originalName: 'uuid=1DD1561C-8A7C-4255-97C2-5F76E1CEFE1F&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:02:28 18:12:54',
      label: 'Maldives resort photo from February 28, 2026',
      alt: 'Sunset selfie at the Machchafushi sign with overwater villas behind.',
      caption: 'Sunset selfie at the Machchafushi sign with the overwater villas behind.',
      lat: 3.594164,
      lng: 72.881569,
    },
    {
      id: 'actual-photo-2026-02-28-maldives-04',
      src: '/actuals/mom-2026-02-28-maldives-photo-04.jpeg',
      originalName: 'uuid=06E66D48-6AC4-414D-AEC5-41073C0BC6BB&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:02:28 18:20:09',
      label: 'Maldives resort photo from February 28, 2026',
      alt: 'The sun setting between the overwater villas in the Maldives.',
      caption: 'Sun setting between the overwater villas.',
      lat: 3.593925,
      lng: 72.881981,
    },
    {
      id: 'actual-photo-2026-02-28-maldives-05',
      src: '/actuals/mom-2026-02-28-maldives-photo-05.jpeg',
      originalName: 'uuid=D6A7F3F1-043E-4C80-AEB3-88071E3A1FA9&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:02:28 18:21:14',
      label: 'Maldives resort photo from February 28, 2026',
      alt: 'Twilight over the lagoon and overwater villas in the Maldives.',
      caption: 'Twilight over the overwater villas and lagoon.',
      lat: 3.593933,
      lng: 72.881958,
    },
  ],
  '2026-03-01': [
    {
      id: 'actual-photo-2026-03-01-maldives-01',
      src: '/actuals/mom-2026-03-01-maldives-photo-01.jpeg',
      originalName: 'uuid=300970AA-F2F1-4383-B6D5-24B7E42BDF1D&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:01 06:22:49',
      label: 'Maldives departure-day photo from March 1, 2026',
      alt: 'Seaplane at sunrise on the water at the end of the Maldives stay.',
      caption: 'Early-morning seaplane on the water at the end of the Maldives stay.',
      lat: 3.591289,
      lng: 72.880736,
    },
  ],
  '2026-03-02': [
    {
      id: 'actual-photo-2026-03-02-istanbul-01',
      src: '/actuals/mom-2026-03-02-istanbul-photo-01.jpeg',
      originalName: 'uuid=255099FC-D34B-48D2-91D7-3C37B6692F95&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 07:00:21',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Dusk view across the Bosporus from the hotel neighborhood in Istanbul.',
      caption: 'Dusk view across the Bosporus toward the Asian side from the hotel neighborhood.',
      lat: 41.026817,
      lng: 28.975728,
    },
    {
      id: 'actual-photo-2026-03-02-istanbul-02',
      src: '/actuals/mom-2026-03-02-istanbul-photo-02.jpeg',
      originalName: 'uuid=E5A65135-71A3-405D-A3AB-D401D06C8621&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 11:06:49',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Black-and-white street cat curled up in a flower pot in Istanbul.',
      caption: 'A black-and-white street cat curled up in a flower pot in Cihangir.',
    },
    {
      id: 'actual-photo-2026-03-02-istanbul-03',
      src: '/actuals/mom-2026-03-02-istanbul-photo-03.jpeg',
      originalName: 'uuid=C22AB013-7923-4D7A-80C2-92AAE7E9CF37&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 11:31:05',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Ginger street cat sleeping on a bench in Istanbul.',
      caption: 'A ginger cat sleeping on a bench during the neighborhood walk.',
    },
    {
      id: 'actual-photo-2026-03-02-istanbul-04',
      src: '/actuals/mom-2026-03-02-istanbul-photo-04.jpeg',
      originalName: 'uuid=025A8604-7B22-4AEF-8E18-8D3272F469A8&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 12:11:05',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Painted serving tray with a wide-eyed cat in a shop display.',
      caption: 'Painted tray with a wide-eyed cat in a shop display near Galataport.',
      lat: 41.033378,
      lng: 28.993189,
    },
    {
      id: 'actual-photo-2026-03-02-istanbul-05',
      src: '/actuals/mom-2026-03-02-istanbul-photo-05.jpeg',
      originalName: 'uuid=D8880D28-B263-4BBC-8CA0-E97CE84F2FC8&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 12:33:50',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Red circular sculpture on the Istanbul waterfront with the Bosporus beyond.',
      caption: 'Red circular sculpture at Galataport with the Bosporus visible through the center.',
      lat: 41.027456,
      lng: 28.986769,
    },
    {
      id: 'actual-photo-2026-03-02-istanbul-06',
      src: '/actuals/mom-2026-03-02-istanbul-photo-06.jpeg',
      originalName: 'uuid=FDBB8360-C1DC-4669-B1FC-1B2CA490544C&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 15:54:48',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Susan standing in front of a blue-tiled wall in Rustem Pasa Mosque.',
      caption: 'Susan in front of the blue-tiled wall at Rustem Pasa Mosque.',
      lat: 41.017747,
      lng: 28.968658,
    },
    {
      id: 'actual-photo-2026-03-02-istanbul-07',
      src: '/actuals/mom-2026-03-02-istanbul-photo-07.jpeg',
      originalName: 'uuid=A4D0D10D-AE2B-43A8-BCC7-E55A2529975E&code=001&library=3&type=1&mode=1&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:02 16:04:02',
      label: 'Istanbul photo from March 2, 2026',
      alt: 'Waterfront selfie in Istanbul with the Bosporus behind.',
      caption: 'Waterfront selfie during the Bosporus walk.',
      lat: 41.018303,
      lng: 28.971617,
    },
  ],
  '2026-03-03': [
    {
      id: 'actual-photo-2026-03-03-istanbul-01',
      src: '/actuals/mom-2026-03-03-istanbul-photo-01.jpeg',
      originalName: 'uuid=1F7AFC19-34E5-4FAB-A9FA-51CA258756DC&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:03 12:39:29',
      label: 'Istanbul photo from March 3, 2026',
      alt: 'Two Istanbul street cats curled together beside a rough stone wall.',
      caption: 'Two Istanbul street cats curled together beside a stone wall.',
      lat: 41.024731,
      lng: 28.975897,
    },
  ],
  '2026-03-04': [
    {
      id: 'actual-photo-2026-03-04-istanbul-01',
      src: '/actuals/mom-2026-03-04-istanbul-photo-01.jpeg',
      originalName: 'uuid=ABCE3021-8EA2-48FF-8E24-2040DCFE6E39&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:04 11:44:43',
      label: 'Istanbul photo from March 4, 2026',
      alt: 'Large Turkish breakfast spread on a cafe table in Cihangir.',
      caption: 'Big Turkish breakfast spread in Cihangir.',
      lat: 41.031536,
      lng: 28.983339,
    },
    {
      id: 'actual-photo-2026-03-04-istanbul-02',
      src: '/actuals/mom-2026-03-04-istanbul-photo-02.jpeg',
      originalName: 'uuid=BCB412A4-19E4-496A-AB53-D14CC8E86E12&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:04 14:17:58',
      label: 'Istanbul photo from March 4, 2026',
      alt: 'Jim with a Diet Coke by the Bosporus while a cat stretches across a chair.',
      caption: 'Jim with a Diet Coke on the Bosporus while a cat steals the best seat.',
      lat: 41.033817,
      lng: 29.024803,
    },
    {
      id: 'actual-photo-2026-03-04-istanbul-03',
      src: '/actuals/mom-2026-03-04-istanbul-photo-03.jpeg',
      originalName: 'uuid=A80750EF-4635-45FD-9D8F-4550744C3BEE&code=001&library=3&type=1&mode=2&loc=true&cap=true.jpeg',
      capturedAt: '2026:03:04 17:42:55',
      label: 'Istanbul photo from March 4, 2026',
      alt: 'Wide afternoon panorama over the Bosporus and old city rooftops.',
      caption: 'Clear afternoon panorama over the Bosporus and the old city rooftops.',
    },
    {
      id: 'actual-photo-2026-03-04-istanbul-04',
      src: '/actuals/mom-2026-03-04-istanbul-photo-04.jpeg',
      originalName: 'IMG_1435.jpeg',
      capturedAt: '2026:03:04 20:25:13',
      label: 'Istanbul photo from March 4, 2026',
      alt: 'Full moon rising over the Bosporus and Istanbul skyline at dusk.',
      caption: 'Full moon rising over the Bosporus and city lights at dusk.',
      lat: 41.026658,
      lng: 28.975892,
    },
  ],
  '2026-03-05': [
    {
      id: 'actual-photo-2026-03-05-istanbul-01',
      src: '/actuals/mom-2026-03-05-istanbul-photo-01.jpeg',
      originalName: '79437712500__22CD7D34-13C7-4DEC-BE84-7BEF59B943B2.heic',
      capturedAt: '2026:03:05 07:18:44',
      label: 'Istanbul photo from March 5, 2026',
      alt: 'Fiery sunrise over the Bosporus and the Istanbul rooftops.',
      caption: 'Fiery sunrise over the Bosporus and city rooftops from the hotel.',
      lat: 41.026817,
      lng: 28.975728,
      convertedFromHeic: true,
    },
    {
      id: 'actual-photo-2026-03-05-istanbul-02',
      src: '/actuals/mom-2026-03-05-istanbul-photo-02.jpeg',
      originalName: 'IMG_1437.heic',
      capturedAt: '2026:03:05 07:23:01',
      label: 'Istanbul photo from March 5, 2026',
      alt: 'Red sunrise over the Bosporus with reflections on the water.',
      caption: 'Another sunrise view with the red sky reflecting on the water.',
      lat: 41.026817,
      lng: 28.975728,
      convertedFromHeic: true,
    },
    {
      id: 'actual-photo-2026-03-05-istanbul-03',
      src: '/actuals/mom-2026-03-05-istanbul-photo-03.jpeg',
      originalName: '79439282902__405DA1AC-B340-4713-85D7-06B19F30BB4E.heic',
      capturedAt: '2026:03:05 11:40:28',
      label: 'Istanbul photo from March 5, 2026',
      alt: 'Stone monument in the archaeological museum grounds in Istanbul.',
      caption: 'Stone monument in the archaeological museum grounds.',
      lat: 41.011742,
      lng: 28.981512,
      convertedFromHeic: true,
    },
    {
      id: 'actual-photo-2026-03-05-istanbul-04',
      src: '/actuals/mom-2026-03-05-istanbul-photo-04.jpeg',
      originalName: '79439660330__CAF993F5-CDDF-44DF-9F65-BFB2EB7B60F3.heic',
      capturedAt: '2026:03:05 12:43:23',
      label: 'Istanbul photo from March 5, 2026',
      alt: 'Large earthenware jars in the archaeological museum courtyard.',
      caption: 'Large earthenware jars in the archaeological museum courtyard.',
      lat: 41.011742,
      lng: 28.981512,
      convertedFromHeic: true,
    },
    {
      id: 'actual-photo-2026-03-05-istanbul-05',
      src: '/actuals/mom-2026-03-05-istanbul-photo-05.jpeg',
      originalName: 'IMG_1440.heic',
      capturedAt: '2026:03:05 14:04:44',
      label: 'Istanbul photo from March 5, 2026',
      alt: 'Jim sharing tea with a cat during the park break in Istanbul.',
      caption: 'Jim sharing tea with a cat during the Gulhane Park break.',
      lat: 41.012911,
      lng: 28.981861,
      convertedFromHeic: true,
    },
    {
      id: 'actual-photo-2026-03-05-istanbul-06',
      src: '/actuals/mom-2026-03-05-istanbul-photo-06.jpeg',
      originalName: 'IMG_1446.heic',
      capturedAt: '2026:03:05 22:29:39',
      label: 'Istanbul photo from March 5, 2026',
      alt: 'Night street view up to Galata Tower lit green.',
      caption: 'Night view up the street to Galata Tower lit green.',
      lat: 41.025629,
      lng: 28.974138,
      convertedFromHeic: true,
    },
  ],
  '2026-03-06': [
    {
      id: 'actual-photo-2026-03-06-istanbul-01',
      src: '/actuals/mom-2026-03-06-istanbul-photo-01.jpeg',
      originalName: 'IMG_0787.jpeg',
      capturedAt: '2026:03:06 09:57:05',
      label: 'Istanbul photo from March 6, 2026',
      alt: 'Susan at a cafe table with Galata Tower behind her.',
      caption: 'Susan at a cafe table with Galata Tower behind her.',
      lat: 41.025964,
      lng: 28.974572,
    },
  ],
  '2026-03-07': [
    {
      id: 'actual-photo-2026-03-07-istanbul-01',
      src: '/actuals/mom-2026-03-07-istanbul-photo-01.jpeg',
      originalName: 'IMG_1453.jpeg',
      capturedAt: '2026:03:07 08:46:16',
      label: 'Istanbul departure photo from March 7, 2026',
      alt: 'Hotel cat inspecting the luggage before departure from Istanbul.',
      caption: 'Hotel cat inspecting the luggage before departure.',
      lat: 41.026894,
      lng: 28.975619,
    },
    {
      id: 'actual-photo-2026-03-07-istanbul-02',
      src: '/actuals/mom-2026-03-07-istanbul-photo-02.jpeg',
      originalName: '79459470432__10482E09-D7B6-4597-A647-0011AE7A7B72.jpeg',
      capturedAt: '2026:03:07 16:45:04',
      label: 'Lisbon waterfront photo from March 7, 2026',
      alt: 'Calm waterfront view across the Tagus in Lisbon near Praça do Comércio.',
      caption: 'Calm Lisbon waterfront view near Praça do Comércio.',
      lat: 38.707889,
      lng: -9.136592,
    },
  ],
};

export const PHOTO_LIBRARY_ACTUAL_MOMENTS_BY_DATE: Record<string, TripActualMoment[]> = {
  '2026-02-28': [
    buildPhotoMoment(
      '2026-02-28',
      'Fri, Feb 28 - Maldives photo library',
      'Imported from the local photo library by EXIF capture date. All five Maldives photos kept their GPS tags and can be plotted on the map.',
      PHOTO_SEEDS_BY_DATE['2026-02-28'],
    ),
  ],
  '2026-03-01': [
    buildPhotoMoment(
      '2026-03-01',
      'Sun, Mar 1 - Maldives departure photo library',
      'Imported from the local photo library by EXIF capture date. This final Maldives photo retained GPS and lands on the seeded travel day into Istanbul.',
      PHOTO_SEEDS_BY_DATE['2026-03-01'],
    ),
  ],
  '2026-03-02': [
    buildPhotoMoment(
      '2026-03-02',
      'Mon, Mar 2 - Istanbul photo library',
      'Imported from the local photo library by EXIF capture date. GPS was preserved for five of the seven Istanbul photos and those points can be plotted on the map.',
      PHOTO_SEEDS_BY_DATE['2026-03-02'],
    ),
  ],
  '2026-03-03': [
    buildPhotoMoment(
      '2026-03-03',
      'Tue, Mar 3 - Istanbul photo library',
      'Imported from the local photo library by EXIF capture date. The March 3 Istanbul photo kept its GPS point for map plotting.',
      PHOTO_SEEDS_BY_DATE['2026-03-03'],
    ),
  ],
  '2026-03-04': [
    buildPhotoMoment(
      '2026-03-04',
      'Wed, Mar 4 - Istanbul photo library',
      'Imported from the local photo library by EXIF capture date. Three of the four Istanbul photos retained GPS metadata and can be plotted on the map.',
      PHOTO_SEEDS_BY_DATE['2026-03-04'],
    ),
  ],
  '2026-03-05': [
    buildPhotoMoment(
      '2026-03-05',
      'Thu, Mar 5 - Istanbul photo library',
      'Imported from the local photo library by EXIF capture date. These six Istanbul photos were HEIC originals, now re-rendered into web-safe JPEGs; map points are inferred only where the travelogue and timestamps make the location clear.',
      PHOTO_SEEDS_BY_DATE['2026-03-05'],
    ),
  ],
  '2026-03-06': [
    buildPhotoMoment(
      '2026-03-06',
      'Fri, Mar 6 - Istanbul photo library',
      'Imported from the local photo library by EXIF capture date. The March 6 Istanbul photo retained GPS and can be plotted on the map.',
      PHOTO_SEEDS_BY_DATE['2026-03-06'],
    ),
  ],
  '2026-03-07': [
    buildPhotoMoment(
      '2026-03-07',
      'Sat, Mar 7 - Istanbul departure and Lisbon arrival photo library',
      'Imported from the local photo library by EXIF capture date. March 7 includes a departure-morning hotel shot in Istanbul and a later Lisbon waterfront view near Praça do Comércio.',
      PHOTO_SEEDS_BY_DATE['2026-03-07'],
    ),
  ],
};
