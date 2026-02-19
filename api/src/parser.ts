import type { EnvBindings, ItineraryItem, RecCategory, TripDay, TripPatch } from './types';

const MONTHS: Record<string, string> = {
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

const DATE_LINE = /^(?:mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thurs|thursday|fri|friday|sat|saturday|sun|sunday)\s+([a-z]+)\s+(\d{1,2})$/i;
const MONTH_DAY_LINE = /^([a-z]+)\s+(\d{1,2})$/i;

function normalizeLine(value: string): string {
  return value.replaceAll(/[\t\r]+/g, ' ').replaceAll(/\s+/g, ' ').trim();
}

function toIsoDate(monthLabel: string, dayNumber: string, year = '2026'): string | null {
  const month = MONTHS[monthLabel.toLowerCase().slice(0, 3)];
  if (!month) return null;
  const day = String(Number(dayNumber)).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function classifyCategory(text: string): RecCategory {
  const lower = text.toLowerCase();
  if (/(dinner|lunch|breakfast|food|wine|coffee|tour)/.test(lower)) return 'food';
  if (/(hotel|flight|transfer|travel|check in|check out|arrive|depart)/.test(lower)) return 'rest';
  if (/(cafe|espresso|latte)/.test(lower)) return 'coffee';
  return 'sights';
}

function normalizeClock(raw: string): string {
  const m = raw.trim().toLowerCase().match(/^(\d{1,2}):(\d{2})(?:\s*([ap]m))?$/);
  if (!m) return raw.padStart(5, '0');

  let hours = Number(m[1]);
  const minutes = Number(m[2]);
  const meridiem = m[3];

  if (meridiem) {
    if (meridiem === 'am') {
      if (hours === 12) hours = 0;
    } else if (hours !== 12) {
      hours += 12;
    }
  }

  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function parseTimeRange(text: string): { start: string; end: string | null } {
  const range = text.match(/(\d{1,2}:\d{2}\s*[ap]m?|\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2}\s*[ap]m?|\d{1,2}:\d{2})/i);
  if (range) return { start: normalizeClock(range[1]), end: normalizeClock(range[2]) };

  const single = text.match(/(\d{1,2}:\d{2}\s*[ap]m?|\d{1,2}:\d{2})/i);
  if (single) return { start: normalizeClock(single[1]), end: null };

  return { start: '09:00', end: null };
}

function makeItem(date: string, title: string, location: string, notes: string, index: number): ItineraryItem {
  const time = parseTimeRange(notes || title);
  return {
    id: `${date}-detail-${index}`,
    title,
    startTime: time.start,
    endTime: time.end,
    location: location || 'TBD',
    notes,
    category: classifyCategory(`${title} ${notes}`),
  };
}

function localTripPatchFromText(text: string): { patch: TripPatch; warnings: string[] } {
  const warnings: string[] = [];
  const lines = text
    .split(/\n+/)
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  const days: TripDay[] = [];
  let activeDate: string | null = null;
  let location = '';
  let eventLines: string[] = [];

  function flushCurrent() {
    if (!activeDate) return;

    const cleanedLines = eventLines
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(-|•|\*)$/.test(line));

    if (cleanedLines.length === 0) {
      eventLines = [];
      location = '';
      return;
    }

    const date = activeDate;

    const detailItems = cleanedLines.map((line, idx) => {
      const title = line
        .replace(/^[-•*]\s*/, '')
        .replace(/^(\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2})\s*/i, '')
        .replace(/^(\d{1,2}:\d{2}(?:\s*[ap]m)?)\s*/i, '')
        .trim();

      return makeItem(
        date,
        (title || line).slice(0, 140),
        location || 'TBD',
        line,
        idx + 1,
      );
    });

    const summaryItems = detailItems.slice(0, 3).map((item, idx) => ({
      ...item,
      id: `${activeDate}-summary-${idx + 1}`,
      notes: item.notes,
    }));

    days.push({
      date: activeDate,
      region: location || 'Imported itinerary',
      summaryItems,
      detailItems: detailItems.map((item, idx) => ({ ...item, id: `${activeDate}-detail-${idx + 1}` })),
      activeView: 'detail',
    });

    eventLines = [];
    location = '';
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const dateMatch = line.match(DATE_LINE);

    let nextDate: string | null = null;
    if (dateMatch) {
      nextDate = toIsoDate(dateMatch[1], dateMatch[2]);
    } else if (/^(mon|monday|tue|tues|tuesday|wed|weds|wednesday|thu|thurs|thursday|fri|friday|sat|saturday|sun|sunday)$/i.test(line)) {
      const maybeMonthDay = lines[index + 1]?.match(MONTH_DAY_LINE);
      if (maybeMonthDay) {
        nextDate = toIsoDate(maybeMonthDay[1], maybeMonthDay[2]);
        index += 1;
      }
    }

    if (nextDate) {
      flushCurrent();
      activeDate = nextDate;
      continue;
    }

    if (!activeDate) continue;

    if (!location && /[A-Z]{3,}/.test(line.replaceAll(/[\s\-/,]+/g, ''))) {
      location = line;
      continue;
    }

    eventLines.push(line);
  }

  flushCurrent();

  if (days.length === 0) {
    warnings.push('No dated itinerary blocks could be detected from the uploaded text.');
  }

  return {
    patch: {
      daysAdded: [],
      daysUpdated: days,
      conflicts: [],
      parseConfidence: Math.max(0.2, Math.min(0.95, days.length * 0.04)),
    },
    warnings,
  };
}

