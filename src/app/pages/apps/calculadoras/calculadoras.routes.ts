import { Routes } from '@angular/router';
import { permissionGuard } from 'src/app/guards/permission.guard';
import { DEPOSITO_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';
import { featureModuleGuard } from 'src/app/guards/feature-module.guard';

export const CalculadorasRoutes: Routes = [
  {
    path: 'pisos',
    loadComponent: () => import('./pisos/calculadora-pisos.component').then((m) => m.CalculadoraPisosComponent),
    canActivate: [featureModuleGuard, permissionGuard],
    data: {
      ...DEPOSITO_ROUTE_DATA,
      featureKey: 'CALCULADORA_MATERIAIS',
      requiredPermission: ['CALCULADORA_MATERIAIS_USAR'],
      title: 'Calculadora de Materiais',
      urls: [
        { title: 'Orçamentos', url: '/page/orcamentos' },
        { title: 'Calculadora de Materiais' },
      ],
    },
  },
];
