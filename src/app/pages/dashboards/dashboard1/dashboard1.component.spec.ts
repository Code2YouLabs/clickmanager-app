import { of, throwError } from 'rxjs';

import { AppDashboard1Component } from './dashboard1.component';

const visaoGeral = {
  receita: { valorTotal: 1234, totalPedidos: 4, label: 'Mês atual' },
  indicadores: [
    { codigo: 'PEDIDOS', label: 'Pedidos', quantidade: 8, valor: 900 },
    { codigo: 'ORCAMENTOS', label: 'Orçamentos', quantidade: 6, valor: 700 },
    { codigo: 'RASCUNHOS', label: 'Rascunhos', quantidade: 2, valor: 300 },
  ],
};

describe('AppDashboard1Component', () => {
  function createComponent(permissoes: string[] = [], smartCalcEnabled = true): {
    component: AppDashboard1Component;
    service: jasmine.SpyObj<any>;
    router: jasmine.SpyObj<any>;
  } {
    const service = jasmine.createSpyObj('DashboardService', ['obterVisaoGeralGrafica']);
    service.obterVisaoGeralGrafica.and.returnValue(of(visaoGeral));
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const auth = jasmine.createSpyObj('AuthService', ['temPermissao']);
    auth.temPermissao.and.callFake((permissao: string) => permissoes.includes(permissao));
    const features = jasmine.createSpyObj('FeatureFlagService', ['carregar', 'isEnabled']);
    features.carregar.and.returnValue(of({ SMARTCALC: smartCalcEnabled }));
    features.isEnabled.and.callFake((feature: string) => feature === 'SMARTCALC' ? smartCalcEnabled : false);

    const component = new AppDashboard1Component(service, router, auth, features);
    return { component, service, router };
  }

  it('filtra atalhos e navegação dos KPIs usando as mesmas permissões/features das rotas', () => {
    const { component } = createComponent(['PEDIDOS_VER']);

    component.ngOnInit();

    expect(component.podeCriarPedido).toBeFalse();
    expect(component.quickActions.map((action) => action.label)).toEqual([]);
    expect(component.summaryCards.find((card) => card.key === 'pedidos')?.navigable).toBeTrue();
    expect(component.summaryCards.find((card) => card.key === 'orcamentos')?.navigable).toBeFalse();
  });

  it('coordena refresh do cabeçalho com widgets filhos', () => {
    const { component, service } = createComponent(['PEDIDOS_CADASTRAR']);
    component.ngOnInit();

    component.onWidgetRefreshState({ id: 'comparativo', refreshing: true });
    expect(component.atualizando).toBeTrue();

    component.onWidgetRefreshState({ id: 'comparativo', refreshing: false });
    component.atualizarDashboard();

    expect(component.refreshToken).toBe(1);
    expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(2);
  });

  it('preserva dados anteriores quando a atualização dos indicadores falha', () => {
    const { component, service } = createComponent();
    component.ngOnInit();
    service.obterVisaoGeralGrafica.and.returnValue(throwError(() => new Error('offline')));

    component.carregarResumo();

    expect(component.erro).toBeNull();
    expect(component.erroAtualizacao).toContain('Mantivemos os dados anteriores');
    expect(component.summaryCards.find((card) => card.key === 'receita')?.value).toContain('1.234,00');
  });
});
