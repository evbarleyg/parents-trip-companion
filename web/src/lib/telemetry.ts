const TELEMETRY_KEY = 'ptc_telemetry_counts_v1';

export type TelemetryEventName =
  | 'unlock_success'
  | 'unlock_failure'
  | 'logout'
  | 'map_ready'
  | 'map_error'
  | 'manual_override_apply'
  | 'manual_override_clear'
  | 'extract_success'
  | 'extract_failure'
  | 'merge_apply'
  | 'merge_discard'
  | 'recommendations_success'
  | 'recommendations_failure'
  | 'chat_success'
  | 'chat_failure';

type TelemetryCounts = Record<string, number>;

function safeParse(value: string | null): TelemetryCounts {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as TelemetryCounts;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeCounts(counts: TelemetryCounts): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(TELEMETRY_KEY, JSON.stringify(counts));
}

export function trackEvent(name: TelemetryEventName): void {
  if (typeof localStorage === 'undefined') return;

  const counts = safeParse(localStorage.getItem(TELEMETRY_KEY));
  const next = { ...counts, [name]: (counts[name] || 0) + 1 };
  writeCounts(next);
}

export function readTelemetryCounts(): TelemetryCounts {
  if (typeof localStorage === 'undefined') return {};
  return safeParse(localStorage.getItem(TELEMETRY_KEY));
}
