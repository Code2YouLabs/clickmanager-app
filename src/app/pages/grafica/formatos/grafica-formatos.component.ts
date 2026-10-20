import { BreakpointObserver } from '@angular/cdk/layout';
import { Subject, takeUntil } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
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
    DataTableItemDirective,
  ],
  template: `
    <app-page-card titulo="Formatos gráficos" subtitulo="Formatos usados na configuração de produtos gráficos" [primaryAction]="isMobile ? novaAcao : null" (primaryActionClick)="novoMobile()">
      @if (!isMobile) {
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo formato
        </button>
      </div>
      }

      <app-data-table
        [columns]="columns"
        [data]="formatosPaginados" [actions]="isMobile ? mobileActions : []" (action)="onMobileAction($event)"
        [error]="isMobile ? erro : null" [forbidden]="isMobile && semPermissao" (retry)="carregar()"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="isMobile ? carregando && !formatosPaginados.length : carregando" [refreshing]="isMobile && carregando && !!formatosPaginados.length"
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
            <button mat-icon-button type="button" matTooltip="Clonar" [attr.aria-label]="'Clonar ' + row.nome" (click)="clonar(row)">
              <mat-icon>content_copy</mat-icon>
            </button>
            <button mat-icon-button type="button" color="warn" matTooltip="Excluir" [attr.aria-label]="'Excluir ' + row.nome" (click)="excluir(row)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </ng-template>
        <ng-template [appDataTableItem]="formatosPaginados" let-item let-itemActions="actions" let-emit="emitAction">
          <article class="cadastro-mobile-item" [attr.aria-label]="item.nome">
            <header>
              <strong>{{ item.nome }}</strong>
              @if (itemActions.length) {
                <button mat-icon-button type="button" class="cadastro-mobile-item__menu" [matMenuTriggerFor]="itemMenu" [disabled]="carregando"
                  [attr.aria-label]="'Ações de ' + item.nome"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #itemMenu="matMenu" xPosition="before">
                  <ng-template matMenuContent>
                    @for (acao of itemActions; track acao.id) {
                      <button mat-menu-item type="button" [disabled]="carregando" [class.cadastro-mobile-menu__destructive]="acao.color === 'warn'" (click)="emit(item, acao.id)">
                        <mat-icon [color]="acao.color || null">{{ acao.icon }}</mat-icon><span>{{ acao.label }}</span>
                      </button>
                    }
                  </ng-template>
                </mat-menu>
              }
            </header>
            @if (item.descricao) { <p class="cadastro-mobile-item__description">{{ item.descricao }}</p> }
            <p>Dimensão: {{ dimensao(item) }}</p>
            @if (dimensaoUtil(item) !== '-') { <p>Área útil: {{ dimensaoUtil(item) }}</p> }
          </article>
        </ng-template>
      </app-data-table>
    </app-page-card>
  `,
  styleUrl: './grafica-formatos.component.scss',
})
export class GraficaFormatosComponent implements OnInit, OnDestroy {
  isMobile = false;
  erro: string | null = null;
  semPermissao = false;
  private readonly destroy$ = new Subject<void>();
  readonly novaAcao = { label: 'Novo formato', icon: 'add', permission: 'GRAFICA_PRODUTOS_EDITAR' };
  readonly mobileActions: DataTableAction<GraficaFormato>[] = [
    { id: 'editar', label: 'Editar', icon: 'edit', visible: () => this.podeEditarMobile },
    { id: 'clonar', label: 'Clonar', icon: 'content_copy', visible: () => this.podeEditarMobile },
    { id: 'excluir', label: 'Excluir', icon: 'delete', color: 'warn', visible: () => this.podeEditarMobile },
  ];
  get podeEditarMobile(): boolean { return !!this.auth?.temPermissao('GRAFICA_PRODUTOS_EDITAR'); }
  novoMobile(): void { if (this.podeEditarMobile) this.novo(); }
  onMobileAction(event: DataTableActionEvent<GraficaFormato>): void {
    if (!this.podeEditarMobile || this.carregando || this.semPermissao) return;
    if (event.action === 'editar') this.editar(event.row);
    else if (event.action === 'clonar') this.clonar(event.row);
    else if (event.action === 'excluir') this.excluir(event.row);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
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
    private readonly auth?: AuthService,
    breakpoints?: BreakpointObserver,
  ) {
    breakpoints?.observe(MOBILE_FOUNDATION_QUERY).pipe(takeUntil(this.destroy$)).subscribe(state => this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches);
  }

  ngOnInit(): void {
    this.carregar();
  }

  carregar(): void {
    this.carregando = true; this.erro = null; this.semPermissao = false;
    this.service.listarFormatos().pipe(finalize(() => this.carregando = false)).subscribe({
      next: (items) => {
        this.formatos = items || [];
        this.pagina = 0;
      },
      error: (error) => { this.semPermissao = error?.status === 403; this.erro = catalogoErrorMessage(error, 'Não foi possível carregar formatos.'); this.toastr.error(this.erro); },
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

  clonar(item: GraficaFormato): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Clonar formato',
        message: `Deseja criar um formato a partir de "${item.nome}"?`,
        confirmText: 'Clonar',
        ...(this.isMobile ? { type: 'default', confirmColor: 'primary' } : {}),
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.router.navigate(['/page/grafica/formatos/novo'], { queryParams: { cloneFrom: item.id } });
    });
  }

  excluir(item: GraficaFormato): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir formato',
        message: `Deseja excluir "${item.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
        ...(this.isMobile ? { type: 'destructive' } : {}),
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
    if (!item.largura || !item.altura || !item.unidadeDimensao) return 'Sem dimensão física';
    return `${this.numero(item.largura)} x ${this.numero(item.altura)} ${this.unidade(item.unidadeDimensao)}`;
  }

  dimensaoUtil(item: GraficaFormato): string {
    if (!item.larguraUtil || !item.alturaUtil || !item.unidadeDimensao) return '-';
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
