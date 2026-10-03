import { OrcamentoComercialDetalhe, PedidoComercialDetalhe } from '../shared/grafica.models';
import { montarMensagemOrcamentoComercialWhatsApp, montarMensagemPedidoComercialWhatsApp } from './pedido-comercial-whatsapp.util';

describe('pedido-comercial-whatsapp.util', () => {
  it('deve incluir o responsável na mensagem do pedido', () => {
    const pedido: PedidoComercialDetalhe = {
      id: 15,
      numero: 'PED-2026-000015',
      status: 'PENDENTE',
      clienteNome: 'Cliente Teste',
      clienteTelefone: '(31) 99999-9999',
      responsavelNome: 'Leonardo Barros',
      subtotal: 100,
      acrescimo: 0,
      frete: 0,
      desconto: 0,
      total: 100,
      itens: [],
    };

    const mensagem = montarMensagemPedidoComercialWhatsApp(pedido, false);

    expect(mensagem).toContain('*Responsável:* Leonardo Barros');
  });

  it('deve incluir o resumo comercial na mensagem do orçamento', () => {
    const orcamento: OrcamentoComercialDetalhe = {
      id: 14,
      protocolo: 'ORC-2026-000014',
      status: 'ABERTO',
      nomeCliente: 'Cliente Teste',
      telefoneCliente: '(31) 99999-9999',
      subtotal: 1227.7,
      acrescimo: 70,
      frete: 40,
      desconto: 0,
      total: 1337.7,
      validoAte: '2026-09-10',
      atendenteNomeSnapshot: 'Leonardo Barros',
      itens: [
        {
          id: 1,
          nomeProduto: 'Banner Fotográfico',
          caracteristicasResumo: 'Glossy 180g',
          quantidade: 1,
          valorUnitario: 60,
          valorTotal: 54,
        },
      ],
    };

    const mensagem = montarMensagemOrcamentoComercialWhatsApp(orcamento, false).replace(/\s/g, ' ');

    expect(mensagem).toContain('*Subtotal:* R$ 1.227,70');
    expect(mensagem).toContain('*Acréscimos:* R$ 70,00');
    expect(mensagem).toContain('*Frete:* R$ 40,00');
    expect(mensagem).not.toContain('Descontos');
    expect(mensagem).not.toContain('R$ 0,00');
    expect(mensagem).toContain('*TOTAL:* *R$ 1.337,70*');
    expect(mensagem).toContain('*Válido até:* 10/09/2026');
    expect(mensagem).toContain('*Responsável:* Leonardo Barros');
  });
});
