import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { PaginaLinksItem, PaginaLinksItemRequest, TipoItemLinks, TIPOS_ITEM_LINKS } from '../../models/links.models';
import {
  buildMailtoUrl,
  buildTelefoneUrl,
  buildWhatsappUrl,
  parseWhatsappUrl,
  protocoloUrlValido,
} from '../../utils/links-item-url.util';

export interface LinksItemDialogData {
  item?: PaginaLinksItem | null;
  ordem?: number | null;
}

@Component({
  selector: 'app-links-item-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  templateUrl: './links-item-dialog.component.html',
  styleUrls: ['./links-item-dialog.component.scss'],
})
export class LinksItemDialogComponent implements OnInit {
  readonly tipos = TIPOS_ITEM_LINKS;
  readonly form = this.fb.group({
    tipo: new FormControl<TipoItemLinks>('LINK', { nonNullable: true, validators: [Validators.required] }),
    titulo: ['', [Validators.required, Validators.maxLength(120)]],
    subtitulo: ['', [Validators.maxLength(180)]],
    url: ['', [Validators.maxLength(500)]],
    numero: [''],
    mensagem: [''],
    email: ['', [Validators.email]],
    assunto: [''],
  });

  destinoPreservado = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<LinksItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: LinksItemDialogData
  ) {}

  ngOnInit(): void {
    const item = this.data.item;
    if (item) {
      this.form.patchValue({
        tipo: item.tipo,
        titulo: item.titulo,
        subtitulo: item.subtitulo || '',
        url: item.url,
      });
      this.preencherCamposEspecificos(item);
    } else {
      this.aplicarTituloPadrao(this.tipoControl.value);
    }

    this.tipoControl.valueChanges.subscribe((tipo) => {
      this.aplicarTituloPadrao(tipo);
      this.destinoPreservado = '';
      this.form.patchValue({ url: '', numero: '', mensagem: '', email: '', assunto: '' }, { emitEvent: false });
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.destinoEspecificoValido()) {
      return;
    }

    const url = this.montarUrl();
    if (!protocoloUrlValido(url)) {
      this.urlControl.setErrors({ protocolo: true });
      return;
    }

    const payload: PaginaLinksItemRequest = {
      tipo: this.tipoControl.value,
      titulo: this.tituloControl.value?.trim() || '',
      subtitulo: this.normalizarOpcional(this.subtituloControl.value),
      url,
      ordem: this.data.ordem ?? null,
    };
    this.dialogRef.close(payload);
  }

  fechar(): void {
    this.dialogRef.close();
  }

  tipoSelecionado(tipo: TipoItemLinks): boolean {
    return this.tipoControl.value === tipo;
  }

  labelTipo(tipo: TipoItemLinks): string {
    return this.tipos.find((item) => item.tipo === tipo)?.label || tipo;
  }

  private preencherCamposEspecificos(item: PaginaLinksItem): void {
    if (item.tipo === 'WHATSAPP') {
      const parts = parseWhatsappUrl(item.url);
      if (parts) {
        this.form.patchValue({ numero: parts.numero, mensagem: parts.mensagem });
      } else {
        this.destinoPreservado = item.url;
      }
    }

    if (item.tipo === 'EMAIL' && item.url.startsWith('mailto:')) {
      const [emailPart, query] = item.url.replace(/^mailto:/, '').split('?');
      const params = new URLSearchParams(query || '');
      this.form.patchValue({
        email: decodeURIComponent(emailPart || ''),
        assunto: params.get('subject') || '',
        mensagem: params.get('body') || '',
      });
    }

    if (item.tipo === 'TELEFONE' && item.url.startsWith('tel:')) {
      this.form.patchValue({ numero: item.url.replace(/^tel:/, '') });
    }
  }

  private aplicarTituloPadrao(tipo: TipoItemLinks): void {
    if (this.tituloControl.value?.trim()) {
      return;
    }
    this.tituloControl.setValue(this.tipos.find((item) => item.tipo === tipo)?.tituloPadrao || '');
  }

  private montarUrl(): string {
    const tipo = this.tipoControl.value;
    if (tipo === 'WHATSAPP') {
      if (this.destinoPreservado && !this.numeroControl.value?.trim()) {
        return this.destinoPreservado;
      }
      return buildWhatsappUrl(this.numeroControl.value || '', this.mensagemControl.value);
    }
    if (tipo === 'EMAIL') {
      return buildMailtoUrl(this.emailControl.value || '', this.assuntoControl.value, this.mensagemControl.value);
    }
    if (tipo === 'TELEFONE') {
      return buildTelefoneUrl(this.numeroControl.value || '');
    }
    return this.urlControl.value?.trim() || '';
  }

  private destinoEspecificoValido(): boolean {
    const tipo = this.tipoControl.value;
    if (tipo === 'WHATSAPP' && !this.destinoPreservado && !this.numeroControl.value?.trim()) {
      this.numeroControl.setErrors({ required: true });
      return false;
    }
    if (tipo === 'EMAIL' && !this.emailControl.value?.trim()) {
      this.emailControl.setErrors({ required: true });
      return false;
    }
    if (tipo === 'TELEFONE' && !this.numeroControl.value?.trim()) {
      this.numeroControl.setErrors({ required: true });
      return false;
    }
    if (!['WHATSAPP', 'EMAIL', 'TELEFONE'].includes(tipo) && !this.urlControl.value?.trim()) {
      this.urlControl.setErrors({ required: true });
      return false;
    }
    return true;
  }

  private normalizarOpcional(value: string | null | undefined): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  get tipoControl(): FormControl<TipoItemLinks> {
    return this.form.get('tipo') as FormControl<TipoItemLinks>;
  }

  get tituloControl(): FormControl<string | null> {
    return this.form.get('titulo') as FormControl<string | null>;
  }

  get subtituloControl(): FormControl<string | null> {
    return this.form.get('subtitulo') as FormControl<string | null>;
  }

  get urlControl(): FormControl<string | null> {
    return this.form.get('url') as FormControl<string | null>;
  }

  get numeroControl(): FormControl<string | null> {
    return this.form.get('numero') as FormControl<string | null>;
  }

  get mensagemControl(): FormControl<string | null> {
    return this.form.get('mensagem') as FormControl<string | null>;
  }

  get emailControl(): FormControl<string | null> {
    return this.form.get('email') as FormControl<string | null>;
  }

  get assuntoControl(): FormControl<string | null> {
    return this.form.get('assunto') as FormControl<string | null>;
  }
}
