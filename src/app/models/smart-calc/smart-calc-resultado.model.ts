import { SmartCalcItem } from './smart-calc-item.model';

export interface SmartCalcResultado {
    itens: SmartCalcItem[];
    observacao?: string;
    observacaoResumo?: {
        distribuicao?: {
            formato?: string;
            orientacao?: string;
            folhas?: number;
            porFolha?: number;
        }[];
        solicitado?: number;
        produzido?: number;
        sobraUtil?: number;
        custoUnitarioSolicitado?: number;
        custoUnitarioProduzido?: number;
    };
    sugestaoEconomica?: {
        formato?: string;
        orientacao?: string;
        porFolha?: number;
        valorFolha?: number;
        custoUnitario?: number;
    };
    avisos?: string[];
    total: number;
}
