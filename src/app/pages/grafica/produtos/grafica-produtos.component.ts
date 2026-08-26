import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { forkJoin } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import {
  DataTableAction,
  DataTableActionEvent,
  DataTableColumn,
  DataTableFilter,
  DataTableFilterState,
  DataTablePagination,
} from 'src/app/components/data-table/data-table.models';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { CatalogoStatusChipComponent } from '../../catalogo/shared/components/catalogo-status-chip.component';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro, GraficaFormato, GraficaProduto, GraficaProdutoListParams } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type GraficaProdutosFilters = {
  ativo?: boolean | null;
  materialId?: number | null;
  formatoId?: number | null;
  corId?: number | null;
  acabamentoIds?: number[];
  servicoIds?: number[];
};

@Component({
  selector: 'app-grafica-produtos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    CatalogoStatusChipComponent,
    DataTableComponent,
    DataTableCellDirective,
  ],
  template: `
    <app-page-card titulo="Produtos gráficos" subtitulo="Configuração de venda para produtos do Catálogo">
      <div page-header-actions>
        <button mat-icon-button type="button" matTooltip="Ajuda" aria-label="Ajuda" (click)="abrirAjuda()">
          <mat-icon>help_outline</mat-icon>
        </button>
        <button mat-flat-button color="primary" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo produto
        </button>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="produtos"
        [filters]="tableFilters"
        [filterState]="filterState"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="carregando"
        [actions]="actions"
        [sort]="sort"
        [emptyState]="{
          title: 'Nenhum produto gráfico encontrado',
          description: 'Cadastre um produto gráfico para configurar vendas.',
          filteredTitle: 'Nenhum produto gráfico encontrado',
          filteredDescription: 'Altere a busca ou limpe os filtros.'
        }"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (filterChange)="onFilterChange($event)"
        (clearFilters)="onClearFilters()"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)"
        (action)="onAction($event)">

        <ng-template appDataTableCell="produto" let-row>
          <strong>{{ row.catalogoProdutoNome || '-' }}</strong>
          <small>{{ row.catalogoProdutoCodigo || '-' }}</small>
        </ng-template>

        <ng-template appDataTableCell="configuracao" let-row>
          {{ resumo(row) }}
        </ng-template>

        <ng-template appDataTableCell="parametros" let-row>
          <span class="bg-light-primary text-primary rounded f-w-600 p-6 p-y-4 f-s-12">
            {{ (row.acabamentos?.length || 0) + (row.servicos?.length || 0) }}
          </span>
        </ng-template>

        <ng-template appDataTableCell="status" let-row>
          <app-catalogo-status-chip [ativo]="row.ativo"></app-catalogo-status-chip>
        </ng-template>
      </app-data-table>
    </app-page-card>
  `,
  styles: [`
    small {
      display: block;
      color: #6b7280;
      margin-top: 2px;
    }
  `],
})
export class GraficaProdutosComponent implements OnInit {
  produtos: GraficaProduto[] = [];
  total = 0;
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;
  carregandoFiltros = false;
  sort: Sort = { active: 'nome', direction: 'asc' };
  filterState: DataTableFilterState = {};
  readonly searchConfig = {
    enabled: true,
    placeholder: 'Buscar por nome, descrição ou código',
    debounceMs: 300,
  };

  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];
  cores: GraficaCadastro[] = [];
  acabamentos: GraficaCadastro[] = [];
  servicos: GraficaCadastro[] = [];

  readonly columns: DataTableColumn<GraficaProduto>[] = [
    { key: 'produto', label: 'Produto', sortable: true, sortKey: 'nome', width: '260px' },
    { key: 'configuracao', label: 'Configuração' },
    { key: 'parametros', label: 'Acab./Serv.', align: 'center', width: '120px' },
    { key: 'status', label: 'Status', sortable: true, sortKey: 'ativo', width: '120px' },
  ];

  readonly actions: DataTableAction<GraficaProduto>[] = [
    { id: 'configurar', label: 'Configurar', icon: 'tune' },
    {
      id: 'alterarStatus',
      label: 'Alterar status',
      icon: 'swap_horiz',
    },
  ];

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.total,
      pageSizeOptions: [10, 20, 50],
    };
  }

  get tableFilters(): DataTableFilter[] {
    return [
      {
        key: 'ativo',
        label: 'Status',
        type: 'select',
        options: [
          { value: true, label: 'Ativos' },
          { value: false, label: 'Inativos' },
        ],
      },
      { key: 'materialId', label: 'Material', type: 'select', options: this.toOptions(this.materiais) },
      { key: 'formatoId', label: 'Formato', type: 'select', options: this.toOptions(this.formatos) },
      { key: 'corId', label: 'Cor', type: 'select', options: this.toOptions(this.cores) },
      { key: 'acabamentoIds', label: 'Acabamentos', type: 'multi-select', options: this.toOptions(this.acabamentos) },
      { key: 'servicoIds', label: 'Serviços', type: 'multi-select', options: this.toOptions(this.servicos) },
    ];
  }

  constructor(
    private readonly router: Router,
    private readonly graficaService: GraficaProdutoService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.carregarFiltros();
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.graficaService.listar(this.listParams()).subscribe({
      next: (page) => {
        this.produtos = page.content || [];
        this.total = page.totalElements || 0;
        this.carregando = false;
      },
      error: (error) => {
        this.carregando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar produtos gráficos.'));
      },
    });
  }

  onSearch(value: string): void {
    this.termo = value;
    this.pagina = 0;
    this.carregar();
  }

  onFilterChange(filters: DataTableFilterState): void {
    this.filterState = { ...filters };
    this.pagina = 0;
    this.carregar();
  }

  onClearFilters(): void {
    this.filterState = {};
    this.pagina = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
    this.carregar();
  }

  onSortChange(event: Sort): void {
    this.sort = event;
    this.pagina = 0;
    this.carregar();
  }

  onAction(event: DataTableActionEvent<GraficaProduto>): void {
    if (event.action === 'configurar') {
      this.configurar(event.row);
      return;
    }
    if (event.action === 'alterarStatus') {
      this.alterarStatus(event.row);
    }
  }

  resumo(item: GraficaProduto): string {
    const nomes = [item.material?.nome, item.formato?.nome, item.cor?.nome].filter(Boolean);
    if (!nomes.length) return 'Sem material/formato/cor';
    return nomes.join(' / ');
  }

  novo(): void {
    this.router.navigate(['/page/grafica/produtos/novo']);
  }

  abrirAjuda(): void {
    this.router.navigate(['/page/ajuda'], { fragment: 'produtos-graficos' });
  }

  configurar(item: GraficaProduto): void {
    this.router.navigate(['/page/grafica/produtos', item.id, 'editar']);
  }

  alterarStatus(item: GraficaProduto): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: item.ativo ? 'Desativar produto' : 'Ativar produto',
        message: `Deseja ${item.ativo ? 'desativar' : 'ativar'} "${item.catalogoProdutoNome}"?`,
        confirmText: item.ativo ? 'Desativar' : 'Ativar',
        confirmColor: item.ativo ? 'warn' : 'primary',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.graficaService.alterarStatus(item.id, !item.ativo).subscribe({
        next: () => {
          this.toastr.success('Status atualizado.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível alterar o status.')),
      });
    });
  }

  private carregarFiltros(): void {
    this.carregandoFiltros = true;
    forkJoin({
      materiais: this.graficaService.listarMateriais(),
      formatos: this.graficaService.listarFormatos(),
      cores: this.graficaService.listarCores(),
      acabamentos: this.graficaService.listarAcabamentos(),
      servicos: this.graficaService.listarServicos(),
    }).subscribe({
      next: ({ materiais, formatos, cores, acabamentos, servicos }) => {
        this.materiais = materiais || [];
        this.formatos = formatos || [];
        this.cores = cores || [];
        this.acabamentos = acabamentos || [];
        this.servicos = servicos || [];
        this.carregandoFiltros = false;
      },
      error: (error) => {
        this.carregandoFiltros = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar filtros da gráfica.'));
      },
    });
  }

  private listParams(): GraficaProdutoListParams {
    const filters = this.filterState as GraficaProdutosFilters;
    return {
      page: this.pagina,
      size: this.tamanho,
      search: this.termo,
      ativo: filters.ativo,
      materialId: this.toNumber(filters.materialId),
      formatoId: this.toNumber(filters.formatoId),
      corId: this.toNumber(filters.corId),
      // Multi-selects usam semântica OR no backend: qualquer acabamento/serviço selecionado é suficiente.
      acabamentoIds: this.toNumberArray(filters.acabamentoIds),
      servicoIds: this.toNumberArray(filters.servicoIds),
      sort: this.toSortParam(),
    };
  }

  private toSortParam(): string {
    if (!this.sort.active || !this.sort.direction) {
      return 'nome,asc';
    }
    return `${this.sort.active},${this.sort.direction}`;
  }

  private toOptions(items: Array<GraficaCadastro | GraficaFormato>) {
    return items
      .filter((item) => item.ativo !== false)
      .map((item) => ({ value: item.id, label: item.nome }));
  }

  private toNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private toNumberArray(value: unknown): number[] {
    if (!Array.isArray(value)) {
      return [];
    }
    return value.map((item) => this.toNumber(item)).filter((item): item is number => item !== null);
  }
}
