import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { PresencaPublicaService } from './presenca-publica.service';

describe('PresencaPublicaService', () => {
  let service: PresencaPublicaService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/api/presenca-publica`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(PresencaPublicaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta presenca publica', () => {
    service.buscar().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush({ slugPublico: 'santa-luzia', dominioProprio: null, dominioProprioAtivo: false });
  });

  it('configura dominio proprio', () => {
    service.configurarDominioProprio({ dominio: 'santaluzia.com.br', ativo: true }).subscribe();
    const req = http.expectOne(`${base}/dominio-proprio`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ dominio: 'santaluzia.com.br', ativo: true });
    req.flush({ slugPublico: 'santa-luzia', dominioProprio: 'santaluzia.com.br', dominioProprioAtivo: true });
  });

  it('remove dominio proprio', () => {
    service.removerDominioProprio().subscribe();
    const req = http.expectOne(`${base}/dominio-proprio`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ slugPublico: 'santa-luzia', dominioProprio: null, dominioProprioAtivo: false });
  });
});
