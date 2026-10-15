import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ApiService } from 'src/app/services/api.service';
import { SmartCalcInitResponse } from 'src/app/models/smart-calc/init/smartcalc-init.model';
import { SmartCalcResultado } from 'src/app/models/smart-calc/smart-calc-resultado.model';
import { SmartCalcComponent } from './smart-calc.component';
import { SmartCalcInitDataService } from './smart-calc-init-data.service';
import { SmartCalcDataService } from './smart-calc-data.service';

const init: SmartCalcInitResponse = {
  ativo: true,
  produtos: [{ id: 1, nome: 'Cartão de visita', variacoes: [
    { id: 10, material: { id: 20, nome: 'Couchê 300g' }, acabamentos: [{ id: 30, nome: 'Laminação fosca' }] },
    { id: 11, material: { id: 21, nome: 'Offset' }, acabamentos: [] },
  ] }],
};
const resultado: SmartCalcResultado = {
  total: 123.45,
  itens: [{ id: 10, nomeComposto: 'Cartão de visita / Couchê', descricao: '9 × 5 cm', quantidade: 500,
    valor: 0.2469, subTotal: 123.45, produtoId: 1, largura: 9, altura: 5 }],
  observacaoResumo: { produzido: 504, solicitado: 500, sobraUtil: 4,
    custoUnitarioProduzido: 0.245, custoUnitarioSolicitado: 0.2469,
    distribuicao: [{ formato: 'A3', orientacao: 'PAISAGEM', folhas: 12, porFolha: 42 }] },
};

