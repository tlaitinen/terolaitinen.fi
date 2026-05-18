export const SITE_ORIGIN = 'https://terolaitinen.fi';

export function siteUrl(path: string = '/'): string {
  if (path === '' || path === '/') {
    return `${SITE_ORIGIN}/`;
  }

  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const pathWithoutTrailingSlash = normalizedPath.replace(/\/+$/, '');

  return `${SITE_ORIGIN}${pathWithoutTrailingSlash}/`;
}

export function siteFileUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${SITE_ORIGIN}${normalizedPath}`;
}
