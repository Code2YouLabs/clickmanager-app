export interface PedidoPrazoParametros { prazo: number; unidade: 'HORAS' | 'DIAS'; atencaoHoras: number; atrasoCriticoHoras: number; }
export type PedidoPrevisaoDefinicao = { modo: 'AUTOMATICA'; parametros: PedidoPrazoParametros } | { modo: 'EXPLICITA'; dataHora: string } | { modo: 'SEM_PREVISAO' };
export type PedidoPrazoSituacao = 'DENTRO_DO_PRAZO' | 'PROXIMO_DO_PRAZO' | 'ATRASADO' | 'ATRASO_CRITICO' | 'PRODUCAO_CONCLUIDA' | 'SEM_PREVISAO' | 'CANCELADO';
export interface PedidoPrazo { criadoEmUtc?: string | null; previsaoEntrega: string | null; producaoConcluidaEm: string | null; parametros: PedidoPrazoParametros | null; versao: number; revisao: number; producaoConcluida: boolean; acompanhamentoAtivo: boolean; situacao: PedidoPrazoSituacao; referenciaEm: string; proximaMudancaEm: string | null; }
export const PEDIDO_PRAZO_FILTROS = [
  {value: 'DENTRO_DO_PRAZO', label: 'Dentro do prazo'}, {value: 'PROXIMO_DO_PRAZO', label: 'Próximo do prazo'},
  {value: 'ATRASADO', label: 'Atrasado (inclui críticos)'}, {value: 'ATRASO_CRITICO', label: 'Atraso crítico'},
  {value: 'PRODUCAO_CONCLUIDA', label: 'Produção concluída'}, {value: 'SEM_PREVISAO', label: 'Sem previsão'}
];
