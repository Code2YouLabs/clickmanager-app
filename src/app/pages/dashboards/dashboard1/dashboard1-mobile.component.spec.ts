import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { DashboardService } from 'src/app/components/dashboard1/dashboard.service';
import { AppComparativoPedidosComponent } from 'src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component';
import { AppReceitaResumoComponent } from 'src/app/components/dashboard1/receita-resumo/receita-resumo.component';
import { AppStatusGridComponent } from 'src/app/components/dashboard1/status-grid/status-grid.component';
import { MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { AppDashboard1Component } from './dashboard1.component';

@Component({ selector: 'app-comparativo-pedidos, app-status-grid, app-receita-resumo', standalone: true, template: '' })
class WidgetStub {
  @Input() refreshToken = 0;
  @Input() compactMobile = false;
  @Output() refreshState = new EventEmitter<{ id: 'comparativo' | 'status' | 'receita'; refreshing: boolean }>();
}

const resumo = {
  receita: { valorTotal: 1234567.89, totalPedidos: 4, label: 'Mês atual', inicio: '2026-10-01', fim: '2026-10-31', porForma: [] },
  pedidoStatus: [], orcamentoStatus: [],
  indicadores: [
    { codigo: 'PEDIDOS', label: 'Pedidos', quantidade: 8, valor: 900 },
    { codigo: 'ORCAMENTOS', label: 'Orçamentos', quantidade: 6, valor: 700 },
    { codigo: 'RASCUNHOS', label: 'Rascunhos', quantidade: 2, valor: 300 },
  ],
};

describe('Dashboard — composição mobile compartilhando dados e widgets', () => {
  let fixture: ComponentFixture<AppDashboard1Component>;
  let layout: BehaviorSubject<{ matches: boolean }>;
  let service: jasmine.SpyObj<DashboardService>;
  let router: Router;
  let permissions: Set<string>;
  let smartcalc: boolean;
  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
  const count = (selector: string): number => fixture.nativeElement.querySelectorAll(selector).length;
  const refresh = () => query('button[aria-label="Atualizar dashboard"]') as HTMLButtonElement;

  beforeEach(() => {
    permissions = new Set(['GRAFICA_PRODUTOS_VER', 'SMARTCALC_USAR']); smartcalc = true;
    layout = new BehaviorSubject<{ matches: boolean }>({ matches: true });
    service = jasmine.createSpyObj<DashboardService>('DashboardService', ['obterVisaoGeralGrafica']);
    service.obterVisaoGeralGrafica.and.returnValue(of(resumo));
    TestBed.configureTestingModule({
      imports: [AppDashboard1Component, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [provideRouter([]),
        { provide: DashboardService, useValue: service },
        { provide: BreakpointObserver, useValue: { observe: () => layout.asObservable() } },
        { provide: AuthService, useValue: { temPermissao: (key: string) => permissions.has(key) } },
        { provide: FeatureFlagService, useValue: { carregar: () => of({}), isEnabled: () => smartcalc } },
      ],
    }).overrideComponent(AppDashboard1Component, { remove: { imports: [AppComparativoPedidosComponent, AppReceitaResumoComponent, AppStatusGridComponent] }, add: { imports: [WidgetStub] } });
    router = TestBed.inject(Router); spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(AppDashboard1Component); fixture.detectChanges();
  });
  afterEach(() => fixture.destroy());

  it('mostra apenas o título e as duas ações compactas, com Novo pedido em uma única posição', () => {
    expect(count('.dashboard-mobile-toolbar')).toBe(1);
    expect(query('.dashboard-mobile-toolbar h2')?.textContent).toBe('Visão geral');
    expect(count('.dashboard-mobile-toolbar button')).toBe(2);
    expect(count('.dashboard-actions button')).toBe(0);
    expect(fixture.nativeElement.textContent).not.toContain('Acompanhe receita, atendimento e operação');
    expect(query('.dashboard-quick-section')).toBeNull();
    expect(count('.quick-action')).toBe(0);
    expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(1);
  });

  it('reutiliza o refresh e bloqueia novos cliques durante carga do resumo e dos widgets', () => {
    const pending = new Subject<any>(); service.obterVisaoGeralGrafica.and.returnValue(pending);
    refresh().click(); fixture.detectChanges();
    expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.refreshToken).toBe(1);
    expect(refresh().disabled).toBeTrue(); expect(refresh().getAttribute('aria-busy')).toBe('true');
    refresh().click(); expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(2);
    const widgets = fixture.debugElement.queryAll(By.directive(WidgetStub)).map(element => element.componentInstance as WidgetStub);
    expect(widgets.length).toBe(3); expect(widgets.every(widget => widget.refreshToken === 1)).toBeTrue();
    widgets[0].refreshState.emit({ id: 'comparativo', refreshing: true });
    pending.next(resumo); pending.complete(); fixture.detectChanges();
    expect(refresh().disabled).toBeTrue();
    widgets[0].refreshState.emit({ id: 'comparativo', refreshing: false }); fixture.detectChanges();
    expect(refresh().disabled).toBeFalse();
  });

  it('mantém a carga inicial desabilitada e os indicadores em estado de carregamento', () => {
    const pending = new Subject<any>(); service.obterVisaoGeralGrafica.and.returnValue(pending);
    fixture.componentInstance.visaoGeral = null; fixture.componentInstance.carregarResumo(); fixture.detectChanges();
    expect(refresh().disabled).toBeTrue();
    expect(query('.dashboard-kpis')?.classList.contains('dashboard-kpis--loading')).toBeTrue();
    expect(fixture.debugElement.queryAll(By.directive(MetricCardComponent)).every(element => element.componentInstance.disabled)).toBeTrue();
    pending.next(resumo); pending.complete(); fixture.detectChanges();
    expect(refresh().disabled).toBeFalse();
  });

  it('preserva quatro métricas, formatação, ícones e navegação autorizada', () => {
    const cards = fixture.debugElement.queryAll(By.directive(MetricCardComponent));
    expect(cards.map(element => element.componentInstance.label)).toEqual(['Receita do mês', 'Pedidos', 'Orçamentos', 'Rascunhos']);
    expect(cards[0].componentInstance.value).toContain('1.234.567,89');
    expect(cards.map(element => element.componentInstance.icon)).toEqual(['cash', 'clipboard-list', 'file-dollar', 'edit']);
    const button = query('.dashboard-kpi-button')!; button.click();
    expect(router.navigate).toHaveBeenCalledWith(['/dashboards/dashboard1/grafico'], { queryParams: { tipo: 'receita' } });
    query('.dashboard-mobile-toolbar__new')!.click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos/novo']);
  });

  it('oculta Novo pedido e atalhos não autorizados sem alterar a informação dos indicadores', () => {
    permissions.clear(); fixture.componentInstance.carregarResumo(); fixture.detectChanges();
    expect(query('.dashboard-mobile-toolbar__new')).toBeNull();
    expect(query('.dashboard-quick-section')).toBeNull();
    expect(count('app-metric-card')).toBe(4);
    expect(count('.dashboard-kpi-button')).toBe(1); // Receita mantém a navegação existente.
  });

  it('preserva no desktop o filtro SmartCalc e a ação de Rascunhos', () => {
    layout.next({ matches: false });
    smartcalc = false; fixture.componentInstance.carregarResumo(); fixture.detectChanges();
    expect(query('.quick-actions')?.textContent).not.toContain('SmartCalc');
    expect(query('.quick-actions')?.textContent).toContain('Rascunhos');
    const rascunhos = Array.from(fixture.nativeElement.querySelectorAll('.quick-action')).find((button: any) => button.textContent.includes('Rascunhos')) as HTMLButtonElement;
    rascunhos.click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/rascunhos']);
  });

  it('preserva erro, dados anteriores e retry usando o mesmo serviço', () => {
    service.obterVisaoGeralGrafica.and.returnValue(throwError(() => new Error('offline')));
    refresh().click(); fixture.detectChanges();
    expect(query('.dashboard-feedback--warning')?.textContent).toContain('Mantivemos os dados anteriores');
    expect(query('.dashboard-kpis')?.textContent).toContain('1.234.567,89');
    service.obterVisaoGeralGrafica.and.returnValue(of(resumo));
    (query('.dashboard-feedback--warning button') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(query('.dashboard-feedback')).toBeNull();
    expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(3);
  });

  it('mantém desktop com descrição, botão Atualizar e atalho Novo pedido, sem duplicar widgets ou consultas', () => {
    const widgets = fixture.debugElement.queryAll(By.directive(WidgetStub)).map(element => element.componentInstance);
    layout.next({ matches: false }); fixture.detectChanges();
    expect(query('.dashboard-mobile-toolbar')).toBeNull();
    expect(query('app-card-header')?.textContent).toContain('Dashboard');
    expect(query('app-card-header')?.textContent).toContain('Acompanhe receita, atendimento e operação da gráfica.');
    expect(query('.dashboard-actions')?.textContent).toContain('Atualizar');
    expect(query('.dashboard-actions')?.textContent).toContain('Novo pedido');
    expect(query('.quick-actions')?.textContent).toContain('Novo pedido');
    expect(fixture.debugElement.queryAll(By.directive(WidgetStub)).map(element => element.componentInstance)).toEqual(widgets);
    expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(1);
    layout.next({ matches: true }); fixture.detectChanges();
    expect(count('.dashboard-mobile-toolbar')).toBe(1);
    expect(query('.dashboard-quick-section')).toBeNull();
    expect(fixture.debugElement.queryAll(By.directive(WidgetStub)).find(element => element.nativeElement.tagName === 'APP-COMPARATIVO-PEDIDOS')?.componentInstance.compactMobile).toBeTrue();
    expect(count('app-comparativo-pedidos')).toBe(1); expect(count('app-status-grid')).toBe(1); expect(count('app-receita-resumo')).toBe(1);
    expect(service.obterVisaoGeralGrafica).toHaveBeenCalledTimes(1);
  });

  it('encerra a observação de breakpoint ao sair da rota', () => {
    fixture.destroy(); const before = fixture.componentInstance.isMobile;
    layout.next({ matches: !before });
    expect(fixture.componentInstance.isMobile).toBe(before);
  });
});
