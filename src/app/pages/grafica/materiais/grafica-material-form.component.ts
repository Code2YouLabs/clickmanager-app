import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro, GraficaCadastroRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';


@Component({
  selector: 'app-grafica-material-form',
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
  ],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [formState]="formState" [footerActions]="footerActions" [saving]="salvando" [actionsDisabled]="carregando">
      <div page-header-actions>
        <button mat-stroked-button type="button" (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <form id="grafica-material-form" [formGroup]="form" class="material-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados do material">
          <div class="form-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Ex.: Couchê 150g"
              [maxlength]="140"
              requiredError="Informe o nome do material.">
            </app-input-texto-restrito>

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
    .material-form {
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



    @media (max-width: 900px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class GraficaMaterialFormComponent implements OnInit {
  materialId?: number;
  cloneFromId?: number;
  salvando = false;
  carregando = false;

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
  });

  readonly formState = new PageFormState(() => this.form);
  private readonly emptyForm = this.form.getRawValue();
  get footerActions(): PageCardAction[] {
    return [{ id: 'salvar', label: 'Salvar', icon: 'save', type: 'submit', form: 'grafica-material-form', primary: true,
      disabled: this.form.invalid }];
  }

  get titulo(): string {
    if (this.cloneFromId) return 'Clonar material';
    return this.materialId ? 'Editar material' : 'Novo material';
  }

  get subtitulo(): string {
    if (this.cloneFromId) return 'Revise os dados e salve para criar o clone';
    return this.materialId ? 'Atualize os dados do material gráfico' : 'Cadastro de material gráfico';
  }

  get nomeControl(): FormControl<string> { return this.form.controls.nome; }
  get descricaoControl(): FormControl<string> { return this.form.controls.descricao; }

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
        this.materialId = Number.isFinite(id) && id > 0 ? id : undefined;
        const cloneFrom = Number(this.route.snapshot.queryParamMap.get('cloneFrom'));
        this.cloneFromId = !this.materialId && Number.isFinite(cloneFrom) && cloneFrom > 0 ? cloneFrom : undefined;
        this.form.reset(this.emptyForm);
        this.formState.begin(this.materialId ? 'edit' : 'create');
        const origemId = this.materialId || this.cloneFromId;
        if (!origemId) return of(null);
        return this.service.listarMateriais().pipe(
          map((items) => (items || []).find((item) => item.id === origemId) || null)
        );
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: (material) => {
        this.carregando = false;
        if ((this.materialId || this.cloneFromId) && !material) {
          this.toastr.error('Material não encontrado.');
          this.voltar();
          return;
        }
        if (material) {
          this.aplicarMaterial(material);
        } else {
          this.registrarSnapshot();
        }
      },
      error: (error) => { this.carregando = false; this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar o material.')); },
    });
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando = true;
    this.service.salvarMaterial(this.toRequest(), this.materialId).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Material salvo.');
        this.voltar();
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o material.')),
    });
  }



  voltar(): void {
    this.router.navigate(['/page/grafica/materiais']);
  }

  private aplicarMaterial(material: GraficaCadastro): void {
    this.form.reset({
      nome: material.nome || '',
      descricao: material.descricao || '',
    });
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void { this.formState.loaded(); }

  private toRequest(): GraficaCadastroRequest {
    const raw = this.form.getRawValue();
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      descricao: raw.descricao?.trim() || null,
      ativo: true,
    };
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80);
  }

}
