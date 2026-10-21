import { CommonModule } from '@angular/common';
import { Component, Inject, Optional } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
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
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  selector: 'app-clicktv-midia-preview-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MaterialModule],
  template: `
    @if (mobilePanel) {
      <header class="mobile-side-panel__header"><h2>{{ data.midia.nome }}</h2><button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button></header>
    } @else {
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data.midia.nome }}</strong>
        <span>Prévia e utilizações da mídia nas playlists.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    }
    <mat-dialog-content [class.mobile-side-panel__body]="mobilePanel" class="dialog-content preview-dialog">
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
    <mat-dialog-actions [class.mobile-side-panel__footer]="mobilePanel" align="end" class="dialog-actions"><button mat-button mat-dialog-close>Fechar</button></mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss', './clicktv-dialogs-mobile.scss'],
  styles: [`
    .preview-dialog { min-width:min(720px,80vw); }
    img, video { display:block; width:100%; max-height:55vh; object-fit:contain; background:#080b12; border-radius:12px; }
    dl { display:grid; grid-template-columns:max-content 1fr; gap:6px 16px; margin-top:18px; }
    dt { font-weight:600; } dd { margin:0; } .usage { margin:4px 0; }
  `],
})
export class ClickTvMidiaPreviewDialogComponent {
  get mobilePanel(): boolean { return !!this.data?.mobilePanel; }
  constructor(@Inject(MAT_DIALOG_DATA) readonly data: {
    mobilePanel?: boolean;
    midia: ClickTvMidia;
    utilizacoes: ClickTvMidiaUtilizacao[];
  }) {}
}

@Component({
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  selector: 'app-clicktv-upload-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, InputNumericoComponent, InputTextoRestritoComponent],
  template: `
    @if (mobilePanel) {
      <header class="mobile-side-panel__header"><h2>Enviar mídia</h2><button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button></header>
    } @else {
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>Enviar mídia</strong>
        <span>JPG, JPEG, PNG, WebP ou MP4. Os limites são validados pelo servidor.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    }
    <mat-dialog-content [class.mobile-side-panel__body]="mobilePanel" class="dialog-content">
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
    <mat-dialog-actions [class.mobile-side-panel__footer]="mobilePanel" align="end" class="dialog-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!arquivo || form.invalid" (click)="confirmar()">Enviar</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss', './clicktv-dialogs-mobile.scss'],
  styles: [`.dialog-form { display: grid; gap: 12px; margin-top: 20px; min-width: min(460px, 75vw); }`],
})
export class ClickTvUploadDialogComponent {
  get mobilePanel(): boolean { return !!this.data?.mobilePanel; }
  arquivo: File | null = null;
  readonly form = this.fb.group({ nome: [''], duracaoImagem: [10, [Validators.min(1)]] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClickTvUploadDialogComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) readonly data?: { mobilePanel?: boolean }
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
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  selector: 'app-clicktv-name-dialog',
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MaterialModule, InputTextoRestritoComponent],
  template: `
    @if (mobilePanel) {
      <header class="mobile-side-panel__header"><h2>{{ data.titulo }}</h2><button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button></header>
    } @else {
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data.titulo }}</strong>
        <span>Informe o nome de exibição da mídia.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    }
    <mat-dialog-content [class.mobile-side-panel__body]="mobilePanel" class="dialog-content">
      <form [formGroup]="form" class="dialog-form">
        <app-input-texto-restrito [control]="nomeControl" label="Nome" [maxlength]="160"></app-input-texto-restrito>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions [class.mobile-side-panel__footer]="mobilePanel" align="end" class="dialog-actions">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss', './clicktv-dialogs-mobile.scss'],
  styles: [`.dialog-form { min-width: min(420px, 75vw); padding-top: 8px; } mat-form-field { width: 100%; }`],
})
export class ClickTvNameDialogComponent {
  get mobilePanel(): boolean { return !!this.data?.mobilePanel; }
  readonly form = this.fb.group({ nome: [this.data.nome || '', [Validators.required, Validators.maxLength(160)]] });
  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ClickTvNameDialogComponent>,
    @Inject(MAT_DIALOG_DATA) readonly data: { titulo: string; nome?: string; mobilePanel?: boolean }
  ) {}
  get nomeControl() {
    return this.form.controls.nome;
  }
  confirmar(): void {
    if (this.form.valid) this.dialogRef.close(this.form.value.nome?.trim());
  }
}

@Component({
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  selector: 'app-clicktv-playlist-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MaterialModule,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    InputOptionsComponent,
  ],
  template: `
    @if (mobilePanel) {
      <header class="mobile-side-panel__header"><h2>{{ data?.id ? 'Editar playlist' : 'Nova playlist' }}</h2><button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button></header>
    } @else {
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data?.id ? 'Editar playlist' : 'Nova playlist' }}</strong>
        <span>Defina os dados básicos da sequência exibida nas telas.</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    }
    <mat-dialog-content [class.mobile-side-panel__body]="mobilePanel" class="dialog-content">
      <form [formGroup]="form" class="dialog-form">
        <app-input-texto-restrito [control]="nomeControl" label="Nome" [maxlength]="160"></app-input-texto-restrito>
        <app-input-textarea [control]="descricaoControl" label="Descrição" [maxlength]="1000" [rows]="4"></app-input-textarea>
        <app-input-options [control]="orientacaoControl" label="Orientação" [options]="orientacoes" [showNull]="false"></app-input-options>
        <mat-slide-toggle formControlName="ativa">Playlist ativa</mat-slide-toggle>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions [class.mobile-side-panel__footer]="mobilePanel" align="end" class="dialog-actions"><button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">Salvar</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss', './clicktv-dialogs-mobile.scss'],
  styles: [`.dialog-form { display:grid; gap: 12px; min-width:min(480px,75vw); padding-top:8px; }`],
})
export class ClickTvPlaylistDialogComponent {
  get mobilePanel(): boolean { return !!this.data?.mobilePanel; }
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
    @Inject(MAT_DIALOG_DATA) readonly data: (Partial<ClickTvPlaylistResumo> & { mobilePanel?: boolean }) | null
  ) {}
  get nomeControl() {
    return this.form.controls.nome;
  }
  get descricaoControl() {
    return this.form.controls.descricao;
  }
  get orientacaoControl() {
    return this.form.controls.orientacao;
  }
  confirmar(): void {
    if (this.form.valid) this.dialogRef.close(this.form.getRawValue() as ClickTvPlaylistPayload);
  }
}

