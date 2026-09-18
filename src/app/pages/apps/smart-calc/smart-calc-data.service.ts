import { Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';

import { ApiService } from 'src/app/services/api.service';
import { SmartCalcRequest } from 'src/app/models/smart-calc/smart-calc-request.model';
import { SmartCalcResultado } from 'src/app/models/smart-calc/smart-calc-resultado.model';

@Injectable({ providedIn: 'root' })
export class SmartCalcDataService {
  private readonly calcEndpoint = 'api/grafica/smartcalc/calcular';
  private readonly rascunhoEndpoint = 'api/grafica/smartcalc/rascunhos';

  constructor(private api: ApiService) {}

  calcularSmartCalc(payload: SmartCalcRequest): Observable<SmartCalcResultado> {
    return this.api
      .post<SmartCalcResultado | SmartCalcResultado[]>(this.calcEndpoint, payload)
      .pipe(
        map((res): SmartCalcResultado =>
          Array.isArray(res) ? (res[0] ?? { itens: [], total: 0, observacao: undefined }) : res
        )
      );
  }

  criarRascunhoSmartCalc(payload: SmartCalcRequest): Observable<{ id?: number; referencia?: string }> {
    return this.api.post<{ id?: number; referencia?: string }>(this.rascunhoEndpoint, payload);
  }
}
