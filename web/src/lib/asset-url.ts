const ABSOLUTE_URL_PATTERN = /^(?:[a-z][a-z\d+\-.]*:)?\/\//i;

export function resolvePublicAssetUrl(src: string, basePath = '/'): string {
  if (!src) return src;

  if (ABSOLUTE_URL_PATTERN.test(src) || src.startsWith('data:') || src.startsWith('blob:')) {
    return src;
  }

  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  const normalizedSrc = src.startsWith('/') ? src.slice(1) : src;

  if (normalizedBase === '/') {
    return `/${normalizedSrc}`;
  }

  const baseWithoutLeadingSlash = normalizedBase.slice(1);
  if (normalizedSrc.startsWith(baseWithoutLeadingSlash)) {
    return `/${normalizedSrc}`;
  }

  return `${normalizedBase}${normalizedSrc}`;
}
