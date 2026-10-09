import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { GraficaProdutoService } from '../../shared/grafica.service';
import { PRIMEIRO_PEDIDO_JORNADA } from 'src/app/shared/jornadas/jornada.constants';
import { JornadaProgressoResponse } from 'src/app/shared/jornadas/jornada.models';
import { JornadaService } from 'src/app/shared/jornadas/jornada.service';
import { TutorialService } from 'src/app/shared/tutorial/tutorial.service';
import {
  PRIMEIRO_PEDIDO_ETAPAS,
  PRIMEIRO_PEDIDO_EVENTOS,
  PRIMEIRO_PEDIDO_TUTORIAL_ID,
  PrimeiroPedidoTutorialService,
} from './primeiro-pedido-tutorial.service';

describe('PrimeiroPedidoTutorialService', () => {
  let service: PrimeiroPedidoTutorialService;
  let jornada: jasmine.SpyObj<JornadaService>;
  let tutorial: jasmine.SpyObj<TutorialService>;
  let router: jasmine.SpyObj<Router>;
  let graficaService: jasmine.SpyObj<GraficaProdutoService>;

  beforeEach(() => {
    jornada = jasmine.createSpyObj<JornadaService>('JornadaService', ['consultar', 'atualizarEtapa', 'concluir']);
    graficaService = jasmine.createSpyObj<GraficaProdutoService>('GraficaProdutoService', ['buscarPedidoComercial']);
    tutorial = jasmine.createSpyObj<TutorialService>('TutorialService', ['start', 'notify', 'complete', 'stop', 'activeDefinition']);
    tutorial.activeDefinition.and.returnValue({ id: PRIMEIRO_PEDIDO_TUTORIAL_ID } as any);
    router = jasmine.createSpyObj<Router>('Router', ['parseUrl'], { url: '/page/grafica/comercial/pedidos' });
    router.parseUrl.and.callFake((url: string) => ({
      queryParams: {},
      root: {
        children: {
          primary: {
            segments: url.split('?')[0].split('/').filter(Boolean).map((path) => ({ path })),
          },
        },
      },
    }) as any);
    jornada.consultar.and.returnValue(of(progresso()));
    jornada.atualizarEtapa.and.returnValue(of(progresso({ etapaAtual: PRIMEIRO_PEDIDO_ETAPAS.item })));
    jornada.concluir.and.returnValue(of(progresso({ status: 'CONCLUIDO' })));
    graficaService.buscarPedidoComercial.and.returnValue(of({ id: 42, numero: 'PED-42', status: 'PENDENTE', total: 10, itens: [] }));

    TestBed.configureTestingModule({
      providers: [
        PrimeiroPedidoTutorialService,
        { provide: JornadaService, useValue: jornada },
        { provide: GraficaProdutoService, useValue: graficaService },
        { provide: TutorialService, useValue: tutorial },
        { provide: Router, useValue: router },
      ],
    });
    service = TestBed.inject(PrimeiroPedidoTutorialService);
  });

  it('inicia o tutorial pelo progresso em andamento e ignora estados finais', () => {
    tutorial.activeDefinition.and.returnValue(null);
    service.iniciarSeNecessario();

    expect(jornada.consultar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA);
    expect(tutorial.start).toHaveBeenCalledWith(jasmine.objectContaining({ id: PRIMEIRO_PEDIDO_TUTORIAL_ID }), 'menu');

    tutorial.start.calls.reset();
    jornada.consultar.and.returnValue(of(progresso({ status: 'CONCLUIDO' })));
    service.iniciarSeNecessario();

    expect(tutorial.start).not.toHaveBeenCalled();
  });

  it('nao reinicia a jornada ao recriar componente enquanto o tutorial ja esta ativo', () => {
    service.iniciarSeNecessario();

    expect(jornada.consultar).not.toHaveBeenCalled();
    expect(tutorial.start).not.toHaveBeenCalled();
  });

  it('mantem o passo de novo pedido aguardando o evento real da navegacao', () => {
    tutorial.activeDefinition.and.returnValue(null);

    service.iniciarSeNecessario();

    const definition = tutorial.start.calls.mostRecent().args[0];
    const novoPedidoStep = definition.steps.find((step) => step.id === 'lista');
    expect(novoPedidoStep).toEqual(jasmine.objectContaining({
      action: 'clickTarget',
      advanceOn: PRIMEIRO_PEDIDO_EVENTOS.novoPedido,
    }));
  });

  it('registra checkpoints semanticamente e avanca apenas quando o tutorial esta ativo', () => {
    service.registrarClienteSelecionado();

    expect(jornada.atualizarEtapa).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, PRIMEIRO_PEDIDO_ETAPAS.item, undefined);
    expect(tutorial.notify).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_EVENTOS.clienteSelecionado);

    tutorial.activeDefinition.and.returnValue(null);
    jornada.atualizarEtapa.calls.reset();
    tutorial.notify.calls.reset();

    service.registrarItemAdicionado();

    expect(jornada.atualizarEtapa).not.toHaveBeenCalled();
    expect(tutorial.notify).not.toHaveBeenCalled();
  });

  it('apos criar pedido leva para o kanban usando o id confirmado pelo backend', (done) => {
    service.registrarPedidoCriado({ tipo: 'PEDIDO', id: 42 }).subscribe((guiando) => {
      expect(guiando).toBeTrue();
      expect(jornada.atualizarEtapa).toHaveBeenCalledWith(
        PRIMEIRO_PEDIDO_JORNADA,
        PRIMEIRO_PEDIDO_ETAPAS.pedidoCriado,
        { pedidoId: 42 },
      );
      expect(tutorial.notify).not.toHaveBeenCalledWith(PRIMEIRO_PEDIDO_EVENTOS.pedidoCriado);
      expect(service.deveGuiarPedido({ id: 42, numero: 'PED-42', status: 'PENDENTE', total: 10 })).toBeTrue();
      done();
    });
  });

  it('retoma no passo de alternar para Kanban apos a lista carregar com o pedido criado', () => {
    service.retomarPedidoCriado(42);

    expect(graficaService.buscarPedidoComercial).toHaveBeenCalledWith(42);
    expect(tutorial.start).toHaveBeenCalledWith(jasmine.objectContaining({ id: PRIMEIRO_PEDIDO_TUTORIAL_ID }), 'kanban');
    expect(service.deveGuiarPedido({ id: 42, numero: 'PED-42', status: 'PENDENTE', total: 10 })).toBeTrue();
  });

  it('retoma pos-criacao pelo pedidoId persistido no contexto validando o pedido', () => {
    tutorial.activeDefinition.and.returnValue(null);
    jornada.consultar.and.returnValue(of(progresso({
      etapaAtual: PRIMEIRO_PEDIDO_ETAPAS.pedidoCriado,
      contexto: { pedidoId: 42 },
    })));

    service.iniciarSeNecessario();

    expect(graficaService.buscarPedidoComercial).toHaveBeenCalledWith(42);
    expect(tutorial.start).toHaveBeenCalledWith(jasmine.objectContaining({ id: PRIMEIRO_PEDIDO_TUTORIAL_ID }), 'kanban');
    expect(service.deveGuiarPedido({ id: 42, numero: 'PED-42', status: 'PENDENTE', total: 10 })).toBeTrue();
  });

  it('nao retoma pos-criacao sem id do pedido persistido e nao volta para criacao', () => {
    tutorial.activeDefinition.and.returnValue(null);
    jornada.consultar.and.returnValue(of(progresso({ etapaAtual: PRIMEIRO_PEDIDO_ETAPAS.pedidoCriado })));

    service.iniciarSeNecessario();

    expect(graficaService.buscarPedidoComercial).not.toHaveBeenCalled();
    expect(tutorial.stop).toHaveBeenCalled();
    expect(tutorial.start).not.toHaveBeenCalled();
    expect(service.aguardandoRetomadaComPedidoPersistido).toBeTrue();
  });

  it('bloqueia retomada quando o pedido persistido nao esta acessivel no tenant atual', () => {
    tutorial.activeDefinition.and.returnValue(null);
    graficaService.buscarPedidoComercial.and.returnValue(throwError(() => ({ status: 404 })));
    jornada.consultar.and.returnValue(of(progresso({
      etapaAtual: PRIMEIRO_PEDIDO_ETAPAS.kanban,
      contexto: { pedidoId: 99 },
    })));

    service.iniciarSeNecessario();

    expect(graficaService.buscarPedidoComercial).toHaveBeenCalledWith(99);
    expect(tutorial.stop).toHaveBeenCalled();
    expect(tutorial.start).not.toHaveBeenCalled();
    expect(service.deveGuiarPedido({ id: 99, numero: 'PED-99', status: 'PENDENTE', total: 10 })).toBeFalse();
  });

  it('apos mover o pedido guiado avanca para o passo final sem esconder o tutorial imediatamente', () => {
    service.registrarPedidoCriado({ tipo: 'PEDIDO', id: 7 }).subscribe();
    jornada.atualizarEtapa.calls.reset();

    service.registrarPedidoMovido({ id: 8, numero: 'PED-8', status: 'EM_PRODUCAO', total: 20 });
    expect(jornada.concluir).not.toHaveBeenCalled();

    service.registrarPedidoMovido({ id: 7, numero: 'PED-7', status: 'EM_PRODUCAO', total: 20 });

    expect(jornada.atualizarEtapa).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA, PRIMEIRO_PEDIDO_ETAPAS.movimentado, undefined);
    expect(jornada.concluir).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA);
    expect(tutorial.notify).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_EVENTOS.pedidoMovido);
    expect(tutorial.complete).not.toHaveBeenCalled();
  });

  it('mantem um passo final de confirmacao apos o movimento do kanban', () => {
    tutorial.activeDefinition.and.returnValue(null);

    service.iniciarSeNecessario();

    const definition = tutorial.start.calls.mostRecent().args[0];
    const movimentarIndex = definition.steps.findIndex((step) => step.id === 'movimentar');
    const conclusaoStep = definition.steps[movimentarIndex + 1];

    expect(conclusaoStep).toEqual(jasmine.objectContaining({
      id: 'conclusao',
      targetId: 'primeiro-pedido-kanban-card',
      actionLabel: 'Concluir',
      completion: true,
    }));
    expect(conclusaoStep.advanceOn).toBeUndefined();
  });
});

function progresso(overrides: Partial<JornadaProgressoResponse> = {}): JornadaProgressoResponse {
  return {
    jornada: 'PRIMEIRO_PEDIDO',
    versao: 1,
    status: 'EM_ANDAMENTO' as const,
    etapaAtual: PRIMEIRO_PEDIDO_ETAPAS.inicio,
    ...overrides,
  };
}
