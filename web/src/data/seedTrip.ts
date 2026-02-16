import type { ItineraryItem, RecCategory, TripDay, TripPlan } from '../types';
import { getActualMomentsForDate } from './actualMoments';

interface DaySeed {
  region: string;
  summary: string;
  location: string;
  category: RecCategory;
  lat?: number;
  lng?: number;
  startTime?: string;
  endTime?: string | null;
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysInRange(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const cursor = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);

  while (cursor.getTime() <= end.getTime()) {
    out.push(toIsoDate(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return out;
}

function itemFromSeed(date: string, seed: DaySeed, kind: 'summary' | 'detail', index = 1): ItineraryItem {
  return {
    id: `${date}-${kind}-${index}`,
    title: seed.summary,
    startTime: seed.startTime || '09:00',
    endTime: seed.endTime === undefined ? null : seed.endTime,
    location: seed.location,
    notes: `${seed.region} itinerary`,
    category: seed.category,
    lat: seed.lat,
    lng: seed.lng,
  };
}

const DAY_SEEDS: Record<string, DaySeed> = {
  '2026-02-03': {
    region: 'Travel',
    summary: 'Fly Seattle to Dubai',
    location: 'Seattle-Tacoma International Airport',
    category: 'rest',
    lat: 47.4502,
    lng: -122.3088,
    startTime: '13:40',
  },
  '2026-02-04': {
    region: 'Dubai',
    summary: 'Arrive Dubai via Paris connection',
    location: 'Dubai International Airport',
    category: 'rest',
    lat: 25.2532,
    lng: 55.3657,
    startTime: '23:20',
  },
  '2026-02-05': {
    region: 'Dubai',
    summary: 'Jetlag day and Dubai Souks/Creekside food walk',
    location: 'Dubai Creek',
    category: 'food',
    lat: 25.2637,
    lng: 55.3075,
    startTime: '17:45',
    endTime: '21:15',
  },
  '2026-02-06': {
    region: 'Dubai',
    summary: 'Sites of Dubai',
    location: 'Downtown Dubai',
    category: 'sights',
    lat: 25.1972,
    lng: 55.2744,
  },
  '2026-02-07': {
    region: 'Dubai',
    summary: 'Sites of Dubai',
    location: 'Downtown Dubai',
    category: 'sights',
    lat: 25.1972,
    lng: 55.2744,
  },
  '2026-02-08': {
    region: 'Abu Dhabi',
    summary: 'Travel Dubai to Abu Dhabi and sightseeing',
    location: 'Abu Dhabi Corniche',
    category: 'sights',
    lat: 24.4667,
    lng: 54.3667,
  },
  '2026-02-09': {
    region: 'Abu Dhabi / Desert',
    summary: 'Morning Abu Dhabi then desert overnight',
    location: 'Al Maha Desert Resort',
    category: 'rest',
    lat: 24.8043,
    lng: 55.5793,
  },
  '2026-02-10': {
    region: 'Dubai',
    summary: 'Return to Dubai group hotel and welcome dinner',
    location: 'Le Meridien Dubai Hotel & Conference Centre',
    category: 'food',
    lat: 25.253,
    lng: 55.3323,
  },
  '2026-02-11': {
    region: 'Oman - Salalah',
    summary: 'Fly to Salalah and check in',
    location: 'Salalah, Oman',
    category: 'rest',
    lat: 17.0151,
    lng: 54.0924,
  },
  '2026-02-12': {
    region: 'Oman - Salalah',
    summary: 'Grand Mosque, Al Baleed, Frankincense sites, Mughsail and Taqa',
    location: 'Salalah, Oman',
    category: 'sights',
    lat: 17.0151,
    lng: 54.0924,
  },
  '2026-02-13': {
    region: 'Oman - Salalah',
    summary: 'Dhofar Mountains full-day safari',
    location: 'Dhofar Mountains, Oman',
    category: 'sights',
    lat: 17.2662,
    lng: 54.1037,
  },
  '2026-02-14': {
    region: 'Oman - Muscat',
    summary: 'Fly Salalah to Muscat; National Museum and Old Muscat',
    location: 'Muscat, Oman',
    category: 'sights',
    lat: 23.588,
    lng: 58.3829,
  },
  '2026-02-15': {
    region: 'Oman - Muscat',
    summary: 'Damaniyat Islands and sunset cruise',
    location: 'Muscat Coastline',
    category: 'sights',
    lat: 23.658,
    lng: 58.398,
  },
  '2026-02-16': {
    region: 'Oman - Wahiba Sands',
    summary: 'Transfer to Wahiba Sands luxury camp',
    location: 'Wahiba Sands, Oman',
    category: 'sights',
    lat: 22.4802,
    lng: 58.7374,
  },
  '2026-02-17': {
    region: 'Oman - Jebel Akhdar',
    summary: 'Wadi Bani Khalid then Jebel Akhdar',
    location: 'Jebel Akhdar, Oman',
    category: 'sights',
    lat: 23.0721,
    lng: 57.6675,
  },
  '2026-02-18': {
    region: 'Oman - Jebel Akhdar',
    summary: 'Cooking demonstration and village hike',
    location: 'Jebel Akhdar, Oman',
    category: 'food',
    lat: 23.0721,
    lng: 57.6675,
  },
  '2026-02-19': {
    region: 'Oman - Jebel Akhdar',
    summary: 'Jebel Shams and Wadi Nakhr balcony trail',
    location: 'Jebel Shams, Oman',
    category: 'sights',
    lat: 23.2376,
    lng: 57.2635,
  },
  '2026-02-20': {
    region: 'Oman - Nizwa / Muscat',
    summary: 'Nizwa auction, fort, Jabrin, Birkat Al Mauz',
    location: 'Nizwa, Oman',
    category: 'sights',
    lat: 22.9333,
    lng: 57.5333,
  },
  '2026-02-21': {
    region: 'Oman - Muscat',
    summary: 'Grand Mosque, Opera House, free afternoon, farewell dinner',
    location: 'Muscat, Oman',
    category: 'sights',
    lat: 23.588,
    lng: 58.3829,
  },
  '2026-02-22': {
    region: 'Transit - Maldives',
    summary: 'Transfer Muscat to Maldives via Abu Dhabi',
    location: 'Male, Maldives',
    category: 'rest',
    lat: 4.1755,
    lng: 73.5093,
  },
  '2026-02-23': {
    region: 'Maldives',
    summary: 'Resort day at Machchafushi',
    location: 'Machchafushi Resort',
    category: 'rest',
    lat: 3.9156,
    lng: 72.726,
  },
  '2026-02-24': {
    region: 'Maldives',
    summary: 'Resort day at Machchafushi',
    location: 'Machchafushi Resort',
    category: 'rest',
    lat: 3.9156,
    lng: 72.726,
  },
  '2026-02-25': {
    region: 'Maldives',
    summary: 'Resort day at Machchafushi',
    location: 'Machchafushi Resort',
    category: 'rest',
    lat: 3.9156,
    lng: 72.726,
  },
  '2026-02-26': {
    region: 'Maldives',
    summary: 'Resort day at Machchafushi',
    location: 'Machchafushi Resort',
    category: 'rest',
    lat: 3.9156,
    lng: 72.726,
  },
  '2026-02-27': {
    region: 'Maldives',
    summary: 'Resort day at Machchafushi',
    location: 'Machchafushi Resort',
    category: 'rest',
    lat: 3.9156,
    lng: 72.726,
  },
  '2026-02-28': {
    region: 'Maldives',
    summary: 'Resort day at Machchafushi',
    location: 'Machchafushi Resort',
    category: 'rest',
    lat: 3.9156,
    lng: 72.726,
  },
  '2026-03-01': {
    region: 'Istanbul',
    summary: 'Travel Maldives to Istanbul',
    location: 'Istanbul Airport',
    category: 'rest',
    lat: 41.2619,
    lng: 28.7419,
  },
  '2026-03-02': {
    region: 'Istanbul',
    summary: 'Explore Istanbul neighborhoods',
    location: 'Galata, Istanbul',
    category: 'sights',
    lat: 41.0257,
    lng: 28.9744,
  },
  '2026-03-03': {
    region: 'Istanbul',
    summary: 'Explore Istanbul neighborhoods',
    location: 'Sultanahmet, Istanbul',
    category: 'sights',
    lat: 41.0054,
    lng: 28.9768,
  },
  '2026-03-04': {
    region: 'Istanbul',
    summary: 'Explore Istanbul neighborhoods',
    location: 'Bosphorus waterfront',
    category: 'sights',
    lat: 41.0444,
    lng: 29,
  },
  '2026-03-05': {
    region: 'Istanbul',
    summary: 'Explore Istanbul neighborhoods',
    location: 'Istanbul',
    category: 'sights',
    lat: 41.0082,
    lng: 28.9784,
  },
  '2026-03-06': {
    region: 'Transit - Portugal',
    summary: 'Travel from Istanbul to Lisbon',
    location: 'Lisbon',
    category: 'rest',
    lat: 38.7223,
    lng: -9.1393,
  },
  '2026-03-07': {
    region: 'Portugal - Lisbon',
    summary: 'Soft landing in Lisbon and riverside walk',
    location: 'Praca do Comercio, Lisbon',
    category: 'sights',
    lat: 38.7079,
    lng: -9.1366,
  },
  '2026-03-08': {
    region: 'Portugal - Lisbon',
    summary: 'Historic Lisbon walking and food/wine tour',
    location: 'Alfama, Lisbon',
    category: 'food',
    lat: 38.711,
    lng: -9.129,
  },
  '2026-03-09': {
    region: 'Portugal - Lisbon',
    summary: 'Alfama + Belem museums and monuments',
    location: 'Lisbon',
    category: 'sights',
    lat: 38.7223,
    lng: -9.1393,
  },
  '2026-03-10': {
    region: 'Portugal - Sintra',
    summary: 'Sintra day trip and return to Lisbon',
    location: 'Sintra',
    category: 'sights',
    lat: 38.8029,
    lng: -9.3817,
  },
  '2026-03-11': {
    region: 'Portugal - Evora',
    summary: 'Evora day trip',
    location: 'Evora',
    category: 'sights',
    lat: 38.5714,
    lng: -7.9135,
  },
  '2026-03-12': {
    region: 'Portugal - Porto',
    summary: 'Train to Porto and evening Ribeira walk',
    location: 'Porto',
    category: 'sights',
    lat: 41.1579,
    lng: -8.6291,
  },
  '2026-03-13': {
    region: 'Portugal - Porto',
    summary: 'Porto city walk and food tour',
    location: 'Porto',
    category: 'food',
    lat: 41.1579,
    lng: -8.6291,
  },
  '2026-03-14': {
    region: 'Portugal - Guimaraes',
    summary: 'Guimaraes day trip',
    location: 'Guimaraes',
    category: 'sights',
    lat: 41.4425,
    lng: -8.2918,
  },
  '2026-03-15': {
    region: 'Portugal - Douro Valley',
    summary: 'Guided Douro Valley vineyards and river cruise',
    location: 'Douro Valley',
    category: 'sights',
    lat: 41.16,
    lng: -7.78,
  },
  '2026-03-16': {
    region: 'Portugal - Madeira',
    summary: 'Fly to Madeira',
    location: 'Funchal, Madeira',
    category: 'rest',
    lat: 32.6669,
    lng: -16.9241,
  },
  '2026-03-17': {
    region: 'Portugal - Madeira',
    summary: 'Funchal food, wine, and culture tour',
    location: 'Funchal, Madeira',
    category: 'food',
    lat: 32.6669,
    lng: -16.9241,
  },
  '2026-03-18': {
    region: 'Portugal - Madeira',
    summary: 'Private guided Levada 25 Fontes walk',
    location: 'Rabaçal, Madeira',
    category: 'sights',
    lat: 32.736,
    lng: -17.132,
  },
  '2026-03-19': {
    region: 'Portugal - Madeira',
    summary: 'Island villages day',
    location: 'Madeira villages',
    category: 'sights',
    lat: 32.742,
    lng: -16.98,
  },
  '2026-03-20': {
    region: 'Portugal - Lisbon',
    summary: 'Return to Lisbon and farewell dinner',
    location: 'Lisbon',
    category: 'food',
    lat: 38.7223,
    lng: -9.1393,
  },
  '2026-03-21': {
    region: 'Morocco - Casablanca',
    summary: 'Fly Lisbon to Casablanca',
    location: 'Casablanca',
    category: 'rest',
    lat: 33.5731,
    lng: -7.5898,
  },
  '2026-03-22': {
    region: 'Morocco - Erg Chigaga',
    summary: 'Fly to Zagora and transfer to Erg Chigaga desert camp',
    location: 'Erg Chigaga',
    category: 'sights',
    lat: 29.8212,
    lng: -5.7191,
  },
  '2026-03-23': {
    region: 'Morocco - Ouarzazate',
    summary: 'Sunrise over dunes and transfer to Ouarzazate',
    location: 'Ouarzazate',
    category: 'sights',
    lat: 30.9335,
    lng: -6.937,
  },
  '2026-03-24': {
    region: 'Morocco - Marrakech',
    summary: 'Ait Ben Haddou and Atlas crossing to Marrakech',
    location: 'Marrakech',
    category: 'sights',
    lat: 31.6295,
    lng: -7.9811,
  },
  '2026-03-25': {
    region: 'Morocco - Marrakech',
    summary: 'Explore medieval Marrakech',
    location: 'Marrakech Medina',
    category: 'sights',
    lat: 31.6258,
    lng: -7.9891,
  },
  '2026-03-26': {
    region: 'Morocco - Marrakech',
    summary: 'Majorelle Gardens, YSL Museum, and cooking class',
    location: 'Marrakech',
    category: 'food',
    lat: 31.6416,
    lng: -8.0016,
  },
  '2026-03-27': {
    region: 'Morocco - Atlas Mountains',
    summary: 'Travel to Kasbah Tamadot in the Atlas Mountains',
    location: 'Kasbah Tamadot',
    category: 'rest',
    lat: 31.1863,
    lng: -7.9914,
  },
  '2026-03-28': {
    region: 'Morocco - Atlas Mountains',
    summary: 'Mountain life workshops and community visit',
    location: 'Atlas Mountains',
    category: 'sights',
    lat: 31.15,
    lng: -7.98,
  },
  '2026-03-29': {
    region: 'Morocco - Fez',
    summary: 'Return to Marrakech and fly to Fez',
    location: 'Fez',
    category: 'rest',
    lat: 34.0181,
    lng: -5.0078,
  },
  '2026-03-30': {
    region: 'Morocco - Fez',
    summary: 'Explore Fez markets, schools, and artisan workshops',
    location: 'Fez el Bali',
    category: 'sights',
    lat: 34.063,
    lng: -4.976,
  },
  '2026-03-31': {
    region: 'Morocco - Meknes / Volubilis',
    summary: 'Excursion to Volubilis and Meknes',
    location: 'Volubilis',
    category: 'sights',
    lat: 34.0737,
    lng: -5.5544,
  },
  '2026-04-01': {
    region: 'Morocco - Chefchaouen',
    summary: 'Travel to Chefchaouen',
    location: 'Chefchaouen',
    category: 'sights',
    lat: 35.1688,
    lng: -5.2636,
  },
  '2026-04-02': {
    region: 'Morocco - Tangier',
    summary: 'Chefchaouen tour and journey to Tangier',
    location: 'Tangier',
    category: 'sights',
    lat: 35.7595,
    lng: -5.834,
  },
  '2026-04-03': {
    region: 'Morocco - Tangier',
    summary: 'Tangier medina and Cap Spartel',
    location: 'Cap Spartel',
    category: 'sights',
    lat: 35.7831,
    lng: -5.9349,
  },
  '2026-04-04': {
    region: 'Morocco - Casablanca',
    summary: 'Fast train Tangier to Casablanca and farewell dinner',
    location: 'Casablanca',
    category: 'food',
    lat: 33.5731,
    lng: -7.5898,
  },
  '2026-04-05': {
    region: 'Return Travel',
    summary: 'Fly Casablanca to Seattle via Paris',
    location: 'Mohammed V International Airport',
    category: 'rest',
    lat: 33.3675,
    lng: -7.58997,
    startTime: '07:35',
  },
};

const OMAN_DETAIL_ITEMS: Record<string, ItineraryItem[]> = {
  '2026-02-11': [
    {
      id: '2026-02-11-detail-1',
      title: 'Fly Dubai to Salalah',
      startTime: '08:00',
      endTime: null,
      location: 'Dubai to Salalah',
      notes: 'Arrive and settle into coastal hotel.',
      category: 'rest',
      lat: 17.0151,
      lng: 54.0924,
    },
  ],
  '2026-02-12': [
    {
      id: '2026-02-12-detail-1',
      title: 'Grand Mosque and Al Baleed archaeological site',
      startTime: '09:00',
      endTime: '12:00',
      location: 'Salalah',
      notes: 'Museum and archaeology block.',
      category: 'sights',
      lat: 17.021,
      lng: 54.089,
    },
    {
      id: '2026-02-12-detail-2',
      title: 'Mughsail Beach, Taqa Castle, Sumhuram',
      startTime: '13:30',
      endTime: '18:00',
      location: 'Salalah coastal circuit',
      notes: 'Frankincense trail focus.',
      category: 'sights',
      lat: 16.896,
      lng: 53.787,
    },
  ],
  '2026-02-13': [
    {
      id: '2026-02-13-detail-1',
      title: 'Dhofar Mountains 4x4 safari',
      startTime: '08:30',
      endTime: '17:30',
      location: 'Wadi Darbat / Jebel Samhan',
      notes: 'Full day safari with picnic lunch.',
      category: 'sights',
      lat: 17.113,
      lng: 54.444,
    },
  ],
  '2026-02-14': [
    {
      id: '2026-02-14-detail-1',
      title: 'Fly Salalah to Muscat',
      startTime: '08:30',
      endTime: '11:00',
      location: 'Salalah Airport',
      notes: 'Transfer day.',
      category: 'rest',
      lat: 17.0387,
      lng: 54.0913,
    },
    {
      id: '2026-02-14-detail-2',
      title: 'Old Muscat landmarks and National Museum',
      startTime: '13:00',
      endTime: '17:00',
      location: 'Old Muscat',
      notes: 'Sultan Palace and forts views.',
      category: 'sights',
      lat: 23.6143,
      lng: 58.5922,
    },
  ],
  '2026-02-15': [
    {
      id: '2026-02-15-detail-1',
      title: 'Damaniyat Islands boat cruise',
      startTime: '09:00',
      endTime: '14:00',
      location: 'Damaniyat Islands',
      notes: 'Snorkeling/swim conditions permitting.',
      category: 'sights',
      lat: 23.8508,
      lng: 58.1093,
    },
    {
      id: '2026-02-15-detail-2',
      title: 'Sunset coastline cruise',
      startTime: '16:30',
      endTime: '18:30',
      location: 'Muscat Marina',
      notes: 'Evening at leisure.',
      category: 'sights',
      lat: 23.6163,
      lng: 58.5912,
    },
  ],
  '2026-02-16': [
    {
      id: '2026-02-16-detail-1',
      title: 'Transfer to Wahiba Sands',
      startTime: '09:00',
      endTime: '14:00',
      location: 'Wahiba Sands',
      notes: 'Check in to luxury camp and sunset.',
      category: 'sights',
      lat: 22.48,
      lng: 58.737,
    },
  ],
  '2026-02-17': [
    {
      id: '2026-02-17-detail-1',
      title: 'Wadi Bani Khalid pools',
      startTime: '09:00',
      endTime: '11:30',
      location: 'Wadi Bani Khalid',
      notes: 'Morning stop en route to highlands.',
      category: 'sights',
      lat: 22.6162,
      lng: 59.0902,
    },
    {
      id: '2026-02-17-detail-2',
      title: 'Arrive Jebel Akhdar retreat',
      startTime: '14:30',
      endTime: null,
      location: 'Jebel Akhdar',
      notes: 'Leisure afternoon at mountain resort.',
      category: 'rest',
      lat: 23.0721,
      lng: 57.6675,
    },
  ],
  '2026-02-18': [
    {
      id: '2026-02-18-detail-1',
      title: 'Omani cooking demonstration',
      startTime: '10:00',
      endTime: '12:00',
      location: 'Jebel Akhdar',
      notes: 'Hands-on local cooking session.',
      category: 'food',
      lat: 23.0721,
      lng: 57.6675,
    },
    {
      id: '2026-02-18-detail-2',
      title: 'Terraced village hike',
      startTime: '14:00',
      endTime: '17:00',
      location: 'Jebel Akhdar villages',
      notes: 'Meet local farmers; Ramadan begins.',
      category: 'sights',
      lat: 23.095,
      lng: 57.671,
    },
  ],
  '2026-02-19': [
    {
      id: '2026-02-19-detail-1',
      title: 'Jebel Shams and Wadi Nakhr balcony trail',
      startTime: '09:00',
      endTime: '17:30',
      location: 'Jebel Shams',
      notes: 'Include Al Hamra and Misfah villages.',
      category: 'sights',
      lat: 23.2376,
      lng: 57.2635,
    },
  ],
  '2026-02-20': [
    {
      id: '2026-02-20-detail-1',
      title: 'Nizwa livestock auction and fort',
      startTime: '08:00',
      endTime: '11:30',
      location: 'Nizwa',
      notes: 'Friday market timing is key.',
      category: 'sights',
      lat: 22.9333,
      lng: 57.5333,
    },
    {
      id: '2026-02-20-detail-2',
      title: 'Jabrin Castle and Birkat Al Mauz',
      startTime: '13:00',
      endTime: '16:30',
      location: 'Jabrin / Birkat Al Mauz',
      notes: 'Return to Muscat in evening.',
      category: 'sights',
      lat: 22.917,
      lng: 57.266,
    },
  ],
  '2026-02-21': [
    {
      id: '2026-02-21-detail-1',
      title: 'Sultan Qaboos Grand Mosque',
      startTime: '09:00',
      endTime: '11:00',
      location: 'Muscat',
      notes: 'Morning landmark visit.',
      category: 'sights',
      lat: 23.5839,
      lng: 58.398,
    },
    {
      id: '2026-02-21-detail-2',
      title: 'Royal Opera House and farewell dinner',
      startTime: '16:00',
      endTime: '20:30',
      location: 'Muscat',
      notes: 'Free afternoon before final dinner.',
      category: 'food',
      lat: 23.6022,
      lng: 58.4255,
    },
  ],
};

function defaultSeedForDate(date: string): DaySeed {
  if (date >= '2026-03-21') {
    return {
      region: 'Morocco',
      summary: 'Flexible Morocco exploration',
      location: 'Morocco',
      category: 'sights',
      lat: 31.7917,
      lng: -7.0926,
    };
  }
  if (date >= '2026-03-07') {
    return {
      region: 'Portugal',
      summary: 'Flexible Portugal exploration',
      location: 'Portugal',
      category: 'sights',
      lat: 39.3999,
      lng: -8.2245,
    };
  }
  if (date >= '2026-03-01') {
    return {
      region: 'Istanbul',
      summary: 'Flexible Istanbul day',
      location: 'Istanbul',
      category: 'sights',
      lat: 41.0082,
      lng: 28.9784,
    };
  }
  if (date >= '2026-02-23') {
    return {
      region: 'Maldives',
      summary: 'Relaxed resort day',
      location: 'Maldives',
      category: 'rest',
      lat: 3.2028,
      lng: 73.2207,
    };
  }
  if (date >= '2026-02-11') {
    return {
      region: 'Oman',
      summary: 'Oman tour day',
      location: 'Oman',
      category: 'sights',
      lat: 21.4735,
      lng: 55.9754,
    };
  }

  return {
    region: 'Dubai / Abu Dhabi',
    summary: 'Dubai and Abu Dhabi itinerary day',
    location: 'Dubai',
    category: 'sights',
    lat: 25.2048,
    lng: 55.2708,
  };
}

export function buildSeedTripPlan(): TripPlan {
  const dates = daysInRange('2026-02-03', '2026-04-05');

  const days: TripDay[] = dates.map((date) => {
    const seed = DAY_SEEDS[date] || defaultSeedForDate(date);
    const summaryItems = [itemFromSeed(date, seed, 'summary')];
    const detailItems = OMAN_DETAIL_ITEMS[date] || [];

    return {
      date,
      region: seed.region,
      summaryItems,
      detailItems,
      activeView: detailItems.length > 0 ? 'detail' : 'summary',
      actualMoments: getActualMomentsForDate(date),
    };
  });

  return {
    tripName: 'Where in the World Are Susan and Jim?',
    startDate: '2026-02-03',
    endDate: '2026-04-05',
    timezone: 'America/Los_Angeles',
    days,
    sources: [],
  };
}

export const seedTripPlan = buildSeedTripPlan();
