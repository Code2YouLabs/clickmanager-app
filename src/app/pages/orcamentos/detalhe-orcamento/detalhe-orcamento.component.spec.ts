import { of } from 'rxjs';
import { DetalheOrcamentoComponent } from './detalhe-orcamento.component';

describe('DetalheOrcamentoComponent', () => {
  function criarComponente(permissoes: string[] = [], orcamentoService?: any): DetalheOrcamentoComponent {
    return new DetalheOrcamentoComponent(
      { snapshot: { paramMap: { get: () => '1' } } } as any,
      { navigate: jasmine.createSpy('navigate') } as any,
      orcamentoService || {
        detalhar: jasmine.createSpy('detalhar').and.returnValue(of({ id: 1 })),
        atualizarContato: jasmine.createSpy('atualizarContato').and.returnValue(of({ id: 1 })),
        cancelar: jasmine.createSpy('cancelar').and.returnValue(of({ id: 1 })),
        alterarStatus: jasmine.createSpy('alterarStatus').and.returnValue(of({ id: 1 })),
        abrirImpressao: jasmine.createSpy('abrirImpressao').and.returnValue(of({ body: new Blob() })),
        baixarImpressao: jasmine.createSpy('baixarImpressao').and.returnValue(of({ body: new Blob(), headers: { get: () => null } })),
      } as any,
      { listar: jasmine.createSpy('listar').and.returnValue(of({ content: [] })) } as any,
      {
        buscarPorCatalogo: jasmine.createSpy('buscarPorCatalogo').and.returnValue(of({ id: 1, ativo: true, parametros: [] })),
        precificar: jasmine.createSpy('precificar').and.returnValue(of({ status: 'PRECO_CALCULADO', valorTotal: 100 })),
        adicionarAoOrcamento: jasmine.createSpy('adicionarAoOrcamento').and.returnValue(of({})),
      } as any,
      { temPermissao: (permissao: string) => permissoes.includes(permissao) } as any,
      { carregar: jasmine.createSpy('carregar').and.returnValue(of({ CLIENTES: true })) } as any,
      { open: jasmine.createSpy('open') } as any,
      { error: jasmine.createSpy('error'), success: jasmine.createSpy('success'), warning: jasmine.createSpy('warning'), info: jasmine.createSpy('info') } as any,
    );
  }

  it('condiciona edição a ORCAMENTOS_EDITAR', () => {
    expect(criarComponente(['ORCAMENTOS_EDITAR']).podeEditar).toBeTrue();
    expect(criarComponente([]).podeEditar).toBeFalse();
  });

  it('condiciona cancelamento a ORCAMENTOS_CANCELAR', () => {
    expect(criarComponente(['ORCAMENTOS_CANCELAR']).podeCancelar).toBeTrue();
    expect(criarComponente([]).podeCancelar).toBeFalse();
  });

  it('condiciona impressão a ORCAMENTOS_IMPRIMIR', () => {
    expect(criarComponente(['ORCAMENTOS_IMPRIMIR']).podeImprimir).toBeTrue();
    expect(criarComponente(['ORCAMENTOS_VER']).podeImprimir).toBeFalse();
  });

  it('exibe ação de cadastrar contato como cliente somente com módulo e permissões', () => {
    const component = criarComponente(['CLIENTE_CADASTRAR', 'ORCAMENTOS_EDITAR']);
    component.clientesDisponivel = true;
    component.orcamento = { id: 1, status: 'NOVO', nomeContato: 'Carlos', telefoneContato: '11999999999', clienteId: null };

    expect(component.podeCadastrarContatoComoCliente).toBeTrue();

    component.orcamento.clienteId = 9;
    expect(component.podeCadastrarContatoComoCliente).toBeFalse();
  });

  it('não executa impressão sem ORCAMENTOS_IMPRIMIR', () => {
    const orcamentoService = {
      detalhar: jasmine.createSpy('detalhar').and.returnValue(of({ id: 1 })),
      abrirImpressao: jasmine.createSpy('abrirImpressao').and.returnValue(of({ body: new Blob() })),
    };
    const component = criarComponente(['ORCAMENTOS_VER'], orcamentoService);
    component.orcamento = { id: 1 };

    component.imprimirA4();

    expect(orcamentoService.abrirImpressao).not.toHaveBeenCalled();
  });

  it('exibe itens livres no detalhe', () => {
    const component = criarComponente();
    const item = {
      id: 1,
      tipoItem: 'LIVRE',
      descricao: 'Instalação avulsa',
      unidade: 'UNIDADE',
      quantidade: 1,
      valorUnitario: 100,
      subtotal: 100,
    };

    expect(component.itemTipoLabel(item)).toBe('Item livre');
    expect(component.itemDescricao(item)).toBe('Instalação avulsa');
    expect(component.itemSubtotal(item)).toBe(100);
  });

  it('abre o WhatsApp com o texto completo do orçamento', () => {
    const component = criarComponente();
    component.orcamento = {
      id: 10,
      protocolo: 'SL-20260724-000010',
      nomeContato: 'Maria',
      telefoneContato: '(11) 99999-9999',
      total: 100,
      itens: [{ id: 1, descricao: 'Produto teste', quantidade: 2, valorUnitario: 50, subtotal: 100 }],
    };
    const windowOpen = spyOn(window, 'open');

    component.abrirWhatsApp();

    const url = windowOpen.calls.mostRecent().args[0] as string;
    expect(url).toContain('https://wa.me/5511999999999?text=');
    expect(decodeURIComponent(url)).toContain('orçamento *SL-20260724-000010*');
    expect(decodeURIComponent(url)).toContain('1. *Produto teste*');
  });
});
