import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, finalize, Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTablePagination, DataTableFilter, DataTableFilterState } from 'src/app/components/data-table/data-table.models';
import { KanbanBoardComponent } from 'src/app/components/kanban-board/kanban-board.component';
import { KanbanCardDirective } from 'src/app/components/kanban-board/kanban-card.directive';
import { KanbanColumnState, KanbanDragEvent, KanbanDropEvent, KanbanDropState } from 'src/app/components/kanban-board/kanban-board.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { ViewModeToggleComponent, ViewModeToggleOption } from 'src/app/components/view-mode-toggle/view-mode-toggle.component';
import { MaterialModule } from 'src/app/material.module';
import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';
import {
  GraficaPagina,
  PedidoComercialDetalhe,
  PedidoComercialResumo,
  PedidoFluxoResponse,
  PedidoFluxoTransicao,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

import { COMERCIAL_LISTA, ComercialTipo } from './comercial.models';
import {
  PedidoKanbanStatus,
  PEDIDO_STATUS_METADATA,
  pedidoStatusLabel,
} from './shared/pedido-status.metadata';
import { PRIMEIRO_PEDIDO_TARGETS, PrimeiroPedidoTutorialService } from './primeiro-pedido/primeiro-pedido-tutorial.service';

type ComercialViewMode = 'lista' | 'kanban';
type PedidoKanbanColumn = KanbanColumnState<PedidoComercialResumo> & {
  status: PedidoKanbanStatus;
  page: number;
  pageSize: number;
  total: number;
};
type PedidoKanbanSnapshot = Pick<PedidoKanbanColumn, 'items' | 'count' | 'total' | 'hasMore' | 'page'>;

@Component({
  selector: 'app-grafica-comercial-list',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    PageCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    ViewModeToggleComponent,
    KanbanBoardComponent,
    KanbanCardDirective,
    TutorialTargetDirective,
  ],
  templateUrl: './comercial-list.component.html',
  styleUrl: './comercial-list.component.scss',
})
export class ComercialListComponent implements OnInit, OnDestroy {
  readonly primeiroPedidoTargets = PRIMEIRO_PEDIDO_TARGETS;
  itens: any[] = [];
  busca = '';
  pagina = 0;
  tamanho = 10;
  totalItens = 0;
  carregando = false;
  erro: string | null = null;
  acessoNegado = false;
  private request?: Subscription;
  private readonly destroy$ = new Subject<void>();
  tipo: ComercialTipo = 'rascunhos';
  statusFiltro: string | null = null;
  viewMode: ComercialViewMode = 'lista';
  kanbanExpanded = false;
  kanbanColumns: PedidoKanbanColumn[] = [];
  pedidosMovendo = new Set<number>();
  private activeDragPedidoId: number | null = null;
  private activeDragSourceStatus: string | null = null;
  private activeDragLoading = false;
  private kanbanContextKey = '';
  private tutorialPedidoLoadId: number | null = null;
  private readonly kanbanPageSize = 20;

