import { By } from '@angular/platform-browser';
import { AppNavItemComponent } from './vertical/sidebar/nav-item/nav-item.component';
import { A11yModule } from '@angular/cdk/a11y';
import { TranslateModule } from '@ngx-translate/core';
import { buildMobileNavGroups } from './mobile-navigation';
import { NavItem } from './vertical/sidebar/nav-item/nav-item';
import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router, RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, Subject, of } from 'rxjs';
import { defaults } from 'src/app/config';
import { MaterialModule } from 'src/app/material.module';
import { MobileSheetHeaderComponent } from 'src/app/components/mobile-sheet-header/mobile-sheet-header.component';
import { AuthService } from 'src/app/services/auth.service';
import { CoreService } from 'src/app/services/core.service';
import { ConfiguracaoAplicativosService } from 'src/app/services/configuracao-aplicativos.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { ConfiguracaoAplicativos } from 'src/app/models/config/configuracao-aplicativos.model';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { BillingService } from 'src/app/pages/billing/services/billing.service';
import { BillingStateService } from 'src/app/pages/billing/services/billing-state.service';
import { OnboardingFlowService } from 'src/app/components/onboarding/onboarding-flow.service';
import { NotificacaoService } from 'src/app/pages/notificacoes/services/notificacao.service';
import { CatalogoEmpresaContextService } from 'src/app/pages/catalogo/shared/services/catalogo-empresa-context.service';
import { PrimeiroPedidoBoasVindasService } from 'src/app/shared/boas-vindas-primeiro-pedido/primeiro-pedido-boas-vindas.service';
import { FullComponent } from './full.component';
import { navItems } from './vertical/sidebar/sidebar-data';

@Component({ standalone: true, template: '' })
class PageStub {}

