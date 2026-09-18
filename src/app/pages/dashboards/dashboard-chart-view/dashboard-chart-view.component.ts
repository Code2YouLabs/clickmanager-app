import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexPlotOptions,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
  NgApexchartsModule,
} from 'ng-apexcharts';

import { MaterialModule } from 'src/app/material.module';
import {
  DashboardComparativoResponse,
  DashboardService,
  FormaPagamento,
  Periodo,
  ReceitaResumoResponse,
} from 'src/app/components/dashboard1/dashboard.service';

type ChartMode = 'receita' | 'comparativo';
type ComparativoModo = 'quantidade' | 'receita';

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

type LineChart = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  yaxis: ApexYAxis | ApexYAxis[];
  xaxis: ApexXAxis;
  tooltip: ApexTooltip;
  stroke: ApexStroke;
  legend: ApexLegend;
  grid: ApexGrid;
  markers: ApexMarkers;
};

@Component({
  selector: 'app-dashboard-chart-view',
  standalone: true,
  imports: [CommonModule, MaterialModule, NgApexchartsModule],
  templateUrl: './dashboard-chart-view.component.html',
  styleUrls: ['./dashboard-chart-view.component.scss'],
})
export class AppDashboardChartViewComponent implements OnInit, AfterViewInit {
  @ViewChild('receitaChartRef') receitaChartRef?: ChartComponent;
  @ViewChild('comparativoChartRef') comparativoChartRef?: ChartComponent;

  mode: ChartMode = 'comparativo';
  loading = false;
  private viewReady = false;
  comparativoPaisagemAtivo = false;

  readonly receitaRanges = [
    { id: 'mes_atual', shortLabel: 'Hoje', periodo: 'MES_ATUAL' as Periodo },
    { id: 'ultimos_30', shortLabel: '30d', periodo: 'ULTIMOS_30' as Periodo },
    { id: 'mes_passado', shortLabel: 'Mês passado', periodo: 'MES_PASSADO' as Periodo },
    { id: 'ytd', shortLabel: 'Ano', periodo: 'YTD' as Periodo },
  ] as const;
  selectedRange = 'mes_atual';

  readonly meses = [
    { value: 0, viewValue: 'Jan' }, { value: 1, viewValue: 'Fev' }, { value: 2, viewValue: 'Mar' },
    { value: 3, viewValue: 'Abr' }, { value: 4, viewValue: 'Mai' }, { value: 5, viewValue: 'Jun' },
    { value: 6, viewValue: 'Jul' }, { value: 7, viewValue: 'Ago' }, { value: 8, viewValue: 'Set' },
    { value: 9, viewValue: 'Out' }, { value: 10, viewValue: 'Nov' }, { value: 11, viewValue: 'Dez' },
  ];
  anos: number[] = (() => {
    const ano = new Date().getFullYear();
    return [ano, ano - 1, ano - 2];
  })();
  modos: Array<{ value: ComparativoModo; label: string }> = [
    { value: 'quantidade', label: 'Qtd' },
    { value: 'receita', label: 'Valor' },
  ];
  mesA = new Date().getMonth();
  mesB = Math.max(0, new Date().getMonth() - 1);
  ano = new Date().getFullYear();
  comparativoModo: ComparativoModo = 'quantidade';

  receitaTotal = 0;
  receitaPedidos = 0;
  receitaLabels: string[] = [];
  receitaChart: DonutChart = {
    series: [],
    labels: [],
    colors: [],
    chart: {
      type: 'donut',
      height: 340,
      toolbar: { show: false },
      fontFamily: 'inherit',
      foreColor: '#94a3b8',
    },
    plotOptions: { pie: { donut: { size: '78%' } } },
    stroke: { show: false },
    legend: { show: false, position: 'bottom' },
    tooltip: {
      y: {
        formatter: (v: number) => this.formatBRL(v),
      },
    },
  };

  comparativoChart: LineChart = {
    series: [],
    chart: {
      type: 'line',
      height: 360,
      fontFamily: 'inherit',
      foreColor: '#94a3b8',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    legend: { show: true, position: 'top', horizontalAlign: 'left' },
    stroke: { width: 3, curve: 'smooth' },
    markers: { size: 0, hover: { size: 5 } },
    grid: { show: true, borderColor: 'rgba(148, 163, 184, 0.14)', strokeDashArray: 6 },
    xaxis: {
      type: 'category',
      categories: Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { show: true },
    },
    yaxis: {
      labels: { show: true, formatter: (v: number) => `${Math.round(v)}` },
      min: 0,
      max: 1,
      tickAmount: 4,
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => `${Math.round(v)}` },
    },
  };

