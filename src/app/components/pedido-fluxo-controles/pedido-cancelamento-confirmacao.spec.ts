import { confirmacaoCancelamentoPedido } from './pedido-cancelamento-confirmacao';
import { PedidoTrocarStatusDialogComponent } from './pedido-trocar-status-dialog.component';

describe('Linguagem e encaminhamento do cancelamento de pedidos', () => {
  it('usa referência e status reais no contrato global destrutivo, sem consequências inventadas', () => {
    expect(confirmacaoCancelamentoPedido('PED-2026-000033', 'Aguardando pagamento')).toEqual({
      title: 'Cancelar pedido?', message: 'Deseja realmente cancelar o Pedido PED-2026-000033?',
      cancelText: 'Voltar', confirmText: 'Cancelar pedido', type: 'destructive', confirmColor: 'warn',
      details: [{ label: 'Pedido', value: 'PED-2026-000033' }, { label: 'Status atual', value: 'Aguardando pagamento' }],
    });
    expect(confirmacaoCancelamentoPedido().details).toEqual([]);
    expect(confirmacaoCancelamentoPedido().message).toBe('Deseja realmente cancelar este pedido?');
  });

  it('sai da seleção de status ao escolher cancelar para que o consumidor abra a confirmação destrutiva', () => {
    const ref = { close: jasmine.createSpy() };
    const dialog = new PedidoTrocarStatusDialogComponent(ref as any, {
      statusAtual: 'AGUARDANDO_PAGAMENTO', cancelamentoSeparado: true,
      opcoes: [{ status: 'CANCELADO', label: 'Cancelado' }, { status: 'PENDENTE', label: 'Pendente' }],
    });
    expect(dialog.control.value).toBe('PENDENTE'); expect(dialog.encaminharCancelamento()).toBeFalse();
    dialog.control.setValue('CANCELADO'); expect(dialog.encaminharCancelamento()).toBeTrue();
    expect(ref.close).toHaveBeenCalledOnceWith({ status: 'CANCELADO' });
  });
});
