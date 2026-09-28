import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-site-banner-image-upload',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './site-banner-image-upload.component.html',
  styleUrl: './site-banner-image-upload.component.scss',
})
export class SiteBannerImageUploadComponent implements OnChanges {
  @Input() imagemAtual?: string | null;
  @Input() altText = 'Banner do site';
  @Input() required = false;

  @Output() fileChange = new EventEmitter<File | null>();
  @Output() previewChange = new EventEmitter<string | null>();

  previewUrl = '';
  arquivoNome = '';
  arquivoTamanho = '';
  erro = '';
  private arquivoSelecionado: File | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imagemAtual'] && !this.arquivoSelecionado) {
      this.previewUrl = this.imagemAtual || '';
      this.previewChange.emit(this.previewUrl || null);
    }
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) {
      return;
    }

    if (!this.validarArquivo(file)) {
      this.limparInput(input);
      return;
    }

    this.erro = '';
    this.arquivoSelecionado = file;
    this.arquivoNome = file.name;
    this.arquivoTamanho = this.formatarTamanho(file.size);
    this.fileChange.emit(file);
    this.previewLocal(file);
    this.limparInput(input);
  }

  remover(): void {
    this.arquivoSelecionado = null;
    this.previewUrl = this.imagemAtual || '';
    this.arquivoNome = '';
    this.arquivoTamanho = '';
    this.erro = '';
    this.fileChange.emit(null);
    this.previewChange.emit(this.previewUrl || null);
  }

  restaurarSelecao(imagemAtual: string | null | undefined = this.imagemAtual): void {
    this.arquivoSelecionado = null;
    this.imagemAtual = imagemAtual || '';
    this.previewUrl = this.imagemAtual || '';
    this.arquivoNome = '';
    this.arquivoTamanho = '';
    this.erro = '';
    this.fileChange.emit(null);
    this.previewChange.emit(this.previewUrl || null);
  }

  limparTudo(): void {
    this.arquivoSelecionado = null;
    this.previewUrl = '';
    this.arquivoNome = '';
    this.arquivoTamanho = '';
    this.erro = '';
    this.fileChange.emit(null);
    this.previewChange.emit(null);
  }

  get possuiImagem(): boolean {
    return !!this.previewUrl;
  }

  get textoAcao(): string {
    return this.possuiImagem ? 'Trocar imagem' : 'Selecionar imagem';
  }

  get podeRemover(): boolean {
    return !!this.arquivoSelecionado || !!this.previewUrl;
  }

  private validarArquivo(file: File): boolean {
    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp'];
    if (!tiposPermitidos.includes(file.type)) {
      this.erro = 'Formato inválido. Use JPG, PNG ou WEBP.';
      return false;
    }

    return true;
  }

  private previewLocal(file: File): void {
    const reader = new FileReader();
    reader.onload = () => {
      this.previewUrl = String(reader.result || '');
      this.previewChange.emit(this.previewUrl || null);
    };
    reader.readAsDataURL(file);
  }

  private limparInput(input?: HTMLInputElement | null): void {
    if (input) {
      input.value = '';
    }
  }

  private formatarTamanho(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