  legendLabels: string[] = [];

  private readonly pagamentoLabels: Record<FormaPagamento, string> = {
    PIX: 'Pix',
    DINHEIRO: 'Dinheiro',
    CARTAO_CREDITO: 'Cartão Crédito',
    CARTAO_DEBITO: 'Cartão Débito',
    DEPOSITO: 'Depósito',
    BOLETO: 'Boleto',
  };

  private readonly pagamentoCores: Record<FormaPagamento, string> = {
    PIX: 'var(--mat-sys-primary)',
    DINHEIRO: '#22c55e',
    CARTAO_CREDITO: '#46caeb',
    CARTAO_DEBITO: '#60a5fa',
    DEPOSITO: '#0ea5e9',
    BOLETO: '#f59e0b',
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private dashboardService: DashboardService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    this.route.queryParamMap.subscribe(async (params) => {
      this.mode = (params.get('tipo') as ChartMode) || 'comparativo';
      this.selectedRange = params.get('periodo') || this.selectedRange;
      this.mesA = Number(params.get('mesA') ?? this.mesA);
      this.mesB = Number(params.get('mesB') ?? this.mesB);
      this.ano = Number(params.get('ano') ?? this.ano);
      this.comparativoModo = (params.get('modo') as ComparativoModo) || this.comparativoModo;
      await this.carregar();
    });
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.agendarRefreshGrafico();
  }

  voltar(): void {
    this.router.navigate(['/dashboards/dashboard1']);
  }

  async selecionarReceita(rangeId: string): Promise<void> {
    this.selectedRange = rangeId;
    await this.carregarReceita();
  }

  async alterarMesA(value: number): Promise<void> {
    this.mesA = value;
    await this.carregarComparativo();
  }

  async alterarMesB(value: number): Promise<void> {
    this.mesB = value;
    await this.carregarComparativo();
  }

  async alterarAno(value: number): Promise<void> {
    this.ano = value;
    await this.carregarComparativo();
  }

  async alterarModo(value: ComparativoModo): Promise<void> {
    this.comparativoModo = value;
    await this.carregarComparativo();
  }

  @HostListener('document:fullscreenchange')
  onFullscreenChange(): void {
    if (!document.fullscreenElement && this.comparativoPaisagemAtivo) {
      this.comparativoPaisagemAtivo = false;
      this.desbloquearOrientacao();
      this.agendarRefreshGrafico();
    }
  }

  mesLabel(index: number): string {
    return this.meses.find((mes) => mes.value === index)?.viewValue || '-';
  }

