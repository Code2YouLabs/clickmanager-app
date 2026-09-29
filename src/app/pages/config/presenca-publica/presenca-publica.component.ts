import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { MaterialModule } from 'src/app/material.module';
import { getClickManagerPublicHost, normalizeHostInput } from '../../links/utils/links-url.util';
import { catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { PresencaPublicaResponse, PresencaPublicaSlugDisponivelResponse } from './presenca-publica.models';
import { PresencaPublicaService } from './presenca-publica.service';

@Component({
  selector: 'app-presenca-publica',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    StatusBadgeComponent,
  ],
  templateUrl: './presenca-publica.component.html',
  styleUrl: './presenca-publica.component.scss',
})
export class PresencaPublicaComponent implements OnInit {
  readonly formId = 'presenca-publica-form';
  presenca: PresencaPublicaResponse | null = null;
  carregando = true;
  erro: string | null = null;
  semPermissao = false;
  salvando = false;
  consultandoSlug = false;
  salvandoSlug = false;
  slugConsultado: PresencaPublicaSlugDisponivelResponse | null = null;
  readonly dominioFixo = 'clickmanager.com.br';
  private consultaSlugId = 0;

  readonly form = this.fb.group({
    slug: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    dominio: ['', [Validators.maxLength(255)]],
    ativo: [false],
  });

