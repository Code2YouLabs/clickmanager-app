import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormArray, FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { MaterialModule } from 'src/app/material.module';
import {
  SitePaginaBlocoResponse,
  SitePaginaBlocoTipo,
} from 'src/app/pages/site/models/site-pagina-bloco.models';
import { SitePaginaBlocoService } from 'src/app/pages/site/services/site-pagina-bloco.service';
import { BlocoImageUploadComponent } from '../bloco-image-upload/bloco-image-upload.component';

export interface FormBlocoDialogData {
  mobilePanel?: boolean;
  paginaId: number;
  bloco?: SitePaginaBlocoResponse | null;
  proximaOrdem?: number;
}

@Component({
  selector: 'app-form-bloco',
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MaterialModule,
    InputTextareaComponent,
    InputTextoRestritoComponent,
    BlocoImageUploadComponent,
  ],
  templateUrl: './form-bloco.component.html',
  styleUrl: './form-bloco.component.scss',
})
export class FormBlocoComponent implements OnInit {
  get mobilePanel(): boolean { return !!this.data.mobilePanel; }
  readonly tipos: Array<{ value: SitePaginaBlocoTipo; label: string; disabled?: boolean }> = [
    { value: 'TEXTO', label: 'Texto' },
    { value: 'IMAGEM', label: 'Imagem' },
    { value: 'TEXTO_IMAGEM', label: 'Texto + imagem' },
    { value: 'FAQ', label: 'FAQ' },
    { value: 'CTA', label: 'CTA' },
    { value: 'VIDEO', label: 'Video' },
    { value: 'GALERIA', label: 'Galeria' },
    { value: 'MAPA', label: 'Mapa' },
    { value: 'PRODUTOS', label: 'Produtos' },
    { value: 'CATEGORIAS', label: 'Categorias' },
    { value: 'MARCAS', label: 'Marcas' },
  ];

  readonly posicoesImagem = [
    { value: 'ESQUERDA', label: 'Esquerda' },
    { value: 'DIREITA', label: 'Direita' },
  ];

  form!: FormGroup;
  imagemSelecionada: File | null = null;
  imagemAtualUrl = '';
  salvando = false;
  avisoJsonInvalido = false;

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<FormBlocoComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: FormBlocoDialogData,
    private readonly blocoService: SitePaginaBlocoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const bloco = this.data.bloco;
    const conteudo = this.parseConteudo(bloco?.conteudoJson);

    this.form = this.fb.group({
      tipo: [bloco?.tipo || 'TEXTO', Validators.required],
      titulo: [bloco?.titulo || ''],
      subtitulo: [bloco?.subtitulo || ''],
      ordem: [bloco?.ordem ?? this.data.proximaOrdem ?? 1],
      ativo: [bloco?.ativo ?? true],
      altText: [bloco?.altText || ''],
      html: [conteudo['html'] || ''],
      posicaoImagem: [conteudo['posicaoImagem'] || 'ESQUERDA'],
      textoBotao: [conteudo['textoBotao'] || ''],
      url: [conteudo['url'] || ''],
      abrirEmNovaAba: [conteudo['abrirEmNovaAba'] ?? false],
      urlEmbed: [conteudo['urlEmbed'] || ''],
      limite: [conteudo['limite'] ?? 6],
      faqItens: this.fb.array([]),
    });

