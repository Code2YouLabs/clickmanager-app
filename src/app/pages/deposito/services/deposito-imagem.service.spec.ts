import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { DepositoImagemService } from './deposito-imagem.service';

describe('DepositoImagemService', () => {
  let service: DepositoImagemService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), DepositoImagemService],
    });
    service = TestBed.inject(DepositoImagemService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('uploads deposito image without empresaSlug', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });

    service.upload(file, 'produtos', {
      titulo: 'Foto',
      descricao: 'Descrição',
      altText: 'Alt',
      principal: true,
    }).subscribe();

    const req = http.expectOne('http://localhost:8080/api/deposito/imagens/upload');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.has('empresaSlug')).toBeFalse();
    expect(body.get('context')).toBe('produtos');
    expect(body.get('titulo')).toBe('Foto');
    expect(body.get('descricao')).toBe('Descrição');
    expect(body.get('altText')).toBe('Alt');
    expect(body.get('principal')).toBe('true');
    req.flush({ id: 1, context: 'produtos' });
  });

  it('uploads image to custom endpoint when provided', () => {
    const file = new File(['x'], 'foto.png', { type: 'image/png' });

    service.uploadToEndpoint('api/grafica/produtos/imagens/upload', file, 'catalogo-produtos', {
      titulo: 'Foto',
      principal: false,
    }).subscribe();

    const req = http.expectOne('http://localhost:8080/api/grafica/produtos/imagens/upload');
    expect(req.request.method).toBe('POST');
    const body = req.request.body as FormData;
    expect(body.get('context')).toBe('catalogo-produtos');
    expect(body.get('titulo')).toBe('Foto');
    expect(body.get('principal')).toBe('false');
    req.flush({ id: 1, arquivoId: 1, context: 'catalogo-produtos' });
  });
});
