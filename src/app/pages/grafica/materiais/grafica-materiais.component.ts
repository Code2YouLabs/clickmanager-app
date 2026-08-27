import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

@Component({
  selector: 'app-grafica-materiais',
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
    <app-page-card titulo="Materiais gráficos" subtitulo="Materiais usados na configuração de produtos gráficos">
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo material
        </button>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="materiaisPaginados"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="carregando"
        [emptyState]="{
          title: 'Nenhum material encontrado',
          description: 'Cadastre um material para configurar produtos gráficos.',
          filteredTitle: 'Nenhum material encontrado',
          filteredDescription: 'Altere a busca.'
        }"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (pageChange)="onPageChange($event)">

        <ng-template appDataTableCell="nome" let-row>
          <strong class="material-nome">{{ row.nome }}</strong>
        </ng-template>

        <ng-template appDataTableCell="descricao" let-row>
          <span class="descricao-cell">{{ row.descricao || '-' }}</span>
        </ng-template>

        <ng-template appDataTableCell="acoes" let-row>
          <div class="acoes-cell">
            <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + row.nome" (click)="editar(row)">
              <mat-icon>edit</mat-icon>
            </button>
            <span matTooltip="Clonar - em breve">
              <button mat-icon-button type="button" aria-label="Clonar material" disabled>
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
    .material-nome {
      display: block;
      color: #111827;
      line-height: 1.25;
    }

    .descricao-cell {
      display: -webkit-box;
      max-width: 520px;
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
export class GraficaMateriaisComponent implements OnInit {
  materiais: GraficaCadastro[] = [];
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;

  readonly searchConfig = {
    enabled: true,
    label: 'Buscar materiais',
    placeholder: 'Buscar por nome ou descrição',
    debounceMs: 300,
  };

  readonly columns: DataTableColumn<GraficaCadastro>[] = [
    { key: 'nome', label: 'Nome', width: '280px' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
  ];

  get materiaisFiltrados(): GraficaCadastro[] {
    const termo = this.termo.trim().toLowerCase();
    if (!termo) return this.materiais;
    return this.materiais.filter((item) => `${item.nome || ''} ${item.descricao || ''}`.toLowerCase().includes(termo));
  }

  get materiaisPaginados(): GraficaCadastro[] {
    const inicio = this.pagina * this.tamanho;
    return this.materiaisFiltrados.slice(inicio, inicio + this.tamanho);
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.materiaisFiltrados.length,
      pageSizeOptions: [10, 20, 50],
    };
  }

  constructor(
    private readonly service: GraficaProdutoService,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.service.listarMateriais().pipe(finalize(() => this.carregando = false)).subscribe({
      next: (items) => {
        this.materiais = items || [];
        this.pagina = 0;
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar materiais.')),
    });
  }

  onSearch(value: string): void {
    this.termo = value;
    this.pagina = 0;
  }

  onPageChange(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
  }

  novo(): void {
    this.router.navigate(['/page/grafica/materiais/novo']);
  }

  editar(item: GraficaCadastro): void {
    this.router.navigate(['/page/grafica/materiais', item.id, 'editar']);
  }

  excluir(item: GraficaCadastro): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir material',
        message: `Deseja excluir "${item.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.carregando = true;
      this.service.excluirMaterial(item.id).pipe(finalize(() => this.carregando = false)).subscribe({
        next: () => {
          this.toastr.success('Material excluído.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível excluir o material.')),
      });
    });
  }
}