export interface ClickTvTelaDialogData {
  mobilePanel?: boolean;
  tela?: ClickTvTela;
  vincular?: boolean;
}

@Component({
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  selector: 'app-clicktv-tela-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule, InputTextoRestritoComponent, InputOptionsComponent],
  template: `
    @if (mobilePanel) {
      <header class="mobile-side-panel__header"><h2>{{ data.vincular ? (data.tela ? 'Vincular novamente' : 'Vincular nova tela') : 'Editar tela' }}</h2><button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button></header>
    } @else {
    <div mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data.vincular ? (data.tela ? 'Vincular novamente' : 'Vincular nova tela') : 'Editar tela' }}</strong>
        <span>{{ data.vincular ? 'Informe o código exibido no player e os dados da tela.' : 'Atualize identificação e orientação da tela.' }}</span>
      </div>
      <button mat-icon-button mat-dialog-close aria-label="Fechar"><mat-icon>close</mat-icon></button>
    </div>
    }
    <mat-dialog-content [class.mobile-side-panel__body]="mobilePanel" class="dialog-content">
      <form [formGroup]="form" class="dialog-form">
        @if (data.vincular) {
          <mat-form-field appearance="outline"><mat-label>Código de ativação</mat-label>
            <input matInput inputmode="numeric" maxlength="6" formControlName="codigo" (input)="normalizarCodigo()" />
            <mat-hint>Informe os seis dígitos exibidos na TV.</mat-hint>
            <mat-error>Informe exatamente 6 dígitos.</mat-error>
          </mat-form-field>
        }
        <app-input-texto-restrito [control]="nomeControl" label="Nome" [maxlength]="160"></app-input-texto-restrito>
        <app-input-texto-restrito [control]="descricaoLocalControl" label="Local" [maxlength]="500"></app-input-texto-restrito>
        <app-input-options [control]="orientacaoControl" label="Orientação" [options]="orientacoes" [showNull]="false"></app-input-options>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions [class.mobile-side-panel__footer]="mobilePanel" align="end" class="dialog-actions"><button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" (click)="confirmar()">{{ data.vincular ? 'Vincular' : 'Salvar' }}</button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../../components/dialog/dialog-form-shell.scss', './clicktv-dialogs-mobile.scss'],
  styles: [`.dialog-form { display:grid; gap:12px; min-width:min(480px,75vw); padding-top:8px; }`],
})
export class ClickTvTelaDialogComponent {
  get mobilePanel(): boolean { return !!this.data?.mobilePanel; }
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
  get nomeControl() {
    return this.form.controls.nome;
  }
  get descricaoLocalControl() {
    return this.form.controls.descricaoLocal;
  }
  get orientacaoControl() {
    return this.form.controls.orientacao;
  }
  normalizarCodigo(): void {
    const atual = this.form.controls.codigo.value || '';
    const normalizado = atual.replace(/\D/g, '').slice(0, 6);
    if (normalizado !== atual) {
      this.form.controls.codigo.setValue(normalizado);
    }
  }
  confirmar(): void {
    if (this.form.valid) this.dialogRef.close({
      ...this.form.getRawValue(),
      telaId: this.data.vincular ? this.data.tela?.id : undefined,
    });
  }
}
