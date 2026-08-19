import { LINKS_APARENCIA_PADRAO, LinksPreviewModel } from '../models/links.models';

export interface LinksThemeTokens {
  background: string;
  primary: string;
  text: string;
  muted: string;
  surface: string;
  surfaceText: string;
  surfaceMuted: string;
  surfaceBorder: string;
  iconBackground: string;
  logoGradientStart: string;
  logoGradientMid: string;
  logoShadow: string;
  shadow: string;
}

export function buildLinksThemeTokens(model: Pick<LinksPreviewModel, 'tema' | 'corPrincipal' | 'corFundo'> | null | undefined): LinksThemeTokens {
  const background = hexSeguro(model?.corFundo, LINKS_APARENCIA_PADRAO.corFundo);
  const primary = hexSeguro(model?.corPrincipal, LINKS_APARENCIA_PADRAO.corPrincipal);
  const escuro = model?.tema === 'ESCURO';
  const pageText = escuro ? '#F8FAFC' : textoPara(background, '#101828', '#FFFFFF');
  const pageTextDark = pageText === '#101828';

  return {
    background,
    primary,
    text: pageText,
    muted: pageTextDark ? 'rgba(16, 24, 40, 0.68)' : 'rgba(248, 250, 252, 0.78)',
    surface: escuro ? 'rgba(15, 23, 42, 0.84)' : 'rgba(255, 255, 255, 0.94)',
    surfaceText: escuro ? '#F8FAFC' : '#101828',
    surfaceMuted: escuro ? 'rgba(248, 250, 252, 0.68)' : 'rgba(16, 24, 40, 0.62)',
    surfaceBorder: escuro ? 'rgba(248, 250, 252, 0.14)' : 'rgba(16, 24, 40, 0.10)',
    iconBackground: escuro ? 'rgba(255, 255, 255, 0.08)' : 'rgba(13, 110, 253, 0.08)',
    logoGradientStart: escuro ? 'rgba(15, 23, 42, 0.88)' : 'rgba(255, 255, 255, 0.82)',
    logoGradientMid: escuro ? 'rgba(15, 23, 42, 0.42)' : 'rgba(255, 255, 255, 0.42)',
    logoShadow: escuro ? '0 14px 28px rgba(0, 0, 0, 0.32)' : '0 14px 26px rgba(15, 23, 42, 0.14)',
    shadow: escuro ? '0 12px 28px rgba(0, 0, 0, 0.28)' : '0 10px 24px rgba(15, 23, 42, 0.10)',
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
