import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Mensagem, FASES, CONFIRMACOES } from 'src/app/pages/clickwhatsapp/clickwhatsapp.models';

/** Apresentação das confirmações persistidas; não infere entrega a partir do aceite. */
@Component({
  selector: 'app-message-status', standalone: true, imports: [MatIconModule, MatTooltipModule],
  template: `<span class="confirmacao" role="img" tabindex="0" [attr.aria-label]="descricao" [matTooltip]="descricao"
    [class.lida]="lida" [class.alerta]="alerta"><mat-icon aria-hidden="true">{{ icone }}</mat-icon></span>`,
  styles: [`:host { display: inline-flex; vertical-align: middle; }
    .confirmacao { display: inline-flex; align-items: center; color: #64748b; }
    mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .lida { color: #169ee8; } .alerta { color: #a64527; }
    .confirmacao:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; border-radius: 3px; }`],
})
export class MessageStatusComponent {
  @Input({ required: true }) mensagem!: Pick<Mensagem, 'fase' | 'confirmacao'>;
  get alerta() { return ['INCERTA','FALHA','CANCELADA','EXPIRADA'].includes(this.mensagem.fase); }
  get lida() { return !this.alerta && this.mensagem.confirmacao === 'LIDA'; }
  get icone() {
    if (this.alerta) return this.mensagem.fase === 'INCERTA' ? 'help_outline' : this.mensagem.fase === 'CANCELADA' ? 'block' : this.mensagem.fase === 'EXPIRADA' ? 'timer_off' : 'error_outline';
    if (['ENTREGUE','LIDA'].includes(this.mensagem.confirmacao)) return 'done_all';
    if (this.mensagem.confirmacao === 'CONFIRMADA_SERVIDOR') return 'done';
    return 'schedule';
  }
  get descricao() {
    if (this.alerta) return FASES[this.mensagem.fase];
    if (this.mensagem.confirmacao === 'ACEITA_PROVEDOR') return 'Aceita pelo provedor; aguardando confirmação do servidor';
    if (this.mensagem.confirmacao === 'NAO_CONFIRMADA') return FASES[this.mensagem.fase];
    return CONFIRMACOES[this.mensagem.confirmacao];
  }
}
