interface WindowState {
  count: number;
  startMs: number;
}

const windows = new Map<string, WindowState>();

export function checkRateLimit(key: string, limit = 60, windowMs = 60_000): boolean {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || now - existing.startMs >= windowMs) {
    windows.set(key, { count: 1, startMs: now });
    return true;
  }

  if (existing.count >= limit) {
    return false;
  }

  existing.count += 1;
  windows.set(key, existing);
  return true;
}
