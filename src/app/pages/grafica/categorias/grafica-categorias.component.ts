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
import { DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
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
            <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + row.nome" (click)="editar(row)">
              <mat-icon>edit</mat-icon>
            </button>
            <span matTooltip="Clonar - em breve">
              <button mat-icon-button type="button" aria-label="Clonar categoria" disabled>
                <mat-icon>content_copy</mat-icon>
              </button>
            </span>
            <button mat-icon-button type="button" color="warn" matTooltip="Excluir" [attr.aria-label]="'Excluir ' + row.nome" (click)="excluir(row)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </ng-template>
      </app-data-table>
    </app-page-card>
  `,
  styles: [`
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
export class GraficaCategoriasComponent implements OnInit {
  categorias: CatalogoCategoria[] = [];
  total = 0;
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;
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

  constructor(
    private readonly service: CatalogoCategoriaService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
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

  novo(): void {
    this.router.navigate(['/page/grafica/categorias/novo']);
  }

  editar(item: CatalogoCategoria): void {
    this.router.navigate(['/page/grafica/categorias', item.id, 'editar']);
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
      this.carregando = true;
      this.service.inativar(item.id).pipe(finalize(() => this.carregando = false)).subscribe({
        next: () => {
          this.toastr.success('Categoria excluída.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível excluir a categoria.')),
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
}
