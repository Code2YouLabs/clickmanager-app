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

  it('abrevia status longo apenas no card mobile e mantém o rótulo completo acessível', () => {
    service.listarPedidosComerciais.and.returnValue(of({ content: [{ ...page.content[0], status: 'AGUARDANDO_PAGAMENTO' }], totalElements: 1 } as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const status = fixture.nativeElement.querySelector('.pedido-mobile-item .status-pill');
    expect(status.textContent).toBe('Ag. pagto.');
    expect(status.getAttribute('title')).toBe('Aguardando pagamento');
    expect(status.getAttribute('aria-label')).toBe('Aguardando pagamento');
    expect(component.statusMobileLabel('EM_PRODUCAO')).toBe('Em produção');
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('table .status-pill').textContent).toBe('Aguardando pagamento');
  });

  it('mantém referência completa, nome longo e valores reais nas ações e no financeiro mobile', () => {
    const number = 'PED-2026-000000000000000000000000000000000123';
    const name = 'Associação Comercial e Industrial de São José dos Campos';
    service.listarPedidosComerciais.and.returnValue(of({ content: [{ ...page.content[0], numero: number,
      clienteNome: name, total: 9999999.99, totalPago: 100, restaPagar: 9999899.99,
      responsavelNome: 'Responsável pelo atendimento', createdAt: '2026-10-16T10:30:00' }], totalElements: 1 } as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const card = fixture.nativeElement.querySelector('.pedido-mobile-item');
    expect(card.querySelector('header strong').textContent).toBe(number);
    expect(card.querySelector('.status-pill').textContent).toContain('Pendente');
    expect(card.querySelector('.pedido-mobile-item__cliente').textContent).toBe(name);
    expect(card.querySelector('time').textContent).toContain('16/10/2026');
    expect(card.textContent).toContain('9.999.999,99');
    const buttons = card.querySelectorAll('button'); buttons[0].click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial', 'pedidos', 1]);
    buttons[1].click(); fixture.detectChanges();
    expect(card.querySelector('.expanded-detail').textContent).toContain('Responsável pelo atendimento');
    expect(card.querySelector('.expanded-detail').textContent).toContain('100,00');
    buttons[1].click(); fixture.detectChanges(); expect(card.querySelector('.expanded-detail')).toBeNull();
  });

  it('apresenta vazio mobile de Pedidos com ícone e texto próprios sem alterar busca ou desktop', () => {
    service.listarPedidosComerciais.and.returnValue(of({ content: [], totalElements: 0 } as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const empty = () => fixture.nativeElement.querySelector('.data-table-empty');
    expect(empty().querySelector('strong').textContent).toBe('Nenhum pedido encontrado');
    expect(empty().textContent).toContain('Quando houver pedidos, eles aparecerão aqui.');
    expect(empty().querySelector('mat-icon').textContent).toBe('assignment');
    expect(empty().querySelector('mat-icon').getAttribute('aria-hidden')).toBe('true');
    component.buscar('papel'); fixture.detectChanges();
    expect(empty().querySelector('strong').textContent).toBe('Nenhum resultado encontrado');
    expect(empty().textContent).toContain('Altere a busca');
    expect(empty().querySelector('mat-icon').textContent).toBe('search_off');
    component.buscar(''); viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(empty().querySelector('strong').textContent).toBe('Nenhum registro encontrado');
    expect(empty().textContent).toContain('Crie um novo registro comercial para começar.');
    expect(empty().querySelector('mat-icon')).toBeNull();
  });

  const batch = (start: number, count: number) => Array.from({ length: count }, (_, index) => ({
    id: start + index, numero: `PED-${start + index}`, clienteNome: 'Maria', status: 'PENDENTE', total: 15,
  }));
  const responsePage = (index: number, total = 25) => ({ content: batch(index * 10 + 1, Math.min(10, Math.max(0, total - index * 10))), totalElements: total, number: index });

  it('primeiro lote também recusa duplicações silenciosas e mantém os itens únicos na ordem recebida', () => {
    const first = responsePage(0); first.content[1].id = 1;
    service.listarPedidosComerciais.and.returnValue(of(first as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    expect(component.itens.length).toBe(9); expect(component.itens[0].id).toBe(1);
    expect(component.reiniciarLista).toBeTrue();
    expect(fixture.nativeElement.querySelector('.data-table-progressive__error').textContent).toContain('repetidos');
    expect(fixture.nativeElement.querySelector('.data-table-progressive__more')).toBeNull();
  });

  it('carrega lotes sequenciais, mantém identidade/expansão e encerra no total real', () => {
    const pending = new Subject<any>();
    service.listarPedidosComerciais.and.callFake((index: number) => index === 1 ? pending : of(responsePage(index) as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const firstItem = component.itens[0]; const firstNode = fixture.nativeElement.querySelector('.pedido-mobile-item');
    fixture.nativeElement.querySelector('.pedido-mobile-item__actions button[mat-button]').click(); fixture.detectChanges();
    const more = () => fixture.nativeElement.querySelector('.data-table-progressive__more');
    more().click(); more().click(); fixture.detectChanges();
    expect(service.listarPedidosComerciais.calls.count()).toBe(2);
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(1, 10, null);
    expect(component.pagina).toBe(0); expect(component.itens.length).toBe(10);
    expect(more().disabled).toBeTrue(); expect(firstNode.querySelector('.expanded-detail')).toBeTruthy();
    pending.next(responsePage(1)); pending.complete(); fixture.detectChanges();
    expect(component.itens.length).toBe(20); expect(component.itens[0]).toBe(firstItem);
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBe(firstNode);
    expect(firstNode.querySelector('.expanded-detail')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('Carregados 20 de 25 pedidos');
    more().click(); fixture.detectChanges();
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(2, 10, null);
    expect(component.itens.length).toBe(25); expect(component.pagina).toBe(2);
    expect(new Set(component.itens.map(item => item.id)).size).toBe(25);
    expect(more()).toBeNull(); expect(fixture.nativeElement.querySelector('mat-paginator')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Carregados 25 de 25 pedidos');
  });

  it('falha adicional preserva dados e retry solicita a mesma página; 403 esconde os pedidos', () => {
    let pending = new Subject<any>();
    service.listarPedidosComerciais.and.callFake((index: number) => index === 0 ? of(responsePage(0) as any) : pending);
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const previous = component.itens;
    fixture.nativeElement.querySelector('.data-table-progressive__more').click(); pending.error({ status: 500 }); fixture.detectChanges();
    expect(component.itens).toBe(previous); expect(component.pagina).toBe(0); expect(component.erro).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.pedido-mobile-item').length).toBe(10);
    pending = new Subject<any>();
    fixture.nativeElement.querySelector('.data-table-progressive__error button').click(); fixture.detectChanges();
    expect(service.listarPedidosComerciais.calls.mostRecent().args).toEqual([1, 10, null]);
    pending.next(responsePage(1)); pending.complete(); fixture.detectChanges(); expect(component.itens.length).toBe(20);
    pending = new Subject<any>();
    fixture.nativeElement.querySelector('.data-table-progressive__more').click(); pending.error({ status: 403 }); fixture.detectChanges();
    expect(component.acessoNegado).toBeTrue(); expect(component.itens).toEqual([]);
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('.data-table-progressive')).toBeNull();
  });

  it('busca apenas no conjunto carregado sem pedir páginas automaticamente e permite ampliar esse conjunto', () => {
    service.listarPedidosComerciais.and.callFake((index: number) => of(responsePage(index) as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    component.buscar('PED-15'); fixture.detectChanges();
    expect(component.itensFiltrados).toEqual([]); expect(service.listarPedidosComerciais.calls.count()).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Nenhum resultado nos pedidos carregados');
    expect(fixture.nativeElement.textContent).toContain('A busca considera apenas os pedidos carregados.');
    fixture.nativeElement.querySelector('.data-table-progressive__more').click(); fixture.detectChanges();
    expect(component.itens.length).toBe(20); expect(component.itensFiltrados.map(item => item.id)).toEqual([15]);
    expect(fixture.nativeElement.textContent).toContain('Carregados 20 de 25 pedidos');
    expect(service.listarPedidosComerciais.calls.count()).toBe(2);
  });

  it('mudança de status cancela lote antigo e reinicia na página zero sem misturar consultas', () => {
    const stale = new Subject<any>(); const filtered = new Subject<any>();
    service.listarPedidosComerciais.and.callFake((index: number, _size: number, status?: string | null) =>
      status ? filtered : index === 1 ? stale : of(responsePage(0) as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    fixture.nativeElement.querySelector('.data-table-progressive__more').click(); fixture.detectChanges();
    component.buscar('Maria'); params.next(convertToParamMap({ status: 'PRONTO' })); fixture.detectChanges();
    expect(stale.observed).toBeFalse(); expect(component.itens).toEqual([]); expect(component.carregandoMais).toBeFalse();
    expect(service.listarPedidosComerciais.calls.mostRecent().args).toEqual([0, 10, 'PRONTO']);
    stale.next(responsePage(1)); expect(component.itens).toEqual([]);
    filtered.next({ content: batch(101, 10), totalElements: 12, number: 0 }); fixture.detectChanges();
    expect(component.itens.map(item => item.id)).toEqual(batch(101, 10).map(item => item.id));
    expect(component.busca).toBe('Maria'); expect(component.pagina).toBe(0);
  });

  for (const inconsistency of ['total', 'overlap', 'batch-duplicate', 'short', 'page'] as const) {
    it(`não concatena silenciosamente lote inconsistente (${inconsistency}) e oferece atualização`, () => {
      const shifted = responsePage(1);
      if (inconsistency === 'total') shifted.totalElements++;
      if (inconsistency === 'overlap') shifted.content[0].id = 1;
      if (inconsistency === 'batch-duplicate') shifted.content[1].id = shifted.content[0].id;
      if (inconsistency === 'short') shifted.content.pop();
      if (inconsistency === 'page') shifted.number = 0;
      service.listarPedidosComerciais.and.callFake((index: number) => of((index === 0 ? responsePage(0) : shifted) as any));
      viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
      const previous = component.itens;
      fixture.nativeElement.querySelector('.data-table-progressive__more').click(); fixture.detectChanges();
      expect(component.itens).toBe(previous); expect(component.pagina).toBe(0); expect(component.reiniciarLista).toBeTrue();
      expect(new Set(component.itens.map(item => item.id)).size).toBe(10);
      const reset = fixture.nativeElement.querySelector('.data-table-progressive__error button');
      expect(reset.textContent).toContain('Atualizar lista'); reset.click(); fixture.detectChanges();
      expect(service.listarPedidosComerciais.calls.mostRecent().args).toEqual([0, 10, null]);
      expect(component.reiniciarLista).toBeFalse(); expect(component.erroMais).toBeNull();
    });
  }

  it('lote inicial incompleto não permite avançar deixando lacunas silenciosas', () => {
    service.listarPedidosComerciais.and.callFake((index: number) => of({ ...responsePage(index),
      content: index === 0 ? batch(1, 5) : batch(11, 10) } as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    fixture.nativeElement.querySelector('.data-table-progressive__more').click(); fixture.detectChanges();
    expect(component.itens.length).toBe(5); expect(component.pagina).toBe(0);
    expect(component.reiniciarLista).toBeTrue();
    expect(fixture.nativeElement.querySelector('.data-table-progressive__error button').textContent).toContain('Atualizar lista');
  });

  it('viewport descarta acúmulo, cancela lote em voo e retorna à página desktop tradicional', () => {
    let pending: Subject<any> | null = null;
    service.listarPedidosComerciais.and.callFake((index: number) => pending && index > 0 ? pending : of(responsePage(index) as any));
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    fixture.nativeElement.querySelector('.data-table-progressive__more').click(); fixture.detectChanges();
    expect(component.itens.length).toBe(20);
    pending = new Subject<any>(); fixture.nativeElement.querySelector('.data-table-progressive__more').click(); fixture.detectChanges();
    component.buscar('Maria'); viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(pending.observed).toBeFalse(); expect(component.itens.length).toBe(10); expect(component.pagina).toBe(0);
    expect(component.carregandoMais).toBeFalse(); expect(component.busca).toBe('Maria');
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeTruthy(); expect(fixture.nativeElement.querySelector('.data-table-progressive')).toBeNull();
    const calls = service.listarPedidosComerciais.calls.count();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    expect(service.listarPedidosComerciais.calls.count()).toBe(calls + 1); expect(component.itens.length).toBe(10);
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges(); expect(service.listarPedidosComerciais.calls.count()).toBe(calls + 1);
    pending.next(responsePage(2)); expect(component.itens.length).toBe(10);
  });

  it('preserva estados no item mobile: loading, vazio, erro, retry, refresh e 403', () => {
    viewport.next({ matches: true, breakpoints: {} });
    const response = new Subject<any>(); service.listarPedidosComerciais.and.returnValue(response);
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Carregando registros');
    response.next({ content: [], totalElements: 0 }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nenhum pedido encontrado');
    expect(fixture.nativeElement.querySelector('.data-table-progressive')).toBeNull();
    expect(fixture.nativeElement.querySelector('mat-paginator')).toBeNull();
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
      expect(fixture.nativeElement.querySelector('.page-card--mobile-compact')).toBeTruthy();
    });
  }

  it('preserva as âncoras de lista e novo sem oferecer Kanban no mobile', () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    const targets = fixture.debugElement.queryAll(By.directive(TutorialTargetDirective));
    const ids = targets.map(target => target.injector.get(TutorialTargetDirective).targetId);
    expect(ids).toContain(component.primeiroPedidoTargets.lista);
    expect(ids).toContain(component.primeiroPedidoTargets.novo);
    expect(ids).not.toContain(component.primeiroPedidoTargets.alternarKanban);
    expect(primeiroPedidoTutorial.iniciarSeNecessario).toHaveBeenCalled();
  });

  it('mobile inicia em Lista sem menu Kanban e restaura a preferência desktop', () => {
    fixture.detectChanges(); component.alterarVisualizacao('kanban'); fixture.detectChanges();
    primeiroPedidoTutorial.registrarKanbanSelecionado.calls.reset();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    expect(component.viewMode).toBe('lista');
    expect(fixture.nativeElement.querySelector('app-view-mode-toggle')).toBeNull();
    expect(fixture.nativeElement.querySelector('.pedido-mobile-item')).toBeTruthy();
    expect(primeiroPedidoTutorial.registrarKanbanSelecionado).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[aria-label="Opções de visualização"]')).toBeNull();
    const abrir = fixture.nativeElement.querySelector('.pedido-mobile-item__actions button');
    abrir.click();
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial', 'pedidos', 1]);
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(component.viewMode).toBe('kanban');
    expect(fixture.nativeElement.querySelector('app-view-mode-toggle')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('[aria-label="Opções de visualização"]')).toBeNull();
    expect(primeiroPedidoTutorial.registrarKanbanSelecionado).not.toHaveBeenCalled();
  });

  it('Novo pedido aparece uma vez como FAB no mobile em Lista e Kanban com a mesma navegação', () => {
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    for (const mode of ['lista', 'kanban'] as const) {
      component.alterarVisualizacao(mode); fixture.detectChanges();
      const header = fixture.nativeElement.querySelector('app-card-header');
      expect(header.querySelector('[role=heading]').textContent.trim()).toBe('Pedidos');
      expect(header.querySelector('.card-header__primary-action')).toBeNull();
      expect(header.querySelector('[aria-label="Opções de visualização"]')).toBeNull();
      expect(fixture.nativeElement.querySelector('.search-scope')).toBeNull();
      const fabs = fixture.nativeElement.querySelectorAll('.mobile-fab-action');
      expect(fabs.length).toBe(1);
      expect(fabs[0].getAttribute('aria-label')).toBe('Novo pedido');
      expect(fabs[0].getAttribute('data-tutorial-target')).toBe(component.primeiroPedidoTargets.novo);
      expect(fixture.nativeElement.querySelectorAll('[data-tutorial-target="' + component.primeiroPedidoTargets.novo + '"]').length).toBe(1);
      router.navigate.calls.reset(); fabs[0].click();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/page/grafica/comercial', 'pedidos', 'novo']);
      expect(fixture.nativeElement.querySelector('app-view-mode-toggle')).toBeNull();
      expect(fixture.nativeElement.querySelector('input[type=search]')).toBeTruthy();
      expect(fixture.nativeElement.querySelector(mode === 'lista' ? '.data-table-progressive' : 'app-kanban-board')).toBeTruthy();
    }
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-mobile-fab-action')).toBeNull();
    expect(fixture.nativeElement.querySelector('app-card-header').textContent).toContain(component.subtitulo);
    expect(fixture.nativeElement.querySelector('app-card-header button').textContent).toContain('Novo pedido');
    expect(fixture.nativeElement.querySelector('.search-scope')).toBeTruthy();
  });

  for (const [tipo, label] of [['pedidos', 'Novo pedido'], ['orcamentos', 'Novo orçamento'], ['rascunhos', 'Novo rascunho']] as const) {
    it(`${tipo} usa a mesma declaração de ação no desktop e no mobile`, () => {
      data.next({ tipo }); fixture.detectChanges();
      const desktopButton = fixture.nativeElement.querySelector('.card-header__primary-action');
      expect(desktopButton.textContent).toContain(label);
      expect(fixture.nativeElement.querySelector('app-mobile-fab-action')).toBeNull();
      desktopButton.click(); expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial', tipo, 'novo']);
      viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.card-header [role=heading]').textContent.trim()).toBe(component.titulo);
      expect(fixture.nativeElement.querySelector('.card-header__primary-action')).toBeNull();
      const fabs = fixture.nativeElement.querySelectorAll('.mobile-fab-action');
      expect(fabs.length).toBe(1); expect(fabs[0].getAttribute('aria-label')).toBe(label);
      router.navigate.calls.reset(); fabs[0].click();
      expect(router.navigate).toHaveBeenCalledOnceWith(['/page/grafica/comercial', tipo, 'novo']);
    });
  }

});
