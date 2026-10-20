import { BreakpointObserver } from '@angular/cdk/layout';
import { Subscription } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { TelefonePipe } from 'src/app/pipe/telefone.pipe';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, OnDestroy, OnInit, Optional } from '@angular/core';
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
    MobileTotalBarComponent,
    TelefonePipe,
  ],
  templateUrl: './pedido-comercial-whatsapp-page.component.html',
  styleUrl: './pedido-comercial-whatsapp-page.component.scss',
})
export class PedidoComercialWhatsappPageComponent implements OnInit, OnDestroy {
  isMobile = false;
  private readonly layoutChanges?: Subscription;
  pedido: PedidoComercialDetalhe | null = null;
  mensagemControl = new FormControl('', { nonNullable: true });
  carregando = false;
  erro: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly graficaService: GraficaProdutoService,
    private readonly toastr: ToastrService,
    private readonly cdr: ChangeDetectorRef,
    @Optional() breakpoints?: BreakpointObserver,
  ) {
    this.layoutChanges = breakpoints?.observe(MOBILE_FOUNDATION_QUERY).subscribe(state => this.isMobile = state.matches);
  }

  ngOnDestroy(): void { this.layoutChanges?.unsubscribe(); }

  ngOnInit(): void {
    this.carregarPedido();
  }

  get subtituloPagina(): string {
    return this.pedido?.numero ? `WhatsApp · ${this.pedido.numero}` : 'WhatsApp';
  }

  get voltarLink(): any[] {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? ['/page/grafica/comercial/pedidos', id] : ['/page/grafica/comercial/pedidos'];
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
