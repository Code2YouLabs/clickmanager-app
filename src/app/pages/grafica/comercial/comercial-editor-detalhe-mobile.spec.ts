import { BreakpointObserver } from '@angular/cdk/layout';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PedidoFluxoControlesComponent } from 'src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component';
import { ClienteSelectorCardComponent } from 'src/app/components/cliente-selector-card/cliente-selector-card.component';
import { ItensPedidoSectionComponent } from 'src/app/components/itens-pedido-section/itens-pedido-section.component';
import { AuthService } from 'src/app/services/auth.service';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { TutorialStep } from 'src/app/shared/tutorial/tutorial.model';
import { ClienteService } from '../../cliente/cliente.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ComercialEditorComponent } from './comercial-editor.component';
import { PrimeiroPedidoTutorialService } from './primeiro-pedido/primeiro-pedido-tutorial.service';

describe('Detalhes do Pedido mobile: organização e movimentação', () => {
  let fixture: ComponentFixture<ComercialEditorComponent>;
  let editor: ComercialEditorComponent;
  let service: any;
  let viewport: BehaviorSubject<any>;
  let params: BehaviorSubject<any>;
  const step = signal<TutorialStep | null>(null);
  const client = { id: 7, nome: 'Pedro de Lara', telefone: '31987531233', documento: '12345678901', endereco: { cidade: 'Belo Horizonte', estado: 'MG' } };
  const item = { nomeProduto: 'Panfleto', quantidade: 2, valorUnitario: 25, valorTotal: 50, catalogoProdutoId: 1, origem: 'GRAFICA', snapshotComercial: JSON.stringify({ produtoGraficoId: 1, entrada: { quantidade: 2 } }) };
  const order = (id = 32, status = 'AGUARDANDO_PAGAMENTO') => ({ id, status, itens: [{ ...item }], clienteId: 7, clienteNome: client.nome, clienteTelefone: client.telefone,
    observacaoCliente: 'Entregar à tarde', observacaoInterna: 'Conferir arte', responsavelNome: 'Ana Atendimento' });
  const flow = (statusAtual = 'AGUARDANDO_PAGAMENTO') => ({ statusAtual, label: statusAtual === 'PENDENTE' ? 'Pendente' : 'Aguardando pagamento', descricao: 'Descrição recebida do sistema.',
    permissoes: { editarCliente: true, editarItens: true, observacoes: true, pagamentos: true, alterarStatus: true },
    proximasTransicoes: [{ status: 'PENDENTE', label: 'Pendente', permitida: true }],
    fluxo: [{ status: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento', atual: statusAtual === 'AGUARDANDO_PAGAMENTO', concluido: false },
      { status: 'PENDENTE', label: 'Pendente', atual: statusAtual === 'PENDENTE', concluido: false }] });
  const root = () => fixture.nativeElement as HTMLElement;
  const section = (name: string) => root().querySelector<HTMLElement>(`[data-editor-section="${name}"]`)!;
  const body = (name: string) => section(name).querySelector<HTMLElement>('.section-card__body')!;
  const render = () => fixture.detectChanges();
  const toggle = (name: string) => { section(name).querySelector<HTMLButtonElement>('.section-card__toggle')!.click(); render(); };
  const flowComponent = () => fixture.debugElement.query(By.directive(PedidoFluxoControlesComponent)).componentInstance as PedidoFluxoControlesComponent;
  const advance = () => section('fluxo').querySelector<HTMLButtonElement>('.mobile-transition button')!;

  beforeEach(() => {
    registerLocaleData(ptBr, 'pt-BR'); step.set(null);
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); params = new BehaviorSubject(convertToParamMap({ id: '32' }));
    service = jasmine.createSpyObj('GraficaProdutoService', ['listarFormasPagamento', 'buscarPedidoComercial', 'buscarResumoFinanceiroPedido', 'listarRecebimentosPedido', 'buscarFluxoPedidoComercial', 'alterarStatusPedidoComercial']);
    service.listarFormasPagamento.and.returnValue(of(['PIX'])); service.buscarPedidoComercial.and.returnValue(of(order()));
    service.buscarResumoFinanceiroPedido.and.returnValue(of({ subtotal: 50, total: 50, totalRecebido: 20, saldoAberto: 30 }));
    service.listarRecebimentosPedido.and.returnValue(of({ content: [{ id: 1, formaPagamento: 'PIX', valor: 20, status: 'CONFIRMADO' }] }));
    service.buscarFluxoPedidoComercial.and.returnValue(of(flow()));
    TestBed.configureTestingModule({ imports: [ComercialEditorComponent, NoopAnimationsModule], providers: [
      provideRouter([]), provideHttpClient(), { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: ActivatedRoute, useValue: { data: of({ tipo: 'pedidos' }), paramMap: params } },
      { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: GraficaProdutoService, useValue: service },
      { provide: ClienteService, useValue: { buscarPorId: () => of(client), buscarPorNome: () => of({ content: [client] }) } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
      { provide: AuthService, useValue: { getUsuario: () => ({ nome: 'Usuário atual', proprietario: true }), temPermissao: () => true } },
      { provide: PrimeiroPedidoTutorialService, useValue: jasmine.createSpyObj('PrimeiroPedido', ['iniciarSeNecessario', 'registrarNovoPedido', 'registrarClienteSelecionado', 'registrarConfiguradorAberto', 'registrarItemAdicionado']) },
      { provide: TutorialService, useValue: { currentStep: step, registerTarget: () => () => {}, refreshTarget: jasmine.createSpy() } },
    ] });
    fixture = TestBed.createComponent(ComercialEditorComponent); editor = fixture.componentInstance; render();
  });
  afterEach(fakeAsync(() => { TestBed.inject(MatDialog).closeAll(); tick(400); TestBed.resetTestingModule(); }));

  it('carrega o pedido real, preserva a ordem e inicia seções no estado operacional', () => {
    expect(service.buscarPedidoComercial).toHaveBeenCalledWith(32); expect(editor.titulo).toBe('Pedido #32');
    expect(root().querySelector('app-card-header')!.textContent).toContain('Pedido #32');
    expect(Array.from(root().querySelectorAll('app-card-header button')).filter(b => b.textContent?.includes('Voltar')).length).toBe(1);
    expect(Array.from(root().querySelectorAll('[data-editor-section]')).map(n => n.getAttribute('data-editor-section'))).toEqual(['fluxo', 'cliente', 'itens', 'observacoes', 'financeiro', 'responsavel']);
    expect(body('cliente').hidden).toBeTrue(); expect(section('cliente').textContent).toContain('Pedro de Lara · (31) 98753-1233');
    expect(body('itens').hidden).toBeFalse(); expect(body('observacoes').hidden).toBeTrue(); expect(body('financeiro').hidden).toBeTrue();
    expect(section('observacoes').textContent).toContain('2 observações preenchidas');
    expect(section('financeiro').textContent).toContain('Pago R$'); expect(section('financeiro').textContent).toContain('30,00');
    expect(root().querySelector('app-pedido-documentos-acoes')).toBeNull();
    expect(root().querySelector('app-mobile-total-bar')).toBeNull();
  });

  it('reutiliza Cliente e Itens compactos e mantém consulta, troca e observações', fakeAsync(() => {
    const cliente = fixture.debugElement.query(By.directive(ClienteSelectorCardComponent)).componentInstance as ClienteSelectorCardComponent;
    const items = fixture.debugElement.query(By.directive(ItensPedidoSectionComponent)).componentInstance as ItensPedidoSectionComponent;
    expect(cliente.mobileCompact).toBeTrue(); expect(items.mobileCompact).toBeTrue(); expect(items.itens.length).toBe(1);
    toggle('cliente'); expect(body('cliente').textContent).toContain('Belo Horizonte / MG'); expect(body('cliente').textContent).toContain('12345678901');
    expect(body('cliente').querySelector('.cliente-mobile-change')).not.toBeNull();
    toggle('observacoes'); section('observacoes').querySelector<HTMLButtonElement>('.mobile-observation-cliente')!.click(); tick(400); render();
    expect(document.querySelector<HTMLTextAreaElement>('.observacoes-panel textarea')!.value).toBe('Entregar à tarde');
    (document.querySelector('.observacoes-panel__header button') as HTMLButtonElement).click(); tick(400); render();
    expect(editor.observacaoInternaControl.value).toBe('Conferir arte'); expect(editor.itens.length).toBe(1);
  }));

  it('não atribui ao usuário atual um pedido sem responsável informado', () => {
    editor.pedido = { ...order(), responsavelNome: null } as any; render();
    expect(section('responsavel').textContent).toContain('Não informado'); expect(section('responsavel').textContent).not.toContain('Usuário atual');
  });

  it('mantém financeiro e painel de pagamentos do pedido persistido', fakeAsync(() => {
    toggle('financeiro'); expect(body('financeiro').textContent).toContain('Subtotal');
    section('financeiro').querySelector<HTMLButtonElement>('.mobile-payments-trigger')!.click(); tick(400); render();
    expect(document.querySelector('.payments-panel')).not.toBeNull();
    expect(document.querySelector('.payment-history')!.textContent).toContain('20,00');
    expect(document.querySelector('.payment-draft-note')).toBeNull();
  }));

  it('mostra responsável real compacto e preserva todos os destinos de documentos', () => {
    expect(section('responsavel').textContent).toContain('Ana Atendimento'); expect(section('responsavel').textContent).not.toContain('Usuário atual');
    expect(section('responsavel').querySelector('mat-icon')).toBeNull();
    const router = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    viewport.next({ matches: false, breakpoints: {} }); render();
    const documents = root().querySelector('app-pedido-documentos-acoes')!;
    const buttons = Array.from(documents.querySelectorAll<HTMLButtonElement>('button'));
    expect(buttons.length).toBe(4);
    buttons.forEach(button => button.click());
    expect(router).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos', 32, 'impressao']);
    expect(router).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos', 32, 'impressao', 'duas-vias']);
    expect(router).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos', 32, 'impressao', 'etiqueta']);
    expect(router).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos', 32, 'whatsapp']);
  });

  function confirm() {
    advance().click(); render();
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button'));
    buttons.find(button => button.textContent?.includes('Confirmar status'))!.click(); tick(400); render();
  }

  it('aguarda sucesso real, recarrega transições e preserva escolhas e dados do pedido', fakeAsync(() => {
    const pending = new Subject<any>(); service.alterarStatusPedidoComercial.and.returnValue(pending);
    toggle('cliente'); toggle('observacoes'); toggle('financeiro');
    confirm(); expect(service.alterarStatusPedidoComercial).toHaveBeenCalledOnceWith(32, 'PENDENTE');
    expect(advance().disabled).toBeTrue(); expect(flowComponent().statusAtual).toBe('AGUARDANDO_PAGAMENTO'); expect(TestBed.inject(ToastrService).success).not.toHaveBeenCalled();
    service.buscarFluxoPedidoComercial.and.returnValue(of({ ...flow('PENDENTE'), proximasTransicoes: [{ status: 'EM_PRODUCAO', label: 'Em produção', permitida: true }] }));
    pending.next(order(32, 'PENDENTE')); pending.complete(); render();
    expect(flowComponent().statusAtual).toBe('PENDENTE'); expect(advance().textContent).toContain('Avançar para Em produção');
    expect(editor.mobileSections()).toEqual(jasmine.objectContaining({ cliente: true, itens: true, observacoes: true, financeiro: true }));
    expect(editor.clienteConfirmado.nome).toBe(client.nome); expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde'); expect(editor.itens.length).toBe(1);
    expect(editor.resumoFinanceiroView.totalRecebido).toBe(20); expect(TestBed.inject(ToastrService).success).toHaveBeenCalled();
  }));

  it('preserva status anterior em falha e permite tentar novamente sem sucesso antecipado', fakeAsync(() => {
    service.alterarStatusPedidoComercial.and.returnValue(throwError(() => new Error('Falha'))); confirm();
    expect(editor.statusControl.value).toBe('AGUARDANDO_PAGAMENTO'); expect(flowComponent().statusAtual).toBe('AGUARDANDO_PAGAMENTO');
    expect(advance().disabled).toBeFalse(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled(); expect(TestBed.inject(ToastrService).success).not.toHaveBeenCalled();
    confirm(); expect(service.alterarStatusPedidoComercial).toHaveBeenCalledTimes(2);
  }));

  it('cancelar confirmação não envia requisição', fakeAsync(() => {
    advance().click(); render(); (document.querySelector('mat-dialog-actions button') as HTMLButtonElement).click(); tick(400);
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled(); expect(editor.statusControl.value).toBe('AGUARDANDO_PAGAMENTO');
  }));

  it('respeita permissões recebidas e mantém o fluxo completo acessível', () => {
    service.buscarFluxoPedidoComercial.and.returnValue(of({ ...flow(), permissoes: { editarCliente: false, editarItens: false, observacoes: false, pagamentos: false, alterarStatus: false } }));
    editor.recarregar(); render(); expect(advance().disabled).toBeTrue(); expect(editor.podeEditarItens).toBeFalse();
    expect(section('financeiro').querySelector('.mobile-payments-trigger')).toBeNull();
    const toggleFlow = section('fluxo').querySelector<HTMLButtonElement>('.mobile-flow-toggle')!; toggleFlow.click(); render();
    expect(section('fluxo').querySelector<HTMLElement>('.step-strip')!.hidden).toBeFalse();
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
  });

  it('mantém pedido sem cliente acessível e muitos itens no mesmo componente', () => {
    service.buscarPedidoComercial.and.returnValue(of({ ...order(44), clienteId: null, clienteNome: null, itens: Array.from({ length: 30 }, () => ({ ...item })) }));
    params.next(convertToParamMap({ id: '44' })); render(); expect(body('cliente').hidden).toBeFalse(); expect(body('itens').hidden).toBeFalse();
    expect(editor.itens.length).toBe(30); expect(fixture.debugElement.query(By.directive(ItensPedidoSectionComponent))).not.toBeNull();
  });

  for (const [status, label] of [['ENTREGUE', 'Entregue'], ['CANCELADO', 'Cancelado']]) {
    it(`mantém ${label} quitado sem inventar movimentações ou permitir ações bloqueadas`, () => {
      service.buscarPedidoComercial.and.returnValue(of(order(32, status)));
      service.buscarResumoFinanceiroPedido.and.returnValue(of({ subtotal: 50, total: 50, totalRecebido: 50, saldoAberto: 0, quitado: true }));
      service.buscarFluxoPedidoComercial.and.returnValue(of({ ...flow(status), label, proximasTransicoes: [], fluxo: [{ status, label, atual: true, concluido: false }],
        permissoes: { editarCliente: false, editarItens: false, observacoes: false, pagamentos: false, alterarStatus: false } }));
      editor.recarregar(); render(); expect(advance()).toBeNull(); expect(flowComponent().vm.statusLabel).toBe(label);
      expect(editor.resumoFinanceiroView.saldoAberto).toBe(0); expect(body('itens').hidden).toBeFalse();
      expect(section('itens').querySelector('.add-item-button')).toBeNull(); expect(section('financeiro').querySelector('.mobile-payments-trigger')).toBeNull();
    });
  }

  it('não exibe dados fictícios quando não existe documento carregado', () => {
    editor.pedido = null; editor.fluxoPedido = null;
    service.buscarPedidoComercial.and.returnValue(throwError(() => ({ status: 404 })));
    params.next(convertToParamMap({ id: '77' })); render(); expect(root().querySelector('form')).toBeNull();
    expect(root().querySelector('[role="alert"]')).not.toBeNull(); expect(section('fluxo')).toBeNull();
  });

  it('inicializa novamente apenas ao carregar outro pedido', () => {
    toggle('financeiro'); editor.recarregar(); render(); expect(editor.mobileSections().financeiro).toBeTrue();
    service.buscarPedidoComercial.and.returnValue(of(order(45))); params.next(convertToParamMap({ id: '45' })); render();
    expect(editor.mobileSections().financeiro).toBeFalse(); expect(editor.mobileSections().cliente).toBeFalse(); expect(editor.titulo).toBe('Pedido #45');
  });

  it('preserva loading, falhas, acesso restrito e retry', () => {
    const pending = new Subject<any>(); service.buscarPedidoComercial.and.returnValue(pending); editor.recarregar(); render();
    expect(root().querySelector('mat-progress-bar[mode="indeterminate"]')).not.toBeNull(); expect(advance().disabled).toBeTrue();
    pending.error({ status: 404 }); render(); expect(root().querySelector('[role="alert"]')).not.toBeNull();
    service.buscarPedidoComercial.and.returnValue(throwError(() => ({ status: 403 }))); editor.recarregar(); render();
    expect(root().textContent).toContain('Você não possui permissão'); expect(root().querySelector('form')).toBeNull();
    service.buscarPedidoComercial.and.returnValue(of(order())); editor.recarregar(); render(); expect(root().querySelector('form')).not.toBeNull(); expect(root().querySelector('[role="alert"]')).toBeNull();
  });

  it('mantém criação e tipos sem fluxo fora da nova organização', () => {
    params.next(convertToParamMap({})); render(); expect(editor.mobilePedidoNovo).toBeTrue(); expect(editor.mobilePedidoDetalhe).toBeFalse();
    expect(root().querySelector('.editor--mobile-detail')).toBeNull(); expect(section('fluxo')).toBeNull();
    editor.tipo = 'orcamentos'; render(); expect(root().querySelector('app-pedido-fluxo-controles')).toBeNull();
    editor.tipo = 'rascunhos'; render(); expect(root().querySelector('app-pedido-fluxo-controles')).toBeNull();
  });

  it('preserva apresentação desktop e retomada original do tutorial', () => {
    viewport.next({ matches: false, breakpoints: {} }); render(); expect(flowComponent().mobileCompact).toBeFalse();
    expect(section('fluxo').querySelector('.primary-action')).not.toBeNull(); expect(section('fluxo').querySelector<HTMLElement>('.step-strip')!.hidden).toBeFalse();
    expect(root().querySelector('.editor--mobile-detail')).toBeNull(); expect(section('responsavel').querySelector('mat-icon')).not.toBeNull();
    const tutorial = TestBed.inject(PrimeiroPedidoTutorialService); expect(tutorial.iniciarSeNecessario).toHaveBeenCalledWith(32); expect(tutorial.registrarNovoPedido).not.toHaveBeenCalled();
    expect(section('cliente').querySelector('.section-card__toggle')).toBeNull(); expect(root().querySelectorAll('app-observacoes-card').length).toBe(2);
  });
});
