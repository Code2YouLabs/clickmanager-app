import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { PedidoComercialDetalhe } from '../shared/grafica.models';
import { montarMensagemPedidoComercialWhatsApp, telefoneWhatsAppBR } from './pedido-comercial-whatsapp.util';

@Component({
  selector: 'app-pedido-comercial-whatsapp-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    InputTextareaComponent,
    PageCardComponent,
    SectionCardComponent,
  ],
  template: `
    <app-page-card
      titulo="Compartilhar Pedido"
      [subtitulo]="subtituloPagina"
      [botaoTexto]="'Voltar'"
      [botaoRota]="voltarLink"
      [mostrarDivisor]="true">

      <div class="whatsapp-page">
        <app-section-card titulo="Mensagem para WhatsApp" subtitulo="Revise a mensagem antes de enviar." [divider]="true">
          <div class="state-panel" *ngIf="carregando">
            <mat-spinner diameter="34"></mat-spinner>
            <span>Carregando pedido...</span>
          </div>

          <div class="error-panel" *ngIf="!carregando && erro">
            <mat-icon>error_outline</mat-icon>
            <div>
              <strong>Não foi possível carregar a mensagem.</strong>
              <span>{{ erro }}</span>
            </div>
            <div class="error-actions">
              <button mat-stroked-button color="primary" type="button" [routerLink]="voltarLink">
                Voltar
              </button>
              <button mat-flat-button color="primary" type="button" (click)="carregarPedido()">
                Tentar novamente
              </button>
            </div>
          </div>

          <ng-container *ngIf="!carregando && !erro">
            <div class="pedido-context" *ngIf="pedido as p">
              <div>
                <span>Número</span>
                <strong>{{ p.numero || '—' }}</strong>
              </div>
              <div>
                <span>Cliente</span>
                <strong>{{ p.clienteNome || 'Cliente não informado' }}</strong>
              </div>
              <div>
                <span>Telefone</span>
                <strong>{{ p.clienteTelefone || '—' }}</strong>
              </div>
            </div>

            <app-input-textarea
              [control]="mensagemControl"
              label="Mensagem"
              placeholder="Mensagem do pedido"
              [rows]="16"
              [maxlength]="4000">
            </app-input-textarea>

            <div class="actions">
              <button mat-stroked-button type="button" (click)="copiar()">
                <mat-icon>content_copy</mat-icon>
                Copiar
              </button>
              <button mat-flat-button color="primary" type="button" (click)="abrirWhatsApp()">
                <mat-icon>chat</mat-icon>
                Abrir no WhatsApp
              </button>
            </div>
          </ng-container>
        </app-section-card>
      </div>
    </app-page-card>
  `,
  styles: [`
    .whatsapp-page {
      max-width: 920px;
      margin: 0 auto;
    }

    .pedido-context {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 16px;
      padding: 12px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      background: #f8fafc;
    }

    .pedido-context span,
    .pedido-context strong {
      display: block;
    }

    .pedido-context span {
      color: #64748b;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
    }

    .pedido-context strong {
      margin-top: 2px;
      color: #0f172a;
      font-size: 14px;
      line-height: 1.3;
    }

    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
      flex-wrap: wrap;
    }

    .actions button {
      border-radius: 999px;
    }

    .state-panel,
    .error-panel {
      min-height: 280px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      border: 1px dashed #cbd5e1;
      border-radius: 12px;
      color: #64748b;
      background: #f8fafc;
    }

    .error-panel {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      justify-content: flex-start;
      align-items: start;
      max-width: 680px;
      min-height: auto;
      margin: 24px auto;
      padding: 18px;
      border-color: #fecaca;
      color: #991b1b;
      background: #fff7f7;
    }

    .error-panel strong,
    .error-panel span {
      display: block;
    }

    .error-panel span {
      margin-top: 3px;
      color: #7f1d1d;
    }

    .error-actions {
      grid-column: 1 / -1;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 12px;
    }

    @media (max-width: 768px) {
      .pedido-context {
        grid-template-columns: 1fr;
      }

      .actions,
      .error-actions {
        flex-direction: column;
      }

      .actions button,
      .error-actions button {
        width: 100%;
      }
    }
  `],
})
export class PedidoComercialWhatsappPageComponent implements OnInit {
  pedido: PedidoComercialDetalhe | null = null;
  mensagemControl = new FormControl('', { nonNullable: true });
  carregando = false;
  erro: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly graficaService: GraficaProdutoService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.carregarPedido();
  }

  get subtituloPagina(): string {
    return this.pedido?.numero ? `WhatsApp · ${this.pedido.numero}` : 'WhatsApp';
  }

  get voltarLink(): any[] {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? ['/page/grafica/comercial-beta/pedidos', id] : ['/page/grafica/comercial-beta/pedidos'];
  }

  carregarPedido(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.erro = 'Pedido inválido.';
      return;
    }

    this.carregando = true;
    this.erro = null;
    this.graficaService.buscarPedidoComercial(id).subscribe({
      next: pedido => {
        this.pedido = pedido;
        this.mensagemControl.setValue(montarMensagemPedidoComercialWhatsApp(pedido, true));
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.carregando = false;
        this.erro = this.errorMessage(error, 'Não foi possível carregar o pedido.');
        this.toastr.error(this.erro);
      },
    });
  }

  copiar(): void {
    const mensagem = this.mensagemControl.value;
    if (!mensagem) return;
    navigator.clipboard.writeText(mensagem)
      .then(() => this.toastr.success('Mensagem copiada!'))
      .catch(() => this.toastr.error('Não foi possível copiar.'));
  }

  abrirWhatsApp(): void {
    if (!this.pedido) return;
    const phone = telefoneWhatsAppBR(this.pedido.clienteTelefone);
    if (!phone) {
      this.toastr.error('Telefone do cliente não encontrado ou inválido.');
      return;
    }
    window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(this.mensagemControl.value)}`;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.userMessage || error?.message || fallback;
  }
}
