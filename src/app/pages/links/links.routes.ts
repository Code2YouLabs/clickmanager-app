import { Routes } from '@angular/router';
import { SHARED_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';
import { featureModuleGuard } from 'src/app/guards/feature-module.guard';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { LINKS_PERMISSOES } from './models/links.models';

export const LINKS_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'paginas',
  },
  {
    path: 'paginas',
    loadComponent: () => import('./pages/lista/links-lista.component').then((m) => m.LinksListaComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      featureKey: 'LINKS',
      requiredPermission: [LINKS_PERMISSOES.ver],
      title: 'Páginas ClickLink',
      urls: [{ title: 'ClickLink' }, { title: 'Páginas' }],
    },
  },
  {
    path: 'analytics',
    loadComponent: () => import('./pages/analytics/links-analytics.component').then((m) => m.LinksAnalyticsComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      featureKey: 'LINKS',
      requiredPermission: [LINKS_PERMISSOES.ver],
      title: 'Analytics ClickLink',
      urls: [{ title: 'ClickLink' }, { title: 'Analytics' }],
    },
  },
  {
    path: 'nova',
    loadComponent: () => import('./pages/editor/links-editor.component').then((m) => m.LinksEditorComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      featureKey: 'LINKS',
      requiredPermission: [LINKS_PERMISSOES.criar],
      title: 'Nova página ClickLink',
      urls: [{ title: 'ClickLink', url: '/page/links/paginas' }, { title: 'Nova página' }],
    },
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/editor/links-editor.component').then((m) => m.LinksEditorComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      featureKey: 'LINKS',
      requiredPermission: [LINKS_PERMISSOES.ver, LINKS_PERMISSOES.editar],
      title: 'Editar página ClickLink',
      urls: [{ title: 'ClickLink', url: '/page/links/paginas' }, { title: 'Editor' }],
    },
  },
];
