import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { DepositoImagem } from '../../models/deposito.models';
import { DepositoImagemService } from '../../services/deposito-imagem.service';
import { getDepositoImageUrl } from '../../utils/deposito-image.util';
import {
  DEPOSITO_IMAGE_UPLOAD_LIMITS,
  extractDepositoImageUploadError,
  validateDepositoImageFile,
} from '../../utils/deposito-image-upload-validation.util';

interface UploadGaleriaResultado {
  imagem: DepositoImagem | null;
  fileName: string;
  erro?: string;
}

@Component({
  selector: 'app-deposito-imagem-galeria',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './deposito-imagem-galeria.component.html',
  styleUrl: './deposito-imagem-galeria.component.scss',
})
export class DepositoImagemGaleriaComponent implements OnChanges {
  @Input() context = 'produtos';
  @Input() uploadEndpoint?: string;
  @Input() maxImages?: number | null;
  @Input() imagemPrincipal?: DepositoImagem | null;
  @Input() imagens: DepositoImagem[] = [];
  @Input() gerenciarPrincipal = false;

  @Output() imagemPrincipalChange = new EventEmitter<DepositoImagem | null>();
  @Output() imagensChange = new EventEmitter<DepositoImagem[]>();
  @Output() uploadingChange = new EventEmitter<boolean>();

  imagemPrincipalInterna: DepositoImagem | null = null;
  imagensInternas: DepositoImagem[] = [];
  carregando = false;
  erro = '';
  arrastandoArquivos = false;
  readonly limitesUpload = DEPOSITO_IMAGE_UPLOAD_LIMITS;

  constructor(private readonly depositoImagemService: DepositoImagemService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['imagemPrincipal']) {
      this.imagemPrincipalInterna = this.imagemPrincipal || null;
    }

