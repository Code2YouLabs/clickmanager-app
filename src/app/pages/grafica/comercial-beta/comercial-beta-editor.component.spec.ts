import { fakeAsync, tick } from '@angular/core/testing';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import {
  ComercialBetaEditorComponent,
  GraficaProdutoWizardDialogComponent,
} from './comercial-beta-editor.component';
import { GraficaProdutoBuscaRapidaDialogComponent } from './grafica-produto-busca-rapida-dialog.component';

describe('ComercialBetaEditorComponent', () => {
  it('usa linguagem comercial de orcamento na rota de novo orcamento', () => {
    const component = criarEditor('orcamentos');

    component.ngOnInit();

    expect(component.titulo).toBe('Novo Orçamento');
    expect(component.resumoTitulo).toBe('Resumo do orçamento');
    expect(component.itensTitulo).toBe('Itens do orçamento');
    expect(component.itemContextoLabel).toBe('orçamento');
    expect(component.contextoEditor).toEqual(jasmine.objectContaining({
      contexto: 'orcamentos',
      modo: 'novo',
      mostrarFinanceiro: false,
      mostrarValidade: false,
      mostrarDocumentos: false,
      somenteLeitura: false,
    }));
    expect((component as any).graficaService.listarFormasPagamento).not.toHaveBeenCalled();
    expect(component.responsavelNome).toBe('Leonardo Barros');

    component.ngOnDestroy();
  });

  it('mostra responsavel autenticado nos modos de criacao', () => {
    const pedido = criarEditor('pedidos');
    const orcamento = criarEditor('orcamentos');
    const rascunho = criarEditor('rascunhos');

    pedido.ngOnInit();
    orcamento.ngOnInit();
    rascunho.ngOnInit();

    expect(pedido.responsavelNome).toBe('Leonardo Barros');
    expect(orcamento.responsavelNome).toBe('Leonardo Barros');
    expect(rascunho.responsavelNome).toBe('Leonardo Barros');

    pedido.ngOnDestroy();
    orcamento.ngOnDestroy();
    rascunho.ngOnDestroy();
  });

  it('usa responsavel persistido no detalhe de pedido e orcamento', () => {
    const pedido = criarEditor('pedidos');
    const orcamento = criarEditor('orcamentos');
    pedido.tipo = 'pedidos';
    orcamento.tipo = 'orcamentos';

    (pedido as any).aplicarPedido({
      ...pedidoDetalhe(),
      responsavelNome: 'Maria Atendimento',
    });
    (orcamento as any).aplicarOrcamento({
      id: 14,
      protocolo: 'ORC-2026-000014',
      status: 'ABERTO',
      responsavelNome: 'Joao Orcamento',
      itens: [],
    });

    expect(pedido.responsavelNome).toBe('Maria Atendimento');
    expect(orcamento.responsavelNome).toBe('Joao Orcamento');
  });

  it('carrega cadastro completo do cliente para exibir endereco no card', () => {
    const component = criarEditor('pedidos');
    component.tipo = 'pedidos';

    (component as any).aplicarPedido({
      ...pedidoDetalhe(),
      clienteId: 7,
      clienteNome: 'Pedro de Lara',
      clienteTelefone: '31987531233',
      clienteEmail: 'leo@leo.com',
    });

    expect((component as any).clienteService.buscarPorId).toHaveBeenCalledWith(7);
    expect(component.clienteConfirmado).toEqual(jasmine.objectContaining({
      id: 7,
      nome: 'Pedro de Lara',
      endereco: jasmine.objectContaining({
        logradouro: 'Rua A',
        numero: '10',
      }),
    }));
  });

  it('habilita fluxo, validade e documentos no detalhe editavel do orcamento', () => {
    const component = criarEditor('orcamentos');
    component.tipo = 'orcamentos';
    component.pedidoId = 14;
    component.orcamento = {
      id: 14,
      protocolo: 'ORC-2026-000014',
      status: 'ABERTO',
      itens: [],
    } as any;

    expect(component.mostrarFluxoOrcamento).toBeTrue();
    expect(component.mostrarDocumentosOrcamento).toBeTrue();
    expect(component.contextoEditor.mostrarValidade).toBeTrue();
    expect(component.somenteLeitura).toBeFalse();
  });

  it('deixa orcamento finalizado somente leitura no editor base', () => {
    const component = criarEditor('orcamentos');
    component.tipo = 'orcamentos';
    component.pedidoId = 14;
    component.orcamento = {
      id: 14,
      protocolo: 'ORC-2026-000014',
      status: 'APROVADO',
      itens: [],
    } as any;

    expect(component.somenteLeitura).toBeTrue();
    expect(component.podeEditarItens).toBeFalse();
  });

  it('normaliza itens do GET de orcamento para a mesma lista comercial do pedido', () => {
    const component = criarEditor('orcamentos');
    component.tipo = 'orcamentos';

    (component as any).aplicarOrcamento({
      id: 14,
      protocolo: 'ORC-2026-000014',
      status: 'ABERTO',
      subtotal: 54,
      desconto: 0,
      acrescimo: 0,
      frete: 0,
      total: 54,
      itens: [{
        id: 1,
        origemProduto: 'GRAFICA',
        produtoOrigemId: 10,
        codigoProduto: 'BAN',
        produtoNome: 'Banner Fotográfico',
        descricaoProduto: 'Glossy 180g',
        caracteristicasResumoSnapshot: 'Glossy 180g · 0,6 × 0,9 m · 4x0 · Área faturada: 0,9 m²',
        quantidade: 1,
        precoUnitario: 60,
        subtotal: 54,
        snapshotGrafica: JSON.stringify({
          precificacao: { areaFaturada: 0.9 },
        }),
      }],
    } as any);

    expect(component.itens[0].nomeProduto).toBe('Banner Fotográfico');
    expect(component.itens[0].caracteristicasResumo).toContain('Glossy 180g');
    expect(component.itens[0].snapshotComercial).toContain('areaFaturada');
    expect(component.itensView[0].descricao).toBe('Banner Fotográfico');
    expect(component.itensView[0].especificacao).toContain('Área faturada');
    expect(component.itensView[0].subTotal).toBe(54);
  });

  it('hidrata os controles de ajustes do orcamento com os valores retornados', () => {
    const component = criarEditor('orcamentos');
    component.tipo = 'orcamentos';
    component.pedidoId = 14;
    const acrescimosEmitidos: number[] = [];
    component.acrescimoControl.valueChanges.subscribe((valor) => acrescimosEmitidos.push(valor));

    (component as any).aplicarOrcamento({
      id: 14,
      protocolo: 'ORC-2026-000014',
      status: 'ABERTO',
      subtotal: 1227.7,
      desconto: 10,
      acrescimo: 80,
      frete: 40,
      total: 1337.7,
      itens: [],
    } as any);

    expect(component.acrescimoControl.value).toBe(80);
    expect(component.freteControl.value).toBe(40);
    expect(component.descontoControl.value).toBe(10);
    expect(acrescimosEmitidos).toContain(80);
    expect(component.ajustesFinanceirosForm.pristine).toBeTrue();
    expect(component.resumoFinanceiroView.total).toBe(1337.7);
  });

  it('nao marca produto de catalogo como adicional apenas pela posicao na lista', () => {
    const component = criarEditor('orcamentos');
    component.itens = [
      { nomeProduto: 'Banner Fotográfico', quantidade: 1, valorUnitario: 60, valorTotal: 54 },
      { nomeProduto: 'Banner Front Light', quantidade: 1, valorUnitario: 95, valorTotal: 102.6 },
      { nomeProduto: 'impressão DEMANDA', quantidade: 258, valorUnitario: 0.45, valorTotal: 116.1 },
      { nomeProduto: 'Serviço: Logo', quantidade: 1, valorUnitario: 0, valorTotal: 0 },
    ] as any;

    expect(component.itensView[1].tipoLinha).toBe('PRINCIPAL');
    expect(component.itensView[2].tipoLinha).toBe('PRINCIPAL');
    expect(component.itensView[1].detalhes || []).not.toContain('Acabamento vinculado ao item');
    expect(component.itensView[3].tipoLinha).toBe('SERVICO');
  });

  it('usa resumo comercial e acoes de conversao no contexto de rascunho', () => {
    const component = criarEditor('rascunhos');
    component.tipo = 'rascunhos';

    expect(component.resumoTitulo).toBe('Resumo comercial');
    expect(component.mostrarPagamentos).toBeFalse();
    expect(component.mostrarAcoesCriacao).toBeTrue();
    expect(component.prontoSalvarDescricao).toBe('Escolha se este atendimento vira pedido ou orçamento.');
  });

  it('converte rascunho existente para orcamento pela acao compartilhada', () => {
    const component = criarEditor('rascunhos');
    component.tipo = 'rascunhos';
    component.pedidoId = 9;
    component.rascunho = {
      id: 9,
      empresaId: 1,
      status: 'ABERTO',
      subtotal: 100,
      desconto: 0,
      acrescimo: 0,
      frete: 0,
      total: 100,
      itens: [],
    };
    component.itens = [{ nomeProduto: 'Banner', quantidade: 1, valorUnitario: 100, valorTotal: 100 }] as any;

    component.concluirRascunho('orcamentos');

    expect((component as any).graficaService.converterRascunhoParaOrcamento).toHaveBeenCalledWith(9);
    expect((component as any).router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial-beta', 'orcamentos', 22]);
  });

  it('cria pedido quando o primeiro item e um servico grafico', () => {
    const component = criarEditor('pedidos');
    component.tipo = 'pedidos';
    component.clienteConfirmado = { id: 7, nome: 'Lorena Bello', telefone: '31999999999', email: null } as any;
    component.itens = [{
      origem: 'GRAFICA',
      catalogoProdutoId: null,
      codigoProduto: 'SERVICO',
      nomeProduto: 'Serviço: Arte complexa',
      unidadeVenda: 'UN',
      caracteristicasResumo: 'Preço fixo',
      quantidade: 1,
      valorUnitario: 150,
      valorTotal: 150,
      snapshotComercial: JSON.stringify({
        tipo: 'SERVICO',
        servicoGraficoId: 11,
        entrada: { quantidade: 1, largura: null, altura: null, unidadeDimensao: 'METRO', selecoes: {} },
        precificacao: { status: 'PRECO_CALCULADO' },
      }),
    }] as any;

    component.salvarComo('pedidos');

    expect((component as any).graficaService.criarPedidoServico).toHaveBeenCalledWith(11, jasmine.objectContaining({
      clienteId: 7,
      precificacao: jasmine.objectContaining({ quantidade: 1 }),
    }));
    expect((component as any).router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial-beta', 'pedidos', 22]);
  });

  it('cria pedido reconhecendo snapshot legado de servico', () => {
    const component = criarEditor('pedidos');
    component.tipo = 'pedidos';
    component.clienteConfirmado = { id: 7, nome: 'Lorena Bello', telefone: '31999999999', email: null } as any;
    component.itens = [{
      origem: 'GRAFICA',
      nomeProduto: 'Serviço: Arte simples',
      quantidade: 1,
      valorUnitario: 0,
      valorTotal: 0,
      snapshotComercial: JSON.stringify({
        tipo: 'SERVICO',
        servicoId: 12,
        precificacao: { quantidade: 1, largura: null, altura: null, unidadeDimensao: 'METRO', selecoes: {} },
      }),
    }] as any;

    component.salvarComo('pedidos');

    expect((component as any).graficaService.criarPedidoServico).toHaveBeenCalledWith(12, jasmine.any(Object));
  });

  it('prioriza produto como principal quando pedido mistura servico sem preco e produto', () => {
    const component = criarEditor('pedidos');
    component.tipo = 'pedidos';
    component.clienteConfirmado = { id: 7, nome: 'Lorena Bello', telefone: '31999999999', email: null } as any;
    component.itens = [
      {
        origem: 'GRAFICA',
        catalogoProdutoId: 0,
        codigoProduto: 'LEGADO_10',
        nomeProduto: 'Serviço: Arte simples',
        unidadeVenda: 'UN',
        caracteristicasResumo: 'Criação de arte básica/rápida.',
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        snapshotComercial: JSON.stringify({
          tipo: 'SERVICO',
          servicoGraficoId: 9,
          entrada: { selecoes: {}, quantidade: 1, largura: null, altura: null, unidadeDimensao: 'METRO' },
          precificacao: null,
        }),
      },
      {
        origem: 'GRAFICA',
        catalogoProdutoId: 30,
        codigoProduto: 'BANNER_FRONT_LIGHT',
        nomeProduto: 'Banner Front Light',
        unidadeVenda: 'UNIDADE',
        caracteristicasResumo: 'Lona 440g · 0,9 × 0,9 m · 4x0 · Área faturada: 0,81 m²',
        quantidade: 1,
        valorUnitario: 95,
        valorTotal: 76.95,
        snapshotComercial: JSON.stringify({
          produtoGraficoId: 27,
          entrada: { quantidade: 1, largura: 90, altura: 90, unidadeDimensao: 'CENTIMETRO' },
          precificacao: { tipo: 'POR_METRO_QUADRADO', status: 'PRECO_CALCULADO' },
        }),
      },
    ] as any;

    component.salvarComo('pedidos');

    expect((component as any).graficaService.criarPedidoGrafico).toHaveBeenCalledWith(27, jasmine.objectContaining({
      adicionais: jasmine.arrayContaining([
        jasmine.objectContaining({ nomeProduto: 'Serviço: Arte simples', linhaComercial: true }),
      ]),
      precificacao: jasmine.objectContaining({ quantidade: 1, largura: 90 }),
    }));
    expect((component as any).graficaService.criarPedidoServico).not.toHaveBeenCalled();
  });

  it('preenche o valor com o saldo em aberto ao selecionar forma depois de um pagamento valido', () => {
    const component = criarEditor();
    component.resumoFinanceiro = resumoFinanceiro({ total: 2222.6, totalRecebido: 1515, saldoAberto: 707.6 });
    component.recebimentos = [{
      id: 1,
      empresaId: 1,
      origemTipo: 'PEDIDO',
      origemId: 4,
      valor: 1515,
      formaPagamento: 'PIX',
      status: 'CONFIRMADO',
    }];

    component.ngOnInit();
    component.pagamentoFormaControl.setValue('DINHEIRO');

    expect(component.pagamentoValorControl.value).toBe(707.6);

    component.ngOnDestroy();
  });

  it('nao sobrescreve valor ja digitado ao selecionar forma', () => {
    const component = criarEditor();
    component.resumoFinanceiro = resumoFinanceiro({ total: 2222.6, totalRecebido: 1515, saldoAberto: 707.6 });
    component.recebimentos = [{
      id: 1,
      empresaId: 1,
      origemTipo: 'PEDIDO',
      origemId: 4,
      valor: 1515,
      formaPagamento: 'PIX',
      status: 'CONFIRMADO',
    }];

    component.ngOnInit();
    component.pagamentoValorControl.setValue(100);
    component.pagamentoFormaControl.setValue('DINHEIRO');

    expect(component.pagamentoValorControl.value).toBe(100);

    component.ngOnDestroy();
  });

  it('nao cancela pagamento quando o fluxo bloqueia pagamentos', () => {
    const component = criarEditor();
    component.pedidoId = 4;
    component.fluxoPedido = fluxoBloqueado();

    component.cancelarPagamento({
      id: 10,
      empresaId: 1,
      origemTipo: 'PEDIDO',
      origemId: 4,
      valor: 707.6,
      formaPagamento: 'PIX',
      status: 'CONFIRMADO',
    }, 0);

    expect((component as any).graficaService.cancelarRecebimento).not.toHaveBeenCalled();
  });

  it('nao remove pagamento temporario quando o fluxo bloqueia pagamentos', () => {
    const component = criarEditor();
    component.pagamentosPretendidos = [{ formaPagamento: 'PIX', valor: 15 }];
    component.fluxoPedido = fluxoBloqueado();

    component.cancelarPagamento({
      id: 0,
      empresaId: 0,
      origemTipo: 'PEDIDO',
      origemId: 0,
      valor: 15,
      formaPagamento: 'PIX',
      status: 'CONFIRMADO',
      temporario: true,
    }, 0);

    expect(component.pagamentosPretendidos.length).toBe(1);
  });

  it('recalcula total e saldo com acrescimo, frete e desconto digitados', () => {
    const component = criarEditor();
    component.resumoFinanceiro = resumoFinanceiro({ total: 100, totalRecebido: 25, saldoAberto: 75 });

    component.ajustesFinanceirosForm.patchValue({ acrescimo: 10, frete: 5, desconto: 20 });

    expect(component.resumoFinanceiroView.total).toBe(95);
    expect(component.resumoFinanceiroView.saldoAberto).toBe(70);
  });

  it('salva ajustes financeiros do pedido quando o fluxo permite pagamentos', () => {
    const component = criarEditor();
    component.pedidoId = 4;
    component.fluxoPedido = fluxoAberto();
    component.resumoFinanceiro = resumoFinanceiro({ total: 100, totalRecebido: 25, saldoAberto: 75 });
    component.ajustesFinanceirosForm.patchValue({ acrescimo: 10, frete: 5, desconto: 20 });

    component.salvarAjustesFinanceiros();

    expect((component as any).graficaService.alterarAjustesFinanceirosPedido).toHaveBeenCalledWith(4, {
      acrescimo: 10,
      frete: 5,
      desconto: 20,
    });
  });

  it('abre busca rapida e repassa produto selecionado para o wizard', () => {
    const produtoSelecionado = produto();
    const composicao = { itens: [{ nomeProduto: 'Panfleto', quantidade: 1, valorUnitario: 10, valorTotal: 10 }] };
    const dialog = jasmine.createSpyObj('MatDialog', ['open']);
    dialog.open.and.callFake((component: unknown) => {
      if (component === GraficaProdutoBuscaRapidaDialogComponent) {
        return { afterClosed: () => of({ tipo: 'PRODUTO', produto: produtoSelecionado }) };
      }
      return { afterClosed: () => of(composicao) };
    });

    const component = new ComercialBetaEditorComponent(
      { data: of({ tipo: 'pedidos' }) } as any,
      jasmine.createSpyObj('Router', ['navigate']) as any,
      dialog,
      new FormBuilder(),
      {} as any,
      {} as any,
      jasmine.createSpyObj('ToastrService', ['error']) as any,
      authServiceMock() as any,
    );

    component.abrirBuscaRapida();

    expect(dialog.open).toHaveBeenCalledWith(GraficaProdutoBuscaRapidaDialogComponent, jasmine.any(Object));
    expect(dialog.open).toHaveBeenCalledWith(GraficaProdutoWizardDialogComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({ produtoPreSelecionado: produtoSelecionado }),
    }));
    expect(component.itens.length).toBe(1);
  });
});

