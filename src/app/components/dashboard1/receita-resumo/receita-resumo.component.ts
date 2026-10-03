import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ApexChart,
  ApexLegend,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ChartComponent,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import {
  DashboardService,
  ReceitaResumoRequest,
  ReceitaResumoResponse,
  FormaPagamento,
  Periodo
} from '../dashboard.service';
import { Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { SectionCardComponent } from '../../section-card/section-card.component';

type DonutChart = {
  series: number[];
  chart: ApexChart;
  plotOptions: ApexPlotOptions;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  labels: string[];
  colors: string[];
};

@Component({
  selector: 'app-receita-resumo',
  standalone: true,
  imports: [MaterialModule, NgApexchartsModule, TablerIconsModule, CommonModule, SectionCardComponent],
  templateUrl: './receita-resumo.component.html',
  styleUrls: ['./receita-resumo.component.scss'],
})
export class AppReceitaResumoComponent implements OnInit, OnChanges, OnDestroy {
  @Input() refreshToken = 0;
  @Output() refreshState = new EventEmitter<{ id: 'receita'; refreshing: boolean }>();
  @ViewChild('chart') chart?: ChartComponent;
  private requestId = 0;
  private readonly subscriptions = new Subscription();

  // -------- Filtros de período (front) --------
  ranges = [
    { id: 'mes_atual', shortLabel: 'Mês atual', label: 'Mês atual', periodo: 'MES_ATUAL' as Periodo },
    { id: 'ultimos_30', shortLabel: '30 dias', label: 'Últimos 30 dias', periodo: 'ULTIMOS_30' as Periodo },
    { id: 'mes_passado', shortLabel: 'Mês passado', label: 'Mês passado', periodo: 'MES_PASSADO' as Periodo },
    { id: 'ytd', shortLabel: 'Ano', label: 'Ano atual (YTD)', periodo: 'YTD' as Periodo },
  ] as const;
  selectedRange = 'mes_atual' as typeof this.ranges[number]['id'];
  loading = false;
  refreshing = false;
  erro: string | null = null;

  // -------- Totais no cabeçalho --------
  totalValor = 0; // R$
  totalPedidos = 0;

  // -------- Donut de formas de pagamento --------
  pagamentoLabels: Record<FormaPagamento, string> = {
    PIX: 'Pix',
    DINHEIRO: 'Dinheiro',
    CARTAO_CREDITO: 'Cartão Crédito',
    CARTAO_DEBITO: 'Cartão Débito',
    DEPOSITO: 'Depósito',
    BOLETO: 'Boleto',
  };

  pagamentoCores: Record<FormaPagamento, string> = {
    PIX: 'var(--mat-sys-primary)',
    DINHEIRO: '#22c55e',
    CARTAO_CREDITO: '#46caeb',
    CARTAO_DEBITO: '#60a5fa',
    DEPOSITO: '#0ea5e9',
    BOLETO: '#f59e0b',
  };

  chartData: DonutChart = {
    series: [],
    labels: [],
    colors: [],
    chart: {
      type: 'donut',
      height: 150,
      toolbar: { show: false },
      fontFamily: 'inherit',
      foreColor: '#adb0bb',
    },
    plotOptions: { pie: { donut: { size: '84%' } } },
    stroke: { show: false },
    legend: { show: false, position: 'bottom' },
    tooltip: {
      y: {
        formatter: (v: number) =>
          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v),
      },
    },
  };

  constructor(
    private dashboard: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarDoBack();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshToken'] && !changes['refreshToken'].firstChange) {
      this.carregarDoBack();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  onRangeChange(): void {
    this.carregarDoBack();
  }

  abrirGraficoReceita(): void {
    this.router.navigate(['/dashboards/dashboard1/grafico'], {
      queryParams: {
        tipo: 'receita',
        periodo: this.selectedRange
      }
    });
  }

  // ======== Backend =======
  carregarDoBack(): void {
    const currentRequestId = ++this.requestId;
    const hasData = this.chartData.series.length > 0;
    const periodo = this.ranges.find(r => r.id === this.selectedRange)!.periodo;

    this.loading = !hasData;
    this.refreshing = hasData;
    this.erro = null;
    this.refreshState.emit({ id: 'receita', refreshing: true });

    const req: ReceitaResumoRequest = { periodo };
    const subscription = this.dashboard.obterReceitaResumo(req).subscribe({
      next: (resp: ReceitaResumoResponse) => {
        if (currentRequestId !== this.requestId) return;

        this.totalValor = resp.valorTotal ?? 0;
        this.totalPedidos = resp.totalPedidos ?? 0;

        const formas: FormaPagamento[] = ['PIX','DINHEIRO','CARTAO_CREDITO','CARTAO_DEBITO','DEPOSITO','BOLETO'];
        const mapa = new Map<FormaPagamento, number>();
        for (const f of resp.porForma || []) mapa.set(f.forma, f.valor ?? 0);

        const series = formas.map(f => mapa.get(f) ?? 0);
        const labels = formas.map(f => this.pagamentoLabels[f]);
        const colors = formas.map(f => this.pagamentoCores[f]);

        this.chartData = { ...this.chartData, series, labels, colors };
      },
      error: () => {
        if (currentRequestId !== this.requestId) return;
        this.erro = hasData
          ? 'Não foi possível atualizar a receita. Mantivemos os dados anteriores.'
          : 'Não foi possível carregar a receita.';
        this.loading = false;
        this.refreshing = false;
        this.refreshState.emit({ id: 'receita', refreshing: false });
      },
      complete: () => {
        if (currentRequestId !== this.requestId) return;
        this.loading = false;
        this.refreshing = false;
        this.refreshState.emit({ id: 'receita', refreshing: false });
      },
    });

    this.subscriptions.add(subscription);
  }

  // ===== helpers de UI =====
  get selectedRangeLabel(): string {
    return this.ranges.find((range) => range.id === this.selectedRange)?.label || 'Mês atual';
  }

  get semMovimentacao(): boolean {
    return !this.chartData.series.some((value) => value > 0);
  }

  formatBRL(v: number) {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  }

}
