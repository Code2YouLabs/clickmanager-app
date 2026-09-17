import { TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, delay } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { SetupProgress } from 'src/app/components/setup-progress/setup-progress.component';
import { BibliotecaService } from '../grafica/biblioteca/biblioteca.service';
import { OnboardingV2ProductsPageComponent } from './products-step/onboarding-v2-products-page.component';
import { OnboardingV2CompanyPageComponent } from './company-step/onboarding-v2-company-page.component';
import { OnboardingV2SummaryPageComponent } from './summary-step/onboarding-v2-summary-page.component';
import { OnboardingV2StateService } from './services/onboarding-v2-state.service';
import { OnboardingV2Service } from './services/onboarding-v2.service';

const pending: SetupProgress = { id: 9, status: 'PENDENTE', fase: 'AGUARDANDO', total: 150, processados: 0, criados: 0, duplicados: 0, erros: 0, tempoEstimadoRestanteSegundos: null, itens: [] };
const done: SetupProgress = { ...pending, status: 'CONCLUIDO', fase: 'CONCLUIDO', processados: 150, criados: 148, duplicados: 2 };
const company = { nome: 'Gráfica Teste', telefone: '11999999999', email: 'teste@example.com', responsavelNome: 'Pessoa Teste', responsavelTelefone: '11988888888' };

