import { CommonModule } from '@angular/common';
import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import QRCode from 'qrcode';
import { MaterialModule } from 'src/app/material.module';

@Component({
  selector: 'app-links-share-panel',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './links-share-panel.component.html',
  styleUrls: ['./links-share-panel.component.scss'],
})
export class LinksSharePanelComponent implements OnChanges {
  @Input() url = '';
  @Input() slug = '';
  @Input() showOpen = true;

  qrDataUrl = '';
  gerandoQr = false;
  private qrUrl = '';

  constructor(private readonly toastr: ToastrService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['url']) return;
    this.qrDataUrl = '';
    this.qrUrl = '';
    if (this.url) {
      void this.gerarQrCode(false);
    }
  }

  copiarUrlPublica(): void {
    if (!this.url) {
      this.toastr.warning('Defina o endereço público antes de copiar.');
      return;
    }
    navigator.clipboard?.writeText(this.url)
      .then(() => this.toastr.success('Link copiado.'))
      .catch(() => this.toastr.warning('Não foi possível copiar automaticamente.'));
  }

  abrirPaginaPublica(): void {
    if (!this.url) {
      this.toastr.warning('Defina o endereço público antes de abrir.');
      return;
    }
    window.open(this.url, '_blank', 'noopener,noreferrer');
  }

  async gerarQrCode(notificarSemUrl = true): Promise<void> {
    if (!this.url) {
      if (notificarSemUrl) {
        this.toastr.warning('Defina o endereço público antes de gerar o QR Code.');
      }
      return;
    }
    if (this.qrDataUrl && this.qrUrl === this.url) return;
    this.gerandoQr = true;
    try {
      this.qrDataUrl = await QRCode.toDataURL(this.url, {
        width: 1024,
        margin: 4,
        errorCorrectionLevel: 'M',
        color: { dark: '#111111', light: '#FFFFFF' },
      });
      this.qrUrl = this.url;
    } catch {
      this.toastr.error('Não foi possível gerar o QR Code.');
    } finally {
      this.gerandoQr = false;
    }
  }

  baixarQrCode(): void {
    if (!this.qrDataUrl) {
      void this.gerarQrCode();
      return;
    }
    const anchor = document.createElement('a');
    anchor.href = this.qrDataUrl;
    anchor.download = `clicklink-${this.slug || 'pagina'}.png`;
    anchor.click();
  }
}
