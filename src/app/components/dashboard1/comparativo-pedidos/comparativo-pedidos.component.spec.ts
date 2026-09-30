import { Subject, throwError } from 'rxjs';

import { AppComparativoPedidosComponent } from './comparativo-pedidos.component';

const respostaComparativo = (mesA: number, mesB: number) => ({
  comparativo: {
    mesA: { label: 'Atual' },
    mesB: { label: 'Anterior' },
    series: {
      mesA: { dias: [mesA] },
      mesB: { dias: [mesB] },
    },
  },
});

describe('AppComparativoPedidosComponent', () => {
  function createComponent() {
    const service = jasmine.createSpyObj('DashboardService', ['obterComparativoSimples']);
    const router = jasmine.createSpyObj('Router', ['navigate']);
    const cdr = jasmine.createSpyObj('ChangeDetectorRef', ['detectChanges']);
    const ngZone = { runOutsideAngular: (fn: () => void) => fn() };
    const component = new AppComparativoPedidosComponent(service, router, cdr, ngZone as any);
    return { component, service, router };
  }

  it('ignora resposta antiga para não sobrescrever filtro mais recente', () => {
    const { component, service } = createComponent();
    const primeira = new Subject<any>();
    const segunda = new Subject<any>();
    service.obterComparativoSimples.and.returnValues(primeira, segunda);

    component.carregarDoBack();
    component.alterarModo('receita');
    primeira.next(respostaComparativo(1, 1));
    primeira.complete();
    segunda.next(respostaComparativo(9, 2));
    segunda.complete();

    expect(component.totalMesA).toBe(9);
    expect(component.totalMesB).toBe(2);
    expect(component.modo).toBe('receita');
  });

  it('preserva série anterior quando atualização falha', () => {
    const { component, service } = createComponent();
    const primeira = new Subject<any>();
    service.obterComparativoSimples.and.returnValue(primeira);
    component.carregarDoBack();
    primeira.next(respostaComparativo(4, 3));
    primeira.complete();

    service.obterComparativoSimples.and.returnValue(throwError(() => new Error('offline')));
    component.carregarDoBack();

    expect(component.totalMesA).toBe(4);
    expect(component.totalMesB).toBe(3);
    expect(component.erro).toContain('Mantivemos os dados anteriores');
  });

  it('mantém query params do gráfico detalhado', () => {
    const { component, router } = createComponent();
    component.mesA = 8;
    component.mesB = 7;
    component.ano = 2026;
    component.modo = 'receita';

    component.abrirGraficoComparativo();

    expect(router.navigate).toHaveBeenCalledWith(['/dashboards/dashboard1/grafico'], {
      queryParams: { tipo: 'comparativo', mesA: 8, mesB: 7, ano: 2026, modo: 'receita' },
    });
  });
});
