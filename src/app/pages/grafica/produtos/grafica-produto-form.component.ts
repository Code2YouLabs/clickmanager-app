import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, forkJoin, map, Observable, of, switchMap } from 'rxjs';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { RichTextEditorComponent } from 'src/app/components/rich-text-editor/rich-text-editor.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DepositoImagemGaleriaComponent } from '../../deposito/components/deposito-imagem-galeria/deposito-imagem-galeria.component';
import { CatalogoCategoria, CatalogoCategoriaOption, CatalogoProdutoImagemRequest } from '../../catalogo/shared/models/catalogo.models';
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
  GraficaProdutoAcabamento,
  GraficaProdutoAcabamentoFormaAplicacao,
  GraficaProdutoRequest,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoAcabamentoDialogComponent, ProdutoAcabamentoUx } from './grafica-produto-acabamento-dialog.component';
import { GraficaCadastroRapidoDialogComponent } from './grafica-cadastro-rapido-dialog.component';

type TipoPrecoLegado = 'FIXO' | 'QUANTIDADE' | 'DEMANDA' | 'METRO';
type ProdutoFormSnapshot = {
  nome: string;
  descricao: string;
  categoriaId: number | null;
  exibirNoSite: boolean;
  materialId: number | null;
  formatoId: number | null;
  corId: number | null;
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
    RichTextEditorComponent,
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
        @if (isClone) {
          <div class="clone-alert" role="status">
            <mat-icon>info</mat-icon>
            <span>Você está criando um novo produto a partir de um produto existente. Para salvar, altere pelo menos um dos seguintes dados: Nome, Material, Formato ou Cor.</span>
          </div>
        }

        <app-section-card title="Dados do produto">
          <div class="form-grid product-grid">
            <div class="product-name">
              <app-input-texto-restrito
                [control]="nomeControl"
                label="Nome"
                placeholder="Panfleto"
                [maxlength]="160"
                requiredError="Informe o nome do produto.">
              </app-input-texto-restrito>
            </div>

            <div class="product-category">
              <app-input-options
                [control]="categoriaControl"
                label="Categoria"
                placeholder="Categoria"
                [options]="categorias"
                [showNull]="true"
                nullLabel="Sem categoria"
                createLabel="Nova categoria"
                [createDisabled]="salvando"
                (createClick)="abrirCadastroRapido('categoria')">
              </app-input-options>
            </div>

            <div class="rich-field product-media-field">
              <mat-label class="f-s-14 f-w-600 m-b-4 d-block">Descrição</mat-label>
              <small class="product-field-subtitle">Use a descrição para detalhes comerciais, instruções e diferenciais do produto.</small>
              <app-rich-text-editor
                formControlName="descricao"
                placeholder="Digite a descrição do produto"
                [minHeight]="180"
                [maxLength]="5000">
              </app-rich-text-editor>
            </div>

            <div class="product-images product-media-field">
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

            <div class="product-publish-option">
              <mat-checkbox formControlName="exibirNoSite">Exibir este produto no site</mat-checkbox>
            </div>
          </div>
        </app-section-card>

        <app-section-card title="Configuração gráfica">
          <div class="form-grid grafica-grid">
            <app-input-options
              [control]="materialControl"
              label="Material"
              [options]="materiais"
              nullLabel="Sem material"
              createLabel="Novo material"
              [createDisabled]="salvando"
              (createClick)="abrirCadastroRapido('material')">
            </app-input-options>
            <app-input-options
              [control]="formatoControl"
              label="Formato"
              [options]="formatos"
              nullLabel="Sem formato"
              createLabel="Novo formato"
              [createDisabled]="salvando"
              (createClick)="abrirCadastroRapido('formato')">
            </app-input-options>
            <app-input-options
              [control]="corControl"
              label="Cor"
              [options]="cores"
              nullLabel="Sem cor"
              createLabel="Nova cor"
              [createDisabled]="salvando"
              (createClick)="abrirCadastroRapido('cor')">
            </app-input-options>
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
        </app-section-card>

        <app-section-card title="Acabamentos" subtitle="Operações opcionais aplicadas ao produto.">
          <button section-card-actions mat-stroked-button color="primary" type="button" (click)="abrirAcabamentoDialog()">
            <mat-icon>add</mat-icon>
            Adicionar acabamento
          </button>

          @if (!acabamentosProduto.length) {
            <div class="acabamentos-empty">
              <div class="acabamentos-empty__icon">
                <mat-icon>construction</mat-icon>
              </div>
              <div>
                <strong>Nenhum acabamento adicionado</strong>
                <p>Adicione operações como corte, laminação ou encadernação para testar a organização visual desta tela.</p>
              </div>
            </div>
          } @else {
            <div class="acabamentos-list">
              @for (item of acabamentosProduto; track item.id) {
                <div class="acabamento-row">
                  <div class="acabamento-row__content">
                    <strong>{{ item.nome }}</strong>
                    @if (item.descricao) {
                      <span class="acabamento-row__desc">{{ item.descricao }}</span>
                    }
                    <span class="acabamento-row__meta">{{ acabamentoResumo(item) }}</span>
                  </div>
                  <div class="acabamento-row__actions">
                    <button mat-icon-button type="button" matTooltip="Editar" [attr.aria-label]="'Editar ' + item.nome" (click)="abrirAcabamentoDialog(item)">
                      <mat-icon>edit</mat-icon>
                    </button>
                    <button mat-icon-button color="warn" type="button" matTooltip="Excluir" [attr.aria-label]="'Excluir ' + item.nome" (click)="confirmarExcluirAcabamento(item)">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              }
            </div>
          }
        </app-section-card>
      </form>

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-produto-form" [disabled]="salvarDesabilitado">
        <mat-icon>save</mat-icon>Salvar
      </button>
    </app-page-card>
  `,
  styles: [`
    .produto-form { display: flex; flex-direction: column; gap: 16px; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: center; }
    .product-grid {
      grid-template-areas:
        "name category"
        "description images"
        "publish .";
      align-items: start;
    }
    .product-name {
      grid-area: name;
      min-width: 0;
    }
    .product-category {
      grid-area: category;
      min-width: 0;
    }
    .product-category mat-form-field {
      width: 100%;
    }
    .product-publish-option {
      grid-area: publish;
      display: flex;
      align-items: center;
      justify-content: flex-start;
      padding-left: 4px;
    }
    .product-media-field {
      align-self: start;
    }
    .product-field-subtitle {
      display: block;
      min-height: 19px;
      margin-bottom: 8px;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.35;
    }
    .product-images {
      grid-area: images;
      min-width: 0;
    }
    .rich-field {
      grid-area: description;
      min-width: 0;
    }
    :host ::ng-deep .rich-field .NgxEditor__Wrapper {
      min-height: 180px;
    }
    .grafica-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .full { width: 100%; }
    .acabamentos-empty {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 12px;
      align-items: center;
      padding: 14px;
      border: 1px dashed #d6e0ee;
      border-radius: 10px;
      background: #f8fafc;
      color: #1f2937;
    }
    .acabamentos-empty__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: #eef4ff;
      color: #2f66e8;
    }
    .acabamentos-empty p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 0.86rem;
      line-height: 1.35;
    }
    .acabamentos-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
      max-height: 320px;
      overflow: auto;
      padding-right: 2px;
    }
    .acabamento-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto;
      gap: 12px;
      align-items: center;
      padding: 12px 14px;
      border: 1px solid #e5edf6;
      border-radius: 10px;
      background: #fff;
    }
    .acabamento-row__content {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }
    .acabamento-row__content strong,
    .acabamento-row__desc,
    .acabamento-row__meta {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .acabamento-row__desc {
      color: #64748b;
      font-size: 0.84rem;
    }
    .acabamento-row__meta {
      color: #2f66e8;
      font-size: 0.84rem;
      font-weight: 600;
    }
    .acabamento-row__actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }
    app-deposito-imagem-galeria { display: block; }
    .validation-hint {
      margin-top: 8px;
      color: #b45309;
      font-size: 0.84rem;
      font-weight: 600;
    }
    .clone-alert {
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: start;
      gap: 10px;
      padding: 12px 14px;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      background: #eff6ff;
      color: #1e3a8a;
      font-size: 0.9rem;
      font-weight: 600;
      line-height: 1.4;
    }
    .clone-alert mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
      color: #2563eb;
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
      min-height: 180px;
      padding: 10px;
      border-radius: 12px;
      overflow: hidden;
    }
    :host ::ng-deep .product-images .deposito-galeria__trigger {
      min-height: 36px;
      padding: 0 14px;
    }
    :host ::ng-deep .product-images .deposito-galeria__empty {
      min-height: 158px;
      border-radius: 10px;
    }
    :host ::ng-deep .product-images .deposito-galeria__empty mat-icon {
      width: 24px;
      height: 24px;
      font-size: 24px;
    }
    :host ::ng-deep .product-images .deposito-galeria__grid {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 8px;
      align-items: start;
    }
    :host ::ng-deep .product-images .deposito-galeria__card {
      width: 100%;
      min-width: 0;
      gap: 4px;
      padding: 6px;
      border-radius: 10px;
    }
    :host ::ng-deep .product-images .deposito-galeria__preview {
      width: 100%;
      height: auto;
      min-width: 0;
      aspect-ratio: 4 / 3;
      border-radius: 8px;
    }
    :host ::ng-deep .product-images .deposito-galeria__actions {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      justify-items: center;
      gap: 2px;
      min-height: 26px;
      width: 100%;
    }
    :host ::ng-deep .product-images .deposito-galeria__actions button {
      width: 26px;
      height: 26px;
    }
    :host ::ng-deep .product-images .deposito-galeria__actions mat-icon {
      width: 17px;
      height: 17px;
      font-size: 17px;
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
      .product-grid {
        grid-template-areas:
          "name"
          "category"
          "description"
          "publish"
          "images";
      }
      :host ::ng-deep .product-images .deposito-galeria__grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .acabamento-row {
        grid-template-columns: 1fr;
      }
      .acabamento-row__actions {
        justify-content: flex-end;
      }
    }
  `],
})
export class GraficaProdutoFormComponent implements OnInit {
  isEdit = false;
  isClone = false;
  salvando = false;
  uploading = false;
  graficaProduto?: GraficaProduto;
  categorias: CatalogoCategoriaOption[] = [];
  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];
  cores: GraficaCadastro[] = [];
  acabamentosProduto: ProdutoAcabamentoUx[] = [];
  imagemPrincipal: any = null;
  galeria: any[] = [];
  private produtoSnapshot?: ProdutoFormSnapshot;
  private precoSnapshot?: any;
  private acabamentosProdutoSnapshot: ProdutoAcabamentoUx[] = [];
  private imagemPrincipalSnapshot: any = null;
  private galeriaSnapshot: any[] = [];
  private cloneIdentidadeSnapshot?: Pick<ProdutoFormSnapshot, 'nome' | 'materialId' | 'formatoId' | 'corId'>;

  form = this.fb.group({
    nome: this.fb.control<string>('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control<string>('', { nonNullable: true }),
    categoriaId: this.fb.control<number | null>(null),
    exibirNoSite: this.fb.control<boolean>(false, { nonNullable: true }),
    materialId: this.fb.control<number | null>(null),
    formatoId: this.fb.control<number | null>(null),
    corId: this.fb.control<number | null>(null),
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
    if (this.isClone) {
      return 'Clonar Produto';
    }
    return this.isEdit ? 'Editar Produto' : 'Novo Produto';
  }

  get subtitulo(): string {
    if (this.isClone) {
      return 'Cadastro de produto gráfico a partir de um produto existente';
    }
    return this.isEdit ? 'Atualize os dados do produto' : 'Cadastro de produto gráfico';
  }

  get cloneSalvarBloqueado(): boolean {
    return this.isClone && !!this.cloneIdentidadeSnapshot && this.identidadeCloneInalterada();
  }

  get salvarDesabilitado(): boolean {
    return this.form.invalid || this.salvando || this.uploading || this.cloneSalvarBloqueado;
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly graficaService: GraficaProdutoService,
    private readonly categoriaService: CatalogoCategoriaService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const cloneFrom = Number(this.route.snapshot.queryParamMap?.get('cloneFrom'));
    this.isEdit = !!id;
    this.isClone = !this.isEdit && !!cloneFrom;
    this.carregarBase(id || (this.isClone ? cloneFrom : null));
  }

  salvar(): void {
    if (this.form.invalid || this.uploading || !this.validarProduto()) return;
    if (this.cloneSalvarBloqueado) {
      this.toastr.warning('Altere Nome, Material, Formato ou Cor para salvar o clone.');
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
    this.acabamentosProduto = this.clone(this.acabamentosProdutoSnapshot);
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.precoForm.markAsPristine();
    this.precoForm.markAsUntouched();
  }

  abrirCadastroRapido(tipo: 'material' | 'formato' | 'cor' | 'categoria'): void {
    this.dialog.open(GraficaCadastroRapidoDialogComponent, {
      width: '720px',
      maxWidth: '92vw',
      data: { tipo, categorias: this.categorias },
      autoFocus: false,
    }).afterClosed().subscribe((item) => {
      if (item) {
        this.recarregarOpcaoCriada(tipo, item);
      }
    });
  }

  abrirAcabamentoDialog(acabamento?: ProdutoAcabamentoUx): void {
    this.dialog.open(GraficaProdutoAcabamentoDialogComponent, {
      width: '760px',
      maxWidth: '94vw',
      data: {
        acabamento: acabamento ? this.clone(acabamento) : null,
        nextId: this.proximoAcabamentoId(),
      },
      autoFocus: false,
    }).afterClosed().subscribe((resultado?: ProdutoAcabamentoUx | null) => {
      if (!resultado) return;
      const existe = this.acabamentosProduto.some((item) => item.id === resultado.id);
      this.acabamentosProduto = existe
        ? this.acabamentosProduto.map((item) => item.id === resultado.id ? resultado : item)
        : [...this.acabamentosProduto, resultado];
      this.form.markAsDirty();
    });
  }

  confirmarExcluirAcabamento(acabamento: ProdutoAcabamentoUx): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Excluir acabamento',
        message: `Excluir "${acabamento.nome}" desta prova visual?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    }).afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.acabamentosProduto = this.acabamentosProduto.filter((item) => item.id !== acabamento.id);
      this.form.markAsDirty();
    });
  }

  acabamentoResumo(item: ProdutoAcabamentoUx): string {
    return `${this.aplicacaoLabel(item.aplicacao)} · ${this.precoResumo(item.preco)}`;
  }

  private carregarBase(id: number | null): void {
    forkJoin({
      categorias: this.categoriaService.options(true).pipe(catchError(() => of([]))),
      materiais: this.graficaService.listarMateriais().pipe(catchError(() => of([]))),
      formatos: this.graficaService.listarFormatos().pipe(catchError(() => of([]))),
      cores: this.graficaService.listarCores().pipe(catchError(() => of([]))),
    }).pipe(
      switchMap((base) => {
        this.categorias = base.categorias || [];
        this.materiais = base.materiais || [];
        this.formatos = base.formatos || [];
        this.cores = base.cores || [];
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

  private recarregarOpcaoCriada(tipo: 'material' | 'formato' | 'cor' | 'categoria', item: GraficaCadastro | GraficaFormato | CatalogoCategoria): void {
    this.listarCadastroRapido(tipo).subscribe({
      next: (itens) => {
        this.aplicarListaCadastro(tipo, itens);
        this.selecionarCadastroCriado(tipo, item.id);
      },
      error: (error: unknown) => {
        this.toastr.error(catalogoErrorMessage(error, 'Registro salvo, mas não foi possível atualizar a lista.'));
        this.aplicarListaCadastro(tipo, this.comItemCriado(tipo, item));
        this.selecionarCadastroCriado(tipo, item.id);
      },
    });
  }

  private listarCadastroRapido(tipo: 'material' | 'formato' | 'cor' | 'categoria'): Observable<Array<GraficaCadastro | GraficaFormato | CatalogoCategoriaOption>> {
    switch (tipo) {
      case 'material': return this.graficaService.listarMateriais();
      case 'formato': return this.graficaService.listarFormatos();
      case 'cor': return this.graficaService.listarCores();
      case 'categoria': return this.categoriaService.options(true);
    }
  }

  private aplicarListaCadastro(tipo: 'material' | 'formato' | 'cor' | 'categoria', itens: Array<GraficaCadastro | GraficaFormato | CatalogoCategoriaOption>): void {
    switch (tipo) {
      case 'material':
        this.materiais = itens as GraficaCadastro[];
        break;
      case 'formato':
        this.formatos = itens as GraficaFormato[];
        break;
      case 'cor':
        this.cores = itens as GraficaCadastro[];
        break;
      case 'categoria':
        this.categorias = itens as CatalogoCategoriaOption[];
        break;
    }
  }

  private selecionarCadastroCriado(tipo: 'material' | 'formato' | 'cor' | 'categoria', id: number): void {
    const control = {
      material: this.form.controls.materialId,
      formato: this.form.controls.formatoId,
      cor: this.form.controls.corId,
      categoria: this.form.controls.categoriaId,
    }[tipo];
    control.setValue(id);
    control.markAsDirty();
    this.form.markAsDirty();
  }

  private comItemCriado(tipo: 'material' | 'formato' | 'cor' | 'categoria', item: GraficaCadastro | GraficaFormato | CatalogoCategoria): Array<GraficaCadastro | GraficaFormato | CatalogoCategoriaOption> {
    const atual = {
      material: this.materiais,
      formato: this.formatos,
      cor: this.cores,
      categoria: this.categorias,
    }[tipo];
    const itemCriado = tipo === 'categoria'
      ? this.toCategoriaOption(item as CatalogoCategoria)
      : item;
    return atual.some((opcao) => opcao.id === itemCriado.id) ? atual : [...atual, itemCriado];
  }

  private toCategoriaOption(item: CatalogoCategoria): CatalogoCategoriaOption {
    return {
      id: item.id,
      codigo: item.codigo,
      nome: item.nome,
      slug: item.slug,
      ativo: item.ativo,
    };
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
    });
    const imagens = produto.imagens || [];
    this.imagemPrincipal = imagens.find((img) => img.principal && img.ativo !== false)?.arquivo || null;
    this.galeria = imagens.filter((img) => !img.principal && img.ativo !== false).map((img) => img.arquivo).filter(Boolean);
    this.acabamentosProduto = this.toAcabamentosProdutoUx(produto.acabamentos || []);
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
          precoMinimo: [politica.minimoMetroQuadrado ?? null],
          alturaMaxima: [politica.alturaMaxima ?? null],
          larguraMaxima: [politica.larguraMaxima ?? null],
          modoCobranca: [politica.modoCobranca ?? 'QUADRADO'],
          unidadeDimensao: [politica.unidadeDimensao ?? 'METRO'],
          largurasLinearesPermitidas: [politica.largurasLinearesPermitidas ?? ''],
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
      acabamentos: this.acabamentosProduto.map((item, index) => ({
        id: item.id > 0 ? item.id : null,
        nome: item.nome,
        descricao: item.descricao || null,
        formaAplicacao: this.toFormaAplicacaoBackend(item.aplicacao),
        ativo: true,
        ordem: index + 1,
        politicas: [this.precoPayloadFromUx(item.preco, item.nome)],
      })),
    };
  }

  private precoPayload(): GraficaPrecoPoliticaRequest {
    const preco = this.precoForm.getRawValue() as any;
    const tipo = preco.tipo as TipoPrecoLegado;
    const metroLinear = tipo === 'METRO' && preco.modoCobranca === 'LINEAR';
    return {
      nome: 'Preço principal',
      tipo: this.toTipoGrafica(tipo),
      ativo: true,
      multiplicaQuantidade: tipo === 'FIXO',
      valorFixo: tipo === 'FIXO' ? this.num(preco.valor) : null,
      precoMetroQuadrado: tipo === 'METRO' ? this.num(preco.precoMetro) : null,
      minimoMetroQuadrado: tipo === 'METRO' && preco.precoMinimo !== null && preco.precoMinimo !== undefined && preco.precoMinimo !== '' ? this.num(preco.precoMinimo) : null,
      alturaMaxima: tipo === 'METRO' && preco.alturaMaxima !== null && preco.alturaMaxima !== undefined && preco.alturaMaxima !== '' ? this.num(preco.alturaMaxima) : null,
      larguraMaxima: tipo === 'METRO' && !metroLinear && preco.larguraMaxima !== null && preco.larguraMaxima !== undefined && preco.larguraMaxima !== '' ? this.num(preco.larguraMaxima) : null,
      largurasLinearesPermitidas: metroLinear && preco.largurasLinearesPermitidas ? String(preco.largurasLinearesPermitidas).trim() : null,
      modoCobranca: tipo === 'METRO' ? (preco.modoCobranca || 'QUADRADO') : null,
      unidadeDimensao: tipo === 'METRO' ? (preco.unidadeDimensao || 'METRO') : null,
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
    this.acabamentosProdutoSnapshot = this.clone(this.acabamentosProduto);
    if (this.isClone) {
      this.cloneIdentidadeSnapshot = this.identidadeCloneAtual();
    }
  }

  private identidadeCloneAtual(): Pick<ProdutoFormSnapshot, 'nome' | 'materialId' | 'formatoId' | 'corId'> {
    const raw = this.form.getRawValue();
    return {
      nome: (raw.nome || '').trim(),
      materialId: raw.materialId ?? null,
      formatoId: raw.formatoId ?? null,
      corId: raw.corId ?? null,
    };
  }

  private identidadeCloneInalterada(): boolean {
    if (!this.cloneIdentidadeSnapshot) {
      return false;
    }
    const atual = this.identidadeCloneAtual();
    return atual.nome === this.cloneIdentidadeSnapshot.nome
      && atual.materialId === this.cloneIdentidadeSnapshot.materialId
      && atual.formatoId === this.cloneIdentidadeSnapshot.formatoId
      && atual.corId === this.cloneIdentidadeSnapshot.corId;
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
    }).slice(0, 5);
  }

  private criarPrecoForm(preco: any): FormGroup {
    const tipo = (preco?.tipo || 'FIXO') as TipoPrecoLegado;
    switch (tipo) {
      case 'FIXO':
        return this.fb.group({
          politicaId: [preco?.politicaId ?? null],
          tipo: ['FIXO'],
          valor: [preco?.valor ?? null],
        });
      case 'QUANTIDADE':
        return this.fb.group({
          politicaId: [preco?.politicaId ?? null],
          tipo: ['QUANTIDADE'],
          faixas: this.fb.array((preco?.faixas?.length ? preco.faixas : [{ quantidade: null, valor: null }]).map((faixa: any) => this.fb.group({
            quantidade: [faixa.quantidade ?? null],
            valor: [faixa.valor ?? null],
          }))),
        });
      case 'DEMANDA':
        return this.fb.group({
          politicaId: [preco?.politicaId ?? null],
          tipo: ['DEMANDA'],
          faixas: this.fb.array((preco?.faixas?.length ? preco.faixas : [{ de: 1, ate: null, valorUnitario: null }]).map((faixa: any) => this.fb.group({
            de: [faixa.de ?? null],
            ate: [faixa.ate ?? null],
            valorUnitario: [faixa.valorUnitario ?? null],
          }))),
        });
      case 'METRO':
        return this.fb.group({
          politicaId: [preco?.politicaId ?? null],
          tipo: ['METRO'],
          precoMetro: [preco?.precoMetro ?? null],
          precoMinimo: [preco?.precoMinimo ?? null],
          alturaMaxima: [preco?.alturaMaxima ?? null],
          larguraMaxima: [preco?.larguraMaxima ?? null],
          modoCobranca: [preco?.modoCobranca ?? 'QUADRADO'],
          unidadeDimensao: [preco?.unidadeDimensao ?? 'METRO'],
          largurasLinearesPermitidas: [preco?.largurasLinearesPermitidas ?? ''],
        });
    }
  }

  private clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }

  private toAcabamentosProdutoUx(itens: GraficaProdutoAcabamento[]): ProdutoAcabamentoUx[] {
    return itens.map((item) => ({
      id: item.id,
      nome: item.nome,
      descricao: item.descricao || null,
      aplicacao: this.toAplicacaoUx(item.formaAplicacao),
      preco: this.precoUxFromPolitica((item.politicas || [])[0]),
    }));
  }

  private toFormaAplicacaoBackend(aplicacao: ProdutoAcabamentoUx['aplicacao']): GraficaProdutoAcabamentoFormaAplicacao {
    switch (aplicacao) {
      case 'FOLHA': return 'POR_FOLHA';
      case 'PECA': return 'POR_PECA';
      case 'SERVICO': return 'POR_SERVICO';
      case 'METRO_QUADRADO': return 'POR_METRO_QUADRADO';
      case 'METRO_LINEAR': return 'POR_METRO_LINEAR';
    }
  }

  private toAplicacaoUx(aplicacao: GraficaProdutoAcabamentoFormaAplicacao): ProdutoAcabamentoUx['aplicacao'] {
    switch (aplicacao) {
      case 'POR_FOLHA': return 'FOLHA';
      case 'POR_PECA': return 'PECA';
      case 'POR_SERVICO': return 'SERVICO';
      case 'POR_METRO_QUADRADO': return 'METRO_QUADRADO';
      case 'POR_METRO_LINEAR': return 'METRO_LINEAR';
    }
  }

  private precoPayloadFromUx(preco: Record<string, any>, nome: string): GraficaPrecoPoliticaRequest {
    const tipo = (preco?.['tipo'] || 'FIXO') as TipoPrecoLegado;
    const metroLinear = tipo === 'METRO' && preco?.['modoCobranca'] === 'LINEAR';
    return {
      id: Number(preco?.['politicaId']) > 0 ? Number(preco?.['politicaId']) : null,
      nome: `Preço ${nome}`,
      tipo: this.toTipoGrafica(tipo),
      ativo: true,
      multiplicaQuantidade: tipo === 'FIXO',
      valorFixo: tipo === 'FIXO' ? this.num(preco?.['valor']) : null,
      precoMetroQuadrado: tipo === 'METRO' ? this.num(preco?.['precoMetro']) : null,
      minimoMetroQuadrado: tipo === 'METRO' && preco?.['precoMinimo'] !== null && preco?.['precoMinimo'] !== undefined && preco?.['precoMinimo'] !== '' ? this.num(preco?.['precoMinimo']) : null,
      alturaMaxima: tipo === 'METRO' && preco?.['alturaMaxima'] !== null && preco?.['alturaMaxima'] !== undefined && preco?.['alturaMaxima'] !== '' ? this.num(preco?.['alturaMaxima']) : null,
      larguraMaxima: tipo === 'METRO' && !metroLinear && preco?.['larguraMaxima'] !== null && preco?.['larguraMaxima'] !== undefined && preco?.['larguraMaxima'] !== '' ? this.num(preco?.['larguraMaxima']) : null,
      largurasLinearesPermitidas: metroLinear && preco?.['largurasLinearesPermitidas'] ? String(preco?.['largurasLinearesPermitidas']).trim() : null,
      modoCobranca: tipo === 'METRO' ? (preco?.['modoCobranca'] || 'QUADRADO') : null,
      unidadeDimensao: tipo === 'METRO' ? (preco?.['unidadeDimensao'] || 'METRO') : null,
      selecaoOpcaoIds: [],
      faixas: tipo === 'DEMANDA' ? this.toFaixasGrafica(preco?.['faixas'] || []) : [],
      lotes: tipo === 'QUANTIDADE' ? this.toLotesGrafica(preco?.['faixas'] || []) : [],
    };
  }

  private precoUxFromPolitica(politica?: GraficaPrecoPolitica): Record<string, any> {
    if (!politica) return { tipo: 'FIXO', valor: null };
    switch (politica.tipo) {
      case 'FIXO':
        return { politicaId: politica.id ?? null, tipo: 'FIXO', valor: politica.valorFixo ?? null };
      case 'POR_LOTE':
        return {
          politicaId: politica.id ?? null,
          tipo: 'QUANTIDADE',
          faixas: (politica.lotes || []).map((lote) => ({ quantidade: lote.quantidade, valor: lote.valorLote })),
        };
      case 'POR_FAIXA_QUANTIDADE':
        return {
          politicaId: politica.id ?? null,
          tipo: 'DEMANDA',
          faixas: (politica.faixas || []).map((faixa) => ({ de: faixa.inicio, ate: faixa.fim ?? null, valorUnitario: faixa.valorUnitario })),
        };
      case 'POR_METRO_QUADRADO':
        return {
          politicaId: politica.id ?? null,
          tipo: 'METRO',
          precoMetro: politica.precoMetroQuadrado ?? null,
          precoMinimo: politica.minimoMetroQuadrado ?? null,
          alturaMaxima: politica.alturaMaxima ?? null,
          larguraMaxima: politica.larguraMaxima ?? null,
          modoCobranca: politica.modoCobranca ?? 'QUADRADO',
          unidadeDimensao: politica.unidadeDimensao ?? 'METRO',
          largurasLinearesPermitidas: politica.largurasLinearesPermitidas ?? '',
        };
    }
  }

  private proximoAcabamentoId(): number {
    const menorMockId = this.acabamentosProduto
      .map((item) => item.id)
      .filter((id) => id < 0)
      .sort((a, b) => a - b)[0];
    return menorMockId ? menorMockId - 1 : -1;
  }

  private aplicacaoLabel(aplicacao: ProdutoAcabamentoUx['aplicacao']): string {
    switch (aplicacao) {
      case 'FOLHA': return 'Por folha';
      case 'PECA': return 'Por peça';
      case 'SERVICO': return 'Por serviço';
      case 'METRO_QUADRADO': return 'Por metro quadrado';
      case 'METRO_LINEAR': return 'Por metro linear';
    }
  }

  private precoResumo(preco: Record<string, any>): string {
    const tipo = (preco?.['tipo'] || 'FIXO') as TipoPrecoLegado;
    switch (tipo) {
      case 'FIXO':
        return `Preço fixo${this.valorResumo(preco?.['valor'])}`;
      case 'QUANTIDADE':
        return this.faixasResumo('Preço por quantidade', preco?.['faixas']);
      case 'DEMANDA':
        return this.faixasResumo('Preço por demanda', preco?.['faixas']);
      case 'METRO':
        return `Preço por metro${this.valorResumo(preco?.['precoMetro'])}`;
    }
  }

  private faixasResumo(label: string, faixas: any[] | undefined): string {
    const total = faixas?.length || 0;
    return total ? `${label} · ${total} faixa${total > 1 ? 's' : ''}` : label;
  }

  private valorResumo(valor: unknown): string {
    const numero = this.num(valor);
    return numero > 0 ? ` · ${numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` : '';
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
      ACABAMENTO_PRODUTO_NAO_ENCONTRADO: 'Acabamento não encontrado neste produto.',
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
