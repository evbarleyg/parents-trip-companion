import { describe, expect, it } from 'vitest';
import { mapPlacesResponse } from '../src/recommendations';

describe('mapPlacesResponse', () => {
  it('normalizes google places payload into sorted recommendation items', () => {
    const mapped = mapPlacesResponse(
      {
        places: [
          {
            id: 'place-2',
            displayName: { text: 'Far Place' },
            location: { latitude: 38.74, longitude: -9.2 },
            rating: 4.2,
            currentOpeningHours: { openNow: false },
          },
          {
            id: 'place-1',
            displayName: { text: 'Near Place' },
            location: { latitude: 38.723, longitude: -9.14 },
            rating: 4.7,
            currentOpeningHours: { openNow: true },
          },
        ],
      },
      'sights',
      [38.7223, -9.1393],
    );

    expect(mapped.length).toBe(2);
    expect(mapped[0].name).toBe('Near Place');
    expect(mapped[0].category).toBe('sights');
    expect(mapped[0].distanceMeters).toBeLessThan(mapped[1].distanceMeters);
  });
});
