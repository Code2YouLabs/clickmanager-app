import { permissionGuard } from 'src/app/guards/permission.guard';
import { SHARED_ROUTE_DATA } from 'src/app/guards/empresa-tipo-route-data';
import { ClienteRoutes } from './cliente.routes';

describe('Clientes — rotas transversais', () => {
  it('mantém apenas listagem, criação e edição com guards e permissões existentes', () => {
    expect(ClienteRoutes.map(route => route.path)).toEqual(['', 'criar', 'editar/:id']);
    ClienteRoutes.forEach((route, index) => {
      expect(route.canActivate).toEqual([permissionGuard]);
      expect(route.data).toEqual(jasmine.objectContaining(SHARED_ROUTE_DATA));
      expect(route.data?.['requiredPermission']).toEqual([['CLIENTE_VER', 'CLIENTE_CADASTRAR', 'CLIENTE_EDITAR'][index]]);
    });
  });
});