    this.imagemAtualUrl = bloco?.imagemUrl || '';
    this.preencherFaq(conteudo['itens']);
    this.tipoControl.valueChanges.subscribe(() => this.atualizarValidadoresPorTipo());
    this.atualizarValidadoresPorTipo();
  }

  get isEditMode(): boolean {
    return !!this.data.bloco?.id;
  }

  get tituloDialog(): string {
    return this.isEditMode ? 'Editar bloco' : 'Adicionar bloco';
  }

  get tipoControl(): FormControl {
    return this.form.get('tipo') as FormControl;
  }

  get tituloControl(): FormControl {
    return this.form.get('titulo') as FormControl;
  }

  get subtituloControl(): FormControl {
    return this.form.get('subtitulo') as FormControl;
  }

  get altTextControl(): FormControl {
    return this.form.get('altText') as FormControl;
  }

  get htmlControl(): FormControl {
    return this.form.get('html') as FormControl;
  }

  get faqItens(): FormArray {
    return this.form.get('faqItens') as FormArray;
  }

  get tipoSelecionado(): SitePaginaBlocoTipo {
    return this.tipoControl.value as SitePaginaBlocoTipo;
  }

  get exigeImagem(): boolean {
    return ['IMAGEM', 'TEXTO_IMAGEM'].includes(this.tipoSelecionado);
  }

  get mostraImagem(): boolean {
    return ['IMAGEM', 'TEXTO_IMAGEM', 'GALERIA'].includes(this.tipoSelecionado);
  }

  get imagemObrigatoriaPendente(): boolean {
    return this.exigeImagem && !this.isEditMode && !this.imagemSelecionada && !this.imagemAtualUrl;
  }

  adicionarFaqItem(): void {
    this.faqItens.push(this.criarFaqItem());
  }

  removerFaqItem(index: number): void {
    this.faqItens.removeAt(index);
  }

  onImagemSelecionada(file: File | null): void {
    this.imagemSelecionada = file;
  }

  salvar(): void {
    if (this.imagemObrigatoriaPendente) {
      this.toastr.warning('Selecione uma imagem para este tipo de bloco.');
      return;
    }

    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.salvando = true;
    const request$ = this.isEditMode
      ? this.blocoService.atualizar(this.data.paginaId, this.data.bloco!.id, payload)
      : this.blocoService.criar(this.data.paginaId, payload);

    request$.subscribe({
      next: () => {
        this.salvando = false;
        this.dialogRef.close({
          salvou: true,
          acao: this.isEditMode ? 'atualizado' : 'criado',
        });
      },
      error: (err) => {
        this.salvando = false;
        this.toastr.error(err?.userMessage || 'Não foi possível salvar o bloco.');
      },
    });
  }

  cancelar(): void {
    this.dialogRef.close(false);
  }

  private buildPayload(): any {
    const raw = this.form.getRawValue();
    return {
      tipo: raw.tipo,
      titulo: this.trimOrNull(raw.titulo),
      subtitulo: this.trimOrNull(raw.subtitulo),
      altText: this.trimOrNull(raw.altText),
      ordem: this.toNumberOrNull(raw.ordem),
      ativo: !!raw.ativo,
      conteudoJson: JSON.stringify(this.buildConteudoJson(raw)),
      imagem: this.imagemSelecionada,
    };
  }

  private buildConteudoJson(raw: any): Record<string, unknown> {
    switch (raw.tipo as SitePaginaBlocoTipo) {
      case 'TEXTO':
        return { html: raw.html || '' };
      case 'TEXTO_IMAGEM':
        return { html: raw.html || '', posicaoImagem: raw.posicaoImagem || 'ESQUERDA' };
      case 'FAQ':
        return {
          itens: (raw.faqItens || [])
            .map((item: any) => ({
              pergunta: String(item.pergunta || '').trim(),
              resposta: String(item.resposta || '').trim(),
            }))
            .filter((item: any) => item.pergunta || item.resposta),
        };
      case 'CTA':
        return {
          textoBotao: raw.textoBotao || '',
          url: raw.url || '',
          abrirEmNovaAba: !!raw.abrirEmNovaAba,
        };
      case 'VIDEO':
        return { url: raw.url || '' };
      case 'MAPA':
        return { urlEmbed: raw.urlEmbed || '' };
      case 'PRODUTOS':
      case 'CATEGORIAS':
      case 'MARCAS':
        return { limite: this.toNumberOrNull(raw.limite) ?? 6 };
      default:
        return {};
    }
  }

  private atualizarValidadoresPorTipo(): void {
    const tipo = this.tipoSelecionado;
    this.htmlControl.clearValidators();
    this.form.get('textoBotao')?.clearValidators();
    this.form.get('url')?.clearValidators();
    this.form.get('urlEmbed')?.clearValidators();
    this.form.get('limite')?.clearValidators();

    if (['TEXTO', 'TEXTO_IMAGEM'].includes(tipo)) {
      this.htmlControl.addValidators(Validators.required);
    }

    if (tipo === 'CTA') {
      this.form.get('textoBotao')?.addValidators(Validators.required);
      this.form.get('url')?.addValidators(Validators.required);
    }

    if (tipo === 'VIDEO') {
      this.form.get('url')?.addValidators(Validators.required);
    }

    if (tipo === 'MAPA') {
      this.form.get('urlEmbed')?.addValidators(Validators.required);
    }

    if (['PRODUTOS', 'CATEGORIAS', 'MARCAS'].includes(tipo)) {
      this.form.get('limite')?.addValidators([Validators.required, Validators.min(1)]);
    }

    this.htmlControl.updateValueAndValidity({ emitEvent: false });
    this.form.get('textoBotao')?.updateValueAndValidity({ emitEvent: false });
    this.form.get('url')?.updateValueAndValidity({ emitEvent: false });
    this.form.get('urlEmbed')?.updateValueAndValidity({ emitEvent: false });
    this.form.get('limite')?.updateValueAndValidity({ emitEvent: false });
  }

  private preencherFaq(itens: unknown): void {
    const lista = Array.isArray(itens) && itens.length ? itens : [{ pergunta: '', resposta: '' }];
    lista.forEach((item: any) => {
      this.faqItens.push(this.criarFaqItem(item?.pergunta, item?.resposta));
    });
  }

  private criarFaqItem(pergunta = '', resposta = ''): FormGroup {
    return this.fb.group({
      pergunta: [pergunta],
      resposta: [resposta],
    });
  }

  private parseConteudo(value: SitePaginaBlocoResponse['conteudoJson']): Record<string, any> {
    this.avisoJsonInvalido = false;
    if (!value) {
      return {};
    }

    if (typeof value === 'object') {
      return value as Record<string, any>;
    }

    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      this.avisoJsonInvalido = true;
      return {};
    }
  }

  private trimOrNull(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
}
