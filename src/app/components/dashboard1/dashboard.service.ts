import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { HttpParams } from '@angular/common/http';

/** DTOs de request e response alinhados ao backend */
export interface DashboardComparativoRequest {
    empresaId: number;
    filtros: {
        ano: number;
        mesA: { index: number; label: string };
        mesB: { index: number; label: string };
        modo: 'quantidade' | 'receita';
    };
}

/** ====== Receita Resumo (NOVO) ====== */
export type Periodo =
    | 'MES_ATUAL'
    | 'ULTIMOS_30'
    | 'MES_PASSADO'
    | 'YTD'
    | 'PERSONALIZADO';

export type FormaPagamento =
    | 'PIX'
    | 'DINHEIRO'
    | 'CARTAO_CREDITO'
    | 'CARTAO_DEBITO'
    | 'DEPOSITO'
    | 'BOLETO';

export interface ReceitaResumoRequest {
    periodo: Periodo;
    inicio?: string; // yyyy-MM-dd (quando PERSONALIZADO)
    fim?: string;    // yyyy-MM-dd
}

export interface ReceitaResumoResponse {
    janela: { inicio: string; fim: string; label: string };
    valorTotal: number;     // soma dos pagamentos confirmados
    totalPedidos: number;   // contagem de pedidos no período
    porForma: { forma: FormaPagamento; valor: number }[]; // donut
}

export interface GraficaDashboardIndicador {
    codigo: string;
    label: string;
    quantidade: number;
    valor: number;
}

export interface GraficaDashboardResumoResponse {
    indicadores: GraficaDashboardIndicador[];
    pedidoStatus: GraficaDashboardIndicador[];
    orcamentoStatus: GraficaDashboardIndicador[];
}

export interface DashboardComparativoResponse {
    empresa: {
        nome: string;
        descricao: string;
    };
    kpis: {
        status: string;
        quantidade: number;
    }[];
    comparativo: {
        ano: number;
        modo: string;
        mesA: { index: number; label: string };
        mesB: { index: number; label: string };
        series: {
            mesA: { dias: number[] };
            mesB: { dias: number[] };
        };
    };
    atualizadoEm: string;
}

@Injectable({ providedIn: 'root' })
export class DashboardService {

    private readonly endpointComparativo = 'api/grafica/dashboard/comparativo';
    private readonly endpointReceita = 'api/grafica/dashboard/receita-resumo';
    private readonly endpointResumo = 'api/grafica/dashboard/resumo';

    constructor(private api: ApiService) { }

    // ===== comparativo =====
    obterComparativo(req: DashboardComparativoRequest): Observable<DashboardComparativoResponse> {
        return this.api.post<DashboardComparativoResponse>(this.endpointComparativo, req);
    }

    obterComparativoSimples(
        empresaId: number,
        ano: number,
        mesAIndex: number,
        mesBIndex: number,
        modo: 'quantidade' | 'receita'
    ): Observable<DashboardComparativoResponse> {
        const body: DashboardComparativoRequest = {
            empresaId,
            filtros: {
                ano,
                mesA: { index: mesAIndex, label: this.nomeMes(mesAIndex) },
                mesB: { index: mesBIndex, label: this.nomeMes(mesBIndex) },
                modo
            }
        };
        return this.obterComparativo(body);
    }

    obterReceitaResumo(req: ReceitaResumoRequest): Observable<ReceitaResumoResponse> {
        return this.api.post<ReceitaResumoResponse>(this.endpointReceita, req);
    }

    obterResumoGrafica(): Observable<GraficaDashboardResumoResponse> {
        return this.api.get<GraficaDashboardResumoResponse>(this.endpointResumo);
    }

    private nomeMes(index: number): string {
        const nomes = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        return nomes[index] ?? '-';
    }

}