    if (changes['imagens']) {
      this.imagensInternas = this.removerDuplicadas(this.imagens || [], this.imagemPrincipalInterna?.id);
    }
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files || []);
    if (!files.length) {
      return;
    }

    await this.processarArquivos(files);

    if (input) {
      input.value = '';
    }
  }

  abrirSeletorArquivos(input: HTMLInputElement, event?: Event): void {
    event?.preventDefault();
    event?.stopPropagation();
    if (this.carregando || this.limiteAtingido) {
      return;
    }

    input.click();
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (!this.carregando) {
      this.arrastandoArquivos = true;
    }
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.arrastandoArquivos = false;
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    event.stopPropagation();
    this.arrastandoArquivos = false;

    if (this.carregando) {
      return;
    }

    const files = Array.from(event.dataTransfer?.files || []);
    if (!files.length) {
      return;
    }

    await this.processarArquivos(files);
  }

  private async processarArquivos(files: File[]): Promise<void> {
    const limite = this.maxImagesNormalizado;
    const vagasDisponiveis = Number.isFinite(limite) ? Math.max(limite - this.imagensParaExibicao.length, 0) : files.length;
    if (vagasDisponiveis <= 0) {
      this.erro = `Limite de ${limite} imagens por produto atingido.`;
      return;
    }

    const arquivosSelecionados = files.slice(0, vagasDisponiveis);
    const mensagensLimite = files.length > vagasDisponiveis
      ? [`Limite de ${limite} imagens por produto. ${files.length - vagasDisponiveis} arquivo(s) não foram enviados.`]
      : [];
    const validacoes = await Promise.all(
      arquivosSelecionados.map(async (file) => ({
        file,
        validacao: await validateDepositoImageFile(file),
      }))
    );
    const arquivosValidos = validacoes.filter((item) => item.validacao.valid).map((item) => item.file);
    const mensagensInvalidas = validacoes
      .filter((item) => !item.validacao.valid)
      .map((item) => `${item.file.name}: ${item.validacao.message || 'imagem inválida'}`);

    if (!arquivosValidos.length) {
      this.erro = [...mensagensLimite, ...mensagensInvalidas].join('\n\n') || 'Nenhuma imagem válida foi selecionada.';
      return;
    }

    this.erro = '';
    this.carregando = true;
    this.uploadingChange.emit(true);

    forkJoin(
      arquivosValidos.map((file) =>
        this.upload(file, {
          titulo: file.name,
          principal: false,
        }).pipe(
          catchError((error: unknown) =>
            of({
              imagem: null,
              fileName: file.name,
              erro: extractDepositoImageUploadError(error),
            } satisfies UploadGaleriaResultado)
          )
        )
      )
    ).subscribe({
      next: (resultado) => {
        const resultados = resultado.map((item, index): UploadGaleriaResultado => {
          if (item && 'imagem' in item) {
            return item;
          }

          return {
            imagem: item as DepositoImagem,
            fileName: arquivosValidos[index]?.name || 'imagem',
          };
        });
        const novasImagens = resultados
          .map((item) => item.imagem)
          .filter((item): item is DepositoImagem => !!item);
        const mensagensUpload = resultados
          .filter((item) => item.erro)
          .map((item) => `${item.fileName}: ${item.erro}`);

        this.adicionarNovasImagens(novasImagens);
        this.emitirMudanca();
        this.carregando = false;
        this.uploadingChange.emit(false);

        this.erro = [...mensagensLimite, ...mensagensInvalidas, ...mensagensUpload].join('\n\n');
      },
      error: () => {
        this.carregando = false;
        this.uploadingChange.emit(false);
        this.erro = 'Falha ao enviar as imagens da galeria.';
      },
    });
  }

  moverParaCima(index: number): void {
    const galeriaIndex = this.getGaleriaIndex(index);
    if (galeriaIndex <= 0) {
      return;
    }

    const lista = [...this.imagensInternas];
    [lista[galeriaIndex - 1], lista[galeriaIndex]] = [lista[galeriaIndex], lista[galeriaIndex - 1]];
    this.imagensInternas = lista;
    this.emitirMudanca();
  }

  moverParaBaixo(index: number): void {
    const galeriaIndex = this.getGaleriaIndex(index);
    if (galeriaIndex < 0 || galeriaIndex >= this.imagensInternas.length - 1) {
      return;
    }

    const lista = [...this.imagensInternas];
    [lista[galeriaIndex + 1], lista[galeriaIndex]] = [lista[galeriaIndex], lista[galeriaIndex + 1]];
    this.imagensInternas = lista;
    this.emitirMudanca();
  }

  remover(index: number): void {
    const imagem = this.imagensParaExibicao[index];
    if (!imagem) {
      return;
    }

    if (this.isImagemPrincipal(imagem)) {
      this.imagemPrincipalInterna = this.imagensInternas[0] || null;
      this.imagensInternas = this.imagensInternas.filter((item) => item.id !== this.imagemPrincipalInterna?.id);
      this.imagemPrincipalChange.emit(this.imagemPrincipalInterna);
      this.emitirMudanca();
      return;
    }

    this.imagensInternas = this.imagensInternas.filter((item) => item.id !== imagem.id);
    this.emitirMudanca();
  }

  trackByImagem(index: number, imagem: DepositoImagem): number {
    return imagem.id ?? index;
  }

  get imagensParaExibicao(): DepositoImagem[] {
    if (!this.gerenciarPrincipal || !this.imagemPrincipalInterna) {
      return this.imagensInternas;
    }

    return [
      this.imagemPrincipalInterna,
      ...this.imagensInternas.filter((imagem) => imagem.id !== this.imagemPrincipalInterna?.id),
    ];
  }

  get possuiImagens(): boolean {
    return this.imagensParaExibicao.length > 0;
  }

  get limiteAtingido(): boolean {
    const limite = this.maxImagesNormalizado;
    return Number.isFinite(limite) && this.imagensParaExibicao.length >= limite;
  }

  isImagemPrincipal(imagem: DepositoImagem): boolean {
    return this.gerenciarPrincipal && !!this.imagemPrincipalInterna?.id && this.imagemPrincipalInterna.id === imagem.id;
  }

  podeMoverParaCima(index: number, imagem: DepositoImagem): boolean {
    return !this.isImagemPrincipal(imagem) && this.getGaleriaIndex(index) > 0;
  }

  podeMoverParaBaixo(index: number, imagem: DepositoImagem): boolean {
    const galeriaIndex = this.getGaleriaIndex(index);
    return !this.isImagemPrincipal(imagem) && galeriaIndex >= 0 && galeriaIndex < this.imagensInternas.length - 1;
  }

  definirPrincipal(imagem: DepositoImagem): void {
    if (!this.gerenciarPrincipal || this.isImagemPrincipal(imagem)) {
      return;
    }

    const principalAnterior = this.imagemPrincipalInterna;
    this.imagemPrincipalInterna = imagem;
    this.imagensInternas = this.removerDuplicadas(
      [
        ...(principalAnterior ? [principalAnterior] : []),
        ...this.imagensInternas.filter((item) => item.id !== imagem.id),
      ],
      imagem.id
    );
    this.imagemPrincipalChange.emit(imagem);
    this.emitirMudanca();
  }

  getImagemSrc(imagem?: DepositoImagem | null): string {
    return getDepositoImageUrl(imagem, undefined, 'THUMBNAIL');
  }

  private emitirMudanca(): void {
    this.imagensChange.emit([...this.imagensInternas]);
  }

  private adicionarNovasImagens(novasImagens: DepositoImagem[]): void {
    if (!novasImagens.length) {
      return;
    }

    const imagensParaGaleria = [...novasImagens];
    if (this.gerenciarPrincipal && !this.imagemPrincipalInterna) {
      this.imagemPrincipalInterna = imagensParaGaleria.shift() || null;
      this.imagemPrincipalChange.emit(this.imagemPrincipalInterna);
    }

    const limite = this.maxImagesNormalizado;
    const vagasGaleria = Number.isFinite(limite)
      ? Math.max(limite - (this.imagemPrincipalInterna ? 1 : 0), 0)
      : Number.POSITIVE_INFINITY;
    this.imagensInternas = this.removerDuplicadas([...this.imagensInternas, ...imagensParaGaleria], this.imagemPrincipalInterna?.id)
      .slice(0, vagasGaleria);
  }

  private removerDuplicadas(imagens: DepositoImagem[], ignorarId?: number | null): DepositoImagem[] {
    const ids = new Set<number>();
    return imagens.filter((imagem) => {
      if (!Number.isFinite(imagem.id) || imagem.id === ignorarId || ids.has(imagem.id)) {
        return false;
      }

      ids.add(imagem.id);
      return true;
    });
  }

  private getGaleriaIndex(displayIndex: number): number {
    return this.gerenciarPrincipal && this.imagemPrincipalInterna ? displayIndex - 1 : displayIndex;
  }

  private upload(file: File, metadata: { titulo: string; principal: boolean }) {
    if (this.uploadEndpoint?.trim()) {
      return this.depositoImagemService.uploadToEndpoint(this.uploadEndpoint.trim(), file, this.context, metadata);
    }

    return this.depositoImagemService.upload(file, this.context, metadata);
  }

  private get maxImagesNormalizado(): number {
    return Number.isFinite(this.maxImages) && Number(this.maxImages) > 0
      ? Math.floor(Number(this.maxImages))
      : Number.POSITIVE_INFINITY;
  }
}
