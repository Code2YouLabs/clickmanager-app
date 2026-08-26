import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import {
  DepositoImagem,
  DepositoImagemUploadMetadata,
  DepositoListParams,
  DepositoPaginaResponse,
} from '../models/deposito.models';

@Injectable({ providedIn: 'root' })
export class DepositoImagemService {
  private readonly endpoint = 'api/deposito/imagens';

  constructor(private readonly api: ApiService) {}

  upload(
    file: File,
    context: string,
    metadata: DepositoImagemUploadMetadata = {}
  ): Observable<DepositoImagem> {
    return this.uploadToEndpoint(`${this.endpoint}/upload`, file, context, metadata);
  }

  uploadToEndpoint(
    endpoint: string,
    file: File,
    context: string,
    metadata: DepositoImagemUploadMetadata = {}
  ): Observable<DepositoImagem> {
    const formData = new FormData();
    formData.append('file', file, file.name);
    formData.append('context', context);

    if (metadata.titulo?.trim()) {
      formData.append('titulo', metadata.titulo.trim());
    }

    if (metadata.descricao?.trim()) {
      formData.append('descricao', metadata.descricao.trim());
    }

    if (metadata.altText?.trim()) {
      formData.append('altText', metadata.altText.trim());
    }

    if (metadata.principal !== undefined && metadata.principal !== null) {
      formData.append('principal', String(!!metadata.principal));
    }

    return this.api.post<DepositoImagem>(endpoint, formData);
  }

  list(params: DepositoListParams = {}): Observable<DepositoPaginaResponse<DepositoImagem>> {
    return this.api.get<DepositoPaginaResponse<DepositoImagem>>(this.endpoint, this.buildParams(params));
  }

  getById(id: number): Observable<DepositoImagem> {
    return this.api.get<DepositoImagem>(`${this.endpoint}/${id}`);
  }

  update(id: number, body: Partial<DepositoImagem>): Observable<DepositoImagem> {
    return this.api.put<DepositoImagem>(`${this.endpoint}/${id}`, body);
  }

  delete(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}`);
  }

  deletePermanent(id: number): Observable<void> {
    return this.api.delete<void>(`${this.endpoint}/${id}/permanent`);
  }

  private buildParams(params: DepositoListParams): HttpParams {
    let httpParams = new HttpParams();

    if (params.textoPesquisa?.trim()) {
      httpParams = httpParams.set('textoPesquisa', params.textoPesquisa.trim());
    }

    if (params.page !== undefined) {
      httpParams = httpParams.set('page', String(params.page));
    }

    if (params.size !== undefined) {
      httpParams = httpParams.set('size', String(params.size));
    }

    if (params.sort?.trim()) {
      httpParams = httpParams.set('sort', params.sort.trim());
    }

    return httpParams;
  }
}
