import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { SiteConfigResponse, SiteConfigUpdateRequest, SiteWhatsappExibicao } from '../models/site-config.models';
import { SiteConfigService } from '../services/site-config.service';
import { getUrlClickManager, getUrlPublicaPrincipal } from '../utils/site-public-url.util';

@Component({
  selector: 'app-site-configuracoes',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    CardHeaderComponent,
    InputOptionsComponent,
    InputTelefoneComponent,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    TemPermissaoDirective,
  ],
  templateUrl: './site-configuracoes.component.html',
  styleUrl: './site-configuracoes.component.scss',
})
export class SiteConfiguracoesComponent implements OnInit {
  readonly exibicoesWhatsapp: Array<{ value: SiteWhatsappExibicao; label: string }> = [
    { value: 'ICONE', label: 'Somente ícone' },
    { value: 'ICONE_TEXTO', label: 'Ícone e texto' },
  ];

  form!: FormGroup;
  carregando = false;
  salvando = false;
  private configAtual: SiteConfigResponse | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly siteConfigService: SiteConfigService,
    private readonly authService: AuthService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      siteAtivo: [true],
      orcamentoAtivo: [true],
      whatsappAtivo: [true],
      whatsappTelefone: ['', [Validators.pattern(/^\d{10,13}$/)]],
      whatsappExibicao: ['ICONE_TEXTO' as SiteWhatsappExibicao, Validators.required],
      whatsappTexto: ['Fale conosco', Validators.maxLength(80)],
      whatsappMensagemInicial: ['Olá! Acessei o site e gostaria de mais informações.', Validators.maxLength(500)],
    });

    if (!this.podeEditar) {
      this.form.disable({ emitEvent: false });
    }

    this.carregarConfiguracao();
  }

  get podeEditar(): boolean {
    return this.authService.temPermissao('SITE_CONFIG_EDITAR');
  }

  get podeSalvar(): boolean {
    return this.podeEditar && !this.carregando && !this.salvando;
  }

  get siteAtivoControl(): FormControl {
    return this.form.get('siteAtivo') as FormControl;
  }

  get orcamentoAtivoControl(): FormControl {
    return this.form.get('orcamentoAtivo') as FormControl;
  }

  get whatsappAtivoControl(): FormControl {
    return this.form.get('whatsappAtivo') as FormControl;
  }

  get whatsappTelefoneControl(): FormControl {
    return this.form.get('whatsappTelefone') as FormControl;
  }

  get whatsappExibicaoControl(): FormControl {
    return this.form.get('whatsappExibicao') as FormControl;
  }

  get whatsappTextoControl(): FormControl {
    return this.form.get('whatsappTexto') as FormControl;
  }

  get whatsappMensagemInicialControl(): FormControl {
    return this.form.get('whatsappMensagemInicial') as FormControl;
  }

  get enderecoClickManager(): string {
    return getUrlClickManager(this.configAtual?.slugPublico);
  }

  get enderecoPublicoPrincipal(): string {
    return getUrlPublicaPrincipal(this.configParaUrlAtual());
  }

  get siteInativo(): boolean {
    return this.siteAtivoControl.value !== true;
  }

  get mensagemSiteInativo(): string {
    return this.siteInativo ? 'Site desativado. Ative o site para abrir este endereço.' : '';
  }

  carregarConfiguracao(): void {
    this.carregando = true;
    this.siteConfigService.buscar().subscribe({
      next: (config) => {
        this.carregando = false;
        this.preencherFormulario(config);
      },
      error: (err) => {
        this.carregando = false;
        this.toastr.error(err?.userMessage || 'Erro ao carregar as configurações do site.');
      },
    });
  }

  salvar(): void {
    if (!this.podeEditar) {
      this.toastr.warning('Você não tem permissão para editar as configurações do site.');
      return;
    }

    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      this.toastr.warning('Preencha os campos obrigatórios corretamente.');
      return;
    }

    this.salvando = true;
    this.siteConfigService.atualizar(this.buildPayload()).subscribe({
      next: (config) => {
        this.salvando = false;
        this.preencherFormulario(config);
        this.toastr.success('Configurações do site salvas com sucesso!');
      },
      error: (err) => {
        this.salvando = false;
        this.toastr.error(err?.userMessage || 'Erro ao salvar as configurações do site.');
      },
    });
  }

  abrirSite(): void {
    if (this.siteInativo) {
      this.toastr.warning('O site está desativado. Ative o site para abrir o endereço público.');
      return;
    }

    window.open(this.enderecoPublicoPrincipal, '_blank', 'noopener,noreferrer');
  }

  private preencherFormulario(config: SiteConfigResponse): void {
    this.configAtual = config;
    this.form.patchValue({
      siteAtivo: config.siteAtivo ?? true,
      orcamentoAtivo: config.orcamentoAtivo ?? true,
      whatsappAtivo: config.whatsappAtivo ?? true,
      whatsappTelefone: this.normalizarTelefoneParaFormulario(config.whatsappTelefone),
      whatsappExibicao: config.whatsappExibicao || 'ICONE_TEXTO',
      whatsappTexto: config.whatsappTexto || '',
      whatsappMensagemInicial: config.whatsappMensagemInicial || '',
    });
  }

  private buildPayload(): SiteConfigUpdateRequest {
    const raw = this.form.getRawValue();

    return {
      siteAtivo: !!raw.siteAtivo,
      orcamentoAtivo: !!raw.orcamentoAtivo,
      whatsappAtivo: !!raw.whatsappAtivo,
      whatsappTelefone: this.normalizarNulo(raw.whatsappTelefone)?.replace(/\D/g, '') || null,
      whatsappExibicao: raw.whatsappExibicao || 'ICONE_TEXTO',
      whatsappTexto: this.normalizarNulo(raw.whatsappTexto),
      whatsappMensagemInicial: this.normalizarNulo(raw.whatsappMensagemInicial),
    };
  }

  private normalizarNulo(value: unknown): string | null {
    const normalized = this.normalizarTexto(value);
    return normalized || null;
  }

  private normalizarTexto(value: unknown): string {
    return String(value || '').trim();
  }

  private configParaUrlAtual(): SiteConfigResponse {
    return {
      ...(this.configAtual || {
        slugPublico: '',
        orcamentoAtivo: true,
        whatsappAtivo: true,
        whatsappExibicao: 'ICONE_TEXTO' as SiteWhatsappExibicao,
      }),
      siteAtivo: this.siteAtivoControl.value === true,
    };
  }

  private normalizarTelefoneParaFormulario(value?: string | null): string {
    const telefone = String(value || '').replace(/\D/g, '');
    if ((telefone.length === 12 || telefone.length === 13) && telefone.startsWith('55')) {
      return telefone.slice(2);
    }
    return telefone;
  }

}
