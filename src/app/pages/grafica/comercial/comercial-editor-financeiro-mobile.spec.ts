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

describe('Financeiro e pagamentos do editor mobile', () => {
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

  it('organiza valores, ajustes e situação sem duplicar Total nem formulário', () => {
    prepare();
    expect(financial().textContent).toContain('Valores do pedido');
    expect(financial().textContent).toContain('Ajustes');
    expect(financial().textContent).toContain('Situação financeira');
    expect(q('.subtotal').textContent).toContain('261,10');
    expect(financial().querySelector('.summary-row.total')).toBeNull();
    expect(financial().querySelectorAll('.financial-adjustments').length).toBe(1);
    expect(q('.payment-form mat-select').getAttribute('aria-label')).toBe('Forma de pagamento');
    expect(q('.payment-form input').getAttribute('aria-label')).toBe('Valor');
    expect(financial().querySelectorAll('input[inputmode=decimal]').length).toBe(3);
    expect(financial().querySelector('.payment-form')).toBeNull();
    expect(q('.empty-payments').textContent).toContain('Nenhum pagamento informado.');
  });

  it('mantém ajustes, Pago e Saldo sincronizados com o painel inferior e preserva os campos ao recolher', () => {
    prepare(); editor.ajustesFinanceirosForm.setValue({ acrescimo: 10, frete: 5, desconto: 3 }); render();
    expect(editor.resumoFinanceiroView.total).toBe(273.1);
    expect(q('.mobile-total-bar__summary .value').textContent).toContain('273,10');
    expect(q('.resta').textContent).toContain('273,10');
    const field = q('.financial-adjustments input'); fill('PIX', 60);
    toggle('financeiro'); expect(body('financeiro').hidden).toBeTrue();
    expect(financial().querySelector('.section-card__toggle')!.textContent).toContain('Saldo');
    toggle('financeiro'); expect(q('.financial-adjustments input')).toBe(field);
    expect(editor.pagamentoValorControl.value).toBe(60);
    expect(editor.ajustesFinanceirosForm.value).toEqual({ acrescimo: 10, frete: 5, desconto: 3 });
  });

  it('preserva obrigatoriedade, mínimo, limite do saldo e mensagens acessíveis', () => {
    prepare(); expect(button().disabled).toBeTrue(); fill(null, 10); expect(button().disabled).toBeTrue();
    fill('PIX', null); expect(button().disabled).toBeTrue();
    editor.pagamentoForm.markAllAsTouched(); render();
    expect(q('.payment-form app-input-moeda mat-error').textContent).toContain('Campo obrigatório');
    expect(q('.payment-form input').getAttribute('aria-required')).toBe('true');
    expect(q('.payment-form input').getAttribute('aria-describedby')).toContain(q('.payment-form app-input-moeda mat-error').id);
    fill('PIX', 0); expect(button().disabled).toBeTrue();
    fill('PIX', -10); expect(button().disabled).toBeTrue();
    fill('PIX', 300); expect(button().disabled).toBeTrue();
    expect(q('.payment-error').getAttribute('role')).toBe('alert');
    expect(editor.pagamentosPretendidos).toEqual([]);
    fill('PIX', 12); expect(button().disabled).toBeFalse();
  });

  it('mantém pagamentos parciais, integrais e de formas distintas com cancelamento temporário', () => {
    prepare(); fill('PIX', 61.1); button().click(); render();
    expect(editor.resumoFinanceiroView.totalRecebido).toBe(61.1);
    expect(editor.resumoFinanceiroView.saldoAberto).toBe(200);
    fill('DINHEIRO', 200); button().click(); render();
    expect(editor.resumoFinanceiroView.saldoAberto).toBe(0);
    expect(q('.pago').textContent).toContain('261,10');
    expect(q('.resta').textContent).toContain('0,00');
    expect(document.querySelectorAll('.payment-item').length).toBe(2);
    (q('.payment-cancel') as HTMLButtonElement).click(); render();
    expect(editor.pagamentosPretendidos).toEqual([{ formaPagamento: 'DINHEIRO', valor: 200 }]);
    expect(editor.resumoFinanceiroView.saldoAberto).toBe(61.1);
  });

  it('mantém loading, evita cliques duplicados e preserva preenchimento após erro do recebimento', () => {
    prepare(); editor.pedidoId = 22; editor.pedido = { id: 22 } as any;
    const pending = new Subject<any>();
    const service = TestBed.inject(GraficaProdutoService) as any;
    service.registrarRecebimentoPedido.and.returnValue(pending);
    fill('PIX', 20); button().click(); render(); button().click();
    expect(service.registrarRecebimentoPedido).toHaveBeenCalledTimes(1);
    expect(button().disabled).toBeTrue(); expect(button().textContent).toContain('Adicionando');
    expect(q('.payment-form').getAttribute('aria-busy')).toBe('true');
    pending.error(new Error('Falha no recebimento')); render();
    expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
    expect(editor.pagamentoForm.value).toEqual({ formaPagamento: 'PIX', valor: 20 });
    expect(button().disabled).toBeFalse();
    const refresh = spyOn(editor as any, 'carregarFinanceiroPedido');
    service.registrarRecebimentoPedido.and.returnValue(of({ id: 91 })); button().click(); render();
    expect(refresh).toHaveBeenCalledOnceWith(22); expect(editor.pagamentoForm.value).toEqual({ formaPagamento: null, valor: null });
  });

  it('lista dados reais, data e status, preserva cancelamento e bloqueios do fluxo', () => {
    prepare(); editor.pedidoId = 22; editor.pedido = { id: 22 } as any;
    editor.recebimentos = [{ id: 91, formaPagamento: 'PIX', valor: 20, status: 'CONFIRMADO', dataRecebimento: '2026-10-17T12:00:00' },
      { id: 92, formaPagamento: 'DINHEIRO', valor: 10, status: 'CANCELADO' }] as any; render();
    expect(q('.payment-date').textContent).toContain('17/10/2026');
    expect(document.querySelectorAll('.payment-cancel').length).toBe(1);
    expect(q('.payment-item.cancelado')).not.toBeNull();
    const pending = new Subject<any>(); const service = TestBed.inject(GraficaProdutoService) as any;
    service.cancelarRecebimento.and.returnValue(pending);
    (q('.payment-cancel') as HTMLButtonElement).click(); render();
    expect(service.cancelarRecebimento).toHaveBeenCalledOnceWith(91, 'Cancelado pela tela de pedido');
    expect((q('.payment-cancel') as HTMLButtonElement).disabled).toBeTrue();
    pending.error(new Error('Falha no cancelamento')); render();
    expect(editor.recebimentos.length).toBe(2);
    editor.fluxoPedido = { permissoes: { pagamentos: false } } as any; render();
    expect(q('.payment-cancel')).toBeNull(); fill('PIX', 5); expect(button().disabled).toBeTrue();
    expect(q('.financial-adjustments')).toBeNull();
  });

  it('mostra o saldo persistido inclusive negativo sem recalcular o resumo retornado', () => {
    prepare(); editor.pedidoId = 22; editor.pedido = { id: 22 } as any;
    editor.resumoFinanceiro = { subtotal: 261.1, acrescimo: 0, frete: 0, desconto: 0, total: 261.1,
      totalRecebido: 270, saldoAberto: -8.9, percentualPago: 103.4, quitado: true } as any;
    render(); expect(editor.resumoFinanceiroView).toBe(editor.resumoFinanceiro!);
    expect(q('.resta').textContent).toContain('-R$'); expect(q('.resta').textContent).toContain('8,90');
    expect(q('.pago').textContent).toContain('270,00');
  });

  for (const tipo of ['orcamentos', 'rascunhos'] as const) {
    it(`compartilha a apresentação sem oferecer recebimentos em ${tipo}`, () => {
      editor.tipo = tipo; editor.itens = [item()] as any; render();
      expect(q('.summary-card--mobile')).not.toBeNull();
      expect(q('.payment-form')).toBeNull(); expect(editor.mostrarPagamentos).toBeFalse();
      editor.ajustesFinanceirosForm.setValue({ acrescimo: 10, frete: 5, desconto: 3 }); render();
      expect(editor.resumoFinanceiroView.total).toBe(62);
      expect(editor.pagamentosPretendidos).toEqual([]);
      expect(q('.mobile-total-bar')).toBeNull();
    });
  }

  function inViewport(width: number, height: number, assertions: (win: Window) => void) {
    const frame = document.createElement('iframe'); frame.style.width = `${width}px`; frame.style.height = `${height}px`; document.body.appendChild(frame);
    const host = fixture.nativeElement as HTMLElement; const parent = host.parentElement;
    const overlay = document.querySelector('.cdk-overlay-container'); const overlayParent = overlay?.parentElement;
    try {
      const doc = frame.contentDocument!; document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
      doc.body.style.margin = '0'; doc.body.appendChild(host); if (overlay) doc.body.appendChild(overlay); assertions(frame.contentWindow!);
    } catch (error) { throw new Error(String(error)); } finally { if (parent) parent.appendChild(host); if (overlay && overlayParent) overlayParent.appendChild(overlay); frame.remove(); }
  }

  for (const width of [320, 360, 390]) {
    it(`mantém uma coluna, alvos de toque e conteúdo acessível em ${width}px`, () => {
      prepare();
      inViewport(width, 520, win => {
        const form = q('.payment-form'); const method = q('.payment-form app-input-options'); const value = q('.payment-form app-input-moeda');
        expect(win.getComputedStyle(form).gridTemplateColumns.split(' ').length).toBe(1);
        expect(win.getComputedStyle(q('.financial-adjustments')).gridTemplateColumns.split(' ').length).toBe(1);
        expect(value.getBoundingClientRect().top).toBeGreaterThan(method.getBoundingClientRect().bottom - 1);
        expect(button().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
        expect(form.scrollWidth).toBeLessThanOrEqual(form.clientWidth);
        expect(financial().scrollWidth).toBeLessThanOrEqual(financial().clientWidth);
        const input = q('.payment-form input') as HTMLInputElement; input.focus(); input.scrollIntoView({ block: 'center' });
        expect(frameActive(win)).toBe(input);
        expect(q('.mobile-total-bar__clearance')).not.toBeNull();
        expect(input.getBoundingClientRect().bottom).toBeLessThanOrEqual(q('.payments-panel .mobile-side-panel__footer').getBoundingClientRect().top);
      });
    });
  }
  function frameActive(win: Window) { return win.document.activeElement; }

  it('preserva cabeçalho, tabela financeira, campos e colunas desktop', () => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    expect(q('.summary-card--mobile')).toBeNull(); expect(q('.mobile-financial-title')).toBeNull();
    expect(q('.summary-row.total')).not.toBeNull(); expect(q('.payment-form mat-select').getAttribute('aria-label')).toBe('Forma');
    expect(q('.payment-form input').getAttribute('inputmode')).toBeNull();
    expect(q('.mobile-total-bar')).toBeNull();
    inViewport(1280, 900, win => {
      expect(win.getComputedStyle(q('.payment-form')).gridTemplateColumns.split(' ').length).toBe(2);
      expect(win.getComputedStyle(q('.summary-sticky')).position).toBe('sticky');
    });
  });
});
