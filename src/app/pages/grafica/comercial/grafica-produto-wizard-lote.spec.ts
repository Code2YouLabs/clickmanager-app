import { registerLocaleData } from '@angular/common';
import pt from '@angular/common/locales/pt';
import { signal } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoWizardDialogComponent } from './comercial-editor.component';

registerLocaleData(pt);

describe('Wizard: lote mobile', () => {
  let fixture: ComponentFixture<GraficaProdutoWizardDialogComponent>;
  let wizard: GraficaProdutoWizardDialogComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let product: any;
  let policy: any;
  const lots = [{ id: 1, quantidade: 100, valorLote: 81 }, { id: 2, quantidade: 250, valorLote: 145 }, { id: 3, quantidade: 500, valorLote: 232 }];
  const prices = [{ quantidadeSolicitada: 100, valorUnitario: 0.81, valorTotal: 81 }, { quantidadeSolicitada: 250, valorUnitario: 0.58, valorTotal: 145 }, { quantidadeSolicitada: 500, valorUnitario: 0.46, valorTotal: 232 }];
  const result = (index: number) => ({ ...prices[index], status: 'PRECO_CALCULADO', detalhes: [], selecoesResolvidas: [] });
  const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const buttons = () => Array.from(fixture.nativeElement.querySelectorAll('.lot-card')) as HTMLButtonElement[];
  const render = () => fixture.detectChanges();
  function enter() { render(); tick(300); render(); }
  function select(index: number) { buttons()[index].click(); render(); tick(300); render(); }
  function next() { query('.wizard-footer .primary-action').click(); render(); tick(300); render(); }
  function back() { query('.wizard-footer > button').click(); render(); tick(300); render(); }

  beforeEach(async () => {
    product = { id: 77, catalogoProdutoNome: 'Cartão de Visita', ativo: true, parametros: [], acabamentos: [] };
    policy = { id: 9, tipo: 'POR_LOTE', nome: 'Lotes', ativo: true, selecoes: [], lotes: lots.map(lote => ({ ...lote })) };
    service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar', 'resolverComposicaoComercial']);
    service.listar.and.returnValue(of({ content: [] } as any)); service.listarServicos.and.returnValue(of([]));
    service.detalhar.and.callFake(() => of(product)); service.listarPrecos.and.callFake(() => of([policy]));
    service.precificar.and.callFake((_id, body) => of(result(lots.findIndex(lote => lote.quantidade === body.quantidade)) as any));
    service.resolverComposicaoComercial.and.callFake((_id, body) => {
      const price = prices.find(value => value.quantidadeSolicitada === body.precificacao.quantidade)!;
      return of({ itens: [{ nomeProduto: product.catalogoProdutoNome, quantidade: price.quantidadeSolicitada, valorUnitario: price.valorUnitario, valorTotal: price.valorTotal }] } as any);
    });
    await TestBed.configureTestingModule({ imports: [GraficaProdutoWizardDialogComponent], providers: [
      provideNoopAnimations(), { provide: GraficaProdutoService, useValue: service },
      { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      { provide: MAT_DIALOG_DATA, useValue: { produtoPreSelecionado: product, mobilePanel: true } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy('error') } },
      { provide: TutorialService, useValue: { registerTarget: () => () => {}, state: signal({ definition: null }), isActive: signal(false), currentStep: signal(null), rect: signal(null), currentIndex: signal(0), totalSteps: signal(0), canGoBack: signal(false), isLastStep: signal(false) } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(GraficaProdutoWizardDialogComponent); wizard = fixture.componentInstance;
    fixture.nativeElement.classList.add('mobile-side-panel');
    fixture.nativeElement.style.width = '360px'; fixture.nativeElement.style.height = '840px'; document.body.appendChild(fixture.nativeElement);
  });
  afterEach(() => { fixture.destroy(); fixture.nativeElement.remove(); });

  it('inicia sem seleção, resumo vazio, mensagem redundante ou botão Calcular', fakeAsync(() => {
    enter(); expect(buttons().length).toBe(3); expect(wizard.loteSelecionado).toBeNull();
    expect(buttons().every(button => button.getAttribute('aria-pressed') === 'false')).toBeTrue();
    expect(query('.price-step .price-summary-card')).toBeNull(); expect(query('.price-hint')).toBeNull();
    expect(query('.price-config-card').textContent).not.toContain('Calcular');
    expect(wizard.nextDisabled).toBeTrue(); expect(service.precificar).not.toHaveBeenCalled();
  }));

  it('seleciona uma única vez pelo cartão inteiro e usa o total resolvido do lote', fakeAsync(() => {
    enter(); const selectLot = spyOn(wizard, 'selecionarLotePreco').and.callThrough();
    buttons()[1].querySelector('strong')!.click(); render(); tick(300); render();
    expect(selectLot).toHaveBeenCalledOnceWith(policy.lotes[1]);
    expect(service.precificar).toHaveBeenCalledOnceWith(77, jasmine.objectContaining({ quantidade: 250 }));
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(buttons()[1].classList.contains('active')).toBeTrue();
    expect(buttons()[1].querySelector('.lot-selection-icon')).not.toBeNull();
    expect(query('.price-step .price-summary-card').textContent).toContain('250 unidades');
    expect(query('.price-step .summary-price-total').textContent).toContain('145,00');
    expect(wizard.preco?.valorUnitario).toBe(0.58); expect(wizard.preco?.valorTotal).toBe(145);
    expect(wizard.nextDisabled).toBeFalse();
    select(2);
    expect(buttons().filter(button => button.getAttribute('aria-pressed') === 'true').length).toBe(1);
    expect(buttons()[1].classList.contains('active')).toBeFalse();
    expect(buttons()[1].querySelector('.lot-selection-icon')).toBeNull();
    expect(query('.summary-price-total').textContent).toContain('232,00');
  }));

  it('descarta o preço anterior na troca e mantém resumo oculto durante loading ou erro', fakeAsync(() => {
    enter(); select(0);
    const old = new Subject<any>(), current = new Subject<any>();
    service.precificar.and.returnValues(old, current);
    select(1); expect(wizard.nextDisabled).toBeTrue(); expect(query('.price-step .price-summary-card')).toBeNull();
    select(2); expect(old.observed).toBeFalse(); old.next(result(1));
    expect(wizard.preco).toBeNull(); current.next(result(2)); current.complete(); render();
    expect(query('.summary-price-total').textContent).toContain('232,00');
    expect(service.precificar).toHaveBeenCalledTimes(3);
    service.precificar.and.returnValue(throwError(() => new Error('Falha ao precificar lote')));
    select(0); expect(query('.price-step .price-summary-card')).toBeNull();
    expect(wizard.nextDisabled).toBeTrue(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
  }));

  it('preserva seleção ao voltar e entrega quantidade e valores corretos à revisão', fakeAsync(() => {
    enter(); select(1); back(); expect(wizard.stepper?.selectedIndex).toBe(0);
    next(); expect(wizard.stepper?.selectedIndex).toBe(1);
    expect(buttons()[1].getAttribute('aria-pressed')).toBe('true');
    expect(service.precificar).toHaveBeenCalledTimes(1);
    next(); expect(wizard.stepper?.selectedIndex).toBe(3);
    expect(wizard.itensRevisao[0]).toEqual(jasmine.objectContaining({ quantidade: 250, valorUnitario: 0.58, valorTotal: 145 }));
    back(); expect(wizard.stepper?.selectedIndex).toBe(1); expect(wizard.loteSelecionado?.quantidade).toBe(250);
    expect(wizard.totalComposicao).toBe(145);
  }));

  it('mantém o lote ao passar por Adicionais e invalida ao trocar de produto', fakeAsync(() => {
    product.acabamentos = [{ id: 1, nome: 'Corte', ativo: true, ordem: 0, formaAplicacao: 'POR_FOLHA', politicas: [] }];
    enter(); select(0); next(); expect(wizard.stepper?.selectedIndex).toBe(2);
    next(); expect(wizard.stepper?.selectedIndex).toBe(3);
    expect(wizard.itensRevisao[0].quantidade).toBe(100); expect(wizard.totalComposicao).toBe(81);
    back(); back(); back(); expect(wizard.stepper?.selectedIndex).toBe(0);
    product = { ...product, id: 88 }; wizard.selecionarProduto(product, true); render(); tick(300); render();
    expect(wizard.loteSelecionado).toBeNull(); expect(wizard.preco).toBeNull();
    next(); expect(wizard.nextDisabled).toBeTrue();
    expect(buttons().some(button => button.getAttribute('aria-pressed') === 'true')).toBeFalse();
  }));

  it('preserva seleção e resumo desktop anteriores', fakeAsync(() => {
    wizard.data.mobilePanel = false; fixture.nativeElement.classList.remove('mobile-side-panel'); enter();
    expect(query('.price-step .price-summary-card')).not.toBeNull();
    expect(query('.price-hint').textContent).toContain('Selecione um lote para continuar');
    expect(buttons().every(button => !button.hasAttribute('aria-pressed'))).toBeTrue();
    select(1); expect(query('.lot-selection-icon')).toBeNull();
    expect(query('.summary-price-total').textContent).toContain('145,00');
  }));

  for (const count of [1, 2, 3, 17]) {
    it(`organiza ${count} lote(s) e valores elevados em duas colunas sem overflow`, fakeAsync(() => {
      policy.lotes = Array.from({ length: count }, (_, index) => ({ quantidade: (index + 1) * 1000000, valorLote: 999999999.99 }));
      service.precificar.and.returnValue(of({ ...result(0), quantidadeSolicitada: 1000000, valorTotal: 999999999.99 } as any));
      enter(); select(0);
      const frame = document.createElement('iframe'); frame.style.width = '360px'; frame.style.height = '840px'; document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.margin = '0'; doc.body.appendChild(fixture.nativeElement);
        const grid = query('.lot-grid'), cards = buttons();
        expect(cards.length).toBe(count);
        expect(frame.contentWindow!.getComputedStyle(grid).gridTemplateColumns.split(' ').length).toBe(2);
        expect(frame.contentWindow!.getComputedStyle(grid).overflowY).toBe('visible');
        cards.forEach(card => { expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth); expect(card.getBoundingClientRect().height).toBeGreaterThanOrEqual(44); });
        expect(query('.wizard-body').scrollWidth).toBeLessThanOrEqual(query('.wizard-body').clientWidth);
        if (count % 2) expect(cards[count - 1].getBoundingClientRect().left).toBe(cards[0].getBoundingClientRect().left);
        if (count > 3) expect(query('.wizard-body').scrollHeight).toBeGreaterThan(query('.wizard-body').clientHeight);
      } finally { frame.remove(); }
    }));
  }
});
