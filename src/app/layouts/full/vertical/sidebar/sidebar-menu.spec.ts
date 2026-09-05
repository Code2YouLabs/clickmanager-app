import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { filtrarMenuPrincipal, removerSecoesVazias } from './menu-filter';
import { NavItem } from './nav-item/nav-item';
import { navItems } from './sidebar-data';

const todasPermissoes = [
  'GRAFICA_PRODUTOS_VER',
  'GRAFICA_PRODUTOS_EDITAR',
  'PEDIDOS_VER',
  'PEDIDOS_CADASTRAR',
  'ORCAMENTOS_VER',
  'CLIENTE_VER',
  'CLIENTE_CADASTRAR',
  'CLIENTE_EDITAR',
  'CLIENTE_EXCLUIR',
  'FUNCIONARIO_VER',
  'FOLHA_VER',
  'USUARIOS_VER',
  'PERFIS_PERMISSOES_VER',
  'SITE_BANNERS_VER',
  'SITE_PAGINAS_VER',
  'SITE_CONFIG_VER',
  'LINKS_VER',
  'CLICKTV_VER',
  'CLICKTV_MIDIAS_GERENCIAR',
  'CLICKTV_PLAYLISTS_GERENCIAR',
  'CLICKTV_TELAS_GERENCIAR',
  'DADOS_EMPRESA',
  'CONFIG_CALCULADORAS',
  'CONFIGURACOES_APLICATIVOS_ATALHOS_VER',
  'CALCULADORA_MATERIAIS_CONFIGURAR',
  'CONFIG_EMAIL',
  'FOLHA_CONFIGURAR',
  'DEPOSITO_DASHBOARD_VER',
  'DEPOSITO_ITENS_VER',
  'DEPOSITO_CATEGORIAS_VER',
  'DEPOSITO_MARCAS_VER',
  'CATALOGO_PRODUTOS_VER',
  'CATALOGO_CATEGORIAS_VER',
  'CATALOGO_MARCAS_VER',
];

function filtrar(
  tipoEmpresa: TipoEmpresa,
  permissoesUsuario = todasPermissoes,
  versaoCatalogo: 'LEGADO_DEPOSITO' | 'CATALOGO_NOVO' = 'CATALOGO_NOVO',
  features: string[] = ['LINKS', 'CALCULADORA_MATERIAIS'],
  proprietario = true,
): NavItem[] {
  const usuario: Usuario = {
    proprietario,
    perfil: {
      permissoes: permissoesUsuario.map((chave) => ({ chave })) as any,
    } as any,
  };

  return filtrarMenuPrincipal(navItems, {
    permissoesUsuario,
    tipoEmpresa,
    versaoCatalogo,
    usuario,
    isFeatureEnabled: (feature) => features.includes(feature),
  });
}

function itemPorNome(items: NavItem[], displayName: string): NavItem | undefined {
  return items.find((item) => item.displayName === displayName);
}

function filhos(item: NavItem | undefined): string[] {
  return item?.children?.map((child) => child.displayName || '') || [];
}

function encontrarItem(items: NavItem[], displayName: string): NavItem | undefined {
  for (const item of items) {
    if (item.displayName === displayName) {
      return item;
    }

    const child = item.children ? encontrarItem(item.children, displayName) : undefined;
    if (child) {
      return child;
    }
  }

  return undefined;
}

function itensDaSecao(items: NavItem[], navCap: string): NavItem[] {
  const start = items.findIndex((item) => item.navCap === navCap);
  if (start < 0) return [];
  const endOffset = items.slice(start + 1).findIndex((item) => !!item.navCap);
  const end = endOffset < 0 ? items.length : start + 1 + endOffset;
  return items.slice(start + 1, end).filter((item) => !item.navCap);
}

function labels(items: NavItem[]): string[] {
  return items.map((item) => item.navCap || item.displayName || '');
}

