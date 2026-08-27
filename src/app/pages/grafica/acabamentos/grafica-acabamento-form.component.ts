import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, finalize, map, of, switchMap } from 'rxjs';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaAcabamento, GraficaAcabamentoRequest, GraficaCadastro, GraficaFormato } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type AplicacaoAcabamento = 'PECA' | 'FOLHA' | 'METRO_QUADRADO' | 'METRO_LINEAR' | 'SERVICO';

type AcabamentoFormSnapshot = {
  form: {
    nome: string;
    descricao: string;
    materialId: number | null;
    formatoId: number | null;
    aplicacao: AplicacaoAcabamento;
  };
  preco: any;
};

@Component({
  selector: 'app-grafica-acabamento-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    InputOptionsComponent,
    PrecoSelectorComponent,
  ],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [showFooter]="true">
      <div page-header-actions>
        <button mat-stroked-button type="button" (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <form id="grafica-acabamento-form" [formGroup]="form" class="acabamento-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados do acabamento">
          <div class="form-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Ex.: Laminação fosca"
              [maxlength]="140"
              requiredError="Informe o nome do acabamento.">
            </app-input-texto-restrito>

            <app-input-options
              [control]="materialControl"
              label="Material"
              [options]="materiais"
              nullLabel="Sem material">
            </app-input-options>

            <app-input-options
              [control]="formatoControl"
              label="Formato"
              [options]="formatos"
              nullLabel="Sem formato">
            </app-input-options>

            <app-input-options
              [control]="aplicacaoControl"
              label="Aplicação"
              placeholder="Aplicação"
              [options]="aplicacoes"
              labelKey="label"
              valueKey="value"
              [showNull]="false">
            </app-input-options>

            <app-input-textarea
              class="form-grid__wide"
              [control]="descricaoControl"
              label="Descrição"
              [rows]="4"
              [maxlength]="500">
            </app-input-textarea>
          </div>
        </app-section-card>

        <app-section-card title="Precificação">
          <app-preco-selector
            [formGroup]="precoForm"
            [tiposDisponiveis]="['FIXO', 'QUANTIDADE', 'DEMANDA', 'METRO', 'HORA']">
          </app-preco-selector>
          <div class="validation-hint" *ngIf="precoForm.invalid">Complete os campos obrigatórios da política de preço.</div>
        </app-section-card>
      </form>

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-acabamento-form" [disabled]="form.invalid || precoForm.invalid || salvando">
        <mat-icon>save</mat-icon>
        Salvar
      </button>
    </app-page-card>
  `,
  styles: [`
    .acabamento-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
      align-items: start;
    }

    .form-grid__wide {
      grid-column: 1 / -1;
    }

    .validation-hint {
      margin-top: 8px;
      color: #b45309;
      font-size: 0.84rem;
      font-weight: 600;
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

    .cancel-button {
      border-color: #fecaca;
      color: #b91c1c;
      background: #fef2f2;
    }

    .cancel-button:hover {
      background: #fee2e2;
    }

    @media (max-width: 900px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class GraficaAcabamentoFormComponent implements OnInit {
  acabamentoId?: number;
  salvando = false;
  carregando = false;
  snapshot?: AcabamentoFormSnapshot;
  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];

  readonly aplicacoes = [
    { value: 'PECA', label: 'Por peça' },
    { value: 'FOLHA', label: 'Por folha' },
    { value: 'METRO_QUADRADO', label: 'Por metro quadrado' },
    { value: 'METRO_LINEAR', label: 'Por metro linear' },
    { value: 'SERVICO', label: 'Por serviço' },
  ];

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    materialId: this.fb.control<number | null>(null),
    formatoId: this.fb.control<number | null>(null),
    aplicacao: this.fb.control<AplicacaoAcabamento>('PECA', { nonNullable: true }),
  });
  precoForm: FormGroup = this.fb.group({ tipo: ['FIXO'], valor: [null] });

  get titulo(): string {
    return this.acabamentoId ? 'Editar acabamento' : 'Novo acabamento';
  }

  get subtitulo(): string {
    return this.acabamentoId ? 'Atualize os dados do acabamento gráfico' : 'Cadastro de acabamento gráfico';
  }

  get nomeControl(): FormControl<string> { return this.form.controls.nome; }
  get descricaoControl(): FormControl<string> { return this.form.controls.descricao; }
  get materialControl(): FormControl<number | null> { return this.form.controls.materialId; }
  get formatoControl(): FormControl<number | null> { return this.form.controls.formatoId; }
  get aplicacaoControl(): FormControl<AplicacaoAcabamento> { return this.form.controls.aplicacao; }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: GraficaProdutoService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.carregarApoio();
    this.carregando = true;
    this.route.paramMap.pipe(
      switchMap((params) => {
        const id = Number(params.get('id'));
        this.acabamentoId = Number.isFinite(id) && id > 0 ? id : undefined;
        if (!this.acabamentoId) return of(null);
        return this.service.listarAcabamentos().pipe(
          map((items) => (items || []).find((item) => item.id === this.acabamentoId) || null)
        );
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: (acabamento) => {
        if (this.acabamentoId && !acabamento) {
          this.toastr.error('Acabamento não encontrado.');
          this.voltar();
          return;
        }
        if (acabamento) {
          this.aplicarAcabamento(acabamento);
        } else {
          this.registrarSnapshot();
        }
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar o acabamento.')),
    });
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }
    this.precoForm.markAllAsTouched();
    this.precoForm.updateValueAndValidity();
    if (this.precoForm.invalid) {
      const msgPreco = (this.precoForm.errors as any)?.precoInvalido?.msg;
      this.toastr.error(msgPreco || 'Defina um preço válido antes de salvar.', 'Preço incompleto');
      return;
    }

    this.salvando = true;
    this.service.salvarAcabamento(this.toRequest(), this.acabamentoId).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Acabamento salvo.');
        this.voltar();
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o acabamento.')),
    });
  }

  cancelar(): void {
    if (!this.snapshot) {
      this.voltar();
      return;
    }
    this.form.reset(this.snapshot.form);
    this.precoForm = this.criarPrecoForm(this.snapshot.preco);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.precoForm.markAsPristine();
    this.precoForm.markAsUntouched();
  }

  voltar(): void {
    this.router.navigate(['/page/grafica/acabamentos']);
  }

  private aplicarAcabamento(acabamento: GraficaAcabamento): void {
    this.form.reset({
      nome: acabamento.nome || '',
      descricao: acabamento.descricao || '',
      materialId: acabamento.materialId || null,
      formatoId: acabamento.formatoId || null,
      aplicacao: acabamento.aplicacao || 'PECA',
    });
    this.precoForm = this.criarPrecoForm(acabamento.precoConfiguracao);
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void {
    this.snapshot = {
      form: this.form.getRawValue(),
      preco: this.precoForm.getRawValue(),
    };
  }

  private carregarApoio(): void {
    this.service.listarMateriais().pipe(catchError(() => of([]))).subscribe((items) => this.materiais = items || []);
    this.service.listarFormatos().pipe(catchError(() => of([]))).subscribe((items) => this.formatos = items || []);
  }

  private toRequest(): GraficaAcabamentoRequest {
    const raw = this.form.getRawValue();
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      descricao: raw.descricao?.trim() || null,
      materialId: raw.materialId,
      formatoId: raw.formatoId,
      aplicacao: raw.aplicacao,
      precoConfiguracao: this.precoForm.getRawValue(),
      ativo: true,
    };
  }

  private criarPrecoForm(preco: any): FormGroup {
    const tipo = (preco?.tipo || 'FIXO') as string;
    switch (tipo) {
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
          largurasLinearesPermitidas: [preco?.largurasLinearesPermitidas ?? ''],
        });
      case 'HORA':
        return this.fb.group({
          tipo: ['HORA'],
          valorHora: [preco?.valorHora ?? null],
          tempoEstimado: [preco?.tempoEstimado ?? null],
        });
      default:
        return this.fb.group({
          tipo: ['FIXO'],
          valor: [preco?.valor ?? null],
        });
    }
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80);
  }
}