// Real shell template and handlers; page content and desktop children are outside this unit.
describe('FullComponent — cabeçalho mobile global', () => {
  let fixture: ComponentFixture<FullComponent>;
  let router: Router;
  let breakpoints: BehaviorSubject<any>;
  let config: ReturnType<typeof signal<ConfiguracaoAplicativos>>;
  let permitted: boolean;
  let enabled: boolean;
  let features: ReturnType<typeof signal<Record<string, boolean>>>;
  let loadFeatures: jasmine.Spy;
  let notifications: any;
  let auth: any;
  let usuario$: BehaviorSubject<Usuario | null>;
  const breakpointState = (mobile: boolean) => ({ matches: true, breakpoints: {
    'screen and (max-width: 1023px)': mobile,
    'screen and (min-width: 1024px)': !mobile,
  } });
  const query = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
  const count = (selector: string): number => fixture.nativeElement.querySelectorAll(selector).length;
  const click = (label: string) => {
    query('.mobile-topbar button[aria-label="' + label + '"]')!.click();
    fixture.detectChanges();
  };
  const navigate = async (url: string) => { await router.navigateByUrl(url); fixture.detectChanges(); };

  beforeEach(async () => {
    permitted = false;
    enabled = true;
    features = signal({ GRAFICA: true, SMARTCALC: true, LINKS: true, CALCULADORA_MATERIAIS: true });
    loadFeatures = jasmine.createSpy('carregar').and.callFake(() => of(features()));
    breakpoints = new BehaviorSubject(breakpointState(true));
    config = signal<ConfiguracaoAplicativos>({ aplicativos: [], atalhos: [] });
    notifications = { obterResumo$: jasmine.createSpy().and.returnValue(of({ itens: [], naoLidas: 3 })) };
    usuario$ = new BehaviorSubject<Usuario | null>(null);
    auth = { usuario$: usuario$.asObservable(), temPermissao: () => permitted, temAlgumaPermissao: () => permitted,
      logout: jasmine.createSpy('logout') };
    TestBed.configureTestingModule({
      imports: [FullComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons), TranslateModule.forRoot()],
      providers: [
        provideRouter([
          { path: 'dashboards/dashboard1', component: PageStub, data: { title: 'Dashboard 1', mobileTitle: 'Dashboard' } },
          { path: 'smartcalc', component: PageStub, data: { title: 'SmartCalc' } },
          { path: 'page', loadChildren: () => Promise.resolve([
            { path: 'grafica/comercial/pedidos', component: PageStub, data: { title: 'Pedidos' } },
            { path: 'grafica/comercial/pedidos/:id', component: PageStub, data: { title: 'Pedido' } },
            { path: 'grafica/produtos', component: PageStub, data: { title: 'Produtos' } },
            { path: 'suporte', component: PageStub, data: { title: 'Suporte' } },
            { path: 'suporte/:id', component: PageStub, data: { title: 'Suporte' } },
            { path: 'ajuda', component: PageStub, data: { title: 'Central de ajuda' } },
            { path: 'grafica/categorias', component: PageStub, data: { title: 'Categorias' } },
            { path: 'cliente', children: [
              { path: '', component: PageStub, data: { title: 'Clientes' } },
              { path: 'criar', component: PageStub, data: { title: 'Criar Cliente' } },
              { path: 'editar/:id', component: PageStub, data: { title: 'Editar Cliente' } },
              { path: ':id', component: PageStub, data: { title: 'Detalhe do Cliente' } },
            ] },
          ]) },
        ]),
        { provide: BreakpointObserver, useValue: { observe: () => breakpoints.asObservable() } },
        { provide: CoreService, useValue: { getOptions: () => ({ ...defaults }), setOptions: () => {} } },
        { provide: AuthService, useValue: auth },
        { provide: ConfiguracaoAplicativosService, useValue: { configuracao: config } },
        { provide: FeatureFlagService, useValue: { features, isEnabled: (key: string) => enabled && features()[key] === true, carregar: loadFeatures } },
        { provide: NotificacaoService, useValue: notifications },
        { provide: BillingService, useValue: { obterStatus: () => of({}) } },
        { provide: BillingStateService, useValue: { setFromResponse: () => {} } },
        { provide: OnboardingFlowService, useValue: {} },
        { provide: CatalogoEmpresaContextService, useValue: { snapshot: () => ({ versaoCatalogo: 'CATALOGO_NOVO' }) } },
        { provide: PrimeiroPedidoBoasVindasService, useValue: { reset: () => {}, avaliarEExibir: () => {} } },
      ],
    }).overrideComponent(FullComponent, { set: {
      imports: [RouterModule, MaterialModule, CommonModule, TablerIconsModule, MobileSheetHeaderComponent, A11yModule, TranslateModule, AppNavItemComponent],
      schemas: [NO_ERRORS_SCHEMA],
    } });
    router = TestBed.inject(Router);
    // Direct navigation before shell creation exercises initial title resolution too.
    await router.navigateByUrl('/dashboards/dashboard1');
    fixture = TestBed.createComponent(FullComponent);
    fixture.detectChanges();
    usuario$.next({ proprietario: true });
    fixture.detectChanges();
  });

  afterEach(() => fixture?.destroy());

  it('renderiza uma única estrutura completa no Dashboard, Pedidos, criação, edição e detalhes', async () => {
    for (const url of ['/dashboards/dashboard1', '/page/grafica/comercial/pedidos', '/page/cliente/criar', '/page/cliente/editar/7', '/page/cliente/7']) {
      await navigate(url);
      expect(count('header.mobile-topbar')).withContext(url).toBe(1);
      expect(count('.mobile-topbar button')).withContext(url).toBe(4);
      expect(count('app-header')).toBe(0);
      expect(count('.mobile-bottom-nav')).toBe(1);
      expect(count('.mobile-sheet--more')).toBe(1);
      expect(count('.mobile-sheet--notifications')).toBe(1);
      expect(count('.mobile-sheet--apps')).toBe(1);
      expect(count('.mobile-sheet--profile')).toBe(1);
    }
  });

  it('resolve o título inicial e atualiza rotas lazy, filhas e parametrizadas sem recarregar', async () => {
    expect(query('.mobile-topbar__title')?.textContent?.trim()).toBe('Dashboard');
    for (const [url, title] of [
      ['/page/cliente', 'Clientes'], ['/page/cliente/criar', 'Criar Cliente'],
      ['/page/cliente/editar/360?tab=dados#topo', 'Editar Cliente'], ['/page/cliente/42', 'Detalhe do Cliente'],
    ]) {
      await navigate(url);
      expect(query('.mobile-topbar__title')?.textContent?.trim()).toBe(title);
      expect(query('.mobile-topbar__title')?.getAttribute('title')).toBe(title);
    }
    expect(notifications.obterResumo$).not.toHaveBeenCalled();
  });

  it('abre os quatro painéis existentes e mantém somente um aberto com bloqueio de scroll', async () => {
    const actions = [
      ['Abrir menu', '.mobile-sheet--more'], ['Abrir notificações', '.mobile-sheet--notifications'],
      ['Abrir aplicativos', '.mobile-sheet--apps'], ['Abrir perfil', '.mobile-sheet--profile'],
    ];
    for (const [label, panel] of actions) {
      click(label);
      expect(query(panel)?.classList.contains('mobile-sheet--open')).toBeTrue();
      expect(count('.mobile-sheet--open')).toBe(1);
      expect(document.body.style.overflow).toBe('hidden');
    }
    expect(notifications.obterResumo$).toHaveBeenCalledOnceWith(5);
    expect(query('.mobile-topbar__notification-badge')?.textContent).toBe('3');
    await navigate('/page/cliente');
    expect(count('.mobile-sheet--open')).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('mantém filtragem do menu por permissões e segmento, sem criar outro menu', () => {
    const user = { proprietario: false, perfil: { id: 1, nome: 'Operador', permissoes: [] } } as Usuario;
    const restricted = fixture.componentInstance.filtrarMenus(navItems, [], TipoEmpresa.GRAFICA, 'CATALOGO_NOVO', user);
    expect(JSON.stringify(restricted)).not.toContain('/page/grafica/comercial/pedidos');
    const allowed = fixture.componentInstance.filtrarMenus(navItems, ['PEDIDOS_VER'], TipoEmpresa.GRAFICA, 'CATALOGO_NOVO', user);
    expect(JSON.stringify(allowed)).toContain('/page/grafica/comercial/pedidos');
    expect(JSON.stringify(allowed)).not.toContain('/page/deposito/itens');
  });

  it('reutiliza personalizações, permissões, módulos e segmento dos aplicativos', () => {
    const update = () => config.set({ aplicativos: [
      { aplicativo: 'SMARTCALC', ativo: true }, { aplicativo: 'CALCULADORA_REVESTIMENTO', ativo: true },
    ], atalhos: [{ nome: 'Portal', url: 'https://example.com', novaAba: true, ativo: true, ordem: 0 }] });
    update(); fixture.detectChanges();
    click('Abrir aplicativos');
    expect(fixture.componentInstance.apps).toEqual([]);
    expect(query('.mobile-sheet--apps')?.textContent).toContain('Portal');
    permitted = true; update(); fixture.detectChanges();
    expect(fixture.componentInstance.apps.map(app => app.aplicativo)).toEqual(['SMARTCALC']);
    enabled = false; update(); fixture.detectChanges();
    expect(fixture.componentInstance.apps).toEqual([]);
    expect(query('.mobile-sheet--notifications')?.textContent).not.toContain('Enviar');
  });

  it('não injeta Minha assinatura em Atalhos e preserva o cadastro legítimo e SmartCalc', async () => {
    permitted = true;
    config.set({ aplicativos: [{ aplicativo: 'SMARTCALC', ativo: true }], atalhos: [] }); fixture.detectChanges();
    bottomButton('atalhos').click(); fixture.detectChanges();
    const links = () => Array.from(fixture.nativeElement.querySelectorAll('.mobile-sheet--apps a')) as HTMLAnchorElement[];
    expect(links().some(link => link.textContent?.includes('Minha assinatura'))).toBeFalse();
    expect(byName('Minha assinatura')).toBeTruthy();
    const custom = { id: 7, nome: 'Minha assinatura', url: '/billing/minha-assinatura', novaAba: false, ativo: true, ordem: 0 };
    const saved: ConfiguracaoAplicativos = { aplicativos: [{ aplicativo: 'SMARTCALC', ativo: true }], atalhos: [custom] };
    config.set(saved); fixture.detectChanges();
    expect(links().filter(link => link.textContent?.includes('Minha assinatura')).length).toBe(1);
    expect(fixture.componentInstance.quicklinks).toEqual([custom]); expect(config()).toBe(saved);
    const openShortcut = spyOn(fixture.componentInstance, 'abrirAtalhoMobile').and.callFake((_, event) => event.preventDefault());
    links().find(link => link.textContent?.includes('Minha assinatura'))!.click();
    expect(openShortcut).toHaveBeenCalledWith(custom, jasmine.any(Event));
    links().find(link => link.textContent?.includes('SmartCalc'))!.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/smartcalc'); expect(fixture.componentInstance.mobileAppsOpen).toBeFalse();
  });

  for (const width of [360, 390, 430]) {
    it(`distribui cinco destinos sem sobreposição em viewport Chromium de ${width}px`, () => {
      const frame = document.createElement('iframe'); frame.style.cssText = `width:${width}px;height:800px;border:0`;
      document.body.appendChild(frame);
      try {
        const doc = frame.contentDocument!;
        document.querySelectorAll('style').forEach(style => doc.head.appendChild(style.cloneNode(true)));
        doc.body.style.margin = '0'; doc.body.appendChild(fixture.nativeElement.cloneNode(true));
        const nav = doc.querySelector<HTMLElement>('.mobile-bottom-nav')!;
        const buttons = Array.from(nav.querySelectorAll('button'));
        expect(buttons.map(button => button.textContent?.trim())).toEqual(['Pedidos', 'Atalhos', 'SmartCalc', 'Dashboard', 'Suporte']);
        expect(nav.style.gridTemplateColumns).toBe('repeat(5, minmax(0px, 1fr))');
        const bounds = nav.getBoundingClientRect();
        expect(bounds.left).toBe(0); expect(bounds.right).toBeLessThanOrEqual(width); expect(bounds.width).toBeGreaterThan(width - 20);
        const rects = buttons.map(button => button.getBoundingClientRect());
        rects.forEach((rect, index) => {
          expect(rect.height).toBeGreaterThanOrEqual(44); expect(Math.abs(rect.width - rects[0].width)).toBeLessThan(1);
          expect(rect.left).toBeGreaterThanOrEqual(bounds.left); expect(rect.right).toBeLessThanOrEqual(bounds.right);
          if (index) expect(rect.left).toBeGreaterThanOrEqual(rects[index - 1].right);
        });
        const content = doc.querySelector<HTMLElement>('.pageContent--mobile')!;
        expect(parseFloat(frame.contentWindow!.getComputedStyle(content).paddingBottom)).toBeGreaterThan(bounds.height);
        expect(parseFloat(frame.contentWindow!.getComputedStyle(nav).paddingBottom)).toBeGreaterThanOrEqual(6);
      } finally { frame.remove(); }
    });
  }

  it('preserva as ações de perfil e logout existentes', () => {
    click('Abrir perfil');
    const logout = query('.mobile-sheet--profile .mobile-action-link--danger')!;
    logout.click(); fixture.detectChanges();
    expect(auth.logout).toHaveBeenCalledTimes(1);
    expect(count('.mobile-sheet--open')).toBe(0);
  });

  it('mantém estado e destinos da navegação inferior após navegar e abrir atalhos', async () => {
    await navigate('/page/grafica/comercial/pedidos');
    const nav = fixture.componentInstance.mobileBottomNavItems;
    const pedidos = nav.find(item => item.key === 'pedidos')!;
    expect(pedidos.route).toBe('/page/grafica/comercial/pedidos');
    expect(fixture.componentInstance.isMobileBottomNavActive(pedidos)).toBeTrue();
    fixture.componentInstance.onMobileBottomNavClick(nav.find(item => item.key === 'atalhos')!);
    fixture.detectChanges();
    expect(query('.mobile-sheet--apps')?.classList.contains('mobile-sheet--open')).toBeTrue();
    expect(count('.mobile-sheet--open')).toBe(1);
  });

  it('preserva o contrato desktop: header, sidebar e breadcrumbs, sem shell mobile', () => {
    click('Abrir menu');
    breakpoints.next(breakpointState(false)); fixture.detectChanges();
    expect(count('.mobile-topbar')).toBe(0);
    expect(count('.mobile-bottom-nav')).toBe(0);
    expect(count('.mobile-sheet')).toBe(0);
    expect(count('app-header')).toBe(1);
    expect(count('app-sidebar')).toBe(1);
    expect(count('app-breadcrumb')).toBe(1);
    expect(document.body.style.overflow).toBe('');
    breakpoints.next(breakpointState(true)); fixture.detectChanges();
    expect(count('.mobile-topbar')).toBe(1);
    expect(count('app-header')).toBe(0);
  });

  const drawerButtons = (): HTMLButtonElement[] => Array.from(fixture.nativeElement.querySelectorAll('#mobile-navigation .mobile-nav-item, #mobile-navigation .mobile-nav-child'));
  const iconName = (button: HTMLButtonElement): string => fixture.debugElement.queryAll(By.css('i-tabler')).find(element => button.contains(element.nativeElement))?.componentInstance.name;
  const byName = (name: string): HTMLButtonElement => drawerButtons().find(button => button.querySelector('.mobile-nav-item__label')?.textContent?.trim() === name)!;
  const authorizedUser = (permissions: string[], owner = false): Usuario => ({ proprietario: owner, perfil: { id: 1, nome: 'Operador', permissoes: permissions.map(chave => ({ chave })) as any } });

  it('apresenta exatamente os grupos e as árvores filtradas do desktop, incluindo os itens antes omitidos', () => {
    usuario$.next(authorizedUser([], true)); fixture.detectChanges();
    click('Abrir menu');
    const desktop = fixture.componentInstance.navItemsFiltrados;
    expect(fixture.componentInstance.mobileNavGroups.flatMap(group => group.items)).toEqual(desktop.filter(item => !item.navCap && item.route !== '/page/ajuda'));
    expect(Array.from(fixture.nativeElement.querySelectorAll('.mobile-nav-group__title span')).map((span: any) => span.textContent.trim()))
      .toEqual(desktop.filter(item => item.navCap).map(item => item.navCap));
    expect(byName('Dashboard')).toBeTruthy(); expect(byName('Pedidos')).toBeTruthy();
    expect(byName('Meu Site').parentElement?.querySelectorAll('.mobile-nav-child').length).toBe(3);
    expect(byName('Catálogo').parentElement?.querySelectorAll('.mobile-nav-child').length).toBe(6);
    expect(iconName(byName('Produtos'))).toBe('point');
    expect(query('#mobile-navigation')?.textContent).not.toContain('Sair');
    expect(count('.mobile-bottom-nav')).toBe(1);
  });

  it('reflete no DOM as mesmas restrições de permissão, proprietário, feature e segmento', () => {
    usuario$.next(authorizedUser(['CLIENTE_VER'])); fixture.detectChanges();
    click('Abrir menu');
    expect(drawerButtons().map(button => button.textContent?.trim())).toContain('Clientes');
    expect(byName('Pedidos')).toBeUndefined(); expect(byName('Minha assinatura')).toBeUndefined();
    enabled = false;
    usuario$.next(authorizedUser(['PEDIDOS_VER', 'SMARTCALC_USAR'])); fixture.detectChanges();
    expect(byName('Pedidos')).toBeTruthy(); expect(byName('SmartCalc')).toBeUndefined();
    expect(byName('Clientes')).toBeUndefined();
    expect(fixture.componentInstance.mobileNavGroups.flatMap(group => group.items)).toEqual(fixture.componentInstance.navItemsFiltrados.filter(item => !item.navCap && item.route !== '/page/ajuda'));
  });

  it('expande os ancestrais da rota ativa ao abrir e permite recolher seção e submenu com toque', async () => {
    usuario$.next(authorizedUser([], true)); fixture.detectChanges();
    await navigate('/page/grafica/categorias?pagina=2#lista');
    click('Abrir menu');
    const parent = byName('Catálogo'); const child = byName('Categorias');
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(parent.classList.contains('mobile-nav-item--active')).toBeTrue();
    expect(child.getAttribute('aria-current')).toBe('page');
    expect(child.parentElement?.parentElement?.hidden).toBeFalse();
    parent.click(); fixture.detectChanges();
    expect(parent.getAttribute('aria-expanded')).toBe('false');
    expect(child.parentElement?.parentElement?.hidden).toBeTrue();
    const section = query('.mobile-nav-group--active .mobile-nav-group__toggle')!;
    section.click(); fixture.detectChanges();
    expect(section.getAttribute('aria-expanded')).toBe('false');
    fixture.componentInstance.closeMobileOverlays(); fixture.detectChanges();
    click('Abrir menu');
    expect(parent.getAttribute('aria-expanded')).toBe('true');
    expect(section.getAttribute('aria-expanded')).toBe('true');
  });

  it('renderiza níveis adicionais com os mesmos ícones e IDs sem colisão', () => {
    const tree: NavItem[] = [{ navCap: 'Seção' }, { displayName: 'Pai', iconName: 'package', route: '/page/cliente', children: [
      { displayName: 'Filho', route: '/page/cliente', iconName: 'users', children: [
        { displayName: 'Neto', route: '/page/cliente/7', iconName: 'point' },
      ] },
    ] }];
    fixture.componentInstance.mobileNavGroups = buildMobileNavGroups(tree);
    click('Abrir menu');
    byName('Pai').click(); fixture.detectChanges(); byName('Filho').click(); fixture.detectChanges();
    expect(iconName(byName('Neto'))).toBe('point');
    const ids = drawerButtons().map(button => button.id);
    expect(new Set(ids).size).toBe(ids.length);
    const parent = tree[1];
    expect(fixture.componentInstance.isMobileItemActive(parent)).toBeFalse();
  });

  it('navega pelo submenu, fecha o drawer e atualiza cabeçalho, seleção e bottom nav', async () => {
    usuario$.next(authorizedUser([], true)); fixture.detectChanges();
    click('Abrir menu');
    byName('Catálogo').click(); fixture.detectChanges();
    byName('Categorias').click(); fixture.detectChanges();
    expect(fixture.componentInstance.mobileDrawerOpen).toBeFalse();
    await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/page/grafica/categorias');
    expect(query('.mobile-topbar__title')?.textContent?.trim()).toBe('Categorias');
    click('Abrir menu');
    expect(byName('Categorias').getAttribute('aria-current')).toBe('page');
    expect(count('.mobile-bottom-nav [aria-current="page"]')).toBe(0);
  });

  it('mantém itens desabilitados sem navegação', () => {
    fixture.componentInstance.mobileNavGroups = buildMobileNavGroups([{ navCap: 'Menu' }, { displayName: 'Indisponível', route: '/page/cliente', disabled: true }]);
    click('Abrir menu');
    const button = byName('Indisponível');
    expect(button.disabled).toBeTrue();
    button.click(); fixture.detectChanges();
    expect(router.url).toBe('/dashboards/dashboard1');
    expect(fixture.componentInstance.mobileDrawerOpen).toBeTrue();
  });

  it('remove sheets fechadas do foco e fecha com Escape, botão explícito ou backdrop', async () => {
    expect(Array.from(fixture.nativeElement.querySelectorAll('.mobile-sheet')).every((sheet: any) => sheet.inert && sheet.getAttribute('aria-hidden') === 'true')).toBeTrue();
    const trigger = query('.mobile-topbar button[aria-label="Abrir menu"]')!;
    trigger.focus(); click('Abrir menu');
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const drawer = query('#mobile-navigation')!;
    const close = query('button[aria-label="Fechar menu"]')!;
    expect(document.activeElement).toBe(close);
    expect(drawer.inert).toBeFalse();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    close.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); fixture.detectChanges();
    expect(fixture.componentInstance.mobileDrawerOpen).toBeFalse();
    expect(drawer.inert).toBeTrue(); expect(document.activeElement).toBe(trigger);
    click('Abrir menu'); close.click(); fixture.detectChanges();
    expect(drawer.inert).toBeTrue();
    click('Abrir menu'); query('.mobile-shell-backdrop')!.click(); fixture.detectChanges();
    expect(drawer.inert).toBeTrue(); expect(document.body.style.overflow).toBe('');
    click('Abrir aplicativos'); expect(query('.mobile-sheet--apps')!.inert).toBeFalse();
    expect(drawer.inert).toBeTrue();
  });

  it('contém Tab/Shift+Tab no menu e devolve foco ao hambúrguer', async () => {
    usuario$.next(authorizedUser([], true)); fixture.detectChanges();
    const trigger = query('.mobile-topbar button[aria-label="Abrir menu"]') as HTMLButtonElement;
    trigger.focus(); trigger.click(); fixture.detectChanges();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    const anchors = Array.from(fixture.nativeElement.querySelectorAll('.cdk-focus-trap-anchor')) as HTMLElement[];
    expect(anchors.filter(anchor => anchor.tabIndex === 0).length).toBe(2);
    anchors[0].focus();
    expect(query('#mobile-navigation')!.contains(document.activeElement)).toBeTrue();
    anchors[1].focus();
    expect(document.activeElement).toBe(query('button[aria-label="Fechar menu"]'));
    fixture.componentInstance.closeMobileOverlays(); fixture.detectChanges();
    expect(document.activeElement).toBe(trigger);
    expect(anchors.every(anchor => anchor.tabIndex === -1)).toBeTrue();
  });


  it('mantém o menu desktop real consumindo a mesma lista e seu comportamento de expansão', () => {
    usuario$.next(authorizedUser([], true)); fixture.detectChanges();
    const expected = fixture.componentInstance.navItemsFiltrados;
    breakpoints.next(breakpointState(false)); fixture.detectChanges();
    const roots = fixture.debugElement.queryAll(By.directive(AppNavItemComponent)).filter(element => element.componentInstance.depth === 0);
    expect(roots.map(element => element.componentInstance.item)).toEqual(expected);
    const catalogo = roots.find(element => element.componentInstance.item.displayName === 'Catálogo')!;
    const component = catalogo.componentInstance as AppNavItemComponent;
    expect(component.expanded).toBeFalse();
    catalogo.query(By.css('.menu-list-item')).nativeElement.click(); fixture.detectChanges();
    expect(component.expanded).toBeTrue();
    expect(catalogo.queryAll(By.directive(AppNavItemComponent)).map(element => element.componentInstance.item)).toEqual(component.item.children);
    expect(count('.mobile-sheet')).toBe(0);
  });


  const bottomKeys = () => fixture.componentInstance.mobileBottomNavItems.map(item => item.key);
  const bottomButton = (key: string): HTMLButtonElement => {
    const index = fixture.componentInstance.mobileBottomNavItems.findIndex(item => item.key === key);
    return fixture.nativeElement.querySelectorAll('.mobile-bottom-nav button')[index];
  };

  it('Suporte abre a rota existente e permanece ativo no detalhe de um chamado', async () => {
    bottomButton('suporte').click(); await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/page/suporte');
    expect(bottomButton('suporte').getAttribute('aria-current')).toBe('page');
    expect(bottomButton('smartcalc').hasAttribute('aria-current')).toBeFalse();
    await navigate('/page/suporte/7');
    expect(bottomButton('suporte').getAttribute('aria-current')).toBe('page');
    await navigate('/page/ajuda');
    expect(bottomButton('suporte').hasAttribute('aria-current')).toBeFalse();
  });

  it('atualiza a ordem mobile ao habilitar/desabilitar SmartCalc sem alterar a configuração desktop', () => {
    const desktop = fixture.componentInstance.navItemsFiltrados;
    expect(bottomKeys()).toEqual(['pedidos', 'atalhos', 'smartcalc', 'dashboard', 'suporte']);
    expect(bottomButton('smartcalc').classList.contains('mobile-bottom-nav__item--special')).toBeTrue();
    features.set({ GRAFICA: true, SMARTCALC: false }); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['catalogo', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
    expect(bottomButton('pedidos').classList.contains('mobile-bottom-nav__item--special')).toBeTrue();
    expect(fixture.componentInstance.navItemsFiltrados).toBe(desktop);
    features.set({ GRAFICA: true, SMARTCALC: true }); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['pedidos', 'atalhos', 'smartcalc', 'dashboard', 'suporte']);
  });

  it('reflete mudanças reais de usuário, sem permissões SmartCalc e depois sem Pedidos', () => {
    usuario$.next(authorizedUser(['PEDIDOS_VER', 'GRAFICA_PRODUTOS_VER'])); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['catalogo', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
    usuario$.next(authorizedUser(['SMARTCALC_USAR'])); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['atalhos', 'smartcalc', 'suporte']);
    expect(count('.mobile-bottom-nav button')).toBe(3);
    usuario$.next(authorizedUser([])); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['atalhos', 'dashboard', 'suporte']);
    usuario$.next(null); fixture.detectChanges();
    expect(count('.mobile-bottom-nav')).toBe(0);
  });

  it('aguarda os módulos do novo contexto sem exibir uma ordem intermediária e força recarga por empresa', () => {
    const pending = new Subject<Record<string, boolean>>();
    loadFeatures.and.returnValue(pending);
    usuario$.next({ ...authorizedUser([], true), empresa: { id: 2, tipoEmpresa: TipoEmpresa.GRAFICA } as any }); fixture.detectChanges();
    expect(loadFeatures).toHaveBeenCalledWith(true);
    expect(count('.mobile-bottom-nav')).toBe(0);
    features.set({ GRAFICA: true, SMARTCALC: false }); fixture.detectChanges();
    expect(count('.mobile-bottom-nav')).toBe(0);
    pending.next(features()); pending.complete(); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['catalogo', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
    expect(count('.mobile-bottom-nav')).toBe(1);
  });

  it('ignora cargas pendentes antigas após uma segunda troca de empresa', () => {
    const first = new Subject<Record<string, boolean>>(); const second = new Subject<Record<string, boolean>>();
    loadFeatures.and.returnValues(first, second);
    usuario$.next({ ...authorizedUser([], true), empresa: { id: 2 } as any });
    usuario$.next({ ...authorizedUser([], true), empresa: { id: 3 } as any }); fixture.detectChanges();
    first.next({ GRAFICA: true, SMARTCALC: true }); fixture.detectChanges();
    expect(count('.mobile-bottom-nav')).toBe(0);
    features.set({ GRAFICA: true, SMARTCALC: false }); second.next(features()); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['catalogo', 'atalhos', 'pedidos', 'dashboard', 'suporte']);
  });

  it('preserva a organização existente do Depósito e restaura a da Gráfica ao trocar segmento', () => {
    permitted = true;
    usuario$.next({ ...authorizedUser([], true), empresa: { id: 2, tipoEmpresa: TipoEmpresa.DEPOSITO } as any }); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['dashboard', 'atalhos', 'catalogo', 'orcamentos']);
    expect(fixture.componentInstance.mobileBottomNavItems[2].route).toBe('/page/catalogo/produtos');
    usuario$.next({ ...authorizedUser([], true), empresa: { id: 3, tipoEmpresa: TipoEmpresa.GRAFICA } as any }); fixture.detectChanges();
    expect(bottomKeys()).toEqual(['pedidos', 'atalhos', 'smartcalc', 'dashboard', 'suporte']);
  });

  it('distingue destaque central de seleção por rota, incluindo query e detalhe de pedido', async () => {
    expect(bottomButton('smartcalc').classList.contains('mobile-bottom-nav__item--special')).toBeTrue();
    expect(bottomButton('smartcalc').hasAttribute('aria-current')).toBeFalse();
    expect(bottomButton('dashboard').getAttribute('aria-current')).toBe('page');
    bottomButton('smartcalc').click(); await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/smartcalc');
    expect(bottomButton('smartcalc').getAttribute('aria-current')).toBe('page');
    await navigate('/page/grafica/comercial/pedidos/7?tab=itens#fim');
    expect(bottomButton('pedidos').getAttribute('aria-current')).toBe('page');
    expect(bottomButton('smartcalc').hasAttribute('aria-current')).toBeFalse();
    features.set({ GRAFICA: true, SMARTCALC: false }); fixture.detectChanges();
    expect(bottomButton('catalogo').hasAttribute('aria-current')).toBeFalse();
    expect(bottomButton('pedidos').getAttribute('aria-current')).toBe('page');
    await navigate('/page/grafica/categorias?pagina=2#fim');
    expect(bottomButton('catalogo').getAttribute('aria-current')).toBe('page');
    expect(bottomButton('pedidos').hasAttribute('aria-current')).toBeFalse();
  });

  it('mantém Atalhos e acessa o menu completo e Ajuda pelo hambúrguer', async () => {
    expect(fixture.componentInstance.navItemsFiltrados.some(item => item.route === '/page/ajuda' && item.displayName === 'Central de ajuda')).toBeTrue();
    bottomButton('atalhos').click(); fixture.detectChanges();
    expect(fixture.componentInstance.mobileAppsOpen).toBeTrue();
    expect(bottomButton('atalhos').getAttribute('aria-pressed')).toBe('true');
    fixture.componentInstance.closeMobileOverlays(); fixture.detectChanges();
    const hamburger = query('.mobile-topbar button[aria-label="Abrir menu"]')!;
    hamburger.focus(); hamburger.click(); fixture.detectChanges();
    expect(fixture.componentInstance.mobileDrawerOpen).toBeTrue();
    expect(hamburger.getAttribute('aria-expanded')).toBe('true');
    expect(bottomKeys()).not.toContain('mais');
    expect(query('nav[aria-label="Menu principal"]')?.textContent).not.toContain('Central de ajuda');
    const help = query('nav[aria-label="Ajuda"] button')!;
    expect(help.textContent).toContain('Ajuda e Tutoriais');
    expect(count('nav[aria-label="Ajuda"] button')).toBe(1);
    help.click(); await fixture.whenStable(); fixture.detectChanges();
    expect(router.url).toBe('/page/ajuda');
    expect(fixture.componentInstance.mobileDrawerOpen).toBeFalse();
    expect(document.activeElement).toBe(hamburger);
    expect(query('.mobile-topbar__title')?.textContent?.trim()).toBe('Central de ajuda');
  });

});
