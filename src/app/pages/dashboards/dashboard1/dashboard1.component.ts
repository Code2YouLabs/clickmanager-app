import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AppReceitaResumoComponent } from 'src/app/components/dashboard1/receita-resumo/receita-resumo.component';
import { AppComparativoPedidosComponent } from 'src/app/components/dashboard1/comparativo-pedidos/comparativo-pedidos.component';
import { DashboardService, GraficaDashboardIndicador, GraficaDashboardVisaoGeralResponse } from 'src/app/components/dashboard1/dashboard.service';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AppStatusGridComponent } from 'src/app/components/dashboard1/status-grid/status-grid.component';
import { MetricCardAccent, MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';

interface DashboardSummaryCard {
  key: 'receita' | 'pedidos' | 'orcamentos' | 'rascunhos';
  label: string;
  value: string;
  amount?: string;
  routeStatus?: string;
  route: string;
  queryParams?: Record<string, string>;
  requiredPermission?: string[];
  featureKey?: string;
  navigable?: boolean;
  accent?: MetricCardAccent;
  icon: string;
}

interface DashboardQuickAction {
  label: string;
  description: string;
  icon: string;
  route: string;
  requiredPermission?: string[];
  featureKey?: string;
}

interface DashboardRefreshState {
  id: 'comparativo' | 'status' | 'receita';
  refreshing: boolean;
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
export class AppDashboard1Component implements OnInit, OnDestroy {
  loading = true;
  refreshingSummary = false;
  erro: string | null = null;
  erroAtualizacao: string | null = null;
  visaoGeral: GraficaDashboardVisaoGeralResponse | null = null;
  refreshToken = 0;
  private resumoRequestId = 0;
  private readonly widgetRefreshes = new Set<DashboardRefreshState['id']>();
  private readonly subscriptions = new Subscription();
  summaryCards: DashboardSummaryCard[] = [
    { key: 'receita', label: 'Receita do mês', value: 'R$ 0,00', accent: 'primary', icon: 'cash', route: '/dashboards/dashboard1/grafico', queryParams: { tipo: 'receita' } },
    { key: 'pedidos', label: 'Pedidos', value: '0', amount: 'R$ 0,00', accent: 'neutral', icon: 'clipboard-list', route: '/page/grafica/comercial-beta/pedidos', requiredPermission: ['PEDIDOS_VER', 'GRAFICA_PRODUTOS_VER'] },
    { key: 'orcamentos', label: 'Orçamentos', value: '0', amount: 'R$ 0,00', accent: 'warning', icon: 'file-dollar', route: '/page/grafica/comercial-beta/orcamentos', requiredPermission: ['ORCAMENTOS_VER', 'GRAFICA_PRODUTOS_VER'] },
    { key: 'rascunhos', label: 'Rascunhos', value: '0', amount: 'R$ 0,00', accent: 'success', icon: 'edit', route: '/page/grafica/comercial-beta/rascunhos', requiredPermission: ['GRAFICA_PRODUTOS_VER'] },
  ];
  private readonly quickActionCatalog: DashboardQuickAction[] = [
    {
      label: 'Novo pedido',
      description: 'Abrir fluxo comercial',
      icon: 'add',
      route: '/page/grafica/comercial-beta/pedidos/novo',
      requiredPermission: ['PEDIDOS_CADASTRAR', 'GRAFICA_PRODUTOS_VER'],
    },
    {
      label: 'Rascunhos',
      description: 'Continuar atendimentos',
      icon: 'draft',
      route: '/page/grafica/comercial-beta/rascunhos',
      requiredPermission: ['GRAFICA_PRODUTOS_VER'],
    },
    {
      label: 'SmartCalc',
      description: 'Calcular aproveitamento',
      icon: 'calculate',
      route: '/smartcalc',
      featureKey: 'SMARTCALC',
      requiredPermission: ['SMARTCALC_USAR'],
    },
  ];
  quickActions: DashboardQuickAction[] = [];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private authService: AuthService,
    private featureFlagService: FeatureFlagService
  ) {}

  ngOnInit(): void {
    this.atualizarAcessos();
    this.subscriptions.add(
      this.featureFlagService.carregar().subscribe(() => this.atualizarAcessos())
    );
    this.carregarResumo();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  abrirResumo(card: DashboardSummaryCard): void {
    if (!card.navigable) return;
    this.router.navigate([card.route], { queryParams: card.queryParams || (card.routeStatus ? { status: card.routeStatus } : {}) });
  }

  navegar(route: string): void {
    this.router.navigate([route]);
  }

  get podeCriarPedido(): boolean {
    return this.temAcesso(['PEDIDOS_CADASTRAR', 'GRAFICA_PRODUTOS_VER']);
  }

  get atualizando(): boolean {
    return this.refreshingSummary || this.widgetRefreshes.size > 0;
  }

  get periodoReceita(): string {
    return this.visaoGeral?.receita?.label || 'Mês atual';
  }

  atualizarDashboard(): void {
    this.refreshToken += 1;
    this.carregarResumo();
  }

  onWidgetRefreshState(state: DashboardRefreshState): void {
    if (state.refreshing) {
      this.widgetRefreshes.add(state.id);
    } else {
      this.widgetRefreshes.delete(state.id);
    }
  }

  carregarResumo(): void {
    const requestId = ++this.resumoRequestId;
    const hadData = this.visaoGeral !== null;
    this.loading = !hadData;
    this.refreshingSummary = hadData;
    this.erro = null;
    this.erroAtualizacao = null;

    this.dashboardService.obterVisaoGeralGrafica().subscribe({
      next: (resumo) => {
        if (requestId !== this.resumoRequestId) return;
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
            route: '/dashboards/dashboard1/grafico',
            queryParams: { tipo: 'receita' },
          },
          this.toSummaryCard('pedidos', 'Pedidos', pedidos, 'neutral', 'clipboard-list', '/page/grafica/comercial-beta/pedidos', ['PEDIDOS_VER', 'GRAFICA_PRODUTOS_VER']),
          this.toSummaryCard('orcamentos', 'Orçamentos', orcamentos, 'warning', 'file-dollar', '/page/grafica/comercial-beta/orcamentos', ['ORCAMENTOS_VER', 'GRAFICA_PRODUTOS_VER']),
          this.toSummaryCard('rascunhos', 'Rascunhos', rascunhos, 'success', 'edit', '/page/grafica/comercial-beta/rascunhos', ['GRAFICA_PRODUTOS_VER']),
        ];
        this.atualizarAcessos();

        this.loading = false;
        this.refreshingSummary = false;
      },
      error: () => {
        if (requestId !== this.resumoRequestId) return;
        if (hadData) {
          this.erroAtualizacao = 'Não foi possível atualizar os indicadores. Mantivemos os dados anteriores.';
        } else {
          this.erro = 'Não foi possível carregar os indicadores do dashboard.';
        }
        this.loading = false;
        this.refreshingSummary = false;
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
    route: string,
    requiredPermission: string[],
  ): DashboardSummaryCard {
    return {
      key,
      label,
      value: `${indicador.quantidade || 0}`,
      amount: this.formatBRL(indicador.valor || 0),
      accent,
      icon,
      route,
      requiredPermission,
    };
  }

  private atualizarAcessos(): void {
    this.summaryCards = this.summaryCards.map((card) => ({ ...card, navigable: this.podeNavegar(card) }));
    this.quickActions = this.quickActionCatalog.filter((action) => this.podeNavegar(action));
  }

  private podeNavegar(item: Pick<DashboardSummaryCard, 'requiredPermission' | 'featureKey'>): boolean {
    const hasFeature = item.featureKey ? this.featureFlagService.isEnabled(item.featureKey) : true;
    return hasFeature && this.temAcesso(item.requiredPermission || []);
  }

  private temAcesso(permissoes: string[]): boolean {
    if (!permissoes.length) return true;
    return permissoes.some((permissao) => this.authService.temPermissao(permissao));
  }

  private formatBRL(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }
}
