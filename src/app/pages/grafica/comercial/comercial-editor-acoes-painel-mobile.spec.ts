import { BreakpointObserver } from '@angular/cdk/layout';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PedidoFluxoControlesComponent } from 'src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component';
import { AuthService } from 'src/app/services/auth.service';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { TutorialStep } from 'src/app/shared/tutorial/tutorial.model';
import { ClienteService } from '../../cliente/cliente.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ComercialEditorComponent } from './comercial-editor.component';
import { PrimeiroPedidoTutorialService } from './primeiro-pedido/primeiro-pedido-tutorial.service';

describe('Ações do pedido em painel lateral mobile', () => {
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
    proximasTransicoes: [{ status: 'PENDENTE', label: 'Pendente', permitida: true }, { status: 'CANCELADO', label: 'Cancelado', permitida: true }],
    fluxo: [{ status: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento', atual: statusAtual === 'AGUARDANDO_PAGAMENTO', concluido: false },
      { status: 'PENDENTE', label: 'Pendente', atual: statusAtual === 'PENDENTE', concluido: false }] });
  const root = () => fixture.nativeElement as HTMLElement;
  const section = (name: string) => root().querySelector<HTMLElement>(`[data-editor-section="${name}"]`)!;
  const render = () => fixture.detectChanges();
  const flowComponent = () => fixture.debugElement.query(By.directive(PedidoFluxoControlesComponent)).componentInstance as PedidoFluxoControlesComponent;

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

  const trigger = () => root().querySelector<HTMLButtonElement>('.mobile-order-actions-trigger')!;
  const panel = () => document.querySelector<HTMLElement>('.order-actions-panel');
  const q = (selector: string) => panel()!.querySelector<HTMLButtonElement>(selector)!;
  const open = () => { trigger().click(); tick(400); render(); };
  const close = () => q('[aria-label="Fechar ações do pedido"]').click();
  const confirm = () => {
    const button = document.querySelector<HTMLButtonElement>('.confirmation-submit') || Array.from(document.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button')).find(b => b.textContent?.includes('Confirmar status'))!;
    button.click(); tick(400); render();
  };

  it('abre somente pelos três pontos sem executar operações ou duplicar cabeçalho/documentos', fakeAsync(() => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    expect(root().querySelector('app-pedido-documentos-acoes')).toBeNull();
    expect(root().querySelector('app-card-header')!.textContent).toContain('Pedido #32');
    expect(root().querySelector('app-card-header')!.textContent).not.toContain('Ações');
    open(); editor.abrirAcoesPedidoMobile(); render();
    expect(document.querySelectorAll('.order-actions-panel').length).toBe(1);
    expect(document.querySelector('.mat-mdc-menu-panel')).toBeNull();
    expect(panel()!.closest('.mobile-side-panel')).not.toBeNull();
    expect(q('h2').textContent).toBe('Ações do pedido'); expect(panel()!.textContent).toContain('Pedido #32');
    expect(panel()!.textContent).toContain('Gerenciamento'); expect(panel()!.textContent).toContain('Documentos e compartilhamento');
    expect(panel()!.querySelectorAll('.document-action-row').length).toBe(4); expect(q('.order-action-cancel').textContent).toContain('Cancelar pedido');
    expect(navigate).not.toHaveBeenCalled(); expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
    expect(section('fluxo').querySelector('.mobile-transition')).not.toBeNull();
  }));

  it('mantém as seis ações na mesma estrutura de colunas e cancelamento separado', fakeAsync(() => {
    open();
    const rows = panel()!.querySelectorAll('.order-action-row, .document-action-row');
    expect(rows.length).toBe(6);
    rows.forEach(row => {
      const content = row.querySelector('.action-content')!;
      expect(content.children.length).toBe(3);
      expect(content.children[0].classList.contains('action-leading-icon')).toBeTrue();
      expect(content.children[2].classList.contains('action-indicator')).toBeTrue();
      expect(content.children[2].textContent).toBe('chevron_right');
      expect(row.getAttribute('type')).toBe('button');
    });
    expect(q('.order-action-status').querySelector('small')!.textContent).toBe('Alterar o andamento do pedido');
    const cancelGroup = q('.order-action-cancel').closest('section')!;
    expect(cancelGroup.classList.contains('order-action-group')).toBeTrue(); expect(cancelGroup.previousElementSibling!.getAttribute('aria-label')).toBe('Documentos e compartilhamento');
    expect(panel()!.querySelectorAll('.whatsapp-icon').length).toBe(1);
  }));

  for (const mode of ['X', 'Escape', 'backdrop']) {
    it(`fecha por ${mode} e restaura foco sem operar o pedido`, fakeAsync(() => {
      open();
      if (mode === 'X') close();
      else if (mode === 'Escape') panel()!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      else (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      tick(400); render(); expect(panel()).toBeNull(); expect(document.activeElement).toBe(trigger());
      expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled(); expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde');
    }));
  }

  const paths = {
    completo: ['/page/grafica/comercial/pedidos', 32, 'impressao'],
    'duas-vias': ['/page/grafica/comercial/pedidos', 32, 'impressao', 'duas-vias'],
    etiqueta: ['/page/grafica/comercial/pedidos', 32, 'impressao', 'etiqueta'],
    whatsapp: ['/page/grafica/comercial/pedidos', 32, 'whatsapp'],
  };
  for (const action of ['completo', 'duas-vias', 'etiqueta', 'whatsapp'] as const) {
    it(`executa ${action} pelo handler atual no clique e bloqueia duplicidade até a navegação`, fakeAsync(() => {
      let resolve!: (value: boolean) => void;
      const navigate = spyOn(TestBed.inject(Router), 'navigate').and.returnValue(new Promise<boolean>(r => resolve = r));
      const legacy = action === 'whatsapp' ? spyOn(editor, 'abrirWhatsAppPedido').and.callThrough() : spyOn(editor, 'abrirImpressaoPedido').and.callThrough();
      open(); q(`[data-document-action="${action}"]`).click(); q(`[data-document-action="${action}"]`).click(); render();
      expect(legacy).toHaveBeenCalledTimes(1); expect(navigate).toHaveBeenCalledOnceWith(paths[action]);
      expect(q(`[data-document-action="${action}"]`).disabled).toBeTrue(); expect(q('[aria-label="Fechar ações do pedido"]').disabled).toBeTrue();
      expect(panel()).not.toBeNull(); resolve(true); flushMicrotasks(); tick(400); render(); expect(panel()).toBeNull();
    }));
  }

  it('mantém painel e retry se a navegação falha ou é cancelada', fakeAsync(() => {
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.rejectWith(new Error('Falha'));
    open(); q('[data-document-action="completo"]').click(); flushMicrotasks(); render();
    expect(panel()).not.toBeNull(); expect(q('[data-document-action="completo"]').disabled).toBeFalse(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
    navigate.and.resolveTo(false); q('[data-document-action="completo"]').click(); flushMicrotasks(); render();
    expect(panel()).not.toBeNull(); expect(q('[data-document-action="completo"]').disabled).toBeFalse();
    navigate.and.resolveTo(true); q('[data-document-action="completo"]').click(); flushMicrotasks(); tick(400); render(); expect(panel()).toBeNull();
  }));

  for (const cancel of [false, true]) {
    it(`${cancel ? 'Cancelar pedido' : 'Trocar status'} reutiliza confirmação, erro/retry e atualização sem fechar prematuramente`, fakeAsync(() => {
      const pending = new Subject<any>(); service.alterarStatusPedidoComercial.and.returnValue(pending);
      open(); const selector = cancel ? '.order-action-cancel' : '.order-action-status'; q(selector).click(); q(selector).click(); render();
      expect(document.querySelectorAll('mat-dialog-actions').length).toBe(1); expect(panel()).not.toBeNull();
      expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
      confirm(); expect(service.alterarStatusPedidoComercial).toHaveBeenCalledOnceWith(32, cancel ? 'CANCELADO' : 'PENDENTE');
      expect(flowComponent().statusAtual).toBe('AGUARDANDO_PAGAMENTO'); expect(panel()).not.toBeNull(); expect(q(selector).disabled).toBeTrue();
      close(); tick(400); render(); expect(panel()).not.toBeNull();
      pending.error(new Error('Falha')); render(); expect(editor.statusControl.value).toBe('AGUARDANDO_PAGAMENTO'); expect(q(selector).disabled).toBeFalse(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
      const status = cancel ? 'CANCELADO' : 'PENDENTE'; service.alterarStatusPedidoComercial.and.returnValue(of(order(32, status)));
      service.buscarFluxoPedidoComercial.and.returnValue(of({ ...flow(status), label: cancel ? 'Cancelado' : 'Pendente', proximasTransicoes: [] }));
      q(selector).click(); render(); confirm(); expect(panel()).not.toBeNull(); expect(flowComponent().statusAtual).toBe(status);
      expect(service.alterarStatusPedidoComercial).toHaveBeenCalledTimes(2); expect(TestBed.inject(ToastrService).success).toHaveBeenCalled();
    }));
  }

  it('cancelar a confirmação não cancela pedido nem fecha o painel', fakeAsync(() => {
    open(); q('.order-action-cancel').click(); render(); (document.querySelector('mat-dialog-actions button') as HTMLButtonElement).click(); tick(400); render();
    expect(panel()).not.toBeNull(); expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled(); expect(q('.order-action-cancel').disabled).toBeFalse();
  }));

  it('remove Cancelado da troca geral e dos avanços, mantendo a confirmação exclusiva de cancelamento', fakeAsync(() => {
    expect(section('fluxo').textContent).toContain('Avançar para Pendente');
    expect(section('fluxo').textContent).not.toContain('Avançar para Cancelado');
    open(); q('.order-action-status').click(); render();
    const ref = TestBed.inject(MatDialog).openDialogs.at(-1)!;
    expect(ref.componentInstance.data.opcoes.map((opcao: any) => opcao.status)).toEqual(['PENDENTE']);
    ref.close(); tick(400); render();
    q('.order-action-cancel').click(); tick(); render();
    const cancellation = TestBed.inject(MatDialog).openDialogs.at(-1)!;
    expect(cancellation.componentInstance.data.title).toBe('Cancelar pedido?');
    expect(cancellation.componentInstance.data.type).toBe('destructive');
    expect(cancellation.componentInstance.data.message).toBe('Deseja realmente cancelar o Pedido #32?');
    expect(cancellation.componentInstance.data.details).toContain(jasmine.objectContaining({ label: 'Status atual', value: 'Aguardando pagamento' }));
    expect(document.querySelector('.confirmation-responsive')).not.toBeNull();
    expect(document.querySelector('.confirmation-handle')).not.toBeNull();
    expect(document.querySelector('.confirmation-submit')!.textContent).toContain('Cancelar pedido');
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled();
  }));

  it('mantém Cancelar pedido utilizável quando não há outra transição autorizada', fakeAsync(() => {
    editor.fluxoPedido = { ...flow(), proximasTransicoes: [{ status: 'CANCELADO', label: 'Cancelado', permitida: true }] } as any; render();
    expect(section('fluxo').querySelector('.mobile-transition')).toBeNull();
    open(); expect(q('.order-action-status').disabled).toBeTrue(); expect(q('.order-action-cancel').disabled).toBeFalse();
    editor.gerenciarPedidoMobile(); render(); expect(document.querySelector('mat-dialog-actions')).toBeNull();
    q('.order-action-cancel').click(); render(); expect(document.querySelector('mat-dialog-actions')).not.toBeNull();
    confirm(); expect(service.alterarStatusPedidoComercial).toHaveBeenCalledOnceWith(32, 'CANCELADO');
  }));

  it('usa o número comercial real e restaura a ação sem executar ao desistir pelo X', fakeAsync(() => {
    editor.pedido = { ...order(), numero: 'PED-2026-000033' } as any; render(); open(); q('.order-action-cancel').click(); tick(); render();
    expect(document.querySelector('app-confirm-dialog')!.textContent).toContain('Deseja realmente cancelar o Pedido PED-2026-000033?');
    (document.querySelector('[aria-label="Fechar confirmação"]') as HTMLButtonElement).click(); tick(400); render();
    expect(panel()).not.toBeNull(); expect(q('.order-action-cancel').disabled).toBeFalse();
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled(); expect(flowComponent().statusAtual).toBe('AGUARDANDO_PAGAMENTO');
  }));

  it('desktop preserva modal centralizado com linguagem destrutiva e o handler original', fakeAsync(() => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    root().querySelector<HTMLButtonElement>('[aria-label="Ações do fluxo"]')!.click(); render();
    const row = Array.from(document.querySelectorAll<HTMLButtonElement>('.mat-mdc-menu-panel button')).find(button => button.textContent?.includes('Cancelar pedido'))!;
    row.click(); tick(); render();
    const confirmation = document.querySelector('app-confirm-dialog')!;
    expect(confirmation.textContent).toContain('Cancelar pedido?'); expect(confirmation.textContent).toContain('Aguardando pagamento');
    expect(document.querySelector('.confirmation-handle')).toBeNull();
    expect((confirmation.closest('.cdk-overlay-pane') as HTMLElement).style.width).toBe('440px');
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled(); confirm();
    expect(service.alterarStatusPedidoComercial).toHaveBeenCalledOnceWith(32, 'CANCELADO');
  }));

  it('respeita transição bloqueada e permissão revogada antes de confirmar', fakeAsync(() => {
    editor.fluxoPedido = { ...flow(), proximasTransicoes: [{ status: 'PENDENTE', label: 'Pendente', permitida: true }, { status: 'CANCELADO', label: 'Cancelado', permitida: false, motivo: 'Operação bloqueada.' }] } as any; render();
    open(); expect(q('.order-action-cancel').disabled).toBeTrue(); editor.gerenciarPedidoMobile(true); render(); expect(document.querySelector('mat-dialog-actions')).toBeNull();
    q('.order-action-status').click(); render(); editor.fluxoPedido!.permissoes.alterarStatus = false; render(); confirm();
    expect(service.alterarStatusPedidoComercial).not.toHaveBeenCalled(); expect(panel()!.querySelector('.order-action-status')).toBeNull();
  }));

  for (const status of ['ENTREGUE', 'CANCELADO']) {
    it(`mantém documentos disponíveis em ${status} sem permitir movimentações`, fakeAsync(() => {
      editor.fluxoPedido = { ...flow(status), proximasTransicoes: [], permissoes: { editarCliente: false, editarItens: false, observacoes: false, pagamentos: false, alterarStatus: false } } as any; render();
      expect(trigger().disabled).toBeFalse(); open(); expect(panel()!.querySelector('.order-action-status')).toBeNull(); expect(panel()!.querySelector('.order-action-cancel')).toBeNull();
      expect(panel()!.querySelectorAll('.document-action-row:not(:disabled)').length).toBe(4);
    }));
  }

  it('preserva acesso à revisão do WhatsApp sem cliente ou telefone, sem inventar contato', fakeAsync(() => {
    editor.clienteConfirmado = null; editor.pedido = { ...order(), clienteId: null, clienteTelefone: null } as any;
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true); open(); q('[data-document-action="whatsapp"]').click();
    expect(navigate).toHaveBeenCalledOnceWith(paths.whatsapp); expect(editor.pedido!.clienteTelefone).toBeNull(); flushMicrotasks(); tick(400);
  }));

  it('não abre em loading, acesso negado, novo pedido, Orçamento ou Rascunho', () => {
    editor.carregando = true; editor.abrirAcoesPedidoMobile(); expect(panel()).toBeNull(); editor.carregando = false;
    editor.acessoNegado = true; editor.abrirAcoesPedidoMobile(); expect(panel()).toBeNull(); editor.acessoNegado = false;
    for (const tipo of ['orcamentos', 'rascunhos'] as const) { editor.tipo = tipo; editor.abrirAcoesPedidoMobile(); expect(panel()).toBeNull(); }
    editor.tipo = 'pedidos'; editor.pedidoId = null; editor.abrirAcoesPedidoMobile(); expect(panel()).toBeNull();
  });

  it('encerra o painel ao voltar ao desktop e conserva popover e documentos originais', fakeAsync(() => {
    open(); viewport.next({ matches: false, breakpoints: {} }); render(); tick(400); render(); expect(panel()).toBeNull();
    expect(root().querySelector('.mobile-order-actions-trigger')).toBeNull();
    const menu = root().querySelector<HTMLButtonElement>('[aria-label="Ações do fluxo"]')!; menu.click(); render();
    expect(document.querySelector('.mat-mdc-menu-panel')!.textContent).toContain('Trocar status'); expect(document.querySelector('.mat-mdc-menu-panel')!.textContent).toContain('Cancelar pedido');
    expect(root().querySelectorAll('.document-actions button').length).toBe(4);
    expect(root().querySelector('app-card-header')!.textContent).toContain('Voltar');
    expect(section('responsavel').textContent).toContain('Ana Atendimento');
    expect(TestBed.inject(PrimeiroPedidoTutorialService).iniciarSeNecessario).toHaveBeenCalledWith(32);
  }));
});
