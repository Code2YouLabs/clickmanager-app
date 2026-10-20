import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableFilterSortChange, DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import {
  HierarchyTreeAction,
  HierarchyTreeActionEvent,
  HierarchyTreeComponent,
  HierarchyTreeNode,
} from 'src/app/components/hierarchy-tree/hierarchy-tree.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { ViewModeToggleComponent, ViewModeToggleOption } from 'src/app/components/view-mode-toggle/view-mode-toggle.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { CatalogoCategoria, CatalogoListParams } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';

@Component({
  selector: 'app-grafica-categorias',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    DataTableItemDirective,
    HierarchyTreeComponent,
    ViewModeToggleComponent,
  ],
  template: `
    <app-page-card titulo="Categorias gráficas" subtitulo="Organização dos produtos gráficos no catálogo"
      [primaryAction]="isMobile ? novaAcao : null" (primaryActionClick)="novoMobile()">
      @if (!isMobile) {
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Nova categoria
        </button>
      </div>
      }

      <app-data-table
        [columns]="columns"
        [data]="categorias" [actions]="isMobile ? mobileActions : []" (action)="onMobileAction($event)"
        [mobileSortPlacement]="visualizacao === 'lista' ? 'filters' : 'list'" mobileSortLabel="Ordenar categorias por" (filterSortChange)="onFilterSortChange($event)"
        [error]="isMobile ? erro : null" [forbidden]="isMobile && semPermissao" (retry)="carregar()"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="isMobile ? carregando && !categorias.length : carregando" [refreshing]="isMobile && carregando && !!categorias.length"
        [showTable]="visualizacao === 'lista'"
        [sort]="sort"
        [emptyState]="{
          title: 'Nenhuma categoria encontrada',
          description: 'Cadastre uma categoria para organizar os produtos gráficos.',
          filteredTitle: 'Nenhuma categoria encontrada',
          filteredDescription: 'Altere a busca.'
        }"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)">

        <div data-table-toolbar-actions class="visualizacao-toggle">
          <app-view-mode-toggle
            [value]="visualizacao"
            [options]="visualizacaoOptions"
            ariaLabel="Visualização das categorias"
            (valueChange)="alterarVisualizacao($event)">
          </app-view-mode-toggle>
        </div>

        <ng-template appDataTableCell="nome" let-row>
          <strong class="categoria-nome">{{ row.nome }}</strong>
        </ng-template>

        <ng-template appDataTableCell="categoriaPai" let-row>
          {{ row.categoriaPaiNome || '-' }}
        </ng-template>

        <ng-template appDataTableCell="descricao" let-row>
          <span class="descricao-cell">{{ descricaoLinha(row) }}</span>
        </ng-template>

        <ng-template appDataTableCell="acoes" let-row>
          <div class="acoes-cell">
            @if (podeExecutar('editar')) {
              <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + row.nome" (click)="executarAcaoCategoria('editar', row)">
                <mat-icon>edit</mat-icon>
              </button>
            }
            @if (podeExecutar('clonar')) {
              <button mat-icon-button type="button" matTooltip="Clonar" [attr.aria-label]="'Clonar ' + row.nome" (click)="executarAcaoCategoria('clonar', row)">
                <mat-icon>content_copy</mat-icon>
              </button>
            }
            @if (podeExecutar('excluir')) {
              <button mat-icon-button type="button" color="warn" matTooltip="Excluir" [attr.aria-label]="'Excluir ' + row.nome" (click)="executarAcaoCategoria('excluir', row)">
                <mat-icon>delete</mat-icon>
              </button>
            }
          </div>
        </ng-template>
        <ng-template [appDataTableItem]="categorias" let-categoria let-itemActions="actions" let-emit="emitAction">
          <article class="categoria-mobile-item" [attr.aria-label]="categoria.nome">
            <header>
              <strong>{{ categoria.nome }}</strong>
              @if (itemActions.length) {
                <button mat-icon-button type="button" class="categoria-mobile-item__menu" [matMenuTriggerFor]="categoriaMenu" [disabled]="carregando"
                  [attr.aria-label]="'Ações da categoria ' + categoria.nome"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #categoriaMenu="matMenu" xPosition="before">
                  <ng-template matMenuContent>
                    @for (acao of itemActions; track acao.id) {
                      <button mat-menu-item type="button" [disabled]="carregando" [class.categoria-mobile-menu__destructive]="acao.color === 'warn'" (click)="emit(categoria, acao.id)">
                        <mat-icon [color]="acao.color || null">{{ acao.icon }}</mat-icon><span>{{ acao.label }}</span>
                      </button>
                    }
                  </ng-template>
                </mat-menu>
              }
            </header>
            <p class="categoria-mobile-item__parent">Categoria pai: {{ categoria.categoriaPaiNome || 'Sem categoria pai' }}</p>
            @if (descricaoLinha(categoria) !== '-') { <p class="categoria-mobile-item__description">{{ descricaoLinha(categoria) }}</p> }
          </article>
        </ng-template>
      </app-data-table>

      @if (visualizacao === 'arvore') {
        <app-hierarchy-tree
          [nodes]="categoriasArvore"
          [actions]="treeActions"
          [loading]="carregandoArvore"
          [expandAll]="!!termo"
          emptyTitle="Nenhuma categoria encontrada"
          [emptyDescription]="termo ? 'Altere a busca.' : 'Cadastre uma categoria para organizar os produtos gráficos.'"
          (action)="onTreeAction($event)">
        </app-hierarchy-tree>
      }
    </app-page-card>
  `,
  styleUrl: './grafica-categorias.component.scss',
})
export class GraficaCategoriasComponent implements OnInit, OnDestroy {
  isMobile = false;
  erro: string | null = null;
  semPermissao = false;
  private readonly destroy$ = new Subject<void>();
  readonly novaAcao = { label: 'Nova categoria', icon: 'add', permission: 'GRAFICA_PRODUTOS_EDITAR' };
  readonly mobileActions: DataTableAction<CatalogoCategoria>[] = this.actionDefinitions().map(acao => ({ ...acao, visible: () => this.podeExecutar(acao.id) }));
  novoMobile(): void { if (this.auth.temAlgumaPermissao(['GRAFICA_PRODUTOS_EDITAR'])) this.novo(); }
  onMobileAction(event: DataTableActionEvent<CatalogoCategoria>): void {
    if (!this.carregando && !this.semPermissao) this.executarAcaoCategoria(event.action, event.row);
  }
  onFilterSortChange(event: DataTableFilterSortChange): void { this.onSortChange(event.sort); }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
  categorias: CatalogoCategoria[] = [];
  categoriasArvore: HierarchyTreeNode<CatalogoCategoria>[] = [];
  total = 0;
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;
  carregandoArvore = false;
  visualizacao: 'lista' | 'arvore' = 'lista';
  sort: Sort = { active: 'nome', direction: 'asc' };

