import { describe, expect, it } from 'vitest';
import { readTelemetryCounts, trackEvent } from './telemetry';

describe('telemetry counters', () => {
  it('increments event counters', () => {
    localStorage.clear();
    trackEvent('unlock_success');
    trackEvent('unlock_success');
    trackEvent('map_error');

    const counts = readTelemetryCounts();
    expect(counts.unlock_success).toBe(2);
    expect(counts.map_error).toBe(1);
  });

  it('handles malformed telemetry storage gracefully', () => {
    localStorage.clear();
    localStorage.setItem('ptc_telemetry_counts_v1', '{bad-json');

    trackEvent('logout');
    const counts = readTelemetryCounts();
    expect(counts.logout).toBe(1);
  });
});
