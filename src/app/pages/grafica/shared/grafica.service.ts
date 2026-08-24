import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  GraficaCatalogoProdutoMinimoRequest,
  GraficaCatalogoProdutoMinimoResponse,
  GraficaOpcaoRequest,
  GraficaOrcamentoItemRequest,
  GraficaOrcamentoItemResponse,
  GraficaDependencia,
  GraficaDependenciaRequest,
  GraficaOpcoesLoteRequest,
  GraficaOpcoesProgressivasRequest,
  GraficaOpcoesProgressivasResponse,
  GraficaPrecoPolitica,
  GraficaPrecoPoliticaRequest,
  GraficaPrecificacaoRequest,
  GraficaPrecificacaoResultado,
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

  buscarPorCatalogo(catalogoProdutoId: number): Observable<GraficaProduto> {
    return this.api.get<GraficaProduto>(`${this.endpoint}/catalogo/${catalogoProdutoId}`);
  }

  habilitar(body: GraficaProdutoRequest): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(this.endpoint, body);
  }

  criarProdutoCatalogo(body: GraficaCatalogoProdutoMinimoRequest): Observable<GraficaCatalogoProdutoMinimoResponse> {
    return this.api.post<GraficaCatalogoProdutoMinimoResponse>(`${this.endpoint}/catalogo`, body);
  }

  alterarStatus(id: number, ativo: boolean): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${id}/status`, { ativo });
  }

  aplicarTemplate(produtoGraficoId: number, template: string): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/templates`, { template });
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

  removerParametro(produtoGraficoId: number, parametroId: number): Observable<GraficaProduto> {
    return this.api.delete<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}`);
  }

  ordenarParametros(produtoGraficoId: number, body: GraficaOrdenacaoRequest): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/ordem`, body);
  }

  cadastrarOpcao(produtoGraficoId: number, parametroId: number, body: GraficaOpcaoRequest): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes`, body);
  }

  cadastrarOpcoesEmLote(produtoGraficoId: number, parametroId: number, body: GraficaOpcoesLoteRequest): Observable<GraficaProduto> {
    return this.api.post<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/lote`, body);
  }

  editarOpcao(produtoGraficoId: number, parametroId: number, opcaoId: number, body: GraficaOpcaoRequest): Observable<GraficaProduto> {
    return this.api.put<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/${opcaoId}`, body);
  }

  alterarStatusOpcao(produtoGraficoId: number, parametroId: number, opcaoId: number, ativo: boolean): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/${opcaoId}/status`, { ativo });
  }

  removerOpcao(produtoGraficoId: number, parametroId: number, opcaoId: number): Observable<GraficaProduto> {
    return this.api.delete<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/${opcaoId}`);
  }

  ordenarOpcoes(produtoGraficoId: number, parametroId: number, body: GraficaOrdenacaoRequest): Observable<GraficaProduto> {
    return this.api.patch<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/parametros/${parametroId}/opcoes/ordem`, body);
  }

  listarDependencias(produtoGraficoId: number): Observable<GraficaDependencia[]> {
    return this.api.get<GraficaDependencia[]>(`${this.endpoint}/${produtoGraficoId}/dependencias`);
  }

  salvarDependencia(produtoGraficoId: number, body: GraficaDependenciaRequest): Observable<GraficaProduto> {
    return this.api.put<GraficaProduto>(`${this.endpoint}/${produtoGraficoId}/dependencias`, body);
  }

  resolverOpcoes(produtoGraficoId: number, body: GraficaOpcoesProgressivasRequest): Observable<GraficaOpcoesProgressivasResponse> {
    return this.api.post<GraficaOpcoesProgressivasResponse>(`${this.endpoint}/${produtoGraficoId}/configurador/opcoes`, body);
  }

  listarPrecos(produtoGraficoId: number): Observable<GraficaPrecoPolitica[]> {
    return this.api.get<GraficaPrecoPolitica[]>(`${this.endpoint}/${produtoGraficoId}/precos`);
  }

  salvarPrecos(produtoGraficoId: number, politicas: GraficaPrecoPoliticaRequest[]): Observable<GraficaPrecoPolitica[]> {
    return this.api.put<GraficaPrecoPolitica[]>(`${this.endpoint}/${produtoGraficoId}/precos`, { politicas });
  }

  precificar(produtoGraficoId: number, body: GraficaPrecificacaoRequest): Observable<GraficaPrecificacaoResultado> {
    return this.api.post<GraficaPrecificacaoResultado>(`${this.endpoint}/${produtoGraficoId}/precificar`, body);
  }

  adicionarAoOrcamento(produtoGraficoId: number, orcamentoId: number, body: GraficaOrcamentoItemRequest): Observable<GraficaOrcamentoItemResponse> {
    return this.api.post<GraficaOrcamentoItemResponse>(`${this.endpoint}/${produtoGraficoId}/orcamentos/${orcamentoId}/itens`, body);
  }
}
