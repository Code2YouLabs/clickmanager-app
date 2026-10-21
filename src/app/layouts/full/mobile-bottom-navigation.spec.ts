import { buildGraficaMobileBottomNav } from './mobile-bottom-navigation';
import { filtrarMenuPrincipal } from './vertical/sidebar/menu-filter';
import { navItems } from './vertical/sidebar/sidebar-data';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';

function build(permissions = ['PEDIDOS_VER', 'GRAFICA_PRODUTOS_VER', 'SMARTCALC_USAR'], features = ['GRAFICA', 'SMARTCALC'], owner = false) {
  const enabled = (key: string) => features.includes(key);
  const menu = filtrarMenuPrincipal(navItems, { tipoEmpresa: TipoEmpresa.GRAFICA, versaoCatalogo: 'CATALOGO_NOVO',
    usuario: { proprietario: owner }, permissoesUsuario: permissions, isFeatureEnabled: enabled });
  return buildGraficaMobileBottomNav(menu, enabled);
}

describe('Atalhos inferiores da Gráfica a partir do menu autorizado', () => {
  it('ordena Pedidos, Atalhos, SmartCalc, Dashboard e Suporte com SmartCalc central', () => {
    const items = build();
    expect(items.map(item => item.key)).toEqual(['pedidos', 'atalhos', 'smartcalc', 'dashboard', 'suporte']);
    expect(items.map(item => item.icon)).toEqual(['file-text', 'grid-dots', 'calculator', 'layout-dashboard', 'lifebuoy']);
    expect(items.filter(item => item.special).map(item => item.key)).toEqual(['smartcalc']);
    expect(items[2].route).toBe('/smartcalc');
  });

  it('sem módulo SmartCalc usa Catálogo, Atalhos, Pedidos, Dashboard e Suporte', () => {
    const items = build(undefined, ['GRAFICA']);
    expect(items.map(item => item.key)).toEqual(['catalogo', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
    expect(items[2].special).toBeTrue();
    expect(items[0].route).toBe('/page/grafica/produtos');
    expect(items[2].route).toBe('/page/grafica/comercial/pedidos');
  });

  it('permissão SmartCalc ausente produz a mesma alternativa, sem item desabilitado', () => {
    expect(build(['PEDIDOS_VER', 'GRAFICA_PRODUTOS_VER']).map(item => item.key))
      .toEqual(['catalogo', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
  });

  it('não oferece Pedidos ou Catálogo sem suas permissões; mantém a rota real SmartCalc central', () => {
    const items = build(['SMARTCALC_USAR']);
    expect(items.map(item => item.key)).toEqual(['atalhos', 'smartcalc', 'suporte']);
    expect(items.filter(item => item.special).map(item => item.route)).toEqual(['/smartcalc']);
  });

  it('sem Pedidos e SmartCalc acessíveis mantém Dashboard como fallback seguro', () => {
    expect(build([]).map(item => item.key)).toEqual(['atalhos', 'dashboard', 'suporte']);
    expect(build([])[1].special).toBeTrue();
  });

  it('com Pedidos autorizado, mas sem Catálogo ou SmartCalc, não preenche a barra com Catálogo proibido', () => {
    expect(build(['PEDIDOS_VER']).map(item => item.key)).toEqual(['atalhos', 'pedidos', 'suporte']);
  });

  it('usa Clientes autorizado como alternativa para manter cinco posições quando possível', () => {
    expect(build(['PEDIDOS_VER', 'CLIENTE_VER']).map(item => item.key))
      .toEqual(['clientes', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
  });

  it('respeita o módulo GRAFICA exigido pelas rotas, mesmo para proprietário', () => {
    const items = build([], [], true);
    expect(items.map(item => item.key)).toEqual(['atalhos', 'dashboard', 'suporte']);
    expect(items.some(item => item.key === 'pedidos' || item.key === 'catalogo' || item.key === 'smartcalc')).toBeFalse();
    expect(build([], ['GRAFICA', 'SMARTCALC'], true).map(item => item.key))
      .toEqual(['pedidos', 'atalhos', 'smartcalc', 'dashboard', 'suporte']);
  });

  it('Catálogo cobre seus cadastros e não inclui Comercial no estado ativo', () => {
    const item = build(undefined, ['GRAFICA'])[0];
    expect(item.startsWith).toContain('/page/grafica/categorias');
    expect(item.startsWith).not.toContain('/page/grafica');
    expect(item.startsWith?.some(path => path.includes('/comercial'))).toBeFalse();
  });
  it('Suporte usa a rota existente e respeita a disponibilidade no menu autorizado', () => {
    const item = build().find(item => item.key === 'suporte')!;
    expect(item.route).toBe('/page/suporte'); expect(item.startsWith).toEqual(['/page/suporte']);
    expect(buildGraficaMobileBottomNav([], () => true).map(item => item.key)).toEqual(['atalhos']);
    expect(buildGraficaMobileBottomNav([{ route: '/page/suporte', disabled: true }], () => true).some(item => item.key === 'suporte')).toBeFalse();
  });

});
