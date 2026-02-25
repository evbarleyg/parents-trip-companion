#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WEB_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = path.resolve(WEB_ROOT, '..');
const ACTUALS_DIR = path.join(WEB_ROOT, 'public', 'actuals');
const DATA_DIR = path.join(WEB_ROOT, 'src', 'data');
const INBOX_DIR = path.join(REPO_ROOT, 'content', 'dad-inbox');
const REPORT_PATH = path.join(REPO_ROOT, 'docs', 'media-graveyard-report.md');

const MEDIA_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.mp4', '.mov', '.m4v', '.webm']);

function rel(filePath) {
  return path.relative(REPO_ROOT, filePath) || filePath;
}

function isMediaFile(fileName) {
  return MEDIA_EXTENSIONS.has(path.extname(fileName).toLowerCase());
}

async function walk(startDir, predicate) {
  const out = [];

  async function visit(currentDir) {
    let entries = [];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await visit(fullPath);
      } else if (entry.isFile() && predicate(entry.name)) {
        out.push(fullPath);
      }
    }
  }

  await visit(startDir);
  return out;
}

async function hashFile(filePath) {
  const bytes = await fs.readFile(filePath);
  return createHash('sha256').update(bytes).digest('hex');
}

function normalizeStem(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const base = path.basename(filePath, ext);
  return base
    .replace(/^(dad|mom)-\d{4}-\d{2}-\d{2}-/i, '')
    .replace(/^img_/i, 'img-')
    .replace(/[ _]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

async function extractReferencedActuals() {
  const dataFiles = await walk(DATA_DIR, (name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));
  const referenced = new Set();

  for (const file of dataFiles) {
    const raw = await fs.readFile(file, 'utf8');
    const actualsRegex = /\/actuals\/([^"'`\s)]+)/g;
    for (const match of raw.matchAll(actualsRegex)) {
      referenced.add(match[1].toLowerCase());
    }

    // Catch data-driven filename maps (for example in actualMomentsDad.ts where src is built from fileName).
    const filenameRegex = /\b([a-z0-9][a-z0-9._-]*\.(jpg|jpeg|png|webp|mp4|mov|m4v|webm))\b/gi;
    for (const match of raw.matchAll(filenameRegex)) {
      referenced.add(match[1].toLowerCase());
    }
  }

  return referenced;
}

async function run() {
  const [actualsFiles, inboxFiles, referencedActuals] = await Promise.all([
    walk(ACTUALS_DIR, isMediaFile),
    walk(INBOX_DIR, isMediaFile),
    extractReferencedActuals(),
  ]);

  const actualRows = actualsFiles
    .map((file) => ({
      file,
      name: path.basename(file),
      key: path.basename(file).toLowerCase(),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const referencedActualRows = actualRows.filter((row) => referencedActuals.has(row.key));
  const unreferencedActualRows = actualRows.filter((row) => !referencedActuals.has(row.key));

  const [referencedHashes, inboxHashes, allHashes] = await Promise.all([
    Promise.all(
      referencedActualRows.map(async (row) => ({ file: row.file, hash: await hashFile(row.file) })),
    ),
    Promise.all(
      inboxFiles.map(async (file) => ({ file, hash: await hashFile(file) })),
    ),
    Promise.all(
      [...actualRows.map((row) => row.file), ...inboxFiles].map(async (file) => ({ file, hash: await hashFile(file) })),
    ),
  ]);

  const includedHashSet = new Set(referencedHashes.map((row) => row.hash));
  const actualHashMap = new Map();
  for (const row of actualRows) {
    const hashed = await hashFile(row.file);
    const list = actualHashMap.get(hashed) || [];
    list.push(row);
    actualHashMap.set(hashed, list);
  }

  const graveyardInboxRows = inboxHashes
    .filter((row) => !includedHashSet.has(row.hash))
    .sort((a, b) => a.file.localeCompare(b.file));

  const byHash = new Map();
  for (const row of allHashes) {
    const list = byHash.get(row.hash) || [];
    list.push(row.file);
    byHash.set(row.hash, list);
  }

  const exactDuplicateGroups = [...byHash.values()]
    .filter((group) => group.length > 1)
    .map((group) => group.sort())
    .sort((a, b) => a[0].localeCompare(b[0]));

  const byStem = new Map();
  for (const row of allHashes) {
    const ext = path.extname(row.file).toLowerCase();
    const key = `${normalizeStem(row.file)}${ext}`;
    const list = byStem.get(key) || [];
    list.push(row);
    byStem.set(key, list);
  }

  const stemConflictGroups = [];
  for (const [key, rows] of byStem.entries()) {
    if (rows.length < 2) continue;
    const hashes = new Set(rows.map((row) => row.hash));
    if (hashes.size < 2) continue;
    stemConflictGroups.push({ key, files: rows.map((row) => row.file).sort(), variants: hashes.size });
  }
  stemConflictGroups.sort((a, b) => a.key.localeCompare(b.key));

  const lines = [];
  lines.push('# Media Graveyard Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`- Media files in \`web/public/actuals\`: ${actualRows.length}`);
  lines.push(`- Referenced by seeded data (included): ${referencedActualRows.length}`);
  lines.push(`- Not referenced in seeded data (graveyard in actuals): ${unreferencedActualRows.length}`);
  lines.push(`- Media files in \`content/dad-inbox\`: ${inboxFiles.length}`);
  lines.push(`- Inbox files not represented by included media hashes (graveyard in inbox): ${graveyardInboxRows.length}`);
  lines.push(`- Exact duplicate hash groups across actuals+inbox: ${exactDuplicateGroups.length}`);
  lines.push(`- Same-name non-hash variant groups: ${stemConflictGroups.length}`);
  lines.push('');

  lines.push('## Reasoned Index');
  lines.push('');
  lines.push('| File | Reason | Related |');
  lines.push('| --- | --- | --- |');

  if (unreferencedActualRows.length === 0 && graveyardInboxRows.length === 0) {
    lines.push('| none | none | none |');
  } else {
    for (const row of unreferencedActualRows) {
      const hash = await hashFile(row.file);
      const relatedInbox = inboxHashes
        .filter((entry) => entry.hash === hash)
        .map((entry) => `\`${rel(entry.file)}\``)
        .slice(0, 3);
      const relatedValue = relatedInbox.length > 0 ? relatedInbox.join(', ') : 'none';
      lines.push(`| \`${rel(row.file)}\` | Not referenced by seeded data under \`web/src/data\`. | ${relatedValue} |`);
    }

    for (const row of graveyardInboxRows) {
      const matchingActuals = (actualHashMap.get(row.hash) || []).map((entry) => entry.file);
      if (matchingActuals.length > 0) {
        const related = matchingActuals.map((file) => `\`${rel(file)}\``).slice(0, 3).join(', ');
        lines.push(`| \`${rel(row.file)}\` | Duplicate of media already copied into \`web/public/actuals\`, but that target file is currently unreferenced in seeded data. | ${related} |`);
      } else {
        lines.push(`| \`${rel(row.file)}\` | Not represented by any included media hash; pending triage. | none |`);
      }
    }
  }
  lines.push('');

  lines.push('## Graveyard In Actuals (Unreferenced)');
  lines.push('');
  if (unreferencedActualRows.length === 0) {
    lines.push('- None');
  } else {
    for (const row of unreferencedActualRows) {
      lines.push(`- \`${rel(row.file)}\``);
    }
  }
  lines.push('');

  lines.push('## Graveyard In Inbox (Not Included Yet)');
  lines.push('');
  if (graveyardInboxRows.length === 0) {
    lines.push('- None');
  } else {
    for (const row of graveyardInboxRows) {
      lines.push(`- \`${rel(row.file)}\``);
    }
  }
  lines.push('');

  lines.push('## Exact Duplicate Hash Groups');
  lines.push('');
  if (exactDuplicateGroups.length === 0) {
    lines.push('- None');
  } else {
    for (const group of exactDuplicateGroups) {
      lines.push('- Group:');
      for (const file of group) {
        lines.push(`  - \`${rel(file)}\``);
      }
    }
  }
  lines.push('');

  lines.push('## Same-Name Non-Hash Variant Groups');
  lines.push('');
  if (stemConflictGroups.length === 0) {
    lines.push('- None');
  } else {
    for (const group of stemConflictGroups) {
      lines.push(`- ${group.key} (variants: ${group.variants})`);
      for (const file of group.files) {
        lines.push(`  - \`${rel(file)}\``);
      }
    }
  }
  lines.push('');

  await fs.writeFile(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
  console.log(`Wrote report: ${REPORT_PATH}`);
  console.log(`Graveyard actuals: ${unreferencedActualRows.length}, graveyard inbox: ${graveyardInboxRows.length}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
