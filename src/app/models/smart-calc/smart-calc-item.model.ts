export interface SmartCalcItem {
    id: number;
    nomeComposto: string;
    descricao: string;
    quantidade: number;
    valor: number;
    subTotal: number;
    produtoId: number;
    produtoGraficoId?: number;
    catalogoProdutoId?: number;
    formatoId?: number;
    tipoLinha?: string;
    acabamentoCodigo?: string;
    acabamentoId?: number;
    largura: number;
    altura: number;
    snapshot?: Record<string, unknown>;
}
