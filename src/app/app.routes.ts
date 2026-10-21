import { Routes } from '@angular/router';
import { BlankComponent } from './layouts/blank/blank.component';
import { FullComponent } from './layouts/full/full.component';
import { AuthGuard } from './pages/authentication/guards/auth.guard';
import { ImprimirPedidoPageComponent } from './pages/pedido/pedido-imprimir/imprimir-pedido.page';
import { PrintComponent } from './layouts/print/print.component';
import { ImprimirEtiquetasPageComponent } from './pages/pedido/pedido-imprimir/etiquetas/imprimir-etiquetas.page';
import { ImprimirWhatsAppComponent } from './pages/pedido/pedido-imprimir-whatsapp/imprimir-whatsapp.component';
import { BillingBlockedComponent } from './pages/billing/billing-blocked/billing-blocked.component';
import { BillingConfirmationComponent } from './pages/billing/billing-confirmation/billing-confirmation.component';
import { BillingPagamentoComponent } from './pages/billing/billing-pagamento/billing-pagamento.component';
import { BillingReturnComponent } from './pages/billing/billing-return/billing-return.component';
import { OnboardingPageComponent } from './pages/onboarding/onboarding-page.component';
import { OnboardingGuard } from './guards/onboarding.guard';
import { EmpresaTipoGuard } from './guards/empresa-tipo.guard';
import { GRAFICA_ROUTE_DATA, SHARED_ROUTE_DATA } from './guards/empresa-tipo-route-data';
import { RootRedirectGuard } from './guards/root-redirect.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [AuthGuard, RootRedirectGuard],
    component: BlankComponent,
  },
  {
    path: '',
    component: FullComponent,
    canActivate: [AuthGuard],
    canActivateChild: [OnboardingGuard, EmpresaTipoGuard],
    data: { perfil: 'GESTOR' },
    children: [
      {
        path: '',
        redirectTo: '/dashboards/dashboard1',
        pathMatch: 'full'
      },
      {
        path: 'page',
        canActivateChild: [EmpresaTipoGuard],
        loadChildren: () =>
          import('./pages/pages.routes').then((m) => m.PagesRoutes),
      },
      {
        path: 'dashboards',
        loadChildren: () =>
          import('./pages/dashboards/dashboards.routes').then(
            (m) => m.DashboardsRoutes
          ),
        canActivate: [AuthGuard, EmpresaTipoGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'forms',
        loadChildren: () =>
          import('./pages/forms/forms.routes').then((m) => m.FormsRoutes),
        canActivate: [AuthGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'charts',
        loadChildren: () =>
          import('./pages/charts/charts.routes').then((m) => m.ChartsRoutes),
        canActivate: [AuthGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'apps',
        loadChildren: () =>
          import('./pages/apps/apps.routes').then((m) => m.AppsRoutes),
        canActivate: [AuthGuard],
        canActivateChild: [EmpresaTipoGuard],
        data: { perfil: 'GESTOR' },
      },
      {
        path: 'smartcalc',
        loadComponent: () =>
          import('./pages/apps/smart-calc/smart-calc.component').then(
            (m) => m.SmartCalcComponent
          ),
        canActivate: [AuthGuard, EmpresaTipoGuard],
        data: {
          ...GRAFICA_ROUTE_DATA,
          perfil: 'GESTOR',
          title: 'SmartCalc – Calculadora Inteligente',
          urls: [
            { title: 'Dashboard', url: '/dashboards/dashboard1' },
            { title: 'SmartCalc' }
          ]
        },
      },
      {
        path: 'widgets',
        loadChildren: () =>
          import('./pages/widgets/widgets.routes').then(
            (m) => m.WidgetsRoutes
          ),
        canActivate: [AuthGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'tables',
        loadChildren: () =>
          import('./pages/tables/tables.routes').then((m) => m.TablesRoutes),
        canActivate: [AuthGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'datatable',
        loadChildren: () =>
          import('./pages/datatable/datatable.routes').then(
            (m) => m.DatatablesRoutes
          ),
        canActivate: [AuthGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'theme-pages',
        loadChildren: () =>
          import('./pages/theme-pages/theme-pages.routes').then(
            (m) => m.ThemePagesRoutes
          ),
        canActivate: [AuthGuard],
        canActivateChild: [EmpresaTipoGuard],
        data: { perfil: 'GESTOR' },
      },
      {
        path: 'ui-components',
        loadChildren: () =>
          import('./pages/ui-components/ui-components.routes').then(
            (m) => m.UiComponentsRoutes
          ),
        canActivate: [AuthGuard],
        data: { perfil: 'GESTOR', ...GRAFICA_ROUTE_DATA },
      },
      {
        path: 'billing/blocked',
        component: BillingBlockedComponent,
        canActivate: [AuthGuard],
        data: { mobileTitle: 'Assinatura', perfil: 'GESTOR', ...SHARED_ROUTE_DATA },
      },
      {
        path: 'billing/pagamento',
        component: BillingPagamentoComponent,
        canActivate: [AuthGuard],
        data: { mobileTitle: 'Assinatura', perfil: 'GESTOR', ...SHARED_ROUTE_DATA },
      },
      {
        path: 'billing/return',
        component: BillingReturnComponent,
        canActivate: [AuthGuard],
        data: { mobileTitle: 'Assinatura', perfil: 'GESTOR', ...SHARED_ROUTE_DATA },
      },
      {
        path: 'billing/confirmacao',
        component: BillingConfirmationComponent,
        canActivate: [AuthGuard],
        data: { mobileTitle: 'Assinatura', perfil: 'GESTOR', ...SHARED_ROUTE_DATA },
      },
      {
        path: 'billing/minha-assinatura',
        loadComponent: () =>
          import('./pages/billing/minha-assinatura/minha-assinatura.component').then(
            (m) => m.MinhaAssinaturaComponent
          ),
        canActivate: [AuthGuard],
        data: { mobileTitle: 'Assinatura', perfil: 'GESTOR', ...SHARED_ROUTE_DATA },
      },
    ],
  },
  {
    path: '',
    component: BlankComponent,
    children: [
      {
        path: 'authentication',
        loadChildren: () =>
          import('./pages/authentication/authentication.routes').then(
            (m) => m.AuthenticationRoutes
          ),
      },
      {
        path: 'landingpage',
        loadChildren: () =>
          import('./pages/theme-pages/landingpage/landingpage.routes').then(
            (m) => m.LandingPageRoutes
          ),
      },
      {
        path: 'demo',
        loadChildren: () =>
          import('./pages/demo/demo.routes').then(
            (m) => m.DemoRoutes
          ),
      },
      {
        path: 'onboarding-v2',
        loadChildren: () =>
          import('./pages/onboarding-v2/onboarding-v2.routes').then(
            (m) => m.OnboardingV2Routes
          ),
      },
      {
        path: 'onboarding',
        component: OnboardingPageComponent,
        canActivate: [AuthGuard, EmpresaTipoGuard],
        data: { ...GRAFICA_ROUTE_DATA },
      },
    ],
  },
  {
    path: '',
    component: PrintComponent,
    canActivate: [AuthGuard],
    canActivateChild: [EmpresaTipoGuard],
    children: [
      {
        path: 'pedido/imprimir/:id',
        component: ImprimirPedidoPageComponent,
        data: { ...GRAFICA_ROUTE_DATA }
      },
      {
        path: 'pedido/imprimir-duas-vias/:id',
        component: ImprimirPedidoPageComponent,
        data: { ...GRAFICA_ROUTE_DATA }
      },
      {
        path: 'pedido/imprimir-etiquetas/:id',
        component: ImprimirEtiquetasPageComponent,
        data: { ...GRAFICA_ROUTE_DATA }
      },
      {
        path: 'pedido/whatsapp/:id',
        component: ImprimirWhatsAppComponent,
        data: { ...GRAFICA_ROUTE_DATA }
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'authentication/error',
  }
];
