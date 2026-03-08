import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App, hydratePlanWithSeedData, mediaDisplayCaption } from './App';
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

function findHeadingByText(container: HTMLElement, label: string): HTMLHeadingElement | undefined {
  return Array.from(container.querySelectorAll('h2')).find(
    (heading) => heading.textContent?.trim() === label,
  ) as HTMLHeadingElement | undefined;
}

describe('App media layout regression', () => {
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

  it('keeps map visible in photo gallery and removes the top quick media rail', async () => {
    const photoGalleryTab = findButtonByText(container, 'Photo Gallery');

    expect(photoGalleryTab).toBeTruthy();

    await act(async () => {
      photoGalleryTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    const mapHeadings = Array.from(container.querySelectorAll('h2')).filter(
      (heading) => heading.textContent?.trim() === 'Map',
    );
    const tripMediaHeading = findHeadingByText(container, 'Trip Media');
    const mapHeading = findHeadingByText(container, 'Map');

    expect(tripMediaHeading).toBeTruthy();
    expect(mapHeading).toBeTruthy();
    expect(tripMediaHeading?.compareDocumentPosition(mapHeading!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(mapHeadings.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Route Overview');
    expect(container.textContent).not.toContain('Map:');
    expect(container.textContent).not.toContain('Road');
    expect(container.textContent).not.toContain('Satellite + Roads');
    expect(container.textContent).not.toContain('Quickly scan photos/videos and jump to that day.');
  });

  it('shows trip update notes in day details', async () => {
    const dayDetailsTab = findButtonByText(container, 'Day Details');

    expect(dayDetailsTab).toBeTruthy();

    await act(async () => {
      dayDetailsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    const tripMediaHeading = findHeadingByText(container, 'Trip Media');
    const mapHeading = findHeadingByText(container, 'Map');

    expect(tripMediaHeading).toBeTruthy();
    expect(mapHeading).toBeTruthy();
    expect(tripMediaHeading?.compareDocumentPosition(mapHeading!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(container.textContent).toContain('Trip Updates');
    expect(container.textContent).not.toContain('Dad Updates');
  });
});

describe('App mobile walkthrough', () => {
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

  it('keeps primary navigation and mobile controls usable', async () => {
    expect(findButtonByText(container, 'Locate')).toBeTruthy();
    expect(container.textContent).toContain('Trip Media');

    const fullTripTab = Array.from(container.querySelectorAll('button')).find(
      (button) => button.classList.contains('app-tab') && button.textContent?.trim() === 'Full Trip',
    ) as HTMLButtonElement | undefined;
    const photoGalleryTab = findButtonByText(container, 'Photo Gallery');

    expect(fullTripTab).toBeTruthy();
    expect(photoGalleryTab).toBeTruthy();

    await act(async () => {
      fullTripTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(container.textContent).toContain('Trip Timeline');

    await act(async () => {
      photoGalleryTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(container.textContent).toContain('Gallery View');
    expect(container.textContent).toContain('Route Overview');
    expect(container.textContent).not.toContain('Road');
    expect(container.textContent).not.toContain('Satellite + Roads');
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

    if (march5Library?.photos[1]) {
      march5Library.photos[1].alt = 'Istanbul photo from March 5, 2026 captured during the trip.';
      march5Library.photos[1].caption = 'IMG_1437.heic | EXIF 2026:03:05 07:23:01 | converted from HEIC';
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
    expect(hydratedMarch5?.photos[1].caption).toBe('Another sunrise view with the red sky reflecting on the water.');
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
  });
});
