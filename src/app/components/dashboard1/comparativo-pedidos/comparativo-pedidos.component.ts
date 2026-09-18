import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, HostListener, NgZone, OnInit, ViewChild } from '@angular/core';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexGrid,
  ApexLegend,
  ApexMarkers,
  ApexStroke,
  ApexTooltip,
  ApexXAxis,
  ApexYAxis,
  ChartComponent,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { DashboardComparativoResponse, DashboardService } from '../dashboard.service';
import { firstValueFrom } from 'rxjs';
import { Router } from '@angular/router';

interface Mes {
  value: number;
  viewValue: string;
}

type ModoComparativo = 'quantidade' | 'receita';

type ComparativoChart = {
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
  selector: 'app-comparativo-pedidos',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule, NgApexchartsModule],
  templateUrl: './comparativo-pedidos.component.html',
  styleUrls: ['./comparativo-pedidos.component.scss'],
})
export class AppComparativoPedidosComponent implements OnInit, AfterViewInit {
  @ViewChild('chart') chart?: ChartComponent;
  private viewReady = false;

  meses: Mes[] = [
    { value: 0, viewValue: 'Jan' }, { value: 1, viewValue: 'Fev' }, { value: 2, viewValue: 'Mar' },
    { value: 3, viewValue: 'Abr' }, { value: 4, viewValue: 'Mai' }, { value: 5, viewValue: 'Jun' },
    { value: 6, viewValue: 'Jul' }, { value: 7, viewValue: 'Ago' }, { value: 8, viewValue: 'Set' },
    { value: 9, viewValue: 'Out' }, { value: 10, viewValue: 'Nov' }, { value: 11, viewValue: 'Dez' },
  ];
  anos: number[] = (() => {
    const y = new Date().getFullYear();
    return [y, y - 1, y - 2];
  })();
  modos: Array<{ value: ModoComparativo; label: string }> = [
    { value: 'quantidade', label: 'Qtd' },
    { value: 'receita', label: 'Valor' }
  ];

  mesA = new Date().getMonth();
  mesB = Math.max(0, new Date().getMonth() - 1);
  ano = new Date().getFullYear();
  modo: ModoComparativo = 'quantidade';
  loading = false;

  revenueSeries: ApexAxisChartSeries = [
    { name: 'Mês A', data: [], color: 'var(--mat-sys-primary)' },
    { name: 'Mês B', data: [], color: '#46caeb' },
  ];

  revenueChart: Omit<ComparativoChart, 'series'> = {
    chart: {
      type: 'line',
      height: 320,
      fontFamily: 'inherit',
      foreColor: '#94a3b8',
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    legend: { show: false },
    stroke: { width: 2.25, curve: 'smooth' },
    markers: { size: 0, hover: { size: 4 } },
    grid: { show: true, borderColor: 'rgba(148, 163, 184, 0.12)', strokeDashArray: 6 },
    xaxis: {
      type: 'category',
      categories: Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0')),
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        show: true,
        formatter: (_value: string, _timestamp?: number, opts?: { dataPointIndex?: number }) =>
          (opts?.dataPointIndex ?? 0) % 8 === 0 ? _value : '',
      },
    },
    yaxis: {
      labels: { show: true, formatter: (v: number) => `${Math.round(v)}` },
        min: 0,
        max: 1,
        tickAmount: 3,
      },
    tooltip: {
      theme: 'dark',
      fillSeriesColor: false,
      shared: true,
      intersect: false,
      y: { formatter: (v: number) => String(v) },
    },
  };

  legendLabels: string[] = [];

