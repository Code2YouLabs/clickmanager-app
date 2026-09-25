import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { UnitInputComponent } from 'src/app/components/inputs/unit-input/unit-input.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaFormato, GraficaFormatoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type UnidadeGrafica = 'METRO' | 'CENTIMETRO' | 'MILIMETRO';


@Component({
  selector: 'app-grafica-formato-form',
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
    UnitInputComponent,
  ],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [formState]="formState" [footerActions]="footerActions" [saving]="salvando" [actionsDisabled]="carregando">
      <div page-header-actions>
        <button mat-stroked-button type="button" (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <form id="grafica-formato-form" [formGroup]="form" class="formato-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados do formato">
          <div class="form-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Ex.: 10x15"
              [maxlength]="140"
              requiredError="Informe o nome do formato.">
            </app-input-texto-restrito>

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

            <small class="dimension-help form-grid__wide">
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

            <small class="validation-hint form-grid__wide" *ngIf="form.invalid && form.touched">
              {{ formatoErrorMessage }}
            </small>

            <app-input-textarea
              class="form-grid__wide"
              [control]="descricaoControl"
              label="Descrição"
              [rows]="4"
              [maxlength]="500">
            </app-input-textarea>
          </div>
        </app-section-card>
      </form>

    </app-page-card>
  `,
  styles: [`
    .formato-form {
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

    .dimension-help {
      margin-top: -8px;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.35;
    }

    .validation-hint {
      margin-top: -8px;
      color: #b45309;
      font-size: 0.84rem;
      font-weight: 600;
      line-height: 1.35;
    }



    @media (max-width: 700px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class GraficaFormatoFormComponent implements OnInit {
  formatoId?: number;
  cloneFromId?: number;
  salvando = false;
  carregando = false;

  readonly unidades = [
    { value: 'CENTIMETRO', label: 'cm' },
    { value: 'MILIMETRO', label: 'mm' },
    { value: 'METRO', label: 'm' },
  ];

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    largura: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    altura: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    larguraUtil: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    alturaUtil: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    unidadeDimensao: this.fb.control<UnidadeGrafica | null>(null),
  }, { validators: formatoDimensionalValidator() });

  readonly formState = new PageFormState(() => this.form);
  private readonly emptyForm = this.form.getRawValue();
  get footerActions(): PageCardAction[] {
    return [{ id: 'salvar', label: 'Salvar', icon: 'save', type: 'submit', form: 'grafica-formato-form', primary: true,
      disabled: this.form.invalid }];
  }

  get titulo(): string {
    if (this.cloneFromId) return 'Clonar formato';
    return this.formatoId ? 'Editar formato' : 'Novo formato';
  }

  get subtitulo(): string {
    if (this.cloneFromId) return 'Revise os dados e salve para criar o clone';
    return this.formatoId ? 'Atualize os dados do formato gráfico' : 'Cadastro de formato gráfico';
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

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: GraficaProdutoService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.carregando = true;
    this.route.paramMap.pipe(
      switchMap((params) => {
        this.carregando = true;
        const id = Number(params.get('id'));
        this.formatoId = Number.isFinite(id) && id > 0 ? id : undefined;
        const cloneFrom = Number(this.route.snapshot.queryParamMap.get('cloneFrom'));
        this.cloneFromId = !this.formatoId && Number.isFinite(cloneFrom) && cloneFrom > 0 ? cloneFrom : undefined;
        this.form.reset(this.emptyForm);
        this.formState.begin(this.formatoId ? 'edit' : 'create');
        const origemId = this.formatoId || this.cloneFromId;
        if (!origemId) return of(null);
        return this.service.listarFormatos().pipe(
          map((items) => (items || []).find((item) => item.id === origemId) || null)
        );
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: (formato) => {
        this.carregando = false;
        if ((this.formatoId || this.cloneFromId) && !formato) {
          this.toastr.error('Formato não encontrado.');
          this.voltar();
          return;
        }
        if (formato) {
          this.aplicarFormato(formato);
        } else {
          this.registrarSnapshot();
        }
      },
      error: (error) => { this.carregando = false; this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar o formato.')); },
    });
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando = true;
    this.service.salvarFormato(this.toRequest(), this.formatoId).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Formato salvo.');
        this.voltar();
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o formato.')),
    });
  }



  voltar(): void {
    this.router.navigate(['/page/grafica/formatos']);
  }

  private aplicarFormato(formato: GraficaFormato): void {
    this.form.reset({
      nome: formato.nome || '',
      descricao: formato.descricao || '',
      largura: formato.largura || null,
      altura: formato.altura || null,
      larguraUtil: formato.larguraUtil || null,
      alturaUtil: formato.alturaUtil || null,
      unidadeDimensao: formato.unidadeDimensao || null,
    });
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void { this.formState.loaded(); }

  private toRequest(): GraficaFormatoRequest {
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
