import { of, Subject, throwError } from 'rxjs';

import { AppReceitaResumoComponent } from './receita-resumo.component';

describe('AppReceitaResumoComponent', () => {
  function createComponent() {
    const service = jasmine.createSpyObj('DashboardService', ['obterReceitaResumo']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const component = new AppReceitaResumoComponent(service, router);
    return { component, service, router };
  }

  it('usa Mês atual como rótulo padrão sem alterar o parâmetro do gráfico detalhado', () => {
    const { component, service, router } = createComponent();
    service.obterReceitaResumo.and.returnValue(of({ valorTotal: 120, totalPedidos: 2, porForma: [] }));

    component.ngOnInit();
    component.abrirGraficoReceita();

    expect(component.ranges[0].shortLabel).toBe('Mês atual');
    expect(component.selectedRangeLabel).toBe('Mês atual');
    expect(router.navigate).toHaveBeenCalledWith(['/dashboards/dashboard1/grafico'], {
      queryParams: { tipo: 'receita', periodo: 'mes_atual' },
    });
  });

  it('preserva receita anterior quando refresh falha', () => {
    const { component, service } = createComponent();
    service.obterReceitaResumo.and.returnValue(of({
      valorTotal: 320,
      totalPedidos: 4,
      porForma: [{ forma: 'PIX', valor: 320 }],
    }));
    component.ngOnInit();

    service.obterReceitaResumo.and.returnValue(throwError(() => new Error('offline')));
    component.carregarDoBack();

    expect(component.totalValor).toBe(320);
    expect(component.totalPedidos).toBe(4);
    expect(component.erro).toContain('Mantivemos os dados anteriores');
  });

  it('ignora resposta antiga quando um novo período já foi solicitado', () => {
    const { component, service } = createComponent();
    const primeira = new Subject<any>();
    const segunda = new Subject<any>();
    service.obterReceitaResumo.and.returnValues(primeira, segunda);

    component.carregarDoBack();
    component.selectedRange = 'ultimos_30';
    component.carregarDoBack();
    primeira.next({ valorTotal: 10, totalPedidos: 1, porForma: [] });
    primeira.complete();
    segunda.next({ valorTotal: 90, totalPedidos: 9, porForma: [] });
    segunda.complete();

    expect(component.totalValor).toBe(90);
    expect(component.totalPedidos).toBe(9);
  });
});
