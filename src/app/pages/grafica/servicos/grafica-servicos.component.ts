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
import { GraficaServico } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

@Component({
  selector: 'app-grafica-servicos',
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
    <app-page-card titulo="Serviços gráficos" subtitulo="Serviços usados na configuração de produtos gráficos">
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo serviço
        </button>
      </div>

      <app-data-table
        [columns]="columns"
        [data]="servicosPaginados"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="carregando"
        [emptyState]="{
          title: 'Nenhum serviço encontrado',
          description: 'Cadastre um serviço para configurar produtos gráficos.',
          filteredTitle: 'Nenhum serviço encontrado',
          filteredDescription: 'Altere a busca.'
        }"
        rowKey="id"
        (searchChange)="onSearch($event)"
        (pageChange)="onPageChange($event)">

        <ng-template appDataTableCell="nome" let-row>
          <strong class="servico-nome">{{ row.nome }}</strong>
        </ng-template>

        <ng-template appDataTableCell="descricao" let-row>
          <span class="descricao-cell">{{ row.descricao || '-' }}</span>
        </ng-template>

        <ng-template appDataTableCell="preco" let-row>
          <span class="preco-resumo">{{ precoResumo(row) }}</span>
        </ng-template>

        <ng-template appDataTableCell="acoes" let-row>
          <div class="acoes-cell">
            <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + row.nome" (click)="editar(row)">
              <mat-icon>edit</mat-icon>
            </button>
            <span matTooltip="Clonar - em breve">
              <button mat-icon-button type="button" aria-label="Clonar serviço" disabled>
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
    .servico-nome {
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

    .preco-resumo {
      color: #111827;
      font-weight: 700;
      white-space: nowrap;
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
export class GraficaServicosComponent implements OnInit {
  servicos: GraficaServico[] = [];
  pagina = 0;
  tamanho = 10;
  termo = '';
  carregando = false;

  readonly searchConfig = {
    enabled: true,
    label: 'Buscar serviços',
    placeholder: 'Buscar por nome ou descrição',
    debounceMs: 300,
  };

  readonly columns: DataTableColumn<GraficaServico>[] = [
    { key: 'nome', label: 'Nome', width: '260px' },
    { key: 'descricao', label: 'Descrição' },
    { key: 'preco', label: 'Preço', width: '180px' },
    { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
  ];

  get servicosFiltrados(): GraficaServico[] {
    const termo = this.termo.trim().toLowerCase();
    if (!termo) return this.servicos;
    return this.servicos.filter((item) => `${item.nome || ''} ${item.descricao || ''}`.toLowerCase().includes(termo));
  }

  get servicosPaginados(): GraficaServico[] {
    const inicio = this.pagina * this.tamanho;
    return this.servicosFiltrados.slice(inicio, inicio + this.tamanho);
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.servicosFiltrados.length,
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
    this.service.listarServicos().pipe(finalize(() => this.carregando = false)).subscribe({
      next: (items) => {
        this.servicos = items || [];
        this.pagina = 0;
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar serviços.')),
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
    this.router.navigate(['/page/grafica/servicos/novo']);
  }

  editar(item: GraficaServico): void {
    this.router.navigate(['/page/grafica/servicos', item.id, 'editar']);
  }

  precoResumo(item: GraficaServico): string {
    const politica = item.politicas?.find((preco) => preco.ativo !== false);
    if (!politica) return 'A configurar';
    switch (politica.tipo) {
      case 'FIXO':
        return this.moeda(politica.valorFixo);
      case 'POR_FAIXA_QUANTIDADE':
        return 'Faixa de Quantidade';
      case 'POR_LOTE':
        return 'Quantidade Fechada';
      case 'POR_METRO_QUADRADO':
        return 'Preço por Metro';
      default:
        return 'A configurar';
    }
  }

  excluir(item: GraficaServico): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir serviço',
        message: `Deseja excluir "${item.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.carregando = true;
      this.service.excluirServico(item.id).pipe(finalize(() => this.carregando = false)).subscribe({
        next: () => {
          this.toastr.success('Serviço excluído.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível excluir o serviço.')),
      });
    });
  }

  private moeda(valor: unknown): string {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return 'A configurar';
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
