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

describe('Resumo financeiro e ajustes mobile', () => {
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
    toggle('financeiro'); render();
  }

  const trigger = () => q('.mobile-adjustments-trigger') as HTMLButtonElement;
  const panel = () => document.querySelector('.adjustments-panel') as HTMLElement;
  const apply = () => q('.apply-adjustments') as HTMLButtonElement;
  const draft = (a: number, f: number, d: number) => { editor.ajustesMobileForm.setValue({ acrescimo: a, frete: f, desconto: d }); render(); };
  const open = () => { trigger().click(); render(); };
  const close = () => (q('[aria-label="Fechar ajustes"]') as HTMLButtonElement).click();

  it('apresenta sete valores reais sem inputs e duas ações secundárias simétricas', () => {
    prepare(); expect(financial().querySelector('input')).toBeNull();
    expect(financial().querySelectorAll('.summary-row').length).toBe(7);
    for (const label of ['Subtotal', 'Acréscimos', 'Frete', 'Descontos', 'Total', 'Pago', 'Saldo']) expect(financial().textContent).toContain(label);
    expect(trigger().textContent?.trim()).toBe('Ajustes');
    expect(q('.mobile-payments-trigger').textContent?.trim()).toBe('Pagamentos');
    expect(trigger().hasAttribute('mat-stroked-button')).toBeTrue();
    expect(q('.mobile-payments-trigger').hasAttribute('mat-stroked-button')).toBeTrue();
  });

  it('copia valores aplicados e só altera Total/Saldo ao aplicar, sem salvar documento', fakeAsync(() => {
    prepare(); editor.clienteConfirmado = client; editor.pagamentosPretendidos = [{ formaPagamento: 'PIX', valor: 100 }];
    const save = spyOn(editor, 'salvar'); const paid = editor.pagamentosPretendidos;
    open(); tick(400); render(); expect(editor.ajustesMobileForm.value).toEqual({ acrescimo: 0, frete: 0, desconto: 0 });
    draft(10, 5, 3); expect(editor.ajustesFinanceirosForm.value).toEqual({ acrescimo: 0, frete: 0, desconto: 0 });
    expect(editor.resumoFinanceiroView.total).toBe(261.1); expect(editor.resumoFinanceiroView.saldoAberto).toBe(161.1);
    expect(q('.mobile-total-bar__summary .value').textContent).toContain('261,10');
    apply().click(); render(); tick(400); render(); expect(panel()).toBeNull();
    expect(editor.resumoFinanceiroView.total).toBe(273.1); expect(editor.resumoFinanceiroView.saldoAberto).toBe(173.1);
    expect(editor.pagamentosPretendidos).toBe(paid); expect(q('.summary-row.total').textContent).toContain('273,10');
    expect(q('.mobile-total-bar__summary .value').textContent).toContain('273,10');
    expect(document.activeElement).toBe(trigger());
    toggle('financeiro'); expect(financial().querySelector('.section-card__toggle')!.textContent).toContain('173,10');
    expect(save).not.toHaveBeenCalled();
  }));

  for (const kind of ['Cancelar', 'X', 'Escape', 'backdrop']) {
    it(`descarta o rascunho por ${kind} sem alterar os valores aplicados`, fakeAsync(() => {
      prepare(); editor.ajustesFinanceirosForm.setValue({ acrescimo: 10, frete: 5, desconto: 3 });
      editor.clienteConfirmado = client; editor.observacaoClienteControl.setValue('Entregar à tarde'); const items = editor.itens;
      open(); tick(400); render(); expect(editor.ajustesMobileForm.value.frete).toBe(5); draft(100, 100, 0);
      if (kind === 'Cancelar') (Array.from(panel().querySelectorAll('button')).find(button => button.textContent?.trim() === 'Cancelar') as HTMLButtonElement).click();
      else if (kind === 'X') close();
      else if (kind === 'Escape') panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      else (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      tick(400); render(); expect(panel()).toBeNull();
      expect(editor.ajustesFinanceirosForm.value).toEqual({ acrescimo: 10, frete: 5, desconto: 3 });
      expect(editor.resumoFinanceiroView.total).toBe(273.1); expect(editor.itens).toBe(items); expect(editor.clienteConfirmado).toBe(client);
      expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde'); expect(document.activeElement).toBe(trigger());
      open(); tick(400); render(); expect(editor.ajustesMobileForm.value).toEqual({ acrescimo: 10, frete: 5, desconto: 3 });
    }));
  }

  it('reutiliza máscara, limites e erros acessíveis sem aplicar parcialmente', () => {
    prepare(); open(); const input = q('.adjustments-panel input') as HTMLInputElement;
    expect(input.getAttribute('inputmode')).toBe('decimal');
    input.value = '1500'; input.dispatchEvent(new Event('input')); render(); expect(editor.ajustesMobileForm.value.acrescimo).toBe(15);
    expect(editor.acrescimoControl.value).toBe(0); draft(-1, 2, 3);
    editor.ajustesMobileForm.markAllAsTouched(); render(); expect(apply().disabled).toBeTrue();
    expect(panel().querySelector('mat-error')!.textContent).toContain('Valor inválido');
    editor.aplicarAjustesMobile(); render(); expect(panel()).not.toBeNull(); expect(editor.freteControl.value).toBe(0);
    draft(1000000000000, 0, 0); expect(apply().disabled).toBeTrue();
    expect(panel().querySelector('mat-error')!.textContent).toContain('Valor máximo permitido');
  });

  it('impede painéis simultâneos e reutiliza o fluxo de pagamentos após ajustes', fakeAsync(() => {
    prepare(); open(); editor.abrirPagamentosMobile(); render(); expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    expect(document.querySelector('.payments-panel')).toBeNull(); draft(10, 0, 0); apply().click(); tick(400); render();
    editor.abrirPagamentosMobile(); render(); editor.abrirAjustesMobile(); expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    editor.pagamentoForm.setValue({ formaPagamento: 'PIX', valor: 100 }); render(); button().click(); render();
    expect(editor.resumoFinanceiroView.total).toBe(271.1); expect(editor.resumoFinanceiroView.saldoAberto).toBe(171.1);
    expect(q('.payment-context .highlight').textContent).toContain('171,10'); expect(q('.resta').textContent).toContain('171,10');
  }));

  for (const tipo of ['orcamentos', 'rascunhos'] as const) {
    it(`mantém somente Ajustes em ${tipo}, com a mesma aplicação local`, fakeAsync(() => {
      editor.tipo = tipo; prepare(); expect(q('.mobile-payments-trigger')).toBeNull();
      expect(financial().querySelectorAll('.mobile-financial-actions button').length).toBe(1);
      open(); draft(10, 5, 3); apply().click(); tick(400); render();
      expect(editor.resumoFinanceiroView.total).toBe(273.1); expect(editor.pagamentosPretendidos).toEqual([]);
    }));
  }

  it('preserva ajustes salvos e mantém rascunho aberto em erro da operação existente', fakeAsync(() => {
    prepare(); editor.pedidoId = 22; editor.pedido = { id: 22 } as any; render();
    const service = TestBed.inject(GraficaProdutoService) as any; const pending = new Subject<any>();
    service.alterarAjustesFinanceirosPedido = jasmine.createSpy().and.returnValue(pending);
    const save = spyOn(editor, 'salvar'); open(); draft(10, 5, 3); apply().click(); render(); apply().click();
    expect(service.alterarAjustesFinanceirosPedido).toHaveBeenCalledOnceWith(22, { acrescimo: 10, frete: 5, desconto: 3 });
    expect(editor.ajustesFinanceirosForm.value.acrescimo).toBe(0); expect(apply().disabled).toBeTrue();
    expect((q('[aria-label="Fechar ajustes"]') as HTMLButtonElement).disabled).toBeTrue();
    pending.error(new Error('Falha')); render(); expect(panel()).not.toBeNull(); expect(editor.ajustesMobileForm.value.acrescimo).toBe(10);
    expect(editor.resumoFinanceiroView.total).toBe(261.1); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled(); expect(save).not.toHaveBeenCalled();
    expect(apply().disabled).toBeFalse(); close(); tick(400); render(); expect(editor.acrescimoControl.value).toBe(0);
  }));

  it('fecha após sucesso da persistência já existente em pedido salvo', fakeAsync(() => {
    prepare(); editor.pedidoId = 22; editor.pedido = { id: 22 } as any; render();
    const service = TestBed.inject(GraficaProdutoService) as any;
    service.alterarAjustesFinanceirosPedido = jasmine.createSpy().and.returnValue(of({ id: 22, itens: [{ ...item(), valorTotal: 261.1 }], acrescimo: 10, frete: 5, desconto: 3 }));
    service.buscarResumoFinanceiroPedido = jasmine.createSpy().and.returnValue(of({ subtotal: 261.1, total: 273.1, acrescimo: 10, frete: 5, desconto: 3, totalRecebido: 0, saldoAberto: 273.1 }));
    service.listarRecebimentosPedido = jasmine.createSpy().and.returnValue(of({ content: [] }));
    service.buscarFluxoPedidoComercial = jasmine.createSpy().and.returnValue(of({ statusAtual: 'PENDENTE', permissoes: { pagamentos: true } }));
    open(); draft(10, 5, 3); apply().click(); tick(400); render(); expect(panel()).toBeNull();
    expect(editor.acrescimoControl.value).toBe(10); expect(q('.summary-row.total').textContent).toContain('273,10');
  }));

  it('respeita permissões e mantém campos inline somente no desktop', () => {
    prepare(); editor.fluxoPedido = { permissoes: { pagamentos: false } } as any; render();
    expect(trigger()).toBeNull(); editor.abrirAjustesMobile(); expect(panel()).toBeNull();
    editor.fluxoPedido = null; viewport.next({ matches: false, breakpoints: {} }); render();
    expect(q('.financial-adjustments')).not.toBeNull(); expect(trigger()).toBeNull(); editor.abrirAjustesMobile(); expect(panel()).toBeNull();
  });
  it('acomoda botões iguais e campos em coluna em 320 e 360px', () => {
    prepare();
    for (const width of [320, 360]) {
      const frame = document.createElement('iframe'); frame.style.width = `${width}px`; frame.style.height = '600px'; document.body.appendChild(frame);
      const host = fixture.nativeElement as HTMLElement; const parent = host.parentElement;
      try {
        const doc = frame.contentDocument!; document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.margin = '0'; doc.body.appendChild(host);
        const actions = financial().querySelectorAll('.mobile-financial-actions button');
        const a = actions[0].getBoundingClientRect(); const b = actions[1].getBoundingClientRect();
        expect(Math.abs(a.width - b.width)).toBeLessThanOrEqual(1); expect(a.top).toBe(b.top); expect(a.height).toBeGreaterThanOrEqual(44);
        expect(financial().scrollWidth).toBeLessThanOrEqual(financial().clientWidth);
      } finally { if (parent) parent.appendChild(host); frame.remove(); }
    }
    open(); expect(panel().querySelectorAll('app-input-moeda').length).toBe(3);
    expect(panel().querySelectorAll('input[inputmode=decimal]').length).toBe(3);
  });

  it('preserva estimativas de rascunho existente sem acionar endpoint de pedido', fakeAsync(() => {
    editor.tipo = 'rascunhos'; editor.pedidoId = 22; editor.rascunho = { id: 22, itens: [] } as any; render(); prepare();
    const service = TestBed.inject(GraficaProdutoService) as any; service.alterarAjustesFinanceirosPedido = jasmine.createSpy();
    open(); draft(10, 5, 3); apply().click(); tick(400); render();
    expect(editor.resumoFinanceiroView.total).toBe(273.1); expect(service.alterarAjustesFinanceirosPedido).not.toHaveBeenCalled();
    expect(editor.pagamentosPretendidos).toEqual([]);
  }));

  it('reutiliza a aplicação explícita de orçamento salvo sem oferecer Pagamentos', fakeAsync(() => {
    editor.tipo = 'orcamentos'; editor.pedidoId = 22; editor.orcamento = { id: 22, status: 'ABERTO', subtotal: 261.1, total: 261.1, itens: [] } as any; render(); prepare();
    const service = TestBed.inject(GraficaProdutoService) as any;
    service.alterarAjustesComerciaisOrcamento = jasmine.createSpy().and.returnValue(of({ id: 22, status: 'ABERTO', subtotal: 261.1, total: 273.1, acrescimo: 10, frete: 5, desconto: 3, itens: [] }));
    open(); draft(10, 5, 3); apply().click(); tick(400); render();
    expect(service.alterarAjustesComerciaisOrcamento).toHaveBeenCalledOnceWith(22, { acrescimo: 10, frete: 5, desconto: 3 });
    expect(editor.resumoFinanceiroView.total).toBe(273.1); expect(panel()).toBeNull(); expect(q('.mobile-payments-trigger')).toBeNull();
  }));

});
