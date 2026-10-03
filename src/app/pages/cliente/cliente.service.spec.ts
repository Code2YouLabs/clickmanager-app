import { of } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { ClienteService } from './cliente.service';

describe('ClienteService — contrato da busca global', () => {
  it('envia textoPesquisa codificado junto à paginação para api/clientes', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']); api.get.and.returnValue(of({}));
    const service = new ClienteService(api); service.listar(2, 20, 'Ana & José');
    expect(api.get).toHaveBeenCalledOnceWith('api/clientes?page=2&size=20&textoPesquisa=Ana%20%26%20Jos%C3%A9');
  });
  it('mantém defaults sem filtro', () => {
    const api = jasmine.createSpyObj<ApiService>('ApiService', ['get']); api.get.and.returnValue(of({}));
    new ClienteService(api).listar(); expect(api.get).toHaveBeenCalledOnceWith('api/clientes?page=0&size=10');
  });
});
