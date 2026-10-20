import { BreakpointObserver } from '@angular/cdk/layout';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { Validators } from '@angular/forms';
import { LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ObservacoesCardComponent } from 'src/app/components/observacoes-card/observacoes-card.component';
import { AuthService } from 'src/app/services/auth.service';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { TutorialStep } from 'src/app/shared/tutorial/tutorial.model';
import { ClienteService } from '../../cliente/cliente.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ComercialEditorComponent } from './comercial-editor.component';
import { PrimeiroPedidoTutorialService } from './primeiro-pedido/primeiro-pedido-tutorial.service';

describe('Observações em painel lateral mobile', () => {
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

  const q = (selector: string) => (fixture.nativeElement.querySelector(selector) || fixture.nativeElement.ownerDocument.querySelector(selector)) as HTMLElement;
  const render = () => fixture.detectChanges();
  function prepare() {
    editor.itens = [{ ...item(), valorTotal: 261.1 }] as any;
    toggle('observacoes'); render();
  }

  const section = () => root('observacoes');
  const trigger = (tipo = 'cliente') => q(`.mobile-observation-${tipo}`) as HTMLButtonElement;
  const panel = () => document.querySelector('.observacoes-panel') as HTMLElement;
  const field = () => panel().querySelector('textarea') as HTMLTextAreaElement;
  const apply = () => panel().querySelector('.apply-observation') as HTMLButtonElement;
  const open = (tipo: 'cliente' | 'interna' = 'cliente') => { trigger(tipo).click(); render(); };
  const close = () => (panel().querySelector('.observacoes-panel__header button') as HTMLButtonElement).click();

  it('mantém apenas o vazio discreto e dois acionadores sem textareas na página', () => {
    prepare(); expect(section().querySelector('textarea')).toBeNull();
    expect(section().querySelectorAll('app-observacoes-card').length).toBe(0);
    expect(section().textContent).toContain('Nenhuma observação informada.');
    expect(trigger().textContent?.trim()).toBe('Cliente'); expect(trigger('interna').textContent?.trim()).toBe('Interna');
    expect(trigger().getAttribute('aria-label')).toContain('para o cliente');
    toggle('observacoes'); expect(section().querySelector('.section-card__toggle')!.textContent).toContain('Nenhuma observação');
  });

  for (const tipo of ['cliente', 'interna'] as const) {
    it(`edita ${tipo} no mesmo componente, aplica somente seu campo e permite limpar`, fakeAsync(() => {
      prepare(); editor.observacaoClienteControl.setValue('Texto cliente'); editor.observacaoInternaControl.setValue('Texto interno');
      const save = spyOn(editor, 'salvar'); open(tipo); tick(400); render();
      expect(document.activeElement).toBe(field()); expect(field().value).toBe(tipo === 'cliente' ? 'Texto cliente' : 'Texto interno');
      expect(panel().querySelector('h2')!.textContent).toBe(tipo === 'cliente' ? 'Observação para o cliente' : 'Observação interna');
      expect(field().getAttribute('maxlength')).toBe('255');
      field().value = 'Novo texto\nSegunda linha'; field().dispatchEvent(new Event('input')); render();
      expect(editor.observacaoClienteControl.value).toBe('Texto cliente'); expect(editor.observacaoInternaControl.value).toBe('Texto interno');
      apply().click(); tick(400); render(); expect(panel()).toBeNull(); expect(document.activeElement).toBe(trigger(tipo));
      const changed = tipo === 'cliente' ? editor.observacaoClienteControl : editor.observacaoInternaControl;
      const other = tipo === 'cliente' ? editor.observacaoInternaControl : editor.observacaoClienteControl;
      expect(changed.value).toBe('Novo texto\nSegunda linha'); expect(other.value).toBe(tipo === 'cliente' ? 'Texto interno' : 'Texto cliente');
      expect(editor.mobileObservacoesResumo).toBe('2 observações preenchidas'); expect(save).not.toHaveBeenCalled();
      open(tipo); tick(400); field().value = ''; field().dispatchEvent(new Event('input')); render();
      expect(apply().disabled).toBeFalse(); apply().click(); tick(400); render();
      expect(changed.value).toBe(''); expect(editor.mobileObservacoesResumo).toBe('1 observação preenchida');
      expect(section().textContent).not.toContain('Novo texto'); expect(save).not.toHaveBeenCalled();
    }));
  }

  for (const mode of ['Cancelar', 'X', 'Escape', 'backdrop']) {
    it(`descarta sem aplicar por ${mode} e preserva os demais dados do editor`, fakeAsync(() => {
      prepare(); editor.observacaoClienteControl.setValue('Confirmada'); editor.observacaoInternaControl.setValue('Só equipe');
      editor.clienteConfirmado = client; editor.freteControl.setValue(5); const items = editor.itens;
      const save = spyOn(editor, 'salvar'); open(); tick(400); editor.observacaoMobileControl.setValue('Não aplicada'); render();
      if (mode === 'Cancelar') (Array.from(panel().querySelectorAll('button')).find(button => button.textContent?.trim() === 'Cancelar') as HTMLButtonElement).click();
      else if (mode === 'X') close();
      else if (mode === 'Escape') panel().dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      else (document.querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      tick(400); render(); expect(panel()).toBeNull(); expect(document.activeElement).toBe(trigger());
      expect(editor.observacaoClienteControl.value).toBe('Confirmada'); expect(editor.observacaoInternaControl.value).toBe('Só equipe');
      expect(editor.clienteConfirmado).toBe(client); expect(editor.itens).toBe(items); expect(editor.freteControl.value).toBe(5);
      expect(editor.resumoFinanceiroView.total).toBe(266.1); expect(save).not.toHaveBeenCalled();
      open(); tick(400); expect(field().value).toBe('Confirmada');
    }));
  }

  it('preserva texto longo, quebras e conteúdo literal com resumo de três linhas', fakeAsync(() => {
    prepare(); const text = '<b>Conteúdo literal</b>\n' + 'Linha longa sem remover dados. '.repeat(35);
    editor.observacaoClienteControl.setValue(text); render();
    const preview = section().querySelector('.mobile-observation-summary p') as HTMLElement;
    expect(preview.textContent).toBe(text); expect(preview.querySelector('b')).toBeNull();
    expect(section().textContent).toContain('ver o texto completo'); open(); tick(400); expect(field().value).toBe(text);
    close(); tick(400); render(); expect(editor.observacaoClienteControl.value).toBe(text);
  }));

  it('reutiliza validadores reais e associa mensagens ao campo sem aplicar inválido', fakeAsync(() => {
    prepare(); editor.observacaoClienteControl.setValidators(Validators.maxLength(5)); open(); tick(400);
    editor.observacaoMobileControl.setValue('Muito longo'); editor.observacaoMobileControl.markAsTouched(); render();
    expect(apply().disabled).toBeTrue();
    const error = panel().querySelector('mat-error') as HTMLElement;
    expect(error.textContent).toContain('Máximo de 5 caracteres'); expect(field().getAttribute('aria-describedby')).toContain(error.id);
    editor.aplicarObservacaoMobile('Muito longo'); expect(panel()).not.toBeNull(); expect(editor.observacaoClienteControl.value).toBe('');
  }));

  for (const tipo of ['pedidos', 'orcamentos', 'rascunhos'] as const) {
    it(`mantém o mesmo fluxo local em ${tipo} novo e contagem ao recolher`, fakeAsync(() => {
      editor.tipo = tipo; prepare(); open('interna'); tick(400); editor.observacaoMobileControl.setValue('Equipe'); render();
      apply().click(); tick(400); render(); expect(editor.observacaoInternaSalva).toBe('Equipe');
      toggle('observacoes'); expect(body('observacoes').hidden).toBeTrue();
      expect(section().querySelector('.section-card__toggle')!.textContent).toContain('1 observação preenchida');
      toggle('observacoes'); expect(section().textContent).toContain('Equipe');
    }));
  }

  for (const [tipo, method] of [['pedidos', 'criarPedidoGrafico'], ['orcamentos', 'criarOrcamentoGrafico'], ['rascunhos', 'criarRascunhoGrafico']] as const) {
    it(`envia somente as observações aplicadas no salvamento original de ${tipo}`, fakeAsync(() => {
      editor.tipo = tipo; prepare(); editor.clienteConfirmado = client;
      editor.observacaoInternaControl.setValue('Equipe');
      const service = TestBed.inject(GraficaProdutoService) as any;
      service[method] = jasmine.createSpy().and.returnValue(new Subject<any>());
      open(); tick(400); editor.observacaoMobileControl.setValue('Cliente\nSegunda linha'); render();
      apply().click(); tick(400); render();
      open('interna'); tick(400); editor.observacaoMobileControl.setValue('Descartada'); close(); tick(400); render();
      expect(service[method]).not.toHaveBeenCalled();
      editor.salvar();
      expect(service[method]).toHaveBeenCalledOnceWith(1, jasmine.objectContaining({
        clienteId: 7, observacaoCliente: 'Cliente\nSegunda linha', observacaoInterna: 'Equipe',
      }));
    }));
  }

  for (const tipo of ['cliente', 'interna'] as const) {
    it(`preserva operação imediata, loading e retry de ${tipo} no orçamento salvo`, fakeAsync(() => {
      prepare(); editor.tipo = 'orcamentos'; editor.pedidoId = 22;
      editor.orcamento = { id: 22, status: 'ABERTO', itens: [], observacaoCliente: 'Cliente', observacaoInterna: 'Interna' } as any;
      editor.observacaoClienteControl.setValue('Cliente'); editor.observacaoInternaControl.setValue('Interna'); render();
      const service = TestBed.inject(GraficaProdutoService) as any; const pending = new Subject<any>();
      const method = tipo === 'cliente' ? 'alterarObservacaoOrcamento' : 'alterarObservacaoInternaOrcamento';
      service[method] = jasmine.createSpy().and.returnValue(pending);
      open(tipo); tick(400); editor.observacaoMobileControl.setValue('Nova'); render(); apply().click(); render(); apply().click();
      expect(service[method]).toHaveBeenCalledOnceWith(22, 'Nova'); expect(apply().disabled).toBeTrue(); expect(field().readOnly).toBeTrue();
      expect(editor.observacaoClienteControl.value).toBe('Cliente'); expect(editor.observacaoInternaControl.value).toBe('Interna');
      pending.error(new Error('Falha')); render(); expect(panel()).not.toBeNull(); expect(editor.observacaoMobileControl.value).toBe('Nova');
      expect(TestBed.inject(ToastrService).error).toHaveBeenCalled(); expect(apply().disabled).toBeFalse();
      service[method].and.returnValue(of({ id: 22, status: 'ABERTO', itens: [], observacaoCliente: tipo === 'cliente' ? 'Nova' : 'Cliente', observacaoInterna: tipo === 'interna' ? 'Nova' : 'Interna' }));
      apply().click(); tick(400); render(); expect(panel()).toBeNull();
      expect(editor.observacaoClienteControl.value).toBe(tipo === 'cliente' ? 'Nova' : 'Cliente');
      expect(editor.observacaoInternaControl.value).toBe(tipo === 'interna' ? 'Nova' : 'Interna');
    }));
  }

  it('permite consultar texto completo sem oferecer edição quando o fluxo bloqueia', fakeAsync(() => {
    prepare(); editor.observacaoClienteControl.setValue('Somente leitura'); editor.fluxoPedido = { permissoes: { observacoes: false } } as any; render();
    expect(trigger('interna').disabled).toBeTrue(); open(); tick(400); render();
    expect(field().readOnly).toBeTrue(); expect(apply()).toBeNull();
    editor.aplicarObservacaoMobile('Alterado'); expect(editor.observacaoClienteControl.value).toBe('Somente leitura');
  }));

  it('preserva o componente e os botões originais no desktop', () => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    const cards = fixture.debugElement.queryAll(By.directive(ObservacoesCardComponent)); expect(cards.length).toBe(2);
    const note = cards[0].componentInstance as ObservacoesCardComponent; expect(note.panelEditor).toBeFalse();
    note.iniciarEdicao(); render(); expect(fixture.nativeElement.querySelector('.obs-actions button').textContent).toContain('Salvar observação');
    expect(fixture.nativeElement.querySelector('.mobile-observation-actions')).toBeNull();
    expect(document.querySelector('.observacoes-panel')).toBeNull();
  });
});
