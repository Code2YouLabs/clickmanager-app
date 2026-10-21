import { ActivatedRouteSnapshot, PRIMARY_OUTLET } from '@angular/router';
import { resolveMobilePageTitle } from './mobile-page-title';
import { NavItem } from './vertical/sidebar/nav-item/nav-item';

function route(data: Record<string, unknown> = {}, children: ActivatedRouteSnapshot[] = []): ActivatedRouteSnapshot {
  return { data, children, outlet: PRIMARY_OUTLET } as ActivatedRouteSnapshot;
}

describe('resolveMobilePageTitle', () => {
  const menu: NavItem[] = [{ displayName: 'Catálogo', route: '/page/grafica/produtos', children: [
    { displayName: 'Produtos', route: '/page/grafica/produtos' },
  ] }];

  it('prefere o item mais específico do menu na rota exata, ignorando query, fragmento e matrix params', () => {
    expect(resolveMobilePageTitle(route({ title: 'Produtos graficos' }),
      '/page/grafica/produtos;modo=lista?busca=a#fim', menu)).toBe('Produtos');
  });

  it('usa metadados da edição parametrizada em vez do prefixo do catálogo', () => {
    const root = route({}, [route({ title: 'Catálogo' }, [route({ title: 'Configurar produto grafico' })])]);
    expect(resolveMobilePageTitle(root, '/page/grafica/produtos/7/editar', menu)).toBe('Configurar produto grafico');
  });

  it('permite um título exclusivo do mobile sem mudar o título dos breadcrumbs', () => {
    const data = { title: 'Account Setting', mobileTitle: 'Meu perfil' };
    expect(resolveMobilePageTitle(route(data), '/theme-pages/account-setting/7', [])).toBe('Meu perfil');
    expect(data.title).toBe('Account Setting');
  });

  it('considera somente o outlet principal, sem substituir o título por um painel auxiliar', () => {
    const auxiliary = { ...route({ title: 'Painel auxiliar' }), outlet: 'painel' } as ActivatedRouteSnapshot;
    expect(resolveMobilePageTitle(route({}, [auxiliary, route({ title: 'Clientes' })]), '/page/cliente', [])).toBe('Clientes');
  });

  it('usa o prefixo mais longo somente quando não há metadados nem item exato', () => {
    expect(resolveMobilePageTitle(route(), '/page/grafica/produtos/extra', menu)).toBe('Produtos');
    expect(resolveMobilePageTitle(route(), '/page/grafica/produtos-extra', menu)).toBe('ClickManager');
    expect(resolveMobilePageTitle(route({ title: '   ' }), '/desconhecida', [])).toBe('ClickManager');
  });

  it('não consulta itens fora do menu já filtrado por permissões', () => {
    expect(resolveMobilePageTitle(route({ title: 'Tela autorizada' }), '/page/restrita', [])).toBe('Tela autorizada');
  });
});