function criarEditor(tipo = 'pedidos'): ComercialBetaEditorComponent {
  const graficaService = jasmine.createSpyObj('GraficaProdutoService', [
    'listarFormasPagamento',
    'cancelarRecebimento',
    'alterarAjustesFinanceirosPedido',
    'buscarResumoFinanceiroPedido',
    'listarRecebimentosPedido',
    'buscarFluxoPedidoComercial',
    'converterRascunhoParaPedido',
    'converterRascunhoParaOrcamento',
    'criarPedidoServico',
    'criarPedidoGrafico',
  ]);
  graficaService.listarFormasPagamento.and.returnValue(of([]));
  graficaService.cancelarRecebimento.and.returnValue(of({}));
  graficaService.alterarAjustesFinanceirosPedido.and.returnValue(of(pedidoDetalhe()));
  graficaService.buscarResumoFinanceiroPedido.and.returnValue(of(resumoFinanceiro({ total: 100, totalRecebido: 25, saldoAberto: 75 })));
  graficaService.listarRecebimentosPedido.and.returnValue(of({ content: [] }));
  graficaService.buscarFluxoPedidoComercial.and.returnValue(of(fluxoAberto()));
  graficaService.converterRascunhoParaPedido.and.returnValue(of({ tipo: 'PEDIDO', id: 22 }));
  graficaService.converterRascunhoParaOrcamento.and.returnValue(of({ tipo: 'ORCAMENTO', id: 22 }));
  graficaService.criarPedidoServico.and.returnValue(of({ tipo: 'PEDIDO', id: 22 }));
  graficaService.criarPedidoGrafico.and.returnValue(of({ tipo: 'PEDIDO', id: 22 }));
  const clienteService = jasmine.createSpyObj('ClienteService', ['buscarPorId', 'buscarPorNome']);
  clienteService.buscarPorId.and.returnValue(of({
    clienteId: 7,
    nome: 'Pedro de Lara',
    email: 'leo@leo.com',
    telefone: '31987531233',
    documento: null,
    enderecoPrincipal: {
      logradouro: 'Rua A',
      numero: '10',
      bairro: 'Centro',
      cidade: 'Belo Horizonte',
      estado: 'MG',
      cep: '30110-000',
    },
  }));
  clienteService.buscarPorNome.and.returnValue(of({ content: [] }));
  return new ComercialBetaEditorComponent(
    { data: of({ tipo }), paramMap: of(new Map()) } as any,
    jasmine.createSpyObj('Router', ['navigate']) as any,
    jasmine.createSpyObj('MatDialog', ['open']) as any,
    new FormBuilder(),
    graficaService,
    clienteService,
    jasmine.createSpyObj('ToastrService', ['error']) as any,
    authServiceMock() as any,
  );
}

