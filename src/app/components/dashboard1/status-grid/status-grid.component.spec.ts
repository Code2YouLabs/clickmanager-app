import { of, throwError } from 'rxjs';

import { AppStatusGridComponent } from './status-grid.component';

const resumo = {
  pedidoStatus: [
    { codigo: 'EM_PRODUCAO', label: 'Produção', quantidade: 3, valor: 150 },
    { codigo: 'ENTREGUE', label: 'Entregue', quantidade: 2, valor: 100 },
  ],
  orcamentoStatus: [
    { codigo: 'APROVADO', label: 'Aprovado', quantidade: 5, valor: 900 },
    { codigo: 'VENCIDO', label: 'Vencido', quantidade: 1, valor: 50 },
  ],
};

describe('AppStatusGridComponent', () => {
  function createComponent() {
    const service = jasmine.createSpyObj('DashboardService', ['obterResumoGrafica']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const component = new AppStatusGridComponent(service, router);
    return { component, service, router };
  }

  it('mantém ordem canônica dos status da operação gráfica', () => {
    const { component, service } = createComponent();
    service.obterResumoGrafica.and.returnValue(of(resumo));

    component.ngOnInit();

    expect(component.pedidoStats.map((item) => item.status)).toEqual([
      'AGUARDANDO_PAGAMENTO',
      'PENDENTE',
      'EM_PRODUCAO',
      'PRONTO',
      'ENTREGUE',
    ]);
    expect(component.orcamentoStats.map((item) => item.status)).toEqual([
      'ABERTO',
      'ENVIADO',
      'APROVADO',
      'RECUSADO',
      'VENCIDO',
      'CANCELADO',
    ]);
  });

  it('preserva status anteriores quando atualização falha', () => {
    const { component, service } = createComponent();
    service.obterResumoGrafica.and.returnValue(of(resumo));
    component.ngOnInit();

    service.obterResumoGrafica.and.returnValue(throwError(() => new Error('offline')));
    component.carregarStatus();

    expect(component.pedidoStats.find((item) => item.status === 'EM_PRODUCAO')?.quantidade).toBe(3);
    expect(component.erro).toContain('Mantivemos os dados anteriores');
  });

  it('mantém navegação com filtro de status', () => {
    const { component, service, router } = createComponent();
    service.obterResumoGrafica.and.returnValue(of(resumo));
    component.ngOnInit();

    component.abrirStatus(component.orcamentoStats.find((item) => item.status === 'APROVADO')!);

    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial-beta/orcamentos'], {
      queryParams: { status: 'APROVADO' },
    });
  });
});