describe('menu principal do ClickManager', () => {
  it('padroniza o menu da gráfica por função e sem Gerenciar Produtos', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA);
    const catalogo = itemPorNome(menu, 'Catálogo');
    const comercial = itensDaSecao(menu, 'Comercial');

    expect(labels(menu)).toContain('Operação');
    expect(labels(menu)).toContain('Comercial');
    expect(labels(menu)).toContain('Gestão');
    expect(labels(menu)).toContain('Presença Digital');
    expect(labels(menu)).toContain('Configurações');
    expect(labels(menu)).toContain('Ajuda');
    expect(itemPorNome(menu, 'SmartCalc')).toBeFalsy();
    expect(menu.some((item) => item.displayName === 'Pedidos' && item.route === '/page/pedido')).toBeFalse();
    expect(itemPorNome(menu, 'Clientes')?.route).toBe('/page/cliente');
    expect(labels(menu)).not.toContain('Gerenciar Produtos');
    expect(labels(menu)).not.toContain('Gerenciar Pedidos');
    expect(labels(menu)).not.toContain('Gerenciar Clientes');
    expect(comercial.map((item) => item.displayName)).toEqual(['Pedidos', 'Orçamentos']);
    expect(comercial.map((item) => item.route)).toEqual([
      '/page/grafica/comercial-beta/pedidos',
      '/page/grafica/comercial-beta/orcamentos',
    ]);
    expect(filhos(catalogo)).toEqual(['Produtos', 'Categorias', 'Materiais', 'Formatos', 'Cores', 'Acabamentos', 'Serviços']);
    expect(itemPorNome(menu, 'Gestão de Pessoas')).toBeFalsy();
    expect(itemPorNome(menu, 'Meu Site')).toBeTruthy();
  });

  it('mostra Comercial para proprietário de gráfica mesmo sem permissões no perfil', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA, [], 'CATALOGO_NOVO', ['LINKS', 'CALCULADORA_MATERIAIS'], true);
    const comercial = itensDaSecao(menu, 'Comercial');

    expect(labels(menu)).toContain('Comercial');
    expect(comercial.map((item) => item.displayName)).toEqual(['Pedidos', 'Orçamentos']);
  });

  it('mostra Catálogo do depósito novo com produtos, categorias e marcas', () => {
    const menu = filtrar(TipoEmpresa.DEPOSITO, todasPermissoes, 'CATALOGO_NOVO');
    const catalogo = itemPorNome(menu, 'Catálogo');

    expect(itemPorNome(menu, 'Orçamentos')?.route).toBe('/page/orcamentos');
    expect(labels(menu)).not.toContain('Central de Orçamentos');
    expect(labels(menu)).not.toContain('Gerenciar Produtos');
    expect(filhos(catalogo)).toEqual(['Produtos', 'Categorias', 'Marcas']);
    expect(catalogo?.children?.map((child) => child.route)).toEqual([
      '/page/catalogo/produtos',
      '/page/catalogo/categorias',
      '/page/catalogo/marcas',
    ]);
  });

  it('mantém o depósito legado filtrado por catalogoModo sem expor Itens como pai', () => {
    const menu = filtrar(TipoEmpresa.DEPOSITO, todasPermissoes, 'LEGADO_DEPOSITO');
    const catalogo = itemPorNome(menu, 'Catálogo');

    expect(filhos(catalogo)).toEqual(['Produtos', 'Categorias', 'Marcas']);
    expect(catalogo?.children?.map((child) => child.route)).toEqual([
      '/page/deposito/itens',
      '/page/deposito/categorias',
      '/page/deposito/marcas',
    ]);
  });

  it('mantém apenas destinos permitidos em Comercial para usuário comum', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA, ['PEDIDOS_VER'], 'CATALOGO_NOVO', [], false);
    const comercial = itensDaSecao(menu, 'Comercial');

    expect(itemPorNome(menu, 'Pedidos')).toBeTruthy();
    expect(comercial.map((item) => item.displayName)).toEqual(['Pedidos']);
    expect(itemPorNome(menu, 'Catálogo')).toBeFalsy();
    expect(encontrarItem(menu, 'Produtos')).toBeFalsy();
    expect(itemPorNome(menu, 'Usuários')).toBeFalsy();
  });

  it('remove módulos protegidos por featureKey quando a feature está desativada', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA, todasPermissoes, 'CATALOGO_NOVO', []);

    expect(itemPorNome(menu, 'ClickLink')).toBeFalsy();
    const configuracoes = itemPorNome(menu, 'Configurações');
    expect(filhos(configuracoes)).not.toContain('Calculadora de Materiais');
  });

  it('remove labels de seção sem itens visíveis', () => {
    const filtrado = removerSecoesVazias([
      { navCap: 'Menu' },
      { displayName: 'Dashboard', route: '/dashboards/dashboard1' },
      { navCap: 'Vazia' },
      { navCap: 'Ajuda' },
      { displayName: 'Suporte', route: '/page/suporte' },
    ]);

    expect(labels(filtrado)).toEqual(['Menu', 'Dashboard', 'Ajuda', 'Suporte']);
  });
});
