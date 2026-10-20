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

    it(`preserva o resultado por faixa ao retornar para ${type}`, fakeAsync(() => {
      editor.tipo = type;
      service.listarPrecos.and.returnValue(of([{ ...policy, tipo: 'POR_FAIXA_QUANTIDADE', faixas: [
        { inicio: 1, fim: 10, valorUnitario: 0.9 }, { inicio: 50, fim: 299, valorUnitario: 0.45 },
      ] }] as any));
      service.precificar.and.callFake((_id, body) => of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: body.quantidade,
        valorUnitario: body.quantidade === 250 ? 0.45 : 0.9, valorTotal: body.quantidade === 250 ? 112.5 : 0.9,
        detalhes: [body.quantidade === 250 ? 'Faixa aplicada: 50–299' : 'Faixa aplicada: 1–10'], selecoesResolvidas: [],
      } as any));
      const wizard = open(); query('.funnel-option').click(); render(); tick(300); render();
      if (wizard.isFirstStep) next();
      const input = query('.quantity-input input') as HTMLInputElement;
      input.value = '250'; input.dispatchEvent(new Event('input')); render(); tick(300); render();
      expect(query('.quantity-applied-range').textContent).toContain('50 a 299 un');
      expect(query('.price-step .summary-price-total').textContent).toContain('112,50');
      next(); composition.next({ itens: [{ ...added, quantidade: 250, valorUnitario: 0.45, valorTotal: 112.5 }] });
      composition.complete(); tick(300); render(); expect(wizard.stepper?.selectedIndex).toBe(3);
      next(); tick(400); render();
      expect(editor.itens[1]).toEqual(jasmine.objectContaining({ quantidade: 250, valorUnitario: 0.45, valorTotal: 112.5 }));
      expect(service.precificar).toHaveBeenCalledTimes(2); expect(editor.tipo).toBe(type);
    }));

    it(`preserva o preço fechado do lote ao retornar para ${type}`, fakeAsync(() => {
      editor.tipo = type;
      service.listarPrecos.and.returnValue(of([{ ...policy, tipo: 'POR_LOTE', lotes: [{ quantidade: 250, valorLote: 145 }] }] as any));
      service.precificar.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 250, valorUnitario: 0.58, valorTotal: 145, detalhes: [], selecoesResolvidas: [] } as any));
      const wizard = open();
      query('.funnel-option').click(); render(); tick(300); render();
      if (wizard.isFirstStep) next();
      expect(document.querySelector('.price-step .price-summary-card')).toBeNull();
      query('.lot-card').click(); render(); tick(300); render();
      expect(query('.price-step .summary-price-total').textContent).toContain('145,00');
      next();
      composition.next({ itens: [{ ...added, quantidade: 250, valorUnitario: 0.58, valorTotal: 145 }] });
      composition.complete(); tick(300); render();
      expect(wizard.stepper?.selectedIndex).toBe(3); next(); tick(400); render();
      expect(editor.itens[1]).toEqual(jasmine.objectContaining({ quantidade: 250, valorUnitario: 0.58, valorTotal: 145 }));
      expect(editor.itens.length).toBe(2); expect(service.precificar).toHaveBeenCalledTimes(1);
      expect(editor.tipo).toBe(type);
    }));

    it(`inclui o acabamento selecionado na composição de ${type}`, fakeAsync(() => {
      editor.tipo = type;
      service.detalhar.and.returnValue(of({ ...product, acabamentos: [
        { id: 1, nome: 'Corte', descricao: 'Corte reto', formaAplicacao: 'POR_FOLHA', ativo: true, ordem: 0, politicas: [policy] },
      ] } as any));
      const wizard = open();
      query('.funnel-option').click(); render(); tick(300); render();
      if (wizard.isFirstStep) next();
      next(); expect(wizard.stepper?.selectedIndex).toBe(2);
      query('.service-mobile-option .opt-name').click(); render();
      expect(wizard.acabamentoSelecionado(1)).toBeTrue();
      next(); composition.next({ itens: [added] }); composition.complete(); tick(300); render();
      expect(wizard.stepper?.selectedIndex).toBe(3);
      expect(query('.wizard-footer .primary-action').textContent?.trim()).toBe('Adicionar item');
      next(); tick(400); render();
      expect(editor.tipo).toBe(type);
      expect(editor.itens.length).toBe(3);
      expect(editor.itens[2]).toEqual(jasmine.objectContaining({ nomeProduto: 'Acabamento: Corte', quantidade: 1, valorUnitario: 10, valorTotal: 10 }));
      expect(editor.clienteConfirmado?.id).toBe(7);
      expect(dialog.openDialogs.length).toBe(0);
    }));
  }

  for (const [width, height] of [[320, 700], [360, 740], [390, 844]]) {
    it(`mantém revisão extensa acessível na rolagem principal em ${width}x${height}`, fakeAsync(() => {
      const wizard = open();
      dialog.openDialogs[0].updateSize(`${width}px`, `${height}px`);
      query('.mobile-side-panel').style.maxHeight = `${height}px`;
      query('.funnel-option').click(); render(); tick(300); render();
      if (wizard.isFirstStep) next();
      next();
      const items = Array.from({ length: 20 }, (_, index) => ({
        nomeProduto: `Item ${index + 1} com descrição longa para revisão completa`,
        caracteristicasResumo: 'Configuração completa, incluindo material, formato, cor e outras opções selecionadas.',
        unidadeVenda: 'M2', quantidade: 1.25, valorUnitario: 10, valorTotal: 12.5,
      }));
      composition.next({ itens: items }); composition.complete(); tick(300); render();
      expect(wizard.stepper?.selectedIndex).toBe(3);
      const body = query('.wizard-body');
      const list = query('.review-mobile-list');
      expect(list.children.length).toBe(20);
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
      expect(body.scrollHeight).toBeGreaterThan(body.clientHeight);
      expect(getComputedStyle(list).overflowY).toBe('visible');
      expect(getComputedStyle(query('.review-items-card')).overflowY).toBe('visible');
      body.scrollTop = body.scrollHeight;
      const last = list.lastElementChild!.getBoundingClientRect();
      const summary = query('.review-step .price-summary-card').getBoundingClientRect();
      expect(last.top).toBeGreaterThanOrEqual(body.getBoundingClientRect().top);
      expect(last.bottom).toBeLessThanOrEqual(body.getBoundingClientRect().bottom);
      expect(summary.bottom).toBeLessThanOrEqual(body.getBoundingClientRect().bottom);
      expect(query('.wizard-footer').getBoundingClientRect().top).toBeGreaterThanOrEqual(body.getBoundingClientRect().bottom);
      expect(query('.dialog-header').getBoundingClientRect().bottom).toBeLessThanOrEqual(body.getBoundingClientRect().top);
      const label = query('.primary-action .mdc-button__label');
      expect(label.textContent?.trim()).toBe('Adicionar item');
      expect(label.getBoundingClientRect().width).toBeLessThanOrEqual(query('.primary-action').clientWidth - 16);
      expect(query('.review-step .summary-price-total').textContent).toContain('250,00');
      expect(document.querySelectorAll('.review-step .summary-price-total').length).toBe(1);
      expect(list.lastElementChild!.textContent).toContain('1,25 M2');
      expect(list.lastElementChild!.textContent).toContain('12,50');
      query('.wizard-footer button[mat-dialog-close]').click(); tick(400); render();
      expect(editor.itens).toEqual([existing] as any);
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

  for (const [width, height] of [[360, 740], [390, 844], [320, 700]]) {
    it(`acomoda item, quantidade e resumo do preço fixo sem rolagem em ${width}x${height}`, fakeAsync(() => {
      service.precificar.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 1, valorUnitario: 10, valorTotal: 10, regraAplicadaNome: 'Preço principal', detalhes: [], selecoesResolvidas: [] } as any));
      const wizard = open();
      spyOnProperty(wizard, 'itemSelecionadoResumo', 'get').and.returnValue('Couchê Adesivo / A4 / Colorido Frente (4x0)');
      dialog.openDialogs[0].updateSize(`${width}px`, `${height}px`);
      query('.mobile-side-panel').style.maxHeight = `${height}px`;
      query('.funnel-option').click(); render(); tick(400); render();
      if (wizard.isFirstStep) next();
      expect(wizard.stepper?.selectedIndex).toBe(1);
      const body = query('.wizard-body');
      body.scrollTop = 0;
      const summary = query('.price-summary-card').getBoundingClientRect();
      const field = query('.price-config-card--fixed mat-form-field').getBoundingClientRect();
      const calculate = query('.price-config-card--fixed button');
      const button = calculate.getBoundingClientRect();
      expect(body.scrollHeight).withContext('o conteúdo completo deve caber sem ocultação').toBeLessThanOrEqual(body.clientHeight + 1);
      expect(summary.bottom).toBeLessThanOrEqual(body.getBoundingClientRect().bottom);
      expect(button.top).toBeLessThan(field.bottom);
      expect(button.left).toBeGreaterThanOrEqual(field.right);
      expect(button.height).toBeGreaterThanOrEqual(44);
      expect(query('.price-product-card').textContent).toContain(product.catalogoProdutoNome);
      expect(query('.summary-rule').textContent).toContain('Preço principal');
      expect(query('.summary-price-total').textContent).toContain('10,00');
      document.querySelectorAll<HTMLElement>('.mat-step-text-label').forEach(label => {
        expect(label.getBoundingClientRect().height).withContext('rótulos mobile devem ocupar uma linha').toBeLessThanOrEqual(22);
      });
      service.precificar.calls.reset(); calculate.click(); render(); tick(300); render();
      expect(service.precificar).toHaveBeenCalledTimes(1);
      expect(query('.wizard-footer .primary-action').hasAttribute('disabled')).toBeFalse();
      dialog.closeAll(); tick(400);
    }));
  }

  it('preserva a apresentação desktop do preço fixo', fakeAsync(() => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    const wizard = open();
    query('.funnel-option').click(); render(); tick(400); render();
    if (wizard.isFirstStep) next();
    expect(wizard.stepper?.selectedIndex).toBe(1);
    expect(getComputedStyle(query('.price-config-card')).display).toBe('flex');
    expect(getComputedStyle(query('.price-config-card')).minHeight).toBe('330px');
    expect(getComputedStyle(query('.price-product-card .rev-title')).display).not.toBe('none');
    dialog.closeAll(); tick(400);
  }));

  for (const tipo of ['POR_FAIXA_QUANTIDADE', 'POR_LOTE', 'POR_METRO_QUADRADO']) {
    it(`mantém campos e detalhes de ${tipo} dentro da largura mobile`, fakeAsync(() => {
      service.listarPrecos.and.returnValue(of([{ ...policy, tipo,
        faixas: [{ inicio: 1, fim: 100, valorUnitario: 10 }],
        lotes: [{ quantidade: 50, valorLote: 500 }],
      }] as any));
      if (tipo === 'POR_FAIXA_QUANTIDADE') service.precificar.and.returnValue(of({ status: 'PRECO_CALCULADO', quantidadeSolicitada: 1, valorUnitario: 10, valorTotal: 10, detalhes: ['Faixa aplicada: 1–100'], selecoesResolvidas: [] } as any));
      const wizard = open();
      dialog.openDialogs[0].updateSize('360px', '800px');
      query('.mobile-side-panel').style.maxHeight = '800px';
      query('.funnel-option').click(); render(); tick(400); render();
      if (wizard.isFirstStep) next();
      const body = query('.wizard-body');
      expect(body.scrollWidth).toBeLessThanOrEqual(body.clientWidth);
      document.querySelectorAll<HTMLElement>('.price-config-card input').forEach((input, index) => {
        const rect = input.getBoundingClientRect();
        expect(rect.width).toBeGreaterThanOrEqual(100);
        expect(rect.right).toBeLessThanOrEqual(body.getBoundingClientRect().right);
        expect(input.getAttribute('inputmode')).toBe(tipo === 'POR_METRO_QUADRADO' && index < 2 ? 'decimal' : 'numeric');
      });
      if (tipo === 'POR_FAIXA_QUANTIDADE') {
        expect(query('.price-range-row.active').textContent).toContain('1 a 100 un');
        expect(getComputedStyle(query('.quantity-keypad')).display).toBe('none');
        const field = query('.quantity-entry-row app-input-numerico').getBoundingClientRect();
        expect(query('.quantity-entry-row button').getBoundingClientRect().left).toBeGreaterThanOrEqual(field.right);
      } else if (tipo === 'POR_LOTE') {
        query('.lot-card').click(); render(); tick(300); render();
        expect(wizard.quantidadeForm.controls.quantidade.value).toBe(50);
        expect(query('.price-summary-card').textContent).toContain('Quantidade do lote');
      } else {
        expect(document.querySelectorAll('.price-inputs input').length).toBe(3);
        expect(query('.price-inputs').textContent).toContain('Largura');
        expect(query('.price-inputs').textContent).toContain('Altura');
        expect(query('.measure-rules-panel')).toBeTruthy();
        expect(query('.wizard-footer .primary-action').hasAttribute('disabled')).toBeTrue();
      }
      dialog.closeAll(); tick(400);
    }));
  }

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
    const rows = Array.from(list.querySelectorAll<HTMLElement>('.funnel-option'));
    const listStyle = getComputedStyle(list);
    const used = rows.reduce((total, row) => total + row.offsetHeight, 0) + Math.max(0, rows.length - 1) * (parseFloat(listStyle.rowGap) || 0);
    const available = list.clientHeight - parseFloat(listStyle.paddingTop) - parseFloat(listStyle.paddingBottom);
    expect(available - used).withContext(`espaço vazio: ${available - used}px; opções: ${rows.length}; alturas: ${rows.map(row => row.offsetHeight)}`).toBeLessThan(48);
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

    (wizard as any).fitFunnel();
    expect(wizard.itensPorPaginaFunil).toBe(2); expect(wizard.totalPaginasFunil('produto')).toBe(4);
    wizard.proximaPaginaFunil('produto'); expect(wizard.opcoesPaginadas('produto')[0].label).toBe('Produto 3');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 76 });
    (wizard as any).fitFunnel();
    expect(wizard.itensPorPaginaFunil).toBe(1); expect(wizard.opcoesPaginadas('produto')[0].label).toBe('Produto 3');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 516 });
    (wizard as any).fitFunnel();
    expect(wizard.itensPorPaginaFunil).toBe(7);
    expect(wizard.opcoesPaginadas('produto').length).toBe(7);
    expect(wizard.opcoesPaginadas('produto').some(option => option.label === 'Produto 3')).toBeTrue();
    dialog.closeAll(); tick(400);
  }));

  it('mede cada opção sem reservar a altura de um nome longo para todas as linhas', fakeAsync(() => {
    const wizard = open();
    wizard.produtosFunil = Array.from({ length: 20 }, (_, i) => ({ ...product, id: i + 1,
      catalogoProdutoNome: `Adesivo ${String(i + 1).padStart(2, '0')}` } as any)); render();
    const list = query('.funnel-column--current .funnel-list');
    Object.defineProperty(list, 'clientHeight', { configurable: true, value: 300 });
    const row = list.querySelector<HTMLElement>('.funnel-option')!;
    Object.defineProperty(row, 'offsetHeight', { configurable: true, value: 140 });
    (wizard as any).fitFunnel();
    expect(wizard.opcoesPaginadas('produto').length).toBe(4);
    Object.defineProperty(row, 'offsetHeight', { configurable: true, value: 44 });
    (wizard as any).fitFunnel();
    expect(wizard.opcoesPaginadas('produto').length).toBe(6);
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

  it('aproveita a altura da lista desktop em vez de limitar a seis opções', fakeAsync(() => {
    viewport.next({ matches: false, breakpoints: {} }); render();
    service.listar.and.returnValue(of({ content: Array.from({ length: 90 }, (_, i) => ({ ...product,
      id: i + 1, catalogoProdutoNome: `Adesivo ${String(i + 1).padStart(2, '0')}` })), last: true } as any));
    const wizard = open(); render(); tick(400); render();
    const list = query('.funnel-list');
    const rows = Array.from(list.querySelectorAll<HTMLElement>('.funnel-option'));
    const style = getComputedStyle(list);
    const gap = parseFloat(style.rowGap) || 0;
    const available = list.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
    const used = rows.reduce((total, row) => total + row.offsetHeight, 0) + (rows.length - 1) * gap;
    expect(rows.length).toBeGreaterThan(6);
    expect(available - used).toBeLessThan(rows[0].offsetHeight + gap);
    expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight);
    expect(wizard.totalPaginasFunil('produto')).toBeLessThan(15);
    dialog.closeAll(); tick(400);
  }));

  for (const mobile of [true, false]) {
    it(`mantém nomes e estado corretos em todas as etapas no ${mobile ? 'mobile' : 'desktop'}`, fakeAsync(() => {
      viewport.next({ matches: mobile, breakpoints: {} }); render();
      const wizard = open();
      const labels = [mobile ? 'Produto' : 'Produto/serviço', 'Preço', 'Adicionais', 'Revisão'];
      const selected = () => Array.from(document.querySelectorAll('.mat-step-header')).map((header, index) => header.getAttribute('aria-selected') === 'true' ? index : -1).filter(index => index >= 0);
      expect(wizard.stepper?.steps.map(step => step.label)).toEqual(labels);
      expect(wizard.stepper?.labelPosition).toBe('bottom');
      expect(selected()).toEqual([0]); expect(wizard.stepper?.steps.get(2)?.completed).toBeFalse();
      document.querySelectorAll<HTMLElement>('.mat-step-header').forEach(header => {
        const label = header.querySelector<HTMLElement>('.mat-step-text-label')!;
        expect(label.getBoundingClientRect().bottom).toBeLessThanOrEqual(header.getBoundingClientRect().bottom + 1);
      });
      expect(document.querySelectorAll('.mat-step-icon-state-edit').length).toBe(0);
      const withExtras = { ...product, acabamentos: [{ id: 1, nome: 'Corte', ativo: true, ordem: 0, formaAplicacao: 'POR_SERVICO', politicas: [] }] };
      service.detalhar.and.returnValue(of(withExtras as any));
      wizard.selecionarProduto(withExtras as any, true); render(); next();
      expect(selected()).toEqual([1]); expect(wizard.currentStepLabel).toBe('Preço');
      expect(wizard.stepper?.steps.get(2)?.completed).toBeFalse();
      next();
      expect(selected()).toEqual([2]); expect(wizard.currentStepLabel).toBe('Adicionais');
      expect(wizard.stepper?.steps.get(0)?.completed).toBeTrue();
      expect(wizard.stepper?.steps.get(1)?.completed).toBeTrue();
      next(); composition.next({ itens: [added] }); composition.complete(); tick(300); render();
      expect(selected()).toEqual([3]); expect(wizard.currentStepLabel).toBe('Revisão');
      expect(wizard.stepper?.steps.get(2)?.completed).toBeTrue();
      wizard.adicionarMaisItens(); tick(300); render();
      expect(selected()).toEqual([0]); expect(wizard.currentStepLabel).toBe('Produto/serviço');
      expect(wizard.stepper?.steps.toArray().every(step => !step.completed)).toBeTrue();
      dialog.closeAll(); tick(400);
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
