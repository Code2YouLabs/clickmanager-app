import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { of, Subject, delay, throwError } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { SetupProgress } from 'src/app/components/setup-progress/setup-progress.component';
import { BibliotecaService } from '../grafica/biblioteca/biblioteca.service';
import { OnboardingV2ProductsPageComponent } from './products-step/onboarding-v2-products-page.component';
import { OnboardingV2CompanyPageComponent } from './company-step/onboarding-v2-company-page.component';
import { OnboardingV2SummaryPageComponent } from './summary-step/onboarding-v2-summary-page.component';
import { OnboardingV2StateService } from './services/onboarding-v2-state.service';
import { OnboardingV2Service } from './services/onboarding-v2.service';
import { By } from '@angular/platform-browser';
import { HierarchyTreeComponent } from 'src/app/components/hierarchy-tree/hierarchy-tree.component';
import { OverlayContainer } from '@angular/cdk/overlay';
import { OnboardingShellComponent } from 'src/app/components/onboarding/onboarding-shell.component';

const pending: SetupProgress = { id: 9, status: 'PENDENTE', fase: 'AGUARDANDO', total: 150, processados: 0, criados: 0, duplicados: 0, erros: 0, smartCalcPrevistos: 2, smartCalcPreparados: 0, tempoEstimadoRestanteSegundos: null, itens: [] };
const done: SetupProgress = { ...pending, status: 'CONCLUIDO', fase: 'CONCLUIDO', processados: 150, criados: 148, duplicados: 2, smartCalcPreparados: 2 };
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

  it('preserva validação e payload da empresa com o rodapé compartilhado', async () => {
    state.refreshProgress.and.returnValue(of({onboardingVersion: 'v2', currentStep: 'company', status: 'pending', empresa: company}));
    const f = TestBed.createComponent(OnboardingV2CompanyPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const shell = f.debugElement.query(By.directive(OnboardingShellComponent)).componentInstance as OnboardingShellComponent;
    expect(shell.mobileLayout).toBe('flow');
    expect(f.nativeElement.querySelectorAll('input').length).toBe(5);
    f.componentInstance.emailControl.setValue('invalido');
    f.detectChanges();
    expect(f.nativeElement.querySelector('footer button[mat-flat-button]').disabled).toBeTrue();
    f.componentInstance.submit();
    expect(f.componentInstance.emailControl.touched).toBeTrue();
    expect(state.saveCompany).not.toHaveBeenCalled();
    f.componentInstance.emailControl.setValue(company.email);
    f.detectChanges();
    f.nativeElement.querySelector('footer button[mat-flat-button]').click();
    expect(state.saveCompany).toHaveBeenCalledOnceWith({...company, cnpj: null, inscricaoEstadual: null, horario: null, endereco: null});
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/produtos');
    f.destroy();
  });

  it('compartilha os estados semânticos do cabeçalho sem impor o layout a outros fluxos', () => {
    const f = TestBed.createComponent(OnboardingShellComponent);
    f.componentInstance.semanticSteps = true;
    f.detectChanges();
    expect(f.nativeElement.querySelector('.onboarding-shell--mobile-layout')).toBeNull();
    for (const step of [1, 2, 3]) {
      f.componentInstance.passoAtual = step;
      f.detectChanges();
      const steps = f.nativeElement.querySelectorAll('ol li');
      expect(steps.length).toBe(3);
      expect(f.nativeElement.querySelectorAll('[aria-current="step"]').length).toBe(1);
      expect(steps[step - 1].getAttribute('aria-current')).toBe('step');
      expect(f.nativeElement.querySelectorAll('ol li.complete').length).toBe(step - 1);
      expect(steps[step - 1].querySelector('.onboarding-shell__step-marker').textContent.trim()).toBe(String(step));
    }
    f.componentInstance.completed = true;
    f.detectChanges();
    expect(f.nativeElement.querySelector('[aria-current="step"]')).toBeNull();
    expect(f.nativeElement.querySelectorAll('ol li.complete').length).toBe(3);
    expect(Array.from(f.nativeElement.querySelectorAll('.onboarding-shell__step-marker')).every((el: any) => el.textContent.trim() === '✓')).toBeTrue();
    f.destroy();
  });

  it('alterna a estrutura de catálogo e preparação e só oferece entrada após concluir', async () => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const shell = f.debugElement.query(By.directive(OnboardingShellComponent)).componentInstance as OnboardingShellComponent;
    expect(shell.mobileLayout).toBe('catalog');
    expect(shell.mobileActions).toBeNull();
    f.destroy();
    for (const job of [pending, done]) {
      biblioteca.ultima.and.returnValue(of(job));
      const preparing = TestBed.createComponent(OnboardingV2ProductsPageComponent);
      preparing.detectChanges(); await preparing.whenStable(); preparing.detectChanges();
      const preparingShell = preparing.debugElement.query(By.directive(OnboardingShellComponent)).componentInstance as OnboardingShellComponent;
      expect(preparingShell.mobileLayout).toBe('flow');
      const action = preparing.nativeElement.querySelector('.onboarding-shell__footer--mobile-actions button');
      if (job === pending) {
        expect(action).toBeNull();
      } else {
        expect(action.textContent).toContain('Entrar no ClickManager');
        expect(preparing.nativeElement.textContent).toContain('2 produtos preparados para o SmartCalc');
        action.click();
        expect(state.finishOnboarding).toHaveBeenCalledTimes(1);
        expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/painel');
      }
      preparing.destroy();
    }
  });

  it('protege a ação mobile do resumo durante erro e salvamento e permite tentar novamente', async () => {
    state.loadResumo.and.returnValue(throwError(() => new Error('conexão')));
    const f = TestBed.createComponent(OnboardingV2SummaryPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.querySelector('.onboarding-shell__footer--mobile-actions')).toBeNull();
    expect(state.finishOnboarding).not.toHaveBeenCalled();
    state.loadResumo.and.returnValue(of({onboardingVersion: 'v2', currentStep: 'summary', status: 'products_completed'}));
    f.nativeElement.querySelector('button[mat-stroked-button]').click();
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const action = f.nativeElement.querySelector('.onboarding-shell__footer--mobile-actions button');
    expect(action.textContent).toContain('Entrar no ClickManager');
    state.saving.and.returnValue(true); f.detectChanges();
    expect(action.disabled).toBeTrue();
    action.click();
    expect(state.finishOnboarding).not.toHaveBeenCalled();
    state.saving.and.returnValue(false); f.detectChanges(); action.click();
    expect(state.finishOnboarding).toHaveBeenCalledTimes(1);
    expect(TestBed.inject(Router).navigateByUrl).toHaveBeenCalledWith('/painel');
    f.destroy();
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

  it('mostra dois segundos por tarefa e libera a conclusão após os dados reais', fakeAsync(() => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Selecionar todos os 1 produto');
    expect(f.nativeElement.querySelector('.biblioteca-acoes__contador')).toBeNull();
    f.componentInstance.seletor!.selecionarTodos(true); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Desmarcar todos');
    expect(f.componentInstance.seletor!.selecionados.size).toBe(1);
    f.nativeElement.querySelector('footer button[mat-flat-button]').click(); f.detectChanges();
    expect(f.componentInstance.stage).toBe('PREPARANDO');
    expect(biblioteca.importar).toHaveBeenCalledWith(jasmine.any(Array), true);
    expect(f.nativeElement.querySelector('[aria-current="step"]').textContent).toContain('Preparando');
    expect(f.nativeElement.textContent).not.toContain('Quais produtos você oferece?');
    expect(f.nativeElement.querySelector('app-hierarchy-tree')).toBeNull();
    accepted.next(pending); accepted.complete(); updates.next(pending); f.detectChanges();
    expect(f.nativeElement.querySelectorAll('app-setup-progress li[data-state="PROCESSANDO"]').length).toBe(1);
    expect(f.nativeElement.querySelector('app-setup-progress li[data-state="PROCESSANDO"]').textContent).toContain('Criando sua empresa');
    updates.next({...pending, status: 'PROCESSANDO', fase: 'IMPORTANDO_ITENS', processados: 47, criados: 45, duplicados: 2, tempoEstimadoRestanteSegundos: 60}); f.detectChanges();
    tick(4000); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('47 de 150');
    expect(f.nativeElement.querySelector('app-setup-progress li[data-state="PROCESSANDO"]').textContent).toContain('Criando seu catálogo');
    updates.next(done); f.detectChanges();
    expect(f.componentInstance.stage).toBe('PREPARANDO');
    expect(f.nativeElement.querySelector('.onboarding-page__completion-action button')).toBeNull();
    tick(6000); f.detectChanges();
    expect(f.nativeElement.querySelector('header').textContent).toContain('100%');
    expect(f.nativeElement.textContent).toContain('148 produtos e serviços adicionados');
    expect(f.nativeElement.querySelector('header button')).toBeNull();
    f.nativeElement.querySelector('.onboarding-page__completion-action button').click();
    expect(state.finishOnboarding).toHaveBeenCalled(); f.destroy();
  }));

  it('mostra alerta adicional sem inventar erro de produto e permite entrar', async () => {
    biblioteca.ultima.and.returnValue(of({...done, status: 'CONCLUIDO_COM_ALERTAS', fase: 'CONCLUIDO_COM_ALERTAS',
      alertaPreparacao: 'Sua empresa foi criada, mas uma configuração adicional não pôde ser concluída.'}));
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('configuração adicional');
    expect(f.nativeElement.textContent).toContain('148 produtos e serviços adicionados');
    expect(f.nativeElement.textContent).not.toContain('não puderam ser adicionados');
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
      else expect(f.nativeElement.textContent).toContain('Tudo pronto para você!');
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
    expect(f.nativeElement.textContent).toContain('148 produtos e serviços adicionados');
    expect(f.nativeElement.textContent).toContain('2 já existiam');
    expect(biblioteca.importar).not.toHaveBeenCalled(); f.destroy();
  });

  for (const largura of [430, 390, 360]) {
    it(`acomoda stepper, árvore e ações em ${largura}px sem rolagem horizontal`, async () => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const frame = document.createElement('iframe');
    frame.style.width = `${largura}px`; frame.style.height = '800px';
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
      expect(frame.contentWindow!.getComputedStyle(actions).display).toBe('grid');
      const heading = doc.querySelector('.onboarding-catalogo__heading') as HTMLElement;
      const controls = doc.querySelector('.biblioteca-mobile-controls') as HTMLElement;
      expect(frame.contentWindow!.getComputedStyle(heading.querySelector('h1')!).whiteSpace).toBe('nowrap');
      expect(frame.contentWindow!.getComputedStyle(controls).display).toBe('flex');
      expect((doc.querySelector('.biblioteca-resultados') as HTMLElement).clientHeight).toBeGreaterThan(400);
      const text = doc.body.textContent || '';
      expect(text.indexOf('Selecionar todos os 1 produto')).toBeGreaterThan(-1);
      expect(text.indexOf('Selecionar todos os 1 produto')).toBeLessThan(text.indexOf('Vinil'));
      expect(doc.querySelector('header button')).toBeNull();
    } finally { frame.remove(); f.destroy(); }
    });
  }

  it('abre filtros em modal, combina pesquisa e categoria, limpa e mantém seleção', fakeAsync(() => {
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); tick(); f.detectChanges();
    const selector = f.componentInstance.seletor!;
    selector.selecionarTodos(true);
    f.nativeElement.querySelector('.onboarding-catalogo__filters').click(); tick(); f.detectChanges();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    expect(overlay.querySelector('[mat-dialog-title]')?.textContent).toContain('Filtros do catálogo');
    expect(overlay.querySelector('mat-button-toggle-group')).toBeNull();
    expect(overlay.textContent).not.toContain('Selecionar todos');
    const input = overlay.querySelector('input')!;
    input.value = 'vinil'; input.dispatchEvent(new Event('input')); tick(300); f.detectChanges();
    overlay.querySelector<HTMLElement>('mat-select')!.click(); tick(); f.detectChanges();
    Array.from(overlay.querySelectorAll<HTMLElement>('mat-option')).find(option => option.textContent?.trim() === 'Adesivos')!.click();
    tick(); f.detectChanges();
    expect(selector.filtrosAtivos).toBe(2);
    expect(selector.filtrados.length).toBe(1);
    expect(f.nativeElement.querySelector('.onboarding-catalogo__filters').getAttribute('aria-label')).toBe('Filtros: 2 ativos');
    overlay.querySelector<HTMLButtonElement>('mat-dialog-actions button[mat-button]')!.click();
    tick(300); f.detectChanges();
    expect(selector.filtrosAtivos).toBe(0);
    expect(selector.selecionados.size).toBe(1);
    overlay.querySelector<HTMLButtonElement>('[mat-dialog-close]')!.click(); tick(); f.detectChanges();
    expect(overlay.querySelector('mat-dialog-container')).toBeNull();
    expect(f.nativeElement.querySelector('.biblioteca-acoes__contador')).toBeNull();
    expect(f.nativeElement.querySelector('footer .onboarding-shell__hint')).toBeNull();
    f.destroy();
  }));

  it('exibe seleção indeterminada no controle compacto e mantém ação completa', async () => {
    biblioteca.listar.and.returnValue(of([
      {id:1,tipo:'PRODUTO',nome:'Vinil',categoria:'Adesivos',tiposPreco:[],acabamentos:[]},
      {id:2,tipo:'PRODUTO',nome:'Couché',categoria:'Adesivos',tiposPreco:[],acabamentos:[]},
    ]));
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const selector = f.componentInstance.seletor!;
    selector.marcar(selector.itens[0], true); f.detectChanges();
    const input = f.nativeElement.querySelector('.biblioteca-mobile-bulk') as HTMLButtonElement;
    expect(input.getAttribute('aria-pressed')).toBe('mixed');
    input.click(); f.detectChanges();
    expect(selector.selecionados.size).toBe(2);
    expect(input.getAttribute('aria-pressed')).toBe('true');
    expect(selector.todosSelecionados).toBeTrue();
    input.click(); f.detectChanges();
    expect(selector.selecionados.size).toBe(0);
    f.destroy();
  });

  it('mantém seleção, expansão e elementos ao alternar visualizações e selecionar itens', async () => {
    biblioteca.listar.and.returnValue(of(Array.from({length: 216}, (_, i) => ({id:i+1,tipo:'PRODUTO',nome:`Produto ${i+1}`,categoria:'Adesivos',tiposPreco:[],acabamentos:[]}))));
    const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
    f.detectChanges(); await f.whenStable(); f.detectChanges();
    const selector = f.componentInstance.seletor!;
    const tree = f.debugElement.query(By.directive(HierarchyTreeComponent)).componentInstance as HierarchyTreeComponent;
    tree.treeControl.expand(selector.arvore[0]);
    selector.modo = 'detalhada'; f.detectChanges();
    const region = f.nativeElement.querySelector('.biblioteca-resultados');
    const scroller = getComputedStyle(region).overflowY === 'auto' ? region : f.nativeElement.querySelector('.onboarding-shell__content');
    scroller.scrollTop = 100;
    const scrollBefore = scroller.scrollTop;
    expect(scrollBefore).toBeGreaterThan(0);
    const first = region.querySelector('article');
    first.querySelector('input[type="checkbox"]').click(); f.detectChanges();
    expect(selector.selecionados.size).toBe(1);
    expect(f.nativeElement.querySelector('footer .onboarding-shell__hint')).toBeNull();
    expect(f.nativeElement.textContent).toContain('Seleção parcial dos resultados.');
    expect(region.querySelector('article')).toBe(first);
    expect(f.nativeElement.querySelector('.biblioteca-resultados')).toBe(region);
    expect(scroller.scrollTop).toBe(scrollBefore);
    selector.modo = 'arvore'; f.detectChanges();
    expect(f.debugElement.query(By.directive(HierarchyTreeComponent)).componentInstance).toBe(tree);
    expect(tree.treeControl.isExpanded(selector.arvore[0])).toBeTrue();
    expect(selector.estados.get(selector.arvore[0].id)?.indeterminate).toBeTrue();
    selector.modo = 'detalhada'; f.detectChanges();
    expect(region.querySelector('article input').checked).toBeTrue();
    selector.categoria = 'Não existe'; f.detectChanges();
    expect(f.nativeElement.textContent).toContain('Nenhum item encontrado.');
    expect(selector.selecionados.size).toBe(1);
    selector.categoria = ''; f.detectChanges();
    expect(region.querySelectorAll('article').length).toBe(216);
    expect(f.nativeElement.querySelector('footer button[mat-flat-button]').disabled).toBeFalse();
    f.destroy();
  });

  for (const [width, height] of [[360,800],[390,844],[430,932],[768,1024],[1366,900],[1366,768],[1440,900],[1440,800],[800,360],[390,420]]) {
    it(`limita centenas de produtos e mantém rodapé acessível em ${width}×${height}`, async () => {
      biblioteca.listar.and.returnValue(of(Array.from({length:216}, (_, i) => ({id:i+1,tipo:'PRODUTO',nome:`Produto ${i+1}`,categoria:'Adesivos',descricao:'Descrição do produto',tiposPreco:[],acabamentos:[]}))));
      const f = TestBed.createComponent(OnboardingV2ProductsPageComponent);
      f.detectChanges(); await f.whenStable(); f.detectChanges();
      f.componentInstance.seletor!.modo = 'detalhada'; f.detectChanges();
      const frame = document.createElement('iframe');
      frame.style.width = `${width}px`; frame.style.height = `${height}px`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document.querySelectorAll('style, link[rel="stylesheet"]').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.margin = '0';
        doc.body.appendChild(f.nativeElement.cloneNode(true));
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
        const layout = doc.querySelector('.onboarding-page-layout') as HTMLElement;
        const list = doc.querySelector('.biblioteca-resultados') as HTMLElement;
        const content = doc.querySelector('.onboarding-shell__content') as HTMLElement;
        const scroll = list;
        const footer = doc.querySelector('footer') as HTMLElement;
        if (width <= 768 || (width <= 960 && height <= 560)) {
          const primary = footer.querySelector('button[mat-flat-button]')!.getBoundingClientRect();
          const skip = footer.querySelector('button[mat-button]')!.getBoundingClientRect();
          expect(skip.right).toBeLessThanOrEqual(primary.left);
          expect(primary.left).toBeGreaterThanOrEqual(footer.getBoundingClientRect().left);
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.biblioteca-desktop-controls')!).display).toBe('none');
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.onboarding-page__intro > p')!).display).toBe('none');
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.onboarding-shell__steps > small')!).display).toBe('none');
          const title = doc.querySelector('h1')!;
          const titleRange = doc.createRange(); titleRange.selectNodeContents(title);
          expect(titleRange.getBoundingClientRect().width).toBeLessThanOrEqual(title.getBoundingClientRect().width);
          const filters = doc.querySelector('.onboarding-catalogo__filters')!.getBoundingClientRect();
          const mode = doc.querySelector('.biblioteca-mobile-controls mat-button-toggle-group')!.getBoundingClientRect();
          const bulk = doc.querySelector('.biblioteca-mobile-bulk')!.getBoundingClientRect();
          expect(filters.top).toBeGreaterThanOrEqual(title.getBoundingClientRect().bottom);
          expect(filters.right).toBeLessThanOrEqual(mode.left);
          expect(bulk.top).toBeGreaterThanOrEqual(Math.max(filters.bottom, mode.bottom));
          expect(bulk.bottom).toBeLessThanOrEqual(list.getBoundingClientRect().top);
          const primaryText = footer.querySelector('button[mat-flat-button] .mdc-button__label')!;
          const textRange = doc.createRange(); textRange.selectNodeContents(primaryText);
          expect(textRange.getBoundingClientRect().width).toBeLessThanOrEqual(primary.width);
          expect(footer.querySelector<HTMLElement>('button[mat-button]')!.innerText.trim()).toBe('Pular');
        } else {
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.biblioteca-toolbar')!).display).toBe('flex');
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.biblioteca-mobile-controls')!).display).toBe('none');
          expect(doc.querySelector('.onboarding-catalogo__filters')!.getBoundingClientRect().width).toBe(0);
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.onboarding-page__intro > p')!).display).toBe('block');
          const headerStyle = frame.contentWindow!.getComputedStyle(doc.querySelector('.onboarding-shell__header')!);
          expect(headerStyle.paddingTop).toBe('16px');
          expect(headerStyle.paddingBottom).toBe('24px');
          expect(headerStyle.gap).toBe('24px');
          expect(headerStyle.flexDirection).toBe('row');
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.onboarding-shell__steps > small')!).visibility).toBe('hidden');
          expect((doc.querySelector('.onboarding-shell__brand img') as HTMLElement).getBoundingClientRect().width).toBe(156);
          expect(frame.contentWindow!.getComputedStyle(doc.querySelector('.onboarding-shell__step-marker')!).width).toBe('28px');
        }
        expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
        expect(footer.getBoundingClientRect().bottom).toBeLessThanOrEqual(height);
        expect(footer.getBoundingClientRect().top).toBeGreaterThan(0);
        expect(scroll.clientHeight).toBeGreaterThan(40);
        expect(scroll.scrollHeight).toBeGreaterThan(scroll.clientHeight);
        const bottomBefore = footer.getBoundingClientRect().bottom;
        scroll.scrollTop = scroll.scrollHeight;
        expect(footer.getBoundingClientRect().bottom).toBe(bottomBefore);
        expect(list.lastElementChild!.lastElementChild!.getBoundingClientRect().bottom).toBeLessThanOrEqual(footer.getBoundingClientRect().top);
        expect(layout.scrollHeight).toBeLessThanOrEqual(layout.clientHeight + 1);
        // Few products use the same bounded page, without pushing actions down.
        Array.from(list.querySelectorAll('article')).slice(3).forEach(item => item.remove());
        expect(footer.getBoundingClientRect().bottom).toBe(bottomBefore);
      } finally { frame.remove(); f.destroy(); }
    });
  }

});
