import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { SitePaginaCodigo, SitePaginaLayoutHome, SitePaginaResponse, SitePaginaTipo } from '../../models/site-pagina.models';
import { SitePaginaService } from '../../services/site-pagina.service';
import { ListarBlocosComponent } from '../blocos/listar-blocos/listar-blocos.component';

@Component({
  selector: 'app-form-pagina',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    InputTextoRestritoComponent,
    InputTextareaComponent,
    TemPermissaoDirective,
    ListarBlocosComponent,
  ],
  templateUrl: './form-pagina.component.html',
  styleUrl: './form-pagina.component.scss',
})
export class FormPaginaComponent implements OnInit {
  readonly formId = 'site-pagina-form';
  readonly layouts: Array<{ value: SitePaginaLayoutHome; label: string }> = [
    { value: 'GRID', label: 'Grid' },
    { value: 'LISTA', label: 'Lista' },
    { value: 'CARROSSEL', label: 'Carrossel' },
    { value: 'DESTAQUE', label: 'Destaque' },
  ];

  form!: FormGroup;
  formState!: PageFormState;
  isEditMode = false;
  paginaId!: number;
  carregando = false;
  salvando = false;
  erro: string | null = null;
  semPermissao = false;
  paginaAtual: SitePaginaResponse | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly sitePaginaService: SitePaginaService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.form = this.criarFormulario();
    this.formState = new PageFormState(() => this.form, {
      read: () => undefined,
      write: () => this.aplicarEstadosCondicionais(),
    });

