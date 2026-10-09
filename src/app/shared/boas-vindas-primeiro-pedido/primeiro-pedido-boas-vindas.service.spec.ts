import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, Observable, Subject, of, throwError } from 'rxjs';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { OnboardingV2Service } from 'src/app/pages/onboarding-v2/services/onboarding-v2.service';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { PRIMEIRO_PEDIDO_JORNADA } from '../jornadas/jornada.constants';
import { JornadaProgressoResponse } from '../jornadas/jornada.models';
import { JornadaService } from '../jornadas/jornada.service';
import { PrimeiroPedidoBoasVindasFlowService } from './primeiro-pedido-boas-vindas-flow.service';
import { PrimeiroPedidoBoasVindasService } from './primeiro-pedido-boas-vindas.service';

describe('PrimeiroPedidoBoasVindasService', () => {
  let service: PrimeiroPedidoBoasVindasService;
  let auth: {
    usuario$: BehaviorSubject<Usuario | null>;
    getTipoEmpresa: jasmine.Spy;
    temPermissao: jasmine.Spy;
  };
  let onboarding: jasmine.SpyObj<OnboardingV2Service>;
  let jornada: jasmine.SpyObj<JornadaService>;
  let featureFlag: jasmine.SpyObj<FeatureFlagService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let flow: PrimeiroPedidoBoasVindasFlowService;
  let afterClosed$: Subject<unknown>;
  let dialogRef: { afterClosed: () => Observable<unknown>; close: jasmine.Spy };

  const usuarioGrafica = (empresaId = 10, usuarioId = 7): Usuario => ({
    id: usuarioId,
    proprietario: true,
    empresa: { id: empresaId, nome: 'Grafica Azul', tipoEmpresa: TipoEmpresa.GRAFICA },
    perfil: { id: 1, nome: 'Proprietario', permissoes: [] },
  });

  const progressoOnboarding = (overrides: Record<string, unknown> = {}) => ({
    onboardingVersion: 'v2',
    status: 'finished',
    currentStep: 'summary',
    onboardingConcluido: true,
    empresa: { id: 10, nome: 'Grafica Azul' },
    produtosSugeridos: [],
    produtosCriados: [],
    quantidadeProdutosCriados: 0,
    ...overrides,
  } as any);

  const progressoJornada = (overrides: Partial<JornadaProgressoResponse> = {}): JornadaProgressoResponse => ({
    jornada: PRIMEIRO_PEDIDO_JORNADA.chave,
    versao: PRIMEIRO_PEDIDO_JORNADA.versao,
    status: 'NAO_INICIADO',
    oferecidoEm: null,
    ...overrides,
  });

  beforeEach(() => {
    auth = {
      usuario$: new BehaviorSubject<Usuario | null>(null),
      getTipoEmpresa: jasmine.createSpy('getTipoEmpresa').and.callFake((usuario: Usuario) => usuario.empresa?.tipoEmpresa ?? TipoEmpresa.GRAFICA),
      temPermissao: jasmine.createSpy('temPermissao').and.returnValue(true),
    };
    onboarding = jasmine.createSpyObj<OnboardingV2Service>('OnboardingV2Service', ['fetchProgress']);
    jornada = jasmine.createSpyObj<JornadaService>('JornadaService', ['consultar']);
    featureFlag = jasmine.createSpyObj<FeatureFlagService>('FeatureFlagService', ['carregar', 'isEnabled']);
    afterClosed$ = new Subject<unknown>();
    dialogRef = { afterClosed: () => afterClosed$.asObservable(), close: jasmine.createSpy('close') };
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue(dialogRef as any);

    featureFlag.carregar.and.returnValue(of({ GRAFICA: true }));
    featureFlag.isEnabled.and.returnValue(true);
    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding()));
    jornada.consultar.and.returnValue(of(progressoJornada()));

    TestBed.configureTestingModule({
      providers: [
        PrimeiroPedidoBoasVindasService,
        { provide: AuthService, useValue: auth },
        { provide: OnboardingV2Service, useValue: onboarding },
        { provide: JornadaService, useValue: jornada },
        { provide: FeatureFlagService, useValue: featureFlag },
        { provide: MatDialog, useValue: dialog },
      ],
    });

    service = TestBed.inject(PrimeiroPedidoBoasVindasService);
    flow = TestBed.inject(PrimeiroPedidoBoasVindasFlowService);
  });

  afterEach(() => {
    limparMarcadores();
    TestBed.resetTestingModule();
  });

  it('exibe para empresa nova que concluiu onboarding v2 no fluxo atual e tem jornada nunca oferecida', fakeAsync(() => {
    const usuario = usuarioGrafica();
    flow.marcarOnboardingConcluido(usuario);

    service.avaliarEExibir(usuario);
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(jornada.consultar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA);
  }));

  it('abre o modal com largura de boas-vindas responsiva', fakeAsync(() => {
    const usuario = usuarioGrafica();
    flow.marcarOnboardingConcluido(usuario);

    service.avaliarEExibir(usuario);
    tick();

    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      width: '740px',
      maxWidth: 'calc(100vw - 32px)',
      panelClass: 'primeiro-pedido-welcome-dialog',
    }));
  }));

  it('nao exibe para empresa antiga que ja aparece com onboarding v2 concluido', fakeAsync(() => {
    service.avaliarEExibir(usuarioGrafica());
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(onboarding.fetchProgress).not.toHaveBeenCalled();
    expect(jornada.consultar).not.toHaveBeenCalled();
  }));

  it('permite reavaliar quando a primeira avaliacao ocorreu antes da conclusao do onboarding no fluxo', fakeAsync(() => {
    const usuario = usuarioGrafica();

    service.avaliarEExibir(usuario);
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    flow.marcarOnboardingConcluido(usuario);
    service.avaliarEExibir(usuario);
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(jornada.consultar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA);
  }));

  it('nao exibe para segmento incompativel, usuario sem permissao, onboarding legado ou onboarding pendente', fakeAsync(() => {
    flow.marcarOnboardingConcluido(usuarioGrafica());
    auth.getTipoEmpresa.and.returnValue(TipoEmpresa.DEPOSITO);
    service.avaliarEExibir(usuarioGrafica());
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    auth.getTipoEmpresa.and.returnValue(TipoEmpresa.GRAFICA);
    auth.temPermissao.and.callFake((permissao: string) => permissao !== 'PEDIDOS_CADASTRAR');
    service.reset();
    flow.marcarOnboardingConcluido(usuarioGrafica(11));
    service.avaliarEExibir(usuarioGrafica(11));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    auth.temPermissao.and.returnValue(true);
    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding({ onboardingVersion: 'legacy' })));
    service.reset();
    flow.marcarOnboardingConcluido(usuarioGrafica(12));
    service.avaliarEExibir(usuarioGrafica(12));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding({ status: 'products_completed', onboardingConcluido: false })));
    service.reset();
    flow.marcarOnboardingConcluido(usuarioGrafica(14));
    service.avaliarEExibir(usuarioGrafica(14));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('nao exibe para estados de jornada ja tratados', fakeAsync(() => {
    for (const status of ['EM_ANDAMENTO', 'CONCLUIDO', 'IGNORADO', 'ABANDONADO'] as const) {
      const usuario = usuarioGrafica(20 + status.length);
      service.reset();
      flow.marcarOnboardingConcluido(usuario);
      jornada.consultar.and.returnValue(of(progressoJornada({ status })));
      service.avaliarEExibir(usuario);
      tick();
    }

    const usuarioOferecido = usuarioGrafica(99);
    service.reset();
    flow.marcarOnboardingConcluido(usuarioOferecido);
    jornada.consultar.and.returnValue(of(progressoJornada({ status: 'NAO_INICIADO', oferecidoEm: '2026-10-08T10:00:00' })));
    service.avaliarEExibir(usuarioOferecido);
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('nao repete para nova empresa apos convite ja oferecido', fakeAsync(() => {
    const usuario = usuarioGrafica(88);
    flow.marcarOnboardingConcluido(usuario);
    jornada.consultar.and.returnValue(of(progressoJornada({ status: 'NAO_INICIADO', oferecidoEm: '2026-10-08T10:00:00' })));

    service.avaliarEExibir(usuario);
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('nao exibe para empresa antiga sem registro em jornada_progresso', fakeAsync(() => {
    jornada.consultar.and.returnValue(of(progressoJornada()));

    service.avaliarEExibir(usuarioGrafica(77));
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
    expect(jornada.consultar).not.toHaveBeenCalled();
  }));

  it('nao duplica avaliacao ou modal para o mesmo usuario e empresa', fakeAsync(() => {
    const usuario = usuarioGrafica();
    flow.marcarOnboardingConcluido(usuario);

    service.avaliarEExibir(usuario);
    service.avaliarEExibir(usuario);
    tick();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(jornada.consultar).toHaveBeenCalledTimes(1);
  }));

  it('segmenta estado por empresa sem reutilizar resposta anterior', fakeAsync(() => {
    flow.marcarOnboardingConcluido(usuarioGrafica(1));
    flow.marcarOnboardingConcluido(usuarioGrafica(2));
    jornada.consultar.and.returnValues(
      of(progressoJornada({ oferecidoEm: '2026-10-08T10:00:00' })),
      of(progressoJornada()),
    );

    service.avaliarEExibir(usuarioGrafica(1));
    tick();
    service.avaliarEExibir(usuarioGrafica(2));
    tick();

    expect(jornada.consultar).toHaveBeenCalledTimes(2);
    expect(dialog.open).toHaveBeenCalledTimes(1);
  }));

  it('fecha modal e limpa cache transitorio ao logout', fakeAsync(() => {
    const usuario = usuarioGrafica();
    flow.marcarOnboardingConcluido(usuario);
    service.avaliarEExibir(usuario);
    tick();

    auth.usuario$.next(null);

    expect(dialogRef.close).toHaveBeenCalled();
    service.avaliarEExibir(usuario);
    tick();
    expect(jornada.consultar).toHaveBeenCalledTimes(2);
  }));

  it('nao abre modal quando consulta de onboarding ou jornada falha', fakeAsync(() => {
    flow.marcarOnboardingConcluido(usuarioGrafica(30));
    onboarding.fetchProgress.and.returnValue(throwError(() => new Error('falha')));
    service.avaliarEExibir(usuarioGrafica(30));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding()));
    jornada.consultar.and.returnValue(throwError(() => new Error('falha')));
    service.reset();
    flow.marcarOnboardingConcluido(usuarioGrafica(31));
    service.avaliarEExibir(usuarioGrafica(31));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();
  }));

  function limparMarcadores(): void {
    Object.keys(sessionStorage)
      .filter((key) => key.startsWith('clickmanager.primeiro-pedido.boas-vindas.onboarding-concluido'))
      .forEach((key) => sessionStorage.removeItem(key));
  }
});