function authServiceMock() {
  return {
    getUsuario: () => ({ id: 1, nome: 'Leonardo Barros', username: 'leo' }),
  };
}

function fluxoAberto() {
  return {
    statusAtual: 'PENDENTE',
    descricao: 'Pendente',
    proximasTransicoes: [],
    fluxo: [],
    permissoes: {
      editarCliente: true,
      editarItens: true,
      observacoes: true,
      pagamentos: true,
      alterarStatus: true,
    },
  } as any;
}

function fluxoBloqueado() {
  return {
    statusAtual: 'ENTREGUE',
    descricao: 'Entregue',
    proximasTransicoes: [],
    fluxo: [],
    permissoes: {
      editarCliente: false,
      editarItens: false,
      observacoes: false,
      pagamentos: false,
      alterarStatus: false,
    },
  } as any;
}

function pedidoDetalhe(overrides: { desconto?: number; acrescimo?: number; frete?: number } = {}) {
  return {
    id: 4,
    empresaId: 1,
    numero: 'PED-4',
    status: 'PENDENTE',
    clienteNome: 'Cliente',
    subtotal: 100,
    desconto: overrides.desconto ?? 20,
    acrescimo: overrides.acrescimo ?? 10,
    frete: overrides.frete ?? 5,
    total: 95,
    itens: [],
  } as any;
}

