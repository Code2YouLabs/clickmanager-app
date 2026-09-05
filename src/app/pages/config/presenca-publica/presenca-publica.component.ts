import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { MaterialModule } from 'src/app/material.module';
import { getClickManagerPublicHost, normalizeHostInput } from '../../links/utils/links-url.util';
import { catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { PresencaPublicaResponse, PresencaPublicaSlugDisponivelResponse } from './presenca-publica.models';
import { PresencaPublicaService } from './presenca-publica.service';

@Component({
  selector: 'app-presenca-publica',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, CardHeaderComponent],
  templateUrl: './presenca-publica.component.html',
  styleUrl: './presenca-publica.component.scss',
})
export class PresencaPublicaComponent implements OnInit {
  presenca: PresencaPublicaResponse | null = null;
  carregando = true;
  salvando = false;
  consultandoSlug = false;
  salvandoSlug = false;
  slugConsultado: PresencaPublicaSlugDisponivelResponse | null = null;
  readonly dominioFixo = 'clickmanager.com.br';

  readonly form = this.fb.group({
    slug: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
    dominio: ['', [Validators.maxLength(255)]],
    ativo: [false],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: PresencaPublicaService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
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
    return this.slugControl.valid && this.slugDisponivelParaSalvar && !this.consultandoSlug && !this.salvandoSlug;
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
    this.service.buscar().subscribe({
      next: (presenca) => {
        this.carregando = false;
        this.aplicarPresenca(presenca);
      },
      error: (err) => {
        this.carregando = false;
        this.toastr.error(err?.userMessage || 'Erro ao carregar a presença pública.');
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

    this.consultandoSlug = true;
    this.service.consultarSlugDisponivel(slug).subscribe({
      next: (resultado) => {
        this.consultandoSlug = false;
        this.slugControl.setValue(resultado.slug, { emitEvent: false });
        this.slugConsultado = resultado;
      },
      error: (err) => {
        this.consultandoSlug = false;
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
    this.form.patchValue({
      slug: presenca.slugPublico || '',
      dominio: presenca.dominioProprio || '',
      ativo: presenca.dominioProprioAtivo === true,
    }, { emitEvent: false });
    this.slugConsultado = null;
    this.form.markAsPristine();
  }
}
