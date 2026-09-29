import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { MaterialModule } from 'src/app/material.module';
import {
  CLICKTV_ORIENTACOES,
  ClickTvMidia,
  ClickTvMidiaUtilizacao,
  ClickTvOrientacao,
  ClickTvPlaylistPayload,
  ClickTvPlaylistResumo,
  ClickTvTela,
} from '../../models/clicktv.models';

@Component({
  selector: 'app-clicktv-midia-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  template: `
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data.midia.nome }}</strong>
        <span>Prévia e utilizações da mídia nas playlists.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    <mat-dialog-content class="dialog-content preview-dialog">
      @if (data.midia.visualizacao?.url) {
        @if (data.midia.tipo === 'VIDEO') {
          <video controls autoplay [src]="data.midia.visualizacao?.url"></video>
        } @else {
          <img [src]="data.midia.visualizacao?.url" [alt]="data.midia.nome" />
        }
      } @else {
        <p>Esta mídia não possui uma URL de visualização disponível.</p>
      }
      <dl>
        <dt>Arquivo</dt><dd>{{ data.midia.nomeArquivoOriginal }}</dd>
        <dt>Resolução</dt><dd>{{ data.midia.largura || '–' }} × {{ data.midia.altura || '–' }}</dd>
        <dt>Utilizada em</dt>
        <dd>{{ data.utilizacoes.length ? data.utilizacoes.length + ' playlist(s)' : 'Nenhuma playlist' }}</dd>
      </dl>
      @for (uso of data.utilizacoes; track uso.playlistId) {
        <p class="usage"><strong>{{ uso.nome }}</strong> · {{ uso.quantidadeItens }} item(ns)</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions"><button mat-button mat-dialog-close>Fechar</button></mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss'],
  styles: [`
    .preview-dialog { min-width:min(720px,80vw); }
    img, video { display:block; width:100%; max-height:55vh; object-fit:contain; background:#080b12; border-radius:12px; }
    dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin-top:18px; }
    dt { font-weight:600; } dd { margin:0; } .usage { margin:4px 0; }
  `],
})
export class ClickTvMidiaPreviewDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: {
    midia: ClickTvMidia;
    utilizacoes: ClickTvMidiaUtilizacao[];
  }) {}
}

@Component({
  selector: 'app-clicktv-upload-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, InputNumericoComponent, InputTextoRestritoComponent],
  template: `
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>Enviar mídia</strong>
        <span>JPG, JPEG, PNG, WebP ou MP4. Os limites são validados pelo servidor.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    <mat-dialog-content class="dialog-content">
      <p class="text-muted">JPG, JPEG, PNG, WebP ou MP4. Os limites são validados pelo servidor.</p>
      <input #fileInput hidden type="file" accept=".jpg,.jpeg,.png,.webp,.mp4,image/jpeg,image/png,image/webp,video/mp4"
        (change)="selecionar($event)" />
      <button mat-stroked-button type="button" (click)="fileInput.click()">Selecionar arquivo</button>
      <span class="m-l-12">{{ arquivo?.name || 'Nenhum arquivo selecionado' }}</span>
      <form [formGroup]="form" class="dialog-form">
        <app-input-texto-restrito [control]="nomeControl" label="Nome de exibição" [maxlength]="160"></app-input-texto-restrito>
        @if (arquivo?.type?.startsWith('image/')) {
          <app-input-numerico [control]="duracaoImagemControl" label="Duração da imagem (segundos)"></app-input-numerico>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!arquivo || form.invalid" (click)="confirmar()">Enviar</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss'],
  styles: [`.dialog-form { display: grid; gap: 12px; margin-top: 20px; min-width: min(460px, 75vw); }`],
})
export class ClickTvUploadDialogComponent {
  arquivo: File | null = null;
  readonly form = this.fb.group({ nome: [''], duracaoImagem: [10, [Validators.min(1)]] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClickTvUploadDialogComponent>
  ) {}

  get nomeControl() {
    return this.form.controls.nome;
  }

  get duracaoImagemControl() {
    return this.form.controls.duracaoImagem;
  }

  selecionar(event: Event): void {
    this.arquivo = (event.target as HTMLInputElement).files?.[0] || null;
    if (this.arquivo && !this.form.value.nome) {
      this.form.patchValue({ nome: this.arquivo.name.replace(/\.[^.]+$/, '') });
    }
  }

  confirmar(): void {
    if (!this.arquivo) return;
    this.dialogRef.close({
      arquivo: this.arquivo,
      nome: this.form.value.nome?.trim() || undefined,
      duracaoImagem: this.arquivo.type.startsWith('image/') ? Number(this.form.value.duracaoImagem) : undefined,
    });
  }
}

@Component({
  selector: 'app-clicktv-name-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MaterialModule, InputTextoRestritoComponent],
  template: `
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data.titulo }}</strong>
        <span>Informe o nome de exibição da mídia.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    <mat-dialog-content class="dialog-content">
      <form [formGroup]="form" class="dialog-form">
        <app-input-texto-restrito [control]="nomeControl" label="Nome" [maxlength]="160"></app-input-texto-restrito>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss'],
  styles: [`.dialog-form { min-width: min(420px, 75vw); padding-top: 8px; } mat-form-field { width: 100%; }`],
})
export class ClickTvNameDialogComponent {
  readonly form = this.fb.group({ nome: [this.data.nome || '', [Validators.required, Validators.maxLength(160)]] });
  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClickTvNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: { titulo: string; nome?: string }
  ) {}
  get nomeControl() {
    return this.form.controls.nome;
  }
  confirmar(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value.nome?.trim());
  }
}