  readonly viewModeOptions: ViewModeToggleOption<ComercialViewMode>[] = [
    { value: 'lista', label: 'Lista', icon: 'view_list', ariaLabel: 'Visualizar em lista' },
    { value: 'kanban', label: 'Kanban', icon: 'view_kanban', ariaLabel: 'Visualizar em Kanban' },
  ];
  columns: DataTableColumn<any>[] = [
    { key: 'referencia', label: 'Número', width: '160px' },
    { key: 'createdAt', label: 'Data de criação', width: '190px' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'status', label: 'Status', width: '140px' },
    { key: 'total', label: 'Total', width: '140px', align: 'end' },
  ];
  actions: DataTableAction<any>[] = [
    { id: 'abrir', label: 'Ver', icon: 'visibility', color: 'primary' },
  ];
  emptyState = {
    title: 'Nenhum registro encontrado',
    description: 'Crie um novo registro comercial para começar.',
    filteredTitle: 'Nenhum resultado encontrado',
    filteredDescription: 'Altere a busca para localizar outros registros.',
  };
  rowKey = (item: any) => item.id || item.pedidoId || item.orcamentoId || item.protocolo || item.numero;
  kanbanTrackBy = (pedido: PedidoComercialResumo) => pedido.id || pedido.pedidoId || pedido.numero;
  pedidoCardAriaLabel = (pedido: PedidoComercialResumo): string =>
    `Abrir pedido ${this.referencia(pedido)} de ${this.cliente(pedido) || 'Balcão'}`;
  isPedidoDragDisabled = (pedido: PedidoComercialResumo): boolean => {
    const status = pedido.status as PedidoKanbanStatus;
    return !this.kanbanDragEnabled
      || this.activeDragLoading
      || this.pedidosMovendo.size > 0
      || this.pedidosMovendo.has(this.pedidoId(pedido))
      || status === 'ENTREGUE'
      || status === 'CANCELADO';
  };
  kanbanDropState = (column: KanbanColumnState<PedidoComercialResumo>): KanbanDropState => {
    if (!this.activeDragPedidoId) return 'neutral';
    if (column.id === this.activeDragSourceStatus) return 'source';
    if (this.activeDragLoading) return 'loading';
    return 'neutral';
  };
  kanbanDropHint = (column: KanbanColumnState<PedidoComercialResumo>): string | null => {
    if (!this.activeDragPedidoId || column.id === this.activeDragSourceStatus) return null;
    if (this.activeDragLoading) return 'Validando etapas disponíveis...';
    return null;
  };

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly graficaService: GraficaProdutoService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly primeiroPedidoTutorial: PrimeiroPedidoTutorialService,
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  get configuracao() { return COMERCIAL_LISTA[this.tipo]; }
  get titulo(): string { return this.configuracao.titulo; }
  get subtitulo(): string { return this.configuracao.subtitulo; }
  get filters(): DataTableFilter[] {
    return [{ key: 'status', label: 'Status', type: 'select', options: this.configuracao.status.map(value => ({
      value, label: value.toLowerCase().replace(/_/g, ' ').replace(/^./, char => char.toUpperCase()),
    })) }];
  }
  get filterState(): DataTableFilterState { return { status: this.statusFiltro }; }
  filtrar(state: DataTableFilterState): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { status: state['status'] || null }, queryParamsHandling: 'merge' });
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.totalItens,
      pageSizeOptions: [10, 20, 50],
    };
  }

  get itensFiltrados(): any[] {
    return this.filtrarBusca(this.itens);
  }

  get podeAlternarKanban(): boolean {
    return this.tipo === 'pedidos';
  }

  get kanbanExpandedActive(): boolean {
    return this.kanbanExpanded && this.podeAlternarKanban && this.viewMode === 'kanban';
  }

  get kanbanDragEnabled(): boolean {
    return this.podeAlternarKanban && this.viewMode === 'kanban' && !this.statusFiltro;
  }

  get kanbanColumnsFiltradas(): KanbanColumnState<PedidoComercialResumo>[] {
    return this.kanbanColumns.map((column) => ({
      ...column,
      items: this.filtrarBusca(column.items) as PedidoComercialResumo[],
    }));
  }

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.queryParamMap]).pipe(takeUntil(this.destroy$)).subscribe(([data, params]) => {
      const tipo = data['tipo'] || 'rascunhos';
      if (tipo !== this.tipo) { this.itens = []; this.totalItens = 0; this.busca = ''; }
      this.tipo = tipo;
      this.statusFiltro = params.get('status');
      this.pagina = 0;
      if (!this.podeAlternarKanban) {
        this.viewMode = 'lista';
        this.setKanbanExpanded(false);
      }
      this.syncKanbanFocusClass();
      this.resetKanbanSeContextoMudou();
      this.carregar();
      if (this.tipo === 'pedidos') {
        const primeiroPedidoId = Number(params.get('primeiroPedidoId') || 0);
        if (primeiroPedidoId > 0) {
          this.viewMode = 'kanban';
          this.syncKanbanFocusClass();
          this.primeiroPedidoTutorial.retomarPedidoCriado(primeiroPedidoId);
        } else {
          this.primeiroPedidoTutorial.iniciarSeNecessario();
        }
      }
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.document.body.classList.remove('cm-kanban-focus-mode');
    this.destroy$.next(); this.destroy$.complete();
  }

  carregar(): void {
    this.request?.unsubscribe();
    if (this.podeAlternarKanban && this.viewMode === 'kanban') {
      this.carregarKanbanInicial();
      return;
    }

    this.carregando = true;
    this.erro = null;
    this.acessoNegado = false;
    const source: Observable<GraficaPagina<any>> = this.tipo === 'pedidos'
      ? this.graficaService.listarPedidosComerciais(this.pagina, this.tamanho, this.statusFiltroPedido())
      : this.tipo === 'orcamentos'
        ? this.graficaService.listarOrcamentosComerciais(this.pagina, this.tamanho, this.statusFiltroOrcamento())
        : this.graficaService.listarRascunhosComerciais(this.pagina, this.tamanho, this.statusFiltro);

    this.request = source.subscribe({
      next: (page: any) => {
        this.carregando = false;
        this.itens = page?.content || [];
        this.totalItens = page?.totalElements ?? this.itens.length;
      },
      error: (error) => {
        this.carregando = false;
        this.acessoNegado = error?.status === 403;
        this.erro = this.acessoNegado ? null : 'Não foi possível carregar os registros. Tente novamente.';
      },
    });
  }

  novo(): void {
    if (this.tipo === 'pedidos') {
      this.primeiroPedidoTutorial.registrarNovoPedido();
    }
    this.router.navigate(['/page/grafica/comercial', this.tipo, 'novo']);
  }

  abrir(item: any): void {
    const id = item.id || item.pedidoId || item.orcamentoId;
    if (id) this.router.navigate(['/page/grafica/comercial', this.tipo, id]);
  }

  buscar(valor: string): void {
    // The API has no text query. Search the loaded page explicitly; never claim global results.
    this.busca = valor || '';
  }

  paginar(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
    this.carregar();
  }

  onAction(event: DataTableActionEvent<any>): void {
    if (event.action === 'abrir') {
      this.abrir(event.row);
    }
  }

  alterarVisualizacao(value: ComercialViewMode): void {
    if (!this.podeAlternarKanban || !value || value === this.viewMode) {
      return;
    }

    this.viewMode = value;
    this.pagina = 0;
    if (this.viewMode !== 'kanban') {
      this.setKanbanExpanded(false);
    } else {
      this.syncKanbanFocusClass();
      this.primeiroPedidoTutorial.registrarKanbanSelecionado();
    }
    this.carregar();
  }

  toggleKanbanExpanded(): void {
    if (!this.podeAlternarKanban || this.viewMode !== 'kanban') {
      return;
    }

    this.setKanbanExpanded(!this.kanbanExpanded);
  }

  onPedidoDragStarted(event: KanbanDragEvent<PedidoComercialResumo>): void {
    const pedidoId = this.pedidoId(event.item);
    if (!pedidoId || this.isPedidoDragDisabled(event.item)) {
      return;
    }

    this.activeDragPedidoId = pedidoId;
    this.activeDragSourceStatus = event.column.id;
    this.activeDragLoading = false;
  }

  onPedidoDragEnded(event: KanbanDragEvent<PedidoComercialResumo>): void {
    setTimeout(() => {
      const pedidoId = this.pedidoId(event.item);
      if (
        this.activeDragPedidoId === pedidoId
        && !this.pedidosMovendo.has(pedidoId)
      ) {
        this.limparDragAtivo();
      }
    }, 160);
  }

  onPedidoDropped(event: KanbanDropEvent<PedidoComercialResumo>): void {
    const pedidoId = this.pedidoId(event.item);
    if (!pedidoId || event.sourceColumn.id === event.targetColumn.id) {
      return;
    }

    if (!this.kanbanDragEnabled) {
      this.toastr.info('Remova o filtro de status para mover pedidos entre etapas.');
      this.limparDragAtivo();
      return;
    }

    if (this.pedidosMovendo.size > 0) {
      return;
    }

    if (this.activeDragPedidoId !== pedidoId) {
      this.toastr.info('Valide novamente as etapas do pedido.');
      this.limparDragAtivo();
      return;
    }

    this.validarEPersistirMovimentoPedido(event);
  }

  private validarEPersistirMovimentoPedido(event: KanbanDropEvent<PedidoComercialResumo>): void {
    const pedidoId = this.pedidoId(event.item);
    const source = this.kanbanColumns.find((column) => column.id === event.sourceColumn.id);
    const target = this.kanbanColumns.find((column) => column.id === event.targetColumn.id);
    if (!pedidoId || !source || !target) {
      this.limparDragAtivo();
      return;
    }

    const originalStatus = event.item.status || event.sourceColumn.id;
    const sourceSnapshot = this.snapshotColumn(source);
    const targetSnapshot = this.snapshotColumn(target);

    this.pedidosMovendo.add(pedidoId);
    this.activeDragLoading = true;
    this.moverPedidoLocal(event.item, source, target, event.targetColumn.id as PedidoKanbanStatus);

    this.graficaService.buscarFluxoPedidoComercial(pedidoId)
      .subscribe({
        next: (fluxo) => {
          const transicao = this.transicaoNoFluxo(fluxo, event.targetColumn.id);
          if (!transicao) {
            this.restaurarMovimentoPedido(event, source, sourceSnapshot, target, targetSnapshot, originalStatus);
            this.toastr.info('Etapa indisponível para este pedido.');
            return;
          }

          if (!transicao.permitida) {
            this.restaurarMovimentoPedido(event, source, sourceSnapshot, target, targetSnapshot, originalStatus);
            this.toastr.info(transicao.motivo || 'Etapa bloqueada para este pedido.');
            return;
          }

          if (event.targetColumn.id === 'CANCELADO') {
            this.confirmarCancelamento(event.item).subscribe((confirmado) => {
              if (!confirmado) {
                this.restaurarMovimentoPedido(event, source, sourceSnapshot, target, targetSnapshot, originalStatus);
                return;
              }
              this.persistirMovimentoPedidoValidado(
                event,
                transicao.status as PedidoKanbanStatus,
                source,
                sourceSnapshot,
                target,
                targetSnapshot,
                originalStatus,
              );
            });
            return;
          }

          this.persistirMovimentoPedidoValidado(
            event,
            transicao.status as PedidoKanbanStatus,
            source,
            sourceSnapshot,
            target,
            targetSnapshot,
            originalStatus,
          );
        },
        error: (error) => {
          this.restaurarMovimentoPedido(event, source, sourceSnapshot, target, targetSnapshot, originalStatus);
          this.toastr.error(this.errorMessage(error, 'Não foi possível validar as etapas do pedido.'));
        },
      });
  }

  private persistirMovimentoPedidoValidado(
    event: KanbanDropEvent<PedidoComercialResumo>,
    targetStatus: PedidoKanbanStatus,
    source: PedidoKanbanColumn,
    sourceSnapshot: PedidoKanbanSnapshot,
    target: PedidoKanbanColumn,
    targetSnapshot: PedidoKanbanSnapshot,
    originalStatus: string,
  ): void {
    const pedidoId = this.pedidoId(event.item);
    if (!pedidoId) {
      this.restaurarMovimentoPedido(event, source, sourceSnapshot, target, targetSnapshot, originalStatus);
      return;
    }

    this.graficaService.alterarStatusPedidoComercial(pedidoId, targetStatus)
      .pipe(finalize(() => {
        this.pedidosMovendo.delete(pedidoId);
        this.limparDragAtivo();
      }))
      .subscribe({
        next: (pedido) => {
          this.aplicarStatusRetornado(pedidoId, pedido, target);
          this.toastr.success('Status atualizado.');
          this.primeiroPedidoTutorial.registrarPedidoMovido(event.item);
        },
        error: (error) => {
          this.restoreColumn(source, sourceSnapshot);
          this.restoreColumn(target, targetSnapshot);
          event.item.status = originalStatus;
          this.toastr.error(this.errorMessage(error, 'Não foi possível alterar o status do pedido.'));
        },
      });
  }

  private restaurarMovimentoPedido(
    event: KanbanDropEvent<PedidoComercialResumo>,
    source: PedidoKanbanColumn,
    sourceSnapshot: PedidoKanbanSnapshot,
    target: PedidoKanbanColumn,
    targetSnapshot: PedidoKanbanSnapshot,
    originalStatus: string,
  ): void {
    const pedidoId = this.pedidoId(event.item);
    this.restoreColumn(source, sourceSnapshot);
    this.restoreColumn(target, targetSnapshot);
    event.item.status = originalStatus;
    this.pedidosMovendo.delete(pedidoId);
    this.limparDragAtivo();
  }

  pedidoMovendo(pedido: PedidoComercialResumo): boolean {
    return this.pedidosMovendo.has(this.pedidoId(pedido));
  }

  tutorialTargetPedidoKanban(pedido: PedidoComercialResumo): string {
    return this.primeiroPedidoTutorial.targetPedidoKanban(pedido);
  }

  referencia(item: any): string {
    return item.numero || item.protocolo || `#${item.id}`;
  }

  cliente(item: any): string | null {
    return item.clienteNome || item.nomeCliente || item.nomeContato || null;
  }

  dataCriacao(item: any): string | Date | null {
    return item.createdAt || item.dataCriacao || item.criadoEm || null;
  }

  responsavel(item: any): string {
    return item.responsavelNome || item.responsavel?.nome || item.usuarioResponsavelNome || '-';
  }

  total(item: any): number {
    return Number(item.total ?? item.totalEstimado ?? 0);
  }

  statusLabel(status: string | null | undefined): string {
    return pedidoStatusLabel(status);
  }

  totalPago(item: any): number {
    return Number(item.totalPago ?? item.valorTotalPago ?? item.pago ?? 0);
  }

  restaPagar(item: any): number {
    const valor = item.restaPagar ?? item.valorRestante ?? item.restante;
    return valor === null || valor === undefined ? Math.max(this.total(item) - this.totalPago(item), 0) : Number(valor);
  }

  private filtrarBusca(itens: any[]): any[] {
    const termo = this.busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((item) => [
      this.referencia(item),
      this.cliente(item),
      item.status,
    ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
  }

  private moverPedidoLocal(
    pedido: PedidoComercialResumo,
    source: PedidoKanbanColumn,
    target: PedidoKanbanColumn,
    targetStatus: PedidoKanbanStatus,
  ): void {
    const pedidoId = this.pedidoId(pedido);
    source.items = source.items.filter((item) => this.pedidoId(item) !== pedidoId);
    source.total = Math.max((source.total ?? source.items.length + 1) - 1, 0);
    source.count = Math.max((source.count ?? source.items.length + 1) - 1, 0);
    source.hasMore = source.items.length < source.total;

    const movido = { ...pedido, status: targetStatus };
    target.items = this.ordenarPedidosPorData([
      ...target.items.filter((item) => this.pedidoId(item) !== pedidoId),
      movido,
    ]);
    target.total = (target.total ?? target.items.length - 1) + 1;
    target.count = (target.count ?? target.items.length - 1) + 1;
    target.hasMore = target.items.length < target.total;
  }

  private aplicarStatusRetornado(pedidoId: number, pedido: PedidoComercialDetalhe, target: PedidoKanbanColumn): void {
    target.items = target.items.map((item) => this.pedidoId(item) === pedidoId
      ? { ...item, ...pedido, status: pedido.status || item.status }
      : item);
  }

  private ordenarPedidosPorData(items: PedidoComercialResumo[]): PedidoComercialResumo[] {
    return [...items].sort((a, b) => {
      const dataA = new Date(this.dataCriacao(a) || 0).getTime();
      const dataB = new Date(this.dataCriacao(b) || 0).getTime();
      return dataB - dataA;
    });
  }

  private snapshotColumn(column: PedidoKanbanColumn): PedidoKanbanSnapshot {
    return {
      items: [...column.items],
      count: column.count,
      total: column.total,
      hasMore: column.hasMore,
      page: column.page,
    };
  }

  private restoreColumn(column: PedidoKanbanColumn, snapshot: PedidoKanbanSnapshot): void {
    column.items = snapshot.items;
    column.count = snapshot.count;
    column.total = snapshot.total;
    column.hasMore = snapshot.hasMore;
    column.page = snapshot.page;
  }

  private confirmarCancelamento(pedido: PedidoComercialResumo): Observable<boolean> {
    return this.dialog.open(ConfirmDialogComponent, {
      width: '480px',
      data: {
        title: 'Cancelar pedido?',
        message: `O pedido ${this.referencia(pedido)} será cancelado. Essa etapa é final.`,
        cancelText: 'Voltar',
        confirmText: 'Cancelar pedido',
        confirmColor: 'warn',
      },
    }).afterClosed();
  }

  private transicaoNoFluxo(fluxo: PedidoFluxoResponse, status: string): PedidoFluxoTransicao | undefined {
    return fluxo.proximasTransicoes?.find((transicao) => transicao.status === status);
  }

  private pedidoId(pedido: PedidoComercialResumo): number {
    return Number(pedido.id || pedido.pedidoId || 0);
  }

  private limparDragAtivo(): void {
    this.activeDragPedidoId = null;
    this.activeDragSourceStatus = null;
    this.activeDragLoading = false;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.error || error?.message || fallback;
  }

  private resetKanbanSeContextoMudou(): void {
    const contexto = this.statusFiltro || '__todos__';
    if (contexto === this.kanbanContextKey) {
      return;
    }

    this.kanbanContextKey = contexto;
    this.kanbanColumns = this.statusesKanban().map((metadata) => ({
      id: metadata.status,
      status: metadata.status,
      title: metadata.label,
      tone: metadata.tone,
      count: 0,
      total: 0,
      page: -1,
      pageSize: this.kanbanPageSize,
      items: [],
      hasMore: false,
      loading: false,
      loadingMore: false,
      error: null,
      emptyText: 'Nenhum pedido nesta etapa.',
    }));
  }

  private statusesKanban() {
    const statusFiltrado = PEDIDO_STATUS_METADATA.find((item) => item.status === this.statusFiltro);
    return statusFiltrado ? [statusFiltrado] : PEDIDO_STATUS_METADATA;
  }

  private carregarKanbanInicial(): void {
    if (!this.kanbanColumns.length) {
      this.resetKanbanSeContextoMudou();
    }

    this.kanbanColumns
      .filter((column) => column.page < 0 && !column.loading)
      .forEach((column) => this.carregarColunaKanban(column.status, true));
  }

  recarregarColunaKanban(status: string): void {
    this.carregarColunaKanban(status as PedidoKanbanStatus, true);
  }

  carregarMaisKanban(status: string): void {
    this.carregarColunaKanban(status as PedidoKanbanStatus, false);
  }

  private carregarColunaKanban(status: PedidoKanbanStatus, reset: boolean): void {
    const column = this.kanbanColumns.find((item) => item.status === status);
    if (!column || column.loading || column.loadingMore) {
      return;
    }

    const page = reset ? 0 : column.page + 1;
    column.loading = reset;
    column.loadingMore = !reset;
    column.error = null;

    this.graficaService.listarPedidosComerciais(page, column.pageSize, status)
      .pipe(finalize(() => {
        column.loading = false;
        column.loadingMore = false;
      }))
      .subscribe({
        next: (response) => {
          const content = response?.content || [];
          column.items = reset ? content : this.mergePedidos(column.items, content);
          column.page = response?.number ?? page;
          column.total = response?.totalElements ?? column.items.length;
          column.count = column.total;
          column.hasMore = column.items.length < column.total;
          this.garantirPedidoTutorialNoKanban();
        },
        error: () => {
          column.error = 'Tente novamente para atualizar esta etapa.';
          if (reset) {
            column.items = [];
            column.total = 0;
            column.count = 0;
            column.hasMore = false;
            column.page = -1;
          }
        },
      });
  }

  private garantirPedidoTutorialNoKanban(): void {
    const pedidoId = this.primeiroPedidoTutorial.pedidoAcompanhadoId;
    if (!pedidoId || this.pedidoEstaNoKanban(pedidoId) || this.tutorialPedidoLoadId === pedidoId) {
      return;
    }

    this.tutorialPedidoLoadId = pedidoId;
    this.graficaService.buscarPedidoComercial(pedidoId)
      .pipe(finalize(() => {
        if (this.tutorialPedidoLoadId === pedidoId) {
          this.tutorialPedidoLoadId = null;
        }
      }))
      .subscribe({
        next: (pedido) => this.inserirPedidoTutorialNoKanban(pedido),
        error: () => undefined,
      });
  }

  private pedidoEstaNoKanban(pedidoId: number): boolean {
    return this.kanbanColumns.some((column) =>
      column.items.some((pedido) => this.pedidoId(pedido) === pedidoId)
    );
  }

  private inserirPedidoTutorialNoKanban(pedido: PedidoComercialDetalhe): void {
    const pedidoId = this.pedidoId(pedido);
    const status = pedido.status as PedidoKanbanStatus;
    const column = this.kanbanColumns.find((item) => item.status === status);
    if (!pedidoId || !column || this.pedidoEstaNoKanban(pedidoId)) {
      return;
    }

    column.items = this.ordenarPedidosPorData([...column.items, pedido]);
    column.total = Math.max(column.total ?? 0, column.items.length);
    column.count = Math.max(column.count ?? 0, column.items.length);
    column.hasMore = column.items.length < column.total;
  }

  private mergePedidos(atual: PedidoComercialResumo[], novos: PedidoComercialResumo[]): PedidoComercialResumo[] {
    const ids = new Set(atual.map((pedido) => this.kanbanTrackBy(pedido)));
    return [
      ...atual,
      ...novos.filter((pedido) => {
        const id = this.kanbanTrackBy(pedido);
        if (ids.has(id)) {
          return false;
        }
        ids.add(id);
        return true;
      }),
    ];
  }

  private statusFiltroPedido(): string | null {
    return this.tipo === 'pedidos' ? this.statusFiltro : null;
  }

  private statusFiltroOrcamento(): string | null {
    return this.tipo === 'orcamentos' ? this.statusFiltro : null;
  }

  private setKanbanExpanded(expanded: boolean): void {
    this.kanbanExpanded = expanded;
    this.syncKanbanFocusClass();
  }

  private syncKanbanFocusClass(): void {
    this.document.body.classList.toggle('cm-kanban-focus-mode', this.kanbanExpandedActive);
  }
}
