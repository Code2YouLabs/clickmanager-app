import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  PaginaLinksDetalhe,
  LinksAnalyticsResumo,
  PeriodoAnalyticsLinks,
  PaginaLinksItemRequest,
  PaginaLinksOrdenacaoRequest,
  PaginaLinksRequest,
  PaginaLinksResumo,
} from '../models/links.models';

@Injectable({ providedIn: 'root' })
export class LinksService {
  private readonly endpoint = 'api/links/paginas';

  constructor(private readonly api: ApiService) {}

  listarPaginas(): Observable<PaginaLinksResumo[]> {
    return this.api.get<PaginaLinksResumo[]>(this.endpoint);
  }

  criarPagina(payload: PaginaLinksRequest): Observable<PaginaLinksDetalhe> {
    return this.api.post<PaginaLinksDetalhe>(this.endpoint, payload);
  }

  buscarPagina(id: number): Observable<PaginaLinksDetalhe> {
    return this.api.get<PaginaLinksDetalhe>(`${this.endpoint}/${id}`);
  }

  editarPagina(id: number, payload: PaginaLinksRequest): Observable<PaginaLinksDetalhe> {
    return this.api.put<PaginaLinksDetalhe>(`${this.endpoint}/${id}`, payload);
  }

  alterarPublicacao(id: number, publicada: boolean): Observable<PaginaLinksDetalhe> {
    return this.api.patch<PaginaLinksDetalhe>(`${this.endpoint}/${id}/publicacao`, { publicada });
  }

  excluirPagina(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  adicionarItem(paginaId: number, payload: PaginaLinksItemRequest): Observable<PaginaLinksDetalhe> {
    return this.api.post<PaginaLinksDetalhe>(`${this.endpoint}/${paginaId}/itens`, payload);
  }

  editarItem(paginaId: number, itemId: number, payload: PaginaLinksItemRequest): Observable<PaginaLinksDetalhe> {
    return this.api.put<PaginaLinksDetalhe>(`${this.endpoint}/${paginaId}/itens/${itemId}`, payload);
  }

  alterarStatusItem(paginaId: number, itemId: number, ativo: boolean): Observable<PaginaLinksDetalhe> {
    return this.api.patch<PaginaLinksDetalhe>(`${this.endpoint}/${paginaId}/itens/${itemId}/status`, { ativo });
  }

  removerItem(paginaId: number, itemId: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${paginaId}/itens/${itemId}`);
  }

  ordenarItens(paginaId: number, payload: PaginaLinksOrdenacaoRequest): Observable<PaginaLinksDetalhe> {
    return this.api.patch<PaginaLinksDetalhe>(`${this.endpoint}/${paginaId}/itens/ordem`, payload);
  }

  buscarAnalytics(paginaId: number, periodo: PeriodoAnalyticsLinks): Observable<LinksAnalyticsResumo> {
    return this.api.get<LinksAnalyticsResumo>(`${this.endpoint}/${paginaId}/analytics?periodo=${periodo}`);
  }
}
