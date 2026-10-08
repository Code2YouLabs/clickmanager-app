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
    finishedAt: '2026-10-08T10:00:00',
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
  });

  afterEach(() => TestBed.resetTestingModule());

  it('exibe para empresa grafica elegivel com onboarding v2 concluido e jornada nunca oferecida', fakeAsync(() => {
    service.avaliarEExibir(usuarioGrafica());
    tick();

    expect(dialog.open).toHaveBeenCalled();
    expect(jornada.consultar).toHaveBeenCalledWith(PRIMEIRO_PEDIDO_JORNADA);
  }));

  it('nao exibe para segmento incompativel, usuario sem permissao, empresa antiga ou onboarding pendente', fakeAsync(() => {
    auth.getTipoEmpresa.and.returnValue(TipoEmpresa.DEPOSITO);
    service.avaliarEExibir(usuarioGrafica());
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    auth.getTipoEmpresa.and.returnValue(TipoEmpresa.GRAFICA);
    auth.temPermissao.and.callFake((permissao: string) => permissao !== 'PEDIDOS_CADASTRAR');
    service.reset();
    service.avaliarEExibir(usuarioGrafica(11));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    auth.temPermissao.and.returnValue(true);
    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding({ onboardingVersion: 'legacy' })));
    service.reset();
    service.avaliarEExibir(usuarioGrafica(12));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding({ finishedAt: null })));
    service.reset();
    service.avaliarEExibir(usuarioGrafica(13));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding({ status: 'products_completed', onboardingConcluido: false, finishedAt: null })));
    service.reset();
    service.avaliarEExibir(usuarioGrafica(14));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('nao exibe para estados de jornada ja tratados', fakeAsync(() => {
    for (const status of ['EM_ANDAMENTO', 'CONCLUIDO', 'IGNORADO', 'ABANDONADO'] as const) {
      service.reset();
      jornada.consultar.and.returnValue(of(progressoJornada({ status })));
      service.avaliarEExibir(usuarioGrafica(20 + status.length));
      tick();
    }

    service.reset();
    jornada.consultar.and.returnValue(of(progressoJornada({ status: 'NAO_INICIADO', oferecidoEm: '2026-10-08T10:00:00' })));
    service.avaliarEExibir(usuarioGrafica(99));
    tick();

    expect(dialog.open).not.toHaveBeenCalled();
  }));

  it('nao duplica avaliacao ou modal para o mesmo usuario e empresa', fakeAsync(() => {
    const usuario = usuarioGrafica();

    service.avaliarEExibir(usuario);
    service.avaliarEExibir(usuario);
    tick();

    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(jornada.consultar).toHaveBeenCalledTimes(1);
  }));

  it('segmenta estado por empresa sem reutilizar resposta anterior', fakeAsync(() => {
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
    service.avaliarEExibir(usuarioGrafica());
    tick();

    auth.usuario$.next(null);

    expect(dialogRef.close).toHaveBeenCalled();
    service.avaliarEExibir(usuarioGrafica());
    tick();
    expect(jornada.consultar).toHaveBeenCalledTimes(2);
  }));

  it('nao abre modal quando consulta de onboarding ou jornada falha', fakeAsync(() => {
    onboarding.fetchProgress.and.returnValue(throwError(() => new Error('falha')));
    service.avaliarEExibir(usuarioGrafica(30));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();

    onboarding.fetchProgress.and.returnValue(of(progressoOnboarding()));
    jornada.consultar.and.returnValue(throwError(() => new Error('falha')));
    service.reset();
    service.avaliarEExibir(usuarioGrafica(31));
    tick();
    expect(dialog.open).not.toHaveBeenCalled();
  }));
});
