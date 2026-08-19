import { Routes } from '@angular/router';
import { SHARED_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';
import { featureModuleGuard } from 'src/app/guards/feature-module.guard';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { LINKS_PERMISSOES } from './models/links.models';

export const LINKS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/lista/links-lista.component').then((m) => m.LinksListaComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      featureKey: 'LINKS',
      requiredPermission: [LINKS_PERMISSOES.ver],
      title: 'ClickLink',
      urls: [{ title: 'ClickLink' }],
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
      title: 'Nova pagina ClickLink',
      urls: [{ title: 'ClickLink', url: '/page/links' }, { title: 'Nova pagina' }],
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
      title: 'Editar ClickLink',
      urls: [{ title: 'ClickLink', url: '/page/links' }, { title: 'Editor' }],
    },
  },
];
