import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { resolveStorageImageUrl } from 'src/app/pages/storage/utils/storage-media-url.util';
import { BannerPreviewComponent } from '../banner-preview/banner-preview.component';
import { SiteBannerImageUploadComponent } from '../site-banner-image-upload/site-banner-image-upload.component';
import { SiteBannerCorTexto, SiteBannerPosicaoTexto, SiteBannerResponse } from '../../models/site-banner.models';
import { SiteBannerService } from '../../services/site-banner.service';

@Component({
  selector: 'app-form-banner',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    SiteBannerImageUploadComponent,
    BannerPreviewComponent,
  ],
  templateUrl: './form-banner.component.html',
  styleUrl: './form-banner.component.scss',
})
export class FormBannerComponent implements OnInit {
  readonly posicoesTexto: Array<{ value: SiteBannerPosicaoTexto; label: string }> = [
    { value: 'ESQUERDA', label: 'Esquerda' },
    { value: 'CENTRO', label: 'Centro' },
    { value: 'DIREITA', label: 'Direita' },
  ];
  readonly coresTexto: Array<{ value: SiteBannerCorTexto; label: string }> = [
    { value: 'CLARO', label: 'Claro' },
    { value: 'ESCURO', label: 'Escuro' },
  ];

  form!: FormGroup;
  readonly formState = new PageFormState(() => this.form, {
    read: () => this.snapshotImagem(),
    write: (value) => this.restaurarImagem(value),
  });
  isEditMode = false;
  bannerId!: number;
  carregando = false;
  salvando = false;
  imagemSelecionada: File | null = null;
  imagemAtualUrl = '';
  previewImagemUrl = '';
  @ViewChild(SiteBannerImageUploadComponent) private imageUpload?: SiteBannerImageUploadComponent;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly siteBannerService: SiteBannerService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      titulo: [''],
      subtitulo: [''],
      descricao: [''],
      ctaTexto: [''],
      ctaUrl: [''],
      abrirEmNovaAba: [false],
      altText: [''],
      ordem: [1],
      ativo: [true],
      posicaoTexto: ['ESQUERDA'],
      corTexto: ['CLARO'],
      overlayAtivo: [true],
      overlayOpacidade: [45],
      dataInicio: [''],
      dataFim: [''],
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.isEditMode = !!id;
      this.bannerId = id ? +id : 0;
      this.imagemSelecionada = null;
      this.imagemAtualUrl = '';
      this.previewImagemUrl = '';
      this.form.reset(this.defaultsCriacao());
      if (!id) {
        this.carregarProximaOrdem();
        return;
      }

