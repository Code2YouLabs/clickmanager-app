import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable } from 'rxjs';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { UnitInputComponent } from 'src/app/components/inputs/unit-input/unit-input.component';
import { MaterialModule } from 'src/app/material.module';
import { CatalogoCategoria, CatalogoCategoriaOption, CatalogoCategoriaRequest } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro, GraficaCadastroRequest, GraficaFormato, GraficaFormatoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type CadastroRapidoTipo = 'material' | 'formato' | 'cor' | 'categoria';
type UnidadeGrafica = 'METRO' | 'CENTIMETRO' | 'MILIMETRO';
type CadastroRapidoResult = GraficaCadastro | GraficaFormato | CatalogoCategoria;
type CategoriaHierarquicaOption = CatalogoCategoriaOption & {
  nivel?: number;
  caminho?: string;
  caminhoPai?: string;
  busca?: string;
};

interface CadastroRapidoDialogData {
  tipo: CadastroRapidoTipo;
  categorias?: CategoriaHierarquicaOption[];
}

@Component({
  selector: 'app-grafica-cadastro-rapido-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    InputOptionsComponent,
    UnitInputComponent,
  ],
  template: `
    <h2 mat-dialog-title class="m-0 f-w-600">{{ titulo }}</h2>

    <mat-dialog-content class="p-t-12">
      <form [formGroup]="form" class="quick-create-form">
        <app-input-texto-restrito
          [control]="nomeControl"
          label="Nome"
          [placeholder]="nomePlaceholder"
          [maxlength]="140"
          [requiredError]="nomeRequiredError">
        </app-input-texto-restrito>

        <app-input-options
          *ngIf="data.tipo === 'categoria'"
          [control]="categoriaPaiControl"
          label="Categoria pai"
          placeholder="Categoria pai"
          [options]="categoriasPai"
          [hierarchical]="true"
          [searchable]="true"
          optionSubtitleKey="caminhoPai"
          optionLevelKey="nivel"
          optionPathKey="caminho"
          selectedLabelKey="caminho"
          [searchKeys]="['busca']"
          [showNull]="true"
          nullLabel="Sem categoria pai">
        </app-input-options>

        <ng-container *ngIf="data.tipo === 'formato'">
          <app-input-options
            [control]="unidadeControl"
            label="Unidade"
            placeholder="Unidade"
            [options]="unidades"
            labelKey="label"
            valueKey="value"
            [showNull]="true"
            [clearable]="true"
            nullLabel="Sem unidade">
          </app-input-options>

          <small class="quick-create-form__wide quick-create-form__hint">
            As dimensões são opcionais. Preencha quando este formato possuir medidas físicas usadas na produção ou cálculo.
          </small>

          <app-unit-input
            formControlName="altura"
            label="Altura"
            [unit]="unidadeSuffix"
            [min]="0.01"
            [decimals]="2"
            [required]="dimensaoIniciada"
            [requiredError]="alturaObrigatoriaVisivel">
          </app-unit-input>

          <app-unit-input
            formControlName="largura"
            label="Largura"
            [unit]="unidadeSuffix"
            [min]="0.01"
            [decimals]="2"
            [required]="dimensaoIniciada"
            [requiredError]="larguraObrigatoriaVisivel">
          </app-unit-input>

          <app-unit-input
            formControlName="alturaUtil"
            label="Altura útil"
            [unit]="unidadeSuffix"
            [min]="0.01"
            [decimals]="2"
            [required]="false"
            [requiredError]="false">
          </app-unit-input>

          <app-unit-input
            formControlName="larguraUtil"
            label="Largura útil"
            [unit]="unidadeSuffix"
            [min]="0.01"
            [decimals]="2"
            [required]="false"
            [requiredError]="false">
          </app-unit-input>

          <small class="quick-create-form__wide quick-create-form__validation" *ngIf="form.invalid && form.touched">
            {{ formatoErrorMessage }}
          </small>
        </ng-container>

        <app-input-textarea
          class="quick-create-form__wide"
          [control]="descricaoControl"
          [label]="descricaoLabel"
          [rows]="4"
          [maxlength]="500">
        </app-input-textarea>
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
    .quick-create-form__hint {
      margin-top: -6px;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .quick-create-form__validation {
      margin-top: -6px;
      color: #b45309;
      font-size: 0.84rem;
      font-weight: 600;
      line-height: 1.35;
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
  readonly unidades = [
    { value: 'CENTIMETRO', label: 'cm' },
    { value: 'MILIMETRO', label: 'mm' },
    { value: 'METRO', label: 'm' },
  ];

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    largura: this.fb.control<number | null>(null),
    altura: this.fb.control<number | null>(null),
    larguraUtil: this.fb.control<number | null>(null),
    alturaUtil: this.fb.control<number | null>(null),
    unidadeDimensao: this.fb.control<UnidadeGrafica | null>(null),
    categoriaPaiId: this.fb.control<number | null>(null),
  }, { validators: formatoDimensionalValidator() });

  get titulo(): string {
    return {
      material: 'Novo material',
      formato: 'Novo formato',
      cor: 'Nova cor',
      categoria: 'Nova categoria',
    }[this.data.tipo];
  }

  get nomePlaceholder(): string {
    return {
      material: 'Ex.: Couchê 150g',
      formato: 'Ex.: 10x15',
      cor: 'Ex.: 4x4',
      categoria: 'Ex.: Panfletos',
    }[this.data.tipo];
  }

  get nomeRequiredError(): string {
    return {
      material: 'Informe o nome do material.',
      formato: 'Informe o nome do formato.',
      cor: 'Informe o nome da cor.',
      categoria: 'Informe o nome da categoria.',
    }[this.data.tipo];
  }

  get descricaoLabel(): string {
    return this.data.tipo === 'categoria' ? 'Descrição curta' : 'Descrição';
  }

  get unidadeSuffix(): string {
    switch (this.unidadeControl.value) {
      case 'METRO': return 'm';
      case 'MILIMETRO': return 'mm';
      case 'CENTIMETRO': return 'cm';
      default: return '';
    }
  }

  get dimensaoIniciada(): boolean {
    const raw = this.form.getRawValue();
    return raw.largura != null || raw.altura != null || raw.unidadeDimensao != null;
  }

  get alturaObrigatoriaVisivel(): boolean {
    return this.alturaControl.touched && this.form.hasError('dimensaoParcial') && this.alturaControl.value == null;
  }

  get larguraObrigatoriaVisivel(): boolean {
    return this.larguraControl.touched && this.form.hasError('dimensaoParcial') && this.larguraControl.value == null;
  }

  get formatoErrorMessage(): string {
    if (this.form.hasError('dimensaoParcial')) return 'Preencha altura e largura juntas.';
    if (this.form.hasError('unidadeObrigatoria')) return 'Informe a unidade quando houver dimensões físicas.';
    if (this.form.hasError('dimensaoObrigatoria')) return 'Informe altura e largura ou deixe a unidade vazia.';
    if (this.form.hasError('dimensaoObrigatoriaParaAreaUtil')) return 'Área útil só pode ser informada quando altura e largura também estiverem preenchidas.';
    if (this.form.hasError('alturaUtilMaior')) return 'Altura útil não pode ser maior que a altura.';
    if (this.form.hasError('larguraUtilMaior')) return 'Largura útil não pode ser maior que a largura.';
    return 'Revise os dados do formato.';
  }

  get nomeControl(): FormControl<string> { return this.form.controls.nome; }
  get descricaoControl(): FormControl<string> { return this.form.controls.descricao; }
  get larguraControl(): FormControl<number | null> { return this.form.controls.largura; }
  get alturaControl(): FormControl<number | null> { return this.form.controls.altura; }
  get larguraUtilControl(): FormControl<number | null> { return this.form.controls.larguraUtil; }
  get alturaUtilControl(): FormControl<number | null> { return this.form.controls.alturaUtil; }
  get unidadeControl(): FormControl<UnidadeGrafica | null> { return this.form.controls.unidadeDimensao; }
  get categoriaPaiControl(): FormControl<number | null> { return this.form.controls.categoriaPaiId; }
  get categoriasPai(): CategoriaHierarquicaOption[] { return this.data.categorias || []; }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: GraficaProdutoService,
    private readonly categoriaService: CatalogoCategoriaService,
    private readonly toastr: ToastrService,
    private readonly dialogRef: MatDialogRef<GraficaCadastroRapidoDialogComponent, CadastroRapidoResult | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: CadastroRapidoDialogData,
  ) {
    this.configurarValidadoresPorTipo();
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
    const request$: Observable<CadastroRapidoResult> = this.buildRequest();

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
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      descricao: raw.descricao?.trim() || null,
      ativo: true,
    };
  }

  private formatoRequest(): GraficaFormatoRequest {
    const raw = this.form.getRawValue();
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      descricao: raw.descricao?.trim() || null,
      largura: raw.largura,
      altura: raw.altura,
      larguraUtil: raw.larguraUtil,
      alturaUtil: raw.alturaUtil,
      unidadeDimensao: raw.unidadeDimensao,
      ativo: true,
    };
  }

  private categoriaRequest(): CatalogoCategoriaRequest {
    const raw = this.form.getRawValue();
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      slug: catalogoSlugify(nome),
      descricaoCurta: raw.descricao?.trim() || null,
      descricaoCompleta: null,
      categoriaPaiId: raw.categoriaPaiId,
      ordemExibicao: 0,
      destaque: false,
      ativo: true,
    };
  }

  private buildRequest(): Observable<CadastroRapidoResult> {
    switch (this.data.tipo) {
      case 'formato':
        return this.service.salvarFormato(this.formatoRequest());
      case 'material':
        return this.service.salvarMaterial(this.cadastroRequest());
      case 'cor':
        return this.service.salvarCor(this.cadastroRequest());
      case 'categoria':
        return this.categoriaService.criar(this.categoriaRequest());
    }
  }

  private configurarValidadoresPorTipo(): void {
    const formato = this.data.tipo === 'formato';
    const opcionalMaiorQueZero = formato ? [Validators.min(0.01)] : [];
    this.form.controls.altura.setValidators(opcionalMaiorQueZero);
    this.form.controls.largura.setValidators(opcionalMaiorQueZero);
    this.form.controls.alturaUtil.setValidators(opcionalMaiorQueZero);
    this.form.controls.larguraUtil.setValidators(opcionalMaiorQueZero);
    this.form.controls.unidadeDimensao.setValidators([]);
    this.form.updateValueAndValidity({ emitEvent: false });
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80);
  }
}

function formatoDimensionalValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const largura = control.get('largura')?.value;
    const altura = control.get('altura')?.value;
    const larguraUtil = control.get('larguraUtil')?.value;
    const alturaUtil = control.get('alturaUtil')?.value;
    const unidadeDimensao = control.get('unidadeDimensao')?.value;
    const errors: ValidationErrors = {};

    if ((largura == null) !== (altura == null)) {
      errors['dimensaoParcial'] = true;
    }
    if ((largura != null || altura != null) && unidadeDimensao == null) {
      errors['unidadeObrigatoria'] = true;
    }
    if (unidadeDimensao != null && largura == null && altura == null) {
      errors['dimensaoObrigatoria'] = true;
    }
    if ((larguraUtil != null || alturaUtil != null) && (largura == null || altura == null)) {
      errors['dimensaoObrigatoriaParaAreaUtil'] = true;
    }
    if (alturaUtil != null && altura != null && alturaUtil > altura) {
      errors['alturaUtilMaior'] = true;
    }
    if (larguraUtil != null && largura != null && larguraUtil > largura) {
      errors['larguraUtilMaior'] = true;
    }

    return Object.keys(errors).length ? errors : null;
  };
}