function resumoFinanceiro(overrides: { total: number; totalRecebido: number; saldoAberto: number }) {
  return {
    empresaId: 1,
    origemTipo: 'PEDIDO',
    origemId: 4,
    subtotal: overrides.total,
    desconto: 0,
    acrescimo: 0,
    frete: 0,
    total: overrides.total,
    totalRecebido: overrides.totalRecebido,
    saldoAberto: overrides.saldoAberto,
    percentualPago: (overrides.totalRecebido / overrides.total) * 100,
    quitado: overrides.saldoAberto === 0,
  };
}

describe('GraficaProdutoWizardDialogComponent', () => {
  it('produto pre selecionado avanca para etapa de preco', fakeAsync(() => {
    const graficaService = jasmine.createSpyObj('GraficaProdutoService', ['listar', 'detalhar', 'listarPrecos', 'listarServicos']);
    graficaService.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true }));
    graficaService.detalhar.and.returnValue(of(produto()));
    graficaService.listarPrecos.and.returnValue(of([]));
    graficaService.listarServicos.and.returnValue(of([]));
    const component = new GraficaProdutoWizardDialogComponent(
      new FormBuilder(),
      graficaService,
      jasmine.createSpyObj('MatDialogRef', ['close']) as any,
      jasmine.createSpyObj('ToastrService', ['error']) as any,
      { produtoPreSelecionado: produto(), cliente: null },
    );
    component.stepper = { selectedIndex: 0 } as any;

    component.ngOnInit();
    tick(0);

    expect(graficaService.detalhar).toHaveBeenCalledWith(11);
    expect(component.produtoForm.value.produtoGraficoId).toBe(11);
    expect(component.stepper?.selectedIndex).toBe(1);
  }));

  it('agrupa produto, material, formato e cor no funil progressivo', () => {
    const component = criarWizard();
    component.produtosFunil = [
      produto({ id: 11, nome: 'Panfleto', materialId: 1, materialNome: 'Apergaminhado 180g', formatoId: 2, formatoNome: '10x15', corId: 3, corNome: '1x0' }),
      produto({ id: 12, nome: 'Panfleto', materialId: 1, materialNome: 'Apergaminhado 180g', formatoId: 4, formatoNome: '15x21', corId: 5, corNome: '1x1' }),
      produto({ id: 13, nome: 'Cartão de Visitas', materialId: 6, materialNome: 'Couchê 250g', formatoId: 7, formatoNome: '9x5', corId: 8, corNome: '4x4' }),
    ];

    expect(component.opcoesFunil('produto').map((item) => item.label)).toEqual(['Cartão de Visitas', 'Panfleto']);

    component.selecionarProdutoFunil({ key: 'panfleto', label: 'Panfleto' });
    expect(component.opcoesFunil('material').map((item) => item.label)).toEqual(['Apergaminhado 180g']);

    component.selecionarMaterialFunil({ key: '1', label: 'Apergaminhado 180g' });
    expect(component.opcoesFunil('formato').map((item) => item.label)).toEqual(['10x15', '15x21']);

    component.selecionarFormatoFunil({ key: '2', label: '10x15' });
    expect(component.opcoesFunil('cor').map((item) => item.label)).toEqual(['1x0']);
  });

  it('exibe servicos junto com produtos na coluna inicial', () => {
    const component = criarWizard();
    component.produtosFunil = [
      produto({ id: 11, nome: 'Panfleto' }),
    ];
    component.servicosFunil = [
      servico({ id: 22, nome: 'Instalação' }),
    ];

    const opcoes = component.opcoesFunil('produto');

    expect(opcoes.map((item) => item.label)).toEqual(['Instalação', 'Panfleto']);
    expect(opcoes[0].servico?.id).toBe(22);
  });

  it('servico sem preco pula direto para revisao', fakeAsync(() => {
    const component = criarWizard();
    component.stepper = stepperMock(0) as any;

    component.selecionarServicoFunil(servico({ id: 22, nome: 'Instalação' }));
    tick(0);

    expect(component.stepper?.selectedIndex).toBe(3);
    expect(component.composicao?.itens[0].nomeProduto).toBe('Serviço: Instalação');
    expect(component.composicao?.itens[0].valorTotal).toBe(0);
  }));

  it('servico com preco resolve composicao e pula acabamentos ao avancar', fakeAsync(() => {
    const component = criarWizard();
    const graficaService = (component as any).graficaService;
    component.stepper = stepperMock(0) as any;
    graficaService.resolverComposicaoServico.and.returnValue(of(composicaoServico()));

    component.selecionarServicoFunil(servicoComPreco({ id: 22, nome: 'Instalação' }));
    tick(0);
    component.preco = precoServicoCalculado();
    component.avancarStep();
    tick(0);

    expect(graficaService.resolverComposicaoServico).toHaveBeenCalledWith(22, jasmine.objectContaining({
      precificacao: jasmine.objectContaining({ quantidade: 1 }),
    }));
    expect(component.stepper?.selectedIndex).toBe(3);
    expect(component.composicao?.itens[0].nomeProduto).toBe('Serviço: Instalação');
  }));

  it('pagina colunas e resolve produto final ao selecionar cor', () => {
    const component = criarWizard();
    const produtos = Array.from({ length: 8 }, (_, index) => produto({
      id: index + 1,
      nome: `Produto ${index + 1}`,
      materialId: 1,
      materialNome: 'Apergaminhado 180g',
      formatoId: 2,
      formatoNome: '10x15',
      corId: 3,
      corNome: '1x0',
    }));
    component.produtosFunil = produtos;
    spyOn(component, 'selecionarProduto');

    expect(component.totalPaginasFunil('produto')).toBe(2);
    expect(component.opcoesPaginadas('produto').length).toBe(6);
    component.proximaPaginaFunil('produto');
    expect(component.paginaAtualFunil('produto')).toBe(2);

    component.selecionarProdutoFunil({ key: 'produto-1', label: 'Produto 1' });
    component.selecionarMaterialFunil({ key: '1', label: 'Apergaminhado 180g' });
    component.selecionarFormatoFunil({ key: '2', label: '10x15' });
    component.selecionarCorFunil({ key: '3', label: '1x0', produto: produtos[0] });

    expect(component.corSelecionadaId).toBe(3);
    expect(component.selecionarProduto).toHaveBeenCalledWith(produtos[0], true, true);
  });
});

