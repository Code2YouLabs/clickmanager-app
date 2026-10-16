import { BreakpointObserver } from '@angular/cdk/layout';
import { By } from '@angular/platform-browser';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ComercialListComponent } from './comercial-list.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ComercialTipo } from './comercial.models';
import { PrimeiroPedidoTutorialService } from './primeiro-pedido/primeiro-pedido-tutorial.service';

describe('ComercialListComponent', () => {
  beforeAll(() => registerLocaleData(ptBr, 'pt-BR'));
  let fixture: ComponentFixture<ComercialListComponent>;
  let component: ComercialListComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let router: jasmine.SpyObj<Router>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let primeiroPedidoTutorial: jasmine.SpyObj<PrimeiroPedidoTutorialService>;
  let data: BehaviorSubject<{ tipo: ComercialTipo }>;
  let params: BehaviorSubject<ReturnType<typeof convertToParamMap>>;
  let viewport: BehaviorSubject<any>;
  let pedidoAcompanhadoId: number | null;
  const page = { content: [{ id: 1, numero: 'PED-1', clienteNome: 'Maria', status: 'PENDENTE', total: 15 }], totalElements: 21 };
  beforeEach(() => {
    viewport = new BehaviorSubject({ matches: false, breakpoints: {} });
    data = new BehaviorSubject<{ tipo: ComercialTipo }>({ tipo: 'pedidos' });
    params = new BehaviorSubject(convertToParamMap({}));
    pedidoAcompanhadoId = null;
    service = jasmine.createSpyObj('GraficaProdutoService', [
      'listarPedidosComerciais',
      'listarOrcamentosComerciais',
      'listarRascunhosComerciais',
      'buscarPedidoComercial',
    ]);
    for (const method of [service.listarPedidosComerciais, service.listarOrcamentosComerciais, service.listarRascunhosComerciais]) method.and.returnValue(of(page as any));
    service.buscarPedidoComercial.and.returnValue(of({ id: 1, numero: 'PED-1', clienteNome: 'Maria', status: 'PENDENTE', total: 15, itens: [] } as any));
    router = jasmine.createSpyObj('Router', ['navigate']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'info']);
    primeiroPedidoTutorial = jasmine.createSpyObj<PrimeiroPedidoTutorialService>('PrimeiroPedidoTutorialService', [
      'iniciarSeNecessario',
      'registrarNovoPedido',
      'registrarKanbanSelecionado',
      'registrarPedidoMovido',
      'targetPedidoKanban',
      'retomarPedidoCriado',
    ]);
    primeiroPedidoTutorial.targetPedidoKanban.and.returnValue('');
    Object.defineProperty(primeiroPedidoTutorial, 'pedidoAcompanhadoId', { get: () => pedidoAcompanhadoId });
    TestBed.configureTestingModule({ imports: [ComercialListComponent, NoopAnimationsModule], providers: [
      { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: GraficaProdutoService, useValue: service }, { provide: Router, useValue: router },
      { provide: MatDialog, useValue: dialog }, { provide: ToastrService, useValue: toastr },
      { provide: PrimeiroPedidoTutorialService, useValue: primeiroPedidoTutorial },
      { provide: ActivatedRoute, useValue: { data, queryParamMap: params } },
    ] });
    fixture = TestBed.createComponent(ComercialListComponent); component = fixture.componentInstance;
  });
  afterEach(() => TestBed.resetTestingModule());
  for (const [tipo, titulo, method] of [
    ['pedidos', 'Pedidos', 'listarPedidosComerciais'],
    ['orcamentos', 'Orçamentos', 'listarOrcamentosComerciais'],
    ['rascunhos', 'Rascunhos', 'listarRascunhosComerciais'],
  ] as const) {
    it(`renderiza ${titulo} com contexto e destinos próprios`, () => {
      data.next({ tipo }); fixture.detectChanges();
      expect(service[method]).toHaveBeenCalledWith(0, 10, null);
      expect(fixture.nativeElement.querySelector('[role=heading]').textContent).toContain(titulo);
      expect(fixture.nativeElement.textContent).toContain(component.subtitulo);
      component.novo(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial', tipo, 'novo']);
      expect(primeiroPedidoTutorial.registrarNovoPedido).not.toHaveBeenCalled();
      component.onAction({ action: 'abrir', row: page.content[0] });
      expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial', tipo, 1]);
    });
  }
  it('busca somente a página carregada sem fingir consulta global nem alterar total do servidor', () => {
    fixture.detectChanges(); component.paginar({ pageIndex: 2, pageSize: 10, length: 21 });
    const calls = service.listarPedidosComerciais.calls.count();
    for (const termo of ['PED-1', 'maria', 'pendente']) { component.buscar(termo); expect(component.itensFiltrados.length).toBe(1); }
    component.buscar('ausente'); fixture.detectChanges();
    expect(component.itensFiltrados).toEqual([]); expect(component.totalItens).toBe(21); expect(component.pagina).toBe(2);
    expect(service.listarPedidosComerciais.calls.count()).toBe(calls);
    expect(fixture.nativeElement.textContent).toContain('Nenhum resultado encontrado');
    expect(fixture.nativeElement.textContent).toContain('página atual');
    component.buscar(''); expect(component.itensFiltrados.length).toBe(1);
  });
  it('aplica status no servidor, pagina e limpa pelo contrato da URL', () => {
    fixture.detectChanges(); params.next(convertToParamMap({ status: 'PRONTO' }));
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 10, 'PRONTO');
    component.paginar({ pageIndex: 1, pageSize: 20, length: 21 });
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(1, 20, 'PRONTO');
    component.filtrar({}); expect(router.navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { status: null }, queryParamsHandling: 'merge' }));
  });
  it('mostra erro inicial e permite retry sem transformar falha em vazio', () => {
    service.listarPedidosComerciais.and.returnValue(throwError(() => ({ status: 500 })));
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(fixture.nativeElement.textContent).not.toContain('Nenhum registro encontrado');
    service.listarPedidosComerciais.and.returnValue(of(page as any));
    fixture.nativeElement.querySelector('[role=alert] button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy(); expect(component.erro).toBeNull();
  });
  it('preserva dados e total no refresh e na falha de atualização', () => {
    fixture.detectChanges(); const response = new Subject<any>(); service.listarPedidosComerciais.and.returnValue(response);
    component.carregar(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Atualizando registros'); expect(component.itens).toEqual(page.content);
    response.error({ status: 500 }); fixture.detectChanges();
    expect(component.totalItens).toBe(21); expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
  });
  it('oculta os dados quando o servidor responde 403', () => {
    fixture.detectChanges(); service.listarPedidosComerciais.and.returnValue(throwError(() => ({ status: 403 })));
    component.carregar(); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
  it('mostra loading inicial e depois vazio real', () => {
    const response = new Subject<any>(); service.listarPedidosComerciais.and.returnValue(response);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Carregando registros');
    response.next({ content: [], totalElements: 0 }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum registro encontrado');
  });
  it('cancela consulta obsoleta e não reaproveita dados entre entidades', () => {
    const response = new Subject<any>(); service.listarPedidosComerciais.and.returnValue(response); fixture.detectChanges();
    data.next({ tipo: 'orcamentos' }); response.next({ content: [{ id: 99 }], totalElements: 99 });
    expect(component.itens).toEqual(page.content); expect(component.totalItens).toBe(21);
    fixture.destroy(); expect(response.observed).toBeFalse();
  });

  it('busca o pedido acompanhado quando ele não veio na primeira página do Kanban', () => {
    pedidoAcompanhadoId = 99;
    service.listarPedidosComerciais.and.returnValue(of({ content: [], totalElements: 0, number: 0, size: 20 } as any));
    service.buscarPedidoComercial.and.returnValue(of({
      id: 99,
      numero: 'PED-99',
      clienteNome: 'Joana',
      status: 'PENDENTE',
      total: 30,
      itens: [],
    } as any));

    fixture.detectChanges();
    component.alterarVisualizacao('kanban');

    expect(service.buscarPedidoComercial).toHaveBeenCalledWith(99);
    expect(component.kanbanColumns.find((column) => column.status === 'PENDENTE')?.items)
      .toEqual([jasmine.objectContaining({ id: 99 }) as any]);
  });

  it('retoma o tutorial no pedido criado mantendo a lista para orientar a troca para Kanban', () => {
    params.next(convertToParamMap({ primeiroPedidoId: 42 }));

    fixture.detectChanges();

    expect(component.viewMode).toBe('lista');
    expect(primeiroPedidoTutorial.retomarPedidoCriado).toHaveBeenCalledWith(42);
    expect(primeiroPedidoTutorial.iniciarSeNecessario).not.toHaveBeenCalled();
  });
  it('projeta o pedido mobile com as mesmas ações, totais e detalhes financeiros', () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const item = fixture.nativeElement.querySelector('.pedido-mobile-item');
    expect(item.textContent).toContain('PED-1'); expect(item.textContent).toContain('Maria');
    expect(item.textContent).toContain('Pendente'); expect(item.textContent).toContain('15,00');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    const buttons = item.querySelectorAll('button');
    buttons[0].click(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial', 'pedidos', 1]);
    buttons[1].click(); fixture.detectChanges();
    expect(buttons[1].getAttribute('aria-expanded')).toBe('true');
    expect(item.textContent).toContain('Responsável'); expect(item.textContent).toContain('Total Pago');
    expect(item.textContent).toContain('Resta Pagar');
    const table = fixture.debugElement.query(By.directive(DataTableComponent)).componentInstance;
    expect(table.data).toEqual(component.itensFiltrados);
    expect(table.pagination.totalItems).toBe(21);
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeNull();
    expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('table').textContent).toContain('Total Pago');
  });

  it('preserva estados no item mobile: loading, vazio, erro, retry, refresh e 403', () => {
    viewport.next({ matches: true, breakpoints: {} });
    const response = new Subject<any>(); service.listarPedidosComerciais.and.returnValue(response);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Carregando registros');
    response.next({ content: [], totalElements: 0 }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum registro encontrado');
    component.carregar(); response.error({ status: 500 }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    service.listarPedidosComerciais.and.returnValue(of(page as any));
    fixture.nativeElement.querySelector('[role=alert] button').click(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeTruthy();
    const refresh = new Subject<any>(); service.listarPedidosComerciais.and.returnValue(refresh);
    component.carregar(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Atualizando registros');
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeTruthy();
    refresh.error({ status: 403 }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeNull();
  });

  for (const tipo of ['orcamentos', 'rascunhos'] as const) {
    it(`não migra ${tipo} para a apresentação de item`, () => {
      viewport.next({ matches: true, breakpoints: {} }); data.next({ tipo }); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('table')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeNull();
      expect(fixture.nativeElement.querySelector('.page-card--mobile-compact')).toBeNull();
    });
  }

  it('preserva as âncoras de lista, novo e alternância no mobile', () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const targets = fixture.debugElement.queryAll(By.directive(TutorialTargetDirective));
    const ids = targets.map(target => target.injector.get(TutorialTargetDirective).targetId);
    expect(ids).toContain(component.primeiroPedidoTargets.lista);
    expect(ids).toContain(component.primeiroPedidoTargets.novo);
    expect(ids).toContain(component.primeiroPedidoTargets.alternarKanban);
    expect(primeiroPedidoTutorial.iniciarSeNecessario).toHaveBeenCalled();
  });

  it('Novo pedido aparece uma vez como FAB no mobile em Lista e Kanban com a mesma navegação', () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    for (const mode of ['lista', 'kanban'] as const) {
      component.alterarVisualizacao(mode); fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('app-card-header');
      expect(header.textContent.trim()).toBe('Pedidos');
      expect(header.querySelector('button')).toBeNull();
      expect(fixture.nativeElement.querySelector('.search-scope')).toBeNull();
      const fabs = fixture.nativeElement.querySelectorAll('.mobile-fab-action');
      expect(fabs.length).toBe(1);
      expect(fabs[0].getAttribute('aria-label')).toBe('Novo pedido');
      expect(fabs[0].getAttribute('data-tutorial-target')).toBe(component.primeiroPedidoTargets.novo);
      expect(fixture.nativeElement.querySelectorAll('[data-tutorial-target="' + component.primeiroPedidoTargets.novo + '"]').length).toBe(1);
      router.navigate.calls.reset(); fabs[0].click();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/page/grafica/comercial', 'pedidos', 'novo']);
      expect(fixture.nativeElement.querySelector('app-view-mode-toggle')).toBeTruthy();
      expect(fixture.nativeElement.querySelector('input[type=search]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector(mode === 'lista' ? 'mat-paginator' : 'app-kanban-board')).toBeTruthy();
    }
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-mobile-fab-action')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-card-header').textContent).toContain(component.subtitulo);
    expect(fixture.nativeElement.querySelector('app-card-header button').textContent).toContain('Novo pedido');
    expect(fixture.nativeElement.querySelector('.search-scope')).toBeTruthy();
  });

});
