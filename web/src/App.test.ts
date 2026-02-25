import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { App } from './App';

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

function mockMatchMedia(): (query: string) => MediaQueryList {
  return (query: string) =>
    ({
      matches: false,
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

describe('App media layout regression', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(async () => {
    vi.stubGlobal('matchMedia', mockMatchMedia());
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
    const photoGalleryTab = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Photo Gallery',
    );

    expect(photoGalleryTab).toBeTruthy();

    await act(async () => {
      photoGalleryTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    const mapHeadings = Array.from(container.querySelectorAll('h2')).filter(
      (heading) => heading.textContent?.trim() === 'Map',
    );

    expect(mapHeadings.length).toBeGreaterThan(0);
    expect(container.textContent).toContain('Route Overview');
    expect(container.textContent).not.toContain('Map:');
    expect(container.textContent).not.toContain('Road');
    expect(container.textContent).not.toContain('Satellite + Roads');
    expect(container.textContent).not.toContain('Quickly scan photos/videos and jump to that day.');
  });

  it('shows family update notes in day details', async () => {
    const dayDetailsTab = Array.from(container.querySelectorAll('button')).find(
      (button) => button.textContent?.trim() === 'Day Details',
    );

    expect(dayDetailsTab).toBeTruthy();

    await act(async () => {
      dayDetailsTab?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await flushEffects();
    });

    expect(container.textContent).toContain('Family Updates');
    expect(container.textContent).not.toContain('Dad Updates');
  });
});
