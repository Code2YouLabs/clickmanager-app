import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AppReceitaResumoComponent } from 'src/app/components/dashboard1/receita-resumo/receita-resumo.component';
import { AppComparativoPedidosComponent } from 'src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component';
import { DashboardService, GraficaDashboardIndicador } from 'src/app/components/dashboard1/dashboard.service';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';
import { AppStatusGridComponent } from 'src/app/components/dashboard1/status-grid/status-grid.component';

interface DashboardSummaryCard {
  key: 'receita' | 'pedidos' | 'orcamentos' | 'rascunhos';
  label: string;
  value: string;
  amount?: string;
  routeStatus?: string;
  accent?: 'primary' | 'success' | 'warning' | 'neutral';
}

@Component({
  selector: 'app-dashboard1',
  standalone: true,
  imports: [
    CommonModule,
    AppStatusGridComponent,
    AppReceitaResumoComponent,
    AppComparativoPedidosComponent
  ],
  templateUrl: './dashboard1.component.html',
  styleUrls: ['./dashboard1.component.scss'],
})
export class AppDashboard1Component implements OnInit {
  mobileSummaryCards: DashboardSummaryCard[] = [
    { key: 'pedidos', label: 'Pedidos', value: '0', accent: 'neutral' },
    { key: 'orcamentos', label: 'Orçamentos', value: '0', accent: 'warning' },
    { key: 'rascunhos', label: 'Rascunhos', value: '0', accent: 'success' },
  ];
  desktopSummaryCards: DashboardSummaryCard[] = [
    { key: 'receita', label: 'Receita', value: 'R$ 0,00', accent: 'primary' },
    { key: 'pedidos', label: 'Pedidos', value: '0', accent: 'neutral' },
    { key: 'orcamentos', label: 'Orçamentos', value: '0', accent: 'warning' },
    { key: 'rascunhos', label: 'Rascunhos', value: '0', accent: 'success' },
  ];

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  async ngOnInit(): Promise<void> {
    await this.carregarResumo();
  }

  abrirResumo(card: DashboardSummaryCard): void {
    const routes: Record<DashboardSummaryCard['key'], string> = {
      receita: '/dashboards/dashboard1/grafico',
      pedidos: '/page/grafica/comercial-beta/pedidos',
      orcamentos: '/page/grafica/comercial-beta/orcamentos',
      rascunhos: '/page/grafica/comercial-beta/rascunhos',
    };
    this.router.navigate([routes[card.key]], {
      queryParams: card.key === 'receita'
        ? { tipo: 'receita' }
        : card.routeStatus ? { status: card.routeStatus } : {}
    });
  }

  get heroReceita(): DashboardSummaryCard {
    return this.desktopSummaryCards.find((card) => card.key === 'receita') || this.desktopSummaryCards[0];
  }

  get heroMetricas(): DashboardSummaryCard[] {
    return this.desktopSummaryCards.filter((card) => card.key !== 'receita');
  }

  private async carregarResumo(): Promise<void> {
    const [resumo, receita] = await Promise.all([
      firstValueFrom(this.dashboardService.obterResumoGrafica()),
      firstValueFrom(
        this.dashboardService.obterReceitaResumo({ periodo: 'MES_ATUAL' })
      )
    ]);

    const pedidos = this.indicador(resumo.indicadores, 'PEDIDOS');
    const orcamentos = this.indicador(resumo.indicadores, 'ORCAMENTOS');
    const rascunhos = this.indicador(resumo.indicadores, 'RASCUNHOS');
    const valorReceita = receita.valorTotal || 0;
    const receitaPeriodo = this.formatBRL(valorReceita);

    this.mobileSummaryCards = [
      this.toSummaryCard('pedidos', 'Pedidos', pedidos, 'neutral'),
      this.toSummaryCard('orcamentos', 'Orçamentos', orcamentos, 'warning'),
      this.toSummaryCard('rascunhos', 'Rascunhos', rascunhos, 'success'),
    ];

    this.desktopSummaryCards = [
      { key: 'receita', label: 'Receita', value: receitaPeriodo, accent: 'primary' },
      this.toSummaryCard('pedidos', 'Pedidos', pedidos, 'neutral'),
      this.toSummaryCard('orcamentos', 'Orçamentos', orcamentos, 'warning'),
      this.toSummaryCard('rascunhos', 'Rascunhos', rascunhos, 'success'),
    ];
  }

  private indicador(indicadores: GraficaDashboardIndicador[], codigo: string): GraficaDashboardIndicador {
    return indicadores.find((item) => item.codigo === codigo)
      || { codigo, label: codigo, quantidade: 0, valor: 0 };
  }

  private toSummaryCard(
    key: Extract<DashboardSummaryCard['key'], 'pedidos' | 'orcamentos' | 'rascunhos'>,
    label: string,
    indicador: GraficaDashboardIndicador,
    accent: DashboardSummaryCard['accent'],
  ): DashboardSummaryCard {
    return {
      key,
      label,
      value: `${indicador.quantidade || 0}`,
      amount: this.formatBRL(indicador.valor || 0),
      accent,
    };
  }

  private formatBRL(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }
}