function criarWizard(): GraficaProdutoWizardDialogComponent {
  const graficaService = jasmine.createSpyObj('GraficaProdutoService', [
    'listar',
    'detalhar',
    'listarPrecos',
    'listarServicos',
    'resolverComposicaoServico',
    'resolverComposicaoComercial',
  ]);
  graficaService.listar.and.returnValue(of({ content: [], pageNumber: 0, pageSize: 20, totalElements: 0, totalPages: 0, last: true }));
  graficaService.detalhar.and.returnValue(of(produto()));
  graficaService.listarPrecos.and.returnValue(of([]));
  graficaService.listarServicos.and.returnValue(of([]));
  graficaService.resolverComposicaoServico.and.returnValue(of(composicaoServico()));
  graficaService.resolverComposicaoComercial.and.returnValue(of(composicaoServico()));
  return new GraficaProdutoWizardDialogComponent(
    new FormBuilder(),
    graficaService,
    jasmine.createSpyObj('MatDialogRef', ['close']) as any,
    jasmine.createSpyObj('ToastrService', ['error']) as any,
    { cliente: null },
  );
}

function stepperMock(selectedIndex = 0) {
  return {
    selectedIndex,
    steps: {
      get: () => ({ completed: false, interacted: false }),
      forEach: () => undefined,
    },
  };
}