describe('Narrativa do onboarding', () => {
  let biblioteca: any, state: any, api: any, updates: Subject<SetupProgress>, accepted: Subject<SetupProgress>;
  beforeEach(async () => {
    updates = new Subject(); accepted = new Subject();
    biblioteca = jasmine.createSpyObj('Biblioteca', ['ultima', 'listar', 'importar', 'acompanhar']);
    biblioteca.ultima.and.returnValue(of(null));
    biblioteca.listar.and.returnValue(of([{id: 1, tipo: 'PRODUTO', nome: 'Vinil', categoria: 'Adesivos', tiposPreco: [], acabamentos: []}]));
    biblioteca.importar.and.returnValue(accepted); biblioteca.acompanhar.and.returnValue(updates);
    state = jasmine.createSpyObj('State', ['refreshProgress','saveCompany','finishOnboarding','loadResumo','saving','error','resumo']);
    state.refreshProgress.and.returnValue(of({onboardingVersion: 'v2', currentStep: 'products', status: 'company_completed'}));
    state.saveCompany.and.returnValue(of({currentStep: 'products', status: 'company_completed'}));
    state.finishOnboarding.and.returnValue(of({onboardingConcluido: true}));
    state.saving.and.returnValue(false);
    state.loadResumo.and.returnValue(of({onboardingVersion: 'v2', currentStep: 'summary', status: 'products_completed'}));
    state.resumo.and.returnValue({empresa: company});
    api = jasmine.createSpyObj('OnboardingApi',['concluirBiblioteca']);
    api.concluirBiblioteca.and.returnValue(of({currentStep: 'summary', status: 'products_completed'}));
    await TestBed.configureTestingModule({
      imports: [OnboardingV2ProductsPageComponent, OnboardingV2CompanyPageComponent, OnboardingV2SummaryPageComponent, NoopAnimationsModule],
      providers: [
        {provide: BibliotecaService, useValue: biblioteca}, {provide: OnboardingV2StateService, useValue: state},
        {provide: OnboardingV2Service, useValue: api},
        {provide: Router, useValue: jasmine.createSpyObj('Router',['navigateByUrl','navigate'])},
        {provide: ToastrService, useValue: jasmine.createSpyObj('Toast',['success','error'])},
        {provide: AuthService, useValue: {isAuthenticated: () => true, getDefaultRouteForUsuario: () => '/painel'}},
      ],
    }).compileComponents();
  });

  it('mostra Sua empresa e avança para catálogo pelo botão no final do conteúdo', async () => {
    state.refreshProgress.and.returnValue(of({onboardingVersion: 'v2', currentStep: 'company', status: 'pending', empresa: company}).pipe(delay(0)));
    const f = TestBed.createComponent(OnboardingV2CompanyPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.querySelector('h1').textContent).toContain('Sua empresa');
    expect(f.nativeElement.querySelector('[aria-current="step"]').textContent).toContain('Sua empresa');
    expect(f.nativeElement.querySelector('header button')).toBeNull();
    const action = f.nativeElement.querySelector('footer button[mat-flat-button]');
    expect(action.disabled).toBeFalse(); action.click();
    expect(state.saveCompany).toHaveBeenCalled();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/produtos');
    f.destroy();
  });

  it('pula a seleção sem iniciar uma importação e apresenta a conclusão', async () => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    f.nativeElement.querySelector('footer button[mat-button]').click();
    expect(api.concluirBiblioteca).toHaveBeenCalledTimes(1);
    expect(biblioteca.importar).not.toHaveBeenCalled();
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/resumo');
    f.destroy();
    const summary = TestBed.createComponent(OnboardingV2SummaryPageComponent);
    summary.detectChanges(); await summary.whenStable(); summary.detectChanges();
    expect(summary.nativeElement.textContent).toContain('Tudo pronto!');
    expect(summary.nativeElement.querySelector('header').textContent).toContain('100%');
    summary.nativeElement.querySelector('.onboarding-page__completion-action button').click();
    expect(state.finishOnboarding).toHaveBeenCalled(); summary.destroy();
  });

  it('muda imediatamente para etapa 3, acompanha dados reais e conclui dentro da tela', async () => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    f.componentInstance.seletor!.selecionarTodos(true); f.detectChanges();
    f.nativeElement.querySelector('footer button[mat-flat-button]').click(); f.detectChanges();
    expect(f.componentInstance.stage).toBe('PREPARANDO');
    expect(f.nativeElement.querySelector('[aria-current="step"]').textContent).toContain('Preparando');
    expect(f.nativeElement.textContent).not.toContain('Quais produtos você oferece?');
    expect(f.nativeElement.querySelector('app-hierarchy-tree')).toBeNull();
    accepted.next(pending); accepted.complete(); updates.next(pending); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Sua preparação começará em instantes');
    updates.next({...pending, status: 'PROCESSANDO', fase: 'IMPORTANDO_ITENS', processados: 47, criados: 45, duplicados: 2, tempoEstimadoRestanteSegundos: 60}); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('47 de 150');
    expect(f.nativeElement.textContent).toContain('Cerca de 1 minuto');
    updates.next(done); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.querySelector('header').textContent).toContain('100%');
    expect(f.nativeElement.textContent).toContain('148 adicionados');
    expect(f.nativeElement.querySelector('header button')).toBeNull();
    f.nativeElement.querySelector('.onboarding-page__completion-action button').click();
    expect(state.finishOnboarding).toHaveBeenCalled(); f.destroy();
  });

  for (const job of [pending, done]) {
    it(`recupera ${job.status} após refresh sem criar nova importação`, async () => {
      biblioteca.ultima.and.returnValue(of(job));
      const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
      f.detectChanges(); await f.whenStable(); f.detectChanges();
      expect(f.componentInstance.stage).toBe(job === pending ? 'PREPARANDO' : 'CONCLUIDO');
      expect(f.nativeElement.textContent).not.toContain('Quais produtos você oferece?');
      expect(biblioteca.importar).not.toHaveBeenCalled();
      expect(biblioteca.listar).not.toHaveBeenCalled();
      if (job === pending) expect(biblioteca.acompanhar).toHaveBeenCalledWith(9);
      else expect(f.nativeElement.textContent).toContain('Tudo pronto!');
      f.destroy();
    });
  }

  it('volta à seleção se o pedido não foi criado e a reconexão confirma ausência de preparação', async () => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    f.componentInstance.seletor!.selecionarTodos(true); f.componentInstance.submit();
    accepted.error(new Error('conexão')); await f.whenStable(); f.detectChanges();
    expect(f.componentInstance.stage).toBe('CATALOGO');
    expect(f.componentInstance.seletor!.selecionados.size).toBe(1);
    expect(biblioteca.ultima).toHaveBeenCalledTimes(2); f.destroy();
  });
  it('preserva os totais da preparação na rota de conclusão após refresh', async () => {
    biblioteca.ultima.and.returnValue(of(done));
    const f = TestBed.createComponent(OnboardingV2SummaryPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('148 adicionados');
    expect(f.nativeElement.textContent).toContain('2 já existiam');
    expect(biblioteca.importar).not.toHaveBeenCalled(); f.destroy();
  });

  it('acomoda stepper, árvore e ações em 360px sem rolagem horizontal', async () => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const frame = document.createElement('iframe');
    frame.style.width = '360px'; frame.style.height = '800px';
    document.body.appendChild(frame);
    try {
      const doc = frame.contentDocument!;
      document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => doc.head.appendChild(style.cloneNode(true)));
      doc.body.style.margin = '0';
      doc.body.appendChild(f.nativeElement.cloneNode(true));
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const layout = doc.querySelector('.onboarding-page-layout') as HTMLElement;
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
      const steps = doc.querySelector('ol') as HTMLElement;
      expect(steps.scrollWidth).toBeLessThanOrEqual(steps.clientWidth + 1);
      const actions = doc.querySelector('.onboarding-shell__footer-right') as HTMLElement;
      expect(frame.contentWindow!.getComputedStyle(actions).flexDirection).toBe('column');
      expect(doc.querySelector('header button')).toBeNull();
    } finally { frame.remove(); f.destroy(); }
  });

});