  readonly visualizacaoOptions: ViewModeToggleOption<'lista' | 'arvore'>[] = [
    { value: 'lista', label: 'Lista', icon: 'view_list', ariaLabel: 'Visualizar em lista' },
    { value: 'arvore', label: 'Árvore', icon: 'account_tree', ariaLabel: 'Visualizar em árvore' },
  ];

  readonly searchConfig = {
    enabled: true,
    label: 'Buscar categorias',
    placeholder: 'Buscar por nome ou descrição',
    debounceMs: 300,
  };

  readonly columns: DataTableColumn<CatalogoCategoria>[] = [
    { key: 'nome', label: 'Nome', sortable: true, sortKey: 'nome', width: '260px' },
    { key: 'categoriaPai', label: 'Categoria pai', width: '220px' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
  ];

  readonly permissoes = {
    editar: ['CATALOGO_CATEGORIAS_EDITAR', 'GRAFICA_PRODUTOS_EDITAR'],
    clonar: ['CATALOGO_CATEGORIAS_CADASTRAR', 'GRAFICA_PRODUTOS_EDITAR'],
    excluir: ['CATALOGO_CATEGORIAS_EXCLUIR', 'GRAFICA_PRODUTOS_EDITAR'],
  };

  get treeActions(): HierarchyTreeAction<CatalogoCategoria>[] {
    return this.actionDefinitions().filter((action) => this.podeExecutar(action.id));
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.total,
      pageSizeOptions: [10, 20, 50],
    };
  }

  constructor(
    private readonly service: CatalogoCategoriaService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
    private readonly auth: AuthService,
    breakpoints: BreakpointObserver,
  ) {
    breakpoints.observe(MOBILE_FOUNDATION_QUERY).pipe(takeUntil(this.destroy$)).subscribe(state => this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches);
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (this.visualizacao === 'arvore') {
      this.carregarArvore();
      return;
    }

    this.carregando = true; this.erro = null; this.semPermissao = false;
    this.service.listar(this.listParams()).pipe(finalize(() => this.carregando = false)).subscribe({
      next: (page) => {
        this.categorias = page.content || [];
        this.total = page.totalElements || 0;
      },
      error: (error) => { this.semPermissao = error?.status === 403; this.erro = catalogoErrorMessage(error, 'Não foi possível carregar categorias.'); this.toastr.error(this.erro); },
    });
  }

