import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';
import { MatDialog } from '@angular/material/dialog';
import { Router, RouterModule } from '@angular/router';
import { NgxMaskDirective } from 'ngx-mask';
import { ToastrService } from 'ngx-toastr';
import { Observable, of } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap } from 'rxjs/operators';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { InputMoedaComponent } from 'src/app/components/inputs/input-moeda/input-moeda.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ClienteListagem } from 'src/app/models/cliente/cliente-listagem.model';
import { ClienteResponse } from 'src/app/models/cliente/cliente-response.model';
import {
  OrcamentoCriarRequest,
  OrcamentoItemRequest,
  OrcamentoUnidadeVenda,
  TipoItemOrcamento,
} from 'src/app/models/orcamento/orcamento.model';
import { ClienteCreateDialogComponent } from 'src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component';
import { ClienteService } from 'src/app/pages/cliente/cliente.service';
import { CatalogoProduto, CatalogoProdutoListItem } from 'src/app/pages/catalogo/shared/models/catalogo.models';
import { CatalogoProdutoService } from 'src/app/pages/catalogo/shared/services/catalogo.service';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { OrcamentoService } from 'src/app/services/orcamento.service';

type ItemOrcamentoView = OrcamentoItemRequest & {
  produto?: CatalogoProduto | CatalogoProdutoListItem | null;
  imagemUrl?: string | null;
};

@Component({
  selector: 'app-form-orcamento',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MaterialModule,
    NgxMaskDirective,
    CardHeaderComponent,
    SectionCardComponent,
    InputMoedaComponent,
  ],
  templateUrl: './form-orcamento.component.html',
  styleUrl: './form-orcamento.component.scss',
})
export class FormOrcamentoComponent implements OnInit {
  readonly unidades: { value: OrcamentoUnidadeVenda; label: string }[] = [
    { value: 'UNIDADE', label: 'Unidade' },
    { value: 'METRO', label: 'Metro' },
    { value: 'METRO_QUADRADO', label: 'Metro quadrado' },
    { value: 'METRO_CUBICO', label: 'Metro cubico' },
    { value: 'CAIXA', label: 'Caixa' },
    { value: 'PACOTE', label: 'Pacote' },
    { value: 'SACO', label: 'Saco' },
    { value: 'LITRO', label: 'Litro' },
    { value: 'MILILITRO', label: 'Mililitro' },
    { value: 'QUILOGRAMA', label: 'Quilograma' },
    { value: 'GRAMA', label: 'Grama' },
    { value: 'PAR', label: 'Par' },
    { value: 'JOGO', label: 'Jogo' },
    { value: 'ROLO', label: 'Rolo' },
  ];

  readonly colunasItens = ['tipo', 'descricao', 'unidade', 'quantidade', 'valorUnitario', 'desconto', 'subtotal', 'acoes'];
  readonly clienteBusca = new FormControl<string | ClienteListagem>('');
  readonly produtoBusca = new FormControl<string | CatalogoProdutoListItem>('');
  clientes$!: Observable<ClienteListagem[]>;
  produtos$!: Observable<CatalogoProdutoListItem[]>;
  clienteSelecionado: ClienteListagem | ClienteResponse | null = null;
  produtoSelecionado: CatalogoProduto | CatalogoProdutoListItem | null = null;
  itens: ItemOrcamentoView[] = [];
  editandoIndex: number | null = null;
  modoItem: TipoItemOrcamento = 'CATALOGO';
  clientesDisponivel = false;
  carregandoCliente = false;
  carregandoProduto = false;
  salvando = false;

  contatoForm = this.fb.group({
    nomeContato: ['', [Validators.required, Validators.minLength(2)]],
    telefoneContato: ['', [Validators.required, Validators.minLength(10)]],
    emailContato: ['', [Validators.email]],
    observacaoGeral: [''],
  });