  formatBRL(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  get pageTitle(): string {
    return this.mode === 'receita' ? 'Receita por forma de pagamento' : 'Pedidos no período';
  }

  get canRotateComparativo(): boolean {
    return this.mode === 'comparativo';
  }

  get receitaSemDados(): boolean {
    return !this.receitaChart.series.some((value) => value > 0);
  }

  get receitaChartSeries(): number[] {
    return this.receitaSemDados ? [1] : this.receitaChart.series;
  }

  get receitaChartLabels(): string[] {
    return this.receitaSemDados ? ['Sem movimentação'] : this.receitaChart.labels;
  }

  get receitaChartColors(): string[] {
    return this.receitaSemDados ? ['#e2e8f0'] : this.receitaChart.colors;
  }

  private async carregar(): Promise<void> {
    if (this.mode === 'receita') {
      await this.carregarReceita();
      return;
    }

    await this.carregarComparativo();
  }

  async alternarRotacaoComparativo(): Promise<void> {
    if (!this.canRotateComparativo) {
      return;
    }

    if (this.comparativoPaisagemAtivo) {
      await this.sairModoPaisagem();
      return;
    }

    const element = document.documentElement;

    try {
      if (!document.fullscreenElement && element.requestFullscreen) {
        await element.requestFullscreen();
      }

      await this.bloquearOrientacaoPaisagem();
      this.comparativoPaisagemAtivo = true;
      this.agendarRefreshGrafico();
    } catch {
      this.comparativoPaisagemAtivo = true;
      this.agendarRefreshGrafico();
    }
  }

  private async carregarReceita(): Promise<void> {
    this.loading = true;
    try {
      const periodo = this.receitaRanges.find((item) => item.id === this.selectedRange)?.periodo ?? 'MES_ATUAL';
      const resp: ReceitaResumoResponse = await firstValueFrom(
        this.dashboardService.obterReceitaResumo({ periodo })
      );

      this.receitaTotal = resp.valorTotal ?? 0;
      this.receitaPedidos = resp.totalPedidos ?? 0;

      const formas: FormaPagamento[] = ['PIX', 'DINHEIRO', 'CARTAO_CREDITO', 'CARTAO_DEBITO', 'DEPOSITO', 'BOLETO'];
      const mapa = new Map<FormaPagamento, number>();
      for (const item of resp.porForma || []) {
        mapa.set(item.forma, item.valor ?? 0);
      }

      const series = formas.map((forma) => mapa.get(forma) ?? 0);
      const labels = formas.map((forma) => this.pagamentoLabels[forma]);
      const colors = formas.map((forma) => this.pagamentoCores[forma]);

      this.receitaLabels = labels;
      this.receitaChart = { ...this.receitaChart, series, labels, colors };
      this.agendarRefreshGrafico();
    } finally {
      this.loading = false;
    }
  }

  private async carregarComparativo(): Promise<void> {
    this.loading = true;
    try {
      const resp: DashboardComparativoResponse = await firstValueFrom(
        this.dashboardService.obterComparativoSimples(this.ano, this.mesA, this.mesB, this.comparativoModo)
      );

      const nomeA = resp.comparativo.mesA?.label ?? this.mesLabel(this.mesA);
      const nomeB = resp.comparativo.mesB?.label ?? this.mesLabel(this.mesB);
      const serieA = resp.comparativo.series.mesA.dias ?? [];
      const serieB = resp.comparativo.series.mesB.dias ?? [];

      this.legendLabels = [nomeA, nomeB];
      this.comparativoChart = {
        ...this.comparativoChart,
        series: [
          { name: nomeA, data: serieA, color: 'var(--mat-sys-primary)' },
          { name: nomeB, data: serieB, color: '#46caeb' },
        ],
      };

      this.configurarY(resp, serieA, serieB);
      this.agendarRefreshGrafico();
    } finally {
      this.loading = false;
    }
  }

  private configurarY(resp: DashboardComparativoResponse, serieA: number[], serieB: number[]): void {
    const maxVal = Math.max(...serieA, ...serieB, 0);
    const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1;

    if (resp.comparativo.modo === 'receita') {
      this.comparativoChart = {
        ...this.comparativoChart,
        yaxis: {
          labels: {
            show: true,
            formatter: (v: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v),
          },
          min: 0,
          max: yMax,
          tickAmount: 4,
        },
        tooltip: {
          ...this.comparativoChart.tooltip,
          y: { formatter: (v: number) => this.formatBRL(v) },
        },
      };
      return;
    }

    this.comparativoChart = {
      ...this.comparativoChart,
      yaxis: {
        labels: { show: true, formatter: (v: number) => `${Math.round(v)}` },
        min: 0,
        max: yMax,
        tickAmount: 4,
      },
      tooltip: {
        ...this.comparativoChart.tooltip,
        y: { formatter: (v: number) => `${Math.round(v)}` },
      },
    };
  }

  private agendarRefreshGrafico(): void {
    if (!this.viewReady) {
      return;
    }

    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        void this.atualizarGraficoAtivo();
      }, 0);
    });
  }

  private async atualizarGraficoAtivo(): Promise<void> {
    if (this.mode === 'receita' && this.receitaChartRef) {
      await this.receitaChartRef.updateSeries(this.receitaChartSeries, true);
      await this.receitaChartRef.updateOptions(
        {
          labels: this.receitaChartLabels,
          colors: this.receitaChartColors,
          chart: { height: 340 },
        },
        false,
        true
      );
      return;
    }

    if (this.mode === 'comparativo' && this.comparativoChartRef) {
      await this.comparativoChartRef.updateSeries(this.comparativoChart.series, true);
      await this.comparativoChartRef.updateOptions(
        {
          yaxis: this.comparativoChart.yaxis,
          xaxis: this.comparativoChart.xaxis,
          chart: { height: 360 },
        },
        false,
        true
      );
    }
  }

  private async sairModoPaisagem(): Promise<void> {
    this.comparativoPaisagemAtivo = false;
    this.desbloquearOrientacao();

    if (document.fullscreenElement && document.exitFullscreen) {
      try {
        await document.exitFullscreen();
      } catch {
      }
    }

    this.agendarRefreshGrafico();
  }

  private async bloquearOrientacaoPaisagem(): Promise<void> {
    const orientation = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape') => Promise<void>;
    };

    if (orientation?.lock) {
      try {
        await orientation.lock('landscape');
      } catch {
      }
    }
  }

  private desbloquearOrientacao(): void {
    const orientation = screen.orientation as ScreenOrientation & {
      unlock?: () => void;
    };

    if (orientation?.unlock) {
      try {
        orientation.unlock();
      } catch {
      }
    }
  }
}
