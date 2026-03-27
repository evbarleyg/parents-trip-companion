import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App, hydratePlanWithSeedData, mediaDisplayCaption, sortActualMomentRowsDescending } from './App';
import { buildSeedTripPlan } from './data/seedTrip';

vi.mock('./lib/api', () => ({
  getRuntimeCapabilities: vi.fn(async () => ({
    mode: 'fallback',
    features: {
      extract: false,
      recommendations: true,
      chat: true,
    },
  })),
  unlockPasscode: vi.fn(async () => ({
    token: 'local-test-token',
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  })),
  extractDocument: vi.fn(),
}));

vi.mock('./lib/telemetry', () => ({
  trackEvent: vi.fn(),
}));

function mockMatchMedia(matches = false): (query: string) => MediaQueryList {
  return (query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }) as unknown as MediaQueryList;
}

async function flushEffects() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

function findButtonByText(container: HTMLElement, label: string): HTMLButtonElement | undefined {
  return Array.from(container.querySelectorAll('button')).find(
    (button) => button.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
}

function getTestElement(container: HTMLElement, testId: string): HTMLElement {
  const element = container.querySelector(`[data-testid="${testId}"]`);
  if (!element) {
    throw new Error(`Unable to find element with data-testid="${testId}"`);
  }

  return element as HTMLElement;
}

describe('App one-page workspace', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', mockMatchMedia(false));
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(App));
      await flushEffects();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('removes the old tabbed shell and location controls', () => {
    expect(container.querySelectorAll('.app-tab')).toHaveLength(0);
    expect(findButtonByText(container, 'Full Trip')).toBeUndefined();
    expect(findButtonByText(container, 'Day Details')).toBeUndefined();
    expect(findButtonByText(container, 'Photo Gallery')).toBeUndefined();
    expect(findButtonByText(container, 'Locate')).toBeUndefined();
    expect(findButtonByText(container, 'Locate + Auto Refresh')).toBeUndefined();
    expect(container.textContent).not.toContain('Location confidence');
    expect(container.querySelectorAll('select')).toHaveLength(0);
    expect(container.querySelector('.toolbar-popover')).toBeNull();
    expect(getTestElement(container, 'header-day-picker')).toBeTruthy();
  });

  it('renders the compact one-page layout with the map before story and media', () => {
    expect(container.querySelector('[data-testid="trip-rail"]')).toBeNull();
    expect(container.querySelector('[data-testid="mobile-trip-nav"]')).toBeNull();

    const daySummary = getTestElement(container, 'day-summary-strip');
    const mapCard = getTestElement(container, 'map-card');
    const dayTimeline = getTestElement(container, 'day-timeline-card');
    const tripUpdates = getTestElement(container, 'trip-updates-card');
    const tripMedia = getTestElement(container, 'trip-media-card');

    expect(daySummary.compareDocumentPosition(mapCard)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(mapCard.compareDocumentPosition(dayTimeline)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(dayTimeline.compareDocumentPosition(tripUpdates)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(mapCard.compareDocumentPosition(tripMedia)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.textContent).toContain('Trip Updates');
    expect(container.textContent).toContain('Trip Media');
    expect(container.textContent).toContain('Map');
    expect(getTestElement(container, 'section-jump-row')).toBeTruthy();
  });
});

describe('App mobile workspace', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', mockMatchMedia(true));
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(App));
      await flushEffects();
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    localStorage.clear();
    sessionStorage.clear();
    vi.unstubAllGlobals();
    (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
  });

  it('uses the same compact header picker on mobile', async () => {
    const picker = getTestElement(container, 'header-day-picker');

    expect(picker).toBeTruthy();
    expect(container.querySelector('[data-testid="mobile-trip-nav"]')).toBeNull();
    expect(container.querySelector('[data-testid="trip-rail"]')).toBeNull();

    await act(async () => {
      picker.setAttribute('open', '');
      await flushEffects();
    });

    expect(picker.textContent).toContain('Today');
    expect(container.textContent).toContain('Trip Media');
    expect(container.textContent).toContain('Map');
  });
});

