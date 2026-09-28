import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { catchError, distinctUntilChanged, map, of, Subject, switchMap, takeUntil, tap } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableColumn, DataTableEmptyState } from 'src/app/components/data-table/data-table.models';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { MaterialModule } from 'src/app/material.module';
import { MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import {
  LINKS_PERMISSOES,
  LinksAnalyticsRankingItem,
  LinksAnalyticsResumo,
  PaginaLinksResumo,
  PeriodoAnalyticsLinks,
  TIPOS_ITEM_LINKS,
  TipoItemLinks,
} from '../../models/links.models';
import { LinksService } from '../../services/links.service';

@Component({
  selector: 'app-links-analytics',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    MetricCardComponent,
    InputOptionsComponent,
    DataTableComponent,
    DataTableCellDirective,
  ],
  templateUrl: './links-analytics.component.html',
  styleUrls: ['../../links.scss', './links-analytics.component.scss'],
})
export class LinksAnalyticsComponent implements OnInit, OnDestroy {
  paginas: PaginaLinksResumo[] = [];
  paginaSelecionadaId: number | null = null;
  analytics: LinksAnalyticsResumo | null = null;
  periodo: PeriodoAnalyticsLinks = '30d';
  carregandoPaginas = false;
  carregandoAnalytics = false;
  erroPaginas: string | null = null;
  erroAnalytics: string | null = null;
  semPermissaoPaginas = false;
  semPermissaoAnalytics = false;
  readonly permissoes = LINKS_PERMISSOES;
  readonly paginaControl = new FormControl<number | null>({ value: null, disabled: true });
  readonly periodos: Array<{ value: PeriodoAnalyticsLinks; label: string }> = [
    { value: '7d', label: '7 dias' },
    { value: '30d', label: '30 dias' },
  ];
  readonly colunasRanking: DataTableColumn<LinksAnalyticsRankingItem>[] = [
    { key: 'link', label: 'Link' },
    { key: 'tipo', label: 'Tipo', width: '180px' },
    { key: 'cliques', label: 'Cliques', width: '120px', align: 'end' },
  ];
  readonly rankingEmptyState: DataTableEmptyState = {
    title: 'Ainda não há cliques neste período.',
    description: '',
  };

  private readonly carregarPaginas$ = new Subject<void>();
  private readonly analyticsRequest$ = new Subject<{ paginaId: number; periodo: PeriodoAnalyticsLinks }>();
  private readonly destroy$ = new Subject<void>();

  constructor(private readonly linksService: LinksService) {}

  ngOnInit(): void {
    this.paginaControl.valueChanges
      .pipe(distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe((id) => this.selecionarPagina(id));

    this.carregarPaginas$
      .pipe(
        tap(() => this.iniciarCarregamentoPaginas()),
        switchMap(() => this.linksService.listarPaginas().pipe(
          map((paginas) => ({ paginas: paginas || [], error: null as HttpErrorResponse | null })),
          catchError((error: HttpErrorResponse) => of({ paginas: [] as PaginaLinksResumo[], error })),
        )),
        takeUntil(this.destroy$),
      )
      .subscribe(({ paginas, error }) => {
        this.carregandoPaginas = false;
        if (error) {
          this.tratarErroPaginas(error);
          return;
        }
        this.paginas = paginas;
        if (!this.paginas.length) {
          this.paginaSelecionadaId = null;
          this.paginaControl.setValue(null, { emitEvent: false });
          this.analytics = null;
          return;
        }
        const primeiraPaginaId = this.paginas[0].id;
        this.paginaSelecionadaId = primeiraPaginaId;
        this.paginaControl.setValue(primeiraPaginaId, { emitEvent: false });
        this.carregarAnalytics();
      });

    this.analyticsRequest$
      .pipe(
        tap(() => this.iniciarCarregamentoAnalytics()),
        switchMap(({ paginaId, periodo }) => this.linksService.buscarAnalytics(paginaId, periodo).pipe(
          map((analytics) => ({ analytics, error: null as HttpErrorResponse | null })),
          catchError((error: HttpErrorResponse) => of({ analytics: null as LinksAnalyticsResumo | null, error })),
        )),
        takeUntil(this.destroy$),
      )
      .subscribe(({ analytics, error }) => {
        this.carregandoAnalytics = false;
        if (error) {
          this.tratarErroAnalytics(error);
          return;
        }
        this.analytics = analytics;
        this.paginaControl.enable({ emitEvent: false });
      });

    this.carregarPaginas();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  carregarPaginas(): void {
    this.carregarPaginas$.next();
  }

  selecionarPagina(id: number | null): void {
    if (!id || this.paginaSelecionadaId === id) return;
    this.paginaSelecionadaId = id;
    if (this.paginaControl.value !== id) {
      this.paginaControl.setValue(id, { emitEvent: false });
    }
    this.carregarAnalytics();
  }

  alterarPeriodo(periodo: PeriodoAnalyticsLinks): void {
    if (this.periodo === periodo) return;
    this.periodo = periodo;
    this.carregarAnalytics();
  }

  carregarAnalytics(): void {
    if (!this.paginaSelecionadaId) {
      this.analytics = null;
      return;
    }
    this.analyticsRequest$.next({ paginaId: this.paginaSelecionadaId, periodo: this.periodo });
  }

  ranking(): LinksAnalyticsRankingItem[] {
    return this.analytics?.ranking || [];
  }

  tipoLabel(tipo: TipoItemLinks): string {
    return TIPOS_ITEM_LINKS.find((item) => item.tipo === tipo)?.label || tipo;
  }

  numeroFormatado(valor: number | null | undefined): string {
    return Number(valor ?? 0).toLocaleString('pt-BR');
  }

  percentualFormatado(valor: number | null | undefined): string {
    return `${Number(valor ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }

  get paginaSelecionada(): PaginaLinksResumo | null {
    return this.paginas.find((pagina) => pagina.id === this.paginaSelecionadaId) || null;
  }

  private iniciarCarregamentoPaginas(): void {
    this.carregandoPaginas = true;
    this.erroPaginas = null;
    this.semPermissaoPaginas = false;
    this.erroAnalytics = null;
    this.semPermissaoAnalytics = false;
    this.paginas = [];
    this.paginaSelecionadaId = null;
    this.paginaControl.disable({ emitEvent: false });
    this.paginaControl.setValue(null, { emitEvent: false });
    this.analytics = null;
  }

  private iniciarCarregamentoAnalytics(): void {
    this.carregandoAnalytics = true;
    this.erroAnalytics = null;
    this.semPermissaoAnalytics = false;
    this.paginaControl.disable({ emitEvent: false });
    this.analytics = null;
  }

  private tratarErroPaginas(error: HttpErrorResponse): void {
    this.paginas = [];
    this.paginaSelecionadaId = null;
    this.paginaControl.setValue(null, { emitEvent: false });
    this.analytics = null;
    this.semPermissaoPaginas = error.status === 403;
    this.erroPaginas = this.semPermissaoPaginas ? null : (error.error?.message || 'Não foi possível carregar as páginas ClickLink.');
  }

  private tratarErroAnalytics(error: HttpErrorResponse): void {
    this.analytics = null;
    this.semPermissaoAnalytics = error.status === 403;
    this.erroAnalytics = this.semPermissaoAnalytics ? null : (error.error?.message || 'Não foi possível carregar as métricas.');
    this.paginaControl.enable({ emitEvent: false });
  }
}
