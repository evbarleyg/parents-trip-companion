#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ACTUALS_DIR = path.join(ROOT, 'public', 'actuals');
const INBOX_DIR = path.join(ACTUALS_DIR, 'inbox');
const PLAN_PATH = path.join(INBOX_DIR, 'promotion-manifest.json');
const OUT_MANIFEST_TS = path.join(ROOT, 'src', 'data', 'actualPhotoManifest.ts');

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);
const ALLOWED_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]);
const SCREENSHOT_PATTERN = /(screenshot|screen[\s_-]?shot|screen[\s_-]?record)/i;

function fail(message) {
  throw new Error(message);
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

function assertSafeFilename(filename, context) {
  if (!filename || filename.includes('/') || filename.includes('\\')) {
    fail(`${context}: filename must be a basename only`);
  }
  const ext = path.extname(filename).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    fail(`${context}: extension ${ext || '(none)'} is not allowed`);
  }
  if (SCREENSHOT_PATTERN.test(filename)) {
    fail(`${context}: screenshots/screen recordings are blocked by default`);
  }
}

function toManifestContent(filenames) {
  const rows = filenames.map((name) => `  '${name}',`).join('\n');
  const imageExtensions = [...IMAGE_EXTENSIONS].map((extension) => `'${extension}'`).join(', ');
  const videoExtensions = [...VIDEO_EXTENSIONS].map((extension) => `'${extension}'`).join(', ');

  return `const IMAGE_EXTENSIONS = new Set<string>([${imageExtensions}]);\nconst VIDEO_EXTENSIONS = new Set<string>([${videoExtensions}]);\n\nfunction normalizeSrc(src: string): string {\n  return src.trim().toLowerCase().split('?')[0].split('#')[0];\n}\n\nfunction extensionFromFilename(filename: string): string {\n  const dotIndex = filename.lastIndexOf('.');\n  if (dotIndex < 0) return '';\n  return filename.slice(dotIndex).toLowerCase();\n}\n\nfunction srcToFilename(src: string): string {\n  const normalized = normalizeSrc(src);\n  if (!normalized.startsWith('/actuals/')) return '';\n  return normalized.slice('/actuals/'.length);\n}\n\nexport const VERIFIED_ACTUAL_MEDIA_FILENAMES = [\n${rows}\n] as const;\n\nexport const VERIFIED_ACTUAL_MEDIA_SRCS = VERIFIED_ACTUAL_MEDIA_FILENAMES.map(\n  (filename) => \`/actuals/\${filename}\`,\n);\n\nconst VERIFIED_ACTUAL_MEDIA_SRC_SET = new Set<string>(VERIFIED_ACTUAL_MEDIA_SRCS.map((src) => src.toLowerCase()));\n\nexport function isVerifiedActualMediaSrc(src: string): boolean {\n  return VERIFIED_ACTUAL_MEDIA_SRC_SET.has(normalizeSrc(src));\n}\n\nexport const VERIFIED_ACTUAL_PHOTO_FILENAMES = VERIFIED_ACTUAL_MEDIA_FILENAMES.filter((filename) =>\n  IMAGE_EXTENSIONS.has(extensionFromFilename(filename)),\n);\nexport const VERIFIED_ACTUAL_PHOTO_SRCS = VERIFIED_ACTUAL_PHOTO_FILENAMES.map((filename) => \`/actuals/\${filename}\`);\n\nexport const VERIFIED_ACTUAL_VIDEO_FILENAMES = VERIFIED_ACTUAL_MEDIA_FILENAMES.filter((filename) =>\n  VIDEO_EXTENSIONS.has(extensionFromFilename(filename)),\n);\nexport const VERIFIED_ACTUAL_VIDEO_SRCS = VERIFIED_ACTUAL_VIDEO_FILENAMES.map((filename) => \`/actuals/\${filename}\`);\n\nexport function isVerifiedActualPhotoSrc(src: string): boolean {\n  const filename = srcToFilename(src);\n  return IMAGE_EXTENSIONS.has(extensionFromFilename(filename)) && isVerifiedActualMediaSrc(src);\n}\n\nexport function isVerifiedActualVideoSrc(src: string): boolean {\n  const filename = srcToFilename(src);\n  return VIDEO_EXTENSIONS.has(extensionFromFilename(filename)) && isVerifiedActualMediaSrc(src);\n}\n`;
}

async function run() {
  const planRaw = await fs.readFile(PLAN_PATH, 'utf8');
  const plan = JSON.parse(planRaw);
  const promotions = Array.isArray(plan.promotions) ? plan.promotions : [];

  for (const [index, promotion] of promotions.entries()) {
    if (!promotion.approved) continue;

    const context = `promotions[${index}]`;
    assertSafeFilename(promotion.inboxFilename, `${context}.inboxFilename`);
    assertSafeFilename(promotion.targetFilename, `${context}.targetFilename`);

    for (const field of ['photoId', 'date', 'momentId', 'alt', 'caption', 'attribution']) {
      if (typeof promotion[field] !== 'string' || promotion[field].trim().length < 3) {
        fail(`${context}.${field} is required`);
      }
    }

    const sourcePath = path.join(INBOX_DIR, promotion.inboxFilename);
    const targetPath = path.join(ACTUALS_DIR, promotion.targetFilename);

    if (await fileExists(sourcePath)) {
      await fs.copyFile(sourcePath, targetPath);
      continue;
    }

    if (!(await fileExists(targetPath))) {
      fail(`${context}: missing source file ${promotion.inboxFilename} and target file ${promotion.targetFilename}`);
    }

    console.warn(
      `${context}: source file ${promotion.inboxFilename} is missing in inbox; kept existing target ${promotion.targetFilename}.`,
    );
  }

  const entries = await fs.readdir(ACTUALS_DIR, { withFileTypes: true });
  const filenames = entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => ALLOWED_EXTENSIONS.has(path.extname(name).toLowerCase()))
    .filter((name) => !SCREENSHOT_PATTERN.test(name))
    .sort((a, b) => a.localeCompare(b));

  const manifestContent = toManifestContent(filenames);
  await fs.writeFile(OUT_MANIFEST_TS, manifestContent, 'utf8');

  console.log(`Promoted ${promotions.filter((p) => p.approved).length} approved inbox file(s).`);
  console.log(`Updated whitelist manifest with ${filenames.length} file(s): ${OUT_MANIFEST_TS}`);
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
