import { environment } from 'src/environments/environment';

export function getClickLinkPublicBaseUrl(): string {
  const base = (environment.publicSiteBaseUrl || '').replace(/\/+$/, '');
  return base || window.location.origin;
}

export function buildClickLinkPublicUrl(slug: string | null | undefined): string {
  const normalized = String(slug || '').trim().replace(/^\/+/, '');
  return normalized ? `${getClickLinkPublicBaseUrl()}/l/${normalized}` : '';
}

export function normalizeSlugInput(value: string | null | undefined): string {
  return String(value || '').trim().toLowerCase();
}
