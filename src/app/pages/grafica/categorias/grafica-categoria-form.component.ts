import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { RichTextPreviewFieldComponent } from 'src/app/components/rich-text-preview-field/rich-text-preview-field.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoria, CatalogoCategoriaOption, CatalogoCategoriaRequest } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';


@Component({
  selector: 'app-grafica-categoria-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    RichTextPreviewFieldComponent,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    InputOptionsComponent,
  ],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [formState]="formState" [footerActions]="footerActions" [saving]="salvando" [actionsDisabled]="carregando">
      <div page-header-actions>
        <button mat-stroked-button type="button" (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <form id="grafica-categoria-form" [formGroup]="form" class="categoria-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados da categoria">
          <div class="form-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Ex.: Panfletos"
              [maxlength]="120"
              requiredError="Informe o nome da categoria.">
            </app-input-texto-restrito>

            <app-input-options
              [control]="categoriaPaiControl"
              label="Categoria pai"
              placeholder="Categoria pai"
              [options]="categoriasPaiDisponiveis"
              [showNull]="true"
              nullLabel="Sem categoria pai">
            </app-input-options>

            <app-input-textarea
              class="form-grid__wide"
              [control]="descricaoCurtaControl"
              label="Descrição curta"
              [rows]="2"
              [maxlength]="255">
            </app-input-textarea>

            <app-rich-text-preview-field
              class="form-grid__wide"
              [control]="descricaoCompletaControl"
              label="Descrição completa"
              hint="Use esta área para textos comerciais, instruções e informações detalhadas."
              placeholder="Digite a descrição completa da categoria"
              [minHeight]="180"
              [maxLength]="2000">
            </app-rich-text-preview-field>
          </div>
        </app-section-card>
      </form>

    </app-page-card>
  `,
  styles: [`
    .categoria-form {
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
export class GraficaCategoriaFormComponent implements OnInit {
  categoriaId?: number;
  cloneFromId?: number;
  categoriasPai: CatalogoCategoriaOption[] = [];
  salvando = false;
  carregando = false;

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    categoriaPaiId: this.fb.control<number | null>(null),
    descricaoCurta: this.fb.control('', { nonNullable: true }),
    descricaoCompleta: this.fb.control('', { nonNullable: true }),
  });

  readonly formState = new PageFormState(() => this.form);
  private readonly emptyForm = this.form.getRawValue();
  get footerActions(): PageCardAction[] {
    return [{ id: 'salvar', label: 'Salvar', icon: 'save', type: 'submit', form: 'grafica-categoria-form', primary: true,
      disabled: this.form.invalid }];
  }

  get titulo(): string {
    if (this.cloneFromId) {
      return 'Clonar categoria';
    }
    return this.categoriaId ? 'Editar categoria' : 'Nova categoria';
  }

  get subtitulo(): string {
    if (this.cloneFromId) {
      return 'Revise os dados e salve como uma nova categoria gráfica';
    }
    return this.categoriaId ? 'Atualize os dados da categoria gráfica' : 'Cadastro de categoria gráfica';
  }

  get categoriasPaiDisponiveis(): CatalogoCategoriaOption[] {
    return this.categoriasPai.filter((categoria) => categoria.id !== this.categoriaId);
  }

  get nomeControl(): FormControl<string> { return this.form.controls.nome; }
  get categoriaPaiControl(): FormControl<number | null> { return this.form.controls.categoriaPaiId; }
  get descricaoCurtaControl(): FormControl<string> { return this.form.controls.descricaoCurta; }
  get descricaoCompletaControl(): FormControl<string> { return this.form.controls.descricaoCompleta; }

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: CatalogoCategoriaService,
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
        this.categoriaId = Number.isFinite(id) && id > 0 ? id : undefined;
        const cloneFrom = Number(this.route.snapshot.queryParamMap.get('cloneFrom'));
        this.cloneFromId = !this.categoriaId && Number.isFinite(cloneFrom) && cloneFrom > 0 ? cloneFrom : undefined;
        this.form.reset(this.emptyForm);
        this.formState.begin(this.categoriaId ? 'edit' : 'create');
        return forkJoin({
          categoriasPai: this.service.options(true).pipe(catchError(() => of([]))),
          categoria: this.categoriaId || this.cloneFromId ? this.service.detalhar(this.categoriaId || this.cloneFromId!) : of(null),
        });
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: ({ categoriasPai, categoria }) => {
        this.carregando = false;
        this.categoriasPai = categoriasPai || [];
        if (categoria) {
          this.aplicarCategoria(categoria);
        } else {
          this.registrarSnapshot();
        }
      },
      error: (error) => { this.carregando = false; this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar a categoria.')); },
    });
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando = true;
    const request = this.toRequest();
    const action = this.categoriaId
      ? this.service.atualizar(this.categoriaId, request)
      : this.service.criar(request);

    action.pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Categoria salva.');
        this.voltar();
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar a categoria.')),
    });
  }



  voltar(): void {
    this.router.navigate(['/page/grafica/categorias']);
  }

  private aplicarCategoria(categoria: CatalogoCategoria): void {
    this.form.reset({
      nome: categoria.nome || '',
      categoriaPaiId: categoria.categoriaPaiId || null,
      descricaoCurta: categoria.descricaoCurta || '',
      descricaoCompleta: categoria.descricaoCompleta || '',
    });
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void { this.formState.loaded(); }

  private toRequest(): CatalogoCategoriaRequest {
    const raw = this.form.getRawValue();
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      slug: catalogoSlugify(nome),
      descricaoCurta: raw.descricaoCurta?.trim() || null,
      descricaoCompleta: raw.descricaoCompleta?.trim() || null,
      categoriaPaiId: raw.categoriaPaiId,
      ordemExibicao: null,
      destaque: false,
      ativo: true,
    };
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 50);
  }

}
