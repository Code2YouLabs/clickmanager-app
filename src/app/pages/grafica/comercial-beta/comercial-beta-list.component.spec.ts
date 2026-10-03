import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ComercialBetaListComponent } from './comercial-beta-list.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaPagina, PedidoComercialDetalhe, PedidoComercialResumo, PedidoFluxoResponse } from '../shared/grafica.models';
import { KanbanDragEvent, KanbanDropEvent } from 'src/app/components/kanban-board/kanban-board.models';

describe('ComercialBetaListComponent', () => {
  let fixture: ComponentFixture<ComercialBetaListComponent>;
  let component: ComercialBetaListComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let router: jasmine.SpyObj<Router>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let routeData$: Subject<Record<string, unknown>>;
  let queryParamMap$: Subject<ReturnType<typeof convertToParamMap>>;

  beforeEach(() => {
    registerLocaleData(localePt);
    service = jasmine.createSpyObj<GraficaProdutoService>('GraficaProdutoService', [
      'listarPedidosComerciais',
      'listarOrcamentosComerciais',
      'listarRascunhosComerciais',
      'buscarFluxoPedidoComercial',
      'alterarStatusPedidoComercial',
    ]);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'info']);
    routeData$ = new Subject<Record<string, unknown>>();
    queryParamMap$ = new Subject<ReturnType<typeof convertToParamMap>>();

    service.listarPedidosComerciais.and.callFake((page: number, size: number, status?: string | null) =>
      of(pageResponse([pedido(status || 'PENDENTE', page)], page, size, status === 'PENDENTE' ? 2 : 1)));
    service.listarOrcamentosComerciais.and.returnValue(of(pageResponse([])));
    service.listarRascunhosComerciais.and.returnValue(of(pageResponse([])));
    service.buscarFluxoPedidoComercial.and.callFake(() => of(fluxo('PENDENTE', ['EM_PRODUCAO', 'CANCELADO'])));
    service.alterarStatusPedidoComercial.and.callFake((_id: number, status: string) =>
      of({ ...pedido(status), status } as PedidoComercialDetalhe));
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);

    TestBed.configureTestingModule({
      imports: [ComercialBetaListComponent, NoopAnimationsModule],
      providers: [
        { provide: GraficaProdutoService, useValue: service },
        { provide: Router, useValue: router },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
        {
          provide: ActivatedRoute,
          useValue: {
            data: routeData$.asObservable(),
            queryParamMap: queryParamMap$.asObservable(),
          },
        },
      ],
    });

    fixture = TestBed.createComponent(ComercialBetaListComponent);
    component = fixture.componentInstance;
    (component as unknown as { dialog: MatDialog }).dialog = dialog;
    (component as unknown as { toastr: ToastrService }).toastr = toastr;
    fixture.detectChanges();
  });

  afterEach(() => {
    document.body.classList.remove('cm-kanban-focus-mode');
    TestBed.resetTestingModule();
  });

  it('usa Lista como padrão e preserva status query param', () => {
    emitRoute('pedidos', 'PRONTO');

    expect(component.viewMode).toBe('lista');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 10, 'PRONTO');
    expect(fixture.nativeElement.querySelector('app-kanban-board')).toBeFalsy();
  });

  it('mostra Kanban somente para pedidos', () => {
    emitRoute('orcamentos');
    fixture.detectChanges();

    expect(component.podeAlternarKanban).toBeFalse();
    expect(fixture.nativeElement.querySelector('app-view-mode-toggle')).toBeFalsy();

    emitRoute('pedidos');
    fixture.detectChanges();

    expect(component.podeAlternarKanban).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-view-mode-toggle')).toBeTruthy();
  });

  it('alterna Lista para Kanban carregando uma coluna por status real', () => {
    emitRoute('pedidos');

    component.alterarVisualizacao('kanban');

    expect(component.viewMode).toBe('kanban');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 20, 'AGUARDANDO_PAGAMENTO');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 20, 'PENDENTE');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 20, 'EM_PRODUCAO');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 20, 'PRONTO');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 20, 'ENTREGUE');
    expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0, 20, 'CANCELADO');
  });

  it('ativa modo ampliado apenas no Kanban e limpa ao voltar para Lista', () => {
    emitRoute('pedidos');
    component.alterarVisualizacao('kanban');

    component.toggleKanbanExpanded();

    expect(component.kanbanExpanded).toBeTrue();
    expect(document.body.classList.contains('cm-kanban-focus-mode')).toBeTrue();

    component.alterarVisualizacao('lista');

    expect(component.kanbanExpanded).toBeFalse();
    expect(document.body.classList.contains('cm-kanban-focus-mode')).toBeFalse();
  });

  it('no Kanban com status query param carrega somente a coluna filtrada', () => {
    emitRoute('pedidos', 'PRONTO');

    component.alterarVisualizacao('kanban');

    const kanbanCalls = service.listarPedidosComerciais.calls.allArgs()
      .filter(([, size]) => size === 20);
    expect(kanbanCalls).toEqual([[0, 20, 'PRONTO']]);
    expect(component.kanbanColumns.map((column) => column.id)).toEqual(['PRONTO']);
  });

  it('preserva busca ao alternar e filtra apenas cards carregados no Kanban', () => {
    emitRoute('pedidos');
    component.buscar('cliente pendente');

    component.alterarVisualizacao('kanban');

    expect(component.busca).toBe('cliente pendente');
    const pendente = component.kanbanColumnsFiltradas.find((column) => column.id === 'PENDENTE');
    expect(pendente?.items.length).toBe(1);

    component.buscar('sem resultado');
    expect(component.busca).toBe('sem resultado');
    expect(pendente?.items.length).toBe(1);
    expect(component.kanbanColumnsFiltradas.find((column) => column.id === 'PENDENTE')?.items.length).toBe(0);
  });

  it('carrega mais por coluna com append sem duplicar ids', () => {
    emitRoute('pedidos');
    service.listarPedidosComerciais.and.callFake((page: number, size: number, status?: string | null) => {
      const item = page === 0
        ? { ...pedido(status || 'PENDENTE', 0), pedidoId: 10 }
        : { ...pedido(status || 'PENDENTE', 1), pedidoId: 10 };
      return of(pageResponse([item], page, size, 2));
    });

    component.alterarVisualizacao('kanban');
    component.carregarMaisKanban('PENDENTE');

    const pendente = component.kanbanColumns.find((column) => column.id === 'PENDENTE');
    expect(pendente?.items.length).toBe(1);
    expect(pendente?.count).toBe(2);
  });

  it('mantém erro independente por coluna e permite retry', () => {
    emitRoute('pedidos', 'PRONTO');
    service.listarPedidosComerciais.and.returnValue(throwError(() => new Error('falha')));

    component.alterarVisualizacao('kanban');

    expect(component.kanbanColumns[0].error).toBeTruthy();
    service.listarPedidosComerciais.and.returnValue(of(pageResponse([pedido('PRONTO')], 0, 20, 1)));

    component.recarregarColunaKanban('PRONTO');

    expect(component.kanbanColumns[0].items.length).toBe(1);
    expect(component.kanbanColumns[0].error).toBeNull();
  });

  it('card abre pedido pela mesma rota da Lista e não altera status', () => {
    const item = pedido('PRONTO');

    component.abrir(item);

    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial-beta', component.tipo, item.pedidoId]);
    expect(service.listarPedidosComerciais).not.toHaveBeenCalledWith(jasmine.any(Number), jasmine.any(Number), 'PATCH');
  });

  it('consulta fluxo sob demanda e permite transições reais entre etapas', () => {
    const cenarios: Array<[string, string]> = [
      ['AGUARDANDO_PAGAMENTO', 'PENDENTE'],
      ['PENDENTE', 'EM_PRODUCAO'],
      ['EM_PRODUCAO', 'PRONTO'],
      ['PRONTO', 'ENTREGUE'],
    ];

    for (const [origem, destino] of cenarios) {
      service.buscarFluxoPedidoComercial.calls.reset();
      service.alterarStatusPedidoComercial.calls.reset();
      montarKanban();
      const source = coluna(origem);
      const target = coluna(destino);
      const item = source.items[0];
      service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo(origem, [destino])));

      component.onPedidoDragStarted(dragEvent(item, source));
      component.onPedidoDropped(dropEvent(item, source, target));

      expect(service.buscarFluxoPedidoComercial).toHaveBeenCalledWith(item.pedidoId!);
      expect(service.alterarStatusPedidoComercial).toHaveBeenCalledWith(item.pedidoId!, destino);
    }
  });

  it('bloqueia transição não permitida com motivo do fluxo e não chama PATCH', () => {
    montarKanban();
    const source = coluna('PRONTO');
    const target = coluna('ENTREGUE');
    const item = source.items[0];
    const motivo = 'O pedido não pode ser marcado como entregue enquanto houver saldo em aberto...';
    service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo('PRONTO', ['ENTREGUE'], { ENTREGUE: motivo })));

    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
    expect(source.items).toContain(item);
    expect(toastr.info).toHaveBeenCalledWith(motivo);
  });

  it('bloqueia transição inexistente sem PATCH', () => {
    montarKanban();
    const source = coluna('AGUARDANDO_PAGAMENTO');
    const target = coluna('PRONTO');
    const item = source.items[0];
    service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo('AGUARDANDO_PAGAMENTO', ['PENDENTE'])));

    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
    expect(source.items).toContain(item);
  });

  it('confirma cancelamento antes de chamar PATCH', () => {
    montarKanban();
    const source = coluna('PENDENTE');
    const target = coluna('CANCELADO');
    const item = source.items[0];
    service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo('PENDENTE', ['CANCELADO'])));
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as any);

    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(dialog.open).toHaveBeenCalled();
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();

    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(service.alterarStatusPedidoComercial).toHaveBeenCalledWith(item.pedidoId!, 'CANCELADO');
  });

  it('faz optimistic update e mantém no sucesso sem recarregar Kanban inteiro', () => {
    montarKanban();
    const source = coluna('PENDENTE');
    const target = coluna('EM_PRODUCAO');
    const item = source.items[0];
    const patch$ = new Subject<PedidoComercialDetalhe>();
    service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo('PENDENTE', ['EM_PRODUCAO'])));
    service.alterarStatusPedidoComercial.and.returnValue(patch$);
    const sourceTotal = source.total;
    const targetTotal = target.total;

    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(source.items.some((pedido) => pedido.pedidoId === item.pedidoId)).toBeFalse();
    expect(target.items.some((pedido) => pedido.pedidoId === item.pedidoId)).toBeTrue();
    expect(source.total).toBe(sourceTotal - 1);
    expect(target.total).toBe(targetTotal + 1);
    expect(component.pedidoMovendo(item)).toBeTrue();

    patch$.next({ ...item, status: 'EM_PRODUCAO', itens: [] });
    patch$.complete();

    expect(component.pedidoMovendo(item)).toBeFalse();
    expect(service.listarPedidosComerciais.calls.allArgs().filter(([, size]) => size === 20).length).toBe(6);
  });

  it('restaura card, status e contadores quando PATCH falha', () => {
    montarKanban();
    const source = coluna('PENDENTE');
    const target = coluna('EM_PRODUCAO');
    const item = source.items[0];
    const sourceItems = [...source.items];
    const targetItems = [...target.items];
    const sourceTotal = source.total;
    const targetTotal = target.total;
    service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo('PENDENTE', ['EM_PRODUCAO'])));
    service.alterarStatusPedidoComercial.and.returnValue(throwError(() => ({ error: { message: 'Transição inválida.' } })));

    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(source.items).toEqual(sourceItems);
    expect(target.items).toEqual(targetItems);
    expect(source.total).toBe(sourceTotal);
    expect(target.total).toBe(targetTotal);
    expect(item.status).toBe('PENDENTE');
    expect(component.pedidoMovendo(item)).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Transição inválida.');
  });

  it('bloqueia novos drags enquanto um pedido está persistindo', () => {
    montarKanban();
    const source = coluna('PENDENTE');
    const target = coluna('EM_PRODUCAO');
    const item = source.items[0];
    const outro = { ...pedido('PENDENTE', 99), pedidoId: 999 };
    source.items.push(outro);
    const patch$ = new Subject<PedidoComercialDetalhe>();
    service.buscarFluxoPedidoComercial.and.returnValue(of(fluxo('PENDENTE', ['EM_PRODUCAO'])));
    service.alterarStatusPedidoComercial.and.returnValue(patch$);

    component.onPedidoDragStarted(dragEvent(item, source));
    component.onPedidoDropped(dropEvent(item, source, target));

    expect(component.isPedidoDragDisabled(item)).toBeTrue();
    expect(component.isPedidoDragDisabled(outro)).toBeTrue();

    component.onPedidoDropped(dropEvent(item, source, target));

    expect(service.alterarStatusPedidoComercial).toHaveBeenCalledTimes(1);
    patch$.next({ ...item, status: 'EM_PRODUCAO', itens: [] });
    patch$.complete();
  });

  it('não persiste reordenação na mesma coluna nem consulta fluxo', () => {
    montarKanban();
    service.buscarFluxoPedidoComercial.calls.reset();
    const source = coluna('PENDENTE');
    const item = source.items[0];

    component.onPedidoDropped(dropEvent(item, source, source));

    expect(service.buscarFluxoPedidoComercial).not.toHaveBeenCalled();
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
  });

  it('marca status finais e filtro de status como não arrastáveis', () => {
    montarKanban();

    expect(component.isPedidoDragDisabled(coluna('ENTREGUE').items[0])).toBeTrue();
    expect(component.isPedidoDragDisabled(coluna('CANCELADO').items[0])).toBeTrue();

    emitRoute('pedidos', 'PRONTO');
    component.alterarVisualizacao('kanban');

    expect(component.kanbanDragEnabled).toBeFalse();
    expect(component.isPedidoDragDisabled(component.kanbanColumns[0].items[0])).toBeTrue();
  });

  it('não consulta fluxo ao começar a arrastar e valida apenas no drop', () => {
    montarKanban();
    const source = coluna('PENDENTE');
    const target = coluna('EM_PRODUCAO');
    const item = source.items[0];
    const fluxo$ = new Subject<PedidoFluxoResponse>();
    service.buscarFluxoPedidoComercial.and.returnValue(fluxo$);

    component.onPedidoDragStarted(dragEvent(item, source));

    expect(service.buscarFluxoPedidoComercial).not.toHaveBeenCalled();

    component.onPedidoDropped(dropEvent(item, source, target));

    expect(service.buscarFluxoPedidoComercial).toHaveBeenCalledWith(item.pedidoId!);
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
    expect(source.items.some((pedido) => pedido.pedidoId === item.pedidoId)).toBeFalse();
    expect(target.items.some((pedido) => pedido.pedidoId === item.pedidoId)).toBeTrue();

    fluxo$.next(fluxo('PENDENTE', ['EM_PRODUCAO']));
    fluxo$.complete();

    expect(service.alterarStatusPedidoComercial).toHaveBeenCalledWith(item.pedidoId!, 'EM_PRODUCAO');
  });

  it('não inicia segundo movimento enquanto o primeiro ainda está validando', () => {
    montarKanban();
    const source = coluna('PENDENTE');
    const target = coluna('EM_PRODUCAO');
    const itemA = source.items[0];
    const itemB = { ...pedido('PENDENTE', 5), pedidoId: 505 };
    source.items.push(itemB);
    const fluxoA$ = new Subject<PedidoFluxoResponse>();
    service.buscarFluxoPedidoComercial.and.returnValue(fluxoA$);

    component.onPedidoDragStarted(dragEvent(itemA, source));
    component.onPedidoDropped(dropEvent(itemA, source, target));
    component.onPedidoDragStarted(dragEvent(itemB, source));
    component.onPedidoDropped(dropEvent(itemB, source, target));

    expect(service.buscarFluxoPedidoComercial).toHaveBeenCalledTimes(1);
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalledWith(itemB.pedidoId!, 'EM_PRODUCAO');

    fluxoA$.next(fluxo('PENDENTE', ['CANCELADO']));
    fluxoA$.complete();
  });

  function emitRoute(tipo: 'rascunhos' | 'orcamentos' | 'pedidos', status?: string): void {
    routeData$.next({ tipo });
    queryParamMap$.next(convertToParamMap(status ? { status } : {}));
    fixture.detectChanges();
  }

  function montarKanban(): void {
    emitRoute('pedidos');
    component.alterarVisualizacao('kanban');
  }

  function coluna(status: string) {
    const column = component.kanbanColumns.find((item) => item.id === status);
    if (!column) throw new Error(`Coluna ${status} não encontrada`);
    return column;
  }

  function dragEvent(item: PedidoComercialResumo, column: ReturnType<typeof coluna>): KanbanDragEvent<PedidoComercialResumo> {
    return { item, column, index: 0 };
  }

  function dropEvent(
    item: PedidoComercialResumo,
    sourceColumn: ReturnType<typeof coluna>,
    targetColumn: ReturnType<typeof coluna>,
  ): KanbanDropEvent<PedidoComercialResumo> {
    return { item, sourceColumn, targetColumn, previousIndex: 0, currentIndex: 0 };
  }

  function pedido(status = 'PENDENTE', index = 0): PedidoComercialResumo {
    return {
      pedidoId: 10 + index,
      numero: `PED-2026-000${index + 1}`,
      status,
      clienteNome: status === 'PENDENTE' ? 'Cliente pendente' : null,
      total: 350,
      createdAt: '2026-10-01T14:30:00',
    };
  }

  function pageResponse<T>(content: T[], page = 0, size = 10, total = content.length): GraficaPagina<T> {
    return {
      content,
      number: page,
      size,
      totalElements: total,
      totalPages: Math.max(Math.ceil(total / size), 1),
    };
  }

  function fluxo(statusAtual: string, proximas: string[], bloqueadas: Record<string, string> = {}): PedidoFluxoResponse {
    return {
      statusAtual,
      label: statusAtual,
      descricao: statusAtual,
      finalStatus: statusAtual === 'ENTREGUE' || statusAtual === 'CANCELADO',
      permissoes: {
        editarCliente: true,
        editarItens: true,
        observacoes: true,
        pagamentos: true,
        alterarStatus: true,
      },
      proximasTransicoes: proximas.map((status) => ({
        status,
        label: status,
        permitida: !bloqueadas[status],
        motivo: bloqueadas[status] || null,
      })),
      fluxo: [],
    };
  }
});
