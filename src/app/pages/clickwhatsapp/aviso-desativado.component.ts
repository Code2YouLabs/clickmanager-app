import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-clickwhatsapp-aviso-desativado',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <div class="aviso-desativado" role="status">
      <div>
        <strong>ClickWhatsApp desativado</strong>
        <p>Ative a funcionalidade nas configurações para utilizar os envios.</p>
      </div>
      @if (podeConfigurar) {
        <a mat-button routerLink="/page/clickwhatsapp/configuracoes">Ir para configurações</a>
      }
    </div>
  `,
  styles: [`
    :host { display: block; grid-column: 1 / -1; }
    .aviso-desativado {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 16px;
      background: #f1f5fb;
      border-radius: 8px;
    }
    p { margin: 4px 0 0; font-size: 14px; line-height: 1.5; }
    a { flex-shrink: 0; }
    @media (max-width: 600px) {
      .aviso-desativado { align-items: flex-start; flex-direction: column; }
    }
  `],
})
export class AvisoDesativadoComponent {
  @Input() podeConfigurar = false;
}