function produto(overrides: {
  id?: number;
  nome?: string;
  materialId?: number;
  materialNome?: string;
  formatoId?: number;
  formatoNome?: string;
  corId?: number;
  corNome?: string;
} = {}) {
  return {
    id: overrides.id ?? 11,
    catalogoProdutoId: 123,
    catalogoProdutoCodigo: 'PAN-001',
    catalogoProdutoNome: overrides.nome ?? 'Panfleto',
    catalogoProdutoDescricao: 'Produto gráfico',
    ativo: true,
    material: { id: overrides.materialId ?? 1, codigo: 'APERGAMINHADO', nome: overrides.materialNome ?? 'Apergaminhado 180g', ativo: true },
    formato: { id: overrides.formatoId ?? 2, codigo: '10X15', nome: overrides.formatoNome ?? '10x15', ativo: true },
    cor: { id: overrides.corId ?? 3, codigo: '4X4', nome: overrides.corNome ?? '4x4', ativo: true },
    acabamentos: [],
    parametros: [],
  };
}

function servico(overrides: { id?: number; nome?: string } = {}) {
  return {
    id: overrides.id ?? 22,
    codigo: 'SERVICO',
    nome: overrides.nome ?? 'Instalação',
    descricao: 'Serviço gráfico',
    ativo: true,
    politicas: [],
  };
}