  readonly formState = new PageFormState(() => this.form, {
    read: () => this.slugConsultado,
    write: (slugConsultado) => {
      this.slugConsultado = slugConsultado ?? null;
    },
    canReset: () => this.form.dirty || this.slugConsultado !== null,
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: PresencaPublicaService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.formState.begin('edit');
    this.carregar();
    this.slugControl.valueChanges.subscribe(() => {
      this.slugConsultado = null;
    });
  }

  get slugControl(): FormControl<string | null> {
    return this.form.get('slug') as FormControl<string | null>;
  }

  get dominioControl(): FormControl<string | null> {
    return this.form.get('dominio') as FormControl<string | null>;
  }

  get ativoControl(): FormControl<boolean | null> {
    return this.form.get('ativo') as FormControl<boolean | null>;
  }

  get enderecoClickManager(): string {
    return getClickManagerPublicHost(this.presenca?.slugPublico) || 'Endereço ainda não gerado';
  }

  get slugPreviewHost(): string {
    const slug = this.slugControl.value || this.presenca?.slugPublico || '';
    return slug ? `${slug}.${this.dominioFixo}` : this.dominioFixo;
  }

  get slugAtual(): string {
    return this.presenca?.slugPublico || '';
  }

  get slugAlterado(): boolean {
    return (this.slugControl.value || '') !== this.slugAtual;
  }

  get slugDisponivelParaSalvar(): boolean {
    const slug = this.slugControl.value || '';
    return this.slugAlterado && !!this.slugConsultado?.disponivel && this.slugConsultado.slug === slug;
  }

  get podeSalvarSlug(): boolean {
    return this.slugControl.valid && this.slugDisponivelParaSalvar && !this.consultandoSlug && !this.salvandoSlug && !this.carregando && !this.erro && !this.semPermissao;
  }

  get footerActions(): PageCardAction[] {
    if (this.carregando || this.erro || this.semPermissao) return [];
    return [{
      id: 'salvar-presenca-publica',
      type: 'submit',
      form: this.formId,
      disabled: !this.podeSalvarSlug,
    }];
  }

  get pageFormState(): PageFormState<PresencaPublicaSlugDisponivelResponse | null> | undefined {
    return !this.carregando && !this.erro && !this.semPermissao ? this.formState : undefined;
  }

  get dominioNormalizado(): string {
    return normalizeHostInput(this.dominioControl.value);
  }

  get dominioConfigurado(): boolean {
    return !!normalizeHostInput(this.presenca?.dominioProprio);
  }

  get statusDominio(): string {
    if (!this.dominioConfigurado) {
      return 'Não configurado';
    }
    return this.presenca?.dominioProprioAtivo ? 'Ativo' : 'Inativo';
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.formState.begin('edit');
    this.service.buscar().subscribe({
      next: (presenca) => {
        this.carregando = false;
        this.aplicarPresenca(presenca);
        this.formState.loaded();
      },
      error: (err) => {
        this.carregando = false;
        this.semPermissao = err?.status === 403;
        this.erro = this.semPermissao ? null : (err?.userMessage || 'Erro ao carregar a presença pública.');
        if (!this.semPermissao) {
          this.toastr.error(this.erro || 'Erro ao carregar a presença pública.');
        }
      },
    });
  }

  normalizarSlugDigitado(): void {
    const atual = this.slugControl.value || '';
    const normalizado = catalogoSlugify(atual);
    if (atual !== normalizado) {
      this.slugControl.setValue(normalizado, { emitEvent: false });
      this.slugConsultado = null;
    }
  }

  consultarSlug(): void {
    this.normalizarSlugDigitado();
    if (this.slugControl.invalid || this.consultandoSlug) {
      this.slugControl.markAsTouched();
      return;
    }

    const slug = this.slugControl.value || '';
    if (!this.slugAlterado) {
      this.slugConsultado = { slug, disponivel: true };
      this.toastr.success('Este já é o endereço atual da empresa.');
      return;
    }

    const consultaId = ++this.consultaSlugId;
    this.consultandoSlug = true;
    this.service.consultarSlugDisponivel(slug).subscribe({
      next: (resultado) => {
        if (consultaId !== this.consultaSlugId) {
          return;
        }
        this.consultandoSlug = false;
        if ((this.slugControl.value || '') !== slug) {
          return;
        }
        if (resultado.slug !== slug) {
          this.slugControl.setValue(resultado.slug, { emitEvent: false });
        }
        this.slugConsultado = resultado;
      },
      error: (err) => {
        if (consultaId !== this.consultaSlugId) {
          return;
        }
        this.consultandoSlug = false;
        if ((this.slugControl.value || '') !== slug) {
          return;
        }
        this.slugConsultado = null;
        this.toastr.error(err?.userMessage || err?.error?.message || 'Erro ao consultar disponibilidade.');
      },
    });
  }

  salvarSlug(): void {
    if (!this.podeSalvarSlug) {
      this.slugControl.markAsTouched();
      if (this.slugAlterado && !this.slugConsultado) {
        this.toastr.warning('Consulte a disponibilidade antes de alterar o endereço.');
      }
      return;
    }

    const slug = this.slugControl.value || '';
    this.salvandoSlug = true;
    this.service.alterarSlug({ slug }).subscribe({
      next: (presenca) => {
        this.salvandoSlug = false;
        this.aplicarPresenca(presenca);
        this.formState.loaded();
        this.toastr.success('Endereço ClickManager atualizado.');
      },
      error: (err) => {
        this.salvandoSlug = false;
        this.toastr.error(err?.userMessage || err?.error?.message || 'Erro ao alterar o endereço.');
      },
    });
  }

  salvarDominio(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    const dominio = this.dominioNormalizado;
    if (!dominio) {
      this.toastr.warning('Informe um domínio próprio para configurar.');
      return;
    }

    this.salvando = true;
    this.service.configurarDominioProprio({
      dominio,
      ativo: this.ativoControl.value === true,
    }).subscribe({
      next: (presenca) => {
        this.salvando = false;
        this.aplicarPresenca(presenca);
        this.toastr.success('Domínio próprio atualizado.');
      },
      error: (err) => {
        this.salvando = false;
        this.toastr.error(err?.userMessage || err?.error?.message || 'Erro ao salvar o domínio próprio.');
      },
    });
  }

  alterarAtivo(ativo: boolean): void {
    if (!this.dominioConfigurado || this.salvando) return;
    this.ativoControl.setValue(ativo);
    this.salvarDominio();
  }

  removerDominio(): void {
    if (!this.dominioConfigurado || this.salvando) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Remover domínio próprio?',
        message: 'O endereço personalizado deixará de resolver os recursos públicos da empresa. O endereço ClickManager continuará disponível.',
        confirmText: 'Remover domínio',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.salvando = true;
      this.service.removerDominioProprio().subscribe({
        next: (presenca) => {
          this.salvando = false;
          this.aplicarPresenca(presenca);
          this.toastr.success('Domínio próprio removido.');
        },
        error: (err) => {
          this.salvando = false;
          this.toastr.error(err?.userMessage || 'Erro ao remover o domínio próprio.');
        },
      });
    });
  }

  copiarHost(host: string): void {
    const value = normalizeHostInput(host);
    if (!value) return;
    navigator.clipboard?.writeText(value)
      .then(() => this.toastr.success('Endereço copiado.'))
      .catch(() => this.toastr.warning('Não foi possível copiar o endereço.'));
  }

  private aplicarPresenca(presenca: PresencaPublicaResponse): void {
    this.presenca = presenca;
    this.consultaSlugId++;
    this.consultandoSlug = false;
    this.form.patchValue({
      slug: presenca.slugPublico || '',
      dominio: presenca.dominioProprio || '',
      ativo: presenca.dominioProprioAtivo === true,
    }, { emitEvent: false });
    this.slugConsultado = null;
    this.form.markAsPristine();
  }
}