  onSearch(value: string): void {
    this.termo = value;
    this.pagina = 0;
    if (this.visualizacao === 'arvore') {
      this.refreshCategoriasArvore();
      return;
    }
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

  alterarVisualizacao(value: 'lista' | 'arvore'): void {
    if (!value || value === this.visualizacao) {
      return;
    }

    this.visualizacao = value;
    this.pagina = 0;
    this.carregar();
  }

  onTreeAction(event: HierarchyTreeActionEvent<CatalogoCategoria>): void {
    this.executarAcaoCategoria(event.action, event.node.data);
  }

  novo(): void {
    this.router.navigate(['/page/grafica/categorias/novo']);
  }

  editar(item: CatalogoCategoria): void {
    this.router.navigate(['/page/grafica/categorias', item.id, 'editar']);
  }

  clonar(item: CatalogoCategoria): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Clonar categoria',
        message: `Deseja usar "${item.nome}" como base para criar uma nova categoria?`,
        confirmText: 'Clonar',
        ...(this.isMobile ? { type: 'default', confirmColor: 'primary' } : {}),
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) {
        return;
      }
      this.router.navigate(['/page/grafica/categorias/novo'], { queryParams: { cloneFrom: item.id } });
    });
  }

  excluir(item: CatalogoCategoria): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir categoria',
        message: `Deseja excluir "${item.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
        ...(this.isMobile ? { type: 'destructive' } : {}),
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      if (this.visualizacao === 'arvore') {
        this.carregandoArvore = true;
      } else {
        this.carregando = true;
      }
      this.service.excluir(item.id).pipe(finalize(() => {
        this.carregando = false;
        this.carregandoArvore = false;
      })).subscribe({
        next: () => {
          this.toastr.success('Categoria excluída.');
          this.carregar();
        },
        error: (error) => this.exibirErroExclusao(error, item),
      });
    });
  }

  descricaoLinha(item: CatalogoCategoria): string {
    return item.descricaoCurta || item.descricaoCompleta || '-';
  }

  private listParams(): CatalogoListParams {
    return {
      page: this.pagina,
      size: this.tamanho,
      texto: this.termo,
      ativo: true,
      sort: this.toSortParam(),
    };
  }

  private toSortParam(): string {
    if (!this.sort.active || !this.sort.direction) {
      return 'nome,asc';
    }
    return `${this.sort.active},${this.sort.direction}`;
  }

  private carregarArvore(): void {
    this.carregandoArvore = true;
    this.service.listarTodas({ ativo: true, sort: 'nome,asc' })
      .pipe(finalize(() => this.carregandoArvore = false))
      .subscribe({
        next: (items) => {
          this.categorias = items || [];
          this.total = this.categorias.length;
          this.refreshCategoriasArvore();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar categorias.')),
      });
  }

  private buildTree(items: CatalogoCategoria[]): HierarchyTreeNode<CatalogoCategoria>[] {
    const nodeMap = new Map<number, HierarchyTreeNode<CatalogoCategoria>>();
    const roots: HierarchyTreeNode<CatalogoCategoria>[] = [];

    this.sortCategorias(items).forEach((item) => {
      nodeMap.set(item.id, {
        id: item.id,
        label: item.nome,
        description: this.descricaoArvore(item),
        data: item,
        children: [],
      });
    });

    this.sortCategorias(items).forEach((item) => {
      const node = nodeMap.get(item.id);
      if (!node) {
        return;
      }

      const parent = item.categoriaPaiId ? nodeMap.get(item.categoriaPaiId) : null;
      if (parent) {
        parent.children = [...(parent.children || []), node];
      } else {
        roots.push(node);
      }
    });

    this.applyMeta(roots);
    return roots;
  }

  private refreshCategoriasArvore(): void {
    const nodes = this.buildTree(this.categorias);
    const termo = this.normalize(this.termo);
    this.categoriasArvore = termo ? this.filterTree(nodes, termo) : nodes;
  }

  private filterTree(nodes: HierarchyTreeNode<CatalogoCategoria>[], termo: string): HierarchyTreeNode<CatalogoCategoria>[] {
    return nodes.reduce<HierarchyTreeNode<CatalogoCategoria>[]>((acc, node) => {
      const children = this.filterTree(node.children || [], termo);
      const selfMatches = this.nodeMatches(node.data, termo);

      if (selfMatches || children.length) {
        acc.push({ ...node, children });
      }

      return acc;
    }, []);
  }

  private nodeMatches(item: CatalogoCategoria, termo: string): boolean {
    const values = [
      item.nome,
      item.codigo,
      item.descricaoCurta,
      item.descricaoCompleta,
      item.categoriaPaiNome,
    ];
    return values.some((value) => this.normalize(value).includes(termo));
  }

  private applyMeta(nodes: HierarchyTreeNode<CatalogoCategoria>[]): void {
    nodes.forEach((node) => {
      const children = node.children || [];
      node.meta = children.length ? `${children.length} ${children.length === 1 ? 'subcategoria' : 'subcategorias'}` : null;
      this.applyMeta(children);
    });
  }

  private sortCategorias(items: CatalogoCategoria[]): CatalogoCategoria[] {
    return [...items].sort((a, b) => {
      const ordemA = a.ordemExibicao ?? Number.MAX_SAFE_INTEGER;
      const ordemB = b.ordemExibicao ?? Number.MAX_SAFE_INTEGER;
      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }
      return a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });
    });
  }

  private descricaoArvore(item: CatalogoCategoria): string | null {
    const descricao = item.descricaoCurta || item.descricaoCompleta;
    return descricao && descricao.trim() ? descricao : null;
  }

  private normalize(value: string | null | undefined): string {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  }

  executarAcaoCategoria(action: string, item: CatalogoCategoria): void {
    if (action === 'editar') {
      if (!this.temPermissaoAcao(this.permissoes.editar)) return;
      this.editar(item);
      return;
    }

    if (action === 'clonar') {
      if (!this.temPermissaoAcao(this.permissoes.clonar)) return;
      this.clonar(item);
      return;
    }

    if (action === 'excluir') {
      if (!this.temPermissaoAcao(this.permissoes.excluir)) return;
      this.excluir(item);
    }
  }

  private actionDefinitions(): Array<{ id: string; label: string; icon: string; color?: 'primary' | 'accent' | 'warn' }> {
    return [
      { id: 'editar', label: 'Editar', icon: 'edit' },
      { id: 'clonar', label: 'Clonar', icon: 'content_copy' },
      { id: 'excluir', label: 'Excluir', icon: 'delete', color: 'warn' },
    ];
  }

  podeExecutar(action: string): boolean {
    if (action === 'editar') return this.auth.temAlgumaPermissao(this.permissoes.editar);
    if (action === 'clonar') return this.auth.temAlgumaPermissao(this.permissoes.clonar);
    if (action === 'excluir') return this.auth.temAlgumaPermissao(this.permissoes.excluir);
    return false;
  }

  private temPermissaoAcao(permissoes: string[]): boolean {
    const permitido = this.auth.temAlgumaPermissao(permissoes);
    if (!permitido) {
      this.toastr.warning('Você não possui permissão para executar esta ação.');
    }
    return permitido;
  }

  private exibirErroExclusao(error: any, item: CatalogoCategoria): void {
    const body = error?.error;
    const codigo = body?.codigo || body?.code;
    if (codigo !== 'CATEGORIA_EM_USO') {
      this.toastr.error(catalogoErrorMessage(error, 'Não foi possível excluir a categoria.'));
      return;
    }

    this.toastr.error(
      this.dependenciasHtml(body?.dependencias),
      `Não é possível excluir "${this.escapeHtml(item.nome)}".`,
      { enableHtml: true, timeOut: 12000, closeButton: true }
    );
  }

  private dependenciasHtml(dependencias: any): string {
    const grupos = [
      ['Subcategorias', dependencias?.subcategorias || []],
      ['Produtos', dependencias?.produtos || []],
      ['Características', dependencias?.caracteristicas || []],
    ];

    const conteudo = grupos
      .filter(([, items]) => Array.isArray(items) && items.length)
      .map(([titulo, items]) => `<strong>${titulo}</strong><ul>${(items as any[]).map((dep) => `<li>${this.escapeHtml(dep.nome || dep.id)}</li>`).join('')}</ul>`)
      .join('');

    return `Remova ou reorganize estes vínculos antes:<br>${conteudo}`;
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
