import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { EMPTY, Observable } from 'rxjs';
import { expand, reduce } from 'rxjs/operators';
import { ApiService } from 'src/app/services/api.service';
import {
  CatalogoCaracteristica,
  CatalogoCaracteristicaRequest,
  CatalogoCategoria,
  CatalogoCategoriaEstruturaProduto,
  CatalogoCategoriaOption,
  CatalogoCategoriaRequest,
  CatalogoListParams,
  CatalogoMarca,
  CatalogoMarcaOption,
  CatalogoMarcaRequest,
  CatalogoPaginaResponse,
  CatalogoProduto,
  CatalogoProdutoListItem,
  CatalogoProdutoOption,
  CatalogoProdutoRequest,
} from '../models/catalogo.models';

@Injectable({ providedIn: 'root' })
export class CatalogoCategoriaService {
  private readonly endpoint = 'api/catalogo/categorias';

  constructor(private readonly api: ApiService) {}

  listar(params: CatalogoListParams = {}): Observable<CatalogoPaginaResponse<CatalogoCategoria>> {
    return this.api.get<CatalogoPaginaResponse<CatalogoCategoria>>(this.endpoint, buildCatalogoParams(params));
  }

  listarTodas(params: CatalogoListParams = {}): Observable<CatalogoCategoria[]> {
    const size = Math.min(params.size || 100, 100);
    const baseParams = { ...params, page: 0, size };

    return this.listar(baseParams).pipe(
      expand((page) => page.last ? EMPTY : this.listar({ ...baseParams, page: page.pageNumber + 1 })),
      reduce((items, page) => [...items, ...(page.content || [])], [] as CatalogoCategoria[]),
    );
  }

  options(ativo?: boolean | null): Observable<CatalogoCategoriaOption[]> {
    return this.api.get<CatalogoCategoriaOption[]>(`${this.endpoint}/options`, buildCatalogoParams({ ativo }));
  }

  detalhar(id: number): Observable<CatalogoCategoria> {
    return this.api.get<CatalogoCategoria>(`${this.endpoint}/${id}`);
  }

  criar(body: CatalogoCategoriaRequest): Observable<CatalogoCategoria> {
    return this.api.post<CatalogoCategoria>(this.endpoint, body);
  }

  atualizar(id: number, body: CatalogoCategoriaRequest): Observable<CatalogoCategoria> {
    return this.api.put<CatalogoCategoria>(`${this.endpoint}/${id}`, body);
  }

  excluir(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  inativar(id: number): Observable<void> {
    return this.excluir(id);
  }

  listarCaracteristicas(categoriaId: number, params: CatalogoListParams = {}): Observable<CatalogoCaracteristica[]> {
    return this.api.get<CatalogoCaracteristica[]>(
      `${this.endpoint}/${categoriaId}/caracteristicas`,
      buildCatalogoParams(params)
    );
  }

  listarCaracteristicasEfetivas(categoriaId: number): Observable<CatalogoCaracteristica[]> {
    return this.api.get<CatalogoCaracteristica[]>(`${this.endpoint}/${categoriaId}/caracteristicas/efetivas`);
  }

  estruturaProduto(categoriaId: number): Observable<CatalogoCategoriaEstruturaProduto> {
    return this.api.get<CatalogoCategoriaEstruturaProduto>(`${this.endpoint}/${categoriaId}/estrutura-produto`);
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogoMarcaService {
  private readonly endpoint = 'api/catalogo/marcas';

  constructor(private readonly api: ApiService) {}

  listar(params: CatalogoListParams = {}): Observable<CatalogoPaginaResponse<CatalogoMarca>> {
    return this.api.get<CatalogoPaginaResponse<CatalogoMarca>>(this.endpoint, buildCatalogoParams(params));
  }

  options(ativo?: boolean | null): Observable<CatalogoMarcaOption[]> {
    return this.api.get<CatalogoMarcaOption[]>(`${this.endpoint}/options`, buildCatalogoParams({ ativo }));
  }

  detalhar(id: number): Observable<CatalogoMarca> {
    return this.api.get<CatalogoMarca>(`${this.endpoint}/${id}`);
  }

  criar(body: CatalogoMarcaRequest): Observable<CatalogoMarca> {
    return this.api.post<CatalogoMarca>(this.endpoint, body);
  }

  atualizar(id: number, body: CatalogoMarcaRequest): Observable<CatalogoMarca> {
    return this.api.put<CatalogoMarca>(`${this.endpoint}/${id}`, body);
  }

  inativar(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogoProdutoService {
  private readonly endpoint = 'api/catalogo/produtos';

  constructor(private readonly api: ApiService) {}

  listar(params: CatalogoListParams = {}): Observable<CatalogoPaginaResponse<CatalogoProdutoListItem>> {
    return this.api.get<CatalogoPaginaResponse<CatalogoProdutoListItem>>(this.endpoint, buildCatalogoParams(params));
  }

  options(ativo?: boolean | null): Observable<CatalogoProdutoOption[]> {
    return this.api.get<CatalogoProdutoOption[]>(`${this.endpoint}/options`, buildCatalogoParams({ ativo }));
  }

  detalhar(id: number): Observable<CatalogoProduto> {
    return this.api.get<CatalogoProduto>(`${this.endpoint}/${id}`);
  }

  criar(body: CatalogoProdutoRequest): Observable<CatalogoProduto> {
    return this.api.post<CatalogoProduto>(this.endpoint, body);
  }

  atualizar(id: number, body: CatalogoProdutoRequest): Observable<CatalogoProduto> {
    return this.api.put<CatalogoProduto>(`${this.endpoint}/${id}`, body);
  }

  inativar(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }
}

@Injectable({ providedIn: 'root' })
export class CatalogoCaracteristicaService {
  private readonly endpoint = 'api/catalogo';

  constructor(private readonly api: ApiService) {}

  listarGeral(params: CatalogoListParams = {}): Observable<CatalogoPaginaResponse<CatalogoCaracteristica>> {
    return this.api.get<CatalogoPaginaResponse<CatalogoCaracteristica>>(
      `${this.endpoint}/caracteristicas`,
      buildCatalogoParams(params)
    );
  }

  detalhar(categoriaId: number, id: number): Observable<CatalogoCaracteristica> {
    return this.api.get<CatalogoCaracteristica>(
      `${this.endpoint}/categorias/${categoriaId}/caracteristicas/${id}`
    );
  }

  criar(categoriaId: number, body: CatalogoCaracteristicaRequest): Observable<CatalogoCaracteristica> {
    return this.api.post<CatalogoCaracteristica>(
      `${this.endpoint}/categorias/${categoriaId}/caracteristicas`,
      body
    );
  }

  atualizar(categoriaId: number, id: number, body: CatalogoCaracteristicaRequest): Observable<CatalogoCaracteristica> {
    return this.api.put<CatalogoCaracteristica>(
      `${this.endpoint}/categorias/${categoriaId}/caracteristicas/${id}`,
      body
    );
  }

  inativar(categoriaId: number, id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/categorias/${categoriaId}/caracteristicas/${id}`);
  }
}

export function buildCatalogoParams(params: CatalogoListParams = {}): HttpParams {
  let httpParams = new HttpParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  });

  return httpParams;
}
