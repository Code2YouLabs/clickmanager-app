import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { StatusLabelPipe } from 'src/app/pipes/status-label.pipe';

type StatusConfig = { icon: string; label: string; className: string };

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [CommonModule, MatIconModule, StatusLabelPipe],
  templateUrl: './status-badge.component.html',
  styleUrls: ['./status-badge.component.scss']
})
export class StatusBadgeComponent {
  @Input() status: string | null | undefined;

  private readonly map: Record<string, StatusConfig> = {
    ATIVO: { icon: 'check_circle', label: 'Ativo', className: 'chip-pronto' },
    AFASTADO: { icon: 'pause_circle', label: 'Afastado', className: 'chip-aguardando' },
    DESLIGADO: { icon: 'block', label: 'Desligado', className: 'chip-cancelado' },
    RASCUNHO: { icon: 'edit', label: 'Rascunho', className: 'chip-rascunho' },
    PENDENTE: { icon: 'schedule', label: 'Pendente', className: 'chip-pendente' },
    ORCAMENTO: { icon: 'assignment', label: 'Orçamento', className: 'chip-orcamento' },
    AGUARDANDO_PAGAMENTO: { icon: 'credit_card', label: 'Aguard. pagto', className: 'chip-aguardando' },
    EM_PRODUCAO: { icon: 'lock', label: 'Produção', className: 'chip-producao' },
    PRONTO: { icon: 'check_circle', label: 'Pronto', className: 'chip-pronto' },
    ENTREGUE: { icon: 'local_shipping', label: 'Entregue', className: 'chip-entregue' },
    CANCELADO: { icon: 'close', label: 'Cancelado', className: 'chip-cancelado' },
    ABERTO: { icon: 'schedule', label: 'Aberto', className: 'chip-pendente' },
    FECHADO: { icon: 'task_alt', label: 'Fechado', className: 'chip-producao' },
    PARCIAL: { icon: 'payments', label: 'Parcial', className: 'chip-aguardando' },
    PAGO: { icon: 'check_circle', label: 'Pago', className: 'chip-pronto' },
    CONFIRMADO: { icon: 'check_circle', label: 'Confirmado', className: 'chip-pronto' },
    EM_ANALISE: { icon: 'manage_search', label: 'Em análise', className: 'chip-analise' },
    AGUARDANDO_CLIENTE: { icon: 'hourglass_empty', label: 'Aguard. cliente', className: 'chip-aguardando' },
    RESPONDIDO: { icon: 'chat_bubble', label: 'Respondido', className: 'chip-orcamento' },
    RESOLVIDO: { icon: 'verified', label: 'Resolvido', className: 'chip-pronto' },
    NOVO: { icon: 'fiber_new', label: 'Novo', className: 'chip-pendente' },
    EM_ATENDIMENTO: { icon: 'support_agent', label: 'Em atendimento', className: 'chip-orcamento' },
    CONVERTIDO: { icon: 'check_circle', label: 'Convertido', className: 'chip-pronto' },
    PERDIDO: { icon: 'cancel', label: 'Não convertido', className: 'chip-cancelado' },
  };

  get config(): StatusConfig {
    const key = (this.status || '').toUpperCase();
    return this.map[key] || { icon: 'info', label: this.status || '—', className: 'chip-default' };
  }
}
