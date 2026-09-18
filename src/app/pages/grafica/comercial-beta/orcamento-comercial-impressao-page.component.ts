import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { GraficaProdutoService } from '../shared/grafica.service';
import { OrcamentoComercialDetalhe } from '../shared/grafica.models';

@Component({
  selector: 'app-orcamento-comercial-impressao-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    PageCardComponent,
  ],
  template: `
    <app-page-card
      titulo="Impressão do Orçamento"
      [subtitulo]="subtituloPagina"
      [botaoTexto]="'Voltar'"
      [botaoRota]="voltarLink"
      [mostrarDivisor]="true"
      [contentPadding]="false">
      <div page-header-actions class="document-actions">
        <button mat-stroked-button color="primary" type="button" [disabled]="!pdfBlob || carregando" (click)="salvarPdf()">
          <mat-icon>download</mat-icon>
          Salvar PDF
        </button>
        <button mat-flat-button color="primary" type="button" [disabled]="!pdfPreviewUrl || carregando" (click)="imprimir()">
          <mat-icon>print</mat-icon>
          Imprimir
        </button>
      </div>

      <div class="print-page">
        <div class="state-panel" *ngIf="carregando">
          <mat-spinner diameter="34"></mat-spinner>
          <span>Gerando documento...</span>
        </div>

        <div class="error-panel" *ngIf="!carregando && erro">
          <mat-icon>error_outline</mat-icon>
          <div>
            <strong>Não foi possível gerar o documento.</strong>
            <span>{{ erro }}</span>
          </div>
          <div class="error-actions">
            <button mat-stroked-button color="primary" type="button" [routerLink]="voltarLink">
              Voltar
            </button>
            <button mat-flat-button color="primary" type="button" (click)="carregarDados()">
              Tentar novamente
            </button>
          </div>
        </div>

        <iframe
          *ngIf="!carregando && !erro && pdfPreviewUrl"
          #pdfFrame
          class="pdf-frame"
          [src]="pdfPreviewUrl"
          title="Preview do PDF do orçamento"
          scrolling="no">
        </iframe>
      </div>
    </app-page-card>
  `,
  styles: [`
    .print-page {
      height: calc(100vh - 210px);
      min-height: 720px;
      padding: 0;
      overflow: hidden;
      background: #f8fafc;
    }

    .document-actions {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .document-actions button {
      border-radius: 999px;
    }

    .pdf-frame {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }

    .state-panel,
    .error-panel {
      height: 100%;
      min-height: 420px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
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

    .error-panel mat-icon {
      margin-top: 1px;
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
      .document-actions {
        width: 100%;
      }

      .document-actions button,
      .error-actions button {
        width: 100%;
      }

      .print-page {
        height: calc(100vh - 250px);
        min-height: 560px;
      }

      .error-actions {
        flex-direction: column;
      }
    }
  `],
})
export class OrcamentoComercialImpressaoPageComponent implements OnInit, OnDestroy {
  @ViewChild('pdfFrame') pdfFrame?: ElementRef<HTMLIFrameElement>;

  orcamento: OrcamentoComercialDetalhe | null = null;
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
    this.carregarDados();
  }

  ngOnDestroy(): void {
    this.limparPdfUrl();
  }

  get subtituloPagina(): string {
    const protocolo = this.orcamento?.protocolo || 'Orçamento';
    return `Orçamento PDF · ${protocolo}`;
  }

  get voltarLink(): any[] {
    const id = this.route.snapshot.paramMap.get('id');
    return id ? ['/page/grafica/comercial-beta/orcamentos', id] : ['/page/grafica/comercial-beta/orcamentos'];
  }

  carregarDados(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.erro = 'Orçamento inválido.';
      return;
    }

    this.carregando = true;
    this.erro = null;
    this.limparPdfUrl();

    this.graficaService.buscarOrcamentoComercial(id).subscribe({
      next: orcamento => {
        this.orcamento = orcamento;
        this.carregarPdf(id);
      },
      error: error => {
        this.carregando = false;
        this.erro = this.errorMessage(error, 'Não foi possível carregar o orçamento.');
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
    this.graficaService.gerarImpressaoOrcamento(id)
      .pipe(finalize(() => this.carregando = false))
      .subscribe({
        next: response => {
          if (!response.body) {
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
    const protocolo = (this.orcamento?.protocolo || `orcamento-${this.route.snapshot.paramMap.get('id') || ''}`)
      .toString()
      .trim()
      .replace(/[^a-zA-Z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return `orcamento-${protocolo || 'documento'}.pdf`;
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
