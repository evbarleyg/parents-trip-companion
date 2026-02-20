export interface DadIntakeItem {
  id: string;
  text: string;
  dateHint?: string;
  placeHint?: string;
  capturedAt?: string;
  photoFileNames?: string[];
}

export interface DadTripDayReference {
  date: string;
  region: string;
}

export type DadAllocationStrategy =
  | 'explicit_date'
  | 'region_keyword'
  | 'metadata_timestamp'
  | 'needs_review';

export interface DadAllocationDecision {
  itemId: string;
  status: 'assigned' | 'needs_review';
  assignedDate: string | null;
  strategy: DadAllocationStrategy;
  confidence: 'high' | 'low';
  reason: string;
}

export interface DadAllocationOptions {
  defaultYear?: string;
  maxMetadataHours?: number;
  regionAliases?: Record<string, string[]>;
}

interface DateDistance {
  date: string;
  diffMs: number;
}

const MONTH_LOOKUP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  may: '05',
  jun: '06',
  jul: '07',
  aug: '08',
  sep: '09',
  oct: '10',
  nov: '11',
  dec: '12',
};

const ISO_DATE_PATTERN = /\b(20\d{2}-\d{2}-\d{2})\b/i;
const MONTH_DAY_PATTERN =
  /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t|tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})\b/i;

function normalizeText(value: string): string {
  return value.toLowerCase().replaceAll(/\s+/g, ' ').trim();
}

function toIsoDate(monthLabel: string, dayLabel: string, year: string): string | null {
  const month = MONTH_LOOKUP[monthLabel.toLowerCase().slice(0, 3)];
  if (!month) return null;
  const day = String(Number(dayLabel)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function extractExplicitDate(
  item: DadIntakeItem,
  allowedDates: Set<string>,
  defaultYear: string,
): string | null {
  const candidates = [item.dateHint || '', item.text].map((value) => value.trim()).filter(Boolean);
  for (const candidate of candidates) {
    const isoMatch = candidate.match(ISO_DATE_PATTERN);
    if (isoMatch && allowedDates.has(isoMatch[1])) {
      return isoMatch[1];
    }

    const monthDayMatch = candidate.match(MONTH_DAY_PATTERN);
    if (!monthDayMatch) continue;
    const isoFromMonth = toIsoDate(monthDayMatch[1], monthDayMatch[2], defaultYear);
    if (isoFromMonth && allowedDates.has(isoFromMonth)) {
      return isoFromMonth;
    }
  }
  return null;
}

function extractRegionDate(
  item: DadIntakeItem,
  tripDays: DadTripDayReference[],
  aliases: Record<string, string[]>,
): string | null {
  const combinedHint = normalizeText([item.placeHint || '', item.text].join(' ').trim());
  if (!combinedHint) return null;

  const matchedDates = new Set<string>();
  for (const day of tripDays) {
    const cues = [day.region, ...(aliases[day.date] || [])]
      .map((cue) => normalizeText(cue))
      .filter((cue) => cue.length >= 3);
    if (cues.some((cue) => combinedHint.includes(cue))) {
      matchedDates.add(day.date);
    }
  }

  if (matchedDates.size !== 1) return null;
  return [...matchedDates][0];
}

function extractMetadataDate(
  item: DadIntakeItem,
  tripDays: DadTripDayReference[],
  maxMetadataHours: number,
): string | null {
  if (!item.capturedAt) return null;
  const captureMs = Date.parse(item.capturedAt);
  if (Number.isNaN(captureMs)) return null;

  let nearest: DateDistance | null = null;
  for (const day of tripDays) {
    const dayMs = Date.parse(`${day.date}T12:00:00Z`);
    if (Number.isNaN(dayMs)) continue;
    const diffMs = Math.abs(dayMs - captureMs);
    if (!nearest || diffMs < nearest.diffMs) {
      nearest = { date: day.date, diffMs };
    }
  }

  if (!nearest) return null;
  if (nearest.diffMs > maxMetadataHours * 60 * 60 * 1000) return null;
  return nearest.date;
}

export function allocateDadIntakeItem(
  item: DadIntakeItem,
  tripDays: DadTripDayReference[],
  options: DadAllocationOptions = {},
): DadAllocationDecision {
  const defaultYear = options.defaultYear || '2026';
  const maxMetadataHours = options.maxMetadataHours ?? 18;
  const regionAliases = options.regionAliases || {};
  const allowedDates = new Set(tripDays.map((day) => day.date));

  const explicitDate = extractExplicitDate(item, allowedDates, defaultYear);
  if (explicitDate) {
    return {
      itemId: item.id,
      status: 'assigned',
      assignedDate: explicitDate,
      strategy: 'explicit_date',
      confidence: 'high',
      reason: 'Explicit date match found in text/date hint.',
    };
  }

  const regionDate = extractRegionDate(item, tripDays, regionAliases);
  if (regionDate) {
    return {
      itemId: item.id,
      status: 'assigned',
      assignedDate: regionDate,
      strategy: 'region_keyword',
      confidence: 'high',
      reason: 'Place/region cue matched exactly one trip day.',
    };
  }

  const metadataDate = extractMetadataDate(item, tripDays, maxMetadataHours);
  if (metadataDate) {
    return {
      itemId: item.id,
      status: 'assigned',
      assignedDate: metadataDate,
      strategy: 'metadata_timestamp',
      confidence: 'high',
      reason: 'Capture timestamp was close to one trip day.',
    };
  }

  return {
    itemId: item.id,
    status: 'needs_review',
    assignedDate: null,
    strategy: 'needs_review',
    confidence: 'low',
    reason: 'No high-confidence date mapping was found.',
  };
}

export function allocateDadIntakeBatch(
  items: DadIntakeItem[],
  tripDays: DadTripDayReference[],
  options: DadAllocationOptions = {},
): { assigned: DadAllocationDecision[]; needsReview: DadAllocationDecision[] } {
  const decisions = items.map((item) => allocateDadIntakeItem(item, tripDays, options));
  return {
    assigned: decisions.filter((decision) => decision.status === 'assigned'),
    needsReview: decisions.filter((decision) => decision.status === 'needs_review'),
  };
}
