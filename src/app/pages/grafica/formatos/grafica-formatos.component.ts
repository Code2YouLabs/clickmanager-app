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
import { GraficaFormato } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

@Component({
  selector: 'app-grafica-formatos',
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
    <app-page-card titulo="Formatos gráficos" subtitulo="Formatos usados na configuração de produtos gráficos">
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo formato
        </button>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="formatosPaginados"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="carregando"
        [emptyState]="{
          title: 'Nenhum formato encontrado',
          description: 'Cadastre um formato para configurar produtos gráficos.',
          filteredTitle: 'Nenhum formato encontrado',
          filteredDescription: 'Altere a busca.'
        }"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (pageChange)="onPageChange($event)">

        <ng-template appDataTableCell="nome" let-row>
          <strong class="formato-nome">{{ row.nome }}</strong>
        </ng-template>

        <ng-template appDataTableCell="descricao" let-row>
          <span class="descricao-cell">{{ row.descricao || '-' }}</span>
        </ng-template>

        <ng-template appDataTableCell="dimensao" let-row>
          <span>{{ dimensao(row) }}</span>
        </ng-template>

        <ng-template appDataTableCell="dimensaoUtil" let-row>
          <span>{{ dimensaoUtil(row) }}</span>
        </ng-template>

        <ng-template appDataTableCell="acoes" let-row>
          <div class="acoes-cell">
            <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + row.nome" (click)="editar(row)">
              <mat-icon>edit</mat-icon>
            </button>
            <span matTooltip="Clonar - em breve">
              <button mat-icon-button type="button" aria-label="Clonar formato" disabled>
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
    .formato-nome {
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
export class GraficaFormatosComponent implements OnInit {
  formatos: GraficaFormato[] = [];
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;

  readonly searchConfig = {
    enabled: true,
    label: 'Buscar formatos',
    placeholder: 'Buscar por nome, descrição ou dimensão',
    debounceMs: 300,
  };

  readonly columns: DataTableColumn<GraficaFormato>[] = [
    { key: 'nome', label: 'Nome', width: '220px' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'dimensao', label: 'Dimensão', width: '180px' },
    { key: 'dimensaoUtil', label: 'Área útil', width: '180px' },
    { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
  ];

  get formatosFiltrados(): GraficaFormato[] {
    const termo = this.termo.trim().toLowerCase();
    if (!termo) return this.formatos;
    return this.formatos.filter((item) => [
      item.nome,
      item.descricao,
      this.dimensao(item),
      this.dimensaoUtil(item),
    ].join(' ').toLowerCase().includes(termo));
  }

  get formatosPaginados(): GraficaFormato[] {
    const inicio = this.pagina * this.tamanho;
    return this.formatosFiltrados.slice(inicio, inicio + this.tamanho);
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.formatosFiltrados.length,
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
    this.service.listarFormatos().pipe(finalize(() => this.carregando = false)).subscribe({
      next: (items) => {
        this.formatos = items || [];
        this.pagina = 0;
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar formatos.')),
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
    this.router.navigate(['/page/grafica/formatos/novo']);
  }

  editar(item: GraficaFormato): void {
    this.router.navigate(['/page/grafica/formatos', item.id, 'editar']);
  }

  excluir(item: GraficaFormato): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir formato',
        message: `Deseja excluir "${item.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.carregando = true;
      this.service.excluirFormato(item.id).pipe(finalize(() => this.carregando = false)).subscribe({
        next: () => {
          this.toastr.success('Formato excluído.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível excluir o formato.')),
      });
    });
  }

  dimensao(item: GraficaFormato): string {
    return `${this.numero(item.largura)} x ${this.numero(item.altura)} ${this.unidade(item.unidadeDimensao)}`;
  }

  dimensaoUtil(item: GraficaFormato): string {
    return `${this.numero(item.larguraUtil)} x ${this.numero(item.alturaUtil)} ${this.unidade(item.unidadeDimensao)} útil`;
  }

  private numero(valor?: number | null): string {
    if (valor == null) return '-';
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  }

  private unidade(valor?: GraficaFormato['unidadeDimensao']): string {
    switch (valor) {
      case 'METRO': return 'm';
      case 'MILIMETRO': return 'mm';
      case 'CENTIMETRO': return 'cm';
      default: return '';
    }
  }
}
