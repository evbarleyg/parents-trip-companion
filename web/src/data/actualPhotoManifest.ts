export const VERIFIED_ACTUAL_PHOTO_FILENAMES = [
  '79303757406-19d2462d-044b-4fc1-b12d-bf14a41a4652.jpeg',
  'desert-sunset.png',
  'dubai-wheel.png',
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
  'oman-camel-milk.png',
  'oman-camels.png',
  'oman-coast-arabian-sea.png',
  'susan-2026-02-19-jebel-akhdar-panorama.jpg',
] as const;

export const VERIFIED_ACTUAL_PHOTO_SRCS = VERIFIED_ACTUAL_PHOTO_FILENAMES.map(
  (filename) => `/actuals/${filename}`,
);

const VERIFIED_ACTUAL_PHOTO_SRC_SET = new Set<string>(VERIFIED_ACTUAL_PHOTO_SRCS);

export function isVerifiedActualPhotoSrc(src: string): boolean {
  return VERIFIED_ACTUAL_PHOTO_SRC_SET.has(src);
}
