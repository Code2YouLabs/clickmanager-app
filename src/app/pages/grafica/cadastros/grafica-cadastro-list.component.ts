import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { Observable, of } from 'rxjs';
import { catchError, finalize, map } from 'rxjs/operators';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableColumn, DataTablePagination } from 'src/app/components/data-table/data-table.models';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PrecoSelectorComponent } from 'src/app/components/preco/preco-selector.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoria, CatalogoCategoriaRequest } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaCadastro, GraficaCadastroRequest, GraficaFormato, GraficaFormatoRequest } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type CadastroTipo = 'categorias' | 'materiais' | 'formatos' | 'cores' | 'servicos';
type Item = GraficaCadastro | GraficaFormato | CatalogoCategoria;
type UnidadeGrafica = 'METRO' | 'CENTIMETRO' | 'MILIMETRO';

@Component({
  selector: 'app-grafica-cadastro-list',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    InputOptionsComponent,
    PrecoSelectorComponent,
  ],
  template: `
    <app-page-card [titulo]="titulo" [subtitulo]="subtitulo" botaoTexto="Produtos" [botaoRota]="['/page/grafica/produtos']" botaoIcone="arrow_back" [showFooter]="true">
      <div page-header-actions>
        <button mat-flat-button color="primary" type="button" (click)="novo()">
          <mat-icon>add</mat-icon>
          Novo
        </button>
      </div>

      <div class="cadastro-shell">
        <app-section-card [title]="formTitle">
          <form id="grafica-cadastro-form" [formGroup]="form" class="cadastro-form" (ngSubmit)="salvar()">
            <div class="cadastro-grid" [class.cadastro-grid--three]="tipo === 'formatos'">
              <app-input-texto-restrito
                [control]="nomeControl"
                label="Nome"
                placeholder="Nome"
                [maxlength]="140"
                requiredError="Informe o nome.">
              </app-input-texto-restrito>

              @if (tipo === 'categorias') {
                <app-input-options
                  [control]="categoriaPaiControl"
                  label="Categoria pai"
                  placeholder="Categoria pai"
                  [options]="categoriasPai"
                  [showNull]="true"
                  nullLabel="Sem categoria pai">
                </app-input-options>
              }

              @if (tipo === 'formatos') {
                <mat-form-field appearance="outline">
                  <mat-label>Largura</mat-label>
                  <input matInput type="number" min="0.01" formControlName="largura" />
                  <mat-error>Informe a largura.</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Altura</mat-label>
                  <input matInput type="number" min="0.01" formControlName="altura" />
                  <mat-error>Informe a altura.</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Largura útil</mat-label>
                  <input matInput type="number" min="0.01" formControlName="larguraUtil" />
                  <mat-error>Informe a largura útil.</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Altura útil</mat-label>
                  <input matInput type="number" min="0.01" formControlName="alturaUtil" />
                  <mat-error>Informe a altura útil.</mat-error>
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Unidade</mat-label>
                  <mat-select formControlName="unidadeDimensao">
                    <mat-option value="CENTIMETRO">cm</mat-option>
                    <mat-option value="MILIMETRO">mm</mat-option>
                    <mat-option value="METRO">m</mat-option>
                  </mat-select>
                  <mat-error>Informe a unidade.</mat-error>
                </mat-form-field>
              }

              <app-input-textarea
                class="cadastro-grid__wide"
                [control]="descricaoControl"
                [label]="tipo === 'categorias' ? 'Descrição' : 'Descrição'"
                [rows]="3"
                [maxlength]="500">
              </app-input-textarea>

              @if (tipo === 'categorias') {
                <app-input-textarea class="cadastro-grid__wide" [control]="descricaoCurtaControl" label="Descrição curta" [rows]="2" [maxlength]="255"></app-input-textarea>
                <app-input-textarea class="cadastro-grid__wide" [control]="descricaoCompletaControl" label="Descrição completa" [rows]="4" [maxlength]="2000"></app-input-textarea>
              }
            </div>

            @if (tipo === 'servicos') {
              <div class="pricing-block">
                <app-section-card title="Precificação">
                  <app-preco-selector
                    [formGroup]="precoForm"
                    [tiposDisponiveis]="['FIXO']">
                  </app-preco-selector>
                </app-section-card>
              </div>
            }
          </form>
        </app-section-card>

        <app-data-table
          [columns]="columns"
          [data]="itensPaginados"
          [search]="searchConfig"
          [pagination]="pagination"
          [loading]="carregando"
          [emptyState]="emptyState"
          rowKey="id"
          (searchChange)="onSearch($event)"
          (pageChange)="onPageChange($event)">

          <ng-template appDataTableCell="nome" let-row>
            <strong class="item-title">{{ row.nome }}</strong>
          </ng-template>

          <ng-template appDataTableCell="descricao" let-row>
            <span class="description-cell">{{ descricaoLinha(row) }}</span>
          </ng-template>

          <ng-template appDataTableCell="categoriaPai" let-row>
            {{ row.categoriaPaiNome || '-' }}
          </ng-template>

          <ng-template appDataTableCell="dimensao" let-row>
            {{ dimensao(row) }}
          </ng-template>

          <ng-template appDataTableCell="dimensaoUtil" let-row>
            {{ dimensaoUtil(row) }}
          </ng-template>

          <ng-template appDataTableCell="preco" let-row>
            <span class="preco-resumo">{{ precoResumo(row) }}</span>
          </ng-template>

          <ng-template appDataTableCell="acoes" let-row>
            <div class="acoes-cell">
              <button mat-icon-button type="button" matTooltip="Editar" (click)="editar(row)">
                <mat-icon>edit</mat-icon>
              </button>
              <span matTooltip="Clonar - em breve">
                <button mat-icon-button type="button" aria-label="Clonar" disabled>
                  <mat-icon>content_copy</mat-icon>
                </button>
              </span>
              <button mat-icon-button type="button" color="warn" matTooltip="Excluir" (click)="excluir(row)">
                <mat-icon>delete</mat-icon>
              </button>
            </div>
          </ng-template>
        </app-data-table>
      </div>

      <button page-footer-right mat-stroked-button class="cancel-button" type="button" (click)="cancelar()">Cancelar</button>
      <button page-footer-right mat-flat-button color="primary" type="submit" form="grafica-cadastro-form" [disabled]="form.invalid || salvando">
        <mat-icon>save</mat-icon>
        Salvar
      </button>
    </app-page-card>
  `,
  styles: [`
    .cadastro-shell { display: grid; gap: 16px; }
    .cadastro-form { display: grid; gap: 16px; }
    .cadastro-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; }
    .cadastro-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .cadastro-grid__wide { grid-column: 1 / -1; }
    .pricing-block { display: block; }
    .validation-hint { margin-top: 8px; color: #b45309; font-size: 0.84rem; font-weight: 600; }
    .item-title { display: block; color: #111827; line-height: 1.25; }
    .description-cell { display: -webkit-box; max-width: 420px; overflow: hidden; color: #374151; line-height: 1.35; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
    .preco-resumo { color: #111827; font-weight: 700; white-space: nowrap; }
    .acoes-cell { display: inline-flex; align-items: center; justify-content: flex-end; gap: 4px; min-width: 132px; white-space: nowrap; }
    :host ::ng-deep app-preco-selector .price-selector-shell { border: 0; border-radius: 0; background: transparent; padding: 0; }
    :host ::ng-deep app-preco-selector .price-selector-mode { border-top: 0; }
    .cancel-button { border-color: #fecaca; color: #b91c1c; background: #fef2f2; }
    .cancel-button:hover { background: #fee2e2; }
    @media (max-width: 900px) {
      .cadastro-grid,
      .cadastro-grid--three { grid-template-columns: 1fr; }
    }
  `],
})
export class GraficaCadastroListComponent implements OnInit {
  tipo: CadastroTipo = 'materiais';
  itens: Item[] = [];
  pagina = 0;
  tamanho = 10;
  termo = '';
  editandoId?: number;
  salvando = false;
  carregando = false;
  snapshot?: any;
  categoriasPai: CatalogoCategoria[] = [];
  materiais: GraficaCadastro[] = [];
  formatos: GraficaFormato[] = [];

