import { ConfirmDialogData } from '../dialog/confirm-dialog/confirm-dialog.models';

/** Order-specific wording stays outside the global confirmation foundation. */
export function confirmacaoCancelamentoPedido(referencia?: string | null, statusAtual?: string | null): ConfirmDialogData {
  return {
    type: 'destructive', title: 'Cancelar pedido?',
    message: referencia ? `Deseja realmente cancelar o Pedido ${referencia}?` : 'Deseja realmente cancelar este pedido?',
    cancelText: 'Voltar', confirmText: 'Cancelar pedido', confirmColor: 'warn',
    details: [
      ...(referencia ? [{ label: 'Pedido', value: referencia }] : []),
      ...(statusAtual ? [{ label: 'Status atual', value: statusAtual }] : []),
    ],
  };
}
