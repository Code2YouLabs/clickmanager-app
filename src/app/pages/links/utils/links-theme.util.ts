import { LINKS_APARENCIA_PADRAO, LinksPreviewModel } from '../models/links.models';

export interface LinksThemeTokens {
  background: string;
  primary: string;
  text: string;
  muted: string;
  buttonText: string;
}

export function buildLinksThemeTokens(model: Pick<LinksPreviewModel, 'tema' | 'corPrincipal' | 'corFundo'> | null | undefined): LinksThemeTokens {
  const background = hexSeguro(model?.corFundo, LINKS_APARENCIA_PADRAO.corFundo);
  const primary = hexSeguro(model?.corPrincipal, LINKS_APARENCIA_PADRAO.corPrincipal);
  const escuro = model?.tema === 'ESCURO';

  return {
    background,
    primary,
    text: escuro ? '#F8FAFC' : textoPara(background, '#101828', '#FFFFFF'),
    muted: escuro ? 'rgba(248, 250, 252, 0.78)' : '#667085',
    buttonText: textoPara(primary, '#101828', '#FFFFFF'),
  };
}

export function hexSeguro(value: string | null | undefined, fallback: string): string {
  const text = String(value || '').trim();
  return /^#[0-9a-fA-F]{6}$/.test(text) ? text : fallback;
}

export function textoPara(hex: string, escuro = '#101828', claro = '#FFFFFF'): string {
  const value = hex.replace('#', '');
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? escuro : claro;
}
