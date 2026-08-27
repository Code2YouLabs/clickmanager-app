import { BreakpointObserver, MediaMatcher } from '@angular/cdk/layout';
import { Component, Inject, OnDestroy, OnInit, ViewChild, ViewEncapsulation, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { MatSidenav, MatSidenavContent } from '@angular/material/sidenav';
import { MatDialog } from '@angular/material/dialog';
import { CoreService } from 'src/app/services/core.service';
import { AppSettings } from 'src/app/config';
import { distinctUntilChanged, filter, take } from 'rxjs/operators';
import { NavigationEnd, Router } from '@angular/router';
import { Location } from '@angular/common';
import { navItems } from './vertical/sidebar/sidebar-data';
import { NavService } from '../../services/nav.service';
import { AppNavItemComponent } from './vertical/sidebar/nav-item/nav-item.component';
import { RouterModule } from '@angular/router';
import { MaterialModule } from 'src/app/material.module';
import { CommonModule } from '@angular/common';
import { SidebarComponent } from './vertical/sidebar/sidebar.component';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { TablerIconsModule } from 'angular-tabler-icons';
import { HeaderComponent } from './vertical/header/header.component';
import { AppBreadcrumbComponent } from './shared/breadcrumb/breadcrumb.component';
import { CustomizerComponent } from './shared/customizer/customizer.component';
import { MobileSheetHeaderComponent } from 'src/app/components/mobile-sheet-header/mobile-sheet-header.component';
import { AuthService } from 'src/app/services/auth.service';
import { NavItem } from './vertical/sidebar/nav-item/nav-item';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { BillingBannerComponent } from '../../components/billing-banner/billing-banner.component';
import { BillingService } from 'src/app/pages/billing/services/billing.service';
import { BillingStateService } from 'src/app/pages/billing/services/billing-state.service';
import { OnboardingFlowService } from 'src/app/components/onboarding/onboarding-flow.service';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { NotificacaoItem } from 'src/app/pages/notificacoes/models/notificacao.model';
import { NotificacaoService } from 'src/app/pages/notificacoes/services/notificacao.service';
import { NotificacaoEnviarDialogComponent } from 'src/app/pages/notificacoes/components/notificacao-enviar-dialog.component';
import { resolveTipoEmpresa, TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { CatalogoEmpresaContextService, CatalogoVersaoAdministrativa } from 'src/app/pages/catalogo/shared/services/catalogo-empresa-context.service';
import {
  AplicativoCatalogo,
  AtalhoEmpresa,
  ConfiguracaoAplicativos,
  aplicativosVisiveis,
} from 'src/app/models/config/configuracao-aplicativos.model';
import { ConfiguracaoAplicativosService } from 'src/app/services/configuracao-aplicativos.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { filtrarMenuPrincipal } from './vertical/sidebar/menu-filter';

const MOBILE_VIEW = 'screen and (max-width: 768px)';
const TABLET_VIEW = 'screen and (min-width: 769px) and (max-width: 1024px)';
const MONITOR_VIEW = 'screen and (min-width: 1024px)';
const BELOWMONITOR = 'screen and (max-width: 1023px)';

// for mobile app sidebar
interface MobileNavGroup {
  title: string;
  items: NavItem[];
}

interface MobileBottomNavItem {
  key: string;
  label: string;
  icon: string;
  route?: string;
  startsWith?: string[];
  special?: boolean;
  action?: 'drawer' | 'apps' | 'profile';
}

@Component({
  selector: 'app-full',
  standalone: true,
  imports: [
    RouterModule,
    AppNavItemComponent,
    MaterialModule,
    CommonModule,
    SidebarComponent,
    NgScrollbarModule,
    TablerIconsModule,
    HeaderComponent,
    AppBreadcrumbComponent,
    CustomizerComponent,
    BillingBannerComponent,
    MobileSheetHeaderComponent
  ],
  templateUrl: './full.component.html',
  styleUrls: ['./full.component.scss'],
  encapsulation: ViewEncapsulation.None,
})
export class FullComponent implements OnInit, OnDestroy {

  @ViewChild('leftsidenav')
  public sidenav: MatSidenav;
  resView = false;
  @ViewChild('content', { static: true }) content!: MatSidenavContent;
  //get options from service
  options = this.settings.getOptions();
  private layoutChangesSubscription = Subscription.EMPTY;
  private isMobileScreen = false;
  private isContentWidthFixed = true;
  private isCollapsedWidthFixed = false;
  private htmlElement!: HTMLHtmlElement;

  usuarioLogado: Usuario | null = null;
  navItemsFiltrados: NavItem[] = [];
  exibirAvisoOnboarding = false;
  ImagemUtil = ImagemUtil;
  mobileNavGroups: MobileNavGroup[] = [];
  mobileDrawerOpen = false;
  mobileAppsOpen = false;
  mobileProfileOpen = false;
  mobileNotificationsOpen = false;
  currentRoute = '';
  currentPageTitle = '';
  private mobileExpandedItems = new Set<string>();
  private moreSheetTouchStartY: number | null = null;
  notificacoes: NotificacaoItem[] = [];
  notificacoesNaoLidas = 0;
  carregandoNotificacoes = false;
  podeEnviarNotificacao = false;
  tipoEmpresaAtual: TipoEmpresa = TipoEmpresa.GRAFICA;
  swipedNotificationId: number | null = null;
  private ultimaCargaResumoAt = 0;
  private readonly intervaloMinimoResumoMs = 5000;
  private readonly permissoesEnviarNotificacao = ['NOTIFICACAO_ENVIAR', 'NOTIFICACAO_ENVIAR_GLOBAL'];
  private notificationTouchStartX: number | null = null;
  mobileBottomNavItems: MobileBottomNavItem[] = [];
  private versaoCatalogoAtual: CatalogoVersaoAdministrativa = 'LEGADO_DEPOSITO';

  get isOver(): boolean {
    return this.isMobileScreen;
  }

  get isTablet(): boolean {
    return this.resView;
  }

  get isMobileLayout(): boolean {
    return this.resView;
  }

  get hasMobileOverlayOpen(): boolean {
    return this.mobileDrawerOpen || this.mobileAppsOpen || this.mobileProfileOpen || this.mobileNotificationsOpen;
  }

  get useMinimalMobileHeader(): boolean {
    const url = this.currentRoute;

    if (!this.isMobileLayout) {
      return false;
    }

    return (
      url.startsWith('/smartcalc') ||
      url.startsWith('/page/pedido') ||
      url.startsWith('/page/cadastro-tecnico/acabamentos') ||
      url.startsWith('/page/cadastro-tecnico/cores') ||
      url.startsWith('/page/cadastro-tecnico/formatos') ||
      url.startsWith('/page/cadastro-tecnico/materiais') ||
      url.startsWith('/page/cadastro-tecnico/produtos') ||
      url.startsWith('/page/deposito') ||
      url.startsWith('/page/orcamentos') ||
      url.startsWith('/page/catalogo') ||
      url.startsWith('/page/ajuda') ||
      url.startsWith('/page/cadastro-tecnico/servico') ||
      url.startsWith('/page/cadastro-tecnico/servicos') ||
      url.startsWith('/dashboards/dashboard1/grafico') ||
      url.startsWith('/onboarding') ||
      url.includes('/form') ||
      url.includes('/criar') ||
      url.includes('/editar')
    );
  }

  get useTitleOnlyMobileHeader(): boolean {
    if (!this.isMobileLayout) {
      return false;
    }

    return this.currentRoute.startsWith('/dashboards/dashboard1');
  }

  get hideMobileBottomNav(): boolean {
    return false;
  }

  get mobileProfileSubtitle(): string {
    return this.usuarioLogado?.perfil?.nome || this.usuarioLogado?.username || '';
  }

  // for mobile app sidebar
  apps: AplicativoCatalogo[] = [];

  quicklinks: AtalhoEmpresa[] = [];

  constructor(
    private settings: CoreService,
    private mediaMatcher: MediaMatcher,
    private router: Router,
    private breakpointObserver: BreakpointObserver,
    private navService: NavService,
    private authService: AuthService,
    private dialog: MatDialog,
    private location: Location,
    @Inject(BillingService) private billingService: BillingService,
    private billingState: BillingStateService,
    private onboardingFlow: OnboardingFlowService,
    private notificacaoService: NotificacaoService,
    private catalogoContext: CatalogoEmpresaContextService,
    private configuracaoAplicativosService: ConfiguracaoAplicativosService,
    private featureFlagService: FeatureFlagService,
  ) {
    effect(() => {
      this.atualizarLinksEmpresa(this.configuracaoAplicativosService.configuracao());
    });

    this.htmlElement = document.querySelector('html')!;
    this.layoutChangesSubscription = this.breakpointObserver
      .observe([MOBILE_VIEW, TABLET_VIEW, MONITOR_VIEW, BELOWMONITOR])
      .subscribe((state) => {
        // SidenavOpened must be reset true when layout changes
        this.options.sidenavOpened = true;
        this.isMobileScreen = state.breakpoints[BELOWMONITOR];
        if (this.options.sidenavCollapsed == false) {
          this.options.sidenavCollapsed = state.breakpoints[TABLET_VIEW];
        }
        this.isContentWidthFixed = state.breakpoints[MONITOR_VIEW];
        this.resView = state.breakpoints[BELOWMONITOR];

        if (!this.resView) {
          this.closeMobileOverlays();
        }
      });

    // Initialize project theme with options
    this.receiveOptions(this.options);

    // This is for scroll to top
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((e) => {
        this.content.scrollTo({ top: 0 });
        this.currentRoute = (e as NavigationEnd).urlAfterRedirects;
        this.currentPageTitle = this.resolveCurrentPageTitle(this.currentRoute);
        this.closeMobileOverlays();
        if (this.usuarioLogado?.id) {
          this.carregarResumoNotificacoes();
        }
      });
  }

  ngOnInit(): void {
    this.aplicarConfiguracaoPorTipoEmpresa(this.tipoEmpresaAtual);
    this.authService.usuario$
      .pipe(
        filter((usuario): usuario is Usuario => !!usuario)
      )
      .subscribe(usuario => {  
        this.usuarioLogado = usuario;
        this.tipoEmpresaAtual = resolveTipoEmpresa(usuario.empresa?.tipoEmpresa);
        this.versaoCatalogoAtual = this.catalogoContext.snapshot().versaoCatalogo;
        this.aplicarConfiguracaoPorTipoEmpresa(this.tipoEmpresaAtual);
        this.carregarLinksEmpresa();
        this.atualizarPermissaoEnvioNotificacao();
        const permissoes = (usuario.perfil?.permissoes || []).map(p => p.chave);
        this.navItemsFiltrados = this.filtrarMenus(navItems, permissoes, this.tipoEmpresaAtual, this.versaoCatalogoAtual, usuario);
        this.mobileNavGroups = this.buildMobileNavGroups(this.navItemsFiltrados);
        this.featureFlagService.carregar().pipe(take(1)).subscribe(() => {
          this.navItemsFiltrados = this.filtrarMenus(navItems, permissoes, this.tipoEmpresaAtual, this.versaoCatalogoAtual, usuario);
          this.mobileNavGroups = this.buildMobileNavGroups(this.navItemsFiltrados);
        });
        this.currentPageTitle = this.resolveCurrentPageTitle(this.router.url);
        this.carregarStatusBilling();
        this.carregarAvisoOnboarding(usuario);
        if (usuario?.id) {
          this.carregarResumoNotificacoes(true);
        } else {
          this.notificacoes = [];
          this.notificacoesNaoLidas = 0;
          this.ultimaCargaResumoAt = 0;
        }
      });

    this.currentRoute = this.router.url;
    this.currentPageTitle = this.resolveCurrentPageTitle(this.currentRoute);
  }

  ngOnDestroy() {
    this.unlockBodyScroll();
    this.layoutChangesSubscription.unsubscribe();
  }

  filtrarMenus(
    items: NavItem[],
    permissoesUsuario: string[],
    tipoEmpresa: TipoEmpresa,
    versaoCatalogo: CatalogoVersaoAdministrativa,
    usuario: Usuario
  ): NavItem[] {
    return filtrarMenuPrincipal(items, {
      permissoesUsuario,
      tipoEmpresa,
      versaoCatalogo,
      usuario,
      isFeatureEnabled: (featureKey) => this.featureFlagService.isEnabled(featureKey),
    });
  }
  

  toggleCollapsed() {
    this.isContentWidthFixed = false;
    this.options.sidenavCollapsed = !this.options.sidenavCollapsed;
    this.resetCollapsedState();
  }

  resetCollapsedState(timer = 400) {
    setTimeout(() => this.settings.setOptions(this.options), timer);
  }

  onSidenavClosedStart() {
    this.isContentWidthFixed = false;
  }

  onSidenavOpenedChange(isOpened: boolean) {
    this.isCollapsedWidthFixed = !this.isOver;
    this.options.sidenavOpened = isOpened;
    this.settings.setOptions(this.options);
  }

  receiveOptions(options: AppSettings): void {
    this.options = options;
    this.toggleDarkTheme(options);
  }

  private carregarStatusBilling(): void {
    this.billingService.obterStatus().subscribe({
      next: (resp) => this.billingState.setFromResponse(resp),
      error: () => {}
    });
  }

  continuarOnboarding(): void {
    this.router.navigate(['/onboarding']);
  }

  logout(): void {
    this.authService.logout();
  }

  toggleMobileDrawer(): void {
    this.mobileDrawerOpen = !this.mobileDrawerOpen;
    if (this.mobileDrawerOpen) {
      this.mobileAppsOpen = false;
      this.mobileProfileOpen = false;
      this.mobileNotificationsOpen = false;
    }
    this.syncBodyScroll();
  }

  onMoreSheetTouchStart(event: TouchEvent): void {
    this.moreSheetTouchStartY = event.touches[0]?.clientY ?? null;
  }

  onMoreSheetTouchEnd(event: TouchEvent): void {
    if (this.moreSheetTouchStartY === null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? this.moreSheetTouchStartY;
    const delta = endY - this.moreSheetTouchStartY;
    this.moreSheetTouchStartY = null;

    if (delta > 56) {
      this.closeMobileOverlays();
    }
  }

  toggleMobileAppsSheet(): void {
    this.mobileAppsOpen = !this.mobileAppsOpen;
    if (this.mobileAppsOpen) {
      this.mobileDrawerOpen = false;
      this.mobileProfileOpen = false;
      this.mobileNotificationsOpen = false;
    }
    this.syncBodyScroll();
  }

  toggleMobileProfileSheet(): void {
    this.mobileProfileOpen = !this.mobileProfileOpen;
    if (this.mobileProfileOpen) {
      this.mobileDrawerOpen = false;
      this.mobileAppsOpen = false;
      this.mobileNotificationsOpen = false;
    }
    this.syncBodyScroll();
  }

  toggleMobileNotificationsSheet(): void {
    this.mobileNotificationsOpen = !this.mobileNotificationsOpen;
    if (this.mobileNotificationsOpen) {
      this.mobileDrawerOpen = false;
      this.mobileAppsOpen = false;
      this.mobileProfileOpen = false;
      this.carregarResumoNotificacoes(true);
    }
    this.syncBodyScroll();
  }

  navigateMobileBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/dashboards/dashboard1']);
  }

  closeMobileOverlays(): void {
    this.mobileDrawerOpen = false;
    this.mobileAppsOpen = false;
    this.mobileProfileOpen = false;
    this.mobileNotificationsOpen = false;
    this.swipedNotificationId = null;
    this.syncBodyScroll();
  }

  onMobileNavItemClick(item: NavItem): void {
    if (item.disabled) {
      return;
    }

    if (item.children?.length) {
      this.toggleMobileItemExpanded(item);
      return;
    }

    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  onMobileChildItemClick(item: NavItem): void {
    if (item.disabled) {
      return;
    }

    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  onMobileBottomNavClick(item: MobileBottomNavItem): void {
    if (item.action === 'drawer') {
      this.toggleMobileDrawer();
      return;
    }

    if (item.action === 'apps') {
      this.toggleMobileAppsSheet();
      return;
    }

    if (item.action === 'profile') {
      this.toggleMobileProfileSheet();
      return;
    }

    if (item.route) {
      this.router.navigate([item.route]);
    }
  }

  isMobileBottomNavActive(item: MobileBottomNavItem): boolean {
    if (item.action === 'drawer') {
      return this.mobileDrawerOpen;
    }

    if (item.action === 'apps') {
      return this.mobileAppsOpen;
    }

    if (item.action === 'profile') {
      if (this.mobileProfileOpen) {
        return true;
      }
    }

    if (!item.route) {
      return !!item.startsWith?.some((route) => this.currentRoute.startsWith(route));
    }

    if (item.key === 'dashboard' && item.route === '/page/deposito') {
      return this.currentRoute === item.route;
    }

    return (item.startsWith ?? [item.route]).some((route) => this.currentRoute.startsWith(route));
  }

  toggleMobileItemExpanded(item: NavItem): void {
    const key = this.getMobileItemKey(item);
    if (this.mobileExpandedItems.has(key)) {
      this.mobileExpandedItems.delete(key);
      return;
    }

    this.mobileExpandedItems.add(key);
  }

  isMobileItemExpanded(item: NavItem): boolean {
    return this.mobileExpandedItems.has(this.getMobileItemKey(item));
  }

  isMobileItemActive(item: NavItem): boolean {
    if (item.route && this.router.isActive(item.route, false)) {
      return true;
    }

    return !!item.children?.some((child) => child.route ? this.router.isActive(child.route, false) : false);
  }

  trackByGroupTitle(_: number, group: MobileNavGroup): string {
    return group.title;
  }

  trackByNavItem(_: number, item: NavItem): string {
    return this.getMobileItemKey(item);
  }

  abrirNotificacaoMobile(item: NotificacaoItem): void {
    if (!item?.id) return;

    this.marcarNotificacaoComoLidaLocal(item);
    if (!item.lida) {
      this.notificacaoService.marcarComoLida$(item.id).subscribe({ error: () => {} });
    }

    this.closeMobileOverlays();
    this.abrirCentralNotificacoes(item.id);
  }

  marcarNotificacaoComoLidaMobile(item: NotificacaoItem, event?: Event): void {
    event?.stopPropagation();

    if (!item?.id || item.lida) {
      this.swipedNotificationId = null;
      return;
    }

    this.marcarNotificacaoComoLidaLocal(item);
    this.notificacaoService.marcarComoLida$(item.id).subscribe({ error: () => {} });
    this.swipedNotificationId = null;
  }

  marcarTodasNotificacoesComoLidasMobile(): void {
    if (!this.notificacoesNaoLidas) return;

    this.notificacoes = this.notificacoes.map((item) => ({ ...item, lida: true }));
    this.notificacoesNaoLidas = 0;
    this.swipedNotificationId = null;
    this.notificacaoService.marcarTodasComoLidas$().subscribe({ error: () => {} });
  }

  abrirTodasNotificacoesMobile(): void {
    this.closeMobileOverlays();
    this.abrirCentralNotificacoes();
  }

  abrirDialogEnvioNotificacaoMobile(): void {
    this.atualizarPermissaoEnvioNotificacao();
    if (!this.podeEnviarNotificacao) return;

    const dialogRef = this.dialog.open(NotificacaoEnviarDialogComponent, {
      width: '720px',
      maxWidth: '95vw',
      disableClose: true
    });

    dialogRef.afterClosed().subscribe((enviou) => {
      if (!enviou) return;
      this.carregarResumoNotificacoes(true);
      this.closeMobileOverlays();
      this.abrirCentralNotificacoes();
    });
  }

  notificacaoLabelNova(): string {
    return this.notificacoesNaoLidas === 1 ? '1 nova' : `${this.notificacoesNaoLidas} novas`;
  }

  possuiNotificacaoCriticaNaoLida(): boolean {
    return this.notificacoes.some(
      (item) => !item.lida && String(item?.nivel || '').toUpperCase() === 'CRITICO'
    );
  }

  formatarTempoNotificacao(iso?: string | null): string {
    if (!iso) return 'Agora';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return 'Agora';
    const diffMs = Date.now() - date.getTime();
    const min = Math.floor(diffMs / 60000);
    if (min < 1) return 'Agora';
    if (min < 60) return `${min} min atrás`;

    const agora = new Date();
    const inicioHoje = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate()).getTime();
    const inicioData = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
    const diffDias = Math.floor((inicioHoje - inicioData) / 86400000);

    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    return `há ${Math.max(1, diffDias)} dias`;
  }

  resumoNotificacao(item: NotificacaoItem): string {
    return String(item.resumo || item.conteudo || 'Sem resumo');
  }

  iconeNotificacao(item: NotificacaoItem): string {
    const nivel = String(item?.nivel || 'INFO').toUpperCase();
    if (nivel === 'CRITICO') return 'alert-octagon';
    if (nivel === 'ATENCAO') return 'alert-triangle';
    if (nivel === 'SUCESSO') return 'circle-check';
    return 'info-circle';
  }

  onNotificationTouchStart(event: TouchEvent): void {
    this.notificationTouchStartX = event.changedTouches?.[0]?.clientX ?? null;
  }

  onNotificationTouchEnd(event: TouchEvent, item: NotificacaoItem): void {
    const endX = event.changedTouches?.[0]?.clientX ?? null;

    if (this.notificationTouchStartX == null || endX == null || item.lida) {
      this.notificationTouchStartX = null;
      return;
    }

    const deltaX = endX - this.notificationTouchStartX;
    if (deltaX <= -48) {
      this.swipedNotificationId = item.id;
    } else if (deltaX >= 36 && this.swipedNotificationId === item.id) {
      this.swipedNotificationId = null;
    }

    this.notificationTouchStartX = null;
  }

  private carregarAvisoOnboarding(usuario: Usuario): void {
    if (!usuario?.proprietario) {
      this.exibirAvisoOnboarding = false;
      return;
    }

    const usuarioId = usuario.id ?? null;
    const ignorarOnboarding = usuario.onboardingIgnorado ?? usuario.empresa?.onboardingIgnorado;
    if (ignorarOnboarding || !usuarioId || !this.onboardingFlow.wasDismissed(usuarioId)) {
      this.exibirAvisoOnboarding = false;
      return;
    }

    this.onboardingFlow.loadStatus(true).subscribe({
      next: (status) => {
        this.onboardingFlow.setStatus(status);

        if (status.onboardingConcluido) {
          this.onboardingFlow.clearDismissed(usuarioId);
          this.exibirAvisoOnboarding = false;
          return;
        }

        this.exibirAvisoOnboarding = true;
      },
      error: () => {
        this.exibirAvisoOnboarding = false;
      }
    });
  }

  private buildMobileNavGroups(items: NavItem[]): MobileNavGroup[] {
    const groups: MobileNavGroup[] = [];
    const primaryRoutes = this.tipoEmpresaAtual === TipoEmpresa.DEPOSITO
      ? new Set([
          '/page/deposito',
          this.catalogoPrincipalRoute(),
          '/page/orcamentos'
        ])
      : new Set(['/dashboards/dashboard1', '/page/pedido', '/smartcalc']);
    const secondaryItems = items.filter((item) => !item.navCap && !primaryRoutes.has(item.route || ''));

    const groupMap: Record<string, (item: NavItem) => boolean> = {
      Operação: (item) =>
        [
          '/page/cliente'
        ].some((route) => item.route?.startsWith(route)),
      Catálogo: (item) =>
        item.displayName === 'Catálogo',
      Gestão: (item) =>
        [
          '/page/usuarios/listar',
          '/page/perfil',
          '/page/funcionarios'
        ].some((route) => item.route?.startsWith(route)),
      'Presença Digital': (item) =>
        [
          '/page/site',
          '/page/links',
          '/page/clicktv'
        ].some((route) => item.route?.startsWith(route)),
      Configurações: (item) =>
        [
          '/page/empresa',
          '/billing/minha-assinatura',
          '/config'
        ].some((route) => item.route?.startsWith(route)),
      Ajuda: (item) =>
        [
          '/page/suporte',
          '/page/ajuda'
        ].some((route) => item.route?.startsWith(route)),
    };

    Object.entries(groupMap).forEach(([title, matcher]) => {
      const groupItems = secondaryItems.filter((item) => matcher(item));
      if (groupItems.length) {
        groups.push({ title, items: groupItems });
      }
    });

    const usedRoutes = new Set(groups.flatMap((group) => group.items.map((item) => item.route || item.displayName || '')));
    const remainingItems = secondaryItems.filter(
      (item) => !usedRoutes.has(item.route || item.displayName || '')
    );

    if (remainingItems.length) {
      groups.push({ title: 'Mais', items: remainingItems });
    }

    return groups;
  }

  private getMobileItemKey(item: NavItem): string {
    return item.route || item.displayName || item.iconName || Math.random().toString();
  }

  private resolveCurrentPageTitle(url: string): string {
    if (url.startsWith('/smartcalc')) return 'SmartCalc';
    if (url.startsWith('/dashboards/dashboard1/grafico')) return 'Gráfico';
    if (this.isPedidosListRoute(url)) return 'Pedidos';

    const exactMatch = this.findNavLabel(url, true);
    if (exactMatch) return exactMatch;

    const prefixMatch = this.findNavLabel(url, false);
    if (prefixMatch) return prefixMatch;

    if (url.includes('/theme-pages/account-setting')) return 'Meu perfil';
    if (url.includes('/billing/')) return 'Assinatura';
    if (url.includes('/page/suporte')) return 'Suporte';

    return 'ClickManager';
  }

  private findNavLabel(url: string, exact: boolean): string | null {
    const search = (items: NavItem[]): string | null => {
      for (const item of items) {
        if (item.route) {
          const matched = exact ? this.router.isActive(item.route, true) : url.startsWith(item.route);
          if (matched) {
            return item.displayName || null;
          }
        }

        if (item.children?.length) {
          const childMatch = search(item.children);
          if (childMatch) return childMatch;
        }
      }

      return null;
    };

    return search(this.navItemsFiltrados);
  }

  private isPedidosListRoute(url: string): boolean {
    return url.startsWith('/page/pedido') && !url.includes('/criar') && !url.includes('/editar') && !url.includes('/detalhe/');
  }

  private syncBodyScroll(): void {
    if (this.hasMobileOverlayOpen && this.isMobileLayout) {
      this.lockBodyScroll();
      return;
    }

    this.unlockBodyScroll();
  }

  private lockBodyScroll(): void {
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    document.body.style.overflow = '';
    document.documentElement.style.overflow = '';
  }

  toggleDarkTheme(options: AppSettings) {
    if (options.theme === 'dark') {
      this.htmlElement.classList.add('dark-theme');
      this.htmlElement.classList.remove('light-theme');
    } else {
      this.htmlElement.classList.remove('dark-theme');
      this.htmlElement.classList.add('light-theme');
    }
  }

  private carregarResumoNotificacoes(force = false): void {
    if (!force) {
      const agora = Date.now();
      if (agora - this.ultimaCargaResumoAt < this.intervaloMinimoResumoMs) {
        return;
      }
    }

    this.carregandoNotificacoes = true;
    this.notificacaoService.obterResumo$(5).subscribe({
      next: (resumo) => {
        this.notificacoes = resumo.itens || [];
        this.notificacoesNaoLidas = Number(resumo.naoLidas || 0);
        this.carregandoNotificacoes = false;
        this.ultimaCargaResumoAt = Date.now();
      },
      error: () => {
        this.carregandoNotificacoes = false;
      }
    });
  }

  private aplicarConfiguracaoPorTipoEmpresa(tipoEmpresa: TipoEmpresa): void {
    const catalogoNovoAtivo = tipoEmpresa === TipoEmpresa.DEPOSITO && this.versaoCatalogoAtual === 'CATALOGO_NOVO';
    const catalogoRoute = this.catalogoPrincipalRoute();
    const catalogoStartsWith = catalogoNovoAtivo
      ? ['/page/catalogo']
      : ['/page/deposito/itens', '/page/deposito/categorias', '/page/deposito/marcas'];

    this.mobileBottomNavItems = tipoEmpresa === TipoEmpresa.DEPOSITO
      ? [
          {
            key: 'dashboard',
            label: 'Dashboard',
            icon: 'layout-dashboard',
            route: '/page/deposito',
            startsWith: ['/page/deposito'],
          },
          {
            key: 'atalhos',
            label: 'Atalhos',
            icon: 'grid-dots',
            action: 'apps',
          },
          {
            key: 'catalogo',
            label: 'Catálogo',
            icon: 'package',
            route: catalogoRoute,
            startsWith: catalogoStartsWith,
            special: true,
          },
          {
            key: 'orcamentos',
            label: 'Orçamentos',
            icon: 'file-text',
            route: '/page/orcamentos',
            startsWith: ['/page/orcamentos'],
          },
          {
            key: 'mais',
            label: 'Mais',
            icon: 'menu-2',
            action: 'drawer',
          }
        ]
      : [
          {
            key: 'dashboard',
            label: 'Dashboard',
            icon: 'layout-dashboard',
            route: '/dashboards/dashboard1',
            startsWith: ['/dashboards/dashboard1'],
          },
          {
            key: 'atalhos',
            label: 'Atalhos',
            icon: 'grid-dots',
            action: 'apps',
          },
          {
            key: 'catalogo',
            label: 'Catálogo',
            icon: 'package',
            route: '/page/grafica/produtos',
            startsWith: ['/page/grafica'],
            special: true,
          },
          {
            key: 'pedidos',
            label: 'Pedidos',
            icon: 'file-text',
            route: '/page/pedido',
            startsWith: ['/page/pedido'],
          },
          {
            key: 'mais',
            label: 'Mais',
            icon: 'menu-2',
            action: 'drawer',
          }
        ];

    this.atualizarLinksEmpresa(this.configuracaoAplicativosService.configuracao());
  }

  abrirAtalhoMobile(atalho: AtalhoEmpresa, event: Event): void {
    event.preventDefault();
    this.closeMobileOverlays();

    if (!atalho?.url) return;

    if (atalho.novaAba) {
      window.open(atalho.url, '_blank', 'noopener,noreferrer');
      return;
    }

    window.location.href = atalho.url;
  }

  private carregarLinksEmpresa(): void {
    if (!this.usuarioLogado?.id) {
      this.apps = [];
      this.quicklinks = [];
      return;
    }

    this.configuracaoAplicativosService.carregar().subscribe({
      error: () => {
        this.apps = [];
        this.quicklinks = [];
      },
    });
  }

  private atualizarLinksEmpresa(configuracao: ConfiguracaoAplicativos | null): void {
    this.apps = aplicativosVisiveis(
      configuracao,
      (modulo) => this.featureFlagService.isEnabled(modulo),
      (permissao) => this.authService.temPermissao(permissao),
    );
    this.quicklinks = (configuracao?.atalhos || [])
      .filter((atalho) => atalho.ativo)
      .slice()
      .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  }

  private catalogoPrincipalRoute(): string {
    if (this.tipoEmpresaAtual !== TipoEmpresa.DEPOSITO || this.versaoCatalogoAtual === 'LEGADO_DEPOSITO') {
      return this.authService.temPermissao('DEPOSITO_ITENS_VER')
        ? '/page/deposito/itens'
        : this.authService.temPermissao('DEPOSITO_CATEGORIAS_VER')
          ? '/page/deposito/categorias'
          : '/page/deposito/marcas';
    }

    if (this.authService.temPermissao('CATALOGO_PRODUTOS_VER')) {
      return '/page/catalogo/produtos';
    }

    if (this.authService.temPermissao('CATALOGO_CATEGORIAS_VER')) {
      return '/page/catalogo/categorias';
    }

    return '/page/catalogo/marcas';
  }

  private atualizarPermissaoEnvioNotificacao(): void {
    this.podeEnviarNotificacao = this.authService.temAlgumaPermissao(this.permissoesEnviarNotificacao);
  }

  private marcarNotificacaoComoLidaLocal(item: NotificacaoItem): void {
    this.notificacoesNaoLidas = Math.max(0, this.notificacoesNaoLidas - (item.lida ? 0 : 1));
    this.notificacoes = this.notificacoes.map((n) => (n.id === item.id ? { ...n, lida: true } : n));
  }

  private abrirCentralNotificacoes(notificacaoId?: number): void {
    const usuarioId = this.usuarioLogado?.id ?? null;
    if (!usuarioId) {
      this.router.navigate(notificacaoId ? ['/apps/notificacoes', notificacaoId] : ['/apps/notificacoes']);
      return;
    }

    const queryParams: Record<string, any> = { tab: 'notificacoes' };
    if (notificacaoId) {
      queryParams['notificacaoId'] = notificacaoId;
    }

    this.router.navigate(['/theme-pages/account-setting', usuarioId], { queryParams });
  }
}
