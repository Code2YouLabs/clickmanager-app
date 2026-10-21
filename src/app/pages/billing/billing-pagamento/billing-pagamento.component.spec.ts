import { BreakpointObserver } from '@angular/cdk/layout';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { BillingService } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { BillingPagamentoComponent } from './billing-pagamento.component';
import { PricingCardComponent } from 'src/app/components/pricing-card/pricing-card.component';

const planos: any[] = [
  { id: 1, codigo: 'TRI', nome: 'Trimestral Pro', periodicidade: 'TRIMESTRAL', valorFinal: 359.7, moeda: 'BRL', ordemExibicao: 1, descricao: 'Plano de 3 meses', vantagem: '30 dias grátis sem cartão de crédito', beneficios_json: ['3 meses', 'Recursos completos'], imgSrc: 'assets/images/profile/user-1.jpg' },
  { id: 2, codigo: 'SEM', nome: 'Semestral Pro', periodicidade: 'SEMESTRAL', valorFinal: 647.4, moeda: 'BRL', ordemExibicao: 2, destaque: 'Mais vendido', beneficios_json: ['6 meses', 'Suporte prioritário'] },
  { id: 3, codigo: 'ANO', nome: 'Anual Pro', periodicidade: 'ANUAL', valorFinal: 1149, moeda: 'BRL', ordemExibicao: 3, beneficios_json: ['12 meses', 'Melhor custo anual'] }
];
function frameCopy(root: HTMLElement, width: number): HTMLIFrameElement {
  const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:900px;border:0`; document.body.appendChild(frame);
  const doc = frame.contentDocument!; const style = doc.createElement('style'); style.textContent = Array.from(document.styleSheets).map(sheet => Array.from(sheet.cssRules).map(rule => rule.cssText).join('\n')).join('\n'); doc.head.appendChild(style); doc.body.style.cssText = 'margin:0;--mobile-bottom-nav-height:80px'; doc.body.appendChild(root.cloneNode(true)); return frame;
}
describe('Regularizar assinatura — fundação mobile', () => {
  let fixture: ComponentFixture<BillingPagamentoComponent>, viewport: BehaviorSubject<any>, user: BehaviorSubject<any>, api: any, state: any, toastr: any, query: any, navigate: jasmine.Spy, navigateByUrl: jasmine.Spy;
  const root = () => fixture.nativeElement as HTMLElement;
  const c = () => fixture.componentInstance;
  const settle = async () => { fixture.detectChanges(); await fixture.whenStable(); fixture.detectChanges(); };
  const create = async () => { fixture = TestBed.createComponent(BillingPagamentoComponent); await settle(); };
  beforeAll(() => registerLocaleData(localePt));
  beforeEach(() => {
    sessionStorage.removeItem('billing_selected_plan'); viewport = new BehaviorSubject({ matches: true, breakpoints: {} }); user = new BehaviorSubject({ proprietario: true }); query = { returnUrl: null, planoId: null };
    state = { snapshot: { proprietario: true, planoId: 1, expiresAt: '2026-11-17' }, setFromResponse: jasmine.createSpy(), setFromErrorBody: jasmine.createSpy() };
    api = jasmine.createSpyObj('BillingService', ['obterStatus', 'listarPlanosInternos', 'checkoutAssinatura']); api.obterStatus.and.returnValue(of(state.snapshot)); api.listarPlanosInternos.and.returnValue(of([planos[2], planos[0], planos[1]])); api.checkoutAssinatura.and.returnValue(of({ outcome: 'ALREADY_REGULAR', requiresPayment: false })); toastr = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning']);
    TestBed.configureTestingModule({ imports: [BillingPagamentoComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)], providers: [provideRouter([]), { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (key: string) => query[key] } } } }, { provide: BreakpointObserver, useValue: { observe: () => viewport } }, { provide: AuthService, useValue: { usuario$: user } }, { provide: BillingService, useValue: api }, { provide: BillingStateService, useValue: state }, { provide: ToastrService, useValue: toastr }] }); navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true); navigateByUrl = spyOn(TestBed.inject(Router), 'navigateByUrl').and.resolveTo(true);
  });
  afterEach(() => { fixture?.destroy(); sessionStorage.removeItem('billing_selected_plan'); sessionStorage.removeItem('billing_checkout_result'); });
  it('usa PageCard, Voltar no cabeçalho, planos expansíveis e um rodapé compartilhado', async () => {
    await create(); expect(root().querySelector('app-page-card')).not.toBeNull(); expect(root().querySelectorAll('app-section-card').length).toBe(3); expect(root().querySelectorAll('.section-card__toggle[aria-expanded="true"]').length).toBe(1); expect(root().querySelectorAll('app-mobile-total-bar').length).toBe(1); expect(root().querySelectorAll('button').length).toBeGreaterThan(0);
    const back = root().querySelector<HTMLButtonElement>('[page-mobile-header-actions]')!; expect(back.textContent).toContain('Voltar'); back.click(); expect(navigate).toHaveBeenCalledWith(['/billing/blocked']);
  });
  it('Voltar mantém o returnUrl existente', async () => {
    query.returnUrl = '/billing/minha-assinatura'; await create(); root().querySelector<HTMLButtonElement>('[page-mobile-header-actions]')!.click(); expect(navigateByUrl).toHaveBeenCalledWith('/billing/minha-assinatura');
  });
  it('expandir não seleciona nem paga; Selecionar mantém plano, resumo e sessionStorage', async () => {
    await create(); c().expandirPlano(2, true); await settle(); expect(c().planoSelecionado?.id).toBe(1); expect(api.checkoutAssinatura).not.toHaveBeenCalled();
    root().querySelectorAll('app-pricing-card button')[1].dispatchEvent(new MouseEvent('click', { bubbles: true })); await settle(); expect(c().planoSelecionado?.id).toBe(2); expect(sessionStorage.getItem('billing_selected_plan')).toBe('2'); expect(root().querySelector('.selected-plan-summary')?.textContent).toContain('Semestral Pro'); expect(c().precoMensal(planos[1])).toBeCloseTo(107.9); expect(root().querySelector('.selected-plan-summary')?.textContent).toContain('647,40'); expect(api.checkoutAssinatura).not.toHaveBeenCalled();
  });
  it('preserva preferência por planoId e ordenação dos planos', async () => {
    query.planoId = '3'; await create(); expect(c().planos.map(p => p.id)).toEqual([1, 2, 3]); expect(c().planoSelecionado?.id).toBe(3); expect(c().mobilePlanoAberto).toBe(3);
  });
  it('pagar usa handler e endpoint atuais uma vez, sem iniciar pagamento ao selecionar', async () => {
    const pending = new Subject<any>(); api.checkoutAssinatura.and.returnValue(pending); await create(); c().selecionar(planos[2]); root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.click(); c().pagarMobile(); await settle(); expect(api.checkoutAssinatura).toHaveBeenCalledOnceWith(3); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue();
    pending.next({ outcome: 'BENEFIT_APPLIED', benefitApplied: true }); pending.complete(); await settle(); expect(navigate).toHaveBeenCalledWith(['/billing/confirmacao'], { state: { billingConfirmationResult: { outcome: 'BENEFIT_APPLIED', benefitApplied: true } } }); expect(c().loading).toBeFalse();
  });
  it('erro libera loading e permite nova tentativa preservando seleção', async () => {
    api.checkoutAssinatura.and.returnValue(throwError(() => ({ status: 500 }))); await create(); c().selecionar(planos[1]); c().pagarMobile(); await settle(); expect(c().loading).toBeFalse(); expect(c().planoSelecionado?.id).toBe(2); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeFalse(); c().pagarMobile(); expect(api.checkoutAssinatura).toHaveBeenCalledTimes(2);
  });
  it('preserva a validação do proprietário e bloqueia novas tentativas após 403', async () => {
    await create(); user.next({ proprietario: false }); await settle(); c().pagarMobile(); expect(api.checkoutAssinatura).not.toHaveBeenCalled(); expect(root().querySelector<HTMLButtonElement>('.mobile-total-bar__cta')!.disabled).toBeTrue();
    user.next({ proprietario: true }); api.checkoutAssinatura.and.returnValue(throwError(() => ({ status: 403 }))); c().pagarMobile(); await settle(); expect(c().ownerDenied).toBeTrue(); expect(c().loading).toBeFalse(); expect(root().textContent).toContain('Somente o proprietário');
  });
  it('estados loading, erro, retry e vazio não liberam pagamento', async () => {
    state.snapshot = null; const pending = new Subject<any>(); api.obterStatus.and.returnValue(pending); await create(); expect(root().textContent).toContain('Carregando planos'); expect(c().podePagarMobile).toBeFalse(); pending.error({}); await settle(); expect(root().querySelector('[role="alert"]')).not.toBeNull(); api.obterStatus.and.returnValue(of({ proprietario: true })); api.listarPlanosInternos.and.returnValue(of([])); c().tentarNovamente(); await settle(); expect(root().textContent).toContain('Nenhum plano disponível'); expect(c().podePagarMobile).toBeFalse();
    api.listarPlanosInternos.and.returnValue(throwError(() => ({}))); c().tentarNovamente(); await settle(); expect(root().querySelector('[role="alert"]')).not.toBeNull(); api.listarPlanosInternos.and.returnValue(of(planos)); c().tentarNovamente(); await settle(); expect(c().podePagarMobile).toBeTrue();
  });
  for (const width of [360, 390, 430, 1024, 1440]) it(`preserva área útil e desktop em ${width}px`, async () => {
    viewport.next({ matches: width <= 760, breakpoints: {} }); await create(); const frame = frameCopy(root(), width);
    try { const doc = frame.contentDocument!;
      if (width <= 760) {
        expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); expect(doc.querySelector('.mobile-total-bar')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(820); expect(doc.querySelectorAll('.section-card__toggle').length).toBe(3);
        for (const plano of planos) { c().expandirPlano(plano.id, true); await settle(); doc.body.replaceChildren(root().cloneNode(true)); expect(doc.documentElement.scrollWidth).toBeLessThanOrEqual(width); const button = doc.querySelector<HTMLElement>('.section-card__body:not([hidden]) app-pricing-card button')!; expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44); }
      } else { expect(doc.querySelector('app-page-card')).toBeNull(); expect(doc.querySelector('app-section-card')).toBeNull(); expect(doc.querySelector('app-mobile-total-bar')).toBeNull(); expect(doc.querySelectorAll('app-pricing-card').length).toBe(3); expect(doc.querySelector('.selected-plan-summary')).not.toBeNull(); }
    } finally { frame.remove(); }
  });
  it('variante compacta de PricingCard é opt-in e não modifica consumidores existentes', async () => {
    viewport.next({ matches: false, breakpoints: {} }); await create(); expect(root().querySelector('.pricing-card--mobile-compact')).toBeNull();
    const other = TestBed.createComponent(PricingCardComponent); other.componentInstance.plano = planos[0]; other.detectChanges(); expect(other.componentInstance.mobileCompact).toBeFalse(); expect(other.nativeElement.classList.contains('pricing-card--mobile-compact')).toBeFalse(); other.destroy();
  });
});