function servicoComPreco(overrides: { id?: number; nome?: string } = {}) {
  return {
    ...servico(overrides),
    politicas: [{
      id: 40,
      nome: 'Preço do serviço',
      tipo: 'FIXO',
      ativo: true,
      multiplicaQuantidade: true,
      valorFixo: 150,
      faixas: [],
      lotes: [],
      selecoes: [],
      especificidade: 0,
    }],
  } as any;
}

function precoServicoCalculado() {
  return {
    status: 'PRECO_CALCULADO',
    mensagem: 'Preço calculado.',
    produtoGraficoId: null,
    catalogoProdutoId: null,
    selecoesResolvidas: [],
    tipoPrecificacao: 'FIXO',
    quantidadeSolicitada: 1,
    valorUnitario: 150,
    valorTotal: 150,
    largura: null,
    altura: null,
    unidadeDimensao: 'METRO',
    areaReal: null,
    areaFaturada: null,
    regraAplicadaId: 40,
    regraAplicadaNome: 'Preço do serviço',
    detalhes: [],
  } as any;
}

function composicaoServico() {
  return {
    clienteNome: null,
    clienteTelefone: null,
    observacaoCliente: null,
    origem: 'GRAFICA',
    referenciaOrigem: '22',
    desconto: 0,
    acrescimo: 0,
    frete: 0,
    itens: [{
      origem: 'GRAFICA',
      catalogoProdutoId: null,
      codigoProduto: 'SERVICO',
      nomeProduto: 'Serviço: Instalação',
      unidadeVenda: 'UN',
      caracteristicasResumo: 'Serviço gráfico',
      quantidade: 1,
      valorUnitario: 150,
      desconto: 0,
      acrescimo: 0,
      valorTotal: 150,
      observacao: null,
      ordem: 0,
    }],
  } as any;
}
