import { Routes } from '@angular/router';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { DEPOSITO_ROUTE_DATA, SHARED_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';
import { pendingChangesGuard } from './shared/guards/pending-changes.guard';
import { catalogoNovoGuard } from './shared/guards/catalogo-versao.guard';

export const CatalogoRoutes: Routes = [
  { path: '', redirectTo: 'produtos', pathMatch: 'full' },
  {
    path: 'produtos',
    loadComponent: () => import('./produtos/catalogo-produto-list.component').then((m) => m.CatalogoProdutoListComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_PRODUTOS_VER'], title: 'Produtos do Catalogo', urls: [{ title: 'Catalogo' }, { title: 'Produtos' }] },
  },
  {
    path: 'produtos/novo',
    loadComponent: () => import('./produtos/catalogo-produto-form.component').then((m) => m.CatalogoProdutoFormComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    canDeactivate: [pendingChangesGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_PRODUTOS_CADASTRAR'], title: 'Novo produto', urls: [{ title: 'Produtos', url: '/page/catalogo/produtos' }, { title: 'Novo produto' }] },
  },
  {
    path: 'produtos/:id',
    loadComponent: () => import('./produtos/catalogo-produto-detail.component').then((m) => m.CatalogoProdutoDetailComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_PRODUTOS_VER'], title: 'Detalhe do produto', urls: [{ title: 'Produtos', url: '/page/catalogo/produtos' }, { title: 'Detalhe' }] },
  },
  {
    path: 'produtos/:id/editar',
    loadComponent: () => import('./produtos/catalogo-produto-form.component').then((m) => m.CatalogoProdutoFormComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    canDeactivate: [pendingChangesGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_PRODUTOS_EDITAR'], title: 'Editar produto', urls: [{ title: 'Produtos', url: '/page/catalogo/produtos' }, { title: 'Editar produto' }] },
  },
  {
    path: 'categorias',
    loadComponent: () => import('./categorias/catalogo-categoria-list.component').then((m) => m.CatalogoCategoriaListComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    data: { ...SHARED_ROUTE_DATA, requiredPermission: ['CATALOGO_CATEGORIAS_VER', 'GRAFICA_PRODUTOS_VER'], title: 'Categorias do Catalogo', urls: [{ title: 'Catalogo' }, { title: 'Categorias' }] },
  },
  {
    path: 'categorias/nova',
    loadComponent: () => import('./categorias/catalogo-categoria-form.component').then((m) => m.CatalogoCategoriaFormComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    canDeactivate: [pendingChangesGuard],
    data: { ...SHARED_ROUTE_DATA, requiredPermission: ['CATALOGO_CATEGORIAS_CADASTRAR', 'GRAFICA_PRODUTOS_EDITAR'], title: 'Nova categoria', urls: [{ title: 'Categorias', url: '/page/catalogo/categorias' }, { title: 'Nova categoria' }] },
  },
  {
    path: 'categorias/:id/editar',
    loadComponent: () => import('./categorias/catalogo-categoria-form.component').then((m) => m.CatalogoCategoriaFormComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    canDeactivate: [pendingChangesGuard],
    data: { ...SHARED_ROUTE_DATA, requiredPermission: ['CATALOGO_CATEGORIAS_EDITAR', 'GRAFICA_PRODUTOS_EDITAR'], title: 'Editar categoria', urls: [{ title: 'Categorias', url: '/page/catalogo/categorias' }, { title: 'Editar categoria' }] },
  },
  {
    path: 'categorias/:id/caracteristicas',
    loadComponent: () => import('./categorias/catalogo-caracteristicas.component').then((m) => m.CatalogoCaracteristicasComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    data: { ...SHARED_ROUTE_DATA, requiredPermission: ['CATALOGO_CARACTERISTICAS_VER', 'GRAFICA_PRODUTOS_VER'], title: 'Caracteristicas da categoria', urls: [{ title: 'Categorias', url: '/page/catalogo/categorias' }, { title: 'Caracteristicas' }] },
  },
  {
    path: 'marcas',
    loadComponent: () => import('./marcas/catalogo-marca-list.component').then((m) => m.CatalogoMarcaListComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_MARCAS_VER'], title: 'Marcas do Catalogo', urls: [{ title: 'Catalogo' }, { title: 'Marcas' }] },
  },
  {
    path: 'marcas/nova',
    loadComponent: () => import('./marcas/catalogo-marca-form.component').then((m) => m.CatalogoMarcaFormComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    canDeactivate: [pendingChangesGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_MARCAS_CADASTRAR'], title: 'Nova marca', urls: [{ title: 'Marcas', url: '/page/catalogo/marcas' }, { title: 'Nova marca' }] },
  },
  {
    path: 'marcas/:id/editar',
    loadComponent: () => import('./marcas/catalogo-marca-form.component').then((m) => m.CatalogoMarcaFormComponent),
    canActivate: [catalogoNovoGuard, permissionGuard],
    canDeactivate: [pendingChangesGuard],
    data: { ...DEPOSITO_ROUTE_DATA, requiredPermission: ['CATALOGO_MARCAS_EDITAR'], title: 'Editar marca', urls: [{ title: 'Marcas', url: '/page/catalogo/marcas' }, { title: 'Editar marca' }] },
  },
];
