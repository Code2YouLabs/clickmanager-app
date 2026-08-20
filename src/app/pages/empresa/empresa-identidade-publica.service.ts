import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from 'src/app/services/api.service';
import { LinksIdentidadePublica } from '../links/models/links.models';

export interface EmpresaSlugDisponivelResponse {
  slug: string;
  disponivel: boolean;
}

@Injectable({ providedIn: 'root' })
export class EmpresaIdentidadePublicaService {
  private readonly endpoint = 'api/empresas/identidade-publica';

  constructor(private readonly api: ApiService) {}

  buscar(): Observable<LinksIdentidadePublica> {
    return this.api.get<LinksIdentidadePublica>(this.endpoint);
  }

  verificarSlug(slug: string): Observable<EmpresaSlugDisponivelResponse> {
    const params = new HttpParams().set('slug', slug);
    return this.api.get<EmpresaSlugDisponivelResponse>(`${this.endpoint}/slug-disponivel`, params);
  }

  alterarSlug(slug: string): Observable<LinksIdentidadePublica> {
    return this.api.put<LinksIdentidadePublica>(`${this.endpoint}/slug`, { slug });
  }

  alterarLogo(logo: File): Observable<LinksIdentidadePublica> {
    const body = new FormData();
    body.append('logo', logo, logo.name);
    return this.api.put<LinksIdentidadePublica>(`${this.endpoint}/logo`, body);
  }

  removerLogo(): Observable<LinksIdentidadePublica> {
    return this.api.delete<LinksIdentidadePublica>(`${this.endpoint}/logo`);
  }
}
