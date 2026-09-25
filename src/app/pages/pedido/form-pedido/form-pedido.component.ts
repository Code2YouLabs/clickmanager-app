import { finalize } from 'rxjs';
import { Component, signal, OnInit, HostListener } from '@angular/core';
import {
  Validators,
  FormsModule,
  ReactiveFormsModule,
  FormControl,
  FormGroup,
  FormArray,
  FormBuilder
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MaterialModule } from 'src/app/material.module';
import { TablerIconsModule } from 'angular-tabler-icons';
import { PedidoService } from '../pedido.service';
import { SharedComponentsModule } from "../../../components/shared-components.module";
import { map, Observable, take } from 'rxjs';
import { DialogAdicionarProdutoComponent } from '../dialog-adicionar-produto/dialog-adicionar-produto.component';
import { DialogAdicionarProdutoMobileComponent } from '../dialog-adicionar-produto/dialog-adicionar-produto-mobile.component';
import { DialogDescreverItemComponent } from '../dialog-descrever-item/dialog-descrever-item.component';
import { PedidoRequest } from 'src/app/models/pedido/pedido-request.model';
import { PedidoListagem } from 'src/app/models/pedido/pedido-listagem.model';
import { PedidoItemRequest } from 'src/app/models/pedido/pedido-item-request.model';
import { AuthService } from 'src/app/services/auth.service';
import { FormaPagamento } from 'src/app/utils/forma-pagamento.enum';
import { InputOptionsComponent } from "../../../components/inputs/input-options/input-options.component";
import { ToastrService } from 'ngx-toastr';
import { InputDataComponent } from "../../../components/inputs/input-data/input-data.component";
import { SectionCardComponent } from "../../../components/section-card/section-card.component";
import {
  trigger,
  state,
  style,
  transition,
  animate
} from '@angular/animations';
import { ItemTipo } from 'src/app/models/pedido/item-tipo.enum';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardComponent } from "src/app/components/page-card/page-card.component";
import { PagamentosSectionComponent } from "src/app/components/pagamentos-section/pagamentos-section.component";
import { ItensPedidoSectionComponent } from "src/app/components/itens-pedido-section/itens-pedido-section.component";
import { ClienteSelectorCardComponent } from "src/app/components/cliente-selector-card/cliente-selector-card.component";
import { ObservacoesCardComponent } from "src/app/components/observacoes-card/observacoes-card.component";
import { ConfirmDialogComponent } from "src/app/components/dialog/confirm-dialog/confirm-dialog.component";
import { ClienteService } from "../../cliente/cliente.service";
import { MobileTotalBarComponent } from "src/app/components/mobile-total-bar/mobile-total-bar.component";
import { MobileSummarySheetComponent } from "src/app/components/mobile-summary-sheet/mobile-summary-sheet.component";

@Component({
  selector: 'app-form-pedido',
  standalone: true,
  imports: [
    MaterialModule,
    CommonModule,
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    TablerIconsModule,
    SharedComponentsModule,
    InputOptionsComponent,
    InputDataComponent,
    SectionCardComponent,
    PageCardComponent,
    PagamentosSectionComponent,
    ItensPedidoSectionComponent,
    ClienteSelectorCardComponent,
    ObservacoesCardComponent,
    MobileTotalBarComponent,
    MobileSummarySheetComponent
  ],
  templateUrl: './form-pedido.component.html',
  styleUrls: ['./form-pedido.component.scss'],
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate(
          '300ms ease-out',
          style({ height: '*', opacity: 1, overflow: 'hidden' })
        )
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate(
          '300ms ease-in',
          style({ height: 0, opacity: 0, overflow: 'hidden' })
        )
      ])
    ])
  ]
})
export class FormPedidoComponent implements OnInit {
  readonly mobileFlowSteps: Array<{ key: 'cliente' | 'itens' | 'ajustes' | 'pagamento'; label: string }> = [
    { key: 'cliente', label: 'Cliente' },
    { key: 'itens', label: 'Itens' },
    { key: 'ajustes', label: 'Ajustes' },
    { key: 'pagamento', label: 'Pagamento' }
  ];
  readonly isMobileView = signal(false);
  readonly mobileStep = signal<'cliente' | 'itens' | 'ajustes' | 'pagamento' | null>('cliente');
  readonly mobileResumoAberto = signal(false);
  readonly mobileObservacoesAberto = signal(false);

