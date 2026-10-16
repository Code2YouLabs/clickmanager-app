import { buildMobileNavGroups, buildMobileMoreNavigation, mobileNavItemId } from './mobile-navigation';
import { navItems } from './vertical/sidebar/sidebar-data';
import { filtrarMenuPrincipal } from './vertical/sidebar/menu-filter';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { NavItem } from './vertical/sidebar/nav-item/nav-item';

describe('Projeção mobile da configuração desktop', () => {
  for (const tipoEmpresa of [TipoEmpresa.GRAFICA, TipoEmpresa.DEPOSITO]) {
    for (const versaoCatalogo of ['CATALOGO_NOVO', 'LEGADO_DEPOSITO'] as const) {
      for (const proprietario of [true, false]) {
        it(`mantém ordem, captions, nomes, ícones, destinos e filhos: ${tipoEmpresa}/${versaoCatalogo}/proprietário=${proprietario}`, () => {
          const desktop = filtrarMenuPrincipal(navItems, {
            tipoEmpresa, versaoCatalogo, usuario: { proprietario },
            permissoesUsuario: ['CLIENTE_VER', 'PEDIDOS_VER', 'SITE_BANNERS_VER', 'SITE_PAGINAS_VER', 'CATALOGO_PRODUTOS_VER'],
            isFeatureEnabled: () => true,
          });
          const mobile = buildMobileNavGroups(desktop);
          expect(mobile.map(group => group.title)).toEqual(desktop.filter(item => item.navCap).map(item => item.navCap!));
          const desktopItems = desktop.filter(item => !item.navCap);
          expect(mobile.flatMap(group => group.items)).toEqual(desktopItems);
          mobile.flatMap(group => group.items).forEach((item, index) => {
            // Identity ensures all metadata/visibility rules and nested trees are retained, not copied/remapped.
            expect(item).toBe(desktopItems[index]);
          });
        });
      }
    }
  }

  it('preserva grupos sem rota, Comercial completo e os itens da navegação inferior no drawer', () => {
    const desktop = filtrarMenuPrincipal(navItems, {
      tipoEmpresa: TipoEmpresa.GRAFICA, versaoCatalogo: 'CATALOGO_NOVO', usuario: { proprietario: true },
      permissoesUsuario: [], isFeatureEnabled: () => true,
    });
    const mobile = buildMobileNavGroups(desktop);
    expect(mobile.map(group => group.title)).toEqual(['Menu', 'Operação', 'Comercial', 'Catálogo', 'Gestão', 'Presença Digital', 'Configurações', 'Ajuda']);
    expect(mobile[0].items.map(item => item.displayName)).toEqual(['Dashboard']);
    expect(mobile.find(group => group.title === 'Comercial')?.items.map(item => item.displayName))
      .toEqual(['Pedidos', 'Orçamentos', 'Rascunhos', 'SmartCalc']);
    expect(mobile.find(group => group.title === 'Presença Digital')?.items.map(item => item.displayName))
      .toEqual(['Meu Site', 'ClickLink', 'ClickTV']);
  });

  it('não promove filhos nem inventa grupos para menus sem caption ou níveis adicionais', () => {
    const child: NavItem = { displayName: 'Filho', route: '/filho', children: [{ displayName: 'Neto', route: '/neto' }] };
    const parent = { displayName: 'Pai', children: [child] };
    const groups = buildMobileNavGroups([parent]);
    expect(groups.length).toBe(1);
    expect(groups[0].title).toBe('');
    expect(groups[0].items).toEqual([parent]);
    expect(groups[0].items[0].children?.[0]).toBe(child);
  });

  it('gera IDs estáveis por origem e ancestralidade, sem depender da posição na lista', () => {
    const parent = { displayName: 'Catálogo', route: '/produtos' };
    const child = { displayName: 'Produtos', route: '/produtos' };
    const id = mobileNavItemId(parent);
    expect(mobileNavItemId(parent)).toBe(id);
    expect(mobileNavItemId(child, id)).not.toBe(id);
    expect(buildMobileNavGroups([{ navCap: 'Catálogo' }, parent])[0].id)
      .toBe(buildMobileNavGroups([{ navCap: 'Menu' }, { route: '/inicio' }, { navCap: 'Catálogo' }, parent])[1].id);
  });

  it('Mais apresenta Ajuda uma vez fora da lista principal sem mutar a configuração desktop', () => {
    const before = JSON.stringify(navItems);
    const result = buildMobileMoreNavigation(navItems);
    expect(result.help?.route).toBe('/page/ajuda');
    expect(result.groups.flatMap(group => group.items).some(item => item.route === '/page/ajuda')).toBeFalse();
    expect(result.groups.flatMap(group => group.items).some(item => item.route === '/page/suporte')).toBeTrue();
    expect(JSON.stringify(navItems)).toBe(before);
    expect(buildMobileMoreNavigation([{ navCap: 'Ajuda' }, { route: '/page/ajuda' }]).groups).toEqual([]);
  });

});