      this.formState.begin('edit');
      this.carregarBanner(this.bannerId);
    });
  }

  get tituloControl(): FormControl {
    return this.form.get('titulo') as FormControl;
  }

  get subtituloControl(): FormControl {
    return this.form.get('subtitulo') as FormControl;
  }

  get descricaoControl(): FormControl {
    return this.form.get('descricao') as FormControl;
  }

  get ctaTextoControl(): FormControl {
    return this.form.get('ctaTexto') as FormControl;
  }

  get ctaUrlControl(): FormControl {
    return this.form.get('ctaUrl') as FormControl;
  }

  get abrirEmNovaAbaControl(): FormControl {
    return this.form.get('abrirEmNovaAba') as FormControl;
  }

  get altTextControl(): FormControl {
    return this.form.get('altText') as FormControl;
  }

  get ordemControl(): FormControl {
    return this.form.get('ordem') as FormControl;
  }

  get ativoControl(): FormControl {
    return this.form.get('ativo') as FormControl;
  }

  get posicaoTextoControl(): FormControl {
    return this.form.get('posicaoTexto') as FormControl;
  }

  get corTextoControl(): FormControl {
    return this.form.get('corTexto') as FormControl;
  }

  get overlayAtivoControl(): FormControl {
    return this.form.get('overlayAtivo') as FormControl;
  }

  get overlayOpacidadeControl(): FormControl {
    return this.form.get('overlayOpacidade') as FormControl;
  }

  get dataInicioControl(): FormControl {
    return this.form.get('dataInicio') as FormControl;
  }

  get dataFimControl(): FormControl {
    return this.form.get('dataFim') as FormControl;
  }

  get tituloPagina(): string {
    return this.isEditMode ? 'Editar banner' : 'Novo banner';
  }

  get textoAcaoPrincipal(): string {
    return this.isEditMode ? 'Atualizar' : 'Salvar';
  }

  get podeSalvar(): boolean {
    return !this.salvando && !this.carregando;
  }

  get footerActions(): PageCardAction[] {
    if (this.carregando) {
      return [];
    }

    return [{
      id: 'salvar',
      type: 'submit',
      form: 'site-banner-form',
      disabled: this.salvando,
    }];
  }

  get previewImagem(): string {
    return this.previewImagemUrl || this.imagemAtualUrl;
  }

  onImagemSelecionada(file: File | null): void {
    this.imagemSelecionada = file;
  }

  onPreviewChange(preview: string | null): void {
    this.previewImagemUrl = preview || '';
  }

  onSubmit(): void {
    if (!this.isEditMode && !this.imagemSelecionada) {
      this.toastr.warning('Selecione uma imagem para criar o banner.');
      return;
    }

    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.salvando = true;

    const request$ = this.isEditMode
      ? this.siteBannerService.atualizar(this.bannerId, payload)
      : this.siteBannerService.criar({ ...payload, imagem: this.imagemSelecionada as File });

    request$.pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Banner atualizado com sucesso!' : 'Banner criado com sucesso!');
        this.router.navigate(['/page/site/banners']);
      },
      error: (err) => {
        this.toastr.error(err?.userMessage || (this.isEditMode ? 'Erro ao atualizar o banner.' : 'Erro ao criar o banner.'));
      },
    });
  }

  private carregarBanner(id: number): void {
    this.carregando = true;
    this.siteBannerService.buscarPorId(id).subscribe({
      next: (banner) => {
        this.carregando = false;
        this.preencherFormulario(banner);
        this.formState.loaded();
      },
      error: () => {
        this.carregando = false;
        this.toastr.error('Erro ao carregar o banner.');
        this.router.navigate(['/page/site/banners']);
      },
    });
  }

  private carregarProximaOrdem(): void {
    this.siteBannerService.listar({ page: 0, size: 200, sort: 'ordem,asc' }).subscribe({
      next: (response) => {
        const banners = Array.isArray(response) ? response : response.content || [];
        const maiorOrdem = banners.reduce((maior, banner) => Math.max(maior, Number(banner.ordem || 0)), 0);
        this.ordemControl.setValue(maiorOrdem + 1 || 1);
        this.formState.begin('create');
      },
      error: () => {
        this.ordemControl.setValue(1);
        this.formState.begin('create');
      },
    });
  }

  private preencherFormulario(banner: SiteBannerResponse): void {
    this.imagemAtualUrl = resolveStorageImageUrl(banner, 'DESKTOP', '');
    this.previewImagemUrl = this.imagemAtualUrl;
    this.form.patchValue({
      titulo: banner.titulo || '',
      subtitulo: banner.subtitulo || '',
      descricao: banner.descricao || '',
      ctaTexto: banner.ctaTexto || '',
      ctaUrl: banner.ctaUrl || '',
      abrirEmNovaAba: !!banner.abrirEmNovaAba,
      altText: banner.altText || '',
      ordem: banner.ordem ?? 1,
      ativo: banner.ativo ?? true,
      posicaoTexto: banner.posicaoTexto || 'ESQUERDA',
      corTexto: banner.corTexto || 'CLARO',
      overlayAtivo: banner.overlayAtivo ?? true,
      overlayOpacidade: this.normalizarOpacidade(banner.overlayOpacidade),
      dataInicio: this.toDateInputValue(banner.dataInicio),
      dataFim: this.toDateInputValue(banner.dataFim),
    });
  }

  private buildPayload(): any {
    const raw = this.form.getRawValue();

    return {
      titulo: this.trimOrNull(raw.titulo),
      subtitulo: this.trimOrNull(raw.subtitulo),
      descricao: this.trimOrNull(raw.descricao),
      ctaTexto: this.trimOrNull(raw.ctaTexto),
      ctaUrl: this.trimOrNull(raw.ctaUrl),
      altText: this.trimOrNull(raw.altText),
      ordem: raw.ordem === null || raw.ordem === '' ? null : Number(raw.ordem),
      ativo: !!raw.ativo,
      abrirEmNovaAba: !!raw.abrirEmNovaAba,
      posicaoTexto: raw.posicaoTexto || 'ESQUERDA',
      corTexto: raw.corTexto || 'CLARO',
      overlayAtivo: !!raw.overlayAtivo,
      overlayOpacidade: this.normalizarOpacidade(raw.overlayOpacidade),
      dataInicio: this.toLocalDateTime(raw.dataInicio, 'start'),
      dataFim: this.toLocalDateTime(raw.dataFim, 'end'),
      imagem: this.imagemSelecionada,
    };
  }

  private trimOrNull(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private toDateInputValue(value?: string | null): string {
    if (!value) {
      return '';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value).slice(0, 10);
    }

    return date.toISOString().slice(0, 10);
  }

  private normalizarOpacidade(value: unknown): number {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      return 45;
    }

    return Math.min(100, Math.max(0, Math.round(parsed)));
  }

  private toLocalDateTime(value: unknown, boundary: 'start' | 'end'): string | null {
    const normalized = this.trimOrNull(value);
    if (!normalized) {
      return null;
    }

    if (normalized.includes('T')) {
      return normalized;
    }

    return boundary === 'start'
      ? `${normalized}T00:00:00`
      : `${normalized}T23:59:59`;
  }

  private defaultsCriacao(): Record<string, unknown> {
    return {
      titulo: '',
      subtitulo: '',
      descricao: '',
      ctaTexto: '',
      ctaUrl: '',
      abrirEmNovaAba: false,
      altText: '',
      ordem: 1,
      ativo: true,
      posicaoTexto: 'ESQUERDA',
      corTexto: 'CLARO',
      overlayAtivo: true,
      overlayOpacidade: 45,
      dataInicio: '',
      dataFim: '',
    };
  }

  private snapshotImagem(): { selecionada: File | null; atual: string; preview: string } {
    return {
      selecionada: this.imagemSelecionada,
      atual: this.imagemAtualUrl,
      preview: this.previewImagemUrl,
    };
  }

  private restaurarImagem(value: { selecionada: File | null; atual: string; preview: string } | undefined): void {
    this.imagemSelecionada = value?.selecionada || null;
    this.imagemAtualUrl = value?.atual || '';
    this.previewImagemUrl = value?.preview || '';
    this.imageUpload?.restaurarSelecao(this.imagemAtualUrl);
  }
}