  itemForm = this.fb.group({
    descricao: ['', [Validators.required, Validators.minLength(2)]],
    unidade: ['UNIDADE' as OrcamentoUnidadeVenda, [Validators.required]],
    quantidade: [1, [Validators.required, Validators.min(0.0001)]],
    valorUnitario: [0, [Validators.required, Validators.min(0)]],
    desconto: [0, [Validators.min(0)]],
    observacao: [''],
  });

  valorUnitarioControl = this.itemForm.controls.valorUnitario as FormControl<number | null>;
  descontoControl = this.itemForm.controls.desconto as FormControl<number | null>;

  constructor(
    private readonly fb: FormBuilder,
    private readonly clienteService: ClienteService,
    private readonly produtoService: CatalogoProdutoService,
    private readonly orcamentoService: OrcamentoService,
    private readonly authService: AuthService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    if (!this.authService.temPermissao('ORCAMENTOS_CRIAR')) {
      this.toastr.warning('Você não possui permissão para criar orçamentos.');
      this.router.navigate(['/page/orcamentos']);
      return;
    }

    this.featureFlagService.carregar().subscribe((features) => {
      this.clientesDisponivel = features['CLIENTES'] === true;
    });

    this.clientes$ = this.clienteBusca.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((value) => {
        const texto = typeof value === 'string' ? value.trim() : value?.nome || '';
        if (texto.length < 2 || !this.podeConsultarClientes) {
          return of([]);
        }
        this.carregandoCliente = true;
        return this.clienteService.buscarPorNome(texto).pipe(
          catchError(() => {
            this.toastr.error('Não foi possível pesquisar clientes.');
            return of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true });
          }),
          switchMap((pagina) => of(pagina.content || [])),
          finalize(() => (this.carregandoCliente = false)),
        );
      }),
    );

    this.produtos$ = this.produtoBusca.valueChanges.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((value) => {
        const texto = typeof value === 'string' ? value.trim() : value?.nome || '';
        if (texto.length < 2) {
          return of([]);
        }
        this.carregandoProduto = true;
        return this.produtoService.listar({ page: 0, size: 10, texto, ativo: true }).pipe(
          catchError(() => {
            this.toastr.error('Não foi possível pesquisar produtos.');
            return of({ content: [], pageNumber: 0, pageSize: 10, totalElements: 0, totalPages: 0, last: true });
          }),
          switchMap((pagina) => of(pagina.content || [])),
          finalize(() => (this.carregandoProduto = false)),
        );
      }),
    );
  }

  get podeSalvar(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_CRIAR');
  }

  get podeConsultarClientes(): boolean {
    return this.clientesDisponivel && this.authService.temPermissao('CLIENTE_VER');
  }

  get podeCriarCliente(): boolean {
    return this.clientesDisponivel && this.authService.temPermissao('CLIENTE_CADASTRAR');
  }

  displayCliente(cliente?: string | ClienteListagem | ClienteResponse | null): string {
    return typeof cliente === 'string' ? cliente : cliente ? cliente.nome : '';
  }

  displayProduto(produto?: string | CatalogoProdutoListItem | null): string {
    return typeof produto === 'string' ? produto : produto ? `${produto.codigo} - ${produto.nome}` : '';
  }

  selecionarCliente(event: MatAutocompleteSelectedEvent): void {
    const cliente = event.option.value as ClienteListagem;
    this.aplicarCliente(cliente);
  }

  limparCliente(): void {
    this.clienteSelecionado = null;
    this.clienteBusca.setValue('', { emitEvent: false });
  }

  abrirNovoCliente(): void {
    if (!this.podeCriarCliente) {
      return;
    }

    const dialogRef = this.dialog.open(ClienteCreateDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      data: {
        nome: this.contatoForm.controls.nomeContato.value,
        telefone: this.contatoForm.controls.telefoneContato.value,
        email: this.contatoForm.controls.emailContato.value,
      },
    });

    dialogRef.afterClosed().subscribe((cliente) => {
      if (cliente) {
        this.aplicarCliente(cliente);
      }
    });
  }

  selecionarProduto(event: MatAutocompleteSelectedEvent): void {
    const produto = event.option.value as CatalogoProdutoListItem;
    this.produtoSelecionado = produto;
    this.preencherItemPorProduto(produto);
    this.produtoService.detalhar(produto.id).subscribe({
      next: (detalhe) => {
        this.produtoSelecionado = detalhe;
        this.preencherItemPorProduto(detalhe);
      },
    });
  }

  usarCatalogo(): void {
    this.modoItem = 'CATALOGO';
    this.resetItemForm();
  }

  usarLivre(): void {
    this.modoItem = 'LIVRE';
    this.produtoSelecionado = null;
    this.produtoBusca.setValue('', { emitEvent: false });
    this.resetItemForm();
  }

  salvarItem(): void {
    this.itemForm.markAllAsTouched();
    if (this.modoItem === 'CATALOGO' && !this.produtoSelecionado) {
      this.toastr.warning('Selecione um produto do catalogo.');
      return;
    }
    if (this.itemForm.invalid) {
      this.toastr.warning('Revise os dados do item.');
      return;
    }

    const item = this.itemPayload();
    if (this.editandoIndex !== null) {
      this.itens = this.itens.map((atual, index) => index === this.editandoIndex ? item : atual);
    } else {
      this.itens = [...this.itens, item];
    }

    this.resetItemForm();
  }

  editarItem(index: number): void {
    const item = this.itens[index];
    this.editandoIndex = index;
    this.modoItem = item.tipoItem;
    this.produtoSelecionado = item.produto || null;
    this.produtoBusca.setValue(item.produto as CatalogoProdutoListItem, { emitEvent: false });
    this.itemForm.patchValue({
      descricao: item.descricao,
      unidade: item.unidade as OrcamentoUnidadeVenda,
      quantidade: item.quantidade,
      valorUnitario: item.valorUnitario,
      desconto: item.desconto || 0,
      observacao: item.observacao || '',
    });
  }

  removerItem(index: number): void {
    this.itens = this.itens.filter((_, itemIndex) => itemIndex !== index);
    if (this.editandoIndex === index) {
      this.resetItemForm();
    }
  }

  salvarOrcamento(): void {
    this.contatoForm.markAllAsTouched();
    if (!this.podeSalvar || this.salvando) {
      return;
    }
    if (this.contatoForm.invalid) {
      this.toastr.warning('Informe nome e telefone validos para o contato.');
      return;
    }
    if (!this.itens.length) {
      this.toastr.warning('Inclua pelo menos um item no orçamento.');
      return;
    }

    const payload: OrcamentoCriarRequest = {
      nomeContato: this.contatoForm.controls.nomeContato.value?.trim() || '',
      telefoneContato: this.contatoForm.controls.telefoneContato.value?.replace(/\D/g, '') || '',
      emailContato: this.contatoForm.controls.emailContato.value?.trim() || null,
      clienteId: this.clienteSelecionado?.id || null,
      observacaoGeral: this.contatoForm.controls.observacaoGeral.value?.trim() || null,
      origem: 'BALCAO',
      itens: this.itens.map(({ produto, imagemUrl, ...item }) => item),
    };

    this.salvando = true;
    this.orcamentoService.criar(payload).pipe(
      finalize(() => (this.salvando = false)),
    ).subscribe({
      next: (orcamento) => {
        this.toastr.success('Orçamento criado com sucesso.');
        this.router.navigate(['/page/orcamentos', orcamento.id]);
      },
      error: () => this.toastr.error('Não foi possível criar o orçamento.'),
    });
  }

  subtotal(item: Pick<OrcamentoItemRequest, 'quantidade' | 'valorUnitario' | 'desconto'>): number {
    const bruto = Number(item.quantidade || 0) * Number(item.valorUnitario || 0);
    return Math.max(0, bruto - Number(item.desconto || 0));
  }

  totalPreview(): number {
    return this.itens.reduce((total, item) => total + this.subtotal(item), 0);
  }

  unidadeLabel(unidade: string | null | undefined): string {
    return this.unidades.find((item) => item.value === unidade)?.label || unidade || '-';
  }

  tipoLabel(tipo: TipoItemOrcamento | string | null | undefined): string {
    return tipo === 'LIVRE' ? 'Item livre' : 'Catalogo';
  }

  produtoMarca(): string {
    const produto = this.produtoSelecionado as CatalogoProduto | CatalogoProdutoListItem | null;
    if (!produto) {
      return 'Sem marca';
    }
    return this.isProdutoDetalhe(produto) ? produto.marca?.nome || 'Sem marca' : produto.marcaNome || 'Sem marca';
  }

  produtoImagemUrl(): string | null {
    const produto = this.produtoSelecionado as CatalogoProduto | null;
    const principal = produto?.imagens?.find((imagem) => imagem.principal) || produto?.imagens?.[0];
    return principal?.arquivo?.displayUrl || principal?.arquivo?.imagemUrl || principal?.arquivo?.thumbnailUrl || principal?.arquivo?.url || null;
  }

  private preencherItemPorProduto(produto: CatalogoProduto | CatalogoProdutoListItem): void {
    const preco = 'comercial' in produto
      ? produto.comercial?.precoPromocional ?? produto.comercial?.precoVenda ?? 0
      : this.precoProdutoListagem(produto);
    this.itemForm.patchValue({
      descricao: produto.nome,
      unidade: (produto.unidadeVenda || 'UNIDADE') as OrcamentoUnidadeVenda,
      valorUnitario: Number(preco || 0),
    });
  }

  private aplicarCliente(cliente: ClienteListagem | ClienteResponse): void {
    this.clienteSelecionado = cliente;
    this.clienteBusca.setValue(cliente, { emitEvent: false });
    this.contatoForm.patchValue({
      nomeContato: cliente.nome || '',
      telefoneContato: cliente.telefone || '',
      emailContato: cliente.email || '',
    });
  }

  private itemPayload(): ItemOrcamentoView {
    const value = this.itemForm.getRawValue();
    return {
      tipoItem: this.modoItem,
      produtoId: this.modoItem === 'CATALOGO' ? this.produtoSelecionado?.id || null : null,
      descricao: String(value.descricao || '').trim(),
      unidade: value.unidade || 'UNIDADE',
      quantidade: Number(value.quantidade || 0),
      valorUnitario: Number(value.valorUnitario || 0),
      desconto: Number(value.desconto || 0),
      observacao: value.observacao?.trim() || null,
      produto: this.modoItem === 'CATALOGO' ? this.produtoSelecionado : null,
      imagemUrl: this.modoItem === 'CATALOGO' ? this.produtoImagemUrl() : null,
    };
  }

  private resetItemForm(): void {
    this.editandoIndex = null;
    this.itemForm.reset({
      descricao: '',
      unidade: 'UNIDADE',
      quantidade: 1,
      valorUnitario: 0,
      desconto: 0,
      observacao: '',
    });
    if (this.modoItem === 'CATALOGO') {
      this.produtoSelecionado = null;
      this.produtoBusca.setValue('', { emitEvent: false });
    }
  }

  private isProdutoDetalhe(produto: CatalogoProduto | CatalogoProdutoListItem): produto is CatalogoProduto {
    return 'comercial' in produto || 'imagens' in produto;
  }

  private precoProdutoListagem(produto: CatalogoProduto | CatalogoProdutoListItem): number {
    if (this.isProdutoDetalhe(produto)) {
      return produto.comercial?.precoPromocional ?? produto.comercial?.precoVenda ?? 0;
    }

    return produto.precoPromocional ?? produto.precoVenda ?? 0;
  }
}
