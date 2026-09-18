import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { MaterialModule } from '../../../material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { DashboardComparativoResponse, DashboardService } from '../dashboard.service';
import { Router } from '@angular/router';

interface Estatistica {
  status: string;
  color: string;
  label: string;
  quantidade: number;
  icon: string;
}

@Component({
  selector: 'app-congratulate-card',
  standalone: true,
  imports: [CommonModule, MaterialModule, TablerIconsModule],
  templateUrl: './congratulate-card.component.html',
  styleUrls: ['./congratulate-card.component.scss'],
})
export class AppCongratulateCardComponent implements OnInit {
  empresaNome = '';
  empresaDescricao = '';
  stats: Estatistica[] = [];
  readonly statusOrder = ['RASCUNHO', 'PENDENTE', 'ORCAMENTO', 'AGUARDANDO_PAGAMENTO', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO'];

  constructor(
    private dashboardService: DashboardService,
    private router: Router
  ) { }

  async ngOnInit() {
    await this.carregarDoBack();
  }
  
  private async carregarDoBack() {
    const agora = new Date();

    const resp: DashboardComparativoResponse = await firstValueFrom(
      this.dashboardService.obterComparativoSimples(
        agora.getFullYear(),
        agora.getMonth(),
        Math.max(0, agora.getMonth() - 1),
        'quantidade'
      )
    );

    this.empresaNome = resp.empresa?.nome ?? '';
    const statsMap = new Map(resp.kpis.map((kpi) => [kpi.status, kpi.quantidade]));

    this.stats = this.statusOrder.map((status) => ({
      status,
      color: this.mapearCor(status),
      label: this.labelStatus(status),
      quantidade: Number(statsMap.get(status) || 0),
      icon: this.mapearIcone(status),
    }));
  }

  abrirStatus(status?: string): void {
    const queryParams = status ? { status } : {};
    this.router.navigate(['/page/pedido'], { queryParams });
  }

  private mapearCor(status: string): string {
    const mapa: Record<string, string> = {
      RASCUNHO: 'secondary',
      PENDENTE: 'warning',
      ORCAMENTO: 'info',
      AGUARDANDO_PAGAMENTO: 'orange',
      EM_PRODUCAO: 'primary',
      PRONTO: 'teal',
      ENTREGUE: 'success',
      CANCELADO: 'danger'
    };
    return mapa[status] ?? 'primary';
  }

  private labelStatus(status: string): string {
    const labels: Record<string, string> = {
      RASCUNHO: 'Rascunho',
      PENDENTE: 'Pendente',
      ORCAMENTO: 'Orçamento',
      AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
      EM_PRODUCAO: 'Produção',
      PRONTO: 'Pronto',
      ENTREGUE: 'Entregue',
      CANCELADO: 'Cancelado'
    };
    return labels[status] ?? status;
  }

  private mapearIcone(status: string): string {
    const mapa: Record<string, string> = {
      RASCUNHO: 'pencil',
      PENDENTE: 'clock-hour-3',
      ORCAMENTO: 'report-money',
      AGUARDANDO_PAGAMENTO: 'credit-card',
      EM_PRODUCAO: 'printer',
      PRONTO: 'check',
      ENTREGUE: 'truck-delivery',
      CANCELADO: 'x'
    };
    return mapa[status] ?? 'circle';
  }
}
