#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const INBOX_DIR = path.join(ROOT, 'public', 'actuals', 'inbox');
const PLAN_PATH = path.join(INBOX_DIR, 'promotion-manifest.json');
const OUT_PATH = path.join(INBOX_DIR, 'generated-actual-moments.snippets.md');

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

async function run() {
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
  sections.push('Paste photo objects into matching moments in `web/src/data/actualMoments.ts`.');
  sections.push('');

  for (const [date, rows] of [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    sections.push(`## ${date}`);
    sections.push('');

    const byMoment = groupBy(rows, (r) => r.momentId);
    for (const [momentId, momentRows] of [...byMoment.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      sections.push(`### momentId: ${momentId}`);
      sections.push('');
      sections.push('```ts');
      sections.push('photos: [');

      for (const row of momentRows) {
        sections.push('  {');
        sections.push(`    id: '${esc(row.photoId)}',`);
        sections.push(`    src: '/actuals/${esc(row.targetFilename)}',`);
        sections.push(`    alt: '${esc(row.alt)}',`);
        sections.push(`    caption: '${esc(row.caption)}',`);
        sections.push('  },');
      }

      sections.push('],');
      sections.push('```');
      sections.push('');
      sections.push('Attribution notes:');
      for (const row of momentRows) {
        sections.push(`- ${row.photoId}: ${row.attribution}`);
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
