import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  GraficaOpcaoRequest,
  GraficaOrdenacaoRequest,
  GraficaParametroRequest,
  GraficaProduto,
  GraficaProdutoPage,
  GraficaProdutoRequest,
} from './grafica.models';

@Injectable({ providedIn: 'root' })
export class GraficaProdutoService {
  private readonly endpoint = 'api/grafica/produtos';

  constructor(private readonly api: ApiService) {}

  listar(page = 0, size = 20): Observable<GraficaProdutoPage> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size))
      .set('sort', 'id,asc');
    return this.api.get<GraficaProdutoPage>(this.endpoint, params);
  }

  detalhar(id: number): Observable<GraficaProduto> {
    return this.api.get<GraficaProduto>(`${this.endpoint}/${id}`);
  }

  habilitar(body: GraficaProdutoRequest): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(this.endpoint, body);
  }

  alterarStatus(id: number, ativo: boolean): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${id}/status`, { ativo });
  }

  cadastrarParametro(produtoGraficoId: number, body: GraficaParametroRequest): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros`, body);
  }

  editarParametro(produtoGraficoId: number, parametroId: number, body: GraficaParametroRequest): Observable<GraficaProduto> {
    return this.api.put<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}`, body);
  }

  alterarStatusParametro(produtoGraficoId: number, parametroId: number, ativo: boolean): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/status`, { ativo });
  }

  ordenarParametros(produtoGraficoId: number, body: GraficaOrdenacaoRequest): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/ordem`, body);
  }

  cadastrarOpcao(produtoGraficoId: number, parametroId: number, body: GraficaOpcaoRequest): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes`, body);
  }

  editarOpcao(produtoGraficoId: number, parametroId: number, opcaoId: number, body: GraficaOpcaoRequest): Observable<GraficaProduto> {
    return this.api.put<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/${opcaoId}`, body);
  }

  alterarStatusOpcao(produtoGraficoId: number, parametroId: number, opcaoId: number, ativo: boolean): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/${opcaoId}/status`, { ativo });
  }

  ordenarOpcoes(produtoGraficoId: number, parametroId: number, body: GraficaOrdenacaoRequest): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/ordem`, body);
  }
}
