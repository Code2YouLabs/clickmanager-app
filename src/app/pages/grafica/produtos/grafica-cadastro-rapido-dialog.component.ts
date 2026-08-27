import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro, GraficaCadastroRequest, GraficaFormato, GraficaFormatoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type CadastroRapidoTipo = 'material' | 'formato' | 'cor';
type CadastroRapidoResult = GraficaCadastro | GraficaFormato;

interface CadastroRapidoDialogData {
  tipo: CadastroRapidoTipo;
}

@Component({
  selector: 'app-grafica-cadastro-rapido-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <h2 mat-dialog-title class="m-0 f-w-600">{{ titulo }}</h2>

    <mat-dialog-content class="p-t-12">
      <form [formGroup]="form" class="quick-create-form">
        <mat-form-field appearance="outline">
          <mat-label>Nome</mat-label>
          <input matInput formControlName="nome" autocomplete="off" />
          <mat-error *ngIf="form.controls.nome.hasError('required')">Informe o nome.</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Código</mat-label>
          <input matInput formControlName="codigo" autocomplete="off" />
          <mat-error *ngIf="form.controls.codigo.hasError('required')">Informe o código.</mat-error>
        </mat-form-field>

        <ng-container *ngIf="data.tipo === 'formato'">
          <mat-form-field appearance="outline">
            <mat-label>Largura</mat-label>
            <input matInput type="number" formControlName="largura" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Altura</mat-label>
            <input matInput type="number" formControlName="altura" />
          </mat-form-field>

          <mat-form-field appearance="outline" class="quick-create-form__wide">
            <mat-label>Unidade</mat-label>
            <mat-select formControlName="unidadeDimensao">
              <mat-option [value]="null">Sem unidade</mat-option>
              <mat-option value="CENTIMETRO">Centímetro</mat-option>
              <mat-option value="MILIMETRO">Milímetro</mat-option>
              <mat-option value="METRO">Metro</mat-option>
            </mat-select>
          </mat-form-field>
        </ng-container>

        <mat-form-field appearance="outline" class="quick-create-form__wide" *ngIf="data.tipo === 'material'">
          <mat-label>Descrição</mat-label>
          <textarea matInput rows="3" formControlName="descricao"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="gap-8 p-x-16 p-b-12">
      <button mat-stroked-button type="button" (click)="cancelar()" [disabled]="salvando">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="salvar()" [disabled]="form.invalid || salvando">
        <mat-spinner *ngIf="salvando" diameter="18"></mat-spinner>
        <mat-icon *ngIf="!salvando">save</mat-icon>
        <span>{{ salvando ? 'Salvando...' : 'Salvar' }}</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .quick-create-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 14px;
      min-width: min(640px, 78vw);
      padding-top: 4px;
    }
    .quick-create-form__wide {
      grid-column: 1 / -1;
    }
    mat-dialog-actions button {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    @media (max-width: 720px) {
      .quick-create-form {
        grid-template-columns: 1fr;
        min-width: 0;
      }
    }
  `],
})
export class GraficaCadastroRapidoDialogComponent {
  salvando = false;

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    codigo: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control<string | null>(null),
    largura: this.fb.control<number | null>(null),
    altura: this.fb.control<number | null>(null),
    unidadeDimensao: this.fb.control<'METRO' | 'CENTIMETRO' | 'MILIMETRO' | null>(null),
  });

  get titulo(): string {
    return {
      material: 'Novo material',
      formato: 'Novo formato',
      cor: 'Nova cor',
    }[this.data.tipo];
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: GraficaProdutoService,
    private readonly toastr: ToastrService,
    private readonly dialogRef: MatDialogRef<GraficaCadastroRapidoDialogComponent, CadastroRapidoResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CadastroRapidoDialogData,
  ) {
    this.form.controls.nome.valueChanges.subscribe((nome) => {
      if (nome && !this.form.controls.codigo.dirty) {
        this.form.controls.codigo.setValue(this.codigo(nome));
      }
    });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    const request$: Observable<CadastroRapidoResult> = this.data.tipo === 'formato'
      ? this.service.salvarFormato(this.formatoRequest())
      : this.data.tipo === 'material'
        ? this.service.salvarMaterial(this.cadastroRequest())
        : this.service.salvarCor(this.cadastroRequest());

    request$.subscribe({
      next: (item) => {
        this.salvando = false;
        this.toastr.success('Registro salvo.');
        this.dialogRef.close(item);
      },
      error: (error: unknown) => {
        this.salvando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o registro.'));
      },
    });
  }

  private cadastroRequest(): GraficaCadastroRequest {
    const raw = this.form.getRawValue();
    return {
      codigo: raw.codigo.trim(),
      nome: raw.nome.trim(),
      descricao: raw.descricao?.trim() || null,
      ativo: true,
    };
  }

  private formatoRequest(): GraficaFormatoRequest {
    const raw = this.form.getRawValue();
    return {
      codigo: raw.codigo.trim(),
      nome: raw.nome.trim(),
      descricao: null,
      largura: raw.largura,
      altura: raw.altura,
      larguraUtil: raw.largura,
      alturaUtil: raw.altura,
      unidadeDimensao: raw.unidadeDimensao,
      ativo: true,
    };
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80);
  }
}
