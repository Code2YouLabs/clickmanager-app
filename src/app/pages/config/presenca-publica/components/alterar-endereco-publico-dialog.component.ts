import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { MaterialModule } from 'src/app/material.module';
import { getClickManagerPublicHost } from '../../../links/utils/links-url.util';
import { catalogoSlugify } from '../../../catalogo/shared/utils/catalogo-utils';
import { PresencaPublicaResponse, PresencaPublicaSlugDisponivelResponse } from '../presenca-publica.models';
import { PresencaPublicaService } from '../presenca-publica.service';

export interface AlterarEnderecoPublicoDialogData {
  presenca: PresencaPublicaResponse;
  dominioPublico: string;
  urlAtual: string;
}

type AlterarEnderecoPublicoEtapa = 'pesquisa' | 'confirmacao';

@Component({
  selector: 'app-alterar-endereco-publico-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './alterar-endereco-publico-dialog.component.html',
  styleUrls: [
    '../../../../components/dialog/dialog-form-shell.scss',
    './alterar-endereco-publico-dialog.component.scss',
  ],
})
export class AlterarEnderecoPublicoDialogComponent {
  etapa: AlterarEnderecoPublicoEtapa = 'pesquisa';
  consultando = false;
  confirmando = false;
  slugConsultado: PresencaPublicaSlugDisponivelResponse | null = null;
  erroAlteracao: string | null = null;
  private consultaSlugId = 0;

  readonly form = this.fb.group({
    slug: ['', [Validators.required, Validators.maxLength(80), Validators.pattern(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)]],
  });

  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: AlterarEnderecoPublicoDialogData,
    private readonly dialogRef: MatDialogRef<AlterarEnderecoPublicoDialogComponent, PresencaPublicaResponse | undefined>,
    private readonly fb: FormBuilder,
    private readonly service: PresencaPublicaService,
    private readonly toastr: ToastrService
  ) {
    this.slugControl.valueChanges.subscribe((value) => {
      this.erroAlteracao = null;
      if (this.slugConsultado && this.slugConsultado.slug !== (value || '')) {
        this.slugConsultado = null;
      }
    });
  }

  get slugControl(): FormControl<string | null> {
    return this.form.get('slug') as FormControl<string | null>;
  }

  get slugAtual(): string {
    return this.data.presenca.slugPublico || '';
  }

  get hostAtual(): string {
    return getClickManagerPublicHost(this.slugAtual) || this.data.urlAtual.replace(/^https?:\/\//i, '');
  }

  get slugDigitado(): string {
    return this.slugControl.value || '';
  }

  get novoHost(): string {
    return this.hostParaSlug(this.slugDigitado);
  }

  get novoEndereco(): string {
    return this.urlParaSlug(this.slugDigitado);
  }

  get resultadoDisponivel(): boolean {
    return !!this.slugConsultado?.disponivel && this.slugConsultado.slug === this.slugDigitado && this.slugDigitado !== this.slugAtual;
  }

  get resultadoIndisponivel(): boolean {
    return !!this.slugConsultado && !this.slugConsultado.disponivel && this.slugConsultado.slug === this.slugDigitado;
  }

  get mesmoEnderecoAtual(): boolean {
    return !!this.slugDigitado && this.slugDigitado === this.slugAtual;
  }

  get podeUsarEndereco(): boolean {
    return this.form.valid && this.resultadoDisponivel && !this.consultando && !this.confirmando;
  }

  get podeConfirmar(): boolean {
    return this.etapa === 'confirmacao' && this.podeUsarEndereco && !this.confirmando;
  }

  normalizarSlugDigitado(): void {
    const atual = this.slugControl.value || '';
    const normalizado = catalogoSlugify(atual);
    if (atual !== normalizado) {
      this.slugControl.setValue(normalizado);
    }
  }

  verificarDisponibilidade(): void {
    this.normalizarSlugDigitado();
    this.erroAlteracao = null;

    if (this.slugControl.invalid || this.consultando || this.confirmando) {
      this.slugControl.markAsTouched();
      return;
    }

    const slug = this.slugDigitado;
    if (slug === this.slugAtual) {
      this.slugConsultado = { slug, disponivel: false };
      return;
    }

    const consultaId = ++this.consultaSlugId;
    this.consultando = true;
    this.service.consultarSlugDisponivel(slug).subscribe({
      next: (resultado) => {
        if (consultaId !== this.consultaSlugId) {
          return;
        }
        this.consultando = false;
        if (this.slugDigitado !== slug) {
          return;
        }
        this.slugConsultado = resultado;
      },
      error: (err) => {
        if (consultaId !== this.consultaSlugId) {
          return;
        }
        this.consultando = false;
        if (this.slugDigitado !== slug) {
          return;
        }
        this.slugConsultado = null;
        this.toastr.error(err?.userMessage || err?.error?.message || 'Erro ao consultar disponibilidade.');
      },
    });
  }

  irParaConfirmacao(): void {
    if (!this.podeUsarEndereco) {
      this.slugControl.markAsTouched();
      return;
    }
    this.etapa = 'confirmacao';
    this.erroAlteracao = null;
  }

  voltarParaPesquisa(): void {
    if (this.confirmando) {
      return;
    }
    this.etapa = 'pesquisa';
  }

  fechar(): void {
    this.cancelar();
  }

  confirmarAlteracao(): void {
    if (!this.podeConfirmar) {
      return;
    }

    const slug = this.slugDigitado;
    this.confirmando = true;
    this.dialogRef.disableClose = true;
    this.erroAlteracao = null;

    this.service.alterarSlug({ slug }).subscribe({
      next: (presenca) => {
        this.confirmando = false;
        this.dialogRef.disableClose = false;
        this.dialogRef.close(presenca);
      },
      error: (err) => {
        this.confirmando = false;
        this.dialogRef.disableClose = false;
        const mensagem = err?.userMessage || err?.error?.message || 'Erro ao alterar o endereço público.';
        this.erroAlteracao = mensagem;
        this.toastr.error(mensagem);
      },
    });
  }

  cancelar(): void {
    if (this.confirmando) {
      return;
    }
    this.dialogRef.close(undefined);
  }

  private hostParaSlug(slug: string | null | undefined): string {
    const normalizedSlug = String(slug || '').trim();
    return normalizedSlug && this.data.dominioPublico ? `${normalizedSlug}.${this.data.dominioPublico}` : '';
  }

  private urlParaSlug(slug: string | null | undefined): string {
    const host = this.hostParaSlug(slug);
    return host ? `https://${host}` : '';
  }
}
