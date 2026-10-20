import { ConfirmDialogData } from '../dialog/confirm-dialog/confirm-dialog.models';

/** Presentation adapter only; transition eligibility remains in the order flow. */
export function confirmacaoAlteracaoStatusPedido(statusAtual: string, novoStatus: string): ConfirmDialogData {
  return {
    type: 'default', title: 'Alterar status do pedido?', message: 'Confirme a alteração antes de continuar.',
    cancelText: 'Voltar', confirmText: 'Confirmar alteração', confirmColor: 'primary',
    details: [{ label: 'Status atual', value: statusAtual }, { label: 'Novo status', value: novoStatus, emphasis: true }],
  };
}
