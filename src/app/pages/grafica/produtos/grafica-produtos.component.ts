import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import {
  DataTableColumn,
  DataTableFilter,
  DataTableFilterState,
  DataTablePagination,
} from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';
import { resolveStorageImageUrl, STORAGE_IMAGE_PLACEHOLDER } from '../../storage/utils/storage-media-url.util';
import {
  GraficaCadastro,
  GraficaFormato,
  GraficaPrecoPolitica,
  GraficaProduto,
  GraficaProdutoListParams,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type GraficaProdutosFilters = {
  materialIds?: number[];
  formatoIds?: number[];
  corIds?: number[];
};

@Component({
  selector: 'app-grafica-produtos',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
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
        [sort]="sort"
        filtersLabel="Filtros"
        clearFiltersLabel="Limpar filtros"
        [emptyState]="{
          title: 'Nenhum produto gráfico encontrado',
          description: 'Cadastre um produto gráfico para configurar vendas.',
          filteredTitle: 'Nenhum produto gráfico encontrado',
          filteredDescription: 'Altere a busca ou limpe os filtros.'
        }"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (filterChange)="onFilterChange($event)"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)">

        <ng-template appDataTableCell="imagem" let-row>
          <img class="produto-thumb" [src]="imagemProduto(row)" [alt]="row.catalogoProdutoNome || 'Produto'" loading="lazy" decoding="async" />
        </ng-template>

        <ng-template appDataTableCell="produto" let-row>
          <strong class="produto-nome">{{ row.catalogoProdutoNome || '-' }}</strong>
          @if (configuracaoLinha(row)) {
            <small>{{ configuracaoLinha(row) }}</small>
          }
        </ng-template>

        <ng-template appDataTableCell="descricao" let-row>
          <span class="descricao-cell">{{ row.catalogoProdutoDescricao || '-' }}</span>
        </ng-template>

        <ng-template appDataTableCell="preco" let-row>
          <div class="preco-cell">
            @for (linha of precoResumo(row); track linha) {
              <span>{{ linha }}</span>
            }
          </div>
        </ng-template>

        <ng-template appDataTableCell="publicacao" let-row>
          <span class="publicacao-chip" [class.publicacao-chip--publicado]="row.catalogoProdutoExibirNoSite">
            <mat-icon>{{ row.catalogoProdutoExibirNoSite ? 'public' : 'lock' }}</mat-icon>
            {{ row.catalogoProdutoExibirNoSite ? 'Publicado' : 'Interno' }}
          </span>
        </ng-template>

        <ng-template appDataTableCell="acoes" let-row>
          <div class="acoes-cell">
            <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + (row.catalogoProdutoNome || 'produto')" (click)="configurar(row)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button type="button" matTooltip="Clonar" [attr.aria-label]="'Clonar ' + (row.catalogoProdutoNome || 'produto')" (click)="clonar(row)">
              <mat-icon>content_copy</mat-icon>
            </button>
            <button mat-icon-button type="button" color="warn" matTooltip="Excluir" [attr.aria-label]="'Excluir ' + (row.catalogoProdutoNome || 'produto')" (click)="excluir(row)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </ng-template>
      </app-data-table>
    </app-page-card>
  `,
  styles: [`
    .produto-thumb {
      display: block;
      width: 40px;
      height: 40px;
      border-radius: 8px;
      border: 1px solid #e5e7eb;
      background: #f8fafc;
      object-fit: cover;
    }

    .produto-nome {
      display: block;
      color: #111827;
      line-height: 1.25;
    }

    small {
      display: block;
      color: #6b7280;
      margin-top: 2px;
      line-height: 1.25;
    }

    .descricao-cell {
      display: -webkit-box;
      max-width: 340px;
      overflow: hidden;
      color: #374151;
      line-height: 1.35;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    .preco-cell {
      display: grid;
      gap: 2px;
      color: #111827;
      font-size: 0.86rem;
      line-height: 1.3;
      white-space: nowrap;
    }

    .preco-cell span:first-child {
      font-weight: 700;
    }

    .publicacao-chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 28px;
      padding: 0 10px;
      border-radius: 999px;
      background: #f3f4f6;
      color: #4b5563;
      font-size: 0.82rem;
      font-weight: 700;
      white-space: nowrap;
    }

    .publicacao-chip--publicado {
      background: #ecfdf5;
      color: #047857;
    }

    .publicacao-chip mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .acoes-cell {
      display: inline-flex;
      align-items: center;
      justify-content: flex-end;
      gap: 4px;
      min-width: 132px;
      white-space: nowrap;
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
  carregandoPrecos = false;
  carregandoFiltros = false;
  sort: Sort = { active: 'nome', direction: 'asc' };
  filterState: DataTableFilterState = {};
  precosPorProduto: Record<number, GraficaPrecoPolitica[]> = {};
  readonly searchConfig = {
    enabled: true,
    label: 'Buscar produtos',
    placeholder: 'Buscar por nome, descrição ou código',
    debounceMs: 300,
  };

  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];
  cores: GraficaCadastro[] = [];

  readonly columns: DataTableColumn<GraficaProduto>[] = [
    { key: 'imagem', label: 'Imagem', width: '72px' },
    { key: 'produto', label: 'Produto', sortable: true, sortKey: 'nome', width: '260px' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'preco', label: 'Preço', width: '180px' },
    { key: 'publicacao', label: 'Publicação', width: '140px' },
    { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
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
      { key: 'materialIds', label: 'Material', type: 'multi-select', width: '220px', options: this.toOptions(this.materiais) },
      { key: 'formatoIds', label: 'Formato', type: 'multi-select', width: '180px', options: this.toOptions(this.formatos) },
      { key: 'corIds', label: 'Cor', type: 'multi-select', width: '140px', options: this.toOptions(this.cores) },
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
        this.carregarPrecos();
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

  configuracaoLinha(item: GraficaProduto): string {
    const nomes = [item.material?.nome, item.formato?.nome, item.cor?.nome].filter(Boolean);
    return nomes.join(' · ');
  }

  imagemProduto(item: GraficaProduto): string {
    const imagem = (item.imagens || [])
      .filter((img) => img.ativo !== false)
      .sort((a, b) => Number(b.principal === true) - Number(a.principal === true) || (a.ordem ?? 0) - (b.ordem ?? 0))[0];
    return resolveStorageImageUrl(imagem?.arquivo, 'THUMBNAIL', STORAGE_IMAGE_PLACEHOLDER);
  }

  precoResumo(item: GraficaProduto): string[] {
    if (this.carregandoPrecos && !this.precosPorProduto[item.id]) {
      return ['Carregando...'];
    }
    const politica = (this.precosPorProduto[item.id] || []).find((preco) => preco.ativo !== false);
    if (!politica) {
      return ['Sem preço'];
    }

    if (politica.tipo === 'FIXO') {
      return [this.moeda(politica.valorFixo)];
    }
    if (politica.tipo === 'POR_FAIXA_QUANTIDADE') {
      return this.linhasFaixa(politica);
    }
    if (politica.tipo === 'POR_LOTE') {
      return this.linhasLote(politica);
    }
    if (politica.tipo === 'POR_METRO_QUADRADO') {
      const unidade = this.unidadeDimensaoSimbolo(politica.unidadeDimensao);
      const modo = politica.modoCobranca === 'LINEAR' ? 'linear' : 'm²';
      const linhas = [`${this.moeda(politica.precoMetroQuadrado)} / ${modo} (${unidade})`];
      if (politica.minimoMetroQuadrado !== null && politica.minimoMetroQuadrado !== undefined) {
        linhas.push(`Mín. ${this.moeda(politica.minimoMetroQuadrado)}`);
      }
      return linhas;
    }
    return ['Sem preço'];
  }

  private unidadeDimensaoSimbolo(unidade: string | null | undefined): string {
    switch (unidade) {
      case 'CENTIMETRO': return 'cm';
      case 'MILIMETRO': return 'mm';
      default: return 'm';
    }
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

  clonar(item: GraficaProduto): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Clonar produto',
        message: `Deseja realmente usar "${item.catalogoProdutoNome || 'este produto'}" como base para criar um novo produto?`,
        confirmText: 'Clonar',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) {
        return;
      }
      this.router.navigate(['/page/grafica/produtos/novo'], { queryParams: { cloneFrom: item.id } });
    });
  }

  excluir(item: GraficaProduto): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir produto gráfico',
        message: `Deseja excluir "${item.catalogoProdutoNome || 'este produto'}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) {
        return;
      }
      this.carregando = true;
      this.graficaService.excluir(item.id).pipe(finalize(() => this.carregando = false)).subscribe({
        next: () => {
          this.toastr.success('Produto gráfico excluído.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível excluir o produto gráfico.')),
      });
    });
  }

  private carregarFiltros(): void {
    this.carregandoFiltros = true;
    forkJoin({
      materiais: this.graficaService.listarMateriais(),
      formatos: this.graficaService.listarFormatos(),
      cores: this.graficaService.listarCores(),
    }).subscribe({
      next: ({ materiais, formatos, cores }) => {
        this.materiais = materiais || [];
        this.formatos = formatos || [];
        this.cores = cores || [];
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
      materialIds: this.toNumberArray(filters.materialIds),
      formatoIds: this.toNumberArray(filters.formatoIds),
      corIds: this.toNumberArray(filters.corIds),
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

  private carregarPrecos(): void {
    if (!this.produtos.length) {
      this.precosPorProduto = {};
      return;
    }

    this.carregandoPrecos = true;
    const requests = this.produtos.reduce<Record<number, ReturnType<GraficaProdutoService['listarPrecos']>>>((acc, produto) => {
      acc[produto.id] = this.graficaService.listarPrecos(produto.id).pipe(catchError(() => of([])));
      return acc;
    }, {});

    forkJoin(requests).pipe(finalize(() => this.carregandoPrecos = false)).subscribe((precos) => {
      this.precosPorProduto = precos;
    });
  }

  private linhasFaixa(politica: GraficaPrecoPolitica): string[] {
    const faixas = (politica.faixas || [])
      .slice()
      .sort((a, b) => a.inicio - b.inicio);
    const linhas = faixas
      .slice(0, 5)
      .map((faixa) => `${this.numero(faixa.inicio)}–${faixa.fim ? this.numero(faixa.fim) : '+'} ${this.moeda(faixa.valorUnitario)}`);
    if (faixas.length > 5) {
      linhas.push(`+${faixas.length - 5}`);
    }
    return linhas.length ? linhas : ['Sem faixas'];
  }

  private linhasLote(politica: GraficaPrecoPolitica): string[] {
    const lotes = (politica.lotes || [])
      .slice()
      .sort((a, b) => a.quantidade - b.quantidade);
    const linhas = lotes
      .slice(0, 5)
      .map((lote) => `${this.numero(lote.quantidade)} ${this.moeda(lote.valorLote)}`);
    if (lotes.length > 5) {
      linhas.push(`+${lotes.length - 5}`);
    }
    return linhas.length ? linhas : ['Sem lotes'];
  }

  private moeda(valor?: number | null): string {
    if (valor === null || valor === undefined || !Number.isFinite(Number(valor))) {
      return 'Sem preço';
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(valor));
  }

  private numero(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(valor);
  }
}
