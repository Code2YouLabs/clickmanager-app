import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { CalculadoraConfigRequest } from 'src/app/models/calculadora/calculadora-config-request.model';
import { CalculadoraConfigResponse } from 'src/app/models/calculadora/calculadora-config-response.model';
import { ProdutoOption } from 'src/app/models/produto/produto-option.model';

export interface SmartCalcConfigApiResponse {
  config?: CalculadoraConfigResponse | null;
  id?: number;
  ativo?: boolean;
  produtosDisponiveis: ProdutoOption[];
}

@Injectable({ providedIn: 'root' })
export class CalculadoraConfigService {

  private baseUrl = 'api/grafica/smartcalc/config';

  constructor(private api: ApiService) {}

  /**
   * Retorna a configuração atual e a lista de produtos disponíveis no SmartCalc.
   */
  getConfigCompleta(): Observable<SmartCalcConfigApiResponse> {
    return this.api.get<SmartCalcConfigApiResponse>(this.baseUrl).pipe(
      map(res => this.normalizarResponse(res))
    );
  }

  /**
   * Retorna somente o objeto de configuração (compat com chamadas existentes).
   */ 
  getConfig(): Observable<CalculadoraConfigResponse | null> {
    return this.getConfigCompleta().pipe(map(res => res.config ?? null));
  }

  salvar(req: CalculadoraConfigRequest): Observable<CalculadoraConfigResponse | null> {
    return this.api.post<SmartCalcConfigApiResponse | CalculadoraConfigResponse>(this.baseUrl, {
      ativo: req.ativo,
    }).pipe(
      map(res => this.normalizarResponse(res as SmartCalcConfigApiResponse).config ?? null)
    );
  }

  private normalizarResponse(res: SmartCalcConfigApiResponse | CalculadoraConfigResponse | null | undefined): SmartCalcConfigApiResponse {
    const api = res as SmartCalcConfigApiResponse | null | undefined;
    if (api?.config) {
      return { config: api.config, produtosDisponiveis: api.produtosDisponiveis ?? [] };
    }
    const produtosDisponiveis = api?.produtosDisponiveis ?? [];
    return {
      config: {
        id: api?.id ?? 0,
        ativo: !!api?.ativo,
      },
      produtosDisponiveis,
    };
  }
}
