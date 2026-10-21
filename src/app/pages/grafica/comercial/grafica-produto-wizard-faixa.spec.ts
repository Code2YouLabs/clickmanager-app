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

describe('Wizard: faixa de quantidade mobile', () => {
  let fixture: ComponentFixture<GraficaProdutoWizardDialogComponent>;
  let wizard: GraficaProdutoWizardDialogComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let policy: any;
  const product = { id: 77, catalogoProdutoNome: 'Impressão P&B', ativo: true, parametros: [], acabamentos: [] };
  const ranges = [
    { inicio: 1, fim: 10, valorUnitario: 0.9 }, { inicio: 11, fim: 49, valorUnitario: 0.6 },
    { inicio: 50, fim: 299, valorUnitario: 0.45 }, { inicio: 300, fim: 499, valorUnitario: 0.4 },
    { inicio: 500, fim: null, valorUnitario: 0.35 },
  ];
  const interval = (index: number) => `${ranges[index].inicio}–${ranges[index].fim ?? '∞'}`;
  const result = (q = 1, index = 0) => ({ status: 'PRECO_CALCULADO', quantidadeSolicitada: q, valorUnitario: ranges[index].valorUnitario,
    valorTotal: ({ 1: 0.9, 10: 9, 11: 6.6, 49: 29.4, 50: 22.5, 250: 112.5, 299: 134.55, 300: 120, 499: 199.6, 500: 175 } as Record<number, number>)[q], detalhes: [`Faixa aplicada: ${interval(index)}`], selecoesResolvidas: [] });
  const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const render = () => fixture.detectChanges();
  function enter() { render(); tick(300); render(); }
  function change(value: string) {
    const input = query('.quantity-input input') as HTMLInputElement; input.value = value; input.dispatchEvent(new Event('input')); render();
  }
  function calculate() { query('.quantity-entry-row button').click(); render(); }

  beforeEach(async () => {
    policy = { id: 9, nome: 'Faixas', tipo: 'POR_FAIXA_QUANTIDADE', ativo: true, selecoes: [], faixas: ranges.map(range => ({ ...range })) };
    service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar']);
    service.listar.and.returnValue(of({ content: [] } as any)); service.listarServicos.and.returnValue(of([]));
    service.detalhar.and.returnValue(of(product as any)); service.listarPrecos.and.callFake(() => of([policy]));
    service.precificar.and.returnValue(of(result() as any));
    await TestBed.configureTestingModule({ imports: [GraficaProdutoWizardDialogComponent], providers: [
      provideNoopAnimations(), { provide: GraficaProdutoService, useValue: service },
      { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      { provide: MAT_DIALOG_DATA, useValue: { produtoPreSelecionado: product, mobilePanel: true } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy('error') } },
      { provide: TutorialService, useValue: { registerTarget: () => () => {}, state: signal({ definition: null }), isActive: signal(false), currentStep: signal(null), rect: signal(null), currentIndex: signal(0), totalSteps: signal(0), canGoBack: signal(false), isLastStep: signal(false) } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(GraficaProdutoWizardDialogComponent); wizard = fixture.componentInstance;
    fixture.nativeElement.classList.add('mobile-side-panel'); fixture.nativeElement.style.width = '360px'; fixture.nativeElement.style.height = '840px';
    document.body.appendChild(fixture.nativeElement);
  });
  afterEach(() => { fixture.destroy(); fixture.nativeElement.remove(); });

  it('inicia recolhido e não inventa faixa ou resumo enquanto a consulta está pendente', fakeAsync(() => {
    service.precificar.and.returnValue(new Subject<any>()); enter();
    const details = query('.quantity-range-details') as HTMLDetailsElement;
    expect(details.open).toBeFalse(); expect(details.textContent).toContain('Ver todas as faixas');
    expect(query('.quantity-applied-range')).toBeNull(); expect(query('.price-step .price-summary-card')).toBeNull();
    expect(query('.price-range-row.active')).toBeNull(); expect(wizard.nextDisabled).toBeTrue();
    const field = query('.quantity-input input'); const value = wizard.quantidadeForm.value;
    details.querySelector('summary')!.click(); render(); expect(details.open).toBeTrue();
    expect(details.querySelectorAll('li').length).toBe(5);
    details.querySelector('summary')!.click(); render(); expect(details.open).toBeFalse();
    expect(wizard.quantidadeForm.value).toEqual(value); expect(query('.quantity-input input')).toBe(field);
    expect(service.precificar).toHaveBeenCalledTimes(1);
  }));

  for (const [q, index] of [[1, 0], [10, 0], [11, 1], [49, 1], [50, 2], [299, 2], [300, 3], [499, 3], [500, 4]]) {
    it(`apresenta a faixa informada pela API para quantidade ${q}`, fakeAsync(() => {
      wizard.quantidadeForm.controls.quantidade.setValue(q, { emitEvent: false });
      service.precificar.and.returnValue(of(result(q, index) as any)); enter();
      expect(wizard.faixaAplicadaMobile).toBe(policy.faixas[index]);
      expect(query('.quantity-applied-range').textContent).toContain(wizard.faixaPrecoLabel(policy.faixas[index]));
      expect(fixture.nativeElement.querySelectorAll('.price-range-row.active').length).toBe(1);
      expect(query('.price-range-row.active').textContent).toContain('Faixa atual');
      expect(wizard.nextDisabled).toBeFalse();
    }));
  }

  it('não infere intervalo da quantidade quando falta identificação confiável ou ela é ambígua', fakeAsync(() => {
    service.precificar.and.returnValue(of({ ...result(250, 2), detalhes: [] } as any));
    wizard.quantidadeForm.controls.quantidade.setValue(250, { emitEvent: false }); enter();
    expect(wizard.faixaAplicadaMobile).toBeNull(); expect(query('.price-range-row.active')).toBeNull();
    expect(query('.quantity-applied-range')).toBeNull(); expect(query('.summary-price-total').textContent).toContain('112,50');
    expect(query('.price-summary-card').textContent).toContain('0,45'); expect(wizard.nextDisabled).toBeFalse();
    wizard.preco!.detalhes = ['Faixa aplicada: 50–299']; policy.faixas.push({ ...policy.faixas[2] }); render();
    expect(wizard.faixaAplicadaMobile).toBeNull();
  }));

  it('preserva precisão do preço unitário e o total resolvido, sem multiplicação local', fakeAsync(() => {
    policy.faixas[2].valorUnitario = 0.0045;
    const response = { ...result(250, 2), valorUnitario: 0.0045, valorTotal: 1.13 };
    wizard.quantidadeForm.controls.quantidade.setValue(250, { emitEvent: false });
    service.precificar.and.returnValue(of(response as any)); enter();
    const original = JSON.stringify(response);
    expect(query('.price-range-row.active').textContent).toContain('0,0045');
    expect(query('.price-summary-card').textContent).toContain('0,0045');
    expect(query('.summary-price-total').textContent).toContain('1,13');
    expect(JSON.stringify(response)).toBe(original);
    const details = query('.quantity-range-details') as HTMLDetailsElement;
    details.querySelector('summary')!.click(); render(); details.querySelector('summary')!.click(); render();
    expect(wizard.preco).toBe(response as any); expect(service.precificar).toHaveBeenCalledTimes(1);
  }));

  it('remove resultado e destaque imediatamente e preserva o debounce já existente sem duplicar consultas', fakeAsync(() => {
    enter(); expect(query('.price-range-row.active')).not.toBeNull();
    const pending = new Subject<any>(); service.precificar.and.returnValue(pending);
    change('500'); expect(wizard.preco).toBeNull(); expect(query('.price-range-row.active')).toBeNull();
    expect(query('.quantity-applied-range')).toBeNull(); expect(query('.price-step .price-summary-card')).toBeNull();
    expect(wizard.nextDisabled).toBeTrue(); calculate();
    tick(300); render(); expect(service.precificar).toHaveBeenCalledTimes(2);
    expect(query('.quantity-entry-row button').textContent).toContain('Calculando...');
    pending.next(result(500, 4)); pending.complete(); render();
    expect(query('.quantity-applied-range').textContent).toContain('500+ un');
    expect(wizard.nextDisabled).toBeFalse();
  }));

  it('mantém validação fora da lista recolhida e respeita erro de API e faixa inexistente', fakeAsync(() => {
    enter(); change('0'); query('.quantity-input input').dispatchEvent(new Event('blur')); render(); tick(300);
    expect(query('.quantity-entry-panel').textContent).toContain('Valor mínimo permitido é 1');
    expect(wizard.nextDisabled).toBeTrue(); expect(query('.price-step .price-summary-card')).toBeNull();
    expect((query('.quantity-range-details') as HTMLDetailsElement).open).toBeFalse();
    policy.faixas = [policy.faixas[0], ...policy.faixas.slice(2)];
    service.precificar.and.returnValue(throwError(() => new Error('Faixa não encontrada')));
    change('25'); tick(300); render(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
    expect(wizard.nextDisabled).toBeTrue(); expect(query('.price-range-row.active')).toBeNull();
    service.precificar.and.returnValue(of({ ...result(), status: 'CONFIGURACAO_INVALIDA', mensagem: 'Quantidade fora das faixas', detalhes: [] } as any));
    calculate(); expect(query('.quantity-range-feedback').textContent).toContain('Quantidade fora das faixas');
    expect(wizard.nextDisabled).toBeTrue();
  }));

  it('mantém a tabela e o destaque desktop originais', fakeAsync(() => {
    wizard.data.mobilePanel = false; fixture.nativeElement.classList.remove('mobile-side-panel'); enter();
    expect(query('.quantity-range-details')).toBeNull(); expect(query('.price-ranges-head')).not.toBeNull();
    expect(query('.price-ranges-list')).not.toBeNull();
    expect(query('.price-range-row.active').textContent).toContain('1 a 10 un');
  }));

  it('acomoda muitas faixas e preços precisos usando apenas a rolagem principal', fakeAsync(() => {
    policy.faixas = Array.from({ length: 30 }, (_, index) => ({ inicio: index * 100 + 1, fim: index * 100 + 100, valorUnitario: 0.123456789 }));
    enter(); const frame = document.createElement('iframe'); frame.style.width = '360px'; frame.style.height = '840px'; document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
      doc.body.style.margin = '0'; doc.body.appendChild(fixture.nativeElement);
      const details = query('.quantity-range-details') as HTMLDetailsElement; details.querySelector('summary')!.click(); render();
      expect(details.querySelectorAll('li').length).toBe(30);
      expect(frame.contentWindow!.getComputedStyle(query('.quantity-range-list')).overflowY).toBe('visible');
      expect(query('.wizard-body').scrollWidth).toBeLessThanOrEqual(query('.wizard-body').clientWidth);
      expect(query('.wizard-body').scrollHeight).toBeGreaterThan(query('.wizard-body').clientHeight);
      expect(query('.quantity-range-list').textContent).toContain('0,123456789');
    } finally { frame.remove(); }
  }));
});
