import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PdfDocumentPageComponent } from 'src/app/components/pdf-document-page/pdf-document-page.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { PedidoComercialDetalhe } from '../shared/grafica.models';

type FormatoPedidoComercial = 'completo' | 'duas-vias' | 'etiqueta';

@Component({
  selector: 'app-pedido-comercial-impressao-page',
  standalone: true,
  imports: [
    CommonModule,
    PdfDocumentPageComponent,
  ],
  templateUrl: './pedido-comercial-impressao-page.component.html',
  styleUrl: './pedido-comercial-impressao-page.component.scss',
})
export class PedidoComercialImpressaoPageComponent implements OnInit, OnDestroy {
  @ViewChild('pdfFrame') pdfFrame?: ElementRef<HTMLIFrameElement>;

  pedido: PedidoComercialDetalhe | null = null;
  formato: FormatoPedidoComercial = 'completo';
  pdfPreviewUrl: SafeResourceUrl | null = null;
  pdfBlob: Blob | null = null;
  carregando = false;
  erro: string | null = null;
  private pdfObjectUrl: string | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly graficaService: GraficaProdutoService,
    private readonly sanitizer: DomSanitizer,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.formato = (this.route.snapshot.data['formato'] || 'completo') as FormatoPedidoComercial;
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.limparPdfUrl();
  }

  get tituloPagina(): string {
    if (this.formato === 'duas-vias') return 'Duas vias do Pedido';
    if (this.formato === 'etiqueta') return 'Etiqueta do Pedido';
    return 'Impressão do Pedido';
  }

  get subtituloPagina(): string {
    const numero = this.pedido?.numero || 'Pedido';
    return `${this.tituloFormato} · ${numero}`;
  }

  get tituloFormato(): string {
    if (this.formato === 'duas-vias') return 'Duas vias';
    if (this.formato === 'etiqueta') return 'Etiqueta';
    return 'Pedido completo';
  }

  get voltarLink(): any[] {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? ['/page/grafica/comercial/pedidos', id] : ['/page/grafica/comercial/pedidos'];
  }

  carregarDados(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.erro = 'Pedido inválido.';
      return;
    }

    this.carregando = true;
    this.erro = null;
    this.limparPdfUrl();

    this.graficaService.buscarPedidoComercial(id).subscribe({
      next: pedido => {
        this.pedido = pedido;
        this.carregarPdf(id);
      },
      error: error => {
        this.carregando = false;
        this.erro = this.errorMessage(error, 'Não foi possível carregar o pedido.');
        this.toastr.error(this.erro);
      },
    });
  }

  salvarPdf(): void {
    if (!this.pdfBlob) return;
    const link = document.createElement('a');
    const downloadUrl = URL.createObjectURL(this.pdfBlob);
    link.href = downloadUrl;
    link.download = this.nomeArquivo();
    link.click();
    URL.revokeObjectURL(downloadUrl);
  }

  imprimir(): void {
    const frameWindow = this.pdfFrame?.nativeElement.contentWindow;
    if (!frameWindow) {
      this.toastr.info('Aguarde o PDF carregar para imprimir.');
      return;
    }
    frameWindow.focus();
    frameWindow.print();
  }

  private carregarPdf(id: number): void {
    this.graficaService.gerarImpressaoPedidoComercial(id, this.formato)
      .pipe(finalize(() => this.carregando = false))
      .subscribe({
        next: response => {
          if (!response.body || response.body.size === 0) {
            this.erro = 'Não foi possível gerar o PDF.';
            this.toastr.error(this.erro);
            return;
          }
          this.pdfBlob = response.body;
          this.pdfObjectUrl = URL.createObjectURL(response.body);
          this.pdfPreviewUrl = this.sanitizer.bypassSecurityTrustResourceUrl(`${this.pdfObjectUrl}#toolbar=1&navpanes=0&scrollbar=0&view=FitH`);
        },
        error: error => {
          this.erro = this.errorMessage(error, 'Não foi possível carregar o PDF.');
          this.toastr.error(this.erro);
        },
      });
  }

  private nomeArquivo(): string {
    const numero = (this.pedido?.numero || `pedido-${this.route.snapshot.paramMap.get('id') || ''}`)
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    const sufixo = this.formato === 'duas-vias' ? '-duas-vias' : this.formato === 'etiqueta' ? '-etiquetas' : '';
    return `pedido-${numero || 'documento'}${sufixo}.pdf`;
  }

  private limparPdfUrl(): void {
    if (this.pdfObjectUrl) {
      URL.revokeObjectURL(this.pdfObjectUrl);
      this.pdfObjectUrl = null;
    }
    this.pdfPreviewUrl = null;
    this.pdfBlob = null;
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.userMessage || error?.message || fallback;
  }
}