describe('SmartCalc — composição mobile com formulário e cálculo reais da tela', () => {
  let fixture: ComponentFixture<SmartCalcComponent>;
  let component: SmartCalcComponent;
  let initService: SmartCalcInitDataService;
  let data: jasmine.SpyObj<SmartCalcDataService>;
  let router: Router;
  let viewportWidth: number;
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector);
  const cta = () => query<HTMLButtonElement>('.mobile-total-bar__cta');
  const text = (selector: string) => query(selector)?.textContent?.replace(/\s/g, ' ').trim();
  const render = () => { fixture.detectChanges(); tick(0); fixture.detectChanges(); };
  const fill = () => {
    component.form.controls.produtoId.setValue(1);
    component.form.patchValue({ largura: 9, altura: 5, quantidade: 500 });
    tick(300); fixture.detectChanges();
  };
  const openDetails = () => {
    query('.mobile-total-bar').click(); fixture.detectChanges(); tick(0); fixture.detectChanges();
  };

  beforeEach(async () => {
    viewportWidth = 360;
    spyOnProperty(window, 'innerWidth', 'get').and.callFake(() => viewportWidth);
    initService = new SmartCalcInitDataService({} as ApiService);
    spyOn(initService, 'carregarInit$').and.returnValue(of(init));
    data = jasmine.createSpyObj('SmartCalcDataService', ['calcularSmartCalc', 'criarRascunhoSmartCalc']);
    data.calcularSmartCalc.and.returnValue(of(resultado));
    data.criarRascunhoSmartCalc.and.returnValue(of({ id: 42, referencia: 'SC42' }));
    await TestBed.configureTestingModule({
      imports: [SmartCalcComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [provideRouter([]),
        { provide: SmartCalcInitDataService, useValue: initService },
        { provide: SmartCalcDataService, useValue: data },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['warning', 'error', 'success']) },
      ],
    }).compileComponents();
    router = TestBed.inject(Router); spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(SmartCalcComponent);
    component = fixture.componentInstance;
  });
  afterEach(() => fixture.destroy());

  it('prioriza produto e material no estado vazio e mantém total e CTA desabilitado', fakeAsync(() => {
    render();
    expect(text('app-card-header')).toContain('SmartCalc');
    expect(text('app-card-header')).not.toContain('Calculadora Inteligente');
    expect(text('.mobile-flow-status')).toBe('Comece escolhendo produto e material.');
    expect(query('#smartcalc-step-1').hidden).toBeFalse();
    expect(query('#smartcalc-step-2').hidden).toBeTrue();
    expect(query('#smartcalc-step-3').hidden).toBeTrue();
    expect(text('.mobile-total-bar__summary .value')).toContain('0.00');
    expect(cta().disabled).toBeTrue();
    expect(query('[role="dialog"]')).toBeNull();
    expect(data.calcularSmartCalc).not.toHaveBeenCalled();
    expect(initService.carregarInit$).toHaveBeenCalledTimes(1);
  }));

  it('preserva controles únicos, materiais e acabamentos ao avançar e revisar etapas', fakeAsync(() => {
    render();
    const controls = Array.from(fixture.nativeElement.querySelectorAll('mat-select, app-input-numerico input'));
    component.form.controls.produtoId.setValue(1); fixture.detectChanges();
    expect(component.form.controls.materialId.value).toBe(20);
    expect(component.acabamentos).toEqual([{ id: '30', nome: 'Laminação fosca' }]);
    expect(text('#smartcalc-step-toggle-1')).toContain('Couchê 300g');
    query<HTMLButtonElement>('#smartcalc-step-1 .mobile-step-next').click(); render();
    expect(query('#smartcalc-step-1').hidden).toBeTrue();
    expect(query('#smartcalc-step-2').hidden).toBeFalse();
    expect(document.activeElement).toBe(query('#smartcalc-step-toggle-2'));
    query('#smartcalc-step-toggle-1').click(); fixture.detectChanges();
    expect(component.form.controls.produtoId.value).toBe(1);
    expect(Array.from(fixture.nativeElement.querySelectorAll('mat-select, app-input-numerico input'))).toEqual(controls);
    expect(data.calcularSmartCalc).not.toHaveBeenCalled();
  }));

  it('mantém os inputs reais, debounce e payload do cálculo ao preencher medidas', fakeAsync(() => {
    render(); component.form.controls.produtoId.setValue(1);
    component.abrirEtapaMobile(2); render();
    const inputs = fixture.nativeElement.querySelectorAll('app-input-numerico input') as NodeListOf<HTMLInputElement>;
    ['9', '5', '500'].forEach((value, index) => { inputs[index].value = value; inputs[index].dispatchEvent(new Event('input')); });
    tick(299); expect(data.calcularSmartCalc).not.toHaveBeenCalled();
    tick(1); fixture.detectChanges();
    expect(data.calcularSmartCalc).toHaveBeenCalledOnceWith({
      familiaProdutoGraficoId: 1, produtoId: 1, materialId: 20, largura: 9, altura: 5, quantidade: 500,
      unidadeDimensao: 'CENTIMETRO', acabamentosCodigos: [], acabamentosIds: [],
    });
    expect(text('.mobile-total-bar__summary .value')).toContain('123.45');
    expect(cta().disabled).toBeFalse();
    expect(text('.mobile-flow-status')).toContain('Cálculo pronto');
    expect(text('#smartcalc-step-toggle-2')).toContain('9 × 5 cm · 500 un.');
  }));

  it('mantém validações required e mínimo sem ocultar erros em etapas recolhidas', fakeAsync(() => {
    render();
    component.form.controls.largura.setValue(0);
    component.form.controls.largura.markAsTouched();
    fixture.detectChanges();
    expect(component.form.controls.largura.hasError('min')).toBeTrue();
    expect(component.form.controls.altura.hasError('required')).toBeTrue();
    expect(query('#smartcalc-step-2').hidden).toBeFalse();
    expect(text('#smartcalc-step-2 mat-error')).toContain('Valor mínimo permitido é 1');
    query('#smartcalc-step-toggle-3').click(); fixture.detectChanges();
    expect(query('#smartcalc-step-2').hidden).toBeFalse();
    expect(text('#smartcalc-step-toggle-2')).toContain('Revise os campos');
    expect(cta().disabled).toBeTrue();
    tick(300); expect(data.calcularSmartCalc).not.toHaveBeenCalled();
  }));

  it('atualiza o total pelo mesmo serviço e bloqueia a ação durante recálculo', fakeAsync(() => {
    render(); fill();
    const pending = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(pending);
    component.form.controls.quantidade.setValue(1000); fixture.detectChanges();
    expect(cta().disabled).toBeTrue();
    tick(300); fixture.detectChanges();
    expect(component.carregandoCalculo).toBeTrue();
    expect(cta().disabled).toBeTrue();
    pending.next({ ...resultado, total: 250 }); pending.complete(); fixture.detectChanges();
    expect(text('.mobile-total-bar__summary .value')).toContain('250.00');
    expect(cta().disabled).toBeFalse();
    expect(data.calcularSmartCalc).toHaveBeenCalledTimes(2);
  }));

  it('preserva a seleção opcional de acabamento e seu recálculo', fakeAsync(() => {
    render(); fill(); component.abrirEtapaMobile(3); render();
    query<HTMLInputElement>('.acabamento-option input[type="checkbox"]').click(); tick(300); fixture.detectChanges();
    expect(component.form.controls.acabamentosIds.value).toEqual(['30']);
    expect(text('#smartcalc-step-toggle-3')).toContain('1 selecionado(s)');
    expect(data.calcularSmartCalc.calls.mostRecent().args[0].acabamentosIds).toEqual(['30']);
    component.form.controls.materialId.setValue(21); tick(300); fixture.detectChanges();
    expect(component.form.controls.acabamentosIds.value).toEqual([]);
    expect(text('#smartcalc-step-3 .empty-inline')).toContain('Nenhum acabamento disponível');
  }));

  it('permite abrir acabamentos sem opções antes de escolher um produto', fakeAsync(() => {
    render(); query('#smartcalc-step-toggle-3').click(); fixture.detectChanges();
    expect(query('#smartcalc-step-3').hidden).toBeFalse();
    expect(text('#smartcalc-step-3')).toContain('Nenhum acabamento disponível para este produto.');
    expect(cta().disabled).toBeTrue();
  }));

  it('abre detalhes vazios e fecha por Escape, liberando a rolagem', fakeAsync(() => {
    render(); openDetails();
    expect(query('[role="dialog"]').getAttribute('aria-modal')).toBe('true');
    expect(text('[role="dialog"]')).toContain('Pronto para calcular');
    expect(document.body.style.overflow).toBe('hidden');
    query('[role="dialog"]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges(); tick(0);
    expect(query('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  }));

  it('exibe informações reais de itens, composição e produção nos detalhes sem recalcular', fakeAsync(() => {
    render(); fill(); openDetails();
    const content = text('[role="dialog"]');
    ['Cartão de visita / Couchê', '9 × 5 cm', '500', '123.45', 'Produzido', '504', 'Sobra útil', '4', 'A3', '12 folha(s) × 42 por folha'].forEach(value => expect(content).toContain(value));
    query<HTMLButtonElement>('[aria-label="Fechar detalhes do cálculo"]').click(); fixture.detectChanges(); tick(0);
    expect(query('[role="dialog"]')).toBeNull();
    expect(data.calcularSmartCalc).toHaveBeenCalledTimes(1);
  }));

  it('mantém o CTA no mesmo diálogo acessível dos detalhes e permite criar por ele', fakeAsync(() => {
    render(); fill(); openDetails();
    expect(query('[role="dialog"] .mobile-total-bar__cta')).toBe(cta());
    cta().click(); fixture.detectChanges();
    expect(data.criarRascunhoSmartCalc).toHaveBeenCalledTimes(1);
    expect(component.resultadoMobileAberto()).toBeTrue();
  }));

  it('preserva gestos da barra e do painel, fechamento pelo fundo e retorno do foco', fakeAsync(() => {
    render();
    const touch = (element: HTMLElement, type: string, clientY: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientY }] });
      element.dispatchEvent(event);
    };
    touch(query('.mobile-total-bar'), 'touchstart', 400);
    touch(query('.mobile-total-bar'), 'touchend', 350);
    fixture.detectChanges(); tick(0);
    expect(component.resultadoMobileAberto()).toBeTrue();
    touch(query('.mobile-result-sheet__top'), 'touchstart', 200);
    touch(query('.mobile-result-sheet__top'), 'touchend', 250);
    fixture.detectChanges(); tick(0);
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(document.activeElement).toBe(query('.mobile-total-bar'));
    openDetails(); query('.mobile-result-sheet-backdrop').click(); fixture.detectChanges(); tick(0);
    expect(query('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  }));

  it('limpa pelo painel e restaura etapa inicial, total e rolagem', fakeAsync(() => {
    render(); fill(); openDetails();
    query<HTMLButtonElement>('.mobile-result-sheet__footer button').click(); tick(300); fixture.detectChanges();
    expect(query('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(component.etapaMobileAberta()).toBe(1);
    expect(component.form.controls.produtoId.value).toBeNull();
    expect(component.total()).toBe(0);
    expect(cta().disabled).toBeTrue();
  }));

  it('mostra erros do cálculo no formulário mesmo com detalhes recolhidos', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(throwError(() => ({ error: { message: 'SMARTCALC_DIMENSOES_INVALIDAS' } })));
    render(); fill();
    expect(text('.feedback--error')).toContain('As medidas informadas não cabem');
    expect(query('[role="dialog"]')).toBeNull();
    expect(cta().disabled).toBeTrue();
  }));

  it('preserva a criação do rascunho e a rota existente pelo CTA, sem abrir detalhes', fakeAsync(() => {
    render(); fill(); cta().click(); fixture.detectChanges();
    expect(data.criarRascunhoSmartCalc).toHaveBeenCalledTimes(1);
    expect(data.criarRascunhoSmartCalc.calls.mostRecent().args[0].quantidade).toBe(500);
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/rascunhos', 42]);
    expect(query('[role="dialog"]')).toBeNull();
  }));

  it('mantém o CTA bloqueado durante criação e com resultado sem itens', fakeAsync(() => {
    render(); fill();
    const pending = new Subject<{ id?: number }>(); data.criarRascunhoSmartCalc.and.returnValue(pending);
    cta().click(); fixture.detectChanges();
    expect(cta().disabled).toBeTrue(); expect(text('.mobile-total-bar__cta')).toBe('Criando...');
    pending.next({ id: 42 }); pending.complete(); fixture.detectChanges();
    component.resultado.set({ itens: [], total: 0 }); fixture.detectChanges();
    expect(cta().disabled).toBeTrue();
  }));

  it('preserva a desativação do SmartCalc e não cria cálculos', fakeAsync(() => {
    (initService.carregarInit$ as jasmine.Spy).and.returnValue(of({ ...init, ativo: false }));
    render();
    expect(text('.feedback--warning')).toContain('SmartCalc desativado');
    expect(component.form.disabled).toBeTrue();
    expect(cta().disabled).toBeTrue();
    tick(300); expect(data.calcularSmartCalc).not.toHaveBeenCalled();
  }));

  it('mantém o desktop com títulos, seções abertas, resultado e criação originais', fakeAsync(() => {
    viewportWidth = 1280; render(); fill();
    expect(text('app-card-header')).toContain('SmartCalc – Calculadora Inteligente');
    expect(text('app-card-header')).toContain('Calcule automaticamente o melhor aproveitamento de produção.');
    expect(query('.smartcalc-step__toggle')).toBeNull();
    [1, 2, 3].forEach(step => expect(query(`#smartcalc-step-${step}`).hidden).toBeFalse());
    expect(text('.smartcalc-layout__main')).toContain('1. Produto e material');
    expect(text('.smartcalc-layout__main')).toContain('2. Medidas e quantidade');
    expect(text('.smartcalc-layout__main')).toContain('3. Acabamentos');
    expect(text('.smartcalc-layout__sidebar')).toContain('Resultado do cálculo');
    expect(query('.mobile-flow-status')).toBeNull();
    query<HTMLButtonElement>('.smartcalc-layout__sidebar button[mat-flat-button]').click();
    expect(data.criarRascunhoSmartCalc).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/rascunhos', 42]);
  }));

  it('preserva formulário e resultado entre mobile e desktop sem consultas extras', fakeAsync(() => {
    render(); fill(); openDetails();
    const form = component.form;
    viewportWidth = 901; component.onWindowResize(); fixture.detectChanges(); tick(0);
    expect(component.mobileViewport()).toBeFalse();
    expect(query('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    [1, 2, 3].forEach(step => expect(query(`#smartcalc-step-${step}`).hidden).toBeFalse());
    viewportWidth = 900; component.onWindowResize(); fixture.detectChanges();
    expect(component.mobileViewport()).toBeTrue();
    expect(component.form).toBe(form);
    expect(component.total()).toBe(123.45);
    expect(initService.carregarInit$).toHaveBeenCalledTimes(1);
    expect(data.calcularSmartCalc).toHaveBeenCalledTimes(1);
  }));
});
