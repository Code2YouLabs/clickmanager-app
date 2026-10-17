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

describe('Wizard: metro quadrado mobile', () => {
  let fixture: ComponentFixture<GraficaProdutoWizardDialogComponent>;
  let wizard: GraficaProdutoWizardDialogComponent;
  let service: jasmine.SpyObj<GraficaProdutoService>;
  let policy: any;
  const product = { id: 77, catalogoProdutoNome: 'Lona Impressa', ativo: true, parametros: [], acabamentos: [] };
  const result = { status: 'PRECO_CALCULADO', quantidadeSolicitada: 2, valorUnitario: 271.875, valorTotal: 543.75,
    largura: 1.25, altura: 2.5, unidadeDimensao: 'METRO', areaReal: 3.125, areaFaturada: 6.25, detalhes: [], selecoesResolvidas: [] };
  const query = (selector: string) => fixture.nativeElement.querySelector(selector) as HTMLElement;
  const inputs = () => Array.from(fixture.nativeElement.querySelectorAll('.measure-entry-panel input')) as HTMLInputElement[];
  const render = () => fixture.detectChanges();
  function enter() { render(); tick(300); render(); }
  function fill(values = ['1.25', '2.5', '2']) {
    inputs().forEach((input, index) => { input.value = values[index]; input.dispatchEvent(new Event('input', { bubbles: true })); });
    render(); tick(250); render();
  }
  function calculate() { query('.measure-entry-panel > button').click(); render(); }

  beforeEach(async () => {
    policy = { id: 9, nome: 'Lona', tipo: 'POR_METRO_QUADRADO', ativo: true, precoMetroQuadrado: 87,
      minimoMetroQuadrado: 50, unidadeDimensao: 'METRO', larguraMaxima: 3, alturaMaxima: 4, selecoes: [] };
    service = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'listarServicos', 'detalhar', 'listarPrecos', 'precificar']);
    service.listar.and.returnValue(of({ content: [] } as any)); service.listarServicos.and.returnValue(of([]));
    service.detalhar.and.returnValue(of(product as any)); service.listarPrecos.and.callFake(() => of([policy]));
    service.precificar.and.returnValue(of(result as any));
    await TestBed.configureTestingModule({ imports: [GraficaProdutoWizardDialogComponent], providers: [
      provideNoopAnimations(), { provide: GraficaProdutoService, useValue: service },
      { provide: MatDialogRef, useValue: { close: jasmine.createSpy('close') } },
      { provide: MAT_DIALOG_DATA, useValue: { produtoPreSelecionado: product, mobilePanel: true } },
      { provide: ToastrService, useValue: { error: jasmine.createSpy('error') } },
      { provide: TutorialService, useValue: { registerTarget: () => () => {}, state: signal({ definition: null }), isActive: signal(false), currentStep: signal(null), rect: signal(null), currentIndex: signal(0), totalSteps: signal(0), canGoBack: signal(false), isLastStep: signal(false) } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(GraficaProdutoWizardDialogComponent); wizard = fixture.componentInstance;
    fixture.nativeElement.classList.add('mobile-side-panel');
    fixture.nativeElement.style.width = '360px'; fixture.nativeElement.style.height = '840px';
    document.body.appendChild(fixture.nativeElement);
  });
  afterEach(() => { fixture.destroy(); fixture.nativeElement.remove(); });

  it('inicia neutro, sem resumo fictício, e mantém regras recolhidas sem nova consulta', fakeAsync(() => {
    enter(); expect(wizard.stepper?.selectedIndex).toBe(1);
    expect(query('.price-step .price-summary-card')).toBeNull();
    expect(query('.measure-rules-table')).toBeNull();
    expect(query('.measure-area-rate').textContent).toContain('87,00');
    expect(query('.measure-entry-panel mat-error')).toBeNull();
    expect(query('.measure-entry-panel .mat-form-field-invalid')).toBeNull();
    expect(service.precificar).not.toHaveBeenCalled();
    fill(); const field = inputs()[0];
    const details = query('.measure-area-details') as HTMLDetailsElement;
    expect(details.open).toBeFalse(); details.querySelector('summary')!.click(); render();
    expect(details.open).toBeTrue(); expect(inputs()[0]).toBe(field);
    expect(details.textContent).toContain('Unidade de cobrança'); expect(details.textContent).toContain('m²');
    expect(details.textContent).toContain('Preço mínimo'); expect(details.textContent).toContain('50,00');
    expect(details.textContent).toContain('Largura máxima'); expect(details.textContent).toContain('3 m');
    details.querySelector('summary')!.click(); render(); expect(details.open).toBeFalse();
    expect(wizard.quantidadeForm.value).toEqual({ largura: 1.25, altura: 2.5, quantidade: '2' } as any);
    expect(service.precificar).not.toHaveBeenCalled();
  }));

  for (const [unit, label] of [['METRO', 'm'], ['CENTIMETRO', 'cm'], ['MILIMETRO', 'mm']]) {
    it(`preserva entrada em ${unit}, limites e números decimais sem converter valores`, fakeAsync(() => {
      policy.unidadeDimensao = unit; policy.larguraMaxima = null; policy.alturaMaxima = null;
      enter(); fill(); calculate();
      expect(query('.price-inputs').textContent).toContain(`Largura (${label})`);
      expect(query('.price-inputs').textContent).toContain(`Altura (${label})`);
      expect(query('.measure-area-details').textContent).toContain('Sem limite');
      expect(service.precificar).toHaveBeenCalledOnceWith(77, jasmine.objectContaining({ largura: 1.25, altura: 2.5, quantidade: 2, unidadeDimensao: unit }));
      expect(query('.price-step .summary-price-total').textContent).toContain('543,75');
      expect(query('.price-summary-card').textContent).toContain('1,25 × 2,5 m');
    }));
  }

  it('mostra obrigatoriedade e limites junto aos campos, mesmo com regras fechadas', fakeAsync(() => {
    enter();
    inputs()[0].dispatchEvent(new Event('blur')); inputs()[1].dispatchEvent(new Event('blur')); render();
    expect(query('.price-inputs').textContent).toContain('Campo obrigatório');
    fill(['3.1', '0', '0']);
    inputs().forEach(input => input.dispatchEvent(new Event('blur'))); render();
    expect(query('.price-inputs').textContent).toContain('Máximo: 3 m');
    expect(query('.price-inputs').textContent).toContain('Informe um valor maior que zero');
    expect((query('.measure-entry-panel > button') as HTMLButtonElement).disabled).toBeTrue();
    expect(wizard.nextDisabled).toBeTrue(); expect(inputs()[0].value).toBe('3.1');
    expect((query('.measure-area-details') as HTMLDetailsElement).open).toBeFalse();
    expect(service.precificar).not.toHaveBeenCalled();
  }));

  it('utiliza áreas e total resolvidos, sem afirmar aplicação do mínimo apenas pela política', fakeAsync(() => {
    enter(); fill(); calculate();
    const summary = query('.price-step .price-summary-card');
    expect(summary.textContent).toContain('6,25 m²'); expect(summary.textContent).toContain('3,125 m²');
    expect(summary.textContent).not.toContain('Preço mínimo aplicado');
    expect(summary.querySelectorAll('.summary-price-total').length).toBe(1);
    policy.minimoMetroQuadrado = 800;
    service.precificar.and.returnValue(of({ ...result, valorTotal: 800, mensagem: 'Preço mínimo aplicado', detalhes: ['Preço mínimo aplicado'] } as any));
    calculate(); expect(query('.measure-area-notes').textContent).toContain('Preço mínimo aplicado');
    expect(query('.measure-area-notes').querySelectorAll('p').length).toBe(1);
    expect(query('.summary-price-total').textContent).toContain('800,00');
    service.precificar.and.returnValue(of({ ...result, areaReal: null, areaFaturada: null, detalhes: [] } as any));
    calculate(); expect(query('.price-summary-card').textContent).not.toContain('Área calculada');
    expect(query('.price-summary-card').textContent).not.toContain('Área faturada');
  }));

  it('bloqueia avanço ao editar medidas, respeita loading e descarta resposta antiga', fakeAsync(() => {
    enter(); fill(); calculate(); expect(wizard.nextDisabled).toBeFalse();
    inputs()[0].value = '1.5'; inputs()[0].dispatchEvent(new Event('input')); render();
    expect(wizard.preco).toBeNull(); expect(wizard.nextDisabled).toBeTrue();
    expect(query('.price-step .price-summary-card')).toBeNull(); tick(250);
    const pending = new Subject<any>(); service.precificar.and.returnValue(pending); calculate();
    expect(query('.measure-entry-panel > button').textContent).toContain('Calculando...');
    expect((query('.measure-entry-panel > button') as HTMLButtonElement).disabled).toBeTrue();
    calculate(); expect(service.precificar).toHaveBeenCalledTimes(2);
    inputs()[1].value = '2'; inputs()[1].dispatchEvent(new Event('input')); render(); tick(250);
    expect(pending.observed).toBeFalse(); pending.next(result);
    expect(wizard.preco).toBeNull(); expect(wizard.nextDisabled).toBeTrue();
    expect(service.precificar).toHaveBeenCalledTimes(2);
  }));

  it('preserva erro de API e apresenta mensagem real de resultado inválido', fakeAsync(() => {
    service.precificar.and.returnValue(throwError(() => new Error('Falha na precificação')));
    enter(); fill(); calculate(); expect(TestBed.inject(ToastrService).error).toHaveBeenCalled();
    expect(wizard.nextDisabled).toBeTrue(); expect(wizard.precificando).toBeFalse();
    service.precificar.and.returnValue(of({ ...result, status: 'CONFIGURACAO_INVALIDA', mensagem: 'Medida fora da política' } as any));
    calculate(); expect(query('.measure-area-feedback').textContent).toContain('Medida fora da política');
    expect(query('.price-step .price-summary-card')).toBeNull(); expect(wizard.nextDisabled).toBeTrue();
  }));

  it('preserva os campos e a tabela desktop sem habilitar a variante decimal', fakeAsync(() => {
    wizard.data.mobilePanel = false; fixture.nativeElement.classList.remove('mobile-side-panel'); enter();
    expect(query('.measure-area-rules')).toBeNull(); expect(query('.measure-rules-table')).not.toBeNull();
    expect(inputs()[0].getAttribute('inputmode')).toBe('numeric');
    expect(query('.price-step .price-summary-card')).not.toBeNull();
  }));

  for (const width of [320, 360]) {
    it(`mantém largura e altura lado a lado e regras sem rolagem interna em ${width}px`, fakeAsync(() => {
      enter(); fill();
      const frame = document.createElement('iframe'); frame.style.width = `${width}px`; frame.style.height = '840px';
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document.head.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.margin = '0'; fixture.nativeElement.style.width = `${width}px`; doc.body.appendChild(fixture.nativeElement);
        const fields = Array.from(fixture.nativeElement.querySelectorAll('.price-inputs > app-input-numerico')) as HTMLElement[];
        const [left, right, quantity] = fields.map(field => field.getBoundingClientRect());
        expect(left.top).toBe(right.top); expect(right.left).toBeGreaterThan(left.left);
        expect(left.width).toBeGreaterThanOrEqual(100); expect(right.width).toBeGreaterThanOrEqual(100);
        expect(quantity.top).toBeGreaterThan(left.top); expect(quantity.width).toBeGreaterThan(left.width);
        expect(query('.wizard-body').scrollWidth).toBeLessThanOrEqual(query('.wizard-body').clientWidth);
        const details = query('.measure-area-details') as HTMLDetailsElement;
        details.querySelector('summary')!.click(); render();
        expect(details.open).toBeTrue();
        expect(frame.contentWindow!.getComputedStyle(details.querySelector('dl')!).overflowY).toBe('visible');
        expect(inputs()[0].value).toBe('1.25');
      } finally { frame.remove(); }
    }));
  }
});
