import { GraficaProdutoService } from './grafica.service';

describe('GraficaProdutoService', () => {
  it('usa endpoints genericos da grafica', () => {
    const api = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'patch']);
    const service = new GraficaProdutoService(api);

    service.listar();
    service.habilitar({ catalogoProdutoId: 10 });
    service.cadastrarParametro(1, { codigo: 'FORMATO', nome: 'Formato', tipoDado: 'SELECAO' });
    service.cadastrarOpcao(1, 2, { codigo: '10X15', nome: '10x15' });
    service.ordenarParametros(1, { itens: [{ id: 2, ordem: 1 }] });

    expect(api.get.calls.mostRecent().args[0]).toBe('api/grafica/produtos');
    expect(api.post.calls.argsFor(0)).toEqual(['api/grafica/produtos', { catalogoProdutoId: 10 }]);
    expect(api.post.calls.argsFor(1)[0]).toBe('api/grafica/produtos/1/parametros');
    expect(api.post.calls.argsFor(2)[0]).toBe('api/grafica/produtos/1/parametros/2/opcoes');
    expect(api.patch.calls.mostRecent().args[0]).toBe('api/grafica/produtos/1/parametros/ordem');
  });
});
