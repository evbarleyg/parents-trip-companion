#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX_DIR = path.join(ROOT, 'public', 'actuals', 'inbox');
const PLAN_PATH = path.join(INBOX_DIR, 'promotion-manifest.json');
const OUT_PATH = path.join(INBOX_DIR, 'generated-actual-moments.snippets.md');
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

function esc(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item);
    const list = map.get(key) || [];
    list.push(item);
    map.set(key, list);
  }
  return map;
}

function extensionFromFilename(filename) {
  const value = String(filename || '');
  const dotIndex = value.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return value.slice(dotIndex).toLowerCase();
}

function detectMediaKind(row) {
  if (row.kind === 'video') return 'video';
  if (row.kind === 'photo') return 'photo';

  const filename = row.targetFilename || row.inboxFilename || '';
  return VIDEO_EXTENSIONS.has(extensionFromFilename(filename)) ? 'video' : 'photo';
}

async function ensurePlanExists() {
  try {
    await fs.access(PLAN_PATH);
  } catch {
    throw new Error(`Missing promotion manifest: ${PLAN_PATH}`);
  }
}

async function run() {
  await ensurePlanExists();
  const raw = await fs.readFile(PLAN_PATH, 'utf8');
  const plan = JSON.parse(raw);
  const promotions = Array.isArray(plan.promotions) ? plan.promotions : [];

  const approved = promotions.filter((p) => p && p.approved === true);
  if (approved.length === 0) {
    await fs.writeFile(
      OUT_PATH,
      '# Actual Moments Snippets\n\nNo approved rows found in promotion-manifest.json.\n',
      'utf8',
    );
    console.log(`Generated snippet file with 0 approved rows: ${OUT_PATH}`);
    return;
  }

  const byDate = groupBy(approved, (p) => p.date);
  const sections = [];

  sections.push('# Actual Moments Snippets');
  sections.push('');
  sections.push('Generated from approved rows in `promotion-manifest.json`.');
  sections.push('Paste media objects into matching moments in `web/src/data/actualMoments.ts`.');
  sections.push('');

  for (const [date, rows] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    sections.push(`## ${date}`);
    sections.push('');

    const byMoment = groupBy(rows, (r) => r.momentId);
    for (const [momentId, momentRows] of [...byMoment.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      sections.push(`### momentId: ${momentId}`);
      sections.push('');
      sections.push('```ts');

      const photos = momentRows.filter((row) => detectMediaKind(row) === 'photo');
      const videos = momentRows.filter((row) => detectMediaKind(row) === 'video');

      sections.push('photos: [');
      for (const row of photos) {
        const mediaId = row.photoId || row.mediaId || row.videoId;
        sections.push('  {');
        sections.push(`    id: '${esc(mediaId)}',`);
        sections.push(`    src: '/actuals/${esc(row.targetFilename)}',`);
        sections.push(`    alt: '${esc(row.alt)}',`);
        sections.push(`    caption: '${esc(row.caption)}',`);
        sections.push('  },');
      }
      sections.push('],');

      if (videos.length > 0) {
        sections.push('');
        sections.push('videos: [');
        for (const row of videos) {
          const mediaId = row.videoId || row.mediaId || row.photoId;
          sections.push('  {');
          sections.push(`    id: '${esc(mediaId)}',`);
          sections.push(`    src: '/actuals/${esc(row.targetFilename)}',`);
          sections.push(`    caption: '${esc(row.caption)}',`);
          if (typeof row.poster === 'string' && row.poster.trim().length > 0) {
            sections.push(`    poster: '${esc(row.poster)}',`);
          }
          sections.push('  },');
        }
        sections.push('],');
      }

      sections.push('```');
      sections.push('');
      sections.push('Attribution notes:');
      for (const row of momentRows) {
        sections.push(`- ${row.photoId || row.videoId || row.mediaId}: ${row.attribution}`);
      }
      sections.push('');
    }
  }

  await fs.writeFile(OUT_PATH, `${sections.join('\n')}\n`, 'utf8');
  console.log(`Generated snippet file with ${approved.length} approved row(s): ${OUT_PATH}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