describe('App helper regression', () => {
  it('prefers shipped seed day/media metadata over stale local cache data', () => {
    const stalePlan = buildSeedTripPlan();
    const feb11 = stalePlan.days.find((day) => day.date === '2026-02-11');
    const march5Library = stalePlan.days
      .find((day) => day.date === '2026-03-05')
      ?.actualMoments?.find((moment) => moment.id === 'actual-2026-03-05-photo-library');

    if (feb11) {
      feb11.region = 'Oman - Salalah';
      feb11.summaryItems[0].title = 'Stale Dubai/Oman cache';
      feb11.summaryItems[0].location = 'Salalah, Oman';
      feb11.detailItems = [];
    }

    const staleSunrisePhoto = march5Library?.photos.find((photo) => photo.id === 'actual-photo-2026-03-05-istanbul-02');

    if (staleSunrisePhoto) {
      staleSunrisePhoto.alt = 'Istanbul photo from March 5, 2026 captured during the trip.';
      staleSunrisePhoto.caption = 'IMG_1437.heic | EXIF 2026:03:05 07:23:01 | converted from HEIC';
    }

    const hydrated = hydratePlanWithSeedData(stalePlan, buildSeedTripPlan());
    const hydratedFeb11 = hydrated.days.find((day) => day.date === '2026-02-11');
    const hydratedMarch5 = hydrated.days
      .find((day) => day.date === '2026-03-05')
      ?.actualMoments?.find((moment) => moment.id === 'actual-2026-03-05-photo-library');

    expect(hydratedFeb11?.region).toBe('Dubai -> Oman - Salalah');
    expect(hydratedFeb11?.detailItems.map((item) => item.title)).toContain(
      'Shindagha Museum and cultural understanding lunch',
    );
    const hydratedSunrisePhoto = hydratedMarch5?.photos.find((photo) => photo.id === 'actual-photo-2026-03-05-istanbul-02');
    expect(hydratedSunrisePhoto?.caption).toBe('Another sunrise view with the red sky reflecting on the water.');
  });

  it('drops stale seeded media moments that were cached under the wrong Portugal date', () => {
    const stalePlan = buildSeedTripPlan();
    const lisbonDay = stalePlan.days.find((day) => day.date === '2026-03-09');
    const sintraDay = stalePlan.days.find((day) => day.date === '2026-03-10');

    const staleSintraMoment = sintraDay?.actualMoments?.find((moment) => moment.id === 'actual-2026-03-10-photo-library');
    if (lisbonDay && staleSintraMoment) {
      lisbonDay.actualMoments = [...(lisbonDay.actualMoments || []), staleSintraMoment];
    }
    if (sintraDay) {
      sintraDay.actualMoments = (sintraDay.actualMoments || []).filter(
        (moment) => moment.id !== 'actual-2026-03-10-photo-library',
      );
    }

    const hydrated = hydratePlanWithSeedData(stalePlan, buildSeedTripPlan());
    const hydratedLisbonDay = hydrated.days.find((day) => day.date === '2026-03-09');
    const hydratedSintraDay = hydrated.days.find((day) => day.date === '2026-03-10');

    expect(hydratedLisbonDay?.actualMoments?.some((moment) => moment.id === 'actual-2026-03-10-photo-library')).toBe(
      false,
    );
    expect(hydratedSintraDay?.actualMoments?.some((moment) => moment.id === 'actual-2026-03-10-photo-library')).toBe(
      true,
    );
  });

  it('uses only meaningful media captions in the UI', () => {
    expect(
      mediaDisplayCaption('IMG_1437.heic | EXIF 2026:03:05 07:23:01 | converted from HEIC', 'Night view up to Galata Tower.'),
    ).toBe('Night view up to Galata Tower.');
    expect(
      mediaDisplayCaption(
        'IMG_1437.heic | EXIF 2026:03:05 07:23:01 | converted from HEIC',
        'Istanbul photo from March 5, 2026 captured during the trip.',
      ),
    ).toBeNull();
    expect(mediaDisplayCaption('Fiery sunrise over the Bosporus and city rooftops from the hotel.', undefined)).toBe(
      'Fiery sunrise over the Bosporus and city rooftops from the hotel.',
    );
    expect(
      mediaDisplayCaption(
        '/Users/evanbarley-greenfield/Downloads/IMG_1437.heic',
        '/Users/evanbarley-greenfield/Downloads/IMG_1437.heic',
      ),
    ).toBeNull();
  });

  it('sorts media rows in descending date order', () => {
    const sorted = sortActualMomentRowsDescending([
      {
        date: '2026-03-24',
        moment: { id: 'b', source: 'x', whenLabel: 'Tue, Mar 24', text: '', photos: [] },
      },
      {
        date: '2026-03-22',
        moment: { id: 'a', source: 'x', whenLabel: 'Sun, Mar 22', text: '', photos: [] },
      },
      {
        date: '2026-03-24',
        moment: { id: 'c', source: 'x', whenLabel: 'Morning', text: '', photos: [] },
      },
    ]);

    expect(sorted.map((row) => `${row.date}:${row.moment.whenLabel}`)).toEqual([
      '2026-03-24:Tue, Mar 24',
      '2026-03-24:Morning',
      '2026-03-22:Sun, Mar 22',
    ]);
  });
});
