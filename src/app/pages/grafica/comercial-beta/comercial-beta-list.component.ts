import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { combineLatest, Observable, finalize } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { GraficaPagina } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type ComercialBetaTipo = 'rascunhos' | 'orcamentos' | 'pedidos';

@Component({
  selector: 'app-grafica-comercial-beta-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, PageCardComponent, DataTableComponent, DataTableCellDirective],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [mostrarDivisor]="true">
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
        [actions]="actions"
        actionsMode="buttons"
        [expandable]="true"
        expandAriaLabel="Expandir detalhes"
        [emptyState]="emptyState"
        [rowKey]="rowKey"
        (searchChange)="buscar($event)"
        (pageChange)="paginar($event)"
        (action)="onAction($event)">

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
          <span class="status-pill">{{ item.status || '-' }}</span>
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
    </app-page-card>
  `,
  styles: [`
    .status-pill { display: inline-flex; align-items: center; min-height: 24px; padding: 0 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-size: 12px; font-weight: 600; }
    .expanded-detail { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; margin: 0 18px 16px; padding: 16px 18px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; }
    .expanded-detail span, .expanded-detail strong { display: block; }
    .expanded-detail span { margin-bottom: 4px; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .expanded-detail strong { color: #0f172a; font-size: 14px; }
    @media (max-width: 640px) {
      [page-header-actions] { width: 100%; }
      .expanded-detail { grid-template-columns: 1fr; }
    }
  `],
})
export class ComercialBetaListComponent implements OnInit {
  itens: any[] = [];
  busca = '';
  pagina = 0;
  tamanho = 10;
  totalItens = 0;
  carregando = false;
  tipo: ComercialBetaTipo = 'rascunhos';
  statusFiltro: string | null = null;
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

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly graficaService: GraficaProdutoService,
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

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.queryParamMap]).subscribe(([data, params]) => {
      this.tipo = data['tipo'] || 'rascunhos';
      this.statusFiltro = params.get('status');
      this.pagina = 0;
      this.carregar();
    });
  }

  carregar(): void {
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

  private statusFiltroPedido(): string | null {
    return this.tipo === 'pedidos' ? this.statusFiltro : null;
  }

  private statusFiltroOrcamento(): string | null {
    return this.tipo === 'orcamentos' ? this.statusFiltro : null;
  }
}
