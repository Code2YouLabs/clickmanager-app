import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { MatDialog } from '@angular/material/dialog';
import { combineLatest, Observable, finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import { KanbanBoardComponent } from 'src/app/components/kanban-board/kanban-board.component';
import { KanbanCardDirective } from 'src/app/components/kanban-board/kanban-card.directive';
import { KanbanColumnState, KanbanDragEvent, KanbanDropEvent, KanbanDropState } from 'src/app/components/kanban-board/kanban-board.models';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { ViewModeToggleComponent, ViewModeToggleOption } from 'src/app/components/view-mode-toggle/view-mode-toggle.component';
import { MaterialModule } from 'src/app/material.module';
import {
  GraficaPagina,
  PedidoComercialDetalhe,
  PedidoComercialResumo,
  PedidoFluxoResponse,
  PedidoFluxoTransicao,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';
import {
  PedidoKanbanStatus,
  PEDIDO_STATUS_METADATA,
  pedidoStatusLabel,
} from './shared/pedido-status.metadata';

type ComercialBetaTipo = 'rascunhos' | 'orcamentos' | 'pedidos';
type ComercialBetaViewMode = 'lista' | 'kanban';
type PedidoKanbanColumn = KanbanColumnState<PedidoComercialResumo> & {
  status: PedidoKanbanStatus;
  page: number;
  pageSize: number;
  total: number;
};
type PedidoKanbanSnapshot = Pick<PedidoKanbanColumn, 'items' | 'count' | 'total' | 'hasMore' | 'page'>;

@Component({
  selector: 'app-grafica-comercial-beta-list',
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
  ],
  template: `
    <app-page-card
      [titulo]="titulo"
      [subtitulo]="subtitulo"
      [mostrarDivisor]="true"
      [class.comercial-kanban-expanded]="kanbanExpandedActive">
      <button page-header-actions mat-flat-button color="primary" type="button" (click)="novo()">
        <mat-icon>add</mat-icon>
        Novo
      </button>

      <app-data-table
        [columns]="columns"
        [data]="itensFiltrados"
        [search]="{ enabled: true, placeholder: 'Buscar por referência ou cliente', debounceMs: 250, value: busca }"
        [pagination]="pagination"
        [loading]="carregando"
        [showTable]="viewMode === 'lista'"
        [actions]="actions"
        actionsMode="buttons"
        [expandable]="true"
        expandAriaLabel="Expandir detalhes"
        [emptyState]="emptyState"
        [rowKey]="rowKey"
        (searchChange)="buscar($event)"
        (pageChange)="paginar($event)"
        (action)="onAction($event)">

        <div data-table-toolbar-actions class="view-mode-actions" *ngIf="podeAlternarKanban">
          <app-view-mode-toggle
            [value]="viewMode"
            [options]="viewModeOptions"
            ariaLabel="Visualização dos pedidos"
            (valueChange)="alterarVisualizacao($event)">
          </app-view-mode-toggle>
          <button
            *ngIf="viewMode === 'kanban'"
            mat-stroked-button
            type="button"
            class="kanban-expand-button"
            [attr.aria-pressed]="kanbanExpanded"
            (click)="toggleKanbanExpanded()">
            <mat-icon>{{ kanbanExpanded ? 'close_fullscreen' : 'open_in_full' }}</mat-icon>
            {{ kanbanExpanded ? 'Reduzir' : 'Ampliar' }}
          </button>
        </div>

        <ng-template appDataTableCell="referencia" let-item>
          <strong>{{ referencia(item) }}</strong>
        </ng-template>

        <ng-template appDataTableCell="createdAt" let-item>
          {{ dataCriacao(item) | date:'dd/MM/yyyy HH:mm' }}
        </ng-template>

        <ng-template appDataTableCell="cliente" let-item>
          {{ cliente(item) || 'Balcão' }}
        </ng-template>

        <ng-template appDataTableCell="status" let-item>
          <span class="status-pill">{{ statusLabel(item.status) }}</span>
        </ng-template>

        <ng-template appDataTableCell="total" let-item>
          {{ total(item) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}
        </ng-template>

        <ng-template appDataTableCell="__expandedDetail" let-item>
          <div class="expanded-detail">
            <div>
              <span>Responsável</span>
              <strong>{{ responsavel(item) }}</strong>
            </div>
            <div>
              <span>Total Pago</span>
              <strong>{{ totalPago(item) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
            </div>
            <div>
              <span>Resta Pagar</span>
              <strong>{{ restaPagar(item) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
            </div>
          </div>
        </ng-template>
      </app-data-table>

      <app-kanban-board
        *ngIf="podeAlternarKanban && viewMode === 'kanban'"
        class="pedidos-kanban"
        boardLabel="Kanban de pedidos"
        emptyTitle="Nenhum pedido encontrado"
        emptyDescription="Crie um novo pedido para começar."
        [columns]="kanbanColumnsFiltradas"
        [trackBy]="kanbanTrackBy"
        [cardAriaLabel]="pedidoCardAriaLabel"
        [dragEnabled]="kanbanDragEnabled"
        [isDragDisabled]="isPedidoDragDisabled"
        [dropState]="kanbanDropState"
        [dropHint]="kanbanDropHint"
        (cardClick)="abrir($event)"
        (dragStarted)="onPedidoDragStarted($event)"
        (dragEnded)="onPedidoDragEnded($event)"
        (cardDropped)="onPedidoDropped($event)"
        (retryColumn)="recarregarColunaKanban($event)"
        (loadMore)="carregarMaisKanban($event)">
        <ng-template appKanbanCard let-pedido>
          <div class="pedido-kanban-card" [class.pedido-kanban-card--pending]="pedidoMovendo(pedido)">
            <strong>{{ referencia(pedido) }}</strong>
            <span>{{ cliente(pedido) || 'Balcão' }}</span>
            <time [attr.datetime]="dataCriacao(pedido) || null">
              {{ dataCriacao(pedido) | date:'dd/MM/yyyy HH:mm' }}
            </time>
            <em>{{ total(pedido) | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</em>
            <span class="pedido-kanban-card__pending" *ngIf="pedidoMovendo(pedido)">
              <mat-spinner diameter="16"></mat-spinner>
              Atualizando...
            </span>
          </div>
        </ng-template>
      </app-kanban-board>
    </app-page-card>
  `,
  styles: [`
    .view-mode-actions { display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .kanban-expand-button { min-height: 38px; border-radius: 999px; white-space: nowrap; }
    .status-pill { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 12px; font-weight: 600; }
    .expanded-detail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 0 18px 16px; padding: 16px 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
    .expanded-detail span, .expanded-detail strong { display: block; }
    .expanded-detail span { margin-bottom: 4px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .expanded-detail strong { color: #0f172a; font-size: 14px; }
    .pedidos-kanban { display: block; margin-top: 16px; }
    :host-context(.cm-kanban-focus-mode) ::ng-deep app-page-card.comercial-kanban-expanded .page-card {
      border-radius: 12px;
      box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08);
    }
    :host-context(.cm-kanban-focus-mode) ::ng-deep app-page-card.comercial-kanban-expanded mat-card-content {
      padding: 10px 10px 12px;
    }
    :host-context(.cm-kanban-focus-mode) .pedidos-kanban { margin-top: 10px; }
    :host-context(.cm-kanban-focus-mode) ::ng-deep .kanban-board__scroll {
      grid-auto-columns: minmax(320px, 360px);
      min-height: calc(100dvh - 184px);
      padding-bottom: 10px;
    }
    :host-context(.cm-kanban-focus-mode) ::ng-deep .kanban-column {
      min-height: calc(100dvh - 202px);
    }
    .pedido-kanban-card { position: relative; display: grid; gap: 8px; min-height: 104px; padding: 12px; }
    .pedido-kanban-card--pending { pointer-events: none; }
    .pedido-kanban-card--pending::after { content: ''; position: absolute; inset: 0; border-radius: 8px; background: rgba(255, 255, 255, 0.72); }
    .pedido-kanban-card__pending { position: absolute; inset: 0; z-index: 1; display: inline-flex; align-items: center; justify-content: center; gap: 8px; color: #334155; font-size: 12px; font-weight: 700; }
    .pedido-kanban-card strong { color: #0f172a; font-size: 14px; line-height: 1.25; }
    .pedido-kanban-card span { overflow: hidden; color: #334155; font-size: 13px; line-height: 1.3; text-overflow: ellipsis; white-space: nowrap; }
    .pedido-kanban-card time { color: #64748b; font-size: 12px; font-style: normal; }
    .pedido-kanban-card em { color: #0f172a; font-size: 14px; font-style: normal; font-weight: 700; }
    @media (max-width: 640px) {
      [page-header-actions] { width: 100%; }
      .view-mode-actions { width: 100%; }
      .kanban-expand-button { width: 100%; }
      .expanded-detail { grid-template-columns: 1fr; }
      :host-context(.cm-kanban-focus-mode) ::ng-deep .kanban-board__scroll {
        grid-auto-columns: minmax(286px, 90vw);
        min-height: calc(100dvh - 164px);
      }
      :host-context(.cm-kanban-focus-mode) ::ng-deep .kanban-column {
        min-height: calc(100dvh - 184px);
      }
    }
  `],
})
export class ComercialBetaListComponent implements OnInit, OnDestroy {
  itens: any[] = [];
  busca = '';
  pagina = 0;
  tamanho = 10;
  totalItens = 0;
  carregando = false;
  tipo: ComercialBetaTipo = 'rascunhos';
  statusFiltro: string | null = null;
  viewMode: ComercialBetaViewMode = 'lista';
  kanbanExpanded = false;
  kanbanColumns: PedidoKanbanColumn[] = [];
  pedidosMovendo = new Set<number>();
  private activeDragPedidoId: number | null = null;
  private activeDragSourceStatus: string | null = null;
  private activeDragLoading = false;
  private kanbanContextKey = '';
  private readonly kanbanPageSize = 20;

  readonly viewModeOptions: ViewModeToggleOption<ComercialBetaViewMode>[] = [
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
    @Inject(DOCUMENT) private readonly document: Document,
  ) {}

  get titulo(): string {
    return this.tipo === 'pedidos' ? 'Pedidos' : this.tipo === 'orcamentos' ? 'Orçamentos' : 'Rascunhos';
  }

  get subtitulo(): string {
    return this.tipo === 'pedidos'
      ? 'Pedidos criados pelo fluxo comercial da gráfica.'
      : this.tipo === 'orcamentos'
        ? 'Orçamentos criados pelo fluxo comercial da gráfica.'
        : 'Atendimentos em composição antes da confirmação.';
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
    return this.itens;
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
    combineLatest([this.route.data, this.route.queryParamMap]).subscribe(([data, params]) => {
      this.tipo = data['tipo'] || 'rascunhos';
      this.statusFiltro = params.get('status');
      this.pagina = 0;
      if (!this.podeAlternarKanban) {
        this.viewMode = 'lista';
        this.setKanbanExpanded(false);
      }
      this.syncKanbanFocusClass();
      this.resetKanbanSeContextoMudou();
      this.carregar();
    });
  }

  ngOnDestroy(): void {
    this.document.body.classList.remove('cm-kanban-focus-mode');
  }

  carregar(): void {
    if (this.podeAlternarKanban && this.viewMode === 'kanban') {
      this.carregarKanbanInicial();
      return;
    }

    this.carregando = true;
    const source: Observable<GraficaPagina<any>> = this.tipo === 'pedidos'
      ? this.graficaService.listarPedidosComerciais(this.pagina, this.tamanho, this.statusFiltroPedido())
      : this.tipo === 'orcamentos'
        ? this.graficaService.listarOrcamentosComerciais(this.pagina, this.tamanho, this.statusFiltroOrcamento())
        : this.graficaService.listarRascunhosComerciais(this.pagina, this.tamanho);

    source.pipe(finalize(() => this.carregando = false)).subscribe({
      next: (page: any) => {
        this.itens = this.filtrarBusca(page?.content || []);
        this.totalItens = page?.totalElements ?? this.itens.length;
      },
      error: () => {
        this.itens = [];
        this.totalItens = 0;
      },
    });
  }

  novo(): void {
    this.router.navigate(['/page/grafica/comercial-beta', this.tipo, 'novo']);
  }

  abrir(item: any): void {
    const id = item.id || item.pedidoId || item.orcamentoId;
    if (id) this.router.navigate(['/page/grafica/comercial-beta', this.tipo, id]);
  }

  buscar(valor: string): void {
    this.busca = valor || '';
    this.pagina = 0;
    if (this.podeAlternarKanban && this.viewMode === 'kanban') {
      return;
    }
    this.carregar();
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

  alterarVisualizacao(value: ComercialBetaViewMode): void {
    if (!this.podeAlternarKanban || !value || value === this.viewMode) {
      return;
    }

    this.viewMode = value;
    this.pagina = 0;
    if (this.viewMode !== 'kanban') {
      this.setKanbanExpanded(false);
    } else {
      this.syncKanbanFocusClass();
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
