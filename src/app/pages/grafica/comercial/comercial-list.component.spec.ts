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
  let pedidoAcompanhadoId: number | null;
  const page = { content: [{ id: 1, numero: 'PED-1', clienteNome: 'Maria', status: 'PENDENTE', total: 15 }], totalElements: 21 };
  beforeEach(() => {
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
});
