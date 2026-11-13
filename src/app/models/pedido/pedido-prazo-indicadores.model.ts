import { PedidoPrazo } from './pedido-prazo.model';

export interface PedidoPrazoPrioridade { id: number; numero: string; clienteNome: string; prazo: PedidoPrazo; }
export interface PedidoPrazoIndicadores {
  pedidosAbertos: number;
  dentroDoPrazo: number;
  proximosDoPrazo: number;
  atrasados: number;
  atrasosCriticos: number;
  semPrevisao: number;
  prioridades: PedidoPrazoPrioridade[];
  referenciaEm: string;
  proximaMudancaEm: string | null;
}
