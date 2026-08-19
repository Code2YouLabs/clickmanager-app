import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { EmpresaIdentidadePublicaService } from './empresa-identidade-publica.service';

describe('EmpresaIdentidadePublicaService', () => {
  let service: EmpresaIdentidadePublicaService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/api/empresas/identidade-publica`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(EmpresaIdentidadePublicaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta identidade publica', () => {
    service.buscar().subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('GET');
    req.flush({ nome: 'Santa Luzia', slug: 'santa-luzia', logoUrl: null });
  });

  it('consulta disponibilidade de slug com query param', () => {
    service.verificarSlug('santa-luzia').subscribe();
    const req = http.expectOne(`${base}/slug-disponivel?slug=santa-luzia`);
    expect(req.request.method).toBe('GET');
    req.flush({ slug: 'santa-luzia', disponivel: true });
  });

  it('envia logo como multipart no campo logo', () => {
    const file = new File(['x'], 'logo.png', { type: 'image/png' });
    service.alterarLogo(file).subscribe();
    const req = http.expectOne(`${base}/logo`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body instanceof FormData).toBeTrue();
    expect(req.request.body.has('logo')).toBeTrue();
    req.flush({ nome: 'Santa Luzia', slug: 'santa-luzia', logoUrl: '/logo.png' });
  });
});
