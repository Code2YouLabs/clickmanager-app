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

describe('Cliente compacto no editor mobile', () => {
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
  afterEach(() => TestBed.resetTestingModule());

  const selector = () => fixture.debugElement.query(By.directive(ClienteSelectorCardComponent)).componentInstance as ClienteSelectorCardComponent;
  const render = () => fixture.detectChanges();
  const select = () => { selector().onSelecionarCliente(client); render(); };
  const header = () => root('cliente').querySelector('.section-card__toggle') as HTMLButtonElement;
  const more = () => root('cliente').querySelector('.cliente-details-toggle') as HTMLButtonElement;
  const full = { ...client, nome: 'Pedro de Lara da Silva com um nome muito longo para a tela estreita', documento: '123.456.789-01', email: 'pedro@exemplo.com',
    enderecoPrincipal: { logradouro: 'Rua das Flores', numero: '25', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG', cep: '30100-000', complemento: 'Sala 2' } };

  it('preserva pesquisa, confirmação e Novo cliente enquanto não existe confirmação', () => {
    expect(body('cliente').hidden).toBeFalse();
    expect(root('cliente').querySelector('app-auto-complete')).not.toBeNull();
    expect(root('cliente').textContent).toContain('Salvar cliente no pedido');
    expect(root('cliente').textContent).toContain('Novo cliente');
    editor.clienteControl.setValue('Pedro'); render();
    expect(body('cliente').hidden).toBeFalse(); expect(more()).toBeNull();
  });

  it('aguarda confirmação real, recolhe e preserva foco, itens e valores', fakeAsync(() => {
    const pending = new Subject<any>(); (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(pending);
    const items = [item()]; editor.itens = items as any; editor.freteControl.setValue(5);
    editor.observacaoClienteControl.setValue('Entregar à tarde');
    selector().onSelecionarCliente(client); render();
    expect(body('cliente').hidden).toBeFalse(); expect(editor.clienteConfirmado).toBeNull();
    pending.next(client); pending.complete(); render(); tick();
    expect(body('cliente').hidden).toBeTrue(); expect(header().getAttribute('aria-expanded')).toBe('false');
    expect(header().textContent).toContain('Pedro de Lara · (31) 98753-1233');
    expect(document.activeElement).toBe(header());
    expect(editor.itens).toBe(items as any); expect(editor.resumoFinanceiroView.total).toBe(55);
    expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde');
    toggle('cliente'); expect(body('cliente').hidden).toBeFalse();
    expect(header().textContent).not.toContain('Pedro de Lara');
    expect(root('cliente').querySelector('.cliente-mobile-summary')?.textContent).toContain('Pedro de Lara');
  }));

  it('não recolhe nem perde a seleção anterior quando a confirmação falha ou a permissão bloqueia', () => {
    (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(throwError(() => new Error('falha')));
    selector().onSelecionarCliente(client); render(); expect(body('cliente').hidden).toBeFalse();
    expect(editor.clienteConfirmado).toBeNull(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
    const spy = TestBed.inject(ClienteService).buscarPorId as jasmine.Spy; spy.calls.reset();
    editor.fluxoPedido = { permissoes: { editarCliente: false } } as any;
    selector().onSelecionarCliente(client); render();
    expect(spy).not.toHaveBeenCalled(); expect(body('cliente').hidden).toBeFalse();
  });

  it('aguarda a associação ao pedido existente antes de recolher a seção', fakeAsync(() => {
    editor.pedidoId = 22; editor.pedido = { id: 22 } as any; render();
    const pending = new Subject<any>(); const service = TestBed.inject(GraficaProdutoService) as any;
    service.alterarClientePedidoComercial = jasmine.createSpy().and.returnValue(pending);
    selector().onSelecionarCliente(client); render(); expect(body('cliente').hidden).toBeFalse();
    expect(service.alterarClientePedidoComercial).toHaveBeenCalledOnceWith(22, 7);
    pending.next({ id: 22, clienteId: 7, clienteNome: client.nome, clienteTelefone: client.telefone, itens: [item()], acrescimo: 0, frete: 0, desconto: 0 });
    pending.complete(); render(); tick(); expect(body('cliente').hidden).toBeTrue(); expect(editor.clienteConfirmado.id).toBe(7);
    expect(editor.itens[0].valorTotal).toBe(50);
    expect(TestBed.inject(PrimeiroPedidoTutorialService).registrarClienteSelecionado).not.toHaveBeenCalled();
  }));

  it('mostra dados principais e expande detalhes existentes sem nova consulta nem linhas vazias', () => {
    (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(of(full)); select(); toggle('cliente');
    const main = root('cliente').querySelector('.cliente-mobile-summary')!;
    expect(main.textContent).toContain(full.nome); expect(main.textContent).toContain(full.documento);
    expect(main.textContent).toContain('Belo Horizonte / MG'); expect(main.textContent).not.toContain(full.email);
    const details = root('cliente').querySelector('.cliente-mobile-details') as HTMLElement;
    expect(details.hidden).toBeTrue(); expect(details.hasAttribute('inert')).toBeTrue();
    expect(more().getAttribute('aria-expanded')).toBe('false');
    more().click(); render(); expect(more().textContent).toContain('Ocultar detalhes');
    expect(more().getAttribute('aria-expanded')).toBe('true'); expect(more().getAttribute('aria-controls')).toBe(details.id);
    expect(details.hidden).toBeFalse(); expect(details.textContent).toContain(full.email);
    for (const value of Object.values(full.enderecoPrincipal).filter(value => !['Belo Horizonte', 'MG'].includes(value))) expect(details.textContent).toContain(value);
    more().click(); render(); expect(details.hidden).toBeTrue(); expect(more().textContent).toContain('Ver mais dados');
    expect(TestBed.inject(ClienteService).buscarPorId).toHaveBeenCalledTimes(1);
  });

  it('omite telefone e ação de detalhes ausentes sem deixar linhas vazias', () => {
    (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(of({ id: 7, nome: 'Cliente sem telefone' })); select();
    expect(header().textContent).toContain('Cliente sem telefone'); expect(header().textContent).not.toContain(' · ');
    toggle('cliente'); expect(root('cliente').querySelectorAll('.cliente-mobile-summary > span').length).toBe(0);
    expect(more()).toBeNull();
  });

  it('usa Trocar cliente como botão de texto e mantém cancelar troca e detalhes em somente leitura', () => {
    (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(of(full)); select(); toggle('cliente');
    const change = root('cliente').querySelector('.cliente-mobile-change') as HTMLButtonElement;
    expect(change.hasAttribute('mat-button')).toBeTrue(); expect(change.hasAttribute('mat-stroked-button')).toBeFalse();
    change.click(); render(); expect(editor.trocandoCliente).toBeTrue(); expect(body('cliente').hidden).toBeFalse();
    expect(root('cliente').querySelector('.editor')).not.toBeNull();
    const cancel = Array.from(root('cliente').querySelectorAll('button')).find(button => button.textContent?.trim() === 'Cancelar')!;
    cancel.click(); render(); expect(editor.trocandoCliente).toBeFalse(); expect(editor.clienteConfirmado.nome).toBe(full.nome);
    expect(editor.clienteControl.value.id).toBe(7);
    editor.fluxoPedido = { permissoes: { editarCliente: false } } as any; render();
    expect((root('cliente').querySelector('.cliente-mobile-change') as HTMLButtonElement).disabled).toBeTrue();
    more().click(); render(); expect(more().getAttribute('aria-expanded')).toBe('true');
  });

  for (const tipo of ['pedidos', 'orcamentos', 'rascunhos'] as const) {
    it(`reutiliza confirmação e recolhimento em ${tipo} sem alterar os demais grupos`, () => {
      editor.tipo = tipo; const sections = { ...editor.mobileSections() }; select();
      expect(body('cliente').hidden).toBeTrue(); expect(editor.clienteConfirmado.id).toBe(7);
      expect(editor.mobileSections()).toEqual({ ...sections, cliente: false });
      expect(root('cliente').querySelector('.info-grid')).toBeNull();
    });
  }

  it('mantém o painel global de cadastro e recolhe somente após retornar cliente salvo', fakeAsync(() => {
    editor.itens = [item()] as any;
    selector().onCriarCliente(); render(); tick(400);
    const dialog = TestBed.inject(MatDialog); const form = dialog.openDialogs[0].componentInstance as ClienteCreateDialogComponent;
    expect(document.querySelector('.mobile-side-panel')).not.toBeNull(); expect(body('cliente').hidden).toBeFalse();
    form.nomeControl.setValue('Pedro de Lara'); form.telefoneControl.setValue('31987531233'); form.salvar(); tick(400); render();
    expect(document.querySelector('.mobile-side-panel')).toBeNull(); expect(body('cliente').hidden).toBeTrue();
    expect(header().textContent).toContain('(31) 98753-1233'); expect(editor.itens.length).toBe(1);
  }));

  it('preserva checkpoint, não reabre durante sua persistência e revela o próximo alvo do tutorial', fakeAsync(() => {
    step.set({ id: 'cliente', targetId: PRIMEIRO_PEDIDO_TARGETS.cliente, title: 'Cliente', description: 'Selecione' }); render(); tick();
    select(); tick(); render(); expect(body('cliente').hidden).toBeTrue();
    expect(TestBed.inject(PrimeiroPedidoTutorialService).registrarClienteSelecionado).toHaveBeenCalledTimes(1);
    editor.setMobileSection('itens', false); render();
    step.set({ id: 'item', targetId: PRIMEIRO_PEDIDO_TARGETS.adicionarItem, title: 'Item', description: 'Adicionar' }); render(); tick(); render();
    expect(body('itens').hidden).toBeFalse(); expect(body('cliente').hidden).toBeTrue();
    step.set({ id: 'cliente-retomada', targetId: PRIMEIRO_PEDIDO_TARGETS.cliente, title: 'Cliente', description: 'Retomar' }); render(); tick();
    expect(body('cliente').hidden).toBeFalse();
    expect(TestBed.inject(TutorialService).refreshTarget).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_TARGETS.cliente);
  }));

  it('mantém desktop completo, ações e ausência de recolhimento automático', () => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(of(full)); select();
    expect(editor.mobileSections().cliente).toBeTrue(); expect(root('cliente').querySelector('.section-card__toggle')).toBeNull();
    expect(root('cliente').querySelector('.info-grid')?.textContent).toContain('Logradouro');
    expect(root('cliente').querySelector('.info-grid')?.textContent).toContain(full.email);
    expect(root('cliente').querySelector('.cliente-mobile-summary')).toBeNull();
    const change = Array.from(root('cliente').querySelectorAll('button')).find(button => button.textContent?.trim() === 'Trocar cliente')!;
    expect(change.hasAttribute('mat-stroked-button')).toBeTrue();
  });

  it('acomoda nome longo e resumo em 320px sem esconder a identificação', () => {
    const frame = document.createElement('iframe'); frame.style.width = '320px'; frame.style.height = '600px'; document.body.appendChild(frame);
    const host = fixture.nativeElement as HTMLElement; const parent = host.parentElement;
    try {
      (TestBed.inject(ClienteService).buscarPorId as jasmine.Spy).and.returnValue(of(full)); select();
      const doc = frame.contentDocument!; document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
      doc.body.style.margin = '0'; doc.body.appendChild(host);
      expect(header().textContent).toContain(full.nome);
      expect(header().scrollWidth).toBeLessThanOrEqual(header().clientWidth);
      expect(header().getBoundingClientRect().height).toBeGreaterThanOrEqual(44);
      toggle('cliente'); const summary = root('cliente').querySelector('.cliente-mobile-summary') as HTMLElement;
      expect(summary.scrollWidth).toBeLessThanOrEqual(summary.clientWidth);
      expect(summary.textContent).toContain(full.nome);
    } finally { if (parent) parent.appendChild(host); frame.remove(); }
  });
});
