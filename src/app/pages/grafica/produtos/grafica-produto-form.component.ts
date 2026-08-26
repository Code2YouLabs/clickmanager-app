import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, of, switchMap } from 'rxjs';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { DepositoImagemGaleriaComponent } from '../../deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component';
import { CatalogoCategoriaOption, CatalogoProdutoImagemRequest } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
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

type TipoPrecoLegado = 'FIXO' | 'QUANTIDADE' | 'DEMANDA' | 'METRO';
type ProdutoFormSnapshot = {
  nome: string;
  descricao: string;
  categoriaId: number | null;
  exibirNoSite: boolean;
  materialId: number | null;
  formatoId: number | null;
  corId: number | null;
  acabamentoIds: number[];
  servicoIds: number[];
};

@Component({
  selector: 'app-grafica-produto-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    PrecoSelectorComponent,
    DepositoImagemGaleriaComponent,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    InputOptionsComponent,
  ],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" [showFooter]="true">
      <div page-header-actions>
        <button mat-stroked-button type="button" (click)="voltar()">
          <mat-icon>arrow_back</mat-icon>
          Voltar
        </button>
      </div>

      <form id="grafica-produto-form" [formGroup]="form" class="produto-form" (ngSubmit)="salvar()">
        <app-section-card title="Dados do produto">
          <div class="form-grid product-grid">
            <app-input-texto-restrito
              [control]="nomeControl"
              label="Nome"
              placeholder="Panfleto 10x15 Couchê 150g 4x4"
              [maxlength]="160"
              requiredError="Informe o nome do produto.">
            </app-input-texto-restrito>
            <div class="product-category">
              <app-input-options
                [control]="categoriaControl"
                label="Categoria"
                placeholder="Categoria"
                [options]="categorias"
                [showNull]="true"
                nullLabel="Sem categoria">
              </app-input-options>
              <mat-checkbox formControlName="exibirNoSite">Exibir este produto no site</mat-checkbox>
            </div>
            <app-input-textarea
              [control]="descricaoControl"
              label="Descrição"
              [rows]="7"
              [maxlength]="500">
            </app-input-textarea>
            <div class="product-images">
              <app-deposito-imagem-galeria
                context="catalogo-produtos"
                uploadEndpoint="api/grafica/produtos/imagens/upload"
                [maxImages]="5"
                [gerenciarPrincipal]="true"
                [imagemPrincipal]="imagemPrincipal"
                [imagens]="galeria"
                (imagemPrincipalChange)="onImagemPrincipalChange($event)"
                (imagensChange)="onGaleriaChange($event)"
                (uploadingChange)="uploading = $event">
              </app-deposito-imagem-galeria>
            </div>
          </div>
        </app-section-card>

        <app-section-card title="Configuração gráfica">
          <div class="form-grid grafica-grid">
            <app-input-options [control]="materialControl" label="Material" [options]="materiais" nullLabel="Sem material"></app-input-options>
            <app-input-options [control]="formatoControl" label="Formato" [options]="formatos" nullLabel="Sem formato"></app-input-options>
            <app-input-options [control]="corControl" label="Cor" [options]="cores" nullLabel="Sem cor"></app-input-options>
            <mat-form-field appearance="outline">
              <mat-label>Acabamentos</mat-label>
              <mat-select multiple formControlName="acabamentoIds">
                <mat-option *ngFor="let item of acabamentos" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Serviços</mat-label>
              <mat-select multiple formControlName="servicoIds">
                <mat-option *ngFor="let item of servicos" [value]="item.id">{{ item.nome }}</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
        </app-section-card>

        <app-section-card title="Precificação">
          <button section-card-actions mat-icon-button type="button" matTooltip="Complete os campos obrigatórios para habilitar o salvamento.">
            <mat-icon>help_outline</mat-icon>
          </button>
          <app-preco-selector
            [formGroup]="precoForm"
            [tiposDisponiveis]="['FIXO', 'QUANTIDADE', 'DEMANDA', 'METRO']">
          </app-preco-selector>
          <div class="validation-hint" *ngIf="precoForm.invalid">Complete os campos obrigatórios da política de preço.</div>
        </app-section-card>
      </form>

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-produto-form" [disabled]="form.invalid || salvando || uploading">
        <mat-icon>save</mat-icon>Salvar
      </button>
    </app-page-card>
  `,
  styles: [`
    .produto-form { display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: center; }
    .product-grid { align-items: start; }
    .product-category {
      display: grid;
      gap: 2px;
    }
    .product-category mat-form-field {
      width: 100%;
    }
    .product-images {
      min-width: 0;
    }
    .grafica-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .full { width: 100%; }
    app-deposito-imagem-galeria { display: block; }
    .validation-hint {
      margin-top: 8px;
      color: #b45309;
      font-size: 0.84rem;
      font-weight: 600;
    }
    :host ::ng-deep .product-images .deposito-galeria {
      gap: 8px;
    }
    :host ::ng-deep .product-images .deposito-galeria__header small {
      display: none;
    }
    :host ::ng-deep .product-images .deposito-galeria__label::after {
      content: 'JPG, PNG ou WEBP. Até 10 MB. Máximo 5 imagens.';
      display: block;
      margin-top: 2px;
      color: #64748b;
      font-size: 0.82rem;
      font-weight: 400;
    }
    :host ::ng-deep .product-images .deposito-galeria__panel {
      gap: 8px;
      padding: 10px;
      border-radius: 12px;
    }
    :host ::ng-deep .product-images .deposito-galeria__trigger {
      min-height: 36px;
      padding: 0 14px;
    }
    :host ::ng-deep .product-images .deposito-galeria__empty {
      min-height: 64px;
      border-radius: 10px;
    }
    :host ::ng-deep .product-images .deposito-galeria__empty mat-icon {
      width: 24px;
      height: 24px;
      font-size: 24px;
    }
    :host ::ng-deep .product-images .deposito-galeria__grid {
      grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
      gap: 8px;
    }
    :host ::ng-deep .product-images .deposito-galeria__card {
      width: 100%;
      gap: 6px;
      padding: 8px;
      border-radius: 12px;
    }
    :host ::ng-deep .product-images .deposito-galeria__preview {
      width: 100%;
      height: auto;
      aspect-ratio: 1 / 1;
      border-radius: 10px;
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
    @media (max-width: 768px) {
      .form-grid,
      .grafica-grid { grid-template-columns: 1fr; }
    }
  `],
})
export class GraficaProdutoFormComponent implements OnInit {
  isEdit = false;
  salvando = false;
  uploading = false;
  graficaProduto?: GraficaProduto;
  categorias: CatalogoCategoriaOption[] = [];
  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];
  cores: GraficaCadastro[] = [];
  acabamentos: GraficaCadastro[] = [];
  servicos: GraficaCadastro[] = [];
  imagemPrincipal: any = null;
  galeria: any[] = [];
  private produtoSnapshot?: ProdutoFormSnapshot;
  private precoSnapshot?: any;
  private imagemPrincipalSnapshot: any = null;
  private galeriaSnapshot: any[] = [];

  form = this.fb.group({
    nome: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control<string>('', { nonNullable: true }),
    categoriaId: this.fb.control<number | null>(null),
    exibirNoSite: this.fb.control<boolean>(false, { nonNullable: true }),
    materialId: this.fb.control<number | null>(null),
    formatoId: this.fb.control<number | null>(null),
    corId: this.fb.control<number | null>(null),
    acabamentoIds: this.fb.control<number[]>([], { nonNullable: true }),
    servicoIds: this.fb.control<number[]>([], { nonNullable: true }),
  });
  precoForm: FormGroup = this.fb.group({ tipo: ['FIXO'] });

  get nomeControl(): FormControl<string> {
    return this.form.controls.nome;
  }

  get descricaoControl(): FormControl<string> {
    return this.form.controls.descricao;
  }

  get categoriaControl(): FormControl<number | null> {
    return this.form.controls.categoriaId;
  }

  get materialControl(): FormControl<number | null> {
    return this.form.controls.materialId;
  }

  get formatoControl(): FormControl<number | null> {
    return this.form.controls.formatoId;
  }

  get corControl(): FormControl<number | null> {
    return this.form.controls.corId;
  }

  get titulo(): string {
    return this.isEdit ? 'Editar Produto' : 'Novo Produto';
  }

  get subtitulo(): string {
    return this.isEdit ? 'Atualize os dados do produto' : 'Cadastro de produto gráfico';
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly graficaService: GraficaProdutoService,
    private readonly categoriaService: CatalogoCategoriaService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.isEdit = !!id;
    this.carregarBase(id || null);
  }

  salvar(): void {
    if (this.form.invalid || this.uploading || !this.validarProduto()) return;
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

  cancelar(): void {
    if (this.produtoSnapshot) {
      this.form.reset(this.clone(this.produtoSnapshot));
    }
    if (this.precoSnapshot) {
      this.precoForm = this.criarPrecoForm(this.clone(this.precoSnapshot));
    }
    this.imagemPrincipal = this.clone(this.imagemPrincipalSnapshot);
    this.galeria = this.clone(this.galeriaSnapshot);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.precoForm.markAsPristine();
    this.precoForm.markAsUntouched();
  }

  private carregarBase(id: number | null): void {
    forkJoin({
      categorias: this.categoriaService.options(true).pipe(catchError(() => of([]))),
      materiais: this.graficaService.listarMateriais().pipe(catchError(() => of([]))),
      formatos: this.graficaService.listarFormatos().pipe(catchError(() => of([]))),
      cores: this.graficaService.listarCores().pipe(catchError(() => of([]))),
      acabamentos: this.graficaService.listarAcabamentos().pipe(catchError(() => of([]))),
      servicos: this.graficaService.listarServicos().pipe(catchError(() => of([]))),
    }).pipe(
      switchMap((base) => {
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
        if (produto) {
          this.aplicarProduto(produto);
          return;
        }
        this.registrarSnapshot();
      },
      error: (error) => this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível carregar o cadastro.')),
    });
  }

  private aplicarProduto(produto: GraficaProduto): void {
    this.graficaProduto = produto;
    this.form.patchValue({
      nome: produto.catalogoProdutoNome || '',
      descricao: produto.catalogoProdutoDescricao || '',
      categoriaId: produto.catalogoCategoriaId || null,
      exibirNoSite: !!produto.catalogoProdutoExibirNoSite,
      materialId: produto.material?.id || null,
      formatoId: produto.formato?.id || null,
      corId: produto.cor?.id || null,
      acabamentoIds: produto.acabamentos?.map((item) => item.id) || [],
      servicoIds: produto.servicos?.map((item) => item.id) || [],
    });
    const imagens = produto.imagens || [];
    this.imagemPrincipal = imagens.find((img) => img.principal && img.ativo !== false)?.arquivo || null;
    this.galeria = imagens.filter((img) => !img.principal && img.ativo !== false).map((img) => img.arquivo).filter(Boolean);
    this.graficaService.listarPrecos(produto.id).subscribe({
      next: (politicas) => {
        this.aplicarPreco((politicas || [])[0]);
        this.registrarSnapshot();
      },
      error: (error) => {
        this.registrarSnapshot();
        this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível carregar preços.'));
      },
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
      catalogoProdutoId: null,
      ativo: true,
      produto: {
        codigo: this.codigo(raw.nome).slice(0, 50),
        nome: raw.nome.trim(),
        descricao: raw.descricao?.trim() || null,
        categoriaId: raw.categoriaId,
        unidadeVenda: 'UNIDADE',
        exibirNoSite: raw.exibirNoSite,
        imagens: this.buildImagensPayload(),
      },
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
    if (!raw.nome.trim()) {
      this.toastr.warning('Informe o nome do produto.');
      return false;
    }
    return true;
  }

  onImagemPrincipalChange(imagem: any): void {
    this.imagemPrincipal = imagem;
    this.form.markAsDirty();
  }

  onGaleriaChange(imagens: any[]): void {
    this.galeria = imagens || [];
    this.form.markAsDirty();
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

  private registrarSnapshot(): void {
    this.produtoSnapshot = this.clone(this.form.getRawValue());
    this.precoSnapshot = this.clone(this.precoForm.getRawValue());
    this.imagemPrincipalSnapshot = this.clone(this.imagemPrincipal);
    this.galeriaSnapshot = this.clone(this.galeria);
  }

  private buildImagensPayload(): CatalogoProdutoImagemRequest[] {
    const principalId = this.imagemPrincipal ? (this.imagemPrincipal.arquivoId ?? this.imagemPrincipal.id) : null;
    const imagens = [
      ...(principalId ? [{ arquivoId: principalId, principal: true, ordem: 0, ativo: true }] : []),
      ...this.galeria
        .map((imagem, index) => ({ arquivoId: imagem.arquivoId ?? imagem.id, principal: false, ordem: index + 1, ativo: true }))
        .filter((imagem) => !!imagem.arquivoId),
    ];
    const seen = new Set<number>();
    return imagens.filter((imagem) => {
      if (seen.has(imagem.arquivoId)) return false;
      seen.add(imagem.arquivoId);
      return true;
    });
  }

  private criarPrecoForm(preco: any): FormGroup {
    const tipo = (preco?.tipo || 'FIXO') as TipoPrecoLegado;
    switch (tipo) {
      case 'FIXO':
        return this.fb.group({
          tipo: ['FIXO'],
          valor: [preco?.valor ?? null],
        });
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
    }
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
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
