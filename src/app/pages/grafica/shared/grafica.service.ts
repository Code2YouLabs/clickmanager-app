import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  GraficaCatalogoProdutoMinimoRequest,
  GraficaCatalogoProdutoMinimoResponse,
  GraficaAcabamento,
  GraficaAcabamentoRequest,
  GraficaCadastro,
  GraficaCadastroRequest,
  GraficaFormato,
  GraficaFormatoRequest,
  GraficaServico,
  GraficaServicoRequest,
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
  ComposicaoComercialResolvida,
  GraficaComercialComposicaoRequest,
  GraficaComercialDestinoResponse,
  GraficaPagina,
  OrcamentoComercialResumo,
  PedidoComercialResumo,
  RascunhoComercialResponse,
  GraficaOrdenacaoRequest,
  GraficaParametroRequest,
  GraficaProduto,
  GraficaProdutoListParams,
  GraficaProdutoPage,
  GraficaProdutoRequest,
} from './grafica.models';

@Injectable({ providedIn: 'root' })
export class GraficaProdutoService {
  private readonly endpoint = 'api/grafica/produtos';
  private readonly graficaEndpoint = 'api/grafica';

  constructor(private readonly api: ApiService) {}

  listar(params: GraficaProdutoListParams = {}): Observable<GraficaProdutoPage> {
    let httpParams = new HttpParams()
      .set('page', String(params.page ?? 0))
      .set('size', String(params.size ?? 20))
      .set('sort', params.sort || 'id,asc');
    httpParams = this.appendOptional(httpParams, 'search', params.search);
    httpParams = this.appendOptional(httpParams, 'ativo', params.ativo);
    httpParams = this.appendOptional(httpParams, 'materialId', params.materialId);
    httpParams = this.appendArray(httpParams, 'materialIds', params.materialIds);
    httpParams = this.appendOptional(httpParams, 'formatoId', params.formatoId);
    httpParams = this.appendArray(httpParams, 'formatoIds', params.formatoIds);
    httpParams = this.appendOptional(httpParams, 'corId', params.corId);
    httpParams = this.appendArray(httpParams, 'corIds', params.corIds);
    httpParams = this.appendArray(httpParams, 'acabamentoIds', params.acabamentoIds);
    httpParams = this.appendArray(httpParams, 'servicoIds', params.servicoIds);
    return this.api.get<GraficaProdutoPage>(this.endpoint, httpParams);
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

  atualizar(id: number, body: GraficaProdutoRequest): Observable<GraficaProduto> {
    return this.api.put<GraficaProduto>(`${this.endpoint}/${id}`, body);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
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

  resolverComposicaoComercial(produtoGraficoId: number, body: GraficaComercialComposicaoRequest): Observable<ComposicaoComercialResolvida> {
    return this.api.post<ComposicaoComercialResolvida>(`${this.graficaEndpoint}/comercial-beta/produtos/${produtoGraficoId}/composicoes`, body);
  }

  criarRascunhoGrafico(produtoGraficoId: number, body: GraficaComercialComposicaoRequest): Observable<GraficaComercialDestinoResponse> {
    return this.api.post<GraficaComercialDestinoResponse>(`${this.graficaEndpoint}/comercial-beta/produtos/${produtoGraficoId}/rascunhos`, body);
  }

  criarPedidoGrafico(produtoGraficoId: number, body: GraficaComercialComposicaoRequest): Observable<GraficaComercialDestinoResponse> {
    return this.api.post<GraficaComercialDestinoResponse>(`${this.graficaEndpoint}/comercial-beta/produtos/${produtoGraficoId}/pedidos`, body);
  }

  criarOrcamentoGrafico(produtoGraficoId: number, body: GraficaComercialComposicaoRequest): Observable<GraficaComercialDestinoResponse> {
    return this.api.post<GraficaComercialDestinoResponse>(`${this.graficaEndpoint}/comercial-beta/produtos/${produtoGraficoId}/orcamentos`, body);
  }

  listarRascunhosComerciais(page = 0, size = 20): Observable<GraficaPagina<RascunhoComercialResponse>> {
    return this.api.get<GraficaPagina<RascunhoComercialResponse>>('api/comercial/rascunhos', new HttpParams().set('page', page).set('size', size));
  }

  buscarRascunhoComercial(id: number): Observable<RascunhoComercialResponse> {
    return this.api.get<RascunhoComercialResponse>(`api/comercial/rascunhos/${id}`);
  }

  descartarRascunhoComercial(id: number): Observable<RascunhoComercialResponse> {
    return this.api.post<RascunhoComercialResponse>(`api/comercial/rascunhos/${id}/descartar`, {});
  }

  converterRascunhoParaPedido(id: number): Observable<GraficaComercialDestinoResponse> {
    return this.api.post<GraficaComercialDestinoResponse>(`api/comercial/rascunhos/${id}/converter/pedido`, {});
  }

  converterRascunhoParaOrcamento(id: number): Observable<GraficaComercialDestinoResponse> {
    return this.api.post<GraficaComercialDestinoResponse>(`api/comercial/rascunhos/${id}/converter/orcamento`, {});
  }

  listarPedidosComerciais(page = 0, size = 20): Observable<GraficaPagina<PedidoComercialResumo>> {
    return this.api.get<GraficaPagina<PedidoComercialResumo>>('api/comercial/pedidos', new HttpParams().set('page', page).set('size', size));
  }

  listarOrcamentosComerciais(page = 0, size = 20): Observable<GraficaPagina<OrcamentoComercialResumo>> {
    return this.api.get<GraficaPagina<OrcamentoComercialResumo>>('api/orcamentos', new HttpParams().set('page', page).set('size', size));
  }

  listarMateriais(): Observable<GraficaCadastro[]> {
    return this.api.get<GraficaCadastro[]>(`${this.graficaEndpoint}/materiais`);
  }

  salvarMaterial(body: GraficaCadastroRequest, id?: number | null): Observable<GraficaCadastro> {
    return id ? this.api.put<GraficaCadastro>(`${this.graficaEndpoint}/materiais/${id}`, body) : this.api.post<GraficaCadastro>(`${this.graficaEndpoint}/materiais`, body);
  }

  excluirMaterial(id: number): Observable<void> {
    return this.api.delete<void>(`${this.graficaEndpoint}/materiais/${id}`);
  }

  listarFormatos(): Observable<GraficaFormato[]> {
    return this.api.get<GraficaFormato[]>(`${this.graficaEndpoint}/formatos`);
  }

  salvarFormato(body: GraficaFormatoRequest, id?: number | null): Observable<GraficaFormato> {
    return id ? this.api.put<GraficaFormato>(`${this.graficaEndpoint}/formatos/${id}`, body) : this.api.post<GraficaFormato>(`${this.graficaEndpoint}/formatos`, body);
  }

  excluirFormato(id: number): Observable<void> {
    return this.api.delete<void>(`${this.graficaEndpoint}/formatos/${id}`);
  }

  listarCores(): Observable<GraficaCadastro[]> {
    return this.api.get<GraficaCadastro[]>(`${this.graficaEndpoint}/cores`);
  }

  salvarCor(body: GraficaCadastroRequest, id?: number | null): Observable<GraficaCadastro> {
    return id ? this.api.put<GraficaCadastro>(`${this.graficaEndpoint}/cores/${id}`, body) : this.api.post<GraficaCadastro>(`${this.graficaEndpoint}/cores`, body);
  }

  excluirCor(id: number): Observable<void> {
    return this.api.delete<void>(`${this.graficaEndpoint}/cores/${id}`);
  }

  listarAcabamentos(): Observable<GraficaAcabamento[]> {
    return this.api.get<GraficaAcabamento[]>(`${this.graficaEndpoint}/acabamentos`);
  }

  salvarAcabamento(body: GraficaAcabamentoRequest, id?: number | null): Observable<GraficaAcabamento> {
    return id ? this.api.put<GraficaAcabamento>(`${this.graficaEndpoint}/acabamentos/${id}`, body) : this.api.post<GraficaAcabamento>(`${this.graficaEndpoint}/acabamentos`, body);
  }

  excluirAcabamento(id: number): Observable<void> {
    return this.api.delete<void>(`${this.graficaEndpoint}/acabamentos/${id}`);
  }

  listarServicos(): Observable<GraficaServico[]> {
    return this.api.get<GraficaServico[]>(`${this.graficaEndpoint}/servicos`);
  }

  salvarServico(body: GraficaServicoRequest, id?: number | null): Observable<GraficaServico> {
    return id ? this.api.put<GraficaServico>(`${this.graficaEndpoint}/servicos/${id}`, body) : this.api.post<GraficaServico>(`${this.graficaEndpoint}/servicos`, body);
  }

  excluirServico(id: number): Observable<void> {
    return this.api.delete<void>(`${this.graficaEndpoint}/servicos/${id}`);
  }

  private appendOptional(params: HttpParams, key: string, value: string | number | boolean | null | undefined): HttpParams {
    if (value === null || value === undefined || value === '') {
      return params;
    }
    return params.set(key, String(value));
  }

  private appendArray(params: HttpParams, key: string, values: number[] | null | undefined): HttpParams {
    if (!values?.length) {
      return params;
    }
    return values.reduce((acc, value) => acc.append(key, String(value)), params);
  }

}
