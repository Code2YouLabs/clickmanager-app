import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
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
  imports: [CommonModule, MaterialModule, CardHeaderComponent, MetricCardComponent],
  templateUrl: './links-analytics.component.html',
  styleUrls: ['../../links.scss', './links-analytics.component.scss'],
})
export class LinksAnalyticsComponent implements OnInit {
  paginas: PaginaLinksResumo[] = [];
  paginaSelecionadaId: number | null = null;
  analytics: LinksAnalyticsResumo | null = null;
  periodo: PeriodoAnalyticsLinks = '30d';
  carregandoPaginas = true;
  carregandoAnalytics = false;
  erro = false;
  readonly permissoes = LINKS_PERMISSOES;
  readonly colunasRanking = ['link', 'tipo', 'cliques'];

  constructor(private readonly linksService: LinksService) {}

  ngOnInit(): void {
    this.carregarPaginas();
  }

  carregarPaginas(): void {
    this.carregandoPaginas = true;
    this.erro = false;
    this.linksService.listarPaginas().subscribe({
      next: (paginas) => {
        this.paginas = paginas || [];
        this.carregandoPaginas = false;
        this.paginaSelecionadaId = this.paginas[0]?.id ?? null;
        this.carregarAnalytics();
      },
      error: () => {
        this.carregandoPaginas = false;
        this.erro = true;
      },
    });
  }

  selecionarPagina(id: number): void {
    if (this.paginaSelecionadaId === id) return;
    this.paginaSelecionadaId = id;
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
    this.carregandoAnalytics = true;
    this.erro = false;
    this.linksService.buscarAnalytics(this.paginaSelecionadaId, this.periodo).subscribe({
      next: (analytics) => {
        this.analytics = analytics;
        this.carregandoAnalytics = false;
      },
      error: () => {
        this.analytics = null;
        this.carregandoAnalytics = false;
        this.erro = true;
      },
    });
  }

  ranking(): LinksAnalyticsRankingItem[] {
    return this.analytics?.ranking || [];
  }

  tipoLabel(tipo: TipoItemLinks): string {
    return TIPOS_ITEM_LINKS.find((item) => item.tipo === tipo)?.label || tipo;
  }

  numeroFormatado(valor: number | null | undefined): string {
    return Number(valor || 0).toLocaleString('pt-BR');
  }

  percentualFormatado(valor: number | null | undefined): string {
    return `${Number(valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
  }
}
