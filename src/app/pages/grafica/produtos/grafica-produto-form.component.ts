import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoriaOption, CatalogoProdutoOption } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService, CatalogoProdutoService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify, CATALOGO_UNIDADES_VENDA } from '../../catalogo/shared/utils/catalogo-utils';
import {
  GraficaCadastro,
  GraficaFormato,
  GraficaPrecoFaixa,
  GraficaPrecoLote,
  GraficaPrecoPolitica,
  GraficaPrecoPoliticaRequest,
  GraficaProduto,
  GraficaProdutoRequest,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type OrigemProduto = 'EXISTENTE' | 'NOVO';
type TipoPrecoLegado = 'FIXO' | 'QUANTIDADE' | 'DEMANDA' | 'METRO';

@Component({
  selector: 'app-grafica-produto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, PageCardComponent, SectionCardComponent, PrecoSelectorComponent],
  template: `
    <app-page-card [titulo]="titulo" subtitulo="Cadastro direto de produto gráfico" botaoTexto="Voltar" [botaoRota]="['/page/grafica/produtos']" botaoIcone="arrow_back">
      <form [formGroup]="form" class="produto-form" (ngSubmit)="salvar()">
        <app-section-card titulo="Dados gerais" subtitulo="Cada produto do Catálogo representa um produto comercial concreto.">
          <mat-button-toggle-group formControlName="origem" *ngIf="!isEdit">
            <mat-button-toggle value="EXISTENTE"><mat-icon>inventory_2</mat-icon>Existente</mat-button-toggle>
            <mat-button-toggle value="NOVO"><mat-icon>add_box</mat-icon>Novo</mat-button-toggle>
          </mat-button-toggle-group>

          <div class="form-grid" *ngIf="!isEdit && form.value.origem === 'EXISTENTE'">
            <mat-form-field appearance="outline">
              <mat-label>Produto do Catálogo</mat-label>
              <mat-select formControlName="catalogoProdutoId">
                <mat-option *ngFor="let item of produtosCatalogo" [value]="item.id">{{ item.codigo }} - {{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-grid" *ngIf="!isEdit && form.value.origem === 'NOVO'">
            <mat-form-field appearance="outline">
              <mat-label>Nome</mat-label>
              <input matInput formControlName="nome" placeholder="Panfleto 10x15 Couchê 150g 4x4" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Categoria</mat-label>
              <mat-select formControlName="categoriaId">
                <mat-option [value]="null">Sem categoria</mat-option>
                <mat-option *ngFor="let item of categorias" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Unidade</mat-label>
              <mat-select formControlName="unidadeVenda">
                <mat-option *ngFor="let item of unidades" [value]="item.value">{{ item.label }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="readonly-product" *ngIf="isEdit && graficaProduto">
            <mat-icon>inventory_2</mat-icon>
            <span>{{ graficaProduto.catalogoProdutoCodigo }} - {{ graficaProduto.catalogoProdutoNome }}</span>
          </div>
        </app-section-card>

        <app-section-card titulo="Dados da Gráfica" subtitulo="Associe cadastros reutilizáveis ao produto. Todos são opcionais.">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Material</mat-label>
              <mat-select formControlName="materialId">
                <mat-option [value]="null">Sem material</mat-option>
                <mat-option *ngFor="let item of materiais" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Formato</mat-label>
              <mat-select formControlName="formatoId">
                <mat-option [value]="null">Sem formato</mat-option>
                <mat-option *ngFor="let item of formatos" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cor</mat-label>
              <mat-select formControlName="corId">
                <mat-option [value]="null">Sem cor</mat-option>
                <mat-option *ngFor="let item of cores" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Acabamentos permitidos</mat-label>
              <mat-select multiple formControlName="acabamentoIds">
                <mat-option *ngFor="let item of acabamentos" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Serviços disponíveis</mat-label>
              <mat-select multiple formControlName="servicoIds">
                <mat-option *ngFor="let item of servicos" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-checkbox formControlName="ativo">Ativo</mat-checkbox>
          </div>
        </app-section-card>

        <app-section-card titulo="Preço base" subtitulo="Aplicar a mesma regra para este produto gráfico.">
          <mat-card class="wizard-price-card">
            <app-preco-selector
              [formGroup]="precoForm"
              [tiposDisponiveis]="['FIXO', 'QUANTIDADE', 'DEMANDA', 'METRO']">
            </app-preco-selector>
          </mat-card>
        </app-section-card>

        <div class="actions">
          <button mat-stroked-button type="button" (click)="voltar()">Cancelar</button>
          <button mat-flat-button color="primary" type="submit" [disabled]="form.invalid || salvando">
            <mat-icon>save</mat-icon>Salvar
          </button>
        </div>
      </form>
    </app-page-card>
  `,
  styles: [`
    .produto-form { display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: center; }
    .full { width: 100%; }
    .actions { display: flex; justify-content: flex-end; gap: 12px; padding: 8px 0; }
    .wizard-price-card { box-shadow: none; border: 1px solid #e5e7eb; border-radius: 18px; padding: 22px; }
    mat-button-toggle-group { width: fit-content; margin-bottom: 16px; }
    mat-button-toggle { min-width: 140px; }
    mat-button-toggle mat-icon { margin-right: 6px; }
    .readonly-product { display: flex; align-items: center; gap: 8px; font-weight: 600; color: #1f2937; }
    @media (max-width: 768px) {
      .form-grid { grid-template-columns: 1fr; }
      .actions { flex-direction: column-reverse; }
      .actions button { width: 100%; }
    }
  `],
})
export class GraficaProdutoFormComponent implements OnInit {
  isEdit = false;
  salvando = false;
  graficaProduto?: GraficaProduto;
  produtosCatalogo: CatalogoProdutoOption[] = [];
  categorias: CatalogoCategoriaOption[] = [];
  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];
  cores: GraficaCadastro[] = [];
  acabamentos: GraficaCadastro[] = [];
  servicos: GraficaCadastro[] = [];
  unidades = CATALOGO_UNIDADES_VENDA;

  form = this.fb.group({
    origem: this.fb.control<OrigemProduto>('NOVO', { nonNullable: true }),
    catalogoProdutoId: this.fb.control<number | null>(null),
    nome: this.fb.control<string>('', { nonNullable: true }),
    categoriaId: this.fb.control<number | null>(null),
    unidadeVenda: this.fb.control<string>('UNIDADE', { nonNullable: true }),
    ativo: this.fb.control<boolean>(true, { nonNullable: true }),
    materialId: this.fb.control<number | null>(null),
    formatoId: this.fb.control<number | null>(null),
    corId: this.fb.control<number | null>(null),
    acabamentoIds: this.fb.control<number[]>([], { nonNullable: true }),
    servicoIds: this.fb.control<number[]>([], { nonNullable: true }),
  });
  precoForm: FormGroup = this.fb.group({ tipo: ['FIXO'] });

  get titulo(): string {
    return this.isEdit ? 'Editar produto gráfico' : 'Novo produto gráfico';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly graficaService: GraficaProdutoService,
    private readonly catalogoProdutoService: CatalogoProdutoService,
    private readonly categoriaService: CatalogoCategoriaService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!id;
    this.carregarBase(id || null);
  }

  salvar(): void {
    if (this.form.invalid || !this.validarProduto()) return;
    this.precoForm.markAllAsTouched();
    this.precoForm.updateValueAndValidity();
    if (this.precoForm.invalid) {
      const msgPreco = (this.precoForm.errors as any)?.precoInvalido?.msg;
      this.toastr.error(msgPreco || 'Defina um preço válido antes de salvar.', 'Preço incompleto');
      return;
    }

    this.salvando = true;
    const produto$ = this.isEdit && this.graficaProduto
      ? this.graficaService.atualizar(this.graficaProduto.id, this.produtoPayload())
      : this.graficaService.habilitar(this.produtoPayload());

    produto$.pipe(
      switchMap((produto) => {
        this.graficaProduto = produto;
        return this.graficaService.salvarPrecos(produto.id, [this.precoPayload()]).pipe(map(() => produto));
      })
    ).subscribe({
      next: () => {
        this.salvando = false;
        this.toastr.success('Produto gráfico salvo.');
        this.voltar();
      },
      error: (error) => {
        this.salvando = false;
        this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível salvar o produto gráfico.'));
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/page/grafica/produtos']);
  }

  private carregarBase(id: number | null): void {
    forkJoin({
      produtos: this.catalogoProdutoService.options(true).pipe(catchError(() => of([]))),
      categorias: this.categoriaService.options(true).pipe(catchError(() => of([]))),
      materiais: this.graficaService.listarMateriais().pipe(catchError(() => of([]))),
      formatos: this.graficaService.listarFormatos().pipe(catchError(() => of([]))),
      cores: this.graficaService.listarCores().pipe(catchError(() => of([]))),
      acabamentos: this.graficaService.listarAcabamentos().pipe(catchError(() => of([]))),
      servicos: this.graficaService.listarServicos().pipe(catchError(() => of([]))),
    }).pipe(
      switchMap((base) => {
        this.produtosCatalogo = base.produtos || [];
        this.categorias = base.categorias || [];
        this.materiais = base.materiais || [];
        this.formatos = base.formatos || [];
        this.cores = base.cores || [];
        this.acabamentos = base.acabamentos || [];
        this.servicos = base.servicos || [];
        return id ? this.graficaService.detalhar(id) : of(null);
      })
    ).subscribe({
      next: (produto) => {
        if (produto) this.aplicarProduto(produto);
      },
      error: (error) => this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível carregar o cadastro.')),
    });
  }

  private aplicarProduto(produto: GraficaProduto): void {
    this.graficaProduto = produto;
    this.form.patchValue({
      ativo: produto.ativo,
      materialId: produto.material?.id || null,
      formatoId: produto.formato?.id || null,
      corId: produto.cor?.id || null,
      acabamentoIds: produto.acabamentos?.map((item) => item.id) || [],
      servicoIds: produto.servicos?.map((item) => item.id) || [],
    });
    this.graficaService.listarPrecos(produto.id).subscribe({
      next: (politicas) => this.aplicarPreco((politicas || [])[0]),
      error: (error) => this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível carregar preços.')),
    });
  }

  private aplicarPreco(politica?: GraficaPrecoPolitica): void {
    if (!politica) return;
    switch (politica.tipo) {
      case 'FIXO':
        this.precoForm = this.fb.group({
          tipo: ['FIXO'],
          valor: [politica.valorFixo ?? null],
        });
        break;
      case 'POR_LOTE':
        this.precoForm = this.fb.group({
          tipo: ['QUANTIDADE'],
          faixas: this.fb.array((politica.lotes?.length ? politica.lotes : [{ quantidade: null, valorLote: null }]).map((lote) => this.fb.group({
            quantidade: [lote.quantidade ?? null],
            valor: [lote.valorLote ?? null],
          }))),
        });
        break;
      case 'POR_FAIXA_QUANTIDADE':
        this.precoForm = this.fb.group({
          tipo: ['DEMANDA'],
          faixas: this.fb.array((politica.faixas?.length ? politica.faixas : [{ inicio: 1, fim: null, valorUnitario: null }]).map((faixa) => this.fb.group({
            de: [faixa.inicio ?? null],
            ate: [faixa.fim ?? null],
            valorUnitario: [faixa.valorUnitario ?? null],
          }))),
        });
        break;
      case 'POR_METRO_QUADRADO':
        this.precoForm = this.fb.group({
          tipo: ['METRO'],
          precoMetro: [politica.precoMetroQuadrado ?? null],
          precoMinimo: [null],
          alturaMaxima: [null],
          larguraMaxima: [null],
          modoCobranca: ['QUADRADO'],
          largurasLinearesPermitidas: [''],
        });
        break;
    }
  }

  private produtoPayload(): GraficaProdutoRequest {
    const raw = this.form.getRawValue();
    return {
      catalogoProdutoId: raw.origem === 'EXISTENTE' ? raw.catalogoProdutoId : null,
      ativo: raw.ativo,
      produto: raw.origem === 'NOVO' && !this.isEdit ? {
        codigo: this.codigo(raw.nome).slice(0, 50),
        nome: raw.nome.trim(),
        categoriaId: raw.categoriaId,
        unidadeVenda: raw.unidadeVenda,
      } : null,
      materialId: raw.materialId,
      formatoId: raw.formatoId,
      corId: raw.corId,
      acabamentoIds: raw.acabamentoIds,
      servicoIds: raw.servicoIds,
    };
  }

  private precoPayload(): GraficaPrecoPoliticaRequest {
    const preco = this.precoForm.getRawValue() as any;
    const tipo = preco.tipo as TipoPrecoLegado;
    return {
      nome: 'Preço principal',
      tipo: this.toTipoGrafica(tipo),
      ativo: true,
      multiplicaQuantidade: tipo === 'FIXO',
      valorFixo: tipo === 'FIXO' ? this.num(preco.valor) : null,
      precoMetroQuadrado: tipo === 'METRO' ? this.num(preco.precoMetro) : null,
      minimoMetroQuadrado: null,
      selecaoOpcaoIds: [],
      faixas: tipo === 'DEMANDA' ? this.toFaixasGrafica(preco.faixas || []) : [],
      lotes: tipo === 'QUANTIDADE' ? this.toLotesGrafica(preco.faixas || []) : [],
    };
  }

  private validarProduto(): boolean {
    const raw = this.form.getRawValue();
    if (!this.isEdit && raw.origem === 'EXISTENTE' && !raw.catalogoProdutoId) {
      this.toastr.warning('Selecione um produto do Catálogo.');
      return false;
    }
    if (!this.isEdit && raw.origem === 'NOVO' && !raw.nome.trim()) {
      this.toastr.warning('Informe o nome do produto.');
      return false;
    }
    return true;
  }

  private toTipoGrafica(tipo: TipoPrecoLegado): GraficaPrecoPoliticaRequest['tipo'] {
    switch (tipo) {
      case 'FIXO': return 'FIXO';
      case 'QUANTIDADE': return 'POR_LOTE';
      case 'DEMANDA': return 'POR_FAIXA_QUANTIDADE';
      case 'METRO': return 'POR_METRO_QUADRADO';
    }
  }

  private toFaixasGrafica(faixas: any[]): GraficaPrecoFaixa[] {
    return faixas.map((faixa) => ({
      inicio: this.num(faixa.de),
      fim: faixa.ate == null || faixa.ate === '' ? null : this.num(faixa.ate),
      valorUnitario: this.num(faixa.valorUnitario),
    }));
  }

  private toLotesGrafica(faixas: any[]): GraficaPrecoLote[] {
    return faixas.map((faixa) => ({
      quantidade: this.num(faixa.quantidade),
      valorLote: this.num(faixa.valor),
    }));
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80) || 'PRODUTO';
  }

  private num(valor: unknown): number {
    if (valor == null || valor === '') return 0;
    if (typeof valor === 'number') return valor;
    const apenasNumero = String(valor).replace(/[^\d,.-]/g, '');
    const normalizado = apenasNumero.includes(',')
      ? apenasNumero.replace(/\./g, '').replace(',', '.')
      : apenasNumero;
    return Number(normalizado);
  }

  private graficaErrorMessage(error: unknown, fallback: string): string {
    const codigo = catalogoErrorMessage(error, fallback);
    const mensagens: Record<string, string> = {
      PRODUTO_GRAFICO_DUPLICADO: 'Este produto já está habilitado na Gráfica.',
      PRODUTO_CATALOGO_OBRIGATORIO: 'Informe o produto do Catálogo.',
      MATERIAL_GRAFICO_NAO_ENCONTRADO: 'Material não encontrado para esta empresa.',
      FORMATO_GRAFICO_NAO_ENCONTRADO: 'Formato não encontrado para esta empresa.',
      COR_GRAFICA_NAO_ENCONTRADA: 'Cor não encontrada para esta empresa.',
      ACABAMENTO_GRAFICO_NAO_ENCONTRADO: 'Acabamento não encontrado para esta empresa.',
      SERVICO_GRAFICO_NAO_ENCONTRADO: 'Serviço não encontrado para esta empresa.',
      FAIXA_PRECO_COM_GAP: 'As faixas de quantidade possuem intervalo sem preço.',
      FAIXA_PRECO_SOBREPOSTA: 'As faixas de quantidade possuem sobreposição.',
      FAIXA_PRECO_INVERTIDA: 'Há uma faixa com final menor que o início.',
      VALOR_FIXO_INVALIDO: 'Informe um preço fixo válido.',
      PRECO_M2_INVALIDO: 'Informe um preço por metro quadrado válido.',
      LOTES_PRECO_OBRIGATORIOS: 'Informe pelo menos um lote de preço.',
      FAIXAS_PRECO_OBRIGATORIAS: 'Informe pelo menos uma faixa de preço.',
    };
    return mensagens[codigo] || codigo;
  }
}
