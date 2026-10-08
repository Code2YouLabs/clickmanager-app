import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { JornadaContexto, JornadaDefinicao, JornadaOperacaoRequest, JornadaProgressoResponse } from './jornada.models';

@Injectable({ providedIn: 'root' })
export class JornadaService {
  private readonly endpoint = 'api/jornadas';

  constructor(private readonly api: ApiService) {}

  consultar(definicao: JornadaDefinicao): Observable<JornadaProgressoResponse> {
    return this.api.get<JornadaProgressoResponse>(
      `${this.endpoint}/${definicao.chave}`,
      this.paramsVersao(definicao),
    );
  }

  oferecer(definicao: JornadaDefinicao): Observable<JornadaProgressoResponse> {
    return this.api.post<JornadaProgressoResponse>(
      `${this.endpoint}/${definicao.chave}/oferecer`,
      {},
      this.paramsVersao(definicao),
    );
  }

  iniciar(definicao: JornadaDefinicao, request?: JornadaOperacaoRequest): Observable<JornadaProgressoResponse> {
    return this.api.post<JornadaProgressoResponse>(
      `${this.endpoint}/${definicao.chave}/iniciar`,
      request ?? {},
      this.paramsVersao(definicao),
    );
  }

  atualizarEtapa(
    definicao: JornadaDefinicao,
    etapa: string,
    contexto?: JornadaContexto | null,
  ): Observable<JornadaProgressoResponse> {
    const request: JornadaOperacaoRequest = contexto ? { contexto } : {};
    return this.api.post<JornadaProgressoResponse>(
      `${this.endpoint}/${definicao.chave}/etapas/${encodeURIComponent(etapa)}`,
      request,
      this.paramsVersao(definicao),
    );
  }

  concluir(definicao: JornadaDefinicao): Observable<JornadaProgressoResponse> {
    return this.api.post<JornadaProgressoResponse>(
      `${this.endpoint}/${definicao.chave}/concluir`,
      {},
      this.paramsVersao(definicao),
    );
  }

  ignorar(definicao: JornadaDefinicao): Observable<JornadaProgressoResponse> {
    return this.api.post<JornadaProgressoResponse>(
      `${this.endpoint}/${definicao.chave}/ignorar`,
      {},
      this.paramsVersao(definicao),
    );
  }

  private paramsVersao(definicao: JornadaDefinicao): HttpParams {
    return new HttpParams().set('versao', String(definicao.versao));
  }
}
