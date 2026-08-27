import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { UnitInputComponent } from 'src/app/components/inputs/unit-input/unit-input.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaFormato, GraficaFormatoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type UnidadeGrafica = 'METRO' | 'CENTIMETRO' | 'MILIMETRO';

type FormatoFormSnapshot = {
  nome: string;
  descricao: string;
  largura: number | null;
  altura: number | null;
  larguraUtil: number | null;
  alturaUtil: number | null;
  unidadeDimensao: UnidadeGrafica;
};

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
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [showFooter]="true">
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
              [showNull]="false">
            </app-input-options>

            <app-unit-input
              formControlName="altura"
              label="Altura"
              [unit]="unidadeSuffix"
              [min]="0.01"
              [decimals]="2"
              [required]="true"
              [requiredError]="alturaControl.invalid && alturaControl.touched">
            </app-unit-input>

            <app-unit-input
              formControlName="largura"
              label="Largura"
              [unit]="unidadeSuffix"
              [min]="0.01"
              [decimals]="2"
              [required]="true"
              [requiredError]="larguraControl.invalid && larguraControl.touched">
            </app-unit-input>

            <app-unit-input
              formControlName="alturaUtil"
              label="Altura útil"
              [unit]="unidadeSuffix"
              [min]="0.01"
              [decimals]="2"
              [required]="false"
              [requiredError]="alturaUtilControl.invalid && alturaUtilControl.touched">
            </app-unit-input>

            <app-unit-input
              formControlName="larguraUtil"
              label="Largura útil"
              [unit]="unidadeSuffix"
              [min]="0.01"
              [decimals]="2"
              [required]="false"
              [requiredError]="larguraUtilControl.invalid && larguraUtilControl.touched">
            </app-unit-input>

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

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-formato-form" [disabled]="form.invalid || salvando">
        <mat-icon>save</mat-icon>
        Salvar
      </button>
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

    .cancel-button {
      border-color: #fecaca;
      color: #b91c1c;
      background: #fef2f2;
    }

    .cancel-button:hover {
      background: #fee2e2;
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
  salvando = false;
  carregando = false;
  snapshot?: FormatoFormSnapshot;

  readonly unidades = [
    { value: 'CENTIMETRO', label: 'cm' },
    { value: 'MILIMETRO', label: 'mm' },
    { value: 'METRO', label: 'm' },
  ];

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    largura: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    altura: this.fb.control<number | null>(null, [Validators.required, Validators.min(0.01)]),
    larguraUtil: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    alturaUtil: this.fb.control<number | null>(null, [Validators.min(0.01)]),
    unidadeDimensao: this.fb.control<UnidadeGrafica>('CENTIMETRO', { nonNullable: true, validators: [Validators.required] }),
  });

  get titulo(): string {
    return this.formatoId ? 'Editar formato' : 'Novo formato';
  }

  get subtitulo(): string {
    return this.formatoId ? 'Atualize os dados do formato gráfico' : 'Cadastro de formato gráfico';
  }

  get unidadeSuffix(): string {
    switch (this.unidadeControl.value) {
      case 'METRO': return 'm';
      case 'MILIMETRO': return 'mm';
      default: return 'cm';
    }
  }

  get nomeControl(): FormControl<string> { return this.form.controls.nome; }
  get descricaoControl(): FormControl<string> { return this.form.controls.descricao; }
  get larguraControl(): FormControl<number | null> { return this.form.controls.largura; }
  get alturaControl(): FormControl<number | null> { return this.form.controls.altura; }
  get larguraUtilControl(): FormControl<number | null> { return this.form.controls.larguraUtil; }
  get alturaUtilControl(): FormControl<number | null> { return this.form.controls.alturaUtil; }
  get unidadeControl(): FormControl<UnidadeGrafica> { return this.form.controls.unidadeDimensao; }

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
        const id = Number(params.get('id'));
        this.formatoId = Number.isFinite(id) && id > 0 ? id : undefined;
        if (!this.formatoId) return of(null);
        return this.service.listarFormatos().pipe(
          map((items) => (items || []).find((item) => item.id === this.formatoId) || null)
        );
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: (formato) => {
        if (this.formatoId && !formato) {
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
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar o formato.')),
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

  cancelar(): void {
    if (!this.snapshot) {
      this.voltar();
      return;
    }
    this.form.reset(this.snapshot);
    this.form.markAsPristine();
    this.form.markAsUntouched();
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
      unidadeDimensao: formato.unidadeDimensao || 'CENTIMETRO',
    });
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void {
    this.snapshot = this.form.getRawValue();
  }

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
