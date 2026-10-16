import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { NgApexchartsModule } from 'ng-apexcharts';
import { of } from 'rxjs';
import { DashboardService } from '../dashboard.service';
import { AppComparativoPedidosComponent } from './comparativo-pedidos.component';

// Exercise the real filter template/handlers without creating a chart or taking screenshots.
describe('Resumo comercial compacto da Home', () => {
  let fixture: ComponentFixture<AppComparativoPedidosComponent>;
  let service: jasmine.SpyObj<any>;
  let router: jasmine.SpyObj<any>;
  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);

  beforeEach(() => {
    service = jasmine.createSpyObj('DashboardService', ['obterComparativoSimples']);
    service.obterComparativoSimples.and.returnValue(of({ comparativo: {
      mesA: { label: 'Jul' }, mesB: { label: 'Jun' },
      series: { mesA: { dias: [9] }, mesB: { dias: [3] } },
    } }));
    router = jasmine.createSpyObj('Router', ['navigate']);
    spyOn(AppComparativoPedidosComponent.prototype, 'ngAfterViewInit').and.stub();
    TestBed.configureTestingModule({
      imports: [AppComparativoPedidosComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [{ provide: DashboardService, useValue: service }, { provide: Router, useValue: router }],
    }).overrideComponent(AppComparativoPedidosComponent, { remove: { imports: [NgApexchartsModule] }, add: { schemas: [NO_ERRORS_SCHEMA] } });
    fixture = TestBed.createComponent(AppComparativoPedidosComponent);
    fixture.componentRef.setInput('compactMobile', true);
    fixture.componentInstance.mesA = 6; fixture.componentInstance.mesB = 5; fixture.componentInstance.ano = 2026;
    fixture.detectChanges();
  });
  afterEach(() => fixture?.destroy());

  it('apresenta totais reais, variação e seleção atual com filtros inicialmente recolhidos', () => {
    const details = query('details') as HTMLDetailsElement;
    expect(details.open).toBeFalse();
    expect(query('summary')?.textContent).toContain('Período e comparação');
    expect(query('summary')?.textContent).toContain('Jul / Jun · 2026 · Qtd');
    expect(query('.dashboard-chart-card__mobile-summary')?.textContent).toContain('9');
    expect(query('.dashboard-chart-card__mobile-summary')?.textContent).toContain('3');
    expect(query('.dashboard-chart-card__mobile-insights')?.textContent?.trim()).toBe(fixture.componentInstance.mobileDeltaLabel);
    expect(service.obterComparativoSimples).toHaveBeenCalledTimes(1);
  });

  it('expande sem requisição e mantém os filtros reais e a navegação para Ver gráfico', () => {
    query('summary')!.click(); fixture.detectChanges();
    expect((query('details') as HTMLDetailsElement).open).toBeTrue();
    expect(service.obterComparativoSimples).toHaveBeenCalledTimes(1);
    const controls = Array.from(fixture.nativeElement.querySelectorAll('.dashboard-chart-filter')) as HTMLButtonElement[];
    expect(controls.length).toBe(5);
    controls[4].click(); fixture.detectChanges();
    expect(fixture.componentInstance.modo).toBe('receita');
    expect(query('summary')?.textContent).toContain('Valor');
    expect(service.obterComparativoSimples).toHaveBeenCalledTimes(2);
    query('.dashboard-chart-card__mobile-cta')!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboards/dashboard1/grafico'], {
      queryParams: { tipo: 'comparativo', mesA: 6, mesB: 5, ano: 2026, modo: 'receita' },
    });
  });

  it('restaura a composição desktop com a mesma fila de controles e sem nova consulta', () => {
    fixture.componentRef.setInput('compactMobile', false); fixture.detectChanges();
    expect(query('details')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.dashboard-chart-card__filters').length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('.dashboard-chart-filter').length).toBe(5);
    expect(service.obterComparativoSimples).toHaveBeenCalledTimes(1);
    expect(query('.dashboard-chart-card__desktop-summary')).toBeTruthy();
  });
});
