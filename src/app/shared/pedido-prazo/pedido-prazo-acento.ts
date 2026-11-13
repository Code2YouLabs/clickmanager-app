import { PedidoPrazo, PedidoPrazoSituacao } from 'src/app/models/pedido/pedido-prazo.model';

// Tons de borda: acompanham a situação recebida, sem recalcular o prazo no navegador.
const ACENTOS: Record<PedidoPrazoSituacao, string | null> = {
  DENTRO_DO_PRAZO: '#349266',
  PROXIMO_DO_PRAZO: '#d49a27',
  ATRASADO: '#cf6658',
  ATRASO_CRITICO: '#b32324',
  PRODUCAO_CONCLUIDA: '#4285bc',
  SEM_PREVISAO: null,
  CANCELADO: null,
};

export function acentoSituacaoPrazo(situacao: PedidoPrazoSituacao): string | null { return ACENTOS[situacao]; }

export function acentoPrazo(prazo?: PedidoPrazo | null): string | null {
  return prazo?.situacao ? ACENTOS[prazo.situacao] ?? null : null;
}
