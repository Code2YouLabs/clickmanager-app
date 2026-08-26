import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
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
  GraficaTipoPrecificacao,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type OrigemProduto = 'EXISTENTE' | 'NOVO';

@Component({
  selector: 'app-grafica-produto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, PageCardComponent, SectionCardComponent],
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

        <app-section-card titulo="Precificação" subtitulo="Fluxo equivalente ao legado: fixo, quantidade, demanda/lote ou metro quadrado.">
          <div class="form-grid">
            <mat-form-field appearance="outline">
              <mat-label>Tipo</mat-label>
              <mat-select formControlName="tipoPreco">
                <mat-option value="FIXO">Preço fixo</mat-option>
                <mat-option value="POR_FAIXA_QUANTIDADE">Preço por quantidade</mat-option>
                <mat-option value="POR_LOTE">Preço por demanda / lote</mat-option>
                <mat-option value="POR_METRO_QUADRADO">Preço por m²</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Nome da regra</mat-label>
              <input matInput formControlName="nomePreco" />
            </mat-form-field>
          </div>

          <div class="form-grid" *ngIf="form.value.tipoPreco === 'FIXO'">
            <mat-form-field appearance="outline">
              <mat-label>Valor fixo</mat-label>
              <input matInput type="number" formControlName="valorFixo" />
            </mat-form-field>
            <mat-checkbox formControlName="multiplicaQuantidade">Multiplica pela quantidade</mat-checkbox>
          </div>

          <div class="form-grid" *ngIf="form.value.tipoPreco === 'POR_METRO_QUADRADO'">
            <mat-form-field appearance="outline">
              <mat-label>Preço por m²</mat-label>
              <input matInput type="number" formControlName="precoMetroQuadrado" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Mínimo faturável m²</mat-label>
              <input matInput type="number" formControlName="minimoMetroQuadrado" />
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full" *ngIf="form.value.tipoPreco === 'POR_FAIXA_QUANTIDADE'">
            <mat-label>Faixas: De;Até;Valor</mat-label>
            <textarea matInput rows="5" formControlName="faixasTexto" placeholder="1;9;0.25&#10;10;19;0.20&#10;20;;0.18"></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full" *ngIf="form.value.tipoPreco === 'POR_LOTE'">
            <mat-label>Lotes: Quantidade;Preço</mat-label>
            <textarea matInput rows="5" formControlName="lotesTexto" placeholder="500;30.00&#10;1000;55.00&#10;5000;190.00"></textarea>
          </mat-form-field>
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
    tipoPreco: this.fb.control<GraficaTipoPrecificacao>('POR_LOTE', { nonNullable: true }),
    nomePreco: this.fb.control<string>('Preço principal', { nonNullable: true, validators: [Validators.required] }),
    valorFixo: this.fb.control<number | null>(null),
    multiplicaQuantidade: this.fb.control<boolean>(false, { nonNullable: true }),
    precoMetroQuadrado: this.fb.control<number | null>(null),
    minimoMetroQuadrado: this.fb.control<number | null>(null),
    faixasTexto: this.fb.control<string>('', { nonNullable: true }),
    lotesTexto: this.fb.control<string>('', { nonNullable: true }),
  });

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
    this.form.patchValue({
      tipoPreco: politica.tipo,
      nomePreco: politica.nome,
      valorFixo: politica.valorFixo ?? null,
      multiplicaQuantidade: !!politica.multiplicaQuantidade,
      precoMetroQuadrado: politica.precoMetroQuadrado ?? null,
      minimoMetroQuadrado: politica.minimoMetroQuadrado ?? null,
      faixasTexto: (politica.faixas || []).map((faixa) => `${faixa.inicio};${faixa.fim ?? ''};${faixa.valorUnitario}`).join('\n'),
      lotesTexto: (politica.lotes || []).map((lote) => `${lote.quantidade};${lote.valorLote}`).join('\n'),
    });
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
    const raw = this.form.getRawValue();
    return {
      nome: raw.nomePreco || 'Preço principal',
      tipo: raw.tipoPreco,
      ativo: true,
      multiplicaQuantidade: raw.tipoPreco === 'FIXO' ? raw.multiplicaQuantidade : false,
      valorFixo: raw.tipoPreco === 'FIXO' ? raw.valorFixo : null,
      precoMetroQuadrado: raw.tipoPreco === 'POR_METRO_QUADRADO' ? raw.precoMetroQuadrado : null,
      minimoMetroQuadrado: raw.tipoPreco === 'POR_METRO_QUADRADO' ? raw.minimoMetroQuadrado : null,
      selecaoOpcaoIds: [],
      faixas: raw.tipoPreco === 'POR_FAIXA_QUANTIDADE' ? this.parseFaixas(raw.faixasTexto) : [],
      lotes: raw.tipoPreco === 'POR_LOTE' ? this.parseLotes(raw.lotesTexto) : [],
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

  private parseFaixas(texto: string): GraficaPrecoFaixa[] {
    return texto.split(/\n+/).map((linha) => linha.trim()).filter(Boolean).map((linha) => {
      const [inicio, fim, valorUnitario] = linha.split(/[;\t,]+/).map((item) => item.trim());
      return { inicio: Number(inicio), fim: fim ? Number(fim) : null, valorUnitario: Number(valorUnitario) };
    });
  }

  private parseLotes(texto: string): GraficaPrecoLote[] {
    return texto.split(/\n+/).map((linha) => linha.trim()).filter(Boolean).map((linha) => {
      const [quantidade, valorLote] = linha.split(/[;\t,]+/).map((item) => item.trim());
      return { quantidade: Number(quantidade), valorLote: Number(valorLote) };
    });
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80) || 'PRODUTO';
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
