import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { LinksService } from './links.service';

describe('LinksService', () => {
  let service: LinksService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/api/links/paginas`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(LinksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lista paginas no endpoint administrativo', () => {
    service.listarPaginas().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('cria pagina com payload do backend', () => {
    service.criarPagina({ titulo: 'Santa Luzia', descricao: null, principal: null }).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ titulo: 'Santa Luzia', descricao: null, principal: null });
    req.flush({});
  });

  it('altera publicacao com PATCH dedicado', () => {
    service.alterarPublicacao(7, true).subscribe();
    const req = http.expectOne(`${base}/7/publicacao`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ publicada: true });
    req.flush({});
  });

  it('ordena itens em lote', () => {
    service.ordenarItens(7, { itens: [{ itemId: 2, ordem: 0 }, { itemId: 1, ordem: 1 }] }).subscribe();
    const req = http.expectOne(`${base}/7/itens/ordem`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ itens: [{ itemId: 2, ordem: 0 }, { itemId: 1, ordem: 1 }] });
    req.flush({});
  });
});
