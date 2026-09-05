export interface SmartCalcRequest {

    catalogoProdutoId?: number;
    produtoId?: number;
    materialId?: number | null;
    corId?: number | null;
    largura: number;
    altura: number;
    quantidade: number;
    unidadeDimensao?: 'METRO' | 'CENTIMETRO' | 'MILIMETRO';
    acabamentosCodigos?: string[];
    acabamentosIds?: string[];
}