  constructor(
    private dashboardService: DashboardService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  async ngOnInit(): Promise<void> {
    await this.carregarDoBack();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.agendarRefreshGrafico();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.agendarRefreshGrafico();
  }

  async alterarMesA(value: number): Promise<void> {
    this.mesA = value;
    await this.carregarDoBack();
  }

  async alterarMesB(value: number): Promise<void> {
    this.mesB = value;
    await this.carregarDoBack();
  }

  async alterarAno(value: number): Promise<void> {
    this.ano = value;
    await this.carregarDoBack();
  }

  async alterarModo(value: ModoComparativo): Promise<void> {
    this.modo = value;
    await this.carregarDoBack();
  }

  mesLabel(index: number): string {
    return this.meses.find((mes) => mes.value === index)?.viewValue || '-';
  }

  get totalMesA(): number {
    return this.somarSerie(0);
  }

  get totalMesB(): number {
    return this.somarSerie(1);
  }

  get mobileDeltaLabel(): string {
    const atual = this.totalMesA;
    const anterior = this.totalMesB;

    if (anterior === 0 && atual === 0) {
      return 'Sem movimento no período';
    }

    if (anterior === 0) {
      return 'Novo movimento no período';
    }

    const delta = ((atual - anterior) / anterior) * 100;
    const prefixo = delta >= 0 ? '+' : '';
    return `${prefixo}${Math.round(delta)}% vs ${this.legendLabels[1] || this.mesLabel(this.mesB)}`;
  }

  get desktopDeltaValue(): string {
    const atual = this.totalMesA;
    const anterior = this.totalMesB;

    if (anterior === 0 && atual === 0) {
      return '0%';
    }

    if (anterior === 0) {
      return 'Novo';
    }

    const delta = ((atual - anterior) / anterior) * 100;
    const prefixo = delta >= 0 ? '+' : '';
    return `${prefixo}${Math.round(delta)}%`;
  }

  get desktopDeltaCaption(): string {
    const atual = this.totalMesA;
    const anterior = this.totalMesB;

    if (anterior === 0 && atual === 0) {
      return 'Sem movimento no período';
    }

    if (anterior === 0) {
      return 'sem base anterior';
    }

    return 'vs período anterior';
  }

  get desktopDeltaTone(): 'positive' | 'negative' | 'neutral' {
    const atual = this.totalMesA;
    const anterior = this.totalMesB;

    if (anterior === 0 && atual === 0) {
      return 'neutral';
    }

    if (anterior === 0) {
      return 'positive';
    }

    return atual >= anterior ? 'positive' : 'negative';
  }

  get desktopDeltaIcon(): string {
    if (this.desktopDeltaTone === 'negative') {
      return '↓';
    }

    if (this.desktopDeltaTone === 'neutral') {
      return '•';
    }

    return '↑';
  }

  get mobilePeakLabel(): string {
    const dados = this.obterDadosSerie(0);
    let maiorValor = 0;
    let maiorIndice = -1;

    dados.forEach((valor, indice) => {
      if (valor > maiorValor) {
        maiorValor = valor;
        maiorIndice = indice;
      }
    });

    if (maiorIndice < 0) {
      return 'Sem pico relevante';
    }

    return `Pico no dia ${String(maiorIndice + 1).padStart(2, '0')}`;
  }

  formatarValor(valor: number): string {
    if (this.modo === 'receita') {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0
      }).format(valor);
    }

    return `${Math.round(valor)}`;
  }

  abrirGraficoComparativo(): void {
    this.router.navigate(['/dashboards/dashboard1/grafico'], {
      queryParams: {
        tipo: 'comparativo',
        mesA: this.mesA,
        mesB: this.mesB,
        ano: this.ano,
        modo: this.modo,
      }
    });
  }

  private async carregarDoBack(): Promise<void> {
    this.loading = true;

    try {
      const resp: DashboardComparativoResponse = await firstValueFrom(
        this.dashboardService.obterComparativoSimples(this.ano, this.mesA, this.mesB, this.modo)
      );

      const nomeA = resp.comparativo.mesA?.label ?? this.mesLabel(this.mesA);
      const nomeB = resp.comparativo.mesB?.label ?? this.mesLabel(this.mesB);
      const serieA = resp.comparativo.series.mesA.dias ?? [];
      const serieB = resp.comparativo.series.mesB.dias ?? [];

      this.legendLabels = [nomeA, nomeB];
      this.revenueSeries = [
        { name: nomeA, data: serieA, color: 'var(--mat-sys-primary)' },
        { name: nomeB, data: serieB, color: '#46caeb' },
      ];

      this.configurarEixoY(this.modo);
      this.aplicarFallbackY(serieA, serieB);
      this.agendarRefreshGrafico();
    } finally {
      this.loading = false;
    }
  }

  private configurarEixoY(modo: ModoComparativo): void {
    if (modo === 'receita') {
      this.revenueChart = {
        ...this.revenueChart,
        yaxis: {
          ...(this.revenueChart.yaxis as any),
          labels: {
            show: true,
            formatter: (v: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v),
          },
        },
        tooltip: {
          ...this.revenueChart.tooltip,
          y: {
            formatter: (v: number) =>
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
          },
        },
      };
      return;
    }

    this.revenueChart = {
      ...this.revenueChart,
      yaxis: {
        ...(this.revenueChart.yaxis as any),
        labels: { show: true, formatter: (v: number) => String(Math.round(v)) },
      },
      tooltip: {
        ...this.revenueChart.tooltip,
        y: { formatter: (v: number) => String(v) },
      },
    };
  }

  private aplicarFallbackY(serieA: number[], serieB: number[]): void {
    const maxVal = Math.max(...(serieA || [0]), ...(serieB || [0]), 0);
    const yMax = maxVal > 0 ? Math.ceil(maxVal * 1.15) : 1;

    this.revenueChart = {
      ...this.revenueChart,
      yaxis: {
        ...(this.revenueChart.yaxis as any),
        min: 0,
        max: yMax,
        tickAmount: 3,
      },
    };
  }

  private somarSerie(index: number): number {
    return this.obterDadosSerie(index).reduce((acc, valor) => acc + Number(valor || 0), 0);
  }

  private obterDadosSerie(index: number): number[] {
    return (this.revenueSeries[index]?.data as number[] | undefined) ?? [];
  }

  private agendarRefreshGrafico(): void {
    if (!this.viewReady) {
      return;
    }

    this.cdr.detectChanges();
    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        void this.atualizarGrafico();
      }, 0);
    });
  }

  private async atualizarGrafico(): Promise<void> {
    if (!this.chart) {
      return;
    }

    await this.chart.updateSeries(this.revenueSeries, true);
    await this.chart.updateOptions(
      {
        yaxis: this.revenueChart.yaxis,
        xaxis: this.revenueChart.xaxis,
        chart: { height: 320 },
      },
      false,
      true
    );
  }
}
