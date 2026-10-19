import { ClienteCreateDialogComponent } from '../../cliente/cliente-create-dialog/cliente-create-dialog.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, EMPTY, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ClienteSelectorCardComponent } from 'src/app/components/cliente-selector-card/cliente-selector-card.component';
import { ItensPedidoSectionComponent } from 'src/app/components/itens-pedido-section/itens-pedido-section.component';
import { ObservacoesCardComponent } from 'src/app/components/observacoes-card/observacoes-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { TutorialStep } from 'src/app/shared/tutorial/tutorial.model';
import { ClienteService } from '../../cliente/cliente.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ComercialEditorComponent } from './comercial-editor.component';
import { PRIMEIRO_PEDIDO_TARGETS, PrimeiroPedidoTutorialService } from './primeiro-pedido/primeiro-pedido-tutorial.service';

describe('Painel lateral de pagamentos mobile', () => {
  let fixture: ComponentFixture<ComercialEditorComponent>;
  let editor: ComercialEditorComponent;
  let viewport: BehaviorSubject<any>;
  const step = signal<TutorialStep | null>(null);
  const client = { id: 7, nome: 'Pedro de Lara', telefone: '31987531233' };
  const item = () => ({ nomeProduto: 'Panfleto', quantidade: 2, valorUnitario: 25, valorTotal: 50,
    catalogoProdutoId: 1, origem: 'GRAFICA', snapshotComercial: JSON.stringify({ produtoGraficoId: 1, entrada: { quantidade: 2 } }) });
  const root = (name: string) => fixture.nativeElement.querySelector(`[data-editor-section="${name}"]`) as HTMLElement;
  const body = (name: string) => root(name).querySelector('.section-card__body') as HTMLElement;
  const toggle = (name: string) => { (root(name).querySelector('.section-card__toggle') as HTMLButtonElement).click(); fixture.detectChanges(); };

  beforeEach(() => {
    registerLocaleData(ptBr, 'pt-BR'); step.set(null);
    viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [ComercialEditorComponent, NoopAnimationsModule], providers: [
      provideRouter([]), provideHttpClient(),
      { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: ActivatedRoute, useValue: { data: of({ tipo: 'pedidos' }), paramMap: of(new Map()) } },
      { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: GraficaProdutoService, useValue: { listarFormasPagamento: () => of(['PIX', 'DINHEIRO']), registrarRecebimentoPedido: jasmine.createSpy(), cancelarRecebimento: jasmine.createSpy() } },
      { provide: ClienteService, useValue: { buscarPorId: jasmine.createSpy().and.returnValue(of(client)), buscarPorNome: () => of({ content: [client] }), salvar: jasmine.createSpy().and.returnValue(of(client)) } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
      { provide: AuthService, useValue: { getUsuario: () => ({ nome: 'Maria Atendimento', proprietario: true }), temPermissao: () => true } },
      { provide: PrimeiroPedidoTutorialService, useValue: jasmine.createSpyObj('PrimeiroPedido', ['iniciarSeNecessario', 'registrarNovoPedido', 'registrarClienteSelecionado', 'registrarConfiguradorAberto', 'registrarItemAdicionado']) },
      { provide: TutorialService, useValue: { currentStep: step, registerTarget: () => () => {}, refreshTarget: jasmine.createSpy() } },
    ] });
    fixture = TestBed.createComponent(ComercialEditorComponent); editor = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(fakeAsync(() => { TestBed.inject(MatDialog).closeAll(); tick(400); TestBed.resetTestingModule(); }));

  const financial = () => root('financeiro');
  const q = (selector: string) => (fixture.nativeElement.querySelector(selector) || fixture.nativeElement.ownerDocument.querySelector(selector)) as HTMLElement;
  const render = () => fixture.detectChanges();
  const button = () => q('.payment-add-button') as HTMLButtonElement;
  const fill = (forma: string | null, valor: number | null) => { editor.pagamentoForm.setValue({ formaPagamento: forma, valor }); render(); };
  function prepare() {
    editor.itens = [{ ...item(), valorTotal: 261.1 }] as any;
    toggle('financeiro'); editor.abrirPagamentosMobile(); render();
  }

  const trigger = () => q('.mobile-payments-trigger') as HTMLButtonElement;
  const panel = () => document.querySelector('.payments-panel') as HTMLElement;
  const close = () => (document.querySelector('[aria-label="Fechar pagamentos"]') as HTMLButtonElement).click();

  it('deixa só a ação no financeiro e abre um único painel com os controles compartilhados', () => {
    editor.itens = [item()] as any; toggle('financeiro');
    expect(financial().querySelector('.payment-form')).toBeNull(); expect(financial().querySelector('.payment-list')).toBeNull();
    expect(trigger().textContent).toContain('Adicionar pagamento'); trigger().click(); render();
    expect(panel()).not.toBeNull(); expect(document.querySelector('.mobile-side-panel')).not.toBeNull();
    expect(panel().querySelectorAll('h2').length).toBe(1); expect(panel().querySelector('h2')!.textContent).toBe('Pagamentos');
    expect(panel().querySelector('.payment-context')!.textContent).toContain('Saldo');
    expect(panel().querySelector('.financial-adjustments')).toBeNull();
    expect(panel().querySelectorAll('.payment-form').length).toBe(1);
    expect(panel().querySelector('.mobile-side-panel__footer .payment-add-button')).not.toBeNull();
    expect(panel().querySelector('.payment-draft-note')!.textContent).toContain('ao salvar o pedido');
    editor.abrirPagamentosMobile(); expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
  });

  it('preserva rascunho, cliente, itens e ajustes ao fechar e não inclui nem salva automaticamente', fakeAsync(() => {
    prepare(); editor.clienteConfirmado = client; editor.freteControl.setValue(5); editor.observacaoClienteControl.setValue('Entregar à tarde');
    const items = editor.itens; const save = spyOn(editor, 'salvar'); fill('PIX', 20); close(); tick(400); render();
    expect(panel()).toBeNull(); expect(editor.pagamentosPretendidos).toEqual([]); expect(save).not.toHaveBeenCalled();
    expect(editor.pagamentoForm.value).toEqual({ formaPagamento: 'PIX', valor: 20 });
    expect(editor.clienteConfirmado).toBe(client); expect(editor.itens).toBe(items); expect(editor.freteControl.value).toBe(5);
    expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde');
    trigger().click(); render(); tick(400); render();
    expect((q('.payment-form input') as HTMLInputElement).value).toContain('20,00');
    expect(editor.pagamentosPretendidos).toEqual([]); expect(save).not.toHaveBeenCalled();
  }));

  it('mantém foco no diálogo e retorna ao acionador ao fechar pelo X ou Escape', fakeAsync(() => {
    prepare(); tick(400); render();
    expect(document.activeElement).toBe(document.querySelector('.mat-mdc-dialog-container'));
    close(); tick(400); render(); expect(panel()).toBeNull(); expect(document.activeElement).toBe(trigger());
    trigger().click(); render(); tick(400);
    panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true })); tick(400); render();
    expect(panel()).toBeNull(); expect(document.activeElement).toBe(trigger());
    expect(editor.pagamentosPretendidos).toEqual([]);
  }));

  it('atualiza a ação, os resumos e múltiplos temporários sem persistência antecipada', fakeAsync(() => {
    prepare(); const service = TestBed.inject(GraficaProdutoService) as any;
    const save = spyOn(editor, 'salvar');
    fill('PIX', 100); button().click(); render(); fill('DINHEIRO', 50); button().click(); render();
    expect(editor.pagamentosPretendidos).toEqual([{ formaPagamento: 'PIX', valor: 100 }, { formaPagamento: 'DINHEIRO', valor: 50 }]);
    expect(service.registrarRecebimentoPedido).not.toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(q('.payment-context .success').textContent).toContain('150,00');
    expect(q('.payment-context .highlight').textContent).toContain('111,10');
    expect(q('.pago').textContent).toContain('150,00'); expect(q('.resta').textContent).toContain('111,10');
    expect(q('.mobile-total-bar__summary .value').textContent).toContain('261,10');
    expect(trigger().textContent).toContain('Gerenciar pagamentos'); expect(panel()).not.toBeNull();
    close(); tick(400); render(); expect(editor.pagamentosPretendidos.length).toBe(2);
  }));

  it('mantém os pagamentos temporários no payload somente ao salvar o pedido', fakeAsync(() => {
    prepare(); editor.clienteConfirmado = client;
    const service = TestBed.inject(GraficaProdutoService) as any;
    service.criarPedidoGrafico = jasmine.createSpy().and.returnValue(new Subject<any>());
    fill('PIX', 50); button().click(); render(); close(); tick(400); render();
    expect(service.criarPedidoGrafico).not.toHaveBeenCalled();
    editor.salvarFormulario();
    expect(service.criarPedidoGrafico).toHaveBeenCalledOnceWith(1, jasmine.objectContaining({
      clienteId: 7, pagamentosPretendidos: [{ formaPagamento: 'PIX', valor: 50 }],
    }));
  }));

  it('usa a persistência e o recarregamento reais do pedido existente', () => {
    editor.pedidoId = 22; editor.pedido = { id: 22 } as any; prepare();
    const service = TestBed.inject(GraficaProdutoService) as any;
    const received = { id: 91, formaPagamento: 'PIX', valor: 100, status: 'CONFIRMADO' };
    service.registrarRecebimentoPedido.and.returnValue(of(received));
    service.buscarResumoFinanceiroPedido = jasmine.createSpy().and.returnValue(of({ subtotal: 261.1, total: 261.1, totalRecebido: 100, saldoAberto: 161.1 }));
    service.listarRecebimentosPedido = jasmine.createSpy().and.returnValue(of({ content: [received] }));
    service.buscarFluxoPedidoComercial = jasmine.createSpy().and.returnValue(of({ statusAtual: 'PENDENTE', permissoes: { pagamentos: true } }));
    fill('PIX', 100); button().click(); render();
    expect(service.registrarRecebimentoPedido).toHaveBeenCalledOnceWith(jasmine.objectContaining({ origemId: 22, formaPagamento: 'PIX', valor: 100 }));
    expect(service.buscarResumoFinanceiroPedido).toHaveBeenCalledOnceWith(22); expect(editor.pagamentosPretendidos).toEqual([]);
    expect(q('.payment-context .highlight').textContent).toContain('161,10'); expect(q('.resta').textContent).toContain('161,10');
    expect(panel().querySelectorAll('.payment-item').length).toBe(1); expect(q('.payment-draft-note')).toBeNull();
  });

  it('não oferece painel em outros documentos, sem permissão ou no desktop', () => {
    for (const tipo of ['orcamentos', 'rascunhos'] as const) {
      editor.tipo = tipo; render(); expect(trigger()).toBeNull(); editor.abrirPagamentosMobile(); expect(panel()).toBeNull();
    }
    editor.tipo = 'pedidos'; editor.fluxoPedido = { permissoes: { pagamentos: false } } as any; render();
    expect(trigger()).toBeNull(); editor.abrirPagamentosMobile(); expect(panel()).toBeNull();
    editor.fluxoPedido = null; viewport.next({ matches: false, breakpoints: {} }); render();
    editor.abrirPagamentosMobile(); expect(panel()).toBeNull(); expect(q('.payment-form')).not.toBeNull();
  });

  it('recolhe detalhes inferiores ao abrir e fecha o painel na transição para desktop', fakeAsync(() => {
    editor.mobileTotalExpanded.set(true); prepare(); expect(editor.mobileTotalExpanded()).toBeFalse();
    viewport.next({ matches: false, breakpoints: {} }); render(); tick(400); render();
    expect(panel()).toBeNull(); expect(q('.payment-form')).not.toBeNull();
  }));
});
