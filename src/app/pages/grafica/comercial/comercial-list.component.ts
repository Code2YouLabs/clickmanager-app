import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PageEvent } from '@angular/material/paginator';
import { combineLatest, Observable, Subject, Subscription, takeUntil } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn, DataTablePagination, DataTableFilter, DataTableFilterState } from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { MaterialModule } from 'src/app/material.module';
import { GraficaPagina } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

import { COMERCIAL_LISTA, ComercialTipo } from './comercial.models';

@Component({
  selector: 'app-grafica-comercial-list',
  standalone: true,
  imports: [CommonModule, MaterialModule, PageCardComponent, DataTableComponent, DataTableCellDirective],
  templateUrl: './comercial-list.component.html',
  styleUrl: './comercial-list.component.scss',
})
export class ComercialListComponent implements OnInit, OnDestroy {
  itens: any[] = [];
  busca = '';
  pagina = 0;
  tamanho = 10;
  totalItens = 0;
  carregando = false;
  erro: string | null = null;
  acessoNegado = false;
  private request?: Subscription;
  private readonly destroy$ = new Subject<void>();
  tipo: ComercialTipo = 'rascunhos';
  statusFiltro: string | null = null;
  columns: DataTableColumn<any>[] = [
    { key: 'referencia', label: 'Número', width: '160px' },
    { key: 'createdAt', label: 'Data de criação', width: '190px' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'status', label: 'Status', width: '140px' },
    { key: 'total', label: 'Total', width: '140px', align: 'end' },
  ];
  actions: DataTableAction<any>[] = [
    { id: 'abrir', label: 'Ver', icon: 'visibility', color: 'primary' },
  ];
  emptyState = {
    title: 'Nenhum registro encontrado',
    description: 'Crie um novo registro comercial para começar.',
    filteredTitle: 'Nenhum resultado encontrado',
    filteredDescription: 'Altere a busca para localizar outros registros.',
  };
  rowKey = (item: any) => item.id || item.pedidoId || item.orcamentoId || item.protocolo || item.numero;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly graficaService: GraficaProdutoService,
  ) {}

  get configuracao() { return COMERCIAL_LISTA[this.tipo]; }
  get titulo(): string { return this.configuracao.titulo; }
  get subtitulo(): string { return this.configuracao.subtitulo; }
  get filters(): DataTableFilter[] {
    return [{ key: 'status', label: 'Status', type: 'select', options: this.configuracao.status.map(value => ({
      value, label: value.toLowerCase().replace(/_/g, ' ').replace(/^./, char => char.toUpperCase()),
    })) }];
  }
  get filterState(): DataTableFilterState { return { status: this.statusFiltro }; }
  filtrar(state: DataTableFilterState): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: { status: state['status'] || null }, queryParamsHandling: 'merge' });
  }

  get pagination(): DataTablePagination {
    return {
      pageIndex: this.pagina,
      pageSize: this.tamanho,
      totalItems: this.totalItens,
      pageSizeOptions: [10, 20, 50],
    };
  }

  get itensFiltrados(): any[] {
    return this.filtrarBusca(this.itens);
  }

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.queryParamMap]).pipe(takeUntil(this.destroy$)).subscribe(([data, params]) => {
      const tipo = data['tipo'] || 'rascunhos';
      if (tipo !== this.tipo) { this.itens = []; this.totalItens = 0; this.busca = ''; }
      this.tipo = tipo;
      this.statusFiltro = params.get('status');
      this.pagina = 0;
      this.carregar();
    });
  }

  ngOnDestroy(): void {
    this.request?.unsubscribe();
    this.destroy$.next(); this.destroy$.complete();
  }

  carregar(): void {
    this.request?.unsubscribe();
    this.carregando = true;
    this.erro = null;
    this.acessoNegado = false;
    const source: Observable<GraficaPagina<any>> = this.tipo === 'pedidos'
      ? this.graficaService.listarPedidosComerciais(this.pagina, this.tamanho, this.statusFiltroPedido())
      : this.tipo === 'orcamentos'
        ? this.graficaService.listarOrcamentosComerciais(this.pagina, this.tamanho, this.statusFiltroOrcamento())
        : this.graficaService.listarRascunhosComerciais(this.pagina, this.tamanho, this.statusFiltro);

    this.request = source.subscribe({
      next: (page: any) => {
        this.carregando = false;
        this.itens = page?.content || [];
        this.totalItens = page?.totalElements ?? this.itens.length;
      },
      error: (error) => {
        this.carregando = false;
        this.acessoNegado = error?.status === 403;
        this.erro = this.acessoNegado ? null : 'Não foi possível carregar os registros. Tente novamente.';
      },
    });
  }

  novo(): void {
    this.router.navigate(['/page/grafica/comercial', this.tipo, 'novo']);
  }

  abrir(item: any): void {
    const id = item.id || item.pedidoId || item.orcamentoId;
    if (id) this.router.navigate(['/page/grafica/comercial', this.tipo, id]);
  }

  buscar(valor: string): void {
    // The API has no text query. Search the loaded page explicitly; never claim global results.
    this.busca = valor || '';
  }

  paginar(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
    this.carregar();
  }

  onAction(event: DataTableActionEvent<any>): void {
    if (event.action === 'abrir') {
      this.abrir(event.row);
    }
  }

  referencia(item: any): string {
    return item.numero || item.protocolo || `#${item.id}`;
  }

  cliente(item: any): string | null {
    return item.clienteNome || item.nomeCliente || item.nomeContato || null;
  }

  dataCriacao(item: any): string | Date | null {
    return item.createdAt || item.dataCriacao || item.criadoEm || null;
  }

  responsavel(item: any): string {
    return item.responsavelNome || item.responsavel?.nome || item.usuarioResponsavelNome || '-';
  }

  total(item: any): number {
    return Number(item.total ?? item.totalEstimado ?? 0);
  }

  totalPago(item: any): number {
    return Number(item.totalPago ?? item.valorTotalPago ?? item.pago ?? 0);
  }

  restaPagar(item: any): number {
    const valor = item.restaPagar ?? item.valorRestante ?? item.restante;
    return valor === null || valor === undefined ? Math.max(this.total(item) - this.totalPago(item), 0) : Number(valor);
  }

  private filtrarBusca(itens: any[]): any[] {
    const termo = this.busca.trim().toLowerCase();
    if (!termo) return itens;
    return itens.filter((item) => [
      this.referencia(item),
      this.cliente(item),
      item.status,
    ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
  }

  private statusFiltroPedido(): string | null {
    return this.tipo === 'pedidos' ? this.statusFiltro : null;
  }

  private statusFiltroOrcamento(): string | null {
    return this.tipo === 'orcamentos' ? this.statusFiltro : null;
  }
}
