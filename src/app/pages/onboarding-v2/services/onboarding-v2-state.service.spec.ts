import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { AuthService } from 'src/app/services/auth.service';
import { PrimeiroPedidoBoasVindasFlowService } from 'src/app/shared/boas-vindas-primeiro-pedido/primeiro-pedido-boas-vindas-flow.service';
import { OnboardingV2Service } from './onboarding-v2.service';
import { OnboardingV2StateService } from './onboarding-v2-state.service';

describe('OnboardingV2StateService', () => {
  let service: OnboardingV2StateService;
  let api: jasmine.SpyObj<OnboardingV2Service>;
  let auth: jasmine.SpyObj<AuthService>;
  let flow: PrimeiroPedidoBoasVindasFlowService;

  const usuario: Usuario = {
    id: 7,
    proprietario: true,
    empresa: { id: 10, nome: 'Grafica Azul', tipoEmpresa: TipoEmpresa.GRAFICA },
    perfil: { id: 1, nome: 'Proprietario', permissoes: [] },
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<OnboardingV2Service>('OnboardingV2Service', ['finishOnboarding']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['getUsuario']);

    api.finishOnboarding.and.returnValue(of({
      onboardingVersion: 'v2',
      status: 'finished',
      currentStep: 'summary',
      onboardingConcluido: true,
      empresa: { id: 10, nome: 'Grafica Azul' },
      produtosSugeridos: [],
      produtosCriados: [],
      quantidadeProdutosCriados: 0,
    }));
    auth.getUsuario.and.returnValue(usuario);

    TestBed.configureTestingModule({
      providers: [
        OnboardingV2StateService,
        PrimeiroPedidoBoasVindasFlowService,
        { provide: OnboardingV2Service, useValue: api },
        { provide: AuthService, useValue: auth },
      ],
    });

    service = TestBed.inject(OnboardingV2StateService);
    flow = TestBed.inject(PrimeiroPedidoBoasVindasFlowService);
  });

  afterEach(() => {
    flow.limparOnboardingConcluido(usuario);
    TestBed.resetTestingModule();
  });

  it('marca a conclusao do onboarding v2 no fluxo atual para liberar boas-vindas do primeiro pedido', (done) => {
    service.finishOnboarding().subscribe({
      next: () => {
        expect(flow.onboardingConcluidoNesteFluxo(usuario)).toBeTrue();
        done();
      },
      error: done.fail,
    });
  });
});