  form = this.fb.group({
    nome: this.fb.control('', { nonNullable: true, validators: [Validators.required] }),
    descricao: this.fb.control('', { nonNullable: true }),
    categoriaPaiId: this.fb.control<number | null>(null),
    descricaoCurta: this.fb.control('', { nonNullable: true }),
    descricaoCompleta: this.fb.control('', { nonNullable: true }),
    largura: this.fb.control<number | null>(null),
    altura: this.fb.control<number | null>(null),
    larguraUtil: this.fb.control<number | null>(null),
    alturaUtil: this.fb.control<number | null>(null),
    unidadeDimensao: this.fb.control<UnidadeGrafica>('CENTIMETRO', { nonNullable: true }),
    materialId: this.fb.control<number | null>(null),
    formatoId: this.fb.control<number | null>(null),
    aplicacao: this.fb.control('PECA', { nonNullable: true }),
  });
  precoForm: FormGroup = this.fb.group({ tipo: ['FIXO'], valor: [null] });

  readonly searchConfig = {
    enabled: true,
    label: 'Buscar',
    placeholder: 'Buscar por nome ou descrição',
    debounceMs: 300,
  };

  readonly emptyState = {
    title: 'Nenhum registro encontrado',
    description: 'Cadastre o primeiro registro.',
    filteredTitle: 'Nenhum registro encontrado',
    filteredDescription: 'Altere a busca.',
  };

