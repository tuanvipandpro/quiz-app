const baseUrl = import.meta.env.BASE_URL || '/';

export function getAssetUrl(path = '') {
  const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const normalizedPath = path.replace(/^\/+/, '');

  return `${normalizedBaseUrl}${normalizedPath}`;
}