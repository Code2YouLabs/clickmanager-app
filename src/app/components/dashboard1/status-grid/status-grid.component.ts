import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { DashboardService, GraficaDashboardIndicador } from '../dashboard.service';

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
  imports: [CommonModule, MaterialModule],
  templateUrl: './status-grid.component.html',
  styleUrls: ['./status-grid.component.scss'],
})
export class AppStatusGridComponent implements OnInit {
  pedidoStats: StatusGridItem[] = [];
  orcamentoStats: StatusGridItem[] = [];

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

  async ngOnInit(): Promise<void> {
    await this.carregarStatus();
  }

  abrirStatus(item: StatusGridItem): void {
    if (item.tipo === 'orcamento') {
      this.router.navigate(['/page/grafica/comercial-beta/orcamentos'], { queryParams: { status: item.status } });
      return;
    }
    this.router.navigate(['/page/grafica/comercial-beta/pedidos'], { queryParams: { status: item.status } });
  }

  private async carregarStatus(): Promise<void> {
    const resposta = await firstValueFrom(this.dashboardService.obterResumoGrafica());
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