    this.exibirNaHomeControl.valueChanges.subscribe((exibir) => this.atualizarCamposHome(!!exibir));
    this.ativaControl.valueChanges.subscribe((ativa) => {
      if (!ativa && this.isHome) {
        this.ativaControl.setValue(true, { emitEvent: false });
        this.toastr.warning('A página HOME deve permanecer ativa.');
      }
    });

    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      this.prepararFormulario(id ? +id : null);
    });
  }

  get tituloControl(): FormControl {
    return this.form.get('titulo') as FormControl;
  }

  get slugControl(): FormControl {
    return this.form.get('slug') as FormControl;
  }

  get resumoControl(): FormControl {
    return this.form.get('resumo') as FormControl;
  }

  get ativaControl(): FormControl {
    return this.form.get('ativa') as FormControl;
  }

  get exibirNoMenuControl(): FormControl {
    return this.form.get('exibirNoMenu') as FormControl;
  }

  get ordemMenuControl(): FormControl {
    return this.form.get('ordemMenu') as FormControl;
  }

  get exibirNaHomeControl(): FormControl {
    return this.form.get('exibirNaHome') as FormControl;
  }

  get ordemHomeControl(): FormControl {
    return this.form.get('ordemHome') as FormControl;
  }

  get tituloHomeControl(): FormControl {
    return this.form.get('tituloHome') as FormControl;
  }

  get subtituloHomeControl(): FormControl {
    return this.form.get('subtituloHome') as FormControl;
  }

  get limiteItensHomeControl(): FormControl {
    return this.form.get('limiteItensHome') as FormControl;
  }

  get layoutHomeControl(): FormControl {
    return this.form.get('layoutHome') as FormControl;
  }

  get textoBotaoHomeControl(): FormControl {
    return this.form.get('textoBotaoHome') as FormControl;
  }

  get seoTituloControl(): FormControl {
    return this.form.get('seoTitulo') as FormControl;
  }

  get seoDescricaoControl(): FormControl {
    return this.form.get('seoDescricao') as FormControl;
  }

  get tituloPagina(): string {
    return this.isEditMode ? 'Editar página' : 'Nova página';
  }

  get savingText(): string {
    return this.isEditMode ? 'Atualizando...' : 'Salvando...';
  }

  get footerActions(): PageCardAction[] {
    if (this.carregando || this.erro || this.semPermissao) {
      return [];
    }

    return [{
      id: 'salvar',
      type: 'submit',
      form: this.formId,
      disabled: this.salvando,
    }];
  }

  get isHome(): boolean {
    return this.paginaAtual?.codigo === 'HOME';
  }

  get isSistema(): boolean {
    return this.paginaAtual?.tipo === 'SISTEMA' || !!this.paginaAtual?.paginaSistema;
  }

  get podeGerenciarBlocos(): boolean {
    return this.isEditMode && !!this.paginaId && !!this.paginaAtual && !this.isSistema;
  }

  get tipoLabel(): string {
    return this.labelTipo(this.paginaAtual?.tipo || 'PERSONALIZADA');
  }

  get codigoLabel(): string {
    return this.labelCodigo(this.paginaAtual?.codigo);
  }

  onSubmit(): void {
    if (this.carregando || this.semPermissao || this.erro || this.form.invalid || this.salvando) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.buildPayload();
    this.salvando = true;

    const request$ = this.isEditMode
      ? this.sitePaginaService.atualizar(this.paginaId, payload)
      : this.sitePaginaService.criar(payload);

    request$.pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Página atualizada com sucesso!' : 'Página criada com sucesso!');
        this.router.navigate(['/page/site/paginas']);
      },
      error: (err) => {
        this.toastr.error(err?.userMessage || (this.isEditMode ? 'Erro ao atualizar a página.' : 'Erro ao criar a página.'));
      },
    });
  }

  tentarNovamente(): void {
    this.prepararFormulario(this.isEditMode ? this.paginaId : null);
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      titulo: ['', Validators.required],
      slug: [''],
      resumo: [''],
      ativa: [true],
      exibirNoMenu: [true],
      ordemMenu: [1],
      exibirNaHome: [false],
      ordemHome: [1],
      tituloHome: [''],
      subtituloHome: [''],
      limiteItensHome: [6],
      layoutHome: ['GRID'],
      textoBotaoHome: [''],
      seoTitulo: [''],
      seoDescricao: [''],
    });
  }

  private prepararFormulario(id: number | null): void {
    this.isEditMode = !!id;
    this.paginaId = id || 0;
    this.paginaAtual = null;
    this.erro = null;
    this.semPermissao = false;
    this.restaurarDefaults();

    if (id) {
      this.formState.begin('edit');
      this.carregarPagina(id);
      return;
    }

    this.carregarProximasOrdens();
  }

  private carregarPagina(id: number): void {
    this.carregando = true;
    this.sitePaginaService.buscarPorId(id).subscribe({
      next: (pagina) => {
        this.carregando = false;
        this.paginaAtual = pagina;
        this.preencherFormulario(pagina);
        this.formState.loaded();
      },
      error: (err) => {
        this.carregando = false;
        this.semPermissao = err?.status === 403;
        this.erro = this.semPermissao ? null : (err?.userMessage || 'Erro ao carregar a página.');
      },
    });
  }

  private carregarProximasOrdens(): void {
    this.carregando = true;
    this.sitePaginaService.listar({ page: 0, size: 200, sort: 'ordemMenu,asc' }).subscribe({
      next: (response) => {
        const paginas = Array.isArray(response) ? response : response.content || [];
        const maiorOrdemMenu = paginas.reduce((maior, pagina) => Math.max(maior, Number(pagina.ordemMenu || 0)), 0);
        const maiorOrdemHome = paginas.reduce((maior, pagina) => Math.max(maior, Number(pagina.ordemHome || 0)), 0);
        this.ordemMenuControl.setValue(maiorOrdemMenu + 1 || 1);
        this.ordemHomeControl.setValue(maiorOrdemHome + 1 || 1);
        this.atualizarCamposHome(false);
        this.formState.begin('create');
        this.carregando = false;
      },
      error: (err) => {
        this.ordemMenuControl.setValue(1);
        this.ordemHomeControl.setValue(1);
        this.atualizarCamposHome(false);
        this.formState.begin('create');
        this.carregando = false;
        if (err?.status === 403) {
          this.semPermissao = true;
        }
      },
    });
  }

  private restaurarDefaults(): void {
    this.form.reset({
      titulo: '',
      slug: '',
      resumo: '',
      ativa: true,
      exibirNoMenu: true,
      ordemMenu: 1,
      exibirNaHome: false,
      ordemHome: 1,
      tituloHome: '',
      subtituloHome: '',
      limiteItensHome: 6,
      layoutHome: 'GRID',
      textoBotaoHome: '',
      seoTitulo: '',
      seoDescricao: '',
    }, { emitEvent: false });
    this.form.enable({ emitEvent: false });
    this.atualizarCamposHome(false);
  }

  private preencherFormulario(pagina: SitePaginaResponse): void {
    this.form.enable({ emitEvent: false });
    this.form.patchValue(
      {
        titulo: pagina.titulo || '',
        slug: pagina.slug || '',
        resumo: pagina.resumo || '',
        ativa: this.isHome ? true : pagina.ativa ?? true,
        exibirNoMenu: pagina.exibirNoMenu ?? true,
        ordemMenu: pagina.ordemMenu ?? 1,
        exibirNaHome: pagina.exibirNaHome ?? false,
        ordemHome: pagina.ordemHome ?? null,
        tituloHome: pagina.tituloHome || '',
        subtituloHome: pagina.subtituloHome || '',
        limiteItensHome: pagina.limiteItensHome ?? 6,
        layoutHome: pagina.layoutHome || 'GRID',
        textoBotaoHome: pagina.textoBotaoHome || '',
        seoTitulo: pagina.seoTitulo || '',
        seoDescricao: pagina.seoDescricao || '',
      },
      { emitEvent: false }
    );

    this.aplicarEstadosCondicionais();
  }

  private aplicarEstadosCondicionais(): void {
    if (this.isHome) {
      this.ativaControl.setValue(true, { emitEvent: false });
      this.ativaControl.disable({ emitEvent: false });
    } else {
      this.ativaControl.enable({ emitEvent: false });
    }

    if (this.isSistema) {
      this.slugControl.disable({ emitEvent: false });
    } else {
      this.slugControl.enable({ emitEvent: false });
    }

    this.atualizarCamposHome(!!this.exibirNaHomeControl.value);
  }

  private atualizarCamposHome(exibirNaHome: boolean): void {
    const controls = [
      this.ordemHomeControl,
      this.tituloHomeControl,
      this.subtituloHomeControl,
      this.limiteItensHomeControl,
      this.layoutHomeControl,
      this.textoBotaoHomeControl,
    ];

    controls.forEach((control) => {
      if (exibirNaHome) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    });
  }

  private buildPayload(): any {
    const raw = this.form.getRawValue();

    return {
      titulo: this.trimOrNull(raw.titulo),
      slug: this.trimOrNull(raw.slug) || this.trimOrNull(this.paginaAtual?.slug),
      resumo: this.trimOrNull(raw.resumo),
      ativa: this.isHome ? true : !!raw.ativa,
      exibirNoMenu: !!raw.exibirNoMenu,
      ordemMenu: this.toNumberOrNull(raw.ordemMenu),
      exibirNaHome: !!raw.exibirNaHome,
      ordemHome: this.toNumberOrNull(raw.ordemHome),
      tituloHome: this.trimOrNull(raw.tituloHome),
      subtituloHome: this.trimOrNull(raw.subtituloHome),
      limiteItensHome: this.toNumberOrNull(raw.limiteItensHome) ?? 6,
      layoutHome: raw.layoutHome || 'GRID',
      textoBotaoHome: this.trimOrNull(raw.textoBotaoHome),
      seoTitulo: this.trimOrNull(raw.seoTitulo),
      seoDescricao: this.trimOrNull(raw.seoDescricao),
    };
  }

  private trimOrNull(value: unknown): string | null {
    const normalized = String(value || '').trim();
    return normalized || null;
  }

  private toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const parsed = Number(value);
    return Number.isNaN(parsed) ? null : parsed;
  }

  private labelTipo(tipo: SitePaginaTipo): string {
    const labels: Record<SitePaginaTipo, string> = {
      SISTEMA: 'Sistema',
      PERSONALIZADA: 'Personalizada',
    };

    return labels[tipo] || tipo;
  }

  private labelCodigo(codigo?: SitePaginaCodigo | null): string {
    if (!codigo) {
      return 'Personalizada';
    }

    const labels: Record<SitePaginaCodigo, string> = {
      HOME: 'Home',
      PRODUTOS: 'Produtos',
      CATEGORIAS: 'Categorias',
      MARCAS: 'Marcas',
      QUEM_SOMOS: 'Quem somos',
      CONTATO: 'Contato',
      ORCAMENTO: 'Orçamento',
    };

    return labels[codigo] || codigo;
  }
}
