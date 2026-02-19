export const VERIFIED_ACTUAL_PHOTO_FILENAMES = [
  'desert-sunset.png',
  'dubai-wheel.png',
  'family-dinner-palms.png',
  'jim-dubai-mall.png',
  'jim-mojito-dubai.png',
  'jim-oman-coast.png',
  'maldives-beach-lunch.png',
  'oman-camel-milk.png',
  'oman-camels.png',
  'oman-coast-arabian-sea.png',
] as const;

export const VERIFIED_ACTUAL_PHOTO_SRCS = VERIFIED_ACTUAL_PHOTO_FILENAMES.map(
  (filename) => `/actuals/${filename}`,
);

const VERIFIED_ACTUAL_PHOTO_SRC_SET = new Set<string>(VERIFIED_ACTUAL_PHOTO_SRCS);

export function isVerifiedActualPhotoSrc(src: string): boolean {
  return VERIFIED_ACTUAL_PHOTO_SRC_SET.has(src);
}
