import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { PresencaPublicaDominioProprioRequest, PresencaPublicaResponse } from './presenca-publica.models';

@Injectable({ providedIn: 'root' })
export class PresencaPublicaService {
  private readonly endpoint = 'api/presenca-publica';

  constructor(private readonly api: ApiService) {}

  buscar(): Observable<PresencaPublicaResponse> {
    return this.api.get<PresencaPublicaResponse>(this.endpoint);
  }

  configurarDominioProprio(payload: PresencaPublicaDominioProprioRequest): Observable<PresencaPublicaResponse> {
    return this.api.put<PresencaPublicaResponse>(`${this.endpoint}/dominio-proprio`, payload);
  }

  removerDominioProprio(): Observable<PresencaPublicaResponse> {
    return this.api.delete<PresencaPublicaResponse>(`${this.endpoint}/dominio-proprio`);
  }
}
