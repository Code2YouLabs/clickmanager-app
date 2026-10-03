export type PedidoKanbanStatus =
  | 'AGUARDANDO_PAGAMENTO'
  | 'PENDENTE'
  | 'EM_PRODUCAO'
  | 'PRONTO'
  | 'ENTREGUE'
  | 'CANCELADO';

export interface PedidoStatusMetadata {
  status: PedidoKanbanStatus;
  label: string;
  tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'neutral';
}

export const PEDIDO_STATUS_METADATA: PedidoStatusMetadata[] = [
  { status: 'AGUARDANDO_PAGAMENTO', label: 'Aguardando pagamento', tone: 'warning' },
  { status: 'PENDENTE', label: 'Pendente', tone: 'primary' },
  { status: 'EM_PRODUCAO', label: 'Em produção', tone: 'secondary' },
  { status: 'PRONTO', label: 'Pronto', tone: 'success' },
  { status: 'ENTREGUE', label: 'Entregue', tone: 'success' },
  { status: 'CANCELADO', label: 'Cancelado', tone: 'danger' },
];

export function pedidoStatusMetadata(status: string | null | undefined): PedidoStatusMetadata | null {
  return PEDIDO_STATUS_METADATA.find((item) => item.status === status) || null;
}

export function pedidoStatusLabel(status: string | null | undefined): string {
  const metadata = pedidoStatusMetadata(status);
  if (metadata) return metadata.label;
  if (!status) return '-';

  const normalized = status.replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, c => c.toUpperCase());
}
