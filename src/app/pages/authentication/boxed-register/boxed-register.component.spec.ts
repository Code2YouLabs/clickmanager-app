import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { OnboardingV2Service } from 'src/app/pages/onboarding-v2/services/onboarding-v2.service';
import { OnboardingV2StateService } from 'src/app/pages/onboarding-v2/services/onboarding-v2-state.service';
import { LandingpagePublicService } from 'src/app/pages/theme-pages/landingpage/landingpage-public.service';
import { AppBoxedRegisterComponent } from './boxed-register.component';

describe('AppBoxedRegisterComponent — cadastro acessível', () => {
  let fixture: ComponentFixture<AppBoxedRegisterComponent>;
  let component: AppBoxedRegisterComponent;
  let service: jasmine.SpyObj<OnboardingV2Service>;
  let state: jasmine.SpyObj<OnboardingV2StateService>;
  let auth: jasmine.SpyObj<AuthService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: Router;
  const element = <T extends HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector);
  const render = () => fixture.detectChanges();
  const valid = () => { component.usuario.setValue({ nome: 'Marina Costa', email: 'marina@teste.com', senha: 'Senha123!', confirmarSenha: 'Senha123!' }); render(); };
  const tokens = { accessToken: 'access-de-teste', refreshToken: 'refresh-de-teste', tokenType: 'Bearer' };
  const progress = { status: 'started', currentStep: 'company', onboardingConcluido: false } as any;

  beforeEach(async () => {
    service = jasmine.createSpyObj('OnboardingV2Service', ['registerEmpresa', 'registerEmpresaGoogle']);
    state = jasmine.createSpyObj('OnboardingV2StateService', ['refreshProgress']);
    auth = jasmine.createSpyObj('AuthService', ['autenticarComTokens', 'login']);
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'warning', 'success']);
    const landing = jasmine.createSpyObj('LandingpagePublicService', ['registrarEtapa']); landing.registrarEtapa.and.returnValue(of({}));
    state.refreshProgress.and.returnValue(of(progress)); auth.autenticarComTokens.and.returnValue(of({} as any)); auth.login.and.returnValue(of({} as any));
    await TestBed.configureTestingModule({ imports: [AppBoxedRegisterComponent], providers: [provideRouter([]), provideNoopAnimations(), { provide: OnboardingV2Service, useValue: service }, { provide: OnboardingV2StateService, useValue: state }, { provide: AuthService, useValue: auth }, { provide: ToastrService, useValue: toastr }, { provide: LandingpagePublicService, useValue: landing }] }).compileComponents();
    router = TestBed.inject(Router); spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(AppBoxedRegisterComponent); component = fixture.componentInstance;
    spyOn<any>(component, 'carregarGoogleScript').and.returnValue(Promise.resolve()); render(); await fixture.whenStable();
  });

  it('mantém quatro campos e suas associações/autocomplete/teclado', () => {
    expect(element('form').querySelectorAll('input').length).toBe(4);
    for (const id of ['register-name', 'register-email', 'register-password', 'register-confirm-password']) expect(element<HTMLInputElement>('#' + id).labels?.length).toBe(1);
    expect(element<HTMLInputElement>('#register-name').autocomplete).toBe('name');
    expect(element('#register-email').getAttribute('inputmode')).toBe('email');
    expect(element<HTMLInputElement>('#register-confirm-password').autocomplete).toBe('new-password');
  });

  it('impede registro vazio, mostra validações e foca nome', () => {
    element<HTMLButtonElement>('.auth-submit-btn').click(); render();
    expect(service.registerEmpresa).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element('#register-name'));
    expect(fixture.nativeElement.textContent).toContain('Informe seu nome.');
    expect(fixture.nativeElement.textContent).toContain('Repita a senha.');
  });

  it('preserva mínimo de seis caracteres do nome e senha e formato do e-mail', () => {
    component.usuario.setValue({ nome: 'Ana', email: 'email-invalido', senha: '123', confirmarSenha: '123' }); render(); component.submit(); render();
    expect(component.usuarioNomeControl.hasError('minlength')).toBeTrue();
    expect(component.usuarioEmailControl.hasError('email')).toBeTrue();
    expect(component.usuarioSenhaControl.hasError('minlength')).toBeTrue();
    expect(service.registerEmpresa).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('O nome deve ter no mínimo 6 caracteres.');
  });

  it('anuncia comparação de senhas pelo Material e foca confirmação sem mudar validators', () => {
    valid(); component.usuarioConfirmarSenhaControl.setValue('OutraSenha!'); render(); component.submit(); render();
    expect(service.registerEmpresa).not.toHaveBeenCalled();
    expect(component.usuarioConfirmarSenhaControl.valid).toBeTrue();
    expect(element('#register-confirm-password').getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(element('#register-confirm-password'));
    expect(fixture.nativeElement.textContent).toContain('As senhas não coincidem.');
    const described = element('#register-confirm-password').getAttribute('aria-describedby');
    expect(described).toBeTruthy();
    expect(fixture.nativeElement.querySelector('#' + described)?.textContent).toContain('As senhas não coincidem.');
  });

  it('mostra/oculta ambas as senhas independentemente', () => {
    valid(); element<HTMLButtonElement>('[aria-label="Mostrar senha"]').click(); render();
    expect(element<HTMLInputElement>('#register-password').type).toBe('text');
    expect(element<HTMLInputElement>('#register-confirm-password').type).toBe('password');
    element<HTMLButtonElement>('[aria-label="Mostrar confirmação de senha"]').click(); render();
    expect(element<HTMLInputElement>('#register-confirm-password').type).toBe('text');
    element<HTMLButtonElement>('[aria-label="Ocultar senha"]').click(); render();
    expect(element<HTMLInputElement>('#register-password').type).toBe('password');
    expect(component.usuarioSenhaControl.value).toBe('Senha123!');
  });

  it('permite Enter nativo no botão de visibilidade', () => {
    const button = element<HTMLButtonElement>('[aria-label="Mostrar senha"]');
    const event = new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }); button.dispatchEvent(event);
    expect(event.defaultPrevented).toBeFalse();
    expect(service.registerEmpresa).not.toHaveBeenCalled();
  });

  it('Enter avança entre campos e submete uma vez no último', () => {
    const response = new Subject<any>(); service.registerEmpresa.and.returnValue(response); valid();
    element<HTMLInputElement>('#register-name').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(document.activeElement).toBe(element('#register-email'));
    const last = element<HTMLInputElement>('#register-confirm-password');
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); render();
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    expect(service.registerEmpresa).toHaveBeenCalledTimes(1);
    expect(element<HTMLButtonElement>('.auth-submit-btn').disabled).toBeTrue();
    expect(element<HTMLButtonElement>('.auth-google-btn').disabled).toBeTrue();
    expect(element('[role="status"]').textContent).toContain('Cadastro em andamento');
  });

  it('Enter inválido no último campo apresenta erro e não chama API', () => {
    element<HTMLInputElement>('#register-confirm-password').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true })); render();
    expect(service.registerEmpresa).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element('#register-name'));
  });

  it('preserva payload, autenticação por tokens e redirecionamento do onboarding', () => {
    service.registerEmpresa.and.returnValue(of(tokens as any)); valid(); component.submit(); render();
    expect(service.registerEmpresa).toHaveBeenCalledOnceWith({ empresa: { nome: 'Empresa de Marina Costa', tipoEmpresa: TipoEmpresa.GRAFICA, email: 'marina@teste.com' }, usuario: { nome: 'Marina Costa', username: 'marina@teste.com', senha: 'Senha123!' } });
    expect(auth.autenticarComTokens).toHaveBeenCalledOnceWith(tokens);
    expect(auth.login).not.toHaveBeenCalled();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/empresa');
    expect(toastr.success).toHaveBeenCalledWith('Conta criada. Complete a configuração inicial.');
    expect(component.busy).toBeFalse();
  });

  it('mantém login de fallback quando cadastro não retorna tokens', () => {
    service.registerEmpresa.and.returnValue(of({} as any)); valid(); component.submit();
    expect(auth.login).toHaveBeenCalledOnceWith('marina@teste.com', 'Senha123!');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/empresa');
  });

  it('segue o passo devolvido pelo backend sem alterar onboarding', () => {
    service.registerEmpresa.and.returnValue(of(tokens as any)); state.refreshProgress.and.returnValue(of({ ...progress, status: 'products_completed', currentStep: 'products' })); valid(); component.submit();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/resumo');
  });

  it('exibe erro do backend, mantém dados e libera tentativa seguinte', () => {
    service.registerEmpresa.and.returnValue(throwError(() => ({ error: { message: 'E-mail já cadastrado' } }))); valid(); component.submit(); render();
    expect(element('[role="alert"]').textContent).toContain('Erro ao concluir cadastro: E-mail já cadastrado');
    expect(component.usuarioEmailControl.value).toBe('marina@teste.com');
    expect(component.busy).toBeFalse();
    service.registerEmpresa.and.returnValue(new Subject<any>()); component.submit(); render();
    expect(element('[role="alert"]')).toBeNull();
  });

  it('preserva registro Google e tokens sem criar outro payload de conta', () => {
    service.registerEmpresaGoogle.and.returnValue(of(tokens as any));
    (component as any).handleGoogleTokenResponse({ access_token: 'google-token-de-teste' }); render();
    expect(service.registerEmpresaGoogle).toHaveBeenCalledOnceWith({ accessToken: 'google-token-de-teste' });
    expect(service.registerEmpresa).not.toHaveBeenCalled();
    expect(auth.autenticarComTokens).toHaveBeenCalledWith(tokens);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding-v2/empresa');
    expect(component.busy).toBeFalse();
  });

  it('bloqueia cadastro por senha durante Google e anuncia erro Google do backend', () => {
    valid(); component.googleLoading = true; component.submit(); expect(service.registerEmpresa).not.toHaveBeenCalled();
    component.googleLoading = false; service.registerEmpresaGoogle.and.returnValue(throwError(() => ({ error: { message: 'Cadastro indisponível' } })));
    (component as any).handleGoogleTokenResponse({ access_token: 'google-token-de-teste' }); render();
    expect(element('[role="alert"]').textContent).toContain('Erro ao entrar com Google: Cadastro indisponível');
    expect(component.busy).toBeFalse();
  });

  it('mantém o link real para voltar ao login', () => {
    const link = element<HTMLAnchorElement>('.auth-switch a'); expect(link.getAttribute('href')).toBe('/authentication/login');
    link.click(); expect(router.serializeUrl((router.navigateByUrl as jasmine.Spy).calls.mostRecent().args[0])).toBe('/authentication/login');
  });
});
