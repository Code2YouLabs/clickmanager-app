export type ComercialTipo = 'rascunhos' | 'orcamentos' | 'pedidos';

/** Presentation only: entity transitions and financial rules remain in the editor/services. */
export const COMERCIAL_LISTA = {
  pedidos: {
    titulo: 'Pedidos', subtitulo: 'Operações comerciais confirmadas da gráfica.', novo: 'Novo pedido',
    status: ['AGUARDANDO_PAGAMENTO', 'PENDENTE', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO'],
  },
  orcamentos: {
    titulo: 'Orçamentos', subtitulo: 'Propostas comerciais da gráfica.', novo: 'Novo orçamento',
    status: ['ABERTO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'CANCELADO', 'VENCIDO'],
  },
  rascunhos: {
    titulo: 'Rascunhos', subtitulo: 'Atendimentos em composição antes da confirmação.', novo: 'Novo rascunho',
    status: ['ABERTO', 'CONVERTIDO', 'DESCARTADO'],
  },
} satisfies Record<ComercialTipo, { titulo: string; subtitulo: string; novo: string; status: string[] }>;
