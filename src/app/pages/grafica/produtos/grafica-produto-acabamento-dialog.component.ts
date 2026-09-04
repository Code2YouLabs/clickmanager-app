import { CommonModule } from '@angular/common';
import { Component, Inject, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
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
    <h2 mat-dialog-title class="dialog-head">
      <div class="dialog-head__copy">
        <strong>{{ data.acabamento ? 'Editar acabamento' : 'Adicionar acabamento' }}</strong>
        <span>Defina como este acabamento será aplicado e precificado no produto.</span>
      </div>
      <button type="button" mat-icon-button aria-label="Fechar" (click)="fechar()">
        <mat-icon>close</mat-icon>
      </button>
    </h2>

    <mat-dialog-content class="dialog-content">
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
            [tiposDisponiveis]="tiposPrecoPermitidos">
          </app-preco-selector>
        </app-section-card>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="dialog-actions">
      <button mat-stroked-button type="button" (click)="fechar()">Cancelar</button>
      <button mat-flat-button color="primary" type="button" (click)="salvar()">
        <mat-icon>check</mat-icon>
        <span>Salvar</span>
      </button>
    </mat-dialog-actions>
  `,
  styleUrls: ['../../../components/dialog/dialog-form-shell.scss'],
  styles: [`
    .acabamento-dialog-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 4px;
      width: min(700px, 100%);
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
    :host ::ng-deep .mat-mdc-dialog-content {
      max-height: min(68vh, 720px);
    }
    @media (max-width: 640px) {
      .acabamento-dialog-form {
        width: 100%;
      }
      .dialog-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class GraficaProdutoAcabamentoDialogComponent implements OnDestroy {
  private readonly tiposPrecoPorAplicacao: Record<ProdutoAcabamentoAplicacao, ProdutoAcabamentoPrecoTipo[]> = {
    FOLHA: ['FIXO', 'DEMANDA'],
    PECA: ['FIXO', 'DEMANDA'],
    SERVICO: ['FIXO', 'DEMANDA', 'QUANTIDADE'],
    METRO_QUADRADO: ['METRO'],
    METRO_LINEAR: ['METRO'],
  };
  private readonly aplicacaoSub: Subscription;

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    aplicacao: this.fb.control<ProdutoAcabamentoAplicacao>('FOLHA', { nonNullable: true, validators: [Validators.required] }),
  });
  precoForm: FormGroup = this.criarPrecoForm(null);

  get nomeControl() {
    return this.form.controls.nome;
  }

  get tiposPrecoPermitidos(): ProdutoAcabamentoPrecoTipo[] {
    return this.tiposPrecoPorAplicacao[this.form.controls.aplicacao.value] || this.tiposPrecoPorAplicacao.FOLHA;
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
    this.garantirTipoPrecoPermitido();
    this.aplicacaoSub = this.form.controls.aplicacao.valueChanges.subscribe(() => this.garantirTipoPrecoPermitido());
  }

  ngOnDestroy(): void {
    this.aplicacaoSub.unsubscribe();
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

  private garantirTipoPrecoPermitido(): void {
    const permitidos = this.tiposPrecoPermitidos;
    const tipoAtual = this.precoForm.get('tipo')?.value as ProdutoAcabamentoPrecoTipo | null;
    if (tipoAtual && permitidos.includes(tipoAtual)) return;
    this.precoForm.get('tipo')?.setValue(permitidos[0]);
  }
}
