import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro, GraficaCadastroRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type CorFormSnapshot = {
  nome: string;
  descricao: string;
};

@Component({
  selector: 'app-grafica-cor-form',
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
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [showFooter]="true">
      <div page-header-actions>
        <button mat-stroked-button type="button" (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <form id="grafica-cor-form" [formGroup]="form" class="cor-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados da cor">
          <div class="form-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Ex.: 4x4"
              [maxlength]="140"
              requiredError="Informe o nome da cor.">
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

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-cor-form" [disabled]="form.invalid || salvando">
        <mat-icon>save</mat-icon>
        Salvar
      </button>
    </app-page-card>
  `,
  styles: [`
    .cor-form {
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

    @media (max-width: 900px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `],
})
export class GraficaCorFormComponent implements OnInit {
  corId?: number;
  salvando = false;
  carregando = false;
  snapshot?: CorFormSnapshot;

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
  });

  get titulo(): string {
    return this.corId ? 'Editar cor' : 'Nova cor';
  }

  get subtitulo(): string {
    return this.corId ? 'Atualize os dados da cor gráfica' : 'Cadastro de cor gráfica';
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
        const id = Number(params.get('id'));
        this.corId = Number.isFinite(id) && id > 0 ? id : undefined;
        if (!this.corId) return of(null);
        return this.service.listarCores().pipe(
          map((items) => (items || []).find((item) => item.id === this.corId) || null)
        );
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: (cor) => {
        if (this.corId && !cor) {
          this.toastr.error('Cor não encontrada.');
          this.voltar();
          return;
        }
        if (cor) {
          this.aplicarCor(cor);
        } else {
          this.registrarSnapshot();
        }
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar a cor.')),
    });
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    this.salvando = true;
    this.service.salvarCor(this.toRequest(), this.corId).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Cor salva.');
        this.voltar();
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar a cor.')),
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
    this.router.navigate(['/page/grafica/cores']);
  }

  private aplicarCor(cor: GraficaCadastro): void {
    this.form.reset({
      nome: cor.nome || '',
      descricao: cor.descricao || '',
    });
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void {
    this.snapshot = this.form.getRawValue();
  }

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
