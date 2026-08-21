import { GraficaProdutoService } from './grafica.service';

describe('GraficaProdutoService', () => {
  it('usa endpoints genericos da grafica', () => {
    const api = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'patch', 'delete']);
    const service = new GraficaProdutoService(api);

    service.listar();
    service.habilitar({ catalogoProdutoId: 10 });
    service.aplicarTemplate(1, 'PANFLETO');
    service.cadastrarParametro(1, { codigo: 'FORMATO', nome: 'Formato', tipoDado: 'SELECAO' });
    service.removerParametro(1, 2);
    service.cadastrarOpcao(1, 2, { codigo: '10X15', nome: '10x15' });
    service.cadastrarOpcoesEmLote(1, 2, { valores: ['500', '1000'] });
    service.salvarDependencia(1, { opcaoOrigemId: 3, parametroDestinoId: 4, opcoesDestinoIds: [5] });
    service.resolverOpcoes(1, { selecoes: { formato: '10X15' }, proximoParametro: 'papel' });
    service.ordenarParametros(1, { itens: [{ id: 2, ordem: 1 }] });

    expect(api.get.calls.mostRecent().args[0]).toBe('api/grafica/produtos');
    expect(api.post.calls.argsFor(0)).toEqual(['api/grafica/produtos', { catalogoProdutoId: 10 }]);
    expect(api.post.calls.argsFor(1)[0]).toBe('api/grafica/produtos/1/templates');
    expect(api.post.calls.argsFor(2)[0]).toBe('api/grafica/produtos/1/parametros');
    expect(api.delete.calls.argsFor(0)[0]).toBe('api/grafica/produtos/1/parametros/2');
    expect(api.post.calls.argsFor(3)[0]).toBe('api/grafica/produtos/1/parametros/2/opcoes');
    expect(api.post.calls.argsFor(4)[0]).toBe('api/grafica/produtos/1/parametros/2/opcoes/lote');
    expect(api.put.calls.argsFor(0)[0]).toBe('api/grafica/produtos/1/dependencias');
    expect(api.post.calls.argsFor(5)[0]).toBe('api/grafica/produtos/1/configurador/opcoes');
    expect(api.patch.calls.mostRecent().args[0]).toBe('api/grafica/produtos/1/parametros/ordem');
  });
});
