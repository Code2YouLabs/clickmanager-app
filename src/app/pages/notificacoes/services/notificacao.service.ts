import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  NotificacaoCriarRequest,
  NotificacaoEnvioResponse,
  NotificacaoItem,
  NotificacaoPaginadaResponse,
  NotificacaoResumoResponse
} from '../models/notificacao.model';

@Injectable({
  providedIn: 'root'
})
export class NotificacaoService {
  private readonly endpoint = 'api/notificacoes';
  private readonly endpointFallback = 'api/pessoas/notificacoes';

  constructor(private readonly api: ApiService) {}

  obterResumo$(limit = 5): Observable<NotificacaoResumoResponse> {
    const params = new HttpParams().set('limit', String(limit));
    return this.getComFallback<any>('/resumo', params)
      .pipe(
        map((raw) => this.mapResumo(raw)),
        catchError((err) => {
          // Fallback para cenários em que /resumo esteja com política diferente no backend.
          if ([401, 403, 404].includes(Number(err?.status))) {
            return this.listar$(false, 0, limit).pipe(
              map((pagina) => ({
                naoLidas: Number(pagina?.naoLidas || 0),
                itens: Array.isArray(pagina?.itens) ? pagina.itens.slice(0, limit) : []
              }))
            );
          }
          return throwError(() => err);
        })
      );
  }

  listar$(somenteNaoLidas = false, pagina = 0, tamanho = 20): Observable<NotificacaoPaginadaResponse> {
    const params = new HttpParams()
      .set('somenteNaoLidas', String(!!somenteNaoLidas))
      .set('pagina', String(pagina))
      .set('tamanho', String(tamanho));
    return this.getComFallback<any>('', params)
      .pipe(map((raw) => this.mapPaginada(raw)));
  }

  buscarPorId$(id: number): Observable<NotificacaoItem> {
    return this.getComFallback<any>(`/${id}`)
      .pipe(map((raw) => this.mapItem(raw)));
  }

  marcarComoLida$(id: number): Observable<void> {
    return this.patchComFallback<any>(`/${id}/ler`, {}).pipe(map(() => void 0));
  }

  marcarTodasComoLidas$(): Observable<void> {
    return this.patchComFallback<any>('/ler-todas', {}).pipe(map(() => void 0));
  }

  enviar$(request: NotificacaoCriarRequest): Observable<NotificacaoEnvioResponse> {
    return this.postComFallback<NotificacaoEnvioResponse>('', request);
  }

  private mapResumo(raw: any): NotificacaoResumoResponse {
    return {
      naoLidas: Number(raw?.['naoLidas'] || 0),
      itens: Array.isArray(raw?.['itens']) ? raw['itens'].map((item: any) => this.mapItem(item)) : []
    };
  }

  private mapPaginada(raw: any): NotificacaoPaginadaResponse {
    return {
      pagina: Number(raw?.['pagina'] || 0),
      tamanho: Number(raw?.['tamanho'] || 20),
      totalItens: Number(raw?.['totalItens'] || 0),
      totalPaginas: Number(raw?.['totalPaginas'] || 0),
      naoLidas: Number(raw?.['naoLidas'] || 0),
      itens: Array.isArray(raw?.['itens']) ? raw['itens'].map((item: any) => this.mapItem(item)) : []
    };
  }

  private mapItem(raw: any): NotificacaoItem {
    const nivel = String(raw?.['nivel'] || 'INFO').toUpperCase();
    const tipoDestino = String(raw?.['tipoDestino'] || 'EMPRESA_INTEIRA').toUpperCase();
    return {
      id: Number(raw?.['id'] || 0),
      titulo: String(raw?.['titulo'] || ''),
      resumo: raw?.['resumo'] ?? null,
      conteudo: raw?.['conteudo'] ?? null,
      link: raw?.['invalidadaEm'] ? null : raw?.['link'] ?? null,
      invalidadaEm: raw?.['invalidadaEm'] ?? null,
      nivel: nivel === 'SUCESSO' || nivel === 'ATENCAO' || nivel === 'CRITICO' ? nivel : 'INFO',
      tipoDestino:
        tipoDestino === 'USUARIOS_ESPECIFICOS' || tipoDestino === 'TODAS_EMPRESAS'
          ? tipoDestino
          : 'EMPRESA_INTEIRA',
      criadaEm: String(raw?.['criadaEm'] || ''),
      criadaPorUsuarioId: raw?.['criadaPorUsuarioId'] != null ? Number(raw['criadaPorUsuarioId']) : null,
      lida: Boolean(raw?.['lida']),
      lidaEm: raw?.['lidaEm'] ?? null
    };
  }

  private getComFallback<T>(path: string, params?: HttpParams): Observable<T> {
    return this.api.get<T>(`${this.endpoint}${path}`, params).pipe(
      catchError((err) => this.deveTentarEndpointFallback(err)
        ? this.api.get<T>(`${this.endpointFallback}${path}`, params)
        : throwError(() => err))
    );
  }

  private postComFallback<T>(path: string, body: any): Observable<T> {
    return this.api.post<T>(`${this.endpoint}${path}`, body).pipe(
      catchError((err) => this.deveTentarEndpointFallback(err)
        ? this.api.post<T>(`${this.endpointFallback}${path}`, body)
        : throwError(() => err))
    );
  }

  private patchComFallback<T>(path: string, body: any): Observable<T> {
    return this.api.patch<T>(`${this.endpoint}${path}`, body).pipe(
      catchError((err) => this.deveTentarEndpointFallback(err)
        ? this.api.patch<T>(`${this.endpointFallback}${path}`, body)
        : throwError(() => err))
    );
  }

  private deveTentarEndpointFallback(err: any): boolean {
    const status = Number(err?.status);
    return status === 401 || status === 403 || status === 404;
  }
}
