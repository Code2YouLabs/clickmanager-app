import { navItems } from './sidebar-data';

describe('sidebar ClickLink', () => {
  it('registra ClickLink no menu operacional com modulo ativo e permissao de leitura', () => {
    const item = navItems.find((nav) => nav.displayName === 'ClickLink');
    expect(item?.route).toBe('/page/links');
    expect(item?.featureKey).toBe('LINKS');
    expect(item?.requiredPermission).toEqual(['LINKS_VER']);
  });
});
