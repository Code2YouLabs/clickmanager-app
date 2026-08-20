import { navItems } from './sidebar-data';

describe('sidebar ClickLink', () => {
  it('registra ClickLink no menu operacional com modulo ativo e permissao de leitura', () => {
    const item = navItems.find((nav) => nav.displayName === 'ClickLink');
    expect(item?.featureKey).toBe('LINKS');
    expect(item?.requiredPermission).toEqual(['LINKS_VER']);

    const paginas = item?.children?.find((child) => child.displayName === 'Páginas');
    expect(paginas?.route).toBe('/page/links/paginas');
    expect(paginas?.featureKey).toBe('LINKS');
    expect(paginas?.requiredPermission).toEqual(['LINKS_VER']);

    const analytics = item?.children?.find((child) => child.displayName === 'Analytics');
    expect(analytics?.route).toBe('/page/links/analytics');
    expect(analytics?.featureKey).toBe('LINKS');
    expect(analytics?.requiredPermission).toEqual(['LINKS_VER']);
  });
});
