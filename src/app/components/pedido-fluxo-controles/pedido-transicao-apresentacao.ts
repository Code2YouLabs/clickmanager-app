export type PedidoTransicaoApresentacao = 'operacional' | 'cancelamento' | 'excepcional';

// Identifiers from PedidoStatus. This classifies presentation, never allowed transitions.
const STATUS_OPERACIONAIS = new Set(['AGUARDANDO_PAGAMENTO', 'PENDENTE', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE']);

export function classificarTransicaoPedido(status: string): PedidoTransicaoApresentacao {
  if (status === 'CANCELADO') return 'cancelamento';
  return STATUS_OPERACIONAIS.has(status) ? 'operacional' : 'excepcional';
}
