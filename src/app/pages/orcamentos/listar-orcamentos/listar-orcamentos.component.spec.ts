import { of } from 'rxjs';
import { ListarOrcamentosComponent } from './listar-orcamentos.component';

describe('ListarOrcamentosComponent', () => {
  function criarComponente(permissoes: string[] = [], orcamentoService?: any): ListarOrcamentosComponent {
    return new ListarOrcamentosComponent(
      orcamentoService || {
        listar: jasmine.createSpy('listar').and.returnValue(of({ content: [], totalElements: 0 })),
        detalhar: jasmine.createSpy('detalhar').and.returnValue(of({ id: 1 })),
      } as any,
      { buscarResumo: jasmine.createSpy('buscarResumo').and.returnValue(of(null)) } as any,
      { temPermissao: (permissao: string) => permissoes.includes(permissao) } as any,
      { open: jasmine.createSpy('open') } as any,
      { error: jasmine.createSpy('error'), success: jasmine.createSpy('success'), info: jasmine.createSpy('info') } as any,
      { manualAtivo: true, preparar: () => {}, abrir: (_endpoint: string, _numero: string, _texto: string, legado: () => void) => legado() } as any,
    );
  }

  it('exibe botão de criação somente com ORCAMENTOS_CRIAR', () => {
    expect(criarComponente(['ORCAMENTOS_CRIAR']).podeCriar).toBeTrue();
    expect(criarComponente([]).podeCriar).toBeFalse();
  });

  it('protege ações com ORCAMENTOS_EDITAR e ORCAMENTOS_CANCELAR', () => {
    const component = criarComponente(['ORCAMENTOS_EDITAR', 'ORCAMENTOS_CANCELAR']);

    expect(component.podeEditar).toBeTrue();
    expect(component.podeCancelar).toBeTrue();
  });

  it('exibe origem BALCAO como Balcão', () => {
    const component = criarComponente();

    expect(component.origemLabel('BALCAO')).toBe('Balcão');
    expect(component.origemLabel('SITE')).toBe('Site');
    expect(component.origemLabel('INTEGRACAO')).toBe('Integração');
  });

  it('carrega o orçamento completo e abre o WhatsApp com a mensagem', () => {
    const detalhe = {
      id: 10,
      protocolo: 'SL-20260724-000010',
      nomeContato: 'Maria',
      telefoneContato: '(11) 99999-9999',
      total: 100,
      itens: [{ id: 1, descricao: 'Produto teste', quantidade: 2, valorUnitario: 50, subtotal: 100 }],
    };
    const orcamentoService = {
      detalhar: jasmine.createSpy('detalhar').and.returnValue(of(detalhe)),
    };
    const popup = {
      opener: window,
      location: { href: '' },
      close: jasmine.createSpy('close'),
    };
    const windowOpen = spyOn(window, 'open').and.returnValue(popup as unknown as Window);
    const component = criarComponente([], orcamentoService);

    component.abrirWhatsApp({
      id: 10,
      telefoneCliente: '(11) 99999-9999',
    });

    expect(windowOpen).toHaveBeenCalledWith('about:blank', '_blank');
    expect(orcamentoService.detalhar).toHaveBeenCalledWith(10);
    expect(popup.opener).toBeNull();
    expect(popup.location.href).toContain('https://wa.me/5511999999999?text=');
    expect(decodeURIComponent(popup.location.href)).toContain('1. *Produto teste*');
  });

  it('prioriza os campos de contato no resumo do orçamento', () => {
    const component = criarComponente();
    const orcamento = {
      id: 1,
      nomeContato: 'Contato',
      nomeCliente: 'Cliente',
      telefoneContato: '11999999999',
      telefoneCliente: '11888888888',
      emailContato: 'contato@empresa.com',
      emailCliente: 'cliente@empresa.com',
    };

    expect(component.clienteLabel(orcamento)).toBe('Contato');
    expect(component.telefoneOrcamento(orcamento)).toBe('11999999999');
    expect(component.emailOrcamento(orcamento)).toBe('contato@empresa.com');
  });
});