  salvando = false;
  addForm!: FormGroup;
  rows!: FormArray;
  pedidoItens: PedidoItemRequest[] = [];
  clienteConfirmado: any | null = null;
  trocandoCliente = true;
  observacaoSalva = '';
  obsSalvo = false;

  produtoControl = new FormControl();
  pagamentoNovo = this.fb.group({
    forma: ['', Validators.required],
    valor: [0, [Validators.required]]
  });

  readonly formState = new PageFormState(() => this.addForm, {
    read: () => ({ itens: this.pedidoItens, cliente: this.clienteConfirmado, pagamento: this.pagamentoNovo.getRawValue() }),
    write: value => {
      this.pedidoItens = value.itens;
      this.clienteConfirmado = value.cliente;
      this.trocandoCliente = !value.cliente;
      this.pagamentoNovo.reset(value.pagamento);
      this.observacaoSalva = this.addForm.get('observacoes')?.value || '';
      this.obsSalvo = false;
      this.produtoControl.reset();
      this.rows.clear(); this.rows.push(this.createItemFormGroup());
      this.mobileStep.set('cliente');
      this.recalcularTotais();
    },
  });

  subTotal = 0;
  totalAjustado = 0;
  restaPagar = 0;
  grandTotal = 0;

  usuario$ = this.authService.usuario$;
  formasPagamento = Object.values(FormaPagamento);

  constructor(
    private fb: FormBuilder,
    private pedidoService: PedidoService,
    private router: Router,
    private dialog: MatDialog,
    private authService: AuthService,
    private toastr: ToastrService,
    private clienteService: ClienteService
  ) { }

