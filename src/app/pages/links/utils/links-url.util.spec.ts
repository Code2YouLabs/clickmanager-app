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
      .toBe('https://empresa-de-teste.clickmanager.com.br/l/empresa-de-teste');
  });

  it('mantem URL local funcional quando publicSiteBaseUrl aponta para localhost', () => {
    environment.publicSiteBaseUrl = 'http://localhost:4500';
    environment.publicBaseDomain = 'clickmanager.com.br';

    expect(buildClickLinkPublicUrl('empresa-de-teste')).toBe('http://localhost:4500/l/empresa-de-teste');
  });
});
