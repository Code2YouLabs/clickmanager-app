import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppReceitaResumoComponent } from 'src/app/components/dashboard1/receita-resumo/receita-resumo.component';
import { AppComparativoPedidosComponent } from 'src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component';
import { DashboardService, GraficaDashboardIndicador, GraficaDashboardVisaoGeralResponse } from 'src/app/components/dashboard1/dashboard.service';
import { Router } from '@angular/router';
import { AppStatusGridComponent } from 'src/app/components/dashboard1/status-grid/status-grid.component';
import { MetricCardAccent, MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';

interface DashboardSummaryCard {
  key: 'receita' | 'pedidos' | 'orcamentos' | 'rascunhos';
  label: string;
  value: string;
  amount?: string;
  routeStatus?: string;
  accent?: MetricCardAccent;
  icon: string;
}

interface DashboardQuickAction {
  label: string;
  description: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-dashboard1',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    PageCardComponent,
    SectionCardComponent,
    MetricCardComponent,
    AppStatusGridComponent,
    AppReceitaResumoComponent,
    AppComparativoPedidosComponent
  ],
  templateUrl: './dashboard1.component.html',
  styleUrls: ['./dashboard1.component.scss'],
})
export class AppDashboard1Component implements OnInit {
  loading = true;
  erro: string | null = null;
  visaoGeral: GraficaDashboardVisaoGeralResponse | null = null;
  summaryCards: DashboardSummaryCard[] = [
    { key: 'receita', label: 'Receita do mês', value: 'R$ 0,00', accent: 'primary', icon: 'cash' },
    { key: 'pedidos', label: 'Pedidos', value: '0', amount: 'R$ 0,00', accent: 'neutral', icon: 'clipboard-list' },
    { key: 'orcamentos', label: 'Orçamentos', value: '0', amount: 'R$ 0,00', accent: 'warning', icon: 'file-dollar' },
    { key: 'rascunhos', label: 'Rascunhos', value: '0', amount: 'R$ 0,00', accent: 'success', icon: 'edit' },
  ];
  quickActions: DashboardQuickAction[] = [
    {
      label: 'Novo pedido',
      description: 'Abrir fluxo comercial',
      icon: 'add',
      route: '/page/grafica/comercial-beta/pedidos/novo',
    },
    {
      label: 'Rascunhos',
      description: 'Continuar atendimentos',
      icon: 'draft',
      route: '/page/grafica/comercial-beta/rascunhos',
    },
    {
      label: 'SmartCalc',
      description: 'Calcular aproveitamento',
      icon: 'calculate',
      route: '/smartcalc',
    },
  ];

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarResumo();
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

  navegar(route: string): void {
    this.router.navigate([route]);
  }

  get periodoReceita(): string {
    return this.visaoGeral?.receita?.label || 'Mês atual';
  }

  carregarResumo(): void {
    this.loading = true;
    this.erro = null;

    this.dashboardService.obterVisaoGeralGrafica().subscribe({
      next: (resumo) => {
        this.visaoGeral = resumo;
        const pedidos = this.indicador(resumo.indicadores, 'PEDIDOS');
        const orcamentos = this.indicador(resumo.indicadores, 'ORCAMENTOS');
        const rascunhos = this.indicador(resumo.indicadores, 'RASCUNHOS');

        this.summaryCards = [
          {
            key: 'receita',
            label: 'Receita do mês',
            value: this.formatBRL(resumo.receita?.valorTotal || 0),
            amount: `${resumo.receita?.totalPedidos || 0} pedidos pagos`,
            accent: 'primary',
            icon: 'cash',
          },
          this.toSummaryCard('pedidos', 'Pedidos', pedidos, 'neutral', 'clipboard-list'),
          this.toSummaryCard('orcamentos', 'Orçamentos', orcamentos, 'warning', 'file-dollar'),
          this.toSummaryCard('rascunhos', 'Rascunhos', rascunhos, 'success', 'edit'),
        ];

        this.loading = false;
      },
      error: (err) => {
        console.error('[Dashboard] erro ao carregar visão geral', err);
        this.erro = 'Não foi possível carregar os indicadores do dashboard.';
        this.loading = false;
      },
    });
  }

  private indicador(indicadores: GraficaDashboardIndicador[], codigo: string): GraficaDashboardIndicador {
    return indicadores.find((item) => item.codigo === codigo)
      || { codigo, label: codigo, quantidade: 0, valor: 0 };
  }

  private toSummaryCard(
    key: Extract<DashboardSummaryCard['key'], 'pedidos' | 'orcamentos' | 'rascunhos'>,
    label: string,
    indicador: GraficaDashboardIndicador,
    accent: MetricCardAccent,
    icon: string,
  ): DashboardSummaryCard {
    return {
      key,
      label,
      value: `${indicador.quantidade || 0}`,
      amount: this.formatBRL(indicador.valor || 0),
      accent,
      icon,
    };
  }

  private formatBRL(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }
}
