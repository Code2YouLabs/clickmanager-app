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
    DataTableItemDirective,
  ],
  template: `
    <app-page-card titulo="Serviços gráficos" subtitulo="Serviços usados na configuração de produtos gráficos" [primaryAction]="isMobile ? novaAcao : null" (primaryActionClick)="novoMobile()">
      @if (!isMobile) {
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo serviço
        </button>
      </div>
      }

      <app-data-table
        [columns]="columns"
        [data]="servicosPaginados" [actions]="isMobile ? mobileActions : []" (action)="onMobileAction($event)"
        [error]="isMobile ? erro : null" [forbidden]="isMobile && semPermissao" (retry)="carregar()"
        [search]="searchConfig"
        [pagination]="pagination"
        [loading]="isMobile ? carregando && !servicosPaginados.length : carregando" [refreshing]="isMobile && carregando && !!servicosPaginados.length"
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
            <button mat-icon-button type="button" matTooltip="Clonar" [attr.aria-label]="'Clonar ' + row.nome" (click)="clonar(row)">
              <mat-icon>content_copy</mat-icon>
            </button>
            <button mat-icon-button type="button" color="warn" matTooltip="Excluir" [attr.aria-label]="'Excluir ' + row.nome" (click)="excluir(row)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </ng-template>
        <ng-template [appDataTableItem]="servicosPaginados" let-item let-itemActions="actions" let-emit="emitAction">
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
            <p class="cadastro-mobile-item__price">{{ precoResumo(item) }}</p>
          </article>
        </ng-template>
      </app-data-table>
    </app-page-card>
  `,
  styleUrl: './grafica-servicos.component.scss',
})
export class GraficaServicosComponent implements OnInit, OnDestroy {
  isMobile = false;
  erro: string | null = null;
  semPermissao = false;
  private readonly destroy$ = new Subject<void>();
  readonly novaAcao = { label: 'Novo serviço', icon: 'add', permission: 'GRAFICA_PRODUTOS_EDITAR' };
  readonly mobileActions: DataTableAction<GraficaServico>[] = [
    { id: 'editar', label: 'Editar', icon: 'edit', visible: () => this.podeEditarMobile },
    { id: 'clonar', label: 'Clonar', icon: 'content_copy', visible: () => this.podeEditarMobile },
    { id: 'excluir', label: 'Excluir', icon: 'delete', color: 'warn', visible: () => this.podeEditarMobile },
  ];
  get podeEditarMobile(): boolean { return !!this.auth?.temPermissao('GRAFICA_PRODUTOS_EDITAR'); }
  novoMobile(): void { if (this.podeEditarMobile) this.novo(); }
  onMobileAction(event: DataTableActionEvent<GraficaServico>): void {
    if (!this.podeEditarMobile || this.carregando || this.semPermissao) return;
    if (event.action === 'editar') this.editar(event.row);
    else if (event.action === 'clonar') this.clonar(event.row);
    else if (event.action === 'excluir') this.excluir(event.row);
  }
  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }
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
    this.service.listarServicos().pipe(finalize(() => this.carregando = false)).subscribe({
      next: (items) => {
        this.servicos = items || [];
        this.pagina = 0;
      },
      error: (error) => { this.semPermissao = error?.status === 403; this.erro = catalogoErrorMessage(error, 'Não foi possível carregar serviços.'); this.toastr.error(this.erro); },
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

  clonar(item: GraficaServico): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Clonar serviço',
        message: `Deseja criar um serviço a partir de "${item.nome}"?`,
        confirmText: 'Clonar',
        ...(this.isMobile ? { type: 'default', confirmColor: 'primary' } : {}),
      },
    });

    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.router.navigate(['/page/grafica/servicos/novo'], { queryParams: { cloneFrom: item.id } });
    });
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
        ...(this.isMobile ? { type: 'destructive' } : {}),
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
