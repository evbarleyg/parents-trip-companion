import type { TripActualPhoto } from '../types';

const VIDEO_EXTENSIONS = new Set(['.mp4', '.mov', '.m4v', '.webm']);

function normalizeSrc(src: string): string {
  return src.trim().toLowerCase().split('?')[0].split('#')[0];
}

function extensionFromSrc(src: string): string {
  const normalized = normalizeSrc(src);
  const fileName = normalized.split('/').pop() || normalized;
  const dotIndex = fileName.lastIndexOf('.');
  if (dotIndex < 0) return '';
  return fileName.slice(dotIndex);
}

export function isVideoSrc(src: string): boolean {
  return VIDEO_EXTENSIONS.has(extensionFromSrc(src));
}

export function isVideoMedia(media: Pick<TripActualPhoto, 'src' | 'kind'>): boolean {
  if (media.kind === 'video') return true;
  if (media.kind === 'photo') return false;
  return isVideoSrc(media.src);
}

export function inferVideoMimeType(src: string, explicitMimeType?: string): string | undefined {
  if (explicitMimeType) return explicitMimeType;

  const extension = extensionFromSrc(src);
  if (extension === '.mp4' || extension === '.m4v') return 'video/mp4';
  if (extension === '.mov') return 'video/quicktime';
  if (extension === '.webm') return 'video/webm';
  return undefined;
}
