import { environment } from 'src/environments/environment';

export function getClickManagerPublicHost(slug: string | null | undefined): string {
  const normalized = normalizeSlugInput(slug);
  const publicBaseDomain = getPublicBaseDomain();

  if (normalized && publicBaseDomain) {
    return `${normalized}.${publicBaseDomain}`;
  }

  return '';
}

export function getClickLinkPublicBaseUrl(
  slug: string | null | undefined,
  dominioProprio?: string | null,
  dominioProprioAtivo = false,
): string {
  const dominio = normalizeHostInput(dominioProprio);
  if (dominio && dominioProprioAtivo) {
    return `https://${dominio}`;
  }

  const configuredBase = String(environment.publicSiteBaseUrl || '').trim().replace(/\/+$/, '');

  if (configuredBase && isLocalPublicHost(configuredBase)) {
    return configuredBase;
  }

  const clickManagerHost = getClickManagerPublicHost(slug);

  if (clickManagerHost) {
    return `https://${clickManagerHost}`;
  }

  return configuredBase || window.location.origin;
}

export function buildClickLinkPublicUrl(
  slug: string | null | undefined,
  paginaSlug?: string | null,
  principal = true,
  dominioProprio?: string | null,
  dominioProprioAtivo = false,
): string {
  const normalized = normalizeSlugInput(slug).replace(/^\/+/, '');
  const dominio = normalizeHostInput(dominioProprio);
  if (!normalized && !(dominio && dominioProprioAtivo)) {
    return '';
  }
  const normalizedPaginaSlug = normalizeSlugInput(paginaSlug).replace(/^\/+/, '');
  const path = principal || !normalizedPaginaSlug ? '/links' : `/links/${normalizedPaginaSlug}`;
  return `${getClickLinkPublicBaseUrl(normalized, dominio, dominioProprioAtivo)}${path}`;
}

export function normalizeSlugInput(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}

export function normalizeHostInput(value: string | null | undefined): string {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .replace(/\.+$/, '')
    .toLowerCase();
}

function getPublicBaseDomain(): string {
  return String(environment.publicBaseDomain || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/+$/, '')
    .toLowerCase();
}

function isLocalPublicHost(baseUrl: string): boolean {
  try {
    const url = new URL(baseUrl);
    return ['localhost', '127.0.0.1', '0.0.0.0', '::1'].includes(url.hostname);
  } catch {
    return false;
  }
}
