import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';

export type ProdutoAcabamentoAplicacao = 'FOLHA' | 'PECA' | 'SERVICO' | 'METRO_QUADRADO' | 'METRO_LINEAR';
export type ProdutoAcabamentoPrecoTipo = 'FIXO' | 'QUANTIDADE' | 'DEMANDA' | 'METRO';

export interface ProdutoAcabamentoUx {
  id: number;
  nome: string;
  descricao?: string | null;
  aplicacao: ProdutoAcabamentoAplicacao;
  preco: Record<string, any>;
}

@Component({
  selector: 'app-grafica-produto-acabamento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MaterialModule,
    InputTextoRestritoComponent,
    PrecoSelectorComponent,
    SectionCardComponent,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.acabamento ? 'Editar acabamento' : 'Adicionar acabamento' }}</h2>

    <mat-dialog-content>
      <form [formGroup]="form" class="acabamento-dialog-form">
        <div class="dialog-grid">
          <app-input-texto-restrito
            class="dialog-grid__wide"
            [control]="nomeControl"
            label="Nome"
            placeholder="Corte Máquina"
            [maxlength]="140"
            requiredError="Informe o nome do acabamento.">
          </app-input-texto-restrito>

          <mat-form-field appearance="outline">
            <mat-label>Forma de aplicação</mat-label>
            <mat-select formControlName="aplicacao">
              <mat-option value="FOLHA">Por folha</mat-option>
              <mat-option value="PECA">Por peça</mat-option>
              <mat-option value="SERVICO">Por serviço</mat-option>
              <mat-option value="METRO_QUADRADO">Por metro quadrado</mat-option>
              <mat-option value="METRO_LINEAR">Por metro linear</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline" class="dialog-grid__wide">
            <mat-label>Descrição</mat-label>
            <textarea matInput formControlName="descricao" rows="3" maxlength="500"></textarea>
          </mat-form-field>
        </div>

        <app-section-card title="Precificação">
          <app-preco-selector
            [formGroup]="precoForm"
            [tiposDisponiveis]="['FIXO', 'DEMANDA', 'QUANTIDADE', 'METRO']">
          </app-preco-selector>
        </app-section-card>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button type="button" (click)="fechar()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="salvar()">
        <mat-icon>check</mat-icon>
        Salvar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .acabamento-dialog-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 4px;
      min-width: min(680px, 82vw);
    }
    .dialog-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }
    .dialog-grid__wide {
      grid-column: 1 / -1;
    }
    :host ::ng-deep app-preco-selector .price-selector-shell {
      border: 0;
      border-radius: 0;
      background: transparent;
      padding: 0;
    }
    :host ::ng-deep app-preco-selector .price-selector-mode {
      border-top: 0;
    }
    @media (max-width: 640px) {
      .acabamento-dialog-form {
        min-width: 0;
      }
      .dialog-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class GraficaProdutoAcabamentoDialogComponent {
  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    aplicacao: this.fb.control<ProdutoAcabamentoAplicacao>('FOLHA', { nonNullable: true, validators: [Validators.required] }),
  });
  precoForm: FormGroup = this.criarPrecoForm(null);

  get nomeControl() {
    return this.form.controls.nome;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<GraficaProdutoAcabamentoDialogComponent, ProdutoAcabamentoUx | null>,
    @Inject(MAT_DIALOG_DATA)
    public readonly data: { acabamento?: ProdutoAcabamentoUx | null; nextId: number },
  ) {
    const acabamento = data?.acabamento;
    this.form.reset({
      nome: acabamento?.nome || '',
      descricao: acabamento?.descricao || '',
      aplicacao: acabamento?.aplicacao || 'FOLHA',
    });
    this.precoForm = this.criarPrecoForm(acabamento?.preco);
  }

  fechar(): void {
    this.dialogRef.close(null);
  }

  salvar(): void {
    this.form.markAllAsTouched();
    this.precoForm.markAllAsTouched();
    this.form.updateValueAndValidity();
    this.precoForm.updateValueAndValidity();

    if (this.form.invalid || this.precoForm.invalid) return;

    const raw = this.form.getRawValue();
    this.dialogRef.close({
      id: this.data?.acabamento?.id || this.data.nextId,
      nome: raw.nome.trim(),
      descricao: raw.descricao?.trim() || null,
      aplicacao: raw.aplicacao,
      preco: this.precoForm.getRawValue(),
    });
  }

  private criarPrecoForm(preco: any): FormGroup {
    const tipo = (preco?.tipo || 'FIXO') as ProdutoAcabamentoPrecoTipo;
    switch (tipo) {
      case 'FIXO':
        return this.fb.group({
          tipo: ['FIXO'],
          valor: [preco?.valor ?? null],
        });
      case 'QUANTIDADE':
        return this.fb.group({
          tipo: ['QUANTIDADE'],
          faixas: this.fb.array((preco?.faixas?.length ? preco.faixas : [{ quantidade: null, valor: null }]).map((faixa: any) => this.fb.group({
            quantidade: [faixa.quantidade ?? null],
            valor: [faixa.valor ?? null],
          }))),
        });
      case 'DEMANDA':
        return this.fb.group({
          tipo: ['DEMANDA'],
          faixas: this.fb.array((preco?.faixas?.length ? preco.faixas : [{ de: 1, ate: null, valorUnitario: null }]).map((faixa: any) => this.fb.group({
            de: [faixa.de ?? null],
            ate: [faixa.ate ?? null],
            valorUnitario: [faixa.valorUnitario ?? null],
          }))),
        });
      case 'METRO':
        return this.fb.group({
          tipo: ['METRO'],
          precoMetro: [preco?.precoMetro ?? null],
          precoMinimo: [preco?.precoMinimo ?? null],
          alturaMaxima: [preco?.alturaMaxima ?? null],
          larguraMaxima: [preco?.larguraMaxima ?? null],
          modoCobranca: [preco?.modoCobranca ?? 'QUADRADO'],
          unidadeDimensao: [preco?.unidadeDimensao ?? 'METRO'],
          largurasLinearesPermitidas: [preco?.largurasLinearesPermitidas ?? ''],
        });
    }
  }
}
