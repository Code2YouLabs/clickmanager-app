import { environment } from 'src/environments/environment';
import { buildClickLinkPublicUrl } from './links-url.util';

describe('links-url.util', () => {
  const originalPublicSiteBaseUrl = environment.publicSiteBaseUrl;
  const originalPublicBaseDomain = environment.publicBaseDomain;

  afterEach(() => {
    environment.publicSiteBaseUrl = originalPublicSiteBaseUrl;
    environment.publicBaseDomain = originalPublicBaseDomain;
  });

  it('gera URL canonica com subdominio da empresa em ambiente publico', () => {
    environment.publicSiteBaseUrl = '';
    environment.publicBaseDomain = 'clickmanager.com.br';

    expect(buildClickLinkPublicUrl('empresa-de-teste'))
      .toBe('https://empresa-de-teste.clickmanager.com.br/links');
    expect(buildClickLinkPublicUrl('empresa-de-teste', 'cardapio', false))
      .toBe('https://empresa-de-teste.clickmanager.com.br/links/cardapio');
  });

  it('mantem URL local funcional quando publicSiteBaseUrl aponta para localhost', () => {
    environment.publicSiteBaseUrl = 'http://localhost:4500';
    environment.publicBaseDomain = 'clickmanager.com.br';

    expect(buildClickLinkPublicUrl('empresa-de-teste', null, true, null, false, 19))
      .toBe('http://localhost:4500/links?empresaId=19');
  });

  it('prefere dominio proprio ativo quando informado', () => {
    environment.publicSiteBaseUrl = 'http://localhost:4500';
    environment.publicBaseDomain = 'clickmanager.com.br';

    expect(buildClickLinkPublicUrl('empresa-de-teste', null, true, 'www.empresa.com.br', true))
      .toBe('https://www.empresa.com.br/links');
    expect(buildClickLinkPublicUrl('empresa-de-teste', 'vendas', false, 'https://empresa.com.br/site', true))
      .toBe('https://empresa.com.br/links/vendas');
  });
});