  get nomeControl(): FormControl<string> { return this.form.controls.nome; }
  get descricaoControl(): FormControl<string> { return this.form.controls.descricao; }
  get categoriaPaiControl(): FormControl<number | null> { return this.form.controls.categoriaPaiId; }
  get descricaoCurtaControl(): FormControl<string> { return this.form.controls.descricaoCurta; }
  get descricaoCompletaControl(): FormControl<string> { return this.form.controls.descricaoCompleta; }

  get titulo(): string {
    return {
      categorias: 'Categorias gráficas',
      materiais: 'Materiais gráficos',
      formatos: 'Formatos gráficos',
      cores: 'Cores gráficas',
      servicos: 'Serviços gráficos',
    }[this.tipo];
  }

  get subtitulo(): string {
    return 'Cadastros auxiliares usados na configuração de produtos gráficos.';
  }

  get formTitle(): string {
    return this.editandoId ? 'Editar cadastro' : 'Novo cadastro';
  }

  get columns(): DataTableColumn<Item>[] {
    if (this.tipo === 'categorias') {
      return [
        { key: 'nome', label: 'Nome', width: '260px' },
        { key: 'categoriaPai', label: 'Categoria pai', width: '220px' },
        { key: 'descricao', label: 'Descrição curta' },
        { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
      ];
    }
    if (this.tipo === 'formatos') {
      return [
        { key: 'nome', label: 'Nome', width: '220px' },
        { key: 'dimensao', label: 'Dimensão', width: '160px' },
        { key: 'dimensaoUtil', label: 'Área útil', width: '180px' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
      ];
    }
    if (this.tipo === 'servicos') {
      return [
        { key: 'nome', label: 'Nome', width: '260px' },
        { key: 'descricao', label: 'Descrição' },
        { key: 'preco', label: 'Preço', width: '180px' },
        { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
      ];
    }
    return [
      { key: 'nome', label: 'Nome', width: '260px' },
      { key: 'descricao', label: 'Descrição' },
      { key: 'acoes', label: 'Ações', align: 'end', width: '152px' },
    ];
  }

  get pagination(): DataTablePagination {
    return { pageIndex: this.pagina, pageSize: this.tamanho, totalItems: this.itensFiltrados.length, pageSizeOptions: [10, 20, 50] };
  }

  get itensFiltrados(): Item[] {
    const termo = this.termo.trim().toLowerCase();
    if (!termo) return this.itens;
    return this.itens.filter((item) => `${item.nome || ''} ${this.descricaoLinha(item)}`.toLowerCase().includes(termo));
  }

  get itensPaginados(): Item[] {
    const inicio = this.pagina * this.tamanho;
    return this.itensFiltrados.slice(inicio, inicio + this.tamanho);
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly service: GraficaProdutoService,
    private readonly categoriaService: CatalogoCategoriaService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      this.tipo = this.normalizarTipo(params.get('tipo'));
      this.novo();
      this.carregarApoio();
      this.carregar();
    });
  }

  carregar(): void {
    this.carregando = true;
    this.listar().pipe(finalize(() => this.carregando = false)).subscribe({
      next: (itens) => {
        this.itens = itens || [];
        this.pagina = 0;
      },
      error: (error: unknown) => this.toastr.error(this.errorMessage(error, 'Não foi possível carregar os registros.')),
    });
  }

  novo(): void {
    this.editandoId = undefined;
    this.form.reset({
      nome: '',
      descricao: '',
      categoriaPaiId: null,
      descricaoCurta: '',
      descricaoCompleta: '',
      largura: null,
      altura: null,
      larguraUtil: null,
      alturaUtil: null,
      unidadeDimensao: 'CENTIMETRO',
      materialId: null,
      formatoId: null,
      aplicacao: 'PECA',
    });
    this.precoForm = this.fb.group({ tipo: ['FIXO'], valor: [null] });
    this.aplicarValidadores();
    this.registrarSnapshot();
  }

  editar(item: Item): void {
    this.editandoId = item.id;
    this.form.patchValue({
      nome: item.nome || '',
      descricao: this.descricaoLinha(item) === '-' ? '' : this.descricaoLinha(item),
      categoriaPaiId: this.isCategoria(item) ? item.categoriaPaiId || null : null,
      descricaoCurta: this.isCategoria(item) ? item.descricaoCurta || '' : '',
      descricaoCompleta: this.isCategoria(item) ? item.descricaoCompleta || '' : '',
      largura: this.isFormato(item) ? item.largura || null : null,
      altura: this.isFormato(item) ? item.altura || null : null,
      larguraUtil: this.isFormato(item) ? item.larguraUtil || null : null,
      alturaUtil: this.isFormato(item) ? item.alturaUtil || null : null,
      unidadeDimensao: this.isFormato(item) ? item.unidadeDimensao || 'CENTIMETRO' : 'CENTIMETRO',
    });
    this.aplicarValidadores();
    this.registrarSnapshot();
  }

  cancelar(): void {
    if (this.snapshot) {
      this.form.reset(this.snapshot.form);
      this.precoForm = this.fb.group(this.snapshot.preco);
    }
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  salvar(): void {
    if (this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }
    this.salvando = true;
    this.salvarRequest().pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success('Registro salvo.');
        this.novo();
        this.carregar();
      },
      error: (error: unknown) => this.toastr.error(this.errorMessage(error, 'Não foi possível salvar o registro.')),
    });
  }

  excluir(item: Item): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: `Excluir ${this.entidadeSingular}`,
        message: `Deseja realmente excluir "${item.nome}"?`,
        confirmText: 'Excluir',
        confirmColor: 'warn',
      },
    });
    ref.afterClosed().subscribe((confirmado) => {
      if (!confirmado) return;
      this.excluirRequest(item.id).subscribe({
        next: () => {
          this.toastr.success('Registro excluído.');
          this.carregar();
        },
        error: (error: unknown) => this.toastr.error(this.errorMessage(error, 'Não foi possível excluir o registro.')),
      });
    });
  }

  onSearch(value: string): void {
    this.termo = value;
    this.pagina = 0;
  }

  onPageChange(event: { pageIndex: number; pageSize: number }): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
  }

  descricaoLinha(item: Item): string {
    if (this.isCategoria(item)) return item.descricaoCurta || item.descricaoCompleta || '-';
    return item.descricao || '-';
  }

  dimensao(item: Item): string {
    if (!this.isFormato(item)) return '-';
    return `${this.numero(item.largura)} x ${this.numero(item.altura)} ${this.unidade(item.unidadeDimensao)}`;
  }

  dimensaoUtil(item: Item): string {
    if (!this.isFormato(item)) return '-';
    return `${this.numero(item.larguraUtil)} x ${this.numero(item.alturaUtil)} ${this.unidade(item.unidadeDimensao)} útil`;
  }

  precoResumo(_item: Item): string {
    return 'A configurar';
  }

  private carregarApoio(): void {
    if (this.tipo === 'categorias') {
      this.categoriaService.listar({ size: 100, ativo: true }).pipe(catchError(() => of({ content: [] } as any))).subscribe((page) => {
        this.categoriasPai = (page.content || []).filter((categoria: CatalogoCategoria) => categoria.id !== this.editandoId);
      });
    }
  }

  private listar(): Observable<Item[]> {
    if (this.tipo === 'categorias') {
      return this.categoriaService.listar({ size: 100, ativo: true }).pipe(
        map((page) => page.content || [])
      );
    }
    switch (this.tipo) {
      case 'materiais': return this.service.listarMateriais();
      case 'formatos': return this.service.listarFormatos();
      case 'cores': return this.service.listarCores();
      case 'servicos': return this.service.listarServicos();
      default: return of([]);
    }
  }

  private salvarRequest(): Observable<Item> {
    if (this.tipo === 'categorias') {
      const request = this.categoriaRequest();
      return this.editandoId ? this.categoriaService.atualizar(this.editandoId, request) : this.categoriaService.criar(request);
    }
    const request = this.tipo === 'formatos' ? this.formatoRequest() : this.cadastroRequest();
    switch (this.tipo) {
      case 'materiais': return this.service.salvarMaterial(request as GraficaCadastroRequest, this.editandoId);
      case 'formatos': return this.service.salvarFormato(request as GraficaFormatoRequest, this.editandoId);
      case 'cores': return this.service.salvarCor(request as GraficaCadastroRequest, this.editandoId);
      case 'servicos': return this.service.salvarServico(request as GraficaCadastroRequest, this.editandoId);
      default: return of({} as Item);
    }
  }

  private excluirRequest(id: number): Observable<void> {
    switch (this.tipo) {
      case 'categorias': return this.categoriaService.inativar(id);
      case 'materiais': return this.service.excluirMaterial(id);
      case 'formatos': return this.service.excluirFormato(id);
      case 'cores': return this.service.excluirCor(id);
      case 'servicos': return this.service.excluirServico(id);
      default: return of(void 0);
    }
  }

  private cadastroRequest(): GraficaCadastroRequest {
    const raw = this.form.getRawValue();
    return { codigo: this.codigo(raw.nome), nome: raw.nome.trim(), descricao: raw.descricao?.trim() || null, ativo: true };
  }

  private formatoRequest(): GraficaFormatoRequest {
    const raw = this.form.getRawValue();
    return {
      codigo: this.codigo(raw.nome),
      nome: raw.nome.trim(),
      descricao: raw.descricao?.trim() || null,
      largura: raw.largura,
      altura: raw.altura,
      larguraUtil: raw.larguraUtil,
      alturaUtil: raw.alturaUtil,
      unidadeDimensao: raw.unidadeDimensao,
      ativo: true,
    };
  }

  private categoriaRequest(): CatalogoCategoriaRequest {
    const raw = this.form.getRawValue();
    const codigo = this.codigo(raw.nome);
    return {
      codigo,
      nome: raw.nome.trim(),
      slug: catalogoSlugify(raw.nome),
      descricaoCurta: raw.descricaoCurta?.trim() || raw.descricao?.trim() || null,
      descricaoCompleta: raw.descricaoCompleta?.trim() || null,
      categoriaPaiId: raw.categoriaPaiId,
      ordemExibicao: null,
      destaque: false,
      ativo: true,
    };
  }

  private aplicarValidadores(): void {
    const formato = this.tipo === 'formatos';
    ['largura', 'altura', 'larguraUtil', 'alturaUtil'].forEach((key) => {
      const control = this.form.get(key);
      control?.setValidators(formato ? [Validators.required, Validators.min(0.01)] : []);
      control?.updateValueAndValidity({ emitEvent: false });
    });
    this.form.controls.unidadeDimensao.setValidators(formato ? [Validators.required] : []);
    this.form.controls.unidadeDimensao.updateValueAndValidity({ emitEvent: false });
  }

  private registrarSnapshot(): void {
    this.snapshot = {
      form: this.form.getRawValue(),
      preco: this.precoForm.getRawValue(),
    };
  }

  private normalizarTipo(tipo: string | null): CadastroTipo {
    return (['categorias', 'materiais', 'formatos', 'cores', 'servicos'].includes(tipo || '') ? tipo : 'materiais') as CadastroTipo;
  }

  private get entidadeSingular(): string {
    return {
      categorias: 'categoria',
      materiais: 'material',
      formatos: 'formato',
      cores: 'cor',
      servicos: 'serviço',
    }[this.tipo];
  }

  private isFormato(item: Item): item is GraficaFormato {
    return 'largura' in item || 'larguraUtil' in item;
  }

  private isCategoria(item: Item): item is CatalogoCategoria {
    return 'slug' in item || 'categoriaPaiId' in item;
  }

  private numero(valor?: number | null): string {
    if (valor === null || valor === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(Number(valor));
  }

  private unidade(unidade?: UnidadeGrafica | null): string {
    return unidade === 'METRO' ? 'm' : unidade === 'MILIMETRO' ? 'mm' : 'cm';
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80);
  }

  private errorMessage(error: unknown, fallback: string): string {
    const mensagem = catalogoErrorMessage(error, fallback);
    const mensagens: Record<string, string> = {
      MATERIAL_GRAFICO_DUPLICADO: 'Já existe um material com esse nome.',
      FORMATO_GRAFICO_DUPLICADO: 'Já existe um formato com esse nome.',
      COR_GRAFICA_DUPLICADA: 'Já existe uma cor com esse nome.',
      ACABAMENTO_GRAFICO_DUPLICADO: 'Já existe um acabamento com esse nome.',
      SERVICO_GRAFICO_DUPLICADO: 'Já existe um serviço com esse nome.',
      LARGURA_INVALIDA: 'Informe uma largura maior que zero.',
      ALTURA_INVALIDA: 'Informe uma altura maior que zero.',
      LARGURA_UTIL_INVALIDA: 'Informe uma largura útil maior que zero.',
      ALTURA_UTIL_INVALIDA: 'Informe uma altura útil maior que zero.',
      UNIDADE_DIMENSAO_OBRIGATORIA: 'Informe a unidade do formato.',
    };
    return mensagens[mensagem] || mensagem;
  }
}
