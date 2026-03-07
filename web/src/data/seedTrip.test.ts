import { describe, expect, it } from 'vitest';
import { buildSeedTripPlan } from './seedTrip';

describe('seed trip Dubai/Oman enrichment', () => {
  it('adds the guide-company Dubai culture day before the Salalah flight', () => {
    const day = buildSeedTripPlan().days.find((entry) => entry.date === '2026-02-11');

    expect(day?.region).toBe('Dubai -> Oman - Salalah');
    expect(day?.summaryItems[0].title).toContain('cultural lunch');
    expect(day?.summaryItems[0].location).toContain('Old Dubai');
    expect(day?.detailItems.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        'Shindagha Museum and cultural understanding lunch',
        'Gold and Spice Souq, then flight to Salalah',
      ]),
    );
    expect(day?.detailItems[1].notes).toContain('Al Baleed Resort Salalah by Anantara');
  });

  it('captures the Oman Across Ages stop and Alila arrival on the mountain transfer day', () => {
    const day = buildSeedTripPlan().days.find((entry) => entry.date === '2026-02-17');

    expect(day?.summaryItems[0].title).toContain('Oman Across Ages Museum');
    expect(day?.detailItems.map((item) => item.title)).toEqual(
      expect.arrayContaining([
        'Wadi Bani Khalid pools',
        'Harat Al Bilad and Oman Across Ages Museum',
        'Arrive Jebel Akhdar retreat',
      ]),
    );
    expect(day?.detailItems[2].notes).toContain('Alila Jabal Akhdar');
  });

  it('uses the guide-company inland heritage sequence for the late Oman days', () => {
    const day19 = buildSeedTripPlan().days.find((entry) => entry.date === '2026-02-19');
    const day20 = buildSeedTripPlan().days.find((entry) => entry.date === '2026-02-20');

    expect(day19?.summaryItems[0].title).toContain('Jabreen');
    expect(day19?.detailItems[0].notes).toContain('Bait Al Safan');
    expect(day20?.summaryItems[0].title).toContain('Nizwa');
    expect(day20?.detailItems[1].title).toBe('Return to Muscat');
  });
});
