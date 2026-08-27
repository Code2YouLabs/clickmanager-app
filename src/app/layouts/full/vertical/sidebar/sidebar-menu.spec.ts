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

function labels(items: NavItem[]): string[] {
  return items.map((item) => item.navCap || item.displayName || '');
}

describe('menu principal do ClickManager', () => {
  it('padroniza o menu da gráfica por função e sem Gerenciar Produtos', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA);
    const catalogo = itemPorNome(menu, 'Catálogo');

    expect(labels(menu)).toContain('Operação');
    expect(labels(menu)).toContain('Gestão');
    expect(labels(menu)).toContain('Presença Digital');
    expect(labels(menu)).toContain('Configurações');
    expect(labels(menu)).toContain('Ajuda');
    expect(itemPorNome(menu, 'SmartCalc')?.route).toBe('/smartcalc');
    expect(itemPorNome(menu, 'Pedidos')?.route).toBe('/page/pedido');
    expect(itemPorNome(menu, 'Clientes')?.route).toBe('/page/cliente');
    expect(labels(menu)).not.toContain('Gerenciar Produtos');
    expect(labels(menu)).not.toContain('Gerenciar Pedidos');
    expect(labels(menu)).not.toContain('Gerenciar Clientes');
    expect(filhos(catalogo)).toEqual(['Comercial Beta', 'Produtos', 'Categorias', 'Materiais', 'Formatos', 'Cores', 'Acabamentos', 'Serviços']);
    expect(filhos(encontrarItem(menu, 'Comercial Beta'))).toEqual(['Rascunhos', 'Orçamentos', 'Pedidos']);
    expect(itemPorNome(menu, 'Gestão de Pessoas')).toBeTruthy();
    expect(itemPorNome(menu, 'Meu Site')).toBeTruthy();
  });

  it('mostra Comercial Beta para proprietário de gráfica mesmo sem permissões no perfil', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA, [], 'CATALOGO_NOVO', ['LINKS', 'CALCULADORA_MATERIAIS'], true);

    expect(encontrarItem(menu, 'Comercial Beta')).toBeTruthy();
    expect(filhos(encontrarItem(menu, 'Comercial Beta'))).toEqual(['Rascunhos', 'Orçamentos', 'Pedidos']);
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

  it('mantém apenas destinos permitidos no Comercial Beta para usuário comum', () => {
    const menu = filtrar(TipoEmpresa.GRAFICA, ['PEDIDOS_VER'], 'CATALOGO_NOVO', [], false);
    const catalogo = itemPorNome(menu, 'Catálogo');
    const comercialBeta = encontrarItem(menu, 'Comercial Beta');

    expect(itemPorNome(menu, 'Pedidos')).toBeTruthy();
    expect(catalogo).toBeTruthy();
    expect(filhos(catalogo)).toEqual(['Comercial Beta']);
    expect(filhos(comercialBeta)).toEqual(['Pedidos']);
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
