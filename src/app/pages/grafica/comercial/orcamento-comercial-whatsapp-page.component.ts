import { Subscription } from 'rxjs';
import { CompartilhamentoClickWhatsAppComponent } from 'src/app/components/compartilhamento-clickwhatsapp/compartilhamento-clickwhatsapp.component';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnInit, OnDestroy } from '@angular/core';
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
import { OrcamentoComercialDetalhe } from '../shared/grafica.models';
import { montarMensagemOrcamentoComercialWhatsApp, telefoneWhatsAppBR } from './pedido-comercial-whatsapp.util';

@Component({
  selector: 'app-orcamento-comercial-whatsapp-page',
  standalone: true,
  imports: [
    CompartilhamentoClickWhatsAppComponent,
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
  templateUrl: './orcamento-comercial-whatsapp-page.component.html',
  styleUrl: './orcamento-comercial-whatsapp-page.component.scss',
})
export class OrcamentoComercialWhatsappPageComponent implements OnInit, OnDestroy {
  private routeChanges?: Subscription;
  private leitura?: Subscription;
  editorBloqueado = false;
  limiteMensagem: number | null = 4000;
  readonly telefoneCompartilhamento = telefoneWhatsAppBR;
  orcamento: OrcamentoComercialDetalhe | null = null;
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
    this.routeChanges = this.route.paramMap.subscribe(params => this.carregarOrcamento(Number(params.get('id'))));
  }

  ngOnDestroy() { this.routeChanges?.unsubscribe(); this.leitura?.unsubscribe(); }

  get subtituloPagina(): string {
    return this.orcamento?.protocolo ? `WhatsApp · ${this.orcamento.protocolo}` : 'WhatsApp';
  }

  get voltarLink(): any[] {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? ['/page/grafica/comercial/orcamentos', id] : ['/page/grafica/comercial/orcamentos'];
  }

  carregarOrcamento(id = Number(this.route.snapshot.paramMap.get('id'))): void {
    this.leitura?.unsubscribe();
    this.orcamento = null;
    if (!id) {
      this.erro = 'Orçamento inválido.';
      return;
    }

    this.carregando = true;
    this.erro = null;
    this.leitura = this.graficaService.buscarOrcamentoComercial(id).subscribe({
      next: orcamento => {
        this.orcamento = orcamento;
        this.mensagemControl.setValue(montarMensagemOrcamentoComercialWhatsApp(orcamento, true));
        this.carregando = false;
        this.cdr.detectChanges();
      },
      error: error => {
        this.carregando = false;
        this.erro = this.errorMessage(error, 'Não foi possível carregar o orçamento.');
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

  abrirWhatsApp(revisado?: { numero: string; texto: string }): void {
    if (!this.orcamento) return;
    const phone = revisado?.numero ?? telefoneWhatsAppBR(this.orcamento.telefoneCliente);
    if (!phone) {
      this.toastr.error('Telefone do cliente não encontrado ou inválido.');
      return;
    }
    window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(revisado?.texto ?? this.mensagemControl.value)}`;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.userMessage || error?.message || fallback;
  }
}