  ngOnInit(): void {
    this.atualizarViewport();
    this.addForm = this.fb.group({
      clienteId: [null, Validators.required],
      acrescimo: [0],
      frete: [0],
      desconto: [0],
      observacoes: [''],
      pagamentos: this.fb.array([]),
      orcamento: [false],
      nomeOrcamento: [''],
      vencimentoOrcamento: [null]
    });

    this.rows = this.fb.array([]);
    this.rows.push(this.createItemFormGroup());
    this.formState.begin('create');

    this.addForm.valueChanges.subscribe(() => this.recalcularTotais());
    this.orcamentoControl.valueChanges.subscribe(() => this.sincronizarEtapaMobile());

    this.observacoesControl.valueChanges.subscribe(() => this.obsSalvo = false);
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  addPagamento(): void {
    const forma = this.pagamentoNovo.get('forma')?.value;
    const valor = Number(this.pagamentoNovo.get('valor')?.value || 0);
    if (!forma || !valor || valor <= 0) {
      this.toastr.warning('Informe forma e valor para adicionar o pagamento.');
      return;
    }

    const pagamentosArray = this.pagamentos;
    if (pagamentosArray.length >= this.formasPagamento.length) {
      this.toastr.warning('Você já adicionou todas as formas de pagamento disponíveis.');
      return;
    }

    pagamentosArray.push(this.fb.group({
      forma: [forma],
      valor: [valor]
    }));

    this.pagamentoNovo.reset({ forma: null, valor: null });
    // limpa estado visual de erro
    Object.values(this.pagamentoNovo.controls).forEach(control => {
      control.markAsPristine();
      control.markAsUntouched();
      control.updateValueAndValidity({ emitEvent: false });
    });
    this.pagamentoNovo.markAsPristine();
    this.pagamentoNovo.markAsUntouched();
    this.pagamentoNovo.updateValueAndValidity({ emitEvent: false });
    this.recalcularTotais();
  }

  removerPagamento(index: number): void {
    this.pagamentos.removeAt(index);
    this.recalcularTotais();
  }

  recalcularTotais(): void {
    // Subtotal: soma dos subtotais dos itens (ou valor×qtd como fallback)
    this.subTotal = this.pedidoItens.reduce((acc, item: any) => {
      const st = Number(item.subTotal ?? (Number(item.valor ?? 0) * Number(item.quantidade ?? 0)));
      return acc + st;
    }, 0);

    const acrescimo = Number(this.addForm.get('acrescimo')?.value || 0);
    const frete = Number(this.addForm.get('frete')?.value || 0);
    const desconto = Number(this.addForm.get('desconto')?.value || 0);

    this.totalAjustado = this.subTotal + acrescimo + frete - desconto;

    const pagamentosArray = this.addForm.get('pagamentos') as FormArray;
    const totalPagamentos = pagamentosArray.controls.reduce((acc, grupo) => {
      const valor = Number(grupo.get('valor')?.value || 0);
      return acc + valor;
    }, 0);

    this.restaPagar = this.totalAjustado - totalPagamentos;
    this.grandTotal = this.totalAjustado;
  }

  createItemFormGroup(): FormGroup {
    return this.fb.group({
      itemName: ['', Validators.required],
      units: ['', Validators.required],
      unitPrice: ['', Validators.required],
      itemTotal: ['0']
    });
  }

  onAddRow(): void {
    this.rows.push(this.createItemFormGroup());
  }

  onRemoveRow(index: number): void {
    this.rows.removeAt(index);
  }

  buscarProdutos = (termo: string): Observable<any[]> =>
    this.pedidoService.buscarProdutosPorNome(termo).pipe(map(res => res.content));

  buscarClientes = (termo: string): Observable<any[]> =>
    this.pedidoService.buscarClientesPorNome(termo).pipe(map(res => res.content));

  mostrarProduto = (produto: any): string =>
    produto ? `${produto.nome}${produto.descricao ? ' - ' + produto.descricao : ''}` : '';

  mostrarCliente = (cliente: any): string =>
    cliente ? `${cliente.nome}${cliente.telefone ? ' - ' + cliente.telefone : ''}` : '';

  alterarQuantidade(index: number, valor: any): void {
    const qtd = Math.max(1, Number(valor) || 1);
    const item = this.pedidoItens[index];
    if (!item) return;
    item.quantidade = qtd;
    item.subTotal = Number(item.valor ?? 0) * qtd;
    this.recalcularTotais();
  }

  onBuscarProdutos(): void {
    const isMobile = globalThis?.matchMedia?.('(max-width: 900px)')?.matches ?? false;
    const dialogRef = isMobile
      ? this.dialog.open(DialogAdicionarProdutoMobileComponent, {
          width: '100vw',
          maxWidth: '100vw',
          height: '100dvh',
          maxHeight: '100dvh',
          panelClass: 'dialog-mobile-fullscreen',
        })
      : this.dialog.open(DialogAdicionarProdutoComponent, {
          panelClass: 'dialog-grande'
        });

    dialogRef.afterClosed().subscribe((result: any[] | null) => {
      if (!Array.isArray(result) || result.length === 0) return;

      const novos: PedidoItemRequest[] = [];

      for (const p of result) {
        // quantidade/medidas/valores seguros vindos do diálogo
        const quantidade = Number(p.quantidade ?? 1) || 1;
        const unitario = Number(p.valor ?? 0) || 0;
        const subTotal = Number(p.subTotal ?? (unitario * quantidade)) || 0;
        const largura = p.largura ?? null;
        const altura = p.altura ?? null;

        // chave do grupo (BASE + FILHOS)
        const grupoKey = (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now() + Math.random());

        const variacaoId: number | undefined =
          p.produtoVariacaoId ?? p.variacaoId ?? undefined;

        if (!variacaoId) {
          this.toastr.error('Selecione a variação (material/formato) do produto antes de adicionar.');
          continue;
        }

        // 1) BASE
        const base: PedidoItemRequest = {
          grupoKey,
          tipo: ItemTipo.BASE,
          descricao: p.nome ?? p.descricao ?? 'Item',
          quantidade,
          valor: unitario,
          subTotal,
          produtoVariacaoId: variacaoId,
          largura,
          altura,
        };
        novos.push(base);

        // 2) FILHOS — SERVIÇOS (cria 1 por id)
        const servicosIds: number[] = p.servicosIds ?? (p.servicoId ? [p.servicoId] : []);
        for (const sid of servicosIds) {
          novos.push({
            grupoKey,
            tipo: ItemTipo.SERVICO,
            servicoId: sid,
            descricao: p.servicos?.find((s: any) => s.id === sid)?.nome ?? `Serviço #${sid}`,
            quantidade: quantidade, // herda do base
            valor: 0,
            subTotal: 0,
            largura,
            altura,
          });
        }

        // 3) FILHOS — ACABAMENTOS (cria 1 por id)
        const acabamentosIds: number[] = p.acabamentosIds ?? (p.acabamentoId ? [p.acabamentoId] : []);
        for (const aid of acabamentosIds) {
          novos.push({
            grupoKey,
            tipo: ItemTipo.ACABAMENTO,
            acabamentoId: aid,
            descricao: p.acabamentos?.find((a: any) => a.id === aid)?.nome ?? `Acabamento #${aid}`,
            quantidade: quantidade,
            valor: 0,
            subTotal: 0,
            largura,
            altura,
          });
        }
      }

      this.pedidoItens = [...this.pedidoItens, ...novos];
      this.recalcularTotais();
      this.avancarEtapaMobile();
    });

  }

  onDescreverItens(): void {
    const dialogRef = this.dialog.open(DialogDescreverItemComponent, {
      width: '500px'
    });

    dialogRef.afterClosed().subscribe((item: any) => {
      if (item?.descricao && item.quantidade && item.valorUnitario != null) {
        const quantidade = Number(item.quantidade) || 1;
        const valor = Number(item.valorUnitario) || 0;

        // chave do grupo (mesmo que não tenha filhos agora, já deixamos preparado)
        const grupoKey = (globalThis as any).crypto?.randomUUID?.() ?? String(Date.now());

        const novoItem: PedidoItemRequest = {
          grupoKey,
          tipo: ItemTipo.MANUAL,
          descricao: item.descricao,
          quantidade,
          valor,
          subTotal: valor * quantidade
        };

        this.pedidoItens = [...this.pedidoItens, novoItem];
        this.recalcularTotais();
        this.avancarEtapaMobile();
      }
    });
  }

  removerItem(index: number): void {
    this.pedidoItens.splice(index, 1);
    this.recalcularTotais();
    this.sincronizarEtapaMobile();
  }

  onCriarCliente(): void {
    this.router.navigate(['/page/cliente/criar'], {
      queryParams: { retorno: '/page/pedido/criar' }
    });
  }

  saveDetail(event?: Event): void {
    event?.preventDefault();
    if (this.salvando) return;

    const form = this.addForm.value;

    if (!form.clienteId || this.pedidoItens.length === 0) {
      this.toastr.warning('Selecione um cliente e adicione pelo menos um item.');
      return;
    }

    this.usuario$.pipe(take(1)).subscribe(usuario => {
      if (!usuario?.id) {
        this.toastr.error('Usuário não identificado!');
        return;
      }

      const isOrcamento: boolean = !!form.orcamento;

      // só considera pagamentos quando NÃO for orçamento
      const pagamentosValidos = !isOrcamento
        ? (form.pagamentos || []).filter((p: any) => p.forma && p.valor && p.valor > 0)
        : [];

      const pedido: PedidoRequest = {
        clienteId: typeof form.clienteId === 'object' ? form.clienteId.id : form.clienteId,
        itens: this.pedidoItens,
        acrescimo: form.acrescimo,
        frete: form.frete,
        desconto: form.desconto,
        observacoes: form.observacoes,
        pagamentos: pagamentosValidos,
        responsavelId: usuario.id,

        orcamento: isOrcamento,
        nomeOrcamento: isOrcamento ? (form.nomeOrcamento || null) : null,
        vencimentoOrcamento: isOrcamento && form.vencimentoOrcamento
          ? this.toIsoDate(form.vencimentoOrcamento)
          : null,
      };

      this.salvando = true;
      this.pedidoService.salvar(pedido).pipe(finalize(() => this.salvando = false)).subscribe({
        next: (resp: PedidoListagem) => {
          this.toastr.success(isOrcamento ? 'Orçamento salvo com sucesso!' : 'Pedido salvo com sucesso!');

          const dialogRef = this.dialog.open(ConfirmDialogComponent, {
            data: {
              title: 'Abrir detalhes',
              message: 'Deseja abrir o detalhe do pedido agora?',
              confirmText: 'Abrir detalhe',
              cancelText: 'Ir para lista',
              confirmColor: 'primary'
            }
          });

          dialogRef.afterClosed().subscribe((abrir: boolean) => {
            if (abrir && resp?.id) {
              this.router.navigate([`/page/pedido/detalhe/${resp.id}`]);
            } else {
              this.router.navigate(['/page/pedido']);
            }
          });
        },
        error: () => {
          this.toastr.error('Erro ao salvar.');
        }
      });
    });
  }

  // helper simples para ISO (ajuste conforme seu InputDataComponent)
  private toIsoDate(d: any): string {
    // se já vier Date:
    if (d instanceof Date) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    }
    // se vier string DD/MM/YYYY:
    if (typeof d === 'string' && d.includes('/')) {
      const [dd, mm, yyyy] = d.split('/');
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
    // fallback (já ISO)
    return d;
  }

  get acrescimoControl(): FormControl {
    return this.addForm.get('acrescimo') as FormControl;
  }

  get freteControl(): FormControl {
    return this.addForm.get('frete') as FormControl;
  }

  get descontoControl(): FormControl {
    return this.addForm.get('desconto') as FormControl;
  }

  get observacoesControl(): FormControl {
    return this.addForm.get('observacoes') as FormControl;
  }

  get pagamentos(): FormArray {
    return this.addForm.get('pagamentos') as FormArray;
  }

  get pagamentosControls(): FormGroup[] {
    return this.pagamentos.controls as FormGroup[];
  }

  get clienteControl(): FormControl {
    return this.addForm.get('clienteId') as FormControl
  }

  confirmarClienteSelecionado(): void {
    const selecionado = this.clienteControl.value;
    if (!selecionado?.id) {
      this.toastr.warning('Selecione um cliente antes de salvar no pedido.');
      return;
    }

    this.clienteService.buscarPorId(selecionado.id).pipe(take(1)).subscribe({
      next: (clienteCompleto) => {
        this.clienteConfirmado = clienteCompleto;
        // mantém o objeto completo para display e submissão
        this.clienteControl.setValue(clienteCompleto, { emitEvent: false });
        this.trocandoCliente = false;
        this.clienteControl.markAsDirty();
        this.clienteControl.updateValueAndValidity({ emitEvent: false });
        this.toastr.success('Cliente selecionado para o pedido.');
        this.avancarEtapaMobile();
      },
      error: () => {
        this.toastr.warning('Não foi possível carregar os dados completos do cliente. Tente novamente.');
      }
    });
  }

  iniciarTrocaCliente(): void {
    this.trocandoCliente = true;
    this.clienteControl.reset(null, { emitEvent: false });
    this.sincronizarEtapaMobile();
  }

  cancelarTrocaCliente(): void {
    this.trocandoCliente = false;
    if (this.clienteConfirmado) {
      this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
    }
  }

  confirmarObservacaoLocal(): void {
    const texto = this.observacoesControl.value ?? '';
    this.observacaoSalva = texto;
    this.obsSalvo = true;
    this.toastr.success('Observação salva.');
  }

  get orcamentoControl(): FormControl {
    return this.addForm.get('orcamento') as FormControl;
  }

  get nomeOrcamentoControl(): FormControl {
    return this.addForm.get('nomeOrcamento') as FormControl;
  }

  get vencimentoOrcamentoControl(): FormControl {
    return this.addForm.get('vencimentoOrcamento') as FormControl;
  }

  getFormaPagamentoControl(pg: FormGroup): FormControl {
    return pg.get('forma') as FormControl;
  }

  getPagamentoValorControl(index: number): FormControl {
    return this.pagamentosControls[index].get('valor') as FormControl;
  }

  get pagamentoNovoValorControl(): FormControl {
    return this.pagamentoNovo.get('valor') as FormControl;
  }

  get totalPago(): number {
    return this.pagamentosControls.reduce((acc, pg) => {
      const valor = Number(pg.get('valor')?.value || 0);
      return acc + valor;
    }, 0);
  }

  get etapasConcluidasMobile(): number {
    if (!this.addForm) return 0;

    let etapas = 0;
    if (this.etapaConcluida('cliente')) etapas += 1;
    if (this.etapaConcluida('itens')) etapas += 1;
    if (this.etapaConcluida('ajustes')) etapas += 1;
    if (this.etapaConcluida('pagamento')) etapas += 1;
    return etapas;
  }

  get clienteSelecionado(): boolean {
    return !!this.clienteConfirmado && !this.trocandoCliente && !!this.addForm.get('clienteId')?.value?.id;
  }

  get podeSalvarPedido(): boolean {
    return !this.addForm.invalid
      && this.pedidoItens.length > 0
      && !!this.addForm.get('clienteId')?.value
      && (!this.orcamentoControl.value || (!!this.nomeOrcamentoControl.value && !!this.vencimentoOrcamentoControl.value));
  }

  get mostrarPagamentoMobile(): boolean {
    return this.pedidoItens.length > 0 && !this.orcamentoControl.value;
  }

  get observacoesPossuemConteudo(): boolean {
    return !!String(this.observacoesControl.value || '').trim();
  }

  progressoMobilePercentual(): number {
    return (this.etapasConcluidasMobile / this.mobileFlowSteps.length) * 100;
  }

  etapaConcluida(step: 'cliente' | 'itens' | 'ajustes' | 'pagamento'): boolean {
    if (!this.addForm) return false;

    if (step === 'cliente') {
      return !!this.clienteConfirmado && !this.trocandoCliente;
    }

    if (step === 'itens') {
      return this.pedidoItens.length > 0;
    }

    if (step === 'ajustes') {
      return this.clienteSelecionado && this.pedidoItens.length > 0 && (this.temAjustesAplicados() || this.mobileStep() === 'pagamento' || this.podeSalvarPedido);
    }

    if (step === 'pagamento') {
      return this.orcamentoControl.value || this.pagamentosControls.length > 0 || this.podeSalvarPedido;
    }

    return false;
  }

  etapaAtiva(step: 'cliente' | 'itens' | 'ajustes' | 'pagamento'): boolean {
    return this.mobileStep() === step;
  }

  etapaPendente(step: 'cliente' | 'itens' | 'ajustes' | 'pagamento'): boolean {
    return !this.etapaConcluida(step) && !this.etapaAtiva(step);
  }

  abrirEtapaMobile(step: 'cliente' | 'itens' | 'ajustes' | 'pagamento'): void {
    if (step === 'pagamento' && !this.mostrarPagamentoMobile) {
      return;
    }

    if (this.mobileStep() === step) {
      this.mobileStep.set(null);
      return;
    }

    this.mobileStep.set(step);
  }

  toggleResumoMobile(): void {
    this.mobileResumoAberto.set(!this.mobileResumoAberto());
  }

  fecharResumoMobile(): void {
    this.mobileResumoAberto.set(false);
  }

  salvarPedidoMobile(): void {
    this.saveDetail();
  }

  toggleObservacoesMobile(): void {
    this.mobileObservacoesAberto.set(!this.mobileObservacoesAberto());
  }

  resumoClienteMobile(): string {
    if (!this.clienteConfirmado) {
      return 'Selecione o cliente';
    }

    const telefone = this.clienteConfirmado.telefone ? ` • ${this.clienteConfirmado.telefone}` : '';
    return `${this.clienteConfirmado.nome || 'Cliente'}${telefone}`;
  }

  resumoItensMobile(): string {
    if (!this.pedidoItens.length) {
      return 'Adicione ao menos um item.';
    }

    const totalItens = this.pedidoItens.length;
    return `${totalItens} ${totalItens === 1 ? 'item adicionado' : 'itens adicionados'}`;
  }

  resumoAjustesMobile(): string {
    if (this.orcamentoControl.value) {
      return 'Orçamento configurado.';
    }

    if (this.temAjustesFinanceiros()) {
      return 'Valores extras já aplicados.';
    }

    return 'Sem ajustes aplicados';
  }

  resumoObservacoesMobile(): string {
    if (!this.observacoesPossuemConteudo) {
      return 'Observações opcionais';
    }

    const texto = String(this.observacoesControl.value || '').trim();
    return texto.length > 64 ? `${texto.slice(0, 64)}...` : texto;
  }

  resumoBarraMobile(): string {
    return this.podeSalvarPedido ? 'Pedido pronto para salvar' : 'Ver resumo';
  }

  statusResumoMobile(): string {
    return this.podeSalvarPedido ? 'Pedido pronto para salvar' : 'O que falta para concluir';
  }

  faltasResumoMobile(): string[] {
    const faltas: string[] = [];

    if (!this.clienteSelecionado) {
      faltas.push('Selecione um cliente para continuar');
    }

    if (!this.pedidoItens.length) {
      faltas.push('Adicione ao menos 1 item');
    }

    if (this.orcamentoControl.value) {
      if (!this.nomeOrcamentoControl.value || !this.vencimentoOrcamentoControl.value) {
        faltas.push('Complete os dados do orçamento');
      }
    }

    return faltas;
  }

  resumoPagamentoMobile(): string {
    if (!this.pagamentosControls.length) {
      return 'Nenhum pagamento informado.';
    }

    return `${this.pagamentosControls.length} ${this.pagamentosControls.length === 1 ? 'pagamento' : 'pagamentos'} adicionado(s)`;
  }

  itensBaseMobile(): PedidoItemRequest[] {
    return this.pedidoItens.filter(item => item.tipo === ItemTipo.BASE || item.tipo === ItemTipo.MANUAL);
  }

  removerItemMobile(index: number): void {
    const itensBase = this.itensBaseMobile();
    const item = itensBase[index];
    if (!item) return;

    if (item.grupoKey) {
      this.pedidoItens = this.pedidoItens.filter(existente => existente.grupoKey !== item.grupoKey);
    } else {
      const idx = this.pedidoItens.indexOf(item);
      if (idx >= 0) {
        this.pedidoItens.splice(idx, 1);
      }
    }

    this.recalcularTotais();
    this.sincronizarEtapaMobile();
  }

  alterarQuantidadeMobile(index: number, quantidade: any): void {
    const itensBase = this.itensBaseMobile();
    const item = itensBase[index];
    if (!item) return;

    const qtd = Math.max(1, Number(quantidade) || 1);
    const grupoKey = item.grupoKey;

    this.pedidoItens = this.pedidoItens.map(existente => {
      if (grupoKey && existente.grupoKey === grupoKey) {
        const valorAtual = Number(existente.valor ?? 0);
        const atual = { ...existente, quantidade: qtd };

        if (existente.tipo === ItemTipo.BASE || existente.tipo === ItemTipo.MANUAL) {
          atual.subTotal = valorAtual * qtd;
        }

        return atual;
      }

      if (!grupoKey && existente === item) {
        const valorAtual = Number(existente.valor ?? 0);
        return { ...existente, quantidade: qtd, subTotal: valorAtual * qtd };
      }

      return existente;
    });

    this.recalcularTotais();
  }

  focarQuantidadeMobile(index: number): void {
    if (typeof document === 'undefined') {
      return;
    }

    const input = document.querySelector<HTMLInputElement>(`[data-item-qty="${index}"]`);
    input?.focus();
    input?.select();
  }

  trackItemPedido(_: number, item: PedidoItemRequest): string {
    return `${item.grupoKey || item.descricao}-${item.tipo}`;
  }

  private atualizarViewport(): void {
    this.isMobileView.set(typeof window !== 'undefined' ? window.innerWidth <= 768 : false);
  }

  private avancarEtapaMobile(): void {
    if (!this.isMobileView()) {
      return;
    }

    if (this.mobileStep() === 'cliente' && this.clienteSelecionado) {
      this.mobileStep.set('itens');
      return;
    }

    if (this.mobileStep() === 'itens' && this.pedidoItens.length) {
      this.mobileStep.set('ajustes');
      return;
    }

    if (this.mobileStep() === 'ajustes' && this.mostrarPagamentoMobile) {
      this.mobileStep.set('pagamento');
    }
  }

  private sincronizarEtapaMobile(): void {
    if (!this.isMobileView()) {
      return;
    }

    if (!this.clienteSelecionado) {
      this.mobileStep.set('cliente');
      return;
    }

    if (!this.pedidoItens.length && this.mobileStep() !== 'cliente') {
      this.mobileStep.set('itens');
      return;
    }

    if (this.mobileStep() === 'pagamento' && !this.mostrarPagamentoMobile) {
      this.mobileStep.set('ajustes');
    }
  }

  private temAjustesAplicados(): boolean {
    return this.temAjustesFinanceiros()
      || !!this.observacoesControl.value;
  }

  private temAjustesFinanceiros(): boolean {
    return Number(this.acrescimoControl.value || 0) > 0
      || Number(this.freteControl.value || 0) > 0
      || Number(this.descontoControl.value || 0) > 0;
  }

}
