import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { finalize, map, of, switchMap } from 'rxjs';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaPrecoPolitica, GraficaPrecoPoliticaRequest, GraficaServico, GraficaServicoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type ServicoFormSnapshot = {
  form: {
    nome: string;
    descricao: string;
  };
  preco: any;
};

@Component({
  selector: 'app-grafica-servico-form',
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

      <form id="grafica-servico-form" [formGroup]="form" class="servico-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados do serviço">
          <div class="form-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Ex.: Arte final"
              [maxlength]="140"
              requiredError="Informe o nome do serviço.">
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

        <app-section-card title="Precificação">
          <app-preco-selector
            [formGroup]="precoForm"
            [tiposDisponiveis]="['FIXO', 'DEMANDA', 'QUANTIDADE', 'METRO']">
          </app-preco-selector>
        </app-section-card>
      </form>

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-servico-form" [disabled]="form.invalid || precoForm.invalid || salvando">
        <mat-icon>save</mat-icon>
        Salvar
      </button>
    </app-page-card>
  `,
  styles: [`
    .servico-form {
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
export class GraficaServicoFormComponent implements OnInit {
  servicoId?: number;
  salvando = false;
  carregando = false;
  snapshot?: ServicoFormSnapshot;

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
  });
  precoForm: FormGroup = this.criarPrecoForm();

  get titulo(): string {
    return this.servicoId ? 'Editar serviço' : 'Novo serviço';
  }

  get subtitulo(): string {
    return this.servicoId ? 'Atualize os dados do serviço gráfico' : 'Cadastro de serviço gráfico';
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
        this.servicoId = Number.isFinite(id) && id > 0 ? id : undefined;
        if (!this.servicoId) return of(null);
        return this.service.listarServicos().pipe(
          map((items) => (items || []).find((item) => item.id === this.servicoId) || null)
        );
      }),
      finalize(() => this.carregando = false),
    ).subscribe({
      next: (servico) => {
        if (this.servicoId && !servico) {
          this.toastr.error('Serviço não encontrado.');
          this.voltar();
          return;
        }
        if (servico) {
          this.aplicarServico(servico);
        } else {
          this.registrarSnapshot();
        }
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar o serviço.')),
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
    this.service.salvarServico(this.toRequest(), this.servicoId).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Serviço salvo.');
        this.voltar();
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o serviço.')),
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
    this.router.navigate(['/page/grafica/servicos']);
  }

  private aplicarServico(servico: GraficaServico): void {
    this.form.reset({
      nome: servico.nome || '',
      descricao: servico.descricao || '',
    });
    this.precoForm = this.criarPrecoForm(servico.politicas?.[0]);
    this.registrarSnapshot();
  }

  private registrarSnapshot(): void {
    this.snapshot = {
      form: this.form.getRawValue(),
      preco: this.precoForm.getRawValue(),
    };
  }

  private toRequest(): GraficaServicoRequest {
    const raw = this.form.getRawValue();
    const nome = raw.nome.trim();
    return {
      codigo: this.codigo(nome),
      nome,
      descricao: raw.descricao?.trim() || null,
      politicas: [this.toPoliticaRequest(this.precoForm.getRawValue())],
      ativo: true,
    };
  }

  private criarPrecoForm(politica: GraficaPrecoPolitica | any = null): FormGroup {
    if (!politica || !politica.tipo) {
      return this.fb.group({
        tipo: ['FIXO'],
        valor: [null],
      });
    }
    switch (politica.tipo) {
      case 'POR_LOTE':
      case 'QUANTIDADE':
        return this.fb.group({
          tipo: ['QUANTIDADE'],
          faixas: this.fb.array((politica.lotes || politica.faixas || []).map((lote: any) => this.fb.group({
            quantidade: [lote.quantidade ?? null],
            valor: [lote.valorLote ?? lote.valor ?? null],
          }))),
        });
      case 'POR_FAIXA_QUANTIDADE':
      case 'DEMANDA':
        return this.fb.group({
          tipo: ['DEMANDA'],
          faixas: this.fb.array((politica.faixas || []).map((faixa: any) => this.fb.group({
            de: [faixa.inicio ?? faixa.de ?? null],
            ate: [faixa.fim ?? faixa.ate ?? null],
            valor: [faixa.valorUnitario ?? faixa.valor ?? null],
          }))),
        });
      case 'POR_METRO_QUADRADO':
      case 'METRO':
        return this.fb.group({
          tipo: ['METRO'],
          precoMetro: [politica.precoMetroQuadrado ?? politica.precoMetro ?? null],
          precoMinimo: [politica.minimoMetroQuadrado ?? politica.precoMinimo ?? null],
          alturaMaxima: [politica.alturaMaxima ?? null],
          larguraMaxima: [politica.larguraMaxima ?? null],
          modoCobranca: [politica.modoCobranca ?? 'QUADRADO'],
          unidadeDimensao: [politica.unidadeDimensao ?? 'METRO'],
          largurasLinearesPermitidas: [politica.largurasLinearesPermitidas ?? ''],
        });
      case 'FIXO':
      default:
        return this.fb.group({
          tipo: ['FIXO'],
          valor: [politica.valorFixo ?? politica.valor ?? null],
        });
    }
  }

  private toPoliticaRequest(preco: any): GraficaPrecoPoliticaRequest {
    const tipo = preco?.tipo || 'FIXO';
    return {
      nome: 'Preço do serviço',
      tipo: this.toTipoPrecificacao(tipo),
      ativo: true,
      multiplicaQuantidade: tipo === 'FIXO',
      valorFixo: tipo === 'FIXO' ? this.num(preco.valor) : null,
      precoMetroQuadrado: tipo === 'METRO' ? this.num(preco.precoMetro) : null,
      minimoMetroQuadrado: tipo === 'METRO' ? this.numOpcional(preco.precoMinimo) : null,
      alturaMaxima: tipo === 'METRO' ? this.numOpcional(preco.alturaMaxima) : null,
      larguraMaxima: tipo === 'METRO' && preco.modoCobranca !== 'LINEAR' ? this.numOpcional(preco.larguraMaxima) : null,
      largurasLinearesPermitidas: tipo === 'METRO' && preco.modoCobranca === 'LINEAR' ? (preco.largurasLinearesPermitidas || null) : null,
      modoCobranca: tipo === 'METRO' ? (preco.modoCobranca || 'QUADRADO') : null,
      unidadeDimensao: tipo === 'METRO' ? (preco.unidadeDimensao || 'METRO') : null,
      selecaoOpcaoIds: [],
      faixas: tipo === 'DEMANDA'
        ? (preco.faixas || []).map((faixa: any) => ({
          inicio: this.num(faixa.de),
          fim: this.numOpcional(faixa.ate),
          valorUnitario: this.num(faixa.valor),
        }))
        : [],
      lotes: tipo === 'QUANTIDADE'
        ? (preco.faixas || []).map((lote: any) => ({
          quantidade: this.num(lote.quantidade),
          valorLote: this.num(lote.valor),
        }))
        : [],
    };
  }

  private toTipoPrecificacao(tipo: string): any {
    switch (tipo) {
      case 'QUANTIDADE': return 'POR_LOTE';
      case 'DEMANDA': return 'POR_FAIXA_QUANTIDADE';
      case 'METRO': return 'POR_METRO_QUADRADO';
      default: return 'FIXO';
    }
  }

  private num(valor: any): number {
    return Number(valor || 0);
  }

  private numOpcional(valor: any): number | null {
    return valor === null || valor === undefined || valor === '' ? null : Number(valor);
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80);
  }
}
