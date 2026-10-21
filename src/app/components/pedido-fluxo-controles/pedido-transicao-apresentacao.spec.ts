import { classificarTransicaoPedido } from './pedido-transicao-apresentacao';

describe('Apresentação compartilhada das transições de pedido', () => {
  it('classifica os identificadores operacionais reais, incluindo o destino Entregue', () => {
    for (const status of ['AGUARDANDO_PAGAMENTO', 'PENDENTE', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE']) {
      expect(classificarTransicaoPedido(status)).toBe('operacional');
    }
  });

  it('classifica cancelamento pelo identificador, sem consultar label ou permissões', () => {
    const transicoes = Object.freeze([
      Object.freeze({ status: 'PENDENTE', label: 'Cancelado', bloqueado: true }),
      Object.freeze({ status: 'CANCELADO', label: 'Continuar', bloqueado: false }),
    ]);
    expect(transicoes.map(opcao => classificarTransicaoPedido(opcao.status))).toEqual(['operacional', 'cancelamento']);
    expect(transicoes[0].bloqueado).toBeTrue(); expect(transicoes[1].label).toBe('Continuar');
  });

  it('reserva apresentação excepcional para identificadores desconhecidos sem inventar transições', () => {
    expect(classificarTransicaoPedido('')).toBe('excepcional');
    expect(classificarTransicaoPedido('DESCONHECIDO')).toBe('excepcional');
    expect(classificarTransicaoPedido('Cancelado')).toBe('excepcional');
    expect([].map(classificarTransicaoPedido)).toEqual([]);
  });
});
