import { BibliotecaDialogComponent } from '../biblioteca/biblioteca-dialog.component';
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

type CategoriaResumoLinha = {
  partes: string[];
  truncada: boolean;
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
  templateUrl: './grafica-produtos.component.html',
  styleUrl: './grafica-produtos.component.scss',
})
export class GraficaProdutosComponent implements OnInit {
  produtos: GraficaProduto[] = [];
  total = 0;
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;
  erroCarregamento: string | null = null;
  acessoNegado = false;
  private loadVersion = 0;
  carregandoPrecos = false;
  carregandoFiltros = false;
  sort: Sort = { active: 'nome', direction: 'asc' };
  filterState: DataTableFilterState = {};
  precosPorProduto: Record<number, GraficaPrecoPolitica[]> = {};
  readonly searchConfig = {
    enabled: true,
    value: '',
    label: 'Buscar produtos',
    placeholder: 'Buscar por nome, descrição ou código',
    debounceMs: 300,
  };

  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];
  cores: GraficaCadastro[] = [];

  readonly columns: DataTableColumn<GraficaProduto>[] = [
    { key: 'imagem', label: 'Imagem', width: '72px' },
    { key: 'produto', label: 'Produto', sortable: true, sortKey: 'nome', width: '240px' },
    { key: 'categoria', label: 'Categoria', width: '300px' },
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
    const version = ++this.loadVersion;
    this.carregando = true;
    this.erroCarregamento = null;
    this.acessoNegado = false;
    this.graficaService.listar(this.listParams()).subscribe({
      next: (page) => {
        if (version !== this.loadVersion) return;
        this.produtos = page.content || [];
        this.total = page.totalElements || 0;
        this.carregando = false;
        this.carregarPrecos();
      },
      error: (error) => {
        if (version !== this.loadVersion) return;
        this.carregando = false;
        this.acessoNegado = error?.status === 403;
        this.erroCarregamento = this.acessoNegado ? null : catalogoErrorMessage(error, 'Verifique a conexão e tente novamente.');
      },
    });
  }

  onSearch(value: string): void {
    this.termo = value;
    this.searchConfig.value = value;
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

  categoriaResumo(item: GraficaProduto): CategoriaResumoLinha[] {
    return this.categoriaCaminhos(item).slice(-5).map((caminho) => this.formatarCategoriaCaminho(caminho));
  }

  categoriaExcedente(item: GraficaProduto): number {
    const total = this.categoriaCaminhos(item).length;
    return Math.max(total - 5, 0);
  }

  categoriaTitulo(linha: CategoriaResumoLinha): string {
    return `${linha.truncada ? '... ' : ''}${linha.partes.join(' -> ')}`;
  }

  imagemProduto(item: GraficaProduto): string {
    const imagem = (item.imagens || [])
      .filter((img) => img.ativo !== false)
      .sort((a, b) => Number(b.principal === true) - Number(a.principal === true) || (a.ordem ?? 0) - (b.ordem ?? 0))[0];
    return resolveStorageImageUrl(imagem?.arquivo, 'THUMBNAIL', STORAGE_IMAGE_PLACEHOLDER);
  }

  private categoriaCaminhos(item: GraficaProduto): string[][] {
    const caminhosMultiplos = (item.catalogoCategoriasCaminhos || [])
      .map((caminho) => this.normalizarCategoriaCaminho(caminho))
      .filter((caminho) => caminho.length > 0);
    if (caminhosMultiplos.length > 0) {
      return caminhosMultiplos;
    }

    const caminhoAtual = this.normalizarCategoriaCaminho(item.catalogoCategoriaCaminho || []);
    if (caminhoAtual.length > 0) {
      return [caminhoAtual];
    }
    const nomeAtual = (item.catalogoCategoriaNome || '').trim();
    return nomeAtual ? [[nomeAtual]] : [['-']];
  }

  private normalizarCategoriaCaminho(caminho: string[]): string[] {
    return caminho
      .map((parte) => (parte || '').trim())
      .filter((parte) => parte.length > 0);
  }

  private formatarCategoriaCaminho(caminho: string[]): CategoriaResumoLinha {
    const partes = caminho.slice(-4);
    return {
      partes,
      truncada: caminho.length > partes.length,
    };
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

  abrirBiblioteca(): void {
    this.dialog.open(BibliotecaDialogComponent, { width: '1120px', maxWidth: '96vw', maxHeight: '94vh' })
      .afterClosed().subscribe(alterado => { if (alterado) { this.carregarFiltros(); this.carregar(); } });
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
