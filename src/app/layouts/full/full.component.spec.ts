import { CommonModule } from '@angular/common';
import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router, RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of } from 'rxjs';
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
  let notifications: any;
  let auth: any;
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
    breakpoints = new BehaviorSubject(breakpointState(true));
    config = signal<ConfiguracaoAplicativos>({ aplicativos: [], atalhos: [] });
    notifications = { obterResumo$: jasmine.createSpy().and.returnValue(of({ itens: [], naoLidas: 3 })) };
    auth = { usuario$: of(null), temPermissao: () => permitted, temAlgumaPermissao: () => permitted,
      logout: jasmine.createSpy('logout') };
    TestBed.configureTestingModule({
      imports: [FullComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        provideRouter([
          { path: 'dashboards/dashboard1', component: PageStub, data: { title: 'Dashboard 1', mobileTitle: 'Dashboard' } },
          { path: 'page', loadChildren: () => Promise.resolve([
            { path: 'grafica/comercial/pedidos', component: PageStub, data: { title: 'Pedidos' } },
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
        { provide: FeatureFlagService, useValue: { isEnabled: () => enabled } },
        { provide: NotificacaoService, useValue: notifications },
        { provide: BillingService, useValue: {} },
        { provide: BillingStateService, useValue: {} },
        { provide: OnboardingFlowService, useValue: {} },
        { provide: CatalogoEmpresaContextService, useValue: {} },
        { provide: PrimeiroPedidoBoasVindasService, useValue: { reset: () => {} } },
      ],
    }).overrideComponent(FullComponent, { set: {
      imports: [RouterModule, MaterialModule, CommonModule, TablerIconsModule, MobileSheetHeaderComponent],
      schemas: [NO_ERRORS_SCHEMA],
    } });
    router = TestBed.inject(Router);
    // Direct navigation before shell creation exercises initial title resolution too.
    await router.navigateByUrl('/dashboards/dashboard1');
    fixture = TestBed.createComponent(FullComponent);
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
});
