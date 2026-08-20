import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { MaterialModule } from 'src/app/material.module';
import { getClickManagerPublicHost, normalizeHostInput } from '../../links/utils/links-url.util';
import { PresencaPublicaResponse } from './presenca-publica.models';
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

  readonly form = this.fb.group({
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
      dominio: presenca.dominioProprio || '',
      ativo: presenca.dominioProprioAtivo === true,
    }, { emitEvent: false });
    this.form.markAsPristine();
  }
}
