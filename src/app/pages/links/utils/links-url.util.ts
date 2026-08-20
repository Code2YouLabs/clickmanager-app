import { environment } from 'src/environments/environment';

export function getClickLinkPublicBaseUrl(slug: string | null | undefined): string {
  const normalized = normalizeSlugInput(slug);
  const configuredBase = String(environment.publicSiteBaseUrl || '').trim().replace(/\/+$/, '');

  if (configuredBase && isLocalPublicHost(configuredBase)) {
    return configuredBase;
  }

  const publicBaseDomain = String(environment.publicBaseDomain || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '');

  if (normalized && publicBaseDomain) {
    return `https://${normalized}.${publicBaseDomain}`;
  }

  return configuredBase || window.location.origin;
}

export function buildClickLinkPublicUrl(slug: string | null | undefined): string {
  const normalized = normalizeSlugInput(slug).replace(/^\/+/, '');
  return normalized ? `${getClickLinkPublicBaseUrl(normalized)}/l/${normalized}` : '';
}

export function normalizeSlugInput(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

function isLocalPublicHost(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}
