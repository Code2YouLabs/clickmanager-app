import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Sort } from '@angular/material/sort';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import {
  HierarchyTreeAction,
  HierarchyTreeActionEvent,
  HierarchyTreeComponent,
  HierarchyTreeNode,
} from 'src/app/components/hierarchy-tree/hierarchy-tree.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
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
    HierarchyTreeComponent,
  ],
  template: `
    <app-page-card titulo="Categorias gráficas" subtitulo="Organização dos produtos gráficos no catálogo">
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Nova categoria
        </button>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="categorias"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="carregando"
        [showTable]="visualizacao === 'lista'"
        [sort]="sort"
        [emptyState]="{
          title: 'Nenhuma categoria encontrada',
          description: 'Cadastre uma categoria para organizar os produtos gráficos.',
          filteredTitle: 'Nenhuma categoria encontrada',
          filteredDescription: 'Altere a busca.'
        }"
        [actions]="categoriaActions"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (pageChange)="onPageChange($event)"
        (sortChange)="onSortChange($event)"
        (action)="onTableAction($event)">

        <div data-table-toolbar-actions class="visualizacao-toggle">
          <mat-button-toggle-group
            [value]="visualizacao"
            hideSingleSelectionIndicator
            aria-label="Visualização das categorias"
            (change)="alterarVisualizacao($event.value)">
            <mat-button-toggle value="lista" aria-label="Visualizar em lista">
              <mat-icon>view_list</mat-icon>
              <span>Lista</span>
            </mat-button-toggle>
            <mat-button-toggle value="arvore" aria-label="Visualizar em árvore">
              <mat-icon>account_tree</mat-icon>
              <span>Árvore</span>
            </mat-button-toggle>
          </mat-button-toggle-group>
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
  styles: [`
    .visualizacao-toggle {
      display: inline-flex;
    }

    .visualizacao-toggle mat-button-toggle-group {
      height: var(--mat-form-field-container-height, 37px);
      border-radius: 8px;
      border-color: var(--mat-sys-outline-variant);
      overflow: hidden;
    }

    .visualizacao-toggle mat-button-toggle {
      height: var(--mat-form-field-container-height, 37px);
      min-width: 96px;
      color: var(--mat-sys-on-surface);
    }

    .visualizacao-toggle ::ng-deep .mat-button-toggle-label-content {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 100%;
      line-height: 1;
      padding: 0 12px;
      font-weight: 600;
    }

    .visualizacao-toggle ::ng-deep .mat-button-toggle-button {
      height: 100%;
    }

    .visualizacao-toggle ::ng-deep .mat-button-toggle-checked {
      background: color-mix(in srgb, var(--mat-sys-primary) 10%, var(--mat-sys-surface));
      color: var(--mat-sys-primary);
    }

    .visualizacao-toggle mat-icon {
      width: 18px;
      height: 18px;
      font-size: 18px;
    }

    .categoria-nome {
      display: block;
      color: #111827;
      line-height: 1.25;
    }

    .descricao-cell {
      display: -webkit-box;
      max-width: 420px;
      overflow: hidden;
      color: #374151;
      line-height: 1.35;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 2;
    }

    @media (max-width: 760px) {
      .visualizacao-toggle,
      .visualizacao-toggle mat-button-toggle-group {
        width: 100%;
      }

      .visualizacao-toggle mat-button-toggle {
        flex: 1 1 0;
        min-width: 0;
      }
    }
  `],
})
export class GraficaCategoriasComponent implements OnInit {
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
  ];

  readonly permissoes = {
    editar: ['CATALOGO_CATEGORIAS_EDITAR', 'GRAFICA_PRODUTOS_EDITAR'],
    clonar: ['CATALOGO_CATEGORIAS_CADASTRAR', 'GRAFICA_PRODUTOS_EDITAR'],
    excluir: ['CATALOGO_CATEGORIAS_EXCLUIR', 'GRAFICA_PRODUTOS_EDITAR'],
  };

  get categoriaActions(): DataTableAction<CatalogoCategoria>[] {
    return this.actionDefinitions().filter((action) => this.podeExecutar(action.id));
  }

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
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    if (this.visualizacao === 'arvore') {
      this.carregarArvore();
      return;
    }

    this.carregando = true;
    this.service.listar(this.listParams()).pipe(finalize(() => this.carregando = false)).subscribe({
      next: (page) => {
        this.categorias = page.content || [];
        this.total = page.totalElements || 0;
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar categorias.')),
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

  onTableAction(event: DataTableActionEvent<CatalogoCategoria>): void {
    this.executarAcaoCategoria(event.action, event.row);
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

  private executarAcaoCategoria(action: string, item: CatalogoCategoria): void {
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

  private podeExecutar(action: string): boolean {
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
