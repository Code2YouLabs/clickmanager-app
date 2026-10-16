export type ComercialTipo = 'rascunhos' | 'orcamentos' | 'pedidos';

/** Presentation only: entity transitions and financial rules remain in the editor/services. */
export const COMERCIAL_LISTA = {
  pedidos: {
    titulo: 'Pedidos', subtitulo: 'Operações comerciais confirmadas da gráfica.', novo: 'Novo pedido',
    singular: 'pedido', plural: 'pedidos', emptyIcon: 'assignment',
    status: ['AGUARDANDO_PAGAMENTO', 'PENDENTE', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'CANCELADO'],
  },
  orcamentos: {
    titulo: 'Orçamentos', subtitulo: 'Propostas comerciais da gráfica.', novo: 'Novo orçamento',
    singular: 'orçamento', plural: 'orçamentos', emptyIcon: 'description',
    status: ['ABERTO', 'ENVIADO', 'APROVADO', 'RECUSADO', 'CANCELADO', 'VENCIDO'],
  },
  rascunhos: {
    titulo: 'Rascunhos', subtitulo: 'Atendimentos em composição antes da confirmação.', novo: 'Novo rascunho',
    singular: 'rascunho', plural: 'rascunhos', emptyIcon: 'edit_note',
    status: ['ABERTO', 'CONVERTIDO', 'DESCARTADO'],
  },
} satisfies Record<ComercialTipo, { titulo: string; subtitulo: string; novo: string; singular: string; plural: string; emptyIcon: string; status: string[] }>;
