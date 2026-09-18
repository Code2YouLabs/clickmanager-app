import { ComercialItemResponse, OrcamentoComercialDetalhe, PedidoComercialDetalhe } from '../shared/grafica.models';

function money(value?: number | null): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
}

function itemDescription(item: ComercialItemResponse): string {
  const nome = item.nomeProduto || item.produtoNome || 'Produto';
  const spec = item.caracteristicasResumo || item.caracteristicasResumoSnapshot || item.descricaoProduto || item.descricaoProdutoSnapshot;
  return spec ? `${nome} - ${spec}` : nome;
}

function dateBr(value?: string | null): string {
  if (!value) return '';
  const [datePart] = value.split('T');
  const parts = datePart.split('-').map(Number);
  if (parts.length === 3 && parts.every(Number.isFinite)) {
    const [year, month, day] = parts;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }
  return value;
}

function positive(value?: number | null): boolean {
  return Number(value || 0) > 0;
}

function adjustmentLinesOrcamento(orcamento: OrcamentoComercialDetalhe): string[] {
  const lines: string[] = [];
  if (positive(orcamento.acrescimo)) {
    lines.push(`*Acréscimos:* ${money(orcamento.acrescimo)}`);
  }
  if (positive(orcamento.frete)) {
    lines.push(`*Frete:* ${money(orcamento.frete)}`);
  }
  if (positive(orcamento.desconto)) {
    lines.push(`*Descontos:* ${money(orcamento.desconto)}`);
  }
  return lines;
}

function adjustmentLinesPedido(pedido: PedidoComercialDetalhe): string[] {
  const lines: string[] = [];
  if (positive(pedido.acrescimo)) {
    lines.push(`*Acréscimos:* ${money(pedido.acrescimo)}`);
  }
  if (positive(pedido.frete)) {
    lines.push(`*Frete:* ${money(pedido.frete)}`);
  }
  if (positive(pedido.desconto)) {
    lines.push(`*Descontos:* ${money(pedido.desconto)}`);
  }
  return lines;
}

export function telefoneWhatsAppBR(raw?: string | null): string {
  if (!raw) return '';
  let digits = raw.replace(/\D+/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.startsWith('0')) digits = digits.replace(/^0+/, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if (digits.length === 13 && digits.startsWith('550')) return `55${digits.slice(2)}`;
  return digits.startsWith('55') ? digits : `55${digits}`;
}

export function montarMensagemPedidoComercialWhatsApp(pedido: PedidoComercialDetalhe, comIcones = true): string {
  const iconPedido = comIcones ? '📦 ' : '';
  const iconCliente = comIcones ? '👤 ' : '';
  const iconItens = comIcones ? '🧾 ' : '';
  const iconTotal = comIcones ? '💰 ' : '';
  const itens = (pedido.itens || []).map(item => {
    const qtd = Number(item.quantidade || 0).toLocaleString('pt-BR');
    return `- ${itemDescription(item)} — ${qtd} x ${money(item.valorUnitario)} = ${money(item.valorTotal)}`;
  }).join('\n') || '- Sem itens';

  return [
    `*PEDIDO ${pedido.numero || pedido.id || ''}*`,
    pedido.clienteNome ? `\n${iconCliente}*Cliente:* ${pedido.clienteNome}` : '',
    pedido.status ? `\n*Status:* ${pedido.status}` : '',
    pedido.responsavelNome ? `\n*Responsável:* ${pedido.responsavelNome}` : '',
    `\n\n${iconItens}*Itens*`,
    `\n${itens}`,
    `\n\n*Subtotal:* ${money(pedido.subtotal)}`,
    ...adjustmentLinesPedido(pedido).map(line => `\n${line}`),
    `\n\n${iconTotal}*TOTAL:* *${money(pedido.total)}*`,
    pedido.observacaoCliente ? `\n\n*Observações:* ${pedido.observacaoCliente}` : '',
    `\n\nObrigado pela preferência!`
  ].join('');
}

export function montarMensagemOrcamentoComercialWhatsApp(orcamento: OrcamentoComercialDetalhe, comIcones = true): string {
  const iconCliente = comIcones ? '👤 ' : '';
  const iconItens = comIcones ? '🧾 ' : '';
  const iconTotal = comIcones ? '💰 ' : '';
  const itens = (orcamento.itens || []).map(item => {
    const qtd = Number(item.quantidade || 0).toLocaleString('pt-BR');
    return `- ${itemDescription(item)} — ${qtd} x ${money(item.valorUnitario)} = ${money(item.valorTotal ?? item.subtotal ?? item.subtotalEstimado)}`;
  }).join('\n') || '- Sem itens';

  return [
    `*ORÇAMENTO ${orcamento.protocolo || orcamento.id || ''}*`,
    orcamento.nomeCliente ? `\n${iconCliente}*Cliente:* ${orcamento.nomeCliente}` : '',
    orcamento.status ? `\n*Status:* ${orcamento.status}` : '',
    orcamento.validoAte ? `\n*Válido até:* ${dateBr(orcamento.validoAte)}` : '',
    orcamento.atendenteNomeSnapshot || orcamento.responsavelNome ? `\n*Responsável:* ${orcamento.atendenteNomeSnapshot || orcamento.responsavelNome}` : '',
    `\n\n${iconItens}*Itens*`,
    `\n${itens}`,
    `\n\n*Subtotal:* ${money(orcamento.subtotal)}`,
    ...adjustmentLinesOrcamento(orcamento).map(line => `\n${line}`),
    `\n\n${iconTotal}*TOTAL:* *${money(orcamento.total ?? orcamento.totalEstimado)}*`,
    orcamento.observacaoCliente ? `\n\n*Observações:* ${orcamento.observacaoCliente}` : '',
    `\n\nObrigado pela preferência!`
  ].join('');
}
