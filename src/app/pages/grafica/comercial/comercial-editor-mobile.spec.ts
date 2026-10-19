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
import { BehaviorSubject, of, EMPTY } from 'rxjs';
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

describe('Editor Novo Pedido mobile', () => {
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
      { provide: GraficaProdutoService, useValue: { listarFormasPagamento: () => of(['PIX', 'DINHEIRO']) } },
      { provide: ClienteService, useValue: { buscarPorId: jasmine.createSpy().and.returnValue(of(client)), buscarPorNome: () => of({ content: [client] }), salvar: jasmine.createSpy().and.returnValue(of(client)) } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
      { provide: AuthService, useValue: { getUsuario: () => ({ nome: 'Maria Atendimento', proprietario: true }), temPermissao: () => true } },
      { provide: PrimeiroPedidoTutorialService, useValue: jasmine.createSpyObj('PrimeiroPedido', ['iniciarSeNecessario', 'registrarNovoPedido', 'registrarClienteSelecionado', 'registrarConfiguradorAberto', 'registrarItemAdicionado']) },
      { provide: TutorialService, useValue: { currentStep: step, registerTarget: () => () => {}, refreshTarget: jasmine.createSpy() } },
    ] });
    fixture = TestBed.createComponent(ComercialEditorComponent); editor = fixture.componentInstance; fixture.detectChanges();
  });
  afterEach(fakeAsync(() => { TestBed.inject(MatDialog).closeAll(); tick(400); TestBed.resetTestingModule(); }));

  it('organiza cinco grupos, mantém um Salvar e Voltar contextual, sem alertas permanentes', () => {
    expect(fixture.nativeElement.querySelectorAll('[data-editor-section]').length).toBe(5);
    expect(body('cliente').hidden).toBeFalse(); expect(body('itens').hidden).toBeFalse();
    expect(body('observacoes').hidden).toBeTrue(); expect(body('financeiro').hidden).toBeTrue();
    expect(body('revisao').hidden).toBeTrue();
    expect(fixture.nativeElement.querySelector('app-card-header [role=heading]').textContent.trim()).toBe('Novo Pedido');
    expect(fixture.nativeElement.querySelector('app-card-header [page-mobile-header-actions]').textContent).toContain('Voltar');
    const backButtons = Array.from(fixture.nativeElement.querySelectorAll('app-card-header button') as NodeListOf<HTMLButtonElement>)
      .filter(button => button.textContent?.includes('Voltar'));
    expect(backButtons.length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('button[form="comercial-editor-form"]').length).toBe(1);
    expect(fixture.nativeElement.querySelector('.page-card__footer')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-total-bar--compact')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.mobile-total-bar__clearance')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.required-alert')).toBeNull();
    expect(fixture.nativeElement.querySelector('.responsavel-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-responsavel').textContent).toContain('Maria Atendimento');
    expect(fixture.nativeElement.querySelector('.summary-card .payments-card')).toBeNull();
    expect(fixture.nativeElement.querySelector('.mobile-payments-trigger')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form form')).toBeNull();
  });

  it('reutiliza seleção e confirmação reais, permite troca e não submete ao confirmar cliente', () => {
    const selector = fixture.debugElement.query(By.directive(ClienteSelectorCardComponent)).componentInstance as ClienteSelectorCardComponent;
    const save = spyOn(editor, 'salvar');
    selector.onSelecionarCliente(client); fixture.detectChanges();
    expect(editor.clienteConfirmado?.id).toBe(7);
    expect(root('cliente').querySelector('.section-card__toggle')?.textContent).toContain('Pedro de Lara');
    expect(root('cliente').querySelector('.editor')).toBeNull();
    const change = Array.from(root('cliente').querySelectorAll('button')).find(button => button.textContent?.includes('Trocar cliente'))!;
    change.click(); fixture.detectChanges();
    expect(root('cliente').querySelector('.editor')).toBeTruthy(); expect(save).not.toHaveBeenCalled();
    expect(root('cliente').querySelector('.editor-actions button')?.getAttribute('type')).toBe('button');
    selector.onCancelarEdicao(); fixture.detectChanges(); expect(editor.clienteConfirmado?.id).toBe(7);
  });

  it('preserva Novo cliente e ações reais de produto, busca rápida e remoção', () => {
    const dialog = fixture.debugElement.injector.get(MatDialog); const open = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(client), beforeClosed: () => EMPTY, updateSize: () => ({ updatePosition: () => {} }) } as any);
    const selector = fixture.debugElement.query(By.directive(ClienteSelectorCardComponent)).componentInstance as ClienteSelectorCardComponent;
    selector.onCriarCliente(); fixture.detectChanges(); expect(open).toHaveBeenCalled(); expect(editor.clienteConfirmado?.id).toBe(7);
    const wizard = spyOn(editor, 'abrirWizard'), quick = spyOn(editor, 'abrirBuscaRapida');
    (root('itens').querySelector('.add-item-button') as HTMLButtonElement).click();
    (root('itens').querySelector('.secondary-item-button') as HTMLButtonElement).click();
    expect(wizard).toHaveBeenCalledTimes(1); expect(quick).toHaveBeenCalledTimes(1);
    editor.itens = [item()] as any; fixture.detectChanges();
    expect(root('itens').querySelector('.section-card__toggle')?.textContent).toContain('1 item adicionado');
    const section = fixture.debugElement.query(By.directive(ItensPedidoSectionComponent)).componentInstance as ItensPedidoSectionComponent;
    section.removerItem.emit(0); fixture.detectChanges(); expect(editor.itens).toEqual([]);
  });

  it('abre Novo cliente no painel global, preserva nome e cancela sem selecionar', fakeAsync(() => {
    editor.clienteControl.setValue('  Pedro  ');
    const dialog = fixture.debugElement.injector.get(MatDialog);
    editor.onCriarCliente(); fixture.detectChanges(); tick(400);
    const ref = dialog.openDialogs[0];
    const form = ref.componentInstance as ClienteCreateDialogComponent;
    expect(form.nomeControl.value).toBe('Pedro');
    expect(form.data?.tutorialTarget).toBe(PRIMEIRO_PEDIDO_TARGETS.cliente);
    expect(document.querySelector('.mobile-side-panel .mobile-side-panel__body form')).toBeTruthy();
    expect(document.querySelector('.mobile-side-panel .mobile-side-panel__footer button[form="novo-cliente-dialog-form"]')).toBeTruthy();
    form.cancelar(); tick(400);
    expect(document.querySelector('.mobile-side-panel')).toBeNull();
    expect(editor.clienteConfirmado).toBeFalsy();
  }));

  it('mantém validações e seleciona o cliente cadastrado pelo painel', fakeAsync(() => {
    const service = TestBed.inject(ClienteService);
    const originalItems = [item()]; editor.itens = originalItems as any;
    editor.observacaoClienteControl.setValue('Entregar à tarde');
    const dialog = fixture.debugElement.injector.get(MatDialog);
    editor.onCriarCliente(); fixture.detectChanges(); tick(400);
    const form = dialog.openDialogs[0].componentInstance as ClienteCreateDialogComponent;
    form.salvar(); expect(service.salvar).not.toHaveBeenCalled();
    form.nomeControl.setValue('Pedro de Lara'); form.telefoneControl.setValue('31987531233');
    form.salvar(); tick(400); fixture.detectChanges();
    expect(service.salvar).toHaveBeenCalledTimes(1);
    expect(form.quickMobile).toBeTrue();
    expect(editor.itens).toBe(originalItems as any);
    expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde');
    expect(TestBed.inject(PrimeiroPedidoTutorialService).registrarClienteSelecionado).toHaveBeenCalled();
    expect(editor.clienteConfirmado?.id).toBe(7);
    expect(document.querySelector('.mobile-side-panel')).toBeNull();
  }));

  it('mantém o modal desktop e respeita os bloqueios de edição', () => {
    viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    const dialog = fixture.debugElement.injector.get(MatDialog);
    const open = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(null) } as any);
    editor.onCriarCliente();
    expect(open).toHaveBeenCalledWith(ClienteCreateDialogComponent, jasmine.objectContaining({ width: '760px', maxWidth: '96vw' }));
    expect(open.calls.mostRecent().args[1]?.panelClass).toBeUndefined();
    open.calls.reset();
    viewport.next({ matches: true, breakpoints: {} }); fixture.detectChanges();
    spyOnProperty(editor, 'somenteLeitura', 'get').and.returnValue(true); editor.onCriarCliente(); expect(open).not.toHaveBeenCalled();
  });

  it('usa Detalhes e o puxador globais sem duplicar o formulário financeiro', () => {
    editor.clienteConfirmado = client; editor.itens = [item()] as any; fixture.detectChanges();
    const details = fixture.nativeElement.querySelector('.mobile-total-bar__details');
    expect(details.getAttribute('aria-hidden')).toBe('true');
    fixture.nativeElement.querySelector('.mobile-total-bar__expand--button').click(); fixture.detectChanges();
    expect(details.getAttribute('aria-hidden')).toBe('false'); expect(details.textContent).toContain('Pedro de Lara');
    expect(details.textContent).toContain('Saldo'); expect(details.querySelector('input')).toBeNull();
    fixture.nativeElement.querySelector('.mobile-total-bar__handle-toggle').click(); fixture.detectChanges();
    expect(details.getAttribute('aria-hidden')).toBe('true');
    expect(fixture.nativeElement.querySelectorAll('.financial-adjustments').length).toBe(1);
  });

  it('recolhe sem destruir campos nem perder observações em edição', () => {
    toggle('observacoes');
    const cards = fixture.debugElement.queryAll(By.directive(ObservacoesCardComponent));
    const note = cards[0].componentInstance as ObservacoesCardComponent;
    note.iniciarEdicao(); editor.observacaoClienteControl.setValue('Texto para o cliente'); fixture.detectChanges();
    const field = root('observacoes').querySelector('textarea');
    toggle('observacoes'); expect(body('observacoes').hidden).toBeTrue(); expect(body('observacoes').hasAttribute('inert')).toBeTrue();
    toggle('observacoes'); expect(root('observacoes').querySelector('textarea')).toBe(field);
    expect(note.editando).toBeTrue(); expect(editor.observacaoClienteControl.value).toBe('Texto para o cliente');
    note.onSalvar(); fixture.detectChanges(); expect(editor.observacaoClienteSalva).toBe('Texto para o cliente');
    const internal = cards[1].componentInstance as ObservacoesCardComponent;
    internal.iniciarEdicao(); editor.observacaoInternaControl.setValue('Somente equipe'); internal.onSalvar(); fixture.detectChanges();
    expect(editor.observacaoInternaSalva).toBe('Somente equipe');
    expect(root('observacoes').textContent).toContain('Observação para o cliente');
    expect(root('observacoes').textContent).toContain('Observação interna');
  });

  it('mantém cálculos, teclado decimal e pagamentos opcionais com histórico e cancelamento', () => {
    editor.itens = [item()] as any; toggle('financeiro');
    editor.ajustesFinanceirosForm.setValue({ acrescimo: 10, frete: 5, desconto: 3 }); fixture.detectChanges();
    expect(editor.resumoFinanceiroView.total).toBe(62);
    expect(fixture.nativeElement.querySelector('.mobile-total-bar__summary .value').textContent).toContain('62,00');
    expect(root('financeiro').querySelector('.summary-row.total')).toBeNull();
    expect(root('financeiro').querySelectorAll('input[inputmode=decimal]').length).toBe(3);
    editor.abrirPagamentosMobile(); fixture.detectChanges();
    editor.pagamentoForm.setValue({ formaPagamento: 'PIX', valor: 12 }); fixture.detectChanges();
    (document.querySelector('.payments-panel .payment-add-button') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(editor.pagamentosPretendidos).toEqual([{ formaPagamento: 'PIX', valor: 12 }]);
    expect(editor.resumoFinanceiroView.saldoAberto).toBe(50);
    toggle('financeiro'); toggle('financeiro'); expect(editor.pagamentosPretendidos.length).toBe(1);
    (document.querySelector('.payments-panel .payment-cancel') as HTMLButtonElement).click(); fixture.detectChanges();
    expect(editor.pagamentosPretendidos).toEqual([]); expect(editor.resumoFinanceiroView.saldoAberto).toBe(62);
    editor.pagamentoForm.setValue({ formaPagamento: 'PIX', valor: 63 }); fixture.detectChanges();
    expect((document.querySelector('.payments-panel .payment-add-button') as HTMLButtonElement).disabled).toBeTrue();
    expect(document.querySelector('.payments-panel')!.textContent).toContain('Valor não pode exceder');
  });

  it('abre a seção pendente e direciona o foco sem habilitar Salvar inválido', fakeAsync(() => {
    const save = fixture.nativeElement.querySelector('button[form="comercial-editor-form"]'); expect(save.disabled).toBeTrue();
    toggle('cliente'); editor.revisarPendencias(); fixture.detectChanges(); tick();
    expect(body('cliente').hidden).toBeFalse(); expect(document.activeElement).toBe(root('cliente').querySelector('.editor input'));
    expect(body('revisao').hidden).toBeFalse();
    expect(fixture.nativeElement.querySelector('.mobile-validation').textContent).toContain('Informe o cliente.');
    editor.clienteConfirmado = client; toggle('itens'); editor.salvarFormulario(); fixture.detectChanges(); tick();
    expect(body('itens').hidden).toBeFalse(); expect(document.activeElement).toBe(root('itens').querySelector('.add-item-button'));
    editor.itens = [item()] as any; editor.acrescimoControl.setValue(-1); editor.revisarPendencias(); fixture.detectChanges(); tick();
    expect(body('financeiro').hidden).toBeFalse(); expect(editor.acrescimoControl.touched).toBeTrue();
  }));

  it('aciona o mesmo submit uma vez, preserva loading e Cancelar secundário', () => {
    editor.clienteConfirmado = client; editor.itens = [item()] as any; fixture.detectChanges();
    const save = spyOn(editor, 'salvar'); const cancel = spyOn(editor, 'onFooterAction').and.callThrough();
    const navigate = spyOn(TestBed.inject(Router), 'navigate');
    const button = fixture.nativeElement.querySelector('button[form="comercial-editor-form"]');
    expect(button.disabled).toBeFalse(); button.click(); expect(save).toHaveBeenCalledTimes(1);
    toggle('revisao');
    const cancelButton = Array.from(root('revisao').querySelectorAll('button')).find(value => value.textContent?.trim() === 'Cancelar')!;
    cancelButton.click(); expect(cancel).toHaveBeenCalledWith('cancelar'); expect(navigate).toHaveBeenCalled();
    editor.salvando = true; fixture.detectChanges(); expect(button.disabled).toBeTrue(); expect(button.textContent).toContain('Salvando');
    expect(cancelButton.disabled).toBeTrue();
  });

  it('reabre cada alvo recolhido antes de retomar o tutorial sem alterar checkpoints', fakeAsync(() => {
    for (const [section, targetId] of [['cliente', PRIMEIRO_PEDIDO_TARGETS.cliente], ['itens', PRIMEIRO_PEDIDO_TARGETS.adicionarItem], ['financeiro', PRIMEIRO_PEDIDO_TARGETS.revisao], ['revisao', PRIMEIRO_PEDIDO_TARGETS.salvar]] as const) {
      editor.setMobileSection(section, false); fixture.detectChanges();
      step.set({ id: section, targetId, title: section, description: section }); fixture.detectChanges(); tick(); fixture.detectChanges();
      expect(body(section).hidden).toBeFalse();
      expect(TestBed.inject(TutorialService).refreshTarget).toHaveBeenCalledWith(targetId);
    }
    expect(TestBed.inject(PrimeiroPedidoTutorialService).registrarClienteSelecionado).not.toHaveBeenCalled();
    expect(TestBed.inject(PrimeiroPedidoTutorialService).registrarItemAdicionado).not.toHaveBeenCalled();
  }));

  for (const tipo of ['pedidos', 'orcamentos', 'rascunhos'] as const) {
    it(`inicia revisão recolhida em ${tipo} e preserva os registros individuais e o total`, () => {
      editor.tipo = tipo;
      editor.itens = [item(), { ...item(), nomeProduto: 'Acabamento: Corte', unidadeVenda: 'FOLHA', quantidade: 2, valorUnitario: 3, valorTotal: 6, snapshotComercial: JSON.stringify({ tipo: 'ACABAMENTO' }) }] as any;
      fixture.detectChanges();
      expect(body('revisao').hidden).toBeTrue();
      expect(root('revisao').querySelector('.section-card__toggle')?.textContent).toContain('Revisão e conclusão');
      toggle('revisao'); expect(body('revisao').hidden).toBeFalse();
      toggle('revisao'); expect(body('revisao').hidden).toBeTrue();
      expect(editor.itens.length).toBe(2); expect(editor.itensView.length).toBe(2);
      expect(editor.itensView[1].unidade).toBe('FOLHA');
      expect(editor.itensView[1].subTotal).toBe(6);
      expect(editor.total).toBe(56);
      expect(root('itens').querySelectorAll('.order-items__row').length).toBe(2);
    });
  }

  it('recolhe os itens sem perda nem mudança automática da seção após remover', () => {
    editor.itens = [item(), item()] as any; fixture.detectChanges(); toggle('itens');
    expect(body('itens').hidden).toBeTrue();
    const section = fixture.debugElement.query(By.directive(ItensPedidoSectionComponent)).componentInstance as ItensPedidoSectionComponent;
    section.removerItem.emit(0); fixture.detectChanges();
    expect(body('itens').hidden).toBeTrue(); expect(editor.itens.length).toBe(1);
    expect(root('itens').querySelector('.section-card__toggle')?.textContent).toContain('1 item adicionado');
    toggle('itens'); expect(root('itens').querySelectorAll('.order-items__row').length).toBe(1);
  });

  it('mantém detalhes do preço abertos em atualizações e após recolher a seção', () => {
    editor.itens = [{ ...item(), unidadeVenda: 'UN' }, { ...item(), unidadeVenda: 'UN' }] as any; fixture.detectChanges();
    const details = root('itens').querySelector('details') as HTMLDetailsElement;
    details.open = true; fixture.detectChanges();
    expect(root('itens').querySelector('details')).toBe(details);
    toggle('itens'); toggle('itens');
    expect(root('itens').querySelector('details')).toBe(details); expect(details.open).toBeTrue();
    editor.remover(1); fixture.detectChanges();
    expect(root('itens').querySelector('details')).toBe(details); expect(details.open).toBeTrue();
  });

  it('preserva descrições e valores resolvidos nas políticas fixa, faixa, lote e metro', () => {
    const cases = [
      { tipo: 'FIXO', quantidade: 1, unitario: 13.5, total: 13.5, contexto: 'fixo' },
      { tipo: 'POR_FAIXA_QUANTIDADE', quantidade: 10, unitario: 4, total: 40, contexto: '/un' },
      { tipo: 'POR_LOTE', quantidade: 50, unitario: 2, total: 100, contexto: 'por lote' },
      { tipo: 'POR_METRO_QUADRADO', quantidade: 1, unitario: 10, total: 25, contexto: '/m²' },
    ];
    for (const value of cases) {
      const description = 'Couchê A3 · Colorido Frente · Corte reto e corte eletrônico, conforme a descrição original.';
      editor.itens = [{ ...item(), quantidade: value.quantidade, valorUnitario: value.unitario, valorTotal: value.total,
        caracteristicasResumo: description, snapshotComercial: JSON.stringify({ precificacao: { tipo: value.tipo, areaFaturada: 2.5 } }),
      }] as any;
      const original = JSON.stringify(editor.itens); fixture.detectChanges();
      expect(editor.itensView[0].valorContexto).toContain(value.contexto);
      expect(editor.itensView[0].subTotal).toBe(value.total);
      expect(editor.itensView[0].valor).toBe(value.unitario);
      expect(editor.itensView[0].especificacao).toBe(description);
      expect(JSON.stringify(editor.itens)).toBe(original);
    }
  });

  it('preserva desktop, outros tipos e detalhe sem ativar o piloto', () => {
    editor.itens = [item()] as any;
    for (const tipo of ['orcamentos', 'rascunhos'] as const) {
      editor.tipo = tipo; fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('.editor--mobile-progressive')).toBeNull();
      expect(fixture.nativeElement.querySelector('.mobile-total-bar__clearance')).toBeNull();
      expect(fixture.nativeElement.querySelector('.responsavel-card')).toBeTruthy();
      expect(editor.footerActions[0].id).toBe('cancelar');
    }
    editor.tipo = 'pedidos'; editor.pedidoId = 22; editor.pedido = { id: 22 } as any; fixture.detectChanges();
    expect(editor.mobilePedidoNovo).toBeFalse(); expect(fixture.nativeElement.querySelector('.mobile-total-bar__summary .value')).toBeNull();
    editor.pedidoId = null; viewport.next({ matches: false, breakpoints: {} }); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.section-card__toggle')).toBeNull();
    expect(fixture.nativeElement.querySelector('.responsavel-card')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.summary-row.total')).toBeTruthy();
    expect(editor.footerActions.map(action => action.id)).toEqual(['cancelar', 'salvar']);
  });
});
