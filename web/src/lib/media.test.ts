import { describe, expect, it } from 'vitest';
import { inferVideoMimeType, isVideoMedia, isVideoSrc } from './media';

describe('media helpers', () => {
  it('detects video sources by extension and ignores query/hash suffixes', () => {
    expect(isVideoSrc('/actuals/moment.mp4')).toBe(true);
    expect(isVideoSrc('/actuals/moment.MOV?dl=1')).toBe(true);
    expect(isVideoSrc('/actuals/moment.webm#t=3')).toBe(true);
    expect(isVideoSrc('/actuals/moment.jpeg')).toBe(false);
  });

  it('uses explicit media kind when provided', () => {
    expect(isVideoMedia({ src: '/actuals/photo.jpeg', kind: 'video' })).toBe(true);
    expect(isVideoMedia({ src: '/actuals/clip.mp4', kind: 'photo' })).toBe(false);
  });

  it('falls back to source extension when kind is omitted', () => {
    expect(isVideoMedia({ src: '/actuals/clip.mp4', kind: undefined })).toBe(true);
    expect(isVideoMedia({ src: '/actuals/photo.jpeg', kind: undefined })).toBe(false);
  });

  it('infers video mime types from extension unless explicitly set', () => {
    expect(inferVideoMimeType('/actuals/clip.mp4')).toBe('video/mp4');
    expect(inferVideoMimeType('/actuals/clip.mov')).toBe('video/quicktime');
    expect(inferVideoMimeType('/actuals/clip.webm')).toBe('video/webm');
    expect(inferVideoMimeType('/actuals/clip.mp4', 'video/custom')).toBe('video/custom');
  });
});
