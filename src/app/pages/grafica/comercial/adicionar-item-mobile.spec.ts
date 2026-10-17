import { BreakpointObserver } from '@angular/cdk/layout';
import { registerLocaleData } from '@angular/common';
import ptBr from '@angular/common/locales/pt';
import { provideHttpClient } from '@angular/common/http';
import { ApplicationRef, LOCALE_ID, signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { ClienteService } from '../../cliente/cliente.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { ComercialEditorComponent, GraficaProdutoWizardDialogComponent, GraficaServicoWizardDialogComponent } from './comercial-editor.component';
import { GraficaProdutoBuscaRapidaDialogComponent } from './grafica-produto-busca-rapida-dialog.component';
import { PrimeiroPedidoTutorialService, PRIMEIRO_PEDIDO_TARGETS } from './primeiro-pedido/primeiro-pedido-tutorial.service';

describe('Adicionar item no painel mobile compartilhado', () => {
  let fixture: ComponentFixture<ComercialEditorComponent>;
  let editor: ComercialEditorComponent;
  let dialog: MatDialog;
  let viewport: BehaviorSubject<any>;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let composition: Subject<any>;
  const product = { id: 77, catalogoProdutoNome: 'Panfleto com nome completo para configuração', ativo: true, parametros: [], acabamentos: [] };
  const policy = { id: 9, nome: 'Preço', tipo: 'FIXO', ativo: true, valorFixo: 10, multiplicaQuantidade: true, selecoes: [], faixas: [], lotes: [] };
  const existing = { nomeProduto: 'Existente', quantidade: 1, valorUnitario: 5, valorTotal: 5 };
  const added = { nomeProduto: product.catalogoProdutoNome, quantidade: 1, valorUnitario: 10, valorTotal: 10 };
  const query = (selector: string) => document.querySelector<HTMLElement>(selector)!;
  const render = () => { fixture.detectChanges(); TestBed.inject(ApplicationRef).tick(); };
  const next = () => { query('.wizard-footer .primary-action').click(); render(); tick(300); render(); };
  function open(): GraficaProdutoWizardDialogComponent {
    editor.abrirWizard(); render(); tick(450); render();
    return dialog.openDialogs[0].componentInstance;
  }
  beforeEach(() => {
    registerLocaleData(ptBr, 'pt-BR'); viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    composition = new Subject();
    service = jasmine.createSpyObj('GraficaProdutoService', ['listarFormasPagamento', 'listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar', 'resolverOpcoes', 'resolverComposicaoComercial', 'precificarServico', 'resolverComposicaoServico']);
    service.listarFormasPagamento.and.returnValue(of(['PIX']));
    service.listar.and.returnValue(of({ content: [product], last: true } as any));
    service.listarServicos.and.returnValue(of([])); service.detalhar.and.returnValue(of(product as any));
    service.listarPrecos.and.returnValue(of([policy] as any));
    service.resolverOpcoes.and.returnValue(of({ opcoes: [], proximoParametro: null } as any));
    service.precificar.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 1, valorUnitario: 10, valorTotal: 10, detalhes: [], selecoesResolvidas: [] } as any));
    service.resolverComposicaoComercial.and.returnValue(composition);
    service.precificarServico.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 1, valorTotal: 10 } as any));
    service.resolverComposicaoServico.and.returnValue(composition);
    TestBed.configureTestingModule({ imports: [ComercialEditorComponent, NoopAnimationsModule], providers: [
      provideRouter([]), provideHttpClient(), { provide: LOCALE_ID, useValue: 'pt-BR' },
      { provide: ActivatedRoute, useValue: { data: of({ tipo: 'pedidos' }), paramMap: of(new Map()) } },
      { provide: BreakpointObserver, useValue: { observe: () => viewport } },
      { provide: GraficaProdutoService, useValue: service },
      { provide: ClienteService, useValue: { buscarPorNome: () => of({ content: [] }) } },
      { provide: AuthService, useValue: { getUsuario: () => ({ proprietario: true }), temPermissao: () => true } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy(), success: jasmine.createSpy() } },
      { provide: PrimeiroPedidoTutorialService, useValue: jasmine.createSpyObj('PrimeiroPedido', ['iniciarSeNecessario', 'registrarNovoPedido', 'registrarConfiguradorAberto', 'registrarItemAdicionado']) },
      { provide: TutorialService, useValue: { registerTarget: jasmine.createSpy().and.returnValue(() => {}), refreshTarget: () => {}, state: signal({ definition: null }), isActive: signal(false), currentStep: signal(null), rect: signal(null), currentIndex: signal(0), totalSteps: signal(0), canGoBack: signal(false), isLastStep: signal(false) } },
    ] });
    fixture = TestBed.createComponent(ComercialEditorComponent); editor = fixture.componentInstance; render();
    dialog = fixture.debugElement.injector.get(MatDialog);
    editor.clienteConfirmado = { id: 7, nome: 'Ana' }; editor.itens = [existing] as any;
    editor.observacaoClienteControl.setValue('Entregar à tarde');
  });
  afterEach(() => TestBed.resetTestingModule());

  for (const type of ['pedidos', 'orcamentos', 'rascunhos'] as const) {
    it(`abre painel compartilhado e cancela sem alterar ${type}`, fakeAsync(() => {
      editor.tipo = type; const wizard = open();
      expect(wizard.data.mobilePanel).toBeTrue();
      expect(query('.mobile-side-panel')).toBeTruthy(); expect(document.querySelector('.dialog-grande')).toBeNull();
      expect(query('.dialog-header h2').textContent!.trim()).toBe('Adicionar item');
      expect(query('.wizard-body').contains(query('.wizard-footer'))).toBeFalse();
      expect(query('.wizard-footer .primary-action').hasAttribute('disabled')).toBeTrue();
      expect(wizard.stepper?.steps.length).toBe(4);
      query('.wizard-footer button[mat-dialog-close]').click(); tick(400); render();
      expect(document.querySelector('.mobile-side-panel')).toBeNull();
      expect(editor.itens).toEqual([existing] as any); expect(editor.clienteConfirmado?.id).toBe(7);
      expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde');
    }));
  }

  it('mantém busca, seleção, navegação, espera da revisão e adição única', fakeAsync(() => {
    const wizard = open();
    const search = query('.funnel-search input') as HTMLInputElement;
    search.value = 'inexistente'; search.dispatchEvent(new Event('input', { bubbles: true })); render();
    expect(query('.funnel-list').textContent).toContain('Nenhum item encontrado');
    search.value = 'Panfleto'; search.dispatchEvent(new Event('input', { bubbles: true })); render();
    query('.funnel-option').click(); render(); tick(300); render();
    expect(wizard.produtoSelecionado?.id).toBe(77);
    if (wizard.isFirstStep) next();
    expect(wizard.stepper?.selectedIndex).toBe(1); expect(wizard.preco?.valorTotal).toBe(10);
    query('.wizard-footer > button').click(); render(); tick(300);
    expect(wizard.stepper?.selectedIndex).toBe(0); next(); next();
    expect(service.resolverComposicaoComercial).toHaveBeenCalledTimes(1);
    expect(editor.itens.length).toBe(1); expect(dialog.openDialogs.length).toBe(1);
    composition.next({ itens: [added] }); composition.complete(); tick(300); render();
    expect(wizard.stepper?.selectedIndex).toBe(3);
    const finish = query('.wizard-footer .primary-action'); finish.click(); finish.click(); tick(400); render();
    expect(editor.itens).toEqual([existing, jasmine.objectContaining(added)] as any);
    expect(editor.clienteConfirmado?.id).toBe(7); expect(editor.observacaoClienteControl.value).toBe('Entregar à tarde');
    const tutorial = TestBed.inject(PrimeiroPedidoTutorialService);
    expect(tutorial.registrarConfiguradorAberto).toHaveBeenCalledTimes(1);
    expect(tutorial.registrarItemAdicionado).toHaveBeenCalledTimes(1);
  }));

  it('mostra um quadro por vez, desliza pelas variações e permite revisar escolhas', fakeAsync(() => {
    const variants: any[] = [];
    for (const material of [{ id: 1, nome: 'Couchê' }, { id: 2, nome: 'Adesivo' }]) {
      for (const formato of [{ id: 3, nome: 'A5' }, { id: 4, nome: 'A6' }]) {
        for (const cor of [{ id: 5, nome: '4x0' }, { id: 6, nome: '4x4' }]) {
          variants.push({ ...product, id: 77 + variants.length, material, formato, cor });
        }
      }
    }
    service.listar.and.returnValue(of({ content: variants, last: true } as any));
    const wizard = open();
    expect(wizard.mobileFunnelStage).toBe('produto');
    query('.funnel-column--current .funnel-option').click(); render(); tick(300); render();
    expect(wizard.mobileFunnelStage).toBe('material');
    expect(query('.funnel-track').style.transform).toBe('translateX(-100%)');
    expect(query('[data-funnel-stage="produto"]').hasAttribute('inert')).toBeTrue();
    expect(document.activeElement).toBe(query('.funnel-column--current .rev-title'));
    const materialSearch = query('.funnel-column--current input') as HTMLInputElement;
    materialSearch.value = 'inexistente'; materialSearch.dispatchEvent(new Event('input', { bubbles: true })); render();
    expect(wizard.mobileFunnelStage).toBe('material');
    expect(query('.funnel-column--current').textContent).toContain('Nenhum material encontrado');
    materialSearch.value = ''; materialSearch.dispatchEvent(new Event('input', { bubbles: true })); render();
    query('.funnel-column--current .funnel-option').click(); render(); tick(300); render();
    expect(wizard.mobileFunnelStage).toBe('formato');
    query('.funnel-column--current .funnel-option').click(); render(); tick(300); render();
    expect(wizard.mobileFunnelStage).toBe('cor');
    query('.wizard-footer > button').click(); render(); tick(300); render();
    expect(wizard.mobileFunnelStage).toBe('formato');
    query('.wizard-footer > button').click(); render(); tick(300); render();
    expect(wizard.mobileFunnelStage).toBe('material');
    wizard.selecionarMaterialFunil(wizard.opcoesFunil('material')[1]); render(); tick(300); render();
    expect(wizard.formatoSelecionadoId).toBeNull(); expect(wizard.corSelecionadaId).toBeNull();
    expect(wizard.mobileFunnelStage).toBe('formato');
    query('.funnel-column--current .funnel-option').click(); render(); tick(300); render();
    query('.funnel-column--current .funnel-option').click(); render(); tick(300); render();
    expect(wizard.stepper?.selectedIndex).toBe(1);
    dialog.closeAll(); tick(400);
  }));

  it('preenche a área do painel com opções sem depender da altura inicial da lista', fakeAsync(() => {
    const wizard = open();
    wizard.produtosFunil = Array.from({ length: 90 }, (_, i) => ({ ...product, id: i + 1, catalogoProdutoNome: `Adesivo ${String(i + 1).padStart(2, '0')}` } as any));
    dialog.openDialogs[0].updateSize('360px', '840px');
    // Override the headless browser's 100dvh cap to model the phone's usable height.
    query('.mobile-side-panel').style.maxHeight = '840px';
    render(); tick(500); render();
    const body = query('.wizard-body');
    const step = query('.mat-horizontal-stepper-content:not(.mat-horizontal-stepper-content-inactive)');
    const grid = query('.funnel-grid');
    const list = query('.funnel-column--current .funnel-list');
    expect(grid.clientHeight).withContext('quadro deve ocupar a área central, independente de quantas opções existiam').toBeGreaterThan(400);
    expect(list.clientHeight).toBeGreaterThan(300);
    expect(step.clientHeight).toBeGreaterThan(body.clientHeight * 0.6);
    expect(wizard.itensPorPaginaFunil).toBeGreaterThan(6);
    expect(query('.funnel-column--current .funnel-pager').getBoundingClientRect().bottom)
      .toBeGreaterThan(body.getBoundingClientRect().bottom - 24);
    const originalHeight = grid.clientHeight;
    wizard.proximaPaginaFunil('produto'); render(); tick(400); render();
    expect(grid.clientHeight).toBe(originalHeight);
    expect(wizard.itensPorPaginaFunil).toBeGreaterThan(6);
    dialog.closeAll(); tick(400);
  }));

  it('ajusta a paginação à altura disponível sem perder o acesso às opções', fakeAsync(() => {
    const wizard = open();
    wizard.produtosFunil = Array.from({ length: 7 }, (_, i) => ({ ...product, id: i + 1, catalogoProdutoNome: `Produto ${i + 1}` } as any));
    render();
    const list = query('.funnel-column--current .funnel-list');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 126 });
    Object.defineProperty(list, 'clientWidth', { configurable: true, value: 300 });
    list.querySelectorAll<HTMLElement>('.funnel-option').forEach(option => Object.defineProperty(option, 'offsetHeight', { configurable: true, value: 44 }));
    // A narrow initial layout must not permanently reserve oversized rows.
    (wizard as any).mobileRowMeasurementKey = 'produto:180';
    (wizard as any).mobileOptionHeight = 144;
    (wizard as any).fitMobileFunnel();
    expect(wizard.itensPorPaginaFunil).toBe(2); expect(wizard.totalPaginasFunil('produto')).toBe(4);
    wizard.proximaPaginaFunil('produto'); expect(wizard.opcoesPaginadas('produto')[0].label).toBe('Produto 3');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 76 });
    (wizard as any).fitMobileFunnel();
    expect(wizard.itensPorPaginaFunil).toBe(1); expect(wizard.opcoesPaginadas('produto')[0].label).toBe('Produto 3');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 516 });
    (wizard as any).fitMobileFunnel();
    expect(wizard.itensPorPaginaFunil).toBe(10);
    expect(wizard.opcoesPaginadas('produto').length).toBe(7);
    expect(wizard.opcoesPaginadas('produto').some(option => option.label === 'Produto 3')).toBeTrue();
    dialog.closeAll(); tick(400);
  }));

  for (const close of ['X', 'Escape'] as const) {
    it(`fecha por ${close} sem incluir item e mantém âncora do tutorial`, fakeAsync(() => {
      open();
      expect(TestBed.inject(TutorialService).registerTarget).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_TARGETS.configurador, jasmine.anything());
      if (close === 'X') query('.dialog-header button[aria-label="Fechar"]').click();
      else query('.mobile-side-panel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      tick(400); render();
      expect(document.querySelector('.mobile-side-panel')).toBeNull(); expect(editor.itens).toEqual([existing] as any);
    }));
  }

  it('mantém modal e dimensões desktop do produto', () => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    const spy = spyOn(dialog, 'open').and.returnValue({ afterClosed: () => of(null) } as any);
    editor.abrirWizard();
    expect(spy).toHaveBeenCalledWith(GraficaProdutoWizardDialogComponent, jasmine.objectContaining({
      width: 'min(1720px, calc(100vw - 104px))', height: 'min(900px, calc(100dvh - 96px))',
      maxWidth: '96vw', maxHeight: '92vh', panelClass: ['dialog-grande', 'grafica-produto-wizard-panel'],
    }));
    expect((spy.calls.mostRecent().args[1]?.data as any)?.mobilePanel).toBeUndefined();
  });

  it('abre serviço da busca rápida no painel e inclui só após confirmação', fakeAsync(() => {
    const realOpen = dialog.open.bind(dialog);
    spyOn(dialog, 'open').and.callFake(((component: any, config: any) => component === GraficaProdutoBuscaRapidaDialogComponent
      ? { afterClosed: () => of({ tipo: 'SERVICO', servico: { id: 8, nome: 'Serviço de acabamento', politicas: [policy] } }) }
      : realOpen(component, config)) as any);
    editor.abrirBuscaRapida(); render(); tick(400); render();
    const wizard = dialog.openDialogs[0].componentInstance as GraficaServicoWizardDialogComponent;
    expect(query('.service-wizard__header h2').textContent).toBe('Adicionar item');
    expect(wizard.data.mobilePanel).toBeTrue(); wizard.calcular(); render();
    query('.service-wizard__actions button[mat-flat-button]').click(); render();
    expect(editor.itens.length).toBe(1); expect(dialog.openDialogs.length).toBe(1);
    composition.next({ itens: [added] }); composition.complete(); tick(400); render();
    expect(editor.itens.length).toBe(2); expect(document.querySelector('.mobile-side-panel')).toBeNull();
  }));
});
