import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { AppBoxedLoginComponent } from './boxed-login.component';

describe('AppBoxedLoginComponent — autenticação acessível', () => {
  let fixture: ComponentFixture<AppBoxedLoginComponent>;
  let component: AppBoxedLoginComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let router: Router;
  const element = <T extends HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector);
  const render = () => fixture.detectChanges();
  const valid = () => { component.form.setValue({ uname: 'marina@teste.com', password: 'Senha123!', lembrar: true }); render(); };

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['login', 'loginGoogle', 'getDefaultRouteForUsuario', 'clearSession']);
    toastr = jasmine.createSpyObj('ToastrService', ['error', 'warning']);
    auth.getDefaultRouteForUsuario.and.returnValue('/page/deposito');
    await TestBed.configureTestingModule({ imports: [AppBoxedLoginComponent], providers: [provideRouter([]), provideNoopAnimations(), { provide: AuthService, useValue: auth }, { provide: ToastrService, useValue: toastr }] }).compileComponents();
    router = TestBed.inject(Router);
    spyOn(router, 'navigateByUrl').and.resolveTo(true);
    fixture = TestBed.createComponent(AppBoxedLoginComponent);
    component = fixture.componentInstance;
    spyOn<any>(component, 'carregarGoogleScript').and.returnValue(Promise.resolve());
    render();
    await fixture.whenStable();
  });

  it('associa labels e teclado/autocomplete aos dois campos', () => {
    expect(element<HTMLInputElement>('#login-email').labels?.[0]?.textContent).toBe('E-mail');
    expect(element<HTMLInputElement>('#login-email').getAttribute('inputmode')).toBe('email');
    expect(element<HTMLInputElement>('#login-email').autocomplete).toBe('email');
    expect(element<HTMLInputElement>('#login-password').autocomplete).toBe('current-password');
    expect(element<HTMLFormElement>('form').querySelectorAll('input').length).toBe(3); // inclui checkbox
  });

  it('não autentica formulário vazio e foca o primeiro campo inválido', () => {
    element<HTMLButtonElement>('.auth-submit-btn').click(); render();
    expect(auth.login).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element('#login-email'));
    expect(fixture.nativeElement.textContent).toContain('E-mail é obrigatório.');
    expect(fixture.nativeElement.textContent).toContain('Senha é obrigatória.');
  });

  it('mantém validação de formato de e-mail e o foco do erro', () => {
    component.form.setValue({ uname: 'email-invalido', password: 'Senha123!', lembrar: false }); render();
    component.submit(); render();
    expect(auth.login).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(element('#login-email'));
    expect(fixture.nativeElement.textContent).toContain('Informe um e-mail válido.');
  });

  it('mostra e oculta senha sem mudar seu valor', () => {
    valid();
    element<HTMLButtonElement>('[aria-label="Mostrar senha"]').click(); render();
    expect(element<HTMLInputElement>('#login-password').type).toBe('text');
    expect(element('[aria-label="Ocultar senha"]').getAttribute('aria-pressed')).toBe('true');
    element<HTMLButtonElement>('[aria-label="Ocultar senha"]').click(); render();
    expect(element<HTMLInputElement>('#login-password').type).toBe('password');
    expect(component.form.value.password).toBe('Senha123!');
  });

  it('envia uma vez, preserva Manter conectado e bloqueia ambas as ações durante loading', () => {
    const response = new Subject<any>(); auth.login.and.returnValue(response); valid();
    element<HTMLFormElement>('form').dispatchEvent(new Event('submit', { cancelable: true })); render();
    component.submit(); component.handleGoogleClick();
    expect(auth.login).toHaveBeenCalledOnceWith('marina@teste.com', 'Senha123!', true);
    expect(element<HTMLButtonElement>('.auth-submit-btn').disabled).toBeTrue();
    expect(element<HTMLButtonElement>('.auth-google-btn').disabled).toBeTrue();
    expect(element<HTMLInputElement>('#login-email').readOnly).toBeTrue();
    expect(element('form').getAttribute('aria-busy')).toBe('true');
    expect(element('[role="status"]').textContent).toContain('Autenticação em andamento');
    response.next({ id: 7 }); response.complete(); render();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/deposito');
    expect(element<HTMLButtonElement>('.auth-submit-btn').disabled).toBeFalse();
  });

  it('mantém a mensagem original e libera nova tentativa após erro de autenticação', () => {
    auth.login.and.returnValue(throwError(() => ({ status: 401 }))); valid(); component.submit(); render();
    expect(element('[role="alert"]').textContent).toContain('E-mail ou senha inválidos');
    expect(toastr.error).toHaveBeenCalledWith('E-mail ou senha inválidos');
    expect(component.busy).toBeFalse();
    auth.login.and.returnValue(new Subject<any>()); component.submit(); render();
    expect(element('[role="alert"]')).toBeNull();
    expect(component.submitting).toBeTrue();
  });

  it('preserva tratamento de402 sem adicionar erro de senha', () => {
    auth.login.and.returnValue(throwError(() => ({ status: 402 }))); valid(); component.submit(); render();
    expect(toastr.error).not.toHaveBeenCalled();
    expect(element('[role="alert"]')).toBeNull();
    expect(component.busy).toBeFalse();
  });

  it('bloqueia envio por senha enquanto a preparação Google está em andamento', () => {
    valid(); component.googleLoading = true; component.submit(); render();
    expect(auth.login).not.toHaveBeenCalled();
    expect(element<HTMLButtonElement>('.auth-submit-btn').disabled).toBeTrue();
  });

  it('preserva token Google, sessão lembrada e destino retornado pela autenticação', () => {
    auth.loginGoogle.and.returnValue(of({ id: 7 } as any)); valid();
    (component as any).handleGoogleTokenResponse({ access_token: 'google-token-de-teste' }); render();
    expect(auth.loginGoogle).toHaveBeenCalledOnceWith({ accessToken: 'google-token-de-teste' }, true);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/page/deposito');
    expect(component.busy).toBeFalse();
  });

  it('exibe o erro do backend do Google sem prender loading', () => {
    auth.loginGoogle.and.returnValue(throwError(() => ({ error: { message: 'Conta indisponível' } })));
    (component as any).handleGoogleTokenResponse({ access_token: 'google-token-de-teste' }); render();
    expect(element('[role="alert"]').textContent).toContain('Conta indisponível');
    expect(component.busy).toBeFalse();
  });

  it('navega para cadastro com link real e limpeza de sessão uma única vez', () => {
    const link = element<HTMLAnchorElement>('.auth-switch a');
    expect(link.getAttribute('href')).toBe('/authentication/registro-gestor');
    link.click();
    expect(auth.clearSession).toHaveBeenCalledTimes(1);
    expect((router.navigateByUrl as jasmine.Spy).calls.count()).toBe(1);
    const tree = (router.navigateByUrl as jasmine.Spy).calls.mostRecent().args[0] as UrlTree;
    expect(router.serializeUrl(tree)).toBe('/authentication/registro-gestor');
  });

  it('mantém navegação modificada e link de recuperação acessível por teclado', () => {
    component.abrirCriacaoConta(new MouseEvent('click', { ctrlKey: true }));
    expect(auth.clearSession).not.toHaveBeenCalled();
    const link = element<HTMLAnchorElement>('.auth-options a');
    expect(link.href).toContain('/authentication/recuperar-senha');
    link.focus(); expect(document.activeElement).toBe(link);
    link.click();
    expect(router.serializeUrl((router.navigateByUrl as jasmine.Spy).calls.mostRecent().args[0])).toBe('/authentication/recuperar-senha');
  });
});
