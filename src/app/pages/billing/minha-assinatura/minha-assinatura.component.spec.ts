import { ComponentFixture, TestBed } from '@angular/core/testing';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { ToastrService } from 'ngx-toastr';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { BillingAccessResponse } from 'src/app/models/billing-access.model';
import { BillingService } from '../services/billing.service';
import { BillingStateService } from '../services/billing-state.service';
import { MinhaAssinaturaComponent } from './minha-assinatura.component';

describe('MinhaAssinaturaComponent', () => {
  let fixture: ComponentFixture<MinhaAssinaturaComponent>;
  let component: MinhaAssinaturaComponent;
  let usuario$: Subject<any>;
  let billingService: jasmine.SpyObj<BillingService>;
  let billingState: jasmine.SpyObj<BillingStateService>;
  let router: Router;
  let toastr: jasmine.SpyObj<ToastrService>;

  const access: BillingAccessResponse = {
    allowed: true,
    warning: false,
    days: -4,
    expiresAt: '2026-10-03',
  };

  const resumoBase = {
    status: 'ATIVA',
    planoNome: 'Pro',
    planoCodigo: 'PRO',
    periodicidade: 'MENSAL',
    inicio: '2026-01-01',
    fim: null,
    emailCobranca: 'financeiro@clickmanager.com',
    valor: 99.9,
    moeda: 'BRL',
    clienteDesde: '2025-01-10',
    proximaCobrancaEm: '2026-10-03',
    gateway: 'Mercado Pago',
    beneficiosJson: '["Usuários ilimitados"]',
    limitesJson: '{"Produtos":100}',
    pagamentos: [
      { id: 1, valor: 20, status: 'APROVADO', criadoEm: '2026-09-29', confirmadoEm: '2026-09-29', referenciaExterna: 'aprovado-recente', invoiceUrl: 'https://pago.example' },
      { id: 2, valor: 10, status: 'PENDENTE', criadoEm: '2026-09-20', referenciaExterna: 'pendente-antigo', invoiceUrl: 'https://antigo.example' },
      { id: 3, valor: 30, status: 'PENDENTE', criadoEm: '2026-09-28', referenciaExterna: 'pendente-recente', invoiceUrl: 'https://recente.example' },
    ],
  };

  beforeAll(() => registerLocaleData(localePt));

  function setup(resumo: any = resumoBase): void {
    usuario$ = new Subject<any>();
    billingService = jasmine.createSpyObj<BillingService>('BillingService', ['resumoAssinatura', 'obterStatus']);
    billingState = jasmine.createSpyObj<BillingStateService>('BillingStateService', ['setFromResponse', 'formatDaysLabel']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['error']);

    billingService.resumoAssinatura.and.returnValue(of(resumo));
    billingService.obterStatus.and.returnValue(of(access));
    billingState.formatDaysLabel.and.callFake((days?: number | null) => {
      if (typeof days !== 'number') return null;
      if (days > 0) return `Venceu há ${days} dias`;
      if (days === 0) return 'Vence hoje';
      return `Vence em ${Math.abs(days)} dias`;
    });

    TestBed.configureTestingModule({
      imports: [MinhaAssinaturaComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { usuario$: usuario$.asObservable() } },
        { provide: BillingService, useValue: billingService },
        { provide: BillingStateService, useValue: billingState },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture = TestBed.createComponent(MinhaAssinaturaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function emitUsuario(proprietario = true): void {
    usuario$.next({ id: 7, proprietario });
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('bloqueia usuário não proprietário sem carregar dados de billing', () => {
    setup();

    emitUsuario(false);

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.textContent).toContain('Somente o proprietário pode visualizar os dados da assinatura.');
    expect(billingService.resumoAssinatura).not.toHaveBeenCalled();
    expect(billingService.obterStatus).not.toHaveBeenCalled();
  });

  it('carrega resumo e status uma única vez para emissões equivalentes do proprietário', () => {
    setup();

    emitUsuario(true);
    emitUsuario(true);

    expect(billingService.resumoAssinatura).toHaveBeenCalledTimes(1);
    expect(billingService.obterStatus).toHaveBeenCalledTimes(1);
    expect(billingState.setFromResponse).toHaveBeenCalledOnceWith(access);
    expect(fixture.nativeElement.textContent).toContain('Minha assinatura');
    expect(fixture.nativeElement.textContent).toContain('Recursos do plano');
    expect(fixture.nativeElement.textContent).toContain('Histórico de pagamentos');
  });

  it('mostra erro com retry sem navegar automaticamente', () => {
    setup();
    billingService.resumoAssinatura.and.returnValues(throwError(() => new Error('falha')), of(resumoBase));

    emitUsuario(true);
    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar a assinatura.');
    expect(router.navigate).not.toHaveBeenCalled();

    component.carregarResumo();
    fixture.detectChanges();

    expect(billingService.resumoAssinatura).toHaveBeenCalledTimes(2);
    expect(billingService.obterStatus).toHaveBeenCalledTimes(2);
    expect(component.error).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Pro');
  });

  it('preserva tolerância para JSON inválido de recursos do plano', () => {
    setup({ ...resumoBase, beneficiosJson: '{invalido', limitesJson: '{tambem-invalido' });

    emitUsuario(true);

    expect(component.beneficios).toEqual([]);
    expect(component.limites).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('Nenhuma informação adicional.');
  });

  it('ordena pagamentos pendentes primeiro e depois por criação decrescente', () => {
    setup();

    emitUsuario(true);

    expect(component.pagamentos.map(p => p.referenciaExterna)).toEqual([
      'pendente-recente',
      'pendente-antigo',
      'aprovado-recente',
    ]);
  });

  it('restringe link de cobrança a pagamentos pendentes e abre com noopener', () => {
    setup();
    spyOn(window, 'open');

    emitUsuario(true);

    expect(component.podeAbrirCobranca(component.pagamentos[0])).toBeTrue();
    expect(component.podeAbrirCobranca(component.pagamentos[2])).toBeFalse();

    component.abrirLink(component.pagamentos[0].invoiceUrl);
    expect(window.open).toHaveBeenCalledOnceWith('https://recente.example', '_blank', 'noopener,noreferrer');
  });
});