function parseJsonFromPossiblyWrappedText(raw: string): unknown {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const fence = trimmed.match(/```json([\s\S]+?)```/i);
  if (fence) {
    return JSON.parse(fence[1].trim());
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  return JSON.parse(trimmed);
}

async function openAiTripPatchFromText(text: string, fileName: string, env: EnvBindings): Promise<TripPatch | null> {
  if (!env.OPENAI_API_KEY || !text.trim()) return null;

  const model = env.OPENAI_MODEL || 'gpt-4.1-mini';
  const prompt = [
    'Extract dated itinerary blocks into strict JSON.',
    'Return object shape: {"daysAdded":[],"daysUpdated":TripDay[],"conflicts":[],"parseConfidence":0-1}.',
    'Each TripDay must include: date (YYYY-MM-DD), region, summaryItems[], detailItems[], activeView.',
    'For each item: id,title,startTime,endTime,location,notes,category.',
    'Use category one of: sights, food, coffee, rest.',
    'Only output JSON, no markdown.',
    `Filename: ${fileName}`,
    'Document text follows:',
    text.slice(0, 120_000),
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: 'You are a strict JSON extraction engine for travel itineraries.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.1,
    }),
  });

  if (!response.ok) return null;
  const json = (await response.json()) as { output_text?: string };
  if (!json.output_text) return null;

  const parsed = parseJsonFromPossiblyWrappedText(json.output_text) as TripPatch;
  if (!parsed || typeof parsed !== 'object') return null;

  return {
    daysAdded: Array.isArray(parsed.daysAdded) ? parsed.daysAdded : [],
    daysUpdated: Array.isArray(parsed.daysUpdated) ? parsed.daysUpdated : [],
    conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    parseConfidence:
      typeof parsed.parseConfidence === 'number' ? Math.max(0, Math.min(1, parsed.parseConfidence)) : 0.5,
  };
}

export async function extractTripPatchFromText(
  text: string,
  fileName: string,
  env: EnvBindings,
): Promise<{ tripPatch: TripPatch; warnings: string[] }> {
  const { patch: localPatch, warnings } = localTripPatchFromText(text);

  if (!env.OPENAI_API_KEY) {
    return { tripPatch: localPatch, warnings };
  }

  try {
    const aiPatch = await openAiTripPatchFromText(text, fileName, env);
    if (!aiPatch || aiPatch.daysUpdated.length === 0) {
      warnings.push('OpenAI extraction returned no structured days. Using local parser fallback.');
      return { tripPatch: localPatch, warnings };
    }

    return { tripPatch: aiPatch, warnings };
  } catch (error) {
    warnings.push(`OpenAI extraction failed; fallback parser used. ${(error as Error).message}`);
    return { tripPatch: localPatch, warnings };
  }
}
