import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';

import { DashboardService, GraficaDashboardIndicador } from '../dashboard.service';
import { SectionCardComponent } from '../../section-card/section-card.component';

interface StatusGridItem {
  status: string;
  label: string;
  quantidade: number;
  valor: number;
  tone: 'neutral' | 'warning' | 'info' | 'primary' | 'success' | 'danger';
  tipo: 'pedido' | 'orcamento';
}

@Component({
  selector: 'app-status-grid',
  standalone: true,
  imports: [CommonModule, SectionCardComponent],
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
})
export class AppStatusGridComponent implements OnInit, OnChanges, OnDestroy {
  @Input() refreshToken = 0;
  @Output() refreshState = new EventEmitter<{ id: 'status'; refreshing: boolean }>();
  pedidoStats: StatusGridItem[] = [];
  orcamentoStats: StatusGridItem[] = [];
  loading = false;
  refreshing = false;
  erro: string | null = null;
  private requestId = 0;
  private readonly subscriptions = new Subscription();

  private readonly pedidoStatusOrder = [
    'AGUARDANDO_PAGAMENTO',
    'PENDENTE',
    'EM_PRODUCAO',
    'PRONTO',
    'ENTREGUE',
  ];

  private readonly orcamentoStatusOrder = [
    'ABERTO',
    'ENVIADO',
    'APROVADO',
    'RECUSADO',
    'VENCIDO',
    'CANCELADO',
  ];

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.carregarStatus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['refreshToken'] && !changes['refreshToken'].firstChange) {
      this.carregarStatus();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  abrirStatus(item: StatusGridItem): void {
    if (item.tipo === 'orcamento') {
      this.router.navigate(['/page/grafica/comercial/orcamentos'], { queryParams: { status: item.status } });
      return;
    }
    this.router.navigate(['/page/grafica/comercial/pedidos'], { queryParams: { status: item.status } });
  }

  carregarStatus(): void {
    const currentRequestId = ++this.requestId;
    const hasData = this.pedidoStats.length > 0 || this.orcamentoStats.length > 0;
    this.loading = !hasData;
    this.refreshing = hasData;
    this.erro = null;
    this.refreshState.emit({ id: 'status', refreshing: true });

    const subscription = this.dashboardService.obterResumoGrafica().subscribe({
      next: (resposta) => {
        if (currentRequestId !== this.requestId) return;
        const pedidos = new Map(resposta.pedidoStatus.map((item) => [item.codigo, item]));
        const orcamentos = new Map(resposta.orcamentoStatus.map((item) => [item.codigo, item]));

        this.pedidoStats = this.pedidoStatusOrder.map((status) => this.toStatusGridItem(
          pedidos.get(status),
          status,
          this.mapPedidoLabel(status),
          this.mapPedidoTone(status),
          'pedido',
        ));

        this.orcamentoStats = this.orcamentoStatusOrder.map((status) => this.toStatusGridItem(
          orcamentos.get(status),
          status,
          this.mapOrcamentoLabel(status),
          this.mapOrcamentoTone(status),
          'orcamento',
        ));
      },
      error: () => {
        if (currentRequestId !== this.requestId) return;
        this.erro = hasData
          ? 'Não foi possível atualizar os status. Mantivemos os dados anteriores.'
          : 'Não foi possível carregar os status.';
        this.loading = false;
        this.refreshing = false;
        this.refreshState.emit({ id: 'status', refreshing: false });
      },
      complete: () => {
        if (currentRequestId !== this.requestId) return;
        this.loading = false;
        this.refreshing = false;
        this.refreshState.emit({ id: 'status', refreshing: false });
      },
    });

    this.subscriptions.add(subscription);
  }

  formatBRL(valor: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor || 0);
  }

  private toStatusGridItem(
    indicador: GraficaDashboardIndicador | undefined,
    status: string,
    label: string,
    tone: StatusGridItem['tone'],
    tipo: StatusGridItem['tipo'],
  ): StatusGridItem {
    return {
      status,
      label: indicador?.label || label,
      quantidade: indicador?.quantidade || 0,
      valor: indicador?.valor || 0,
      tone,
      tipo,
    };
  }

  private mapPedidoLabel(status: string): string {
    const labels: Record<string, string> = {
      AGUARDANDO_PAGAMENTO: 'Pagamento',
      PENDENTE: 'Pendente',
      EM_PRODUCAO: 'Produção',
      PRONTO: 'Pronto',
      ENTREGUE: 'Entregue',
    };
    return labels[status] ?? status;
  }

  private mapOrcamentoLabel(status: string): string {
    const labels: Record<string, string> = {
      ABERTO: 'Aberto',
      ENVIADO: 'Enviado',
      APROVADO: 'Aprovado',
      RECUSADO: 'Recusado',
      VENCIDO: 'Vencido',
      CANCELADO: 'Cancelado',
    };
    return labels[status] ?? status;
  }

  private mapPedidoTone(status: string): StatusGridItem['tone'] {
    const tones: Record<string, StatusGridItem['tone']> = {
      AGUARDANDO_PAGAMENTO: 'warning',
      PENDENTE: 'neutral',
      EM_PRODUCAO: 'primary',
      PRONTO: 'success',
      ENTREGUE: 'success',
    };
    return tones[status] ?? 'neutral';
  }

  private mapOrcamentoTone(status: string): StatusGridItem['tone'] {
    const tones: Record<string, StatusGridItem['tone']> = {
      ABERTO: 'info',
      ENVIADO: 'primary',
      APROVADO: 'success',
      RECUSADO: 'danger',
      VENCIDO: 'warning',
      CANCELADO: 'danger',
    };
    return tones[status] ?? 'neutral';
  }
}
