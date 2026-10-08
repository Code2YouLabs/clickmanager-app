import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from 'src/environments/environment';
import { PRIMEIRO_PEDIDO_JORNADA } from './jornada.constants';
import { JornadaService } from './jornada.service';

describe('JornadaService', () => {
  let service: JornadaService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/api/jornadas/${PRIMEIRO_PEDIDO_JORNADA.chave}`;

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HttpClientTestingModule] });
    service = TestBed.inject(JornadaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('consulta progresso da jornada com versao', () => {
    service.consultar(PRIMEIRO_PEDIDO_JORNADA).subscribe((response) => {
      expect(response.status).toBe('NAO_INICIADO');
    });

    const req = http.expectOne((request) =>
      request.method === 'GET'
      && request.url === baseUrl
      && request.params.get('versao') === '1'
    );
    req.flush({ jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'NAO_INICIADO', oferecidoEm: null });
  });

  it('registra oferta apenas quando chamado explicitamente', () => {
    service.oferecer(PRIMEIRO_PEDIDO_JORNADA).subscribe();

    const req = http.expectOne((request) =>
      request.method === 'POST'
      && request.url === `${baseUrl}/oferecer`
      && request.params.get('versao') === '1'
    );
    expect(req.request.body).toEqual({});
    req.flush({ jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'NAO_INICIADO', oferecidoEm: '2026-10-08T10:00:00' });
  });

  it('inicia e ignora usando os endpoints da fundacao', () => {
    service.iniciar(PRIMEIRO_PEDIDO_JORNADA, { etapa: 'inicio' }).subscribe();
    let req = http.expectOne((request) =>
      request.method === 'POST'
      && request.url === `${baseUrl}/iniciar`
      && request.params.get('versao') === '1'
    );
    expect(req.request.body).toEqual({ etapa: 'inicio' });
    req.flush({ jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'EM_ANDAMENTO', etapaAtual: 'inicio' });

    service.ignorar(PRIMEIRO_PEDIDO_JORNADA).subscribe();
    req = http.expectOne((request) =>
      request.method === 'POST'
      && request.url === `${baseUrl}/ignorar`
      && request.params.get('versao') === '1'
    );
    expect(req.request.body).toEqual({});
    req.flush({ jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'IGNORADO' });
  });

  it('atualiza etapa e conclui usando os endpoints da fundacao', () => {
    service.atualizarEtapa(PRIMEIRO_PEDIDO_JORNADA, 'pedido_criado').subscribe();
    let req = http.expectOne((request) =>
      request.method === 'POST'
      && request.url === `${baseUrl}/etapas/pedido_criado`
      && request.params.get('versao') === '1'
    );
    expect(req.request.body).toEqual({});
    req.flush({ jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'EM_ANDAMENTO', etapaAtual: 'pedido_criado' });

    service.atualizarEtapa(PRIMEIRO_PEDIDO_JORNADA, 'pedido_criado', { pedidoId: 123 }).subscribe();
    req = http.expectOne((request) =>
      request.method === 'POST'
      && request.url === `${baseUrl}/etapas/pedido_criado`
      && request.params.get('versao') === '1'
    );
    expect(req.request.body).toEqual({ contexto: { pedidoId: 123 } });
    req.flush({
      jornada: 'PRIMEIRO_PEDIDO',
      versao: 1,
      status: 'EM_ANDAMENTO',
      etapaAtual: 'pedido_criado',
      contexto: { pedidoId: 123 },
    });

    service.concluir(PRIMEIRO_PEDIDO_JORNADA).subscribe();
    req = http.expectOne((request) =>
      request.method === 'POST'
      && request.url === `${baseUrl}/concluir`
      && request.params.get('versao') === '1'
    );
    expect(req.request.body).toEqual({});
    req.flush({ jornada: 'PRIMEIRO_PEDIDO', versao: 1, status: 'CONCLUIDO' });
  });
});