@Component({
  selector: 'app-clicktv-playlist-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>{{ data ? 'Editar playlist' : 'Nova playlist' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome" maxlength="160" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Descrição</mat-label><textarea matInput formControlName="descricao" maxlength="1000"></textarea></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Orientação</mat-label>
          <mat-select formControlName="orientacao">@for (item of orientacoes; track item) { <mat-option [value]="item">{{ item }}</mat-option> }</mat-select>
        </mat-form-field>
        <mat-slide-toggle formControlName="ativa">Playlist ativa</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:grid; gap: 8px; min-width:min(480px,75vw); padding-top:8px; }`],
})
export class ClickTvPlaylistDialogComponent {
  readonly orientacoes = CLICKTV_ORIENTACOES;
  readonly form = this.fb.group({
    nome: [this.data?.nome || '', [Validators.required, Validators.maxLength(160)]],
    descricao: [this.data?.descricao || '', Validators.maxLength(1000)],
    orientacao: [this.data?.orientacao || 'HORIZONTAL' as ClickTvOrientacao, Validators.required],
    ativa: [this.data?.ativa ?? true],
  });
  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClickTvPlaylistDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ClickTvPlaylistResumo | null
  ) {}
  confirmar(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue() as ClickTvPlaylistPayload);
  }
}

export interface ClickTvTelaDialogData {
  tela?: ClickTvTela;
  vincular?: boolean;
}

@Component({
  selector: 'app-clicktv-tela-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  template: `
    <h2 mat-dialog-title>{{ data.vincular ? (data.tela ? 'Vincular novamente' : 'Vincular nova tela') : 'Editar tela' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="dialog-form">
        @if (data.vincular) {
          <mat-form-field appearance="outline"><mat-label>Código de ativação</mat-label>
            <input matInput inputmode="numeric" maxlength="6" formControlName="codigo" />
            <mat-hint>Informe os seis dígitos exibidos na TV.</mat-hint>
          </mat-form-field>
        }
        <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome" maxlength="160" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Local</mat-label><input matInput formControlName="descricaoLocal" maxlength="500" /></mat-form-field>
        <mat-form-field appearance="outline"><mat-label>Orientação</mat-label>
          <mat-select formControlName="orientacao">@for (item of orientacoes; track item) { <mat-option [value]="item">{{ item }}</mat-option> }</mat-select>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">{{ data.vincular ? 'Vincular' : 'Salvar' }}</button>
    </mat-dialog-actions>
  `,
  styles: [`.dialog-form { display:grid; gap:8px; min-width:min(480px,75vw); padding-top:8px; }`],
})
export class ClickTvTelaDialogComponent {
  readonly orientacoes = CLICKTV_ORIENTACOES;
  readonly form = this.fb.group({
    codigo: ['', this.data.vincular ? [Validators.required, Validators.pattern(/^\d{6}$/)] : []],
    nome: [this.data.tela?.nome || '', [Validators.required, Validators.maxLength(160)]],
    descricaoLocal: [this.data.tela?.descricaoLocal || '', Validators.maxLength(500)],
    orientacao: [this.data.tela?.orientacao || 'HORIZONTAL' as ClickTvOrientacao, Validators.required],
  });
  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClickTvTelaDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: ClickTvTelaDialogData
  ) {}
  confirmar(): void {
    if (this.form.valid) this.dialogRef.close({
      ...this.form.getRawValue(),
      telaId: this.data.vincular ? this.data.tela?.id : undefined,
    });
  }
}
