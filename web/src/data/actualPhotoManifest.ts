const IMAGE_EXTENSIONS = new Set<string>(['.jpg', '.jpeg', '.png', '.webp']);
const VIDEO_EXTENSIONS = new Set<string>(['.mp4', '.mov', '.m4v', '.webm']);

function normalizeSrc(src: string): string {
  return src.trim().toLowerCase().split('?')[0].split('#')[0];
}

function extensionFromFilename(filename: string): string {
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return filename.slice(dotIndex).toLowerCase();
}

function srcToFilename(src: string): string {
  const normalized = normalizeSrc(src);
  if (!normalized.startsWith('/actuals/')) return '';
  return normalized.slice('/actuals/'.length);
}

export const VERIFIED_ACTUAL_MEDIA_FILENAMES = [
  '79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652.jpeg',
  'dad-2026-02-05-79198991565-244df404-a1ce-4c62-8ffa-605a7db358d0.jpeg',
  'dad-2026-02-05-img-1034.jpeg',
  'dad-2026-02-07-img-0561.jpeg',
  'dad-2026-02-07-img-0562.jpeg',
  'dad-2026-02-07-img-0565.jpeg',
  'dad-2026-02-07-img-1055.jpeg',
  'dad-2026-02-07-img-1062.jpeg',
  'dad-2026-02-09-img-0579.jpeg',
  'dad-2026-02-09-img-0584.jpeg',
  'dad-2026-02-10-img-1085.jpeg',
  'dad-2026-02-12-img-0601.jpeg',
  'dad-2026-02-12-img-0607.jpeg',
  'dad-2026-02-12-img-0610.jpeg',
  'dad-2026-02-12-img-0611.jpeg',
  'dad-2026-02-12-img-1130.jpeg',
  'dad-2026-02-12-img-1139.jpeg',
  'dad-2026-02-13-img-0623.jpeg',
  'dad-2026-02-13-img-1150.jpeg',
  'dad-2026-02-13-img-1154.jpeg',
  'dad-2026-02-13-img-1156.jpeg',
  'dad-2026-02-13-img-1169.jpeg',
  'dad-2026-02-14-img-0644.jpeg',
  'dad-2026-02-15-img-1190.jpeg',
  'dad-2026-02-15-img-1197.jpeg',
  'dad-2026-02-18-img-0676.jpeg',
  'dad-2026-02-18-img-0679.jpeg',
  'dad-2026-02-18-img-1253.jpeg',
  'dad-2026-02-19-img-0686.jpeg',
  'dad-2026-02-19-img-1304.jpeg',
  'desert-sunset.png',
  'dubai-wheel.png',
  'family-dinner-palms.png',
  'img-1126-2.jpeg',
  'img-1126.jpeg',
  'img-1128.jpeg',
  'img-1130.jpeg',
  'img-1135.jpeg',
  'img-1139.jpeg',
  'img-1145.jpeg',
  'img-1150.jpeg',
  'img-1152.jpeg',
  'img-1154.jpeg',
  'img-1156.jpeg',
  'img-1168.jpeg',
  'img-1169.jpeg',
  'img-1172.jpeg',
  'img-1187.jpeg',
  'img-1190.jpeg',
  'img-1192.jpeg',
  'img-1197.jpeg',
  'img-1198.jpeg',
  'img-1200.jpeg',
  'img-1210.jpeg',
  'img-1216.jpeg',
  'img-1231.jpeg',
  'img-1232.png',
  'img-1233.jpeg',
  'img-1234.jpeg',
  'img-1238.jpeg',
  'img-1239.jpeg',
  'img-1241.jpeg',
  'img-1243.jpeg',
  'img-1244.jpeg',
  'img-1253.jpeg',
  'img-3024.jpeg',
  'img-4017.jpeg',
  'img-4024.jpeg',
  'img-4041.jpeg',
  'jim-dubai-mall.png',
  'jim-mojito-dubai.png',
  'jim-oman-coast.png',
  'maldives-beach-lunch.png',
  'mom-2026-02-20-img-1307.jpeg',
  'mom-2026-02-20-img-1308.jpeg',
  'mom-2026-02-20-img-1309.jpeg',
  'mom-2026-02-20-img-1312.jpeg',
  'mom-2026-02-20-img-1313.jpeg',
  'mom-2026-02-20-img-1314.jpeg',
  'mom-2026-02-20-img-1316.jpeg',
  'mom-2026-02-20-img-1317.jpeg',
  'mom-2026-02-20-img-1318.jpeg',
  'mom-2026-02-20-img-1319.jpeg',
  'mom-2026-02-21-img-1323.jpeg',
  'mom-2026-02-21-img-1325.jpeg',
  'mom-2026-02-21-img-1327.jpeg',
  'mom-2026-02-21-img-1328.jpeg',
  'mom-2026-02-21-img-1329.jpeg',
  'oman-camel-milk.png',
  'oman-camels.png',
  'oman-coast-arabian-sea.png',
  'susan-2026-02-19-jebel-akhdar-panorama.jpg',
] as const;

export const VERIFIED_ACTUAL_MEDIA_SRCS = VERIFIED_ACTUAL_MEDIA_FILENAMES.map(
  (filename) => `/actuals/${filename}`,
);

const VERIFIED_ACTUAL_MEDIA_SRC_SET = new Set<string>(VERIFIED_ACTUAL_MEDIA_SRCS.map((src) => src.toLowerCase()));

export function isVerifiedActualMediaSrc(src: string): boolean {
  return VERIFIED_ACTUAL_MEDIA_SRC_SET.has(normalizeSrc(src));
}

export const VERIFIED_ACTUAL_PHOTO_FILENAMES = VERIFIED_ACTUAL_MEDIA_FILENAMES.filter((filename) =>
  IMAGE_EXTENSIONS.has(extensionFromFilename(filename)),
);
export const VERIFIED_ACTUAL_PHOTO_SRCS = VERIFIED_ACTUAL_PHOTO_FILENAMES.map((filename) => `/actuals/${filename}`);

export const VERIFIED_ACTUAL_VIDEO_FILENAMES = VERIFIED_ACTUAL_MEDIA_FILENAMES.filter((filename) =>
  VIDEO_EXTENSIONS.has(extensionFromFilename(filename)),
);
export const VERIFIED_ACTUAL_VIDEO_SRCS = VERIFIED_ACTUAL_VIDEO_FILENAMES.map((filename) => `/actuals/${filename}`);

export function isVerifiedActualPhotoSrc(src: string): boolean {
  const filename = srcToFilename(src);
  return IMAGE_EXTENSIONS.has(extensionFromFilename(filename)) && isVerifiedActualMediaSrc(src);
}

export function isVerifiedActualVideoSrc(src: string): boolean {
  const filename = srcToFilename(src);
  return VIDEO_EXTENSIONS.has(extensionFromFilename(filename)) && isVerifiedActualMediaSrc(src);
}
