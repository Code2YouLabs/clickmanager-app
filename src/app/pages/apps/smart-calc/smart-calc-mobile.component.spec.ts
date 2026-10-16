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
  let originalWidthDescriptor: PropertyDescriptor | undefined;
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector);
  const cta = () => query<HTMLButtonElement>('.mobile-total-bar__cta');
  const text = (selector: string) => query(selector)?.textContent?.replace(/\s+/g, ' ').trim();
  const expectAwaitingPanel = () => {
    expect(query('app-mobile-total-bar')).not.toBeNull();
    expect(query('.mobile-total-bar--awaiting-result')).not.toBeNull();
    expect(query('.mobile-total-bar__summary')).toBeNull();
    expect(cta()).toBeNull();
    expect(query('.mobile-total-bar__expand--button')).toBeNull();
    expect(query('#smartcalc-mobile-details')).toBeNull();
    expect(query<HTMLButtonElement>('.mobile-total-bar__handle-toggle').disabled).toBeTrue();
  };
  const render = () => { fixture.detectChanges(); tick(0); fixture.detectChanges(); };
  const fill = () => {
    component.form.controls.produtoId.setValue(1);
    component.form.patchValue({ largura: 9, altura: 5, quantidade: 500 });
    tick(300); fixture.detectChanges();
  };
  const openDetails = () => {
    query('.mobile-total-bar__expand--button').click(); fixture.detectChanges(); tick(0); fixture.detectChanges();
  };

  beforeEach(async () => {
    viewportWidth = 360;
    originalWidthDescriptor = Object.getOwnPropertyDescriptor(window, 'innerWidth');
    Object.defineProperty(window, 'innerWidth', { configurable: true, get: () => viewportWidth });
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
  afterEach(() => {
    fixture?.destroy();
    if (originalWidthDescriptor) Object.defineProperty(window, 'innerWidth', originalWidthDescriptor);
    else Reflect.deleteProperty(window, 'innerWidth');
  });

  it('mantém o formulário inicial sem resumo artificial e o painel inferior discreto', fakeAsync(() => {
    render();
    expect(text('app-card-header')).toContain('SmartCalc');
    expect(text('app-card-header')).not.toContain('Calculadora Inteligente');
    expect(text('.mobile-flow-status')).toBe('Comece escolhendo produto e material.');
    expect(query('#smartcalc-step-1').hidden).toBeFalse();
    expect(query('#smartcalc-step-2').hidden).toBeTrue();
    expect(query('#smartcalc-step-3').hidden).toBeTrue();
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    expect(text('.mobile-total-bar__waiting strong')).toBe('Aguardando cálculo');
    expect(text('.mobile-total-bar__waiting')).toContain('O resultado aparecerá aqui.');
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).toBeNull();
    expect(query('.mobile-result-state')).toBeNull();
    expect(query('form.smartcalc-layout').textContent).not.toContain('Resumo do cálculo');
    expect(fixture.nativeElement.textContent).not.toContain('O resultado aparecerá aqui após preencher os dados necessários.');
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
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    tick(300); expect(data.calcularSmartCalc).not.toHaveBeenCalled();
  }));

  it('atualiza o total pelo mesmo serviço e bloqueia a ação durante recálculo', fakeAsync(() => {
    render(); fill();
    const pending = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(pending);
    component.form.controls.quantidade.setValue(1000); fixture.detectChanges();
    expectAwaitingPanel();
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).toBeNull();
    expect(text('.mobile-total-bar__waiting')).toContain('Aguardando cálculo');
    tick(300); fixture.detectChanges();
    expect(component.carregandoCalculo).toBeTrue();
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).not.toBeNull();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    expectAwaitingPanel();
    pending.next({ ...resultado, total: 250 }); pending.complete(); fixture.detectChanges();
    expect(text('.mobile-total-bar__summary .value')).toContain('250.00');
    expect(cta().disabled).toBeFalse();
    expect(query('.mobile-total-bar__waiting')).toBeNull();
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
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
  }));

  it('expande os detalhes do resultado na mesma barra e recolhe por Escape sem bloquear a página', fakeAsync(() => {
    render(); fill();
    const bar = query('.mobile-total-bar'); const button = cta();
    openDetails();
    expect(query('.mobile-total-bar')).toBe(bar);
    expect(cta()).toBe(button);
    expect(bar.contains(query('#smartcalc-mobile-details'))).toBeTrue();
    expect(text('#smartcalc-mobile-details')).toContain('Itens calculados');
    expect(query('.mobile-total-bar__expand--button').getAttribute('aria-expanded')).toBe('true');
    expect(text('.mobile-total-bar__expand--button')).toContain('Ocultar detalhes');
    expect(query('[role="dialog"]')).toBeNull();
    expect(query('.mobile-result-sheet')).toBeNull();
    expect(query('.mobile-result-sheet-backdrop')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    bar.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    fixture.detectChanges(); tick(0);
    expect(query('#smartcalc-mobile-details').getAttribute('aria-hidden')).toBe('true');
    expect(query('#smartcalc-mobile-details').hasAttribute('inert')).toBeTrue();
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(document.activeElement).toBe(query('.mobile-total-bar__expand--button'));
  }));

  it('mantém dados de itens e produção nos detalhes e recolhe pela mesma ação sem recalcular', fakeAsync(() => {
    render(); fill();
    const total = text('.mobile-total-bar__summary .value');
    openDetails();
    const content = text('#smartcalc-mobile-details');
    ['Cartão de visita / Couchê', '9 × 5 cm', '500', '123.45', 'Produzido', '504', 'Sobra útil', '4', 'A3', '12 folha(s) × 42 por folha'].forEach(value => expect(content).toContain(value));
    expect(text('.mobile-total-bar__summary .value')).toBe(total);
    query('.mobile-total-bar__expand--button').click(); fixture.detectChanges(); tick(0);
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(query('#smartcalc-mobile-details').getAttribute('aria-hidden')).toBe('true');
    expect(text('.mobile-total-bar__expand--button')).toContain('Detalhes');
    expect(data.calcularSmartCalc).toHaveBeenCalledTimes(1);
  }));

  it('preserva o único CTA e sua ação nos dois estados da barra', fakeAsync(() => {
    render(); fill();
    const button = cta();
    openDetails();
    expect(cta()).toBe(button);
    expect(fixture.nativeElement.querySelectorAll('app-mobile-total-bar .mobile-total-bar__cta').length).toBe(1);
    expect(button.disabled).toBeFalse();
    button.click(); fixture.detectChanges();
    expect(data.criarRascunhoSmartCalc).toHaveBeenCalledTimes(1);
    expect(component.resultadoMobileAberto()).toBeTrue();
  }));

  it('não recolhe ao interagir com detalhes, limpar bloqueado ou rolar seu conteúdo', fakeAsync(() => {
    render(); fill(); openDetails();
    query('.mobile-calculation-details h2').click(); fixture.detectChanges();
    expect(component.resultadoMobileAberto()).toBeTrue();
    component.carregandoAdd = true; fixture.detectChanges();
    query<HTMLButtonElement>('.mobile-calculation-details__clear').click(); fixture.detectChanges();
    expect(component.resultadoMobileAberto()).toBeTrue();
    expect(cta().disabled).toBeTrue();
    const event = new Event('touchstart', { bubbles: true });
    Object.defineProperty(event, 'changedTouches', { value: [{ clientY: 200 }] });
    query('.mobile-total-bar__details-content').dispatchEvent(event);
    const end = new Event('touchend', { bubbles: true });
    Object.defineProperty(end, 'changedTouches', { value: [{ clientY: 100 }] });
    query('.mobile-total-bar__details-content').dispatchEvent(end); fixture.detectChanges();
    expect(component.resultadoMobileAberto()).toBeTrue();
  }));

  it('limpa pelo painel e restaura etapa inicial, total e rolagem', fakeAsync(() => {
    render(); fill(); openDetails();
    query<HTMLButtonElement>('.mobile-calculation-details__clear').click(); tick(300); fixture.detectChanges();
    expect(query('#smartcalc-mobile-details')).toBeNull();
    expect(document.body.style.overflow).toBe('');
    expect(component.etapaMobileAberta()).toBe(1);
    expect(component.form.controls.produtoId.value).toBeNull();
    expect(component.total()).toBe(0);
    expect(text('.mobile-total-bar__waiting')).toContain('O resultado aparecerá aqui');
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).toBeNull();
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
  }));

  it('mostra erros do cálculo no formulário mesmo com detalhes recolhidos', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(throwError(() => ({ error: { message: 'SMARTCALC_DIMENSOES_INVALIDAS' } })));
    render(); fill();
    expect(text('.feedback--error')).toContain('As medidas informadas não cabem');
    expect(query('[role="dialog"]')).toBeNull();
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
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
    expectAwaitingPanel();
  }));

  it('preserva a desativação do SmartCalc e não cria cálculos', fakeAsync(() => {
    (initService.carregarInit$ as jasmine.Spy).and.returnValue(of({ ...init, ativo: false }));
    render();
    expect(text('.feedback--warning')).toContain('SmartCalc desativado');
    expect(component.form.disabled).toBeTrue();
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    tick(300); expect(data.calcularSmartCalc).not.toHaveBeenCalled();
  }));

  it('expande e recolhe pelo handle mantendo o texto de detalhes e o mesmo resumo', fakeAsync(() => {
    render(); fill();
    const bar = query('.mobile-total-bar'); const button = cta();
    query('.mobile-total-bar__handle-toggle').click(); fixture.detectChanges();
    expect(component.resultadoMobileAberto()).toBeTrue();
    expect(text('.mobile-total-bar__expand--button')).toContain('Ocultar detalhes');
    expect(query('.mobile-total-bar__handle-toggle').getAttribute('aria-label')).toBe('Ocultar detalhes do cálculo');
    query('.mobile-total-bar__handle-toggle').click(); fixture.detectChanges();
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(query('.mobile-total-bar')).toBe(bar); expect(cta()).toBe(button);
    expect(data.calcularSmartCalc).toHaveBeenCalledTimes(1);
  }));

  it('exibe o total somente no rodapé mobile, preservando subtotais dos itens', fakeAsync(() => {
    render(); fill(); openDetails();
    expect(query('#smartcalc-mobile-details .total-summary')).toBeNull();
    expect(text('.mobile-total-bar__summary .value')).toContain('123.45');
    expect(text('#smartcalc-mobile-details [data-label="Subtotal"]')).toContain('123.45');
    expect(fixture.nativeElement.querySelectorAll('.mobile-total-bar__summary').length).toBe(1);
    expect(query('.smartcalc-layout__sidebar .total-summary')).not.toBeNull();
  }));

  it('agrupa aproveitamento em indicadores compactos na ordem produzido, solicitado e sobra', fakeAsync(() => {
    render(); fill(); openDetails();
    const labels = Array.from(fixture.nativeElement.querySelectorAll('.mobile-production dt') as NodeListOf<HTMLElement>).map(item => item.textContent?.trim());
    expect(labels).toEqual(['Produzido', 'Solicitado', 'Sobra útil']);
    const values = Array.from(fixture.nativeElement.querySelectorAll('.mobile-production__value') as NodeListOf<HTMLElement>).map(item => item.textContent?.trim());
    expect(values).toEqual(['504', '500', '4']);
    expect(text('.mobile-production')).toContain('Custo unit. R$ 0,25');
    expect(text('.mobile-production')).toContain('+4 sem alterar o custo');
    expect(query('#smartcalc-mobile-details app-metric-card')).toBeNull();
    expect(text('#smartcalc-mobile-details')).toContain('Aproveitamento da produção');
    expect(text('#smartcalc-mobile-details')).toContain('Distribuição da produção');
  }));

  it('preserva múltiplos itens e descrições por área/quantidade/acabamentos sem inventar aproveitamento', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(of({
      total: 198.45,
      itens: [resultado.itens[0], { ...resultado.itens[0], id: 99, nomeComposto: 'Lona por m² com ilhós', descricao: '2,5 m² · acabamento ilhós', quantidade: 2.5, valor: 30, subTotal: 75 }],
    }));
    render(); fill(); openDetails();
    expect(fixture.nativeElement.querySelectorAll('#smartcalc-mobile-details tbody tr').length).toBe(2);
    expect(text('#smartcalc-mobile-details')).toContain('2,5 m² · acabamento ilhós');
    expect(text('#smartcalc-mobile-details')).toContain('75.00');
    expect(query('.mobile-production')).toBeNull();
    expect(query('#smartcalc-mobile-details .distribution-list')).toBeNull();
    expect(text('.mobile-total-bar__summary .value')).toContain('198.45');
  }));

  it('não inventa folhas ou indicadores quando a distribuição contém somente formato e orientação', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(of({ ...resultado, observacaoResumo: {
      distribuicao: [{ formato: 'Rolo de lona', orientacao: 'PAISAGEM' }],
    } }));
    render(); fill(); openDetails();
    expect(text('#smartcalc-mobile-details .distribution-list')).toContain('Rolo de lona');
    expect(text('#smartcalc-mobile-details .distribution-list')).not.toContain('folha');
    expect(text('#smartcalc-mobile-details')).not.toContain('undefined');
    expect(query('.mobile-production')).toBeNull();
  }));

  it('preserva zero e ausência de sobra útil sem preencher números ausentes', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(of({ ...resultado, observacaoResumo: { solicitado: 0, sobraUtil: 0, custoUnitarioSolicitado: 0 } }));
    render(); fill(); openDetails();
    expect(text('.mobile-production')).toContain('Sem sobra útil');
    expect(text('.mobile-production')).toContain('Custo unit. R$ 0,00');
    expect(text('.mobile-production')).not.toContain('Produzido');
    expect(text('.mobile-production')).not.toContain('undefined');
    expect(fixture.nativeElement.querySelectorAll('.mobile-production dd').length).toBe(2);
  }));

  it('mantém o painel discreto antes do resultado e quando o recálculo falha', fakeAsync(() => {
    const pending = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(pending);
    render(); fill();
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    pending.next(resultado); pending.complete(); fixture.detectChanges();
    expect(cta().disabled).toBeFalse();
    const recalculo = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(recalculo);
    openDetails(); component.form.controls.quantidade.setValue(1000); tick(300); fixture.detectChanges();
    expectAwaitingPanel();
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).not.toBeNull();
    recalculo.error({ error: { message: 'SEM_PRECO_CONFIGURADO' } }); fixture.detectChanges(); tick(0);
    expect(text('.feedback--error')).toContain('Não há preço configurado');
    expectAwaitingPanel();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    expect(component.resultadoMobileAberto()).toBeFalse();
  }));

  it('alterna de espera para resultado recolhido, inclusive com total zero válido', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(of({ ...resultado, total: 0 }));
    render();
    expectAwaitingPanel();
    fill();
    expect(query('app-mobile-total-bar')).not.toBeNull();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    expect(text('.mobile-total-bar__summary .value')).toContain('0.00');
    expect(cta().disabled).toBeFalse();
    expect(query('#smartcalc-mobile-details').getAttribute('aria-hidden')).toBe('true');
    expect(query('.mobile-total-bar__handle-toggle')).not.toBeNull();
  }));

  it('retorna o mesmo painel ao estado de espera ao invalidar e depois recolhido ao calcular', fakeAsync(() => {
    render(); fill(); openDetails();
    component.form.controls.altura.setValue(null); fixture.detectChanges(); tick(300);
    expectAwaitingPanel();
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
    component.form.controls.altura.setValue(5); tick(300); fixture.detectChanges();
    expect(query('app-mobile-total-bar')).not.toBeNull();
    expect(query('#smartcalc-mobile-details').getAttribute('aria-hidden')).toBe('true');
    expect(data.calcularSmartCalc).toHaveBeenCalledTimes(2);
    expect(initService.carregarInit$).toHaveBeenCalledTimes(1);
  }));

  it('preserva o painel e seus elementos medidos ao alternar entre vazio e calculado', fakeAsync(() => {
    const observe = spyOn(ResizeObserver.prototype, 'observe').and.callThrough();
    render();
    const bar = query('.mobile-total-bar');
    const controls = query('.mobile-total-bar__controls'); const handle = query('.mobile-total-bar__handle-toggle');
    expect(observe).toHaveBeenCalledWith(bar); expect(observe).toHaveBeenCalledWith(controls); expect(observe).toHaveBeenCalledWith(handle);
    fill(); openDetails();
    expect(query('.mobile-total-bar')).toBe(bar);
    component.form.controls.altura.setValue(null); fixture.detectChanges(); tick(0);
    expectAwaitingPanel();
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(query('.mobile-total-bar')).toBe(bar);
    component.form.controls.altura.setValue(5); tick(300); fixture.detectChanges();
    expect(query('.mobile-total-bar')).toBe(bar);
    expect(query('.mobile-total-bar__controls')).toBe(controls); expect(query('.mobile-total-bar__handle-toggle')).toBe(handle);
    expect(query('#smartcalc-mobile-details').getAttribute('aria-hidden')).toBe('true');
  }));

  it('mantém os grupos e a ação final dentro da área de detalhes, separados dos controles do rodapé', fakeAsync(() => {
    data.calcularSmartCalc.and.returnValue(of({ ...resultado, observacaoResumo: {
      ...resultado.observacaoResumo,
      distribuicao: [
        { formato: 'A3', orientacao: 'PAISAGEM', folhas: 12, porFolha: 42 },
        { formato: 'A4', orientacao: 'RETRATO', folhas: 5, porFolha: 20 },
      ],
    } }));
    render(); fill(); openDetails();
    const scroll = query('.mobile-total-bar__details-content');
    expect(scroll.contains(query('.mobile-calculation-details__clear'))).toBeTrue();
    expect(scroll.contains(cta())).toBeFalse();
    expect(scroll.contains(query('.mobile-total-bar__summary'))).toBeFalse();
    expect(Array.from(scroll.querySelectorAll('.block-title')).map(element => element.textContent?.trim())).toEqual([
      'Itens calculados', 'Aproveitamento da produção', 'Distribuição da produção',
    ]);
    expect(scroll.querySelectorAll('.distribution-row').length).toBe(2);
    expect(scroll.textContent).toContain('A3'); expect(scroll.textContent).toContain('A4');
    expect(query('.mobile-total-bar__controls').contains(cta())).toBeTrue();
  }));

  it('mantém orientação parcial somente no painel inferior, sem spinner, total ou CTA', fakeAsync(() => {
    render(); component.form.controls.produtoId.setValue(1); fixture.detectChanges(); tick(300);
    expect(component.form.controls.materialId.value).toBe(20);
    expect(text('.mobile-total-bar__waiting')).toContain('O resultado aparecerá aqui');
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).toBeNull();
    expect(query('.mobile-total-bar__waiting .value')).toBeNull();
    expect(query('.mobile-total-bar__waiting button')).toBeNull();
    expectAwaitingPanel();
    const form = query('form.smartcalc-layout');
    expect(form.contains(query('.mobile-total-bar__waiting'))).toBeFalse();
    expect(query('app-mobile-total-bar').contains(query('.mobile-total-bar__waiting'))).toBeTrue();
    expect(data.calcularSmartCalc).not.toHaveBeenCalled();
  }));

  it('substitui orientação por resultado sem recriar o formulário ou perder entradas', fakeAsync(() => {
    render();
    const form = component.form;
    const inputs = Array.from(fixture.nativeElement.querySelectorAll('mat-select, app-input-numerico input'));
    fill();
    expect(query('.mobile-total-bar__waiting')).toBeNull();
    expect(query('app-mobile-total-bar')).not.toBeNull();
    expect(component.form).toBe(form);
    expect(Array.from(fixture.nativeElement.querySelectorAll('mat-select, app-input-numerico input'))).toEqual(inputs);
    expect(component.form.getRawValue()).toEqual(jasmine.objectContaining({ produtoId: 1, materialId: 20, largura: 9, altura: 5, quantidade: 500 }));
    component.form.controls.altura.setValue(null); fixture.detectChanges(); tick(0);
    expectAwaitingPanel();
    expect(query('.mobile-total-bar__waiting')).not.toBeNull();
    expect(component.form).toBe(form);
    expect(component.form.controls.quantidade.value).toBe(500);
    expect(Array.from(fixture.nativeElement.querySelectorAll('mat-select, app-input-numerico input'))).toEqual(inputs);
  }));

  it('indica processamento real sem repetir o spinner no cabeçalho mobile', fakeAsync(() => {
    const pending = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(pending);
    render(); fill();
    expect(query('.mobile-total-bar__waiting').getAttribute('aria-busy')).toBe('true');
    expect(text('.mobile-total-bar__waiting')).toContain('Calculando...');
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).not.toBeNull();
    expect(query('app-card-header mat-progress-spinner')).toBeNull();
    expect(query('.mobile-flow-status')).toBeNull();
    pending.next(resultado); pending.complete(); fixture.detectChanges();
    expect(query('.mobile-total-bar__waiting')).toBeNull();
    expect(text('.mobile-total-bar__summary .value')).toContain('123.45');
  }));

  it('não apresenta resposta antiga recebida depois que as entradas foram invalidadas', fakeAsync(() => {
    const pending = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(pending);
    render(); fill();
    component.form.controls.altura.setValue(null); fixture.detectChanges();
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).toBeNull();
    pending.next(resultado); pending.complete(); fixture.detectChanges();
    expectAwaitingPanel();
    expect(component.total()).toBe(0);
    expect(query('.mobile-total-bar__waiting')).not.toBeNull();
    expect(query('.smartcalc-page--has-mobile-panel')).not.toBeNull();
  }));

  it('esconde valores anteriores durante cálculo manual mesmo sem sinal de debounce', fakeAsync(() => {
    render(); fill();
    const pending = new Subject<SmartCalcResultado>(); data.calcularSmartCalc.and.returnValue(pending);
    component.calcular(); fixture.detectChanges();
    expect(component.needsRecalcular()).toBeFalse();
    expectAwaitingPanel();
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).not.toBeNull();
    pending.next({ ...resultado, total: 300 }); pending.complete(); fixture.detectChanges();
    expect(text('.mobile-total-bar__summary .value')).toContain('300.00');
  }));

  it('mantém o handle vazio desabilitado e sem área de expansão', fakeAsync(() => {
    render();
    const handle = query<HTMLButtonElement>('.mobile-total-bar__handle-toggle');
    handle.click(); fixture.detectChanges();
    expect(component.resultadoMobileAberto()).toBeFalse();
    expect(query('#smartcalc-mobile-details')).toBeNull();
    expect(handle.getAttribute('aria-expanded')).toBe('false');
    expect(handle.getAttribute('aria-label')).toBe('Aguardando cálculo');
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
    expect(query('.mobile-total-bar__waiting')).toBeNull();
    expect(query('app-mobile-total-bar')).toBeNull();
    expect(query('.smartcalc-page--has-mobile-panel')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('.smartcalc-layout__sidebar app-metric-card').length).toBe(3);
    expect(query('.smartcalc-layout__sidebar .total-summary')).not.toBeNull();
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
