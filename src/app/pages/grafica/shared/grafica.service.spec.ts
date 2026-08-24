import { GraficaProdutoService } from './grafica.service';

describe('GraficaProdutoService', () => {
  it('usa endpoints genericos da grafica', () => {
    const api = jasmine.createSpyObj('ApiService', ['get', 'post', 'put', 'patch', 'delete']);
    const service = new GraficaProdutoService(api);

    service.listar();
    service.buscarPorCatalogo(10);
    service.habilitar({ catalogoProdutoId: 10 });
    service.criarProdutoCatalogo({ nome: 'Panfleto', unidadeVenda: 'UNIDADE' });
    service.aplicarTemplate(1, 'PANFLETO');
    service.cadastrarParametro(1, { codigo: 'FORMATO', nome: 'Formato', tipoDado: 'SELECAO' });
    service.removerParametro(1, 2);
    service.cadastrarOpcao(1, 2, { codigo: '10X15', nome: '10x15' });
    service.cadastrarOpcoesEmLote(1, 2, { valores: ['500', '1000'] });
    service.salvarDependencia(1, { opcaoOrigemId: 3, parametroDestinoId: 4, opcoesDestinoIds: [5] });
    service.resolverOpcoes(1, { selecoes: { formato: '10X15' }, proximoParametro: 'papel' });
    service.listarPrecos(1);
    service.salvarPrecos(1, [{ nome: 'Xerox', tipo: 'POR_FAIXA_QUANTIDADE', ativo: true, selecaoOpcaoIds: [], faixas: [{ inicio: 1, fim: null, valorUnitario: 0.25 }], lotes: [] }]);
    service.precificar(1, { quantidade: 10 });
    service.adicionarAoOrcamento(1, 99, { precificacao: { quantidade: 10 }, desconto: 5 });
    service.ordenarParametros(1, { itens: [{ id: 2, ordem: 1 }] });

    expect(api.get.calls.argsFor(0)[0]).toBe('api/grafica/produtos');
    expect(api.get.calls.argsFor(1)[0]).toBe('api/grafica/produtos/catalogo/10');
    expect(api.get.calls.mostRecent().args[0]).toBe('api/grafica/produtos/1/precos');
    expect(api.post.calls.argsFor(0)).toEqual(['api/grafica/produtos', { catalogoProdutoId: 10 }]);
    expect(api.post.calls.argsFor(1)[0]).toBe('api/grafica/produtos/catalogo');
    expect(api.post.calls.argsFor(2)[0]).toBe('api/grafica/produtos/1/templates');
    expect(api.post.calls.argsFor(3)[0]).toBe('api/grafica/produtos/1/parametros');
    expect(api.delete.calls.argsFor(0)[0]).toBe('api/grafica/produtos/1/parametros/2');
    expect(api.post.calls.argsFor(4)[0]).toBe('api/grafica/produtos/1/parametros/2/opcoes');
    expect(api.post.calls.argsFor(5)[0]).toBe('api/grafica/produtos/1/parametros/2/opcoes/lote');
    expect(api.put.calls.argsFor(0)[0]).toBe('api/grafica/produtos/1/dependencias');
    expect(api.post.calls.argsFor(6)[0]).toBe('api/grafica/produtos/1/configurador/opcoes');
    expect(api.put.calls.argsFor(1)[0]).toBe('api/grafica/produtos/1/precos');
    expect(api.post.calls.argsFor(7)[0]).toBe('api/grafica/produtos/1/precificar');
    expect(api.post.calls.argsFor(8)[0]).toBe('api/grafica/produtos/1/orcamentos/99/itens');
    expect(api.patch.calls.mostRecent().args[0]).toBe('api/grafica/produtos/1/parametros/ordem');
  });
});
