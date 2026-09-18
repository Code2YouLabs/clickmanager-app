import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  PresencaPublicaDominioProprioRequest,
  PresencaPublicaResponse,
  PresencaPublicaSlugDisponivelResponse,
  PresencaPublicaSlugRequest,
} from './presenca-publica.models';

@Injectable({ providedIn: 'root' })
export class PresencaPublicaService {
  private readonly endpoint = 'api/presenca-publica';

  constructor(private readonly api: ApiService) {}

  buscar(): Observable<PresencaPublicaResponse> {
    return this.api.get<PresencaPublicaResponse>(this.endpoint);
  }

  consultarSlugDisponivel(slug: string): Observable<PresencaPublicaSlugDisponivelResponse> {
    return this.api.get<PresencaPublicaSlugDisponivelResponse>(
      `${this.endpoint}/slug-disponivel?slug=${encodeURIComponent(slug)}`
    );
  }

  alterarSlug(payload: PresencaPublicaSlugRequest): Observable<PresencaPublicaResponse> {
    return this.api.put<PresencaPublicaResponse>(`${this.endpoint}/slug`, payload);
  }

  configurarDominioProprio(payload: PresencaPublicaDominioProprioRequest): Observable<PresencaPublicaResponse> {
    return this.api.put<PresencaPublicaResponse>(`${this.endpoint}/dominio-proprio`, payload);
  }

  removerDominioProprio(): Observable<PresencaPublicaResponse> {
    return this.api.delete<PresencaPublicaResponse>(`${this.endpoint}/dominio-proprio`);
  }
}
