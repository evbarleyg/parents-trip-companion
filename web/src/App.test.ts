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

function findMediaRichChapter(container: HTMLElement): HTMLButtonElement | undefined {
  const preferredLabels = [
    'Morocco - Tangier',
    'Istanbul',
    'Oman - Nizwa / Muscat',
    'Portugal - Lisbon',
  ];

  return preferredLabels
    .map((label) =>
      Array.from(container.querySelectorAll('.chapter-button')).find((button) => button.textContent?.includes(label)),
    )
    .find(Boolean) as HTMLButtonElement | undefined;
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
    expect(getTestElement(container, 'hero-current-day')).toBeTruthy();
  });

  it('renders the compact one-page layout with the day rail before the map and story/media below it', () => {
    expect(container.querySelector('[data-testid="trip-rail"]')).toBeNull();
    expect(container.querySelector('[data-testid="mobile-trip-nav"]')).toBeNull();

    const daySummary = getTestElement(container, 'day-summary-strip');
    const dayFocusRail = getTestElement(container, 'day-focus-rail');
    const mapCard = getTestElement(container, 'map-card');
    const dayTimeline = getTestElement(container, 'day-timeline-card');
    const tripUpdates = getTestElement(container, 'trip-updates-card');
    const tripMedia = getTestElement(container, 'trip-media-card');

    expect(daySummary.compareDocumentPosition(dayFocusRail)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(dayFocusRail.compareDocumentPosition(mapCard)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(mapCard.compareDocumentPosition(dayTimeline)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(dayTimeline.compareDocumentPosition(tripUpdates)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(mapCard.compareDocumentPosition(tripMedia)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.textContent).toContain('Postcards & Notes');
    expect(container.textContent).toContain('Collected Moments');
    expect(container.textContent).toContain('The Route They Traced');
    expect(getTestElement(container, 'section-jump-row')).toBeTruthy();
  });

  it('opens chapters from the stats area and keeps the completed trip focused on memory-page media', async () => {
    const chapterButton = Array.from(container.querySelectorAll('.hero-stat-button')).find((button) =>
      button.textContent?.includes('Chapters'),
    ) as HTMLButtonElement | undefined;

    expect(chapterButton).toBeTruthy();
    expect(container.querySelector('[data-testid="chapter-menu"]')).toBeNull();
    expect(findButtonByText(container, 'Final day')).toBeUndefined();
    expect(
      (container.querySelector('.media-scope-toggle button.active') as HTMLButtonElement | null)?.textContent,
    ).toContain('Memory Page');
    expect(container.querySelector('[aria-label="Next spotlight media"]')).toBeTruthy();

    await act(async () => {
      chapterButton?.click();
      await flushEffects();
    });

    expect(getTestElement(container, 'chapter-menu-backdrop')).toBeTruthy();
    expect(getTestElement(container, 'chapter-menu')).toBeTruthy();
    expect(getTestElement(container, 'hero-thumbnail-rail')).toBeTruthy();

    await act(async () => {
      const chapterChoice = findMediaRichChapter(getTestElement(container, 'chapter-menu'));
      chapterChoice?.click();
      await flushEffects();
    });

    expect(
      (container.querySelector('.media-scope-toggle button.active') as HTMLButtonElement | null)?.textContent,
    ).toContain('Chapter');
    expect(
      (container.querySelector('.map-scope-toggle button.active') as HTMLButtonElement | null)?.textContent,
    ).toContain('Chapter');
    expect(container.querySelector('.trip-media-context')?.textContent).toContain('across');
    expect(getTestElement(container, 'chapter-gallery')).toBeTruthy();
  });

  it('closes the chapter chooser on escape and lets a chapter gallery jump back to a single day', async () => {
    const chapterButton = Array.from(container.querySelectorAll('.hero-stat-button')).find((button) =>
      button.textContent?.includes('Chapters'),
    ) as HTMLButtonElement | undefined;

    await act(async () => {
      chapterButton?.click();
      await flushEffects();
    });

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flushEffects();
    });

    expect(container.querySelector('[data-testid="chapter-menu"]')).toBeNull();
    expect(container.querySelector('[data-testid="chapter-menu-backdrop"]')).toBeNull();

    await act(async () => {
      chapterButton?.click();
      await flushEffects();
    });

    await act(async () => {
      const chapterChoice = findMediaRichChapter(getTestElement(container, 'chapter-menu'));
      chapterChoice?.click();
      await flushEffects();
    });

    expect(getTestElement(container, 'chapter-gallery')).toBeTruthy();
    const openDayButton = findButtonByText(container, 'Open day');

    expect(openDayButton?.textContent).toBe('Open day');

    await act(async () => {
      openDayButton?.click();
      await flushEffects();
    });

    expect(
      (container.querySelector('.media-scope-toggle button.active') as HTMLButtonElement | null)?.textContent,
    ).toContain('Memory Page');
    expect(
      (container.querySelector('.map-scope-toggle button.active') as HTMLButtonElement | null)?.textContent,
    ).toContain('Day');
    expect(container.querySelector('[data-testid="chapter-gallery"]')).toBeNull();
  });

  it('marks the selected date and supports keyboard-driven media viewing', async () => {
    expect(container.querySelector('.day-focus-button[aria-current="date"]')).toBeTruthy();

    const heroLaunch = getTestElement(container, 'hero-visual-launch') as HTMLButtonElement;

    await act(async () => {
      heroLaunch.click();
      await flushEffects();
    });

    expect(getTestElement(container, 'media-viewer')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
      await flushEffects();
    });

    expect(getTestElement(container, 'media-viewer')).toBeTruthy();

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      await flushEffects();
    });

    expect(container.querySelector('[data-testid="media-viewer"]')).toBeNull();
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

  it('uses the same date rail and compact hero controls on mobile', async () => {
    expect(getTestElement(container, 'hero-current-day')).toBeTruthy();
    expect(getTestElement(container, 'day-focus-rail')).toBeTruthy();
    expect(container.querySelector('[data-testid="mobile-trip-nav"]')).toBeNull();
    expect(container.querySelector('[data-testid="trip-rail"]')).toBeNull();

    expect(findButtonByText(container, 'Final day')).toBeUndefined();
    expect(container.textContent).toContain('Collected Moments');
    expect(container.textContent).toContain('The Route They Traced');
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
