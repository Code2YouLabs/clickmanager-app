import { Routes } from '@angular/router';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { SHARED_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';
import { FormClienteComponent } from './form-cliente/form-cliente.component';
import { ListarClienteComponent } from './listar-cliente/listar-cliente.component';

export const ClienteRoutes: Routes = [
  {
    path: '',
    component: ListarClienteComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLIENTE_VER'],
      title: 'Lista de Clientes',
      urls: [
        { title: 'Clientes', url: '/page/cliente' },
        { title: 'Lista de Clientes' }
      ]
    }
  },
  {
    path: 'criar',
    component: FormClienteComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLIENTE_CADASTRAR'],
      title: 'Criar Cliente',
      urls: [
        { title: 'Lista de Clientes', url: '/page/cliente' },
        { title: 'Criar Cliente' }
      ]
    }
  },
  {
    path: 'editar/:id',
    component: FormClienteComponent,
    canActivate: [permissionGuard],
    data: {
      ...SHARED_ROUTE_DATA,
      requiredPermission: ['CLIENTE_EDITAR'],
      title: 'Editar Cliente',
      urls: [
        { title: 'Lista de Clientes', url: '/page/cliente' },
        { title: 'Editar Cliente' }
      ]
    }
  }
];
