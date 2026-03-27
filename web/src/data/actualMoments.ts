import type { TripActualMoment } from '../types';
import { DAD_ACTUAL_MOMENTS_BY_DATE } from './actualMomentsDad';
import { PHOTO_LIBRARY_ACTUAL_MOMENTS_BY_DATE } from './actualMomentsLibrary';

const SOURCE = 'B-G-M Fam iMessage export (Susan Barley / Jim Greenfield)';
const MOM_UPDATE_SOURCE = 'Mom updates (B-G-M Fam thread)';
const GUIDE_UPDATE_SOURCE = 'Guide updates (Inside Expeditions)';

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
  '2026-02-10': [
    {
      id: 'actual-2026-02-10-guide-welcome-dinner',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Tue, Feb 10 - Guide kickoff',
      text: 'Inside Expeditions treated Dubai as the arrival and group-kickoff day, centered on the welcome dinner before the Oman segment officially began.',
      photos: [],
    },
  ],
  '2026-02-11': [
    {
      id: 'actual-2026-02-11-guide-dubai-culture-day',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Wed, Feb 11 - Dubai culture day',
      text: 'Guide itinerary notes for Dubai called out the Shindagha Museum, lunch at the Sheikh Mohammed Bin Rashid Center for Cultural Understanding, the Gold and Spice Souq, and the evening airport transfer to Salalah.',
      photos: [],
    },
  ],
  '2026-02-12': [
    {
      id: 'actual-2026-02-12-guide-salalah-south',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Thu, Feb 12 - Salalah south',
      text: 'Inside Expeditions highlights for the first Salalah day included the beautiful Al Baleed resort, time with Hani in the south, the Grand Mosque, Al Baleed and the Land of Frankincense Museum, Sumhuram, and the surprise camel-milking stop with Ahmed.',
      photos: [],
    },
  ],
  '2026-02-13': [
    {
      id: 'actual-2026-02-13-guide-dhofar-safari',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Fri, Feb 13 - Dhofar safari',
      text: "Guide-company farewell notes singled out the bizarre Wadi Darbat boat ride with kayaks and a tame gazelle, the Well of Birds for Bonelli's eagle and fan-tailed ravens, helpful Germans on the trail, and the baobab and desert rose stops.",
      photos: [],
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
          alt: 'Sunset over desert coastline with old stone buildings',
          caption: 'Sunset close of day in Oman.',
        },
      ],
    },
  ],
  '2026-02-14': [
    {
      id: 'actual-2026-02-14-guide-old-muscat',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Sat, Feb 14 - Old Muscat',
      text: 'Inside Expeditions later highlighted the National Museum of Oman, Old Muscat landmarks, Mutrah Souq, and the unforgettable museum dinner from the first Muscat day.',
      photos: [],
    },
  ],
  '2026-02-15': [
    {
      id: 'actual-2026-02-15-guide-snorkel-day',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Sun, Feb 15 - Daymaniyat Islands',
      text: 'The Daymaniyat Islands snorkel day made the guide highlight reel for octopus, cuttlefish, and especially strong coral and fish sightings.',
      photos: [],
    },
  ],
  '2026-02-16': [
    {
      id: 'actual-2026-02-16-guide-dunes-and-dhowyard',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Mon, Feb 16 - Coast to desert',
      text: 'Guide notes for the transfer to Wahiba Sands called out the dhow ship building site and the windy desert sunset up on the dunes before check-in at camp.',
      photos: [],
    },
  ],
  '2026-02-17': [
    {
      id: 'actual-2026-02-17-guide-oman-across-ages',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Tue, Feb 17 - Highlands approach',
      text: 'Inside Expeditions favorites on the move to Jebel Akhdar included the historical village that was closed for renovations, the standout Oman Across Ages Museum, and the dramatic Alila mountain hotel with its infinity pool.',
      photos: [],
    },
  ],
  '2026-02-18': [
    {
      id: 'actual-2026-02-18-guide-cooking-class',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Wed, Feb 18 - Canyon rim',
      text: 'The farewell-dinner highlight list also called out the cooking class on the canyon rim and the walk between the villages on Jebel Akhdar.',
      photos: [],
    },
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
  '2026-02-19': [
    {
      id: 'actual-2026-02-19-guide-inland-forts',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Thu, Feb 19 - Inland heritage day',
      text: 'Guide-company favorites from the inland heritage circuit included Jabreen Castle, Bahla Fort, lunch in the living museum up the narrow stairs of the old house, Misfah, and Birkat Al Mouz.',
      photos: [],
    },
  ],
  '2026-02-20': [
    {
      id: 'actual-2026-02-20-guide-nizwa',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Fri, Feb 20 - Nizwa',
      text: 'Historic Nizwa souq and fort made the Inside Expeditions highlight reel before the group returned to Muscat.',
      photos: [],
    },
  ],
  '2026-02-21': [
    {
      id: 'actual-2026-02-21-guide-grand-mosque-opera',
      source: GUIDE_UPDATE_SOURCE,
      whenLabel: 'Sat, Feb 21 - Muscat finale',
      text: 'The Oman guide recap closed on the Sultan Qaboos Grand Mosque, the opera house, and the farewell dinner back in Muscat.',
      photos: [],
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
  '2026-03-02': [
    {
      id: 'actual-2026-03-02-mom-istanbul-cihangir',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Mon, Mar 2 - Cihangir to Istiklal',
      text: 'Beautiful weather in Istanbul. After a Turkish breakfast in Cihangir, they walked Galataport and up to Dolmabahce Palace, met Ozden at the Spice Market to pick up new glasses, visited Rustem Pasa, then had dinner at ADA on Istiklal before listening to Ozden rehearse clarinet concert tunes with his bar association group.',
      photos: [],
    },
  ],
  '2026-03-03': [
    {
      id: 'actual-2026-03-03-mom-istanbul-sultanahmet',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Tue, Mar 3 - Bosporus and Sultanahmet',
      text: 'They walked the Bosporus again, grabbed Starbucks for breakfast, rode the metro to Istanbul University for simit, and spent time in Sultanahmet with beers at 7 Hills overlooking Hagia Sophia. The day also included the rounded end of the Hippodrome, a Sinan Mehmet Pasa mosque with a beautiful tiled wall and sacred rock fragments from the Kaaba, and dinner at Murver.',
      photos: [],
    },
  ],
  '2026-03-04': [
    {
      id: 'actual-2026-03-04-mom-istanbul-besiktas-uskudar',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Wed, Mar 4 - Besiktas to Uskudar',
      text: 'After a slow start and a big breakfast in Cihangir, they ferried from Besiktas to Uskudar to walk the Asia side of the Bosporus on a beautiful day. A hotel recommendation led them to kozde doner at Metet in Kuzguncuk, followed by Diet Cokes on the water, a return ferry, the funicular to Taksim, and a walk back down Istiklal.',
      photos: [],
    },
  ],
  '2026-03-05': [
    {
      id: 'actual-2026-03-05-mom-istanbul-tarabya-dinner',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Thu, Mar 5 - Gulhane to Tarabya',
      text: 'Breakfast at Espresso Lab on Istiklal led into the archaeological museum, a walk through Gulhane Park, and a tea-and-cake break before a snack at ADA. Later they met Onur, who drove them up the Bosporus to Tarabya near the Black Sea for a fish dinner with Ozden at Facyo 1964, where they ate excellent turbot before a scenic drive back through the wealthy waterfront suburbs.',
      photos: [],
    },
  ],
  '2026-03-06': [
    {
      id: 'actual-2026-03-06-mom-istanbul-balat-fener',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Fri, Mar 6 - Edirnekapi to Balat',
      text: 'They crossed into a new part of the city while trying to visit the newly reopened Chora Church, now a mosque and closed on Fridays, then saw the Mihrimah Sultan Mosque near the Theodosian walls and listened to Ramadan Friday prayers. From there they descended through Balat and Fener, walked the Golden Horn back to the Spice Market for a few spices, had tea watching the Friday bazaar activity, crossed the Galata Bridge yet again, and took the Tunel back up to Istiklal and the hotel.',
      photos: [],
    },
  ],
  '2026-03-16': [
    {
      id: 'actual-2026-03-16-mom-madeira-arrival',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Mon, Mar 16 - Madeira arrival',
      text: 'The thread for Madeira started with Douro Valley art shots, then a cold hotel-terrace arrival in Madeira before a storm rolled in.',
      photos: [],
    },
  ],
  '2026-03-17': [
    {
      id: 'actual-2026-03-17-mom-madeira-funchal',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Tue, Mar 17 - Funchal day',
      text: 'Tuesday in Madeira centered on city-center views in Funchal, a sunset, and a food tour that generated the first big Madeira photo burst in the family thread.',
      photos: [],
    },
  ],
  '2026-03-18': [
    {
      id: 'actual-2026-03-18-mom-madeira-levada',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Wed, Mar 18 - Levada hike',
      text: 'The Levada walk became one of the standout Portugal days: waterfalls, hand-built irrigation channels cut through lava rock, treacherous paths, and then rain, hail, and even snow on the drive back. Mom also noted that their 34-year-old guide had never seen snow before.',
      photos: [],
    },
  ],
  '2026-03-19': [
    {
      id: 'actual-2026-03-19-mom-madeira-funchal-harbor',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Thu, Mar 19 - Harbor and coast',
      text: 'Thursday shifted into a calmer Madeira rhythm with the Santa Maria replica in Funchal, a calm-day-in-paradise note, and the memorable report that Jim was enjoying a very large gintonic.',
      photos: [],
    },
  ],
  '2026-03-21': [
    {
      id: 'actual-2026-03-21-mom-lisbon-departure',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Sat, Mar 21 - Lisbon departure',
      text: 'This was the Lisbon-to-Morocco travel day, but the new media batch still catches a very Lisbon moment first: an airport breakfast before the Casablanca flight.',
      photos: [],
    },
  ],
  '2026-03-22': [
    {
      id: 'actual-2026-03-22-mom-sahara-arrival',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Sun, Mar 22 - Sahara arrival',
      text: 'The Morocco thread opens with snow on the Atlas from the plane, then the first desert-camp notes and Sahara dune images once they reached the south.',
      photos: [],
    },
  ],
  '2026-03-23': [
    {
      id: 'actual-2026-03-23-mom-sahara-ouarzazate',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Mon, Mar 23 - Desert to Ouarzazate',
      text: 'Monday morning brought a classic Sahara sequence in the thread: good morning from the desert, where they spent the night, desert critter tracks, and time with their hosts before the move north toward Ouarzazate.',
      photos: [],
    },
  ],
  '2026-03-24': [
    {
      id: 'actual-2026-03-24-mom-ouarzazate-to-marrakech',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Tue, Mar 24 - Ouarzazate to Marrakech',
      text: 'Tuesday’s notes moved from the Ouarzazate hotel and fresh henna into the Atlas crossing, with snow still visible in the distance before the evening arrival in Marrakech.',
      photos: [],
    },
  ],
  '2026-03-25': [
    {
      id: 'actual-2026-03-25-mom-marrakech-palace',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Wed, Mar 25 - Marrakech palace day',
      text: 'By Wednesday the thread was fully in Marrakech mode: beautiful palace interiors, medina lanes, and a set of portraits that match the palace-and-alley photos from the new dump.',
      photos: [],
    },
  ],
  '2026-03-26': [
    {
      id: 'actual-2026-03-26-mom-marrakech-wildflowers',
      source: MOM_UPDATE_SOURCE,
      whenLabel: 'Thu, Mar 26 - Wildflowers and dinner show',
      text: 'Thursday’s thread moved from a good-morning-from-Marrakech note into the wildflower meadow and Atlas foothill images, then ended with mom’s candid write-up of an evening dinner show that felt visually vivid but culturally uncomfortable.',
      photos: [],
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

const ACTUAL_MOMENTS_BY_DATE = mergeActualMomentMaps(
  FAMILY_ACTUAL_MOMENTS_BY_DATE,
  PHOTO_LIBRARY_ACTUAL_MOMENTS_BY_DATE,
  DAD_ACTUAL_MOMENTS_BY_DATE,
);

export function getActualMomentsForDate(date: string): TripActualMoment[] {
  const moments = ACTUAL_MOMENTS_BY_DATE[date];
  if (!moments) return [];

  return moments.map(cloneMoment);
}

export function getAllSeedActualMoments(): TripActualMoment[] {
  return Object.values(ACTUAL_MOMENTS_BY_DATE).flatMap((moments) => moments.map(cloneMoment));
}
