import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CoreService } from 'src/app/services/core.service';
import {
  FormGroup,
  FormControl,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MaterialModule } from '../../../material.module';
import { BrandingComponent } from '../../../layouts/full/vertical/sidebar/branding.component';
import { ToastrService } from 'ngx-toastr';
import { LandingEtapaFunil, LandingpagePublicService } from 'src/app/pages/theme-pages/landingpage/landingpage-public.service';
import { AuthService } from 'src/app/services/auth.service';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { OnboardingV2RegisterResponse, resolveOnboardingV2RouteFromProgress } from 'src/app/pages/onboarding-v2/models/onboarding-v2.models';
import { OnboardingV2Service } from 'src/app/pages/onboarding-v2/services/onboarding-v2.service';
import { OnboardingV2StateService } from 'src/app/pages/onboarding-v2/services/onboarding-v2-state.service';
import { switchMap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: GoogleTokenClientConfig) => GoogleTokenClient;
        };
      };
    };
  }
}

type GoogleTokenClient = {
  requestAccessToken: () => void;
};

type GoogleTokenClientConfig = {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void;
  prompt?: '' | 'consent' | 'select_account';
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

@Component({
  selector: 'app-boxed-register',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    BrandingComponent,
  ],
  templateUrl: './boxed-register.component.html',
  styleUrl: './boxed-register.component.scss',
})
export class AppBoxedRegisterComponent implements OnInit, AfterViewInit {
  private readonly landingSessionStorageKey = 'clickmanager:landing:session-id';
  private readonly landingStageStoragePrefix = 'clickmanager:landing:stage';
  private readonly pageTitle = 'Cadastro de Empresa';
  private sessionId = '';
  private readonly tipoEmpresa = TipoEmpresa.GRAFICA;
  private googleTokenClient?: GoogleTokenClient;
  submitting = false;
  googleLoading = false;
  showPassword = false;
  showConfirmPassword = false;

  @ViewChild('registerCard', { read: ElementRef }) registerCard?: ElementRef<HTMLElement>;

  options = this.settings.getOptions();

  constructor(
    private settings: CoreService,
    private router: Router,
    private toastr: ToastrService,
    private onboardingV2Service: OnboardingV2Service,
    private onboardingV2State: OnboardingV2StateService,
    private landingpagePublicService: LandingpagePublicService,
    private authService: AuthService
  ) { }

  form = new FormGroup({
    usuario: new FormGroup({
      nome: new FormControl<string | null>('', [Validators.required, Validators.minLength(6)]),
      email: new FormControl<string | null>('', [Validators.required, Validators.email]),
      senha: new FormControl<string | null>('', [Validators.required, Validators.minLength(6)]),
      confirmarSenha: new FormControl<string | null>('', [Validators.required]),
    }),
  });

  ngOnInit(): void {
    this.sessionId = this.ensureSessionId();
    this.registrarEtapaFunil('FORMULARIO_VISUALIZADO');
  }

  ngAfterViewInit(): void {
    if (!environment.googleClientId) {
      return;
    }

    this.carregarGoogleScript()
      .then(() => this.inicializarGoogleClient())
      .catch(() => undefined);
  }

  get usuario(): FormGroup {
    return this.form.get('usuario') as FormGroup;
  }

  get usuarioNomeControl(): FormControl {
    return this.usuario.get('nome') as FormControl;
  }

  get usuarioEmailControl(): FormControl {
    return this.usuario.get('email') as FormControl;
  }

  get usuarioSenhaControl(): FormControl {
    return this.usuario.get('senha') as FormControl;
  }

  get usuarioConfirmarSenhaControl(): FormControl {
    return this.usuario.get('confirmarSenha') as FormControl;
  }

  get senhaDivergente(): boolean {
    const senha = this.usuarioSenhaControl.value;
    const confirmarSenha = this.usuarioConfirmarSenhaControl.value;
    return !!senha && !!confirmarSenha && senha !== confirmarSenha;
  }

  get formPronto(): boolean {
    return this.form.valid && !this.senhaDivergente;
  }

  get ctaLabel(): string {
    return this.submitting ? 'Criando sua conta...' : 'Começar agora';
  }

  handleEnter(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (!target || target.tagName === 'TEXTAREA') {
      return;
    }

    event.preventDefault();

    const focusables = Array.from(
      this.registerCard?.nativeElement.querySelectorAll<HTMLInputElement | HTMLButtonElement>(
        'form input, form button[type="submit"]'
      ) ?? []
    ).filter(element => !element.disabled && element.offsetParent !== null);

    const currentIndex = focusables.indexOf(target as HTMLInputElement);
    const nextElement = focusables[currentIndex + 1];

    if (nextElement) {
      nextElement.focus();
      return;
    }

    if (this.formPronto && !this.submitting) {
      this.submit();
    }
  }

  submit() {
    if (this.submitting) {
      return;
    }

    if (this.form.invalid || this.senhaDivergente) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.value;

    const usuario = raw.usuario!;
    const nomeUsuario = String(usuario.nome || '').trim();
    const emailUsuario = String(usuario.email || '').trim();

    const payload = {
      empresa: {
        nome: this.nomeEmpresaProvisorio(nomeUsuario, emailUsuario),
        tipoEmpresa: this.tipoEmpresa,
        email: emailUsuario,
      },
      usuario: {
        nome: nomeUsuario,
        username: emailUsuario,
        senha: usuario.senha!,
      },
    };

    this.submitting = true;

    this.onboardingV2Service.registerEmpresa(payload).pipe(
      switchMap((response) => this.autenticarAposCadastro(response, emailUsuario, usuario.senha!)),
      switchMap(() => this.onboardingV2State.refreshProgress())
    ).subscribe({
      next: response => {
        this.registrarEtapaFunil('FORMULARIO_CONCLUIDO');
        this.resetFunilSession();
        this.toastr.success('Conta criada. Complete a configuração inicial.');
        this.submitting = false;
        this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(response));
      },
      error: err => {
        this.submitting = false;
        const msg = err?.error?.message || err?.message || 'Erro desconhecido';
        this.toastr.error('Erro ao concluir cadastro: ' + msg);
      }
    });
  }

  handleGoogleClick(): void {
    if (this.submitting || this.googleLoading) {
      return;
    }

    if (!environment.googleClientId) {
      this.toastr.warning('Configure o Google Client ID para habilitar esse cadastro.');
      return;
    }

    this.googleLoading = true;

    this.carregarGoogleScript()
      .then(() => {
        this.inicializarGoogleClient();

        if (!this.googleTokenClient) {
          throw new Error('Google Identity Services não carregou.');
        }

        this.googleTokenClient.requestAccessToken();
        this.googleLoading = false;
      })
      .catch(() => {
        this.googleLoading = false;
        this.toastr.error('Não foi possível abrir o login do Google.');
      });
  }

  private inicializarGoogleClient(): void {
    if (!environment.googleClientId || !window.google?.accounts?.oauth2 || this.googleTokenClient) {
      return;
    }

    this.googleTokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: environment.googleClientId,
      scope: 'openid email profile',
      prompt: 'select_account',
      callback: (response) => this.handleGoogleTokenResponse(response),
    });
  }

  private carregarGoogleScript(): Promise<void> {
    if (window.google?.accounts?.oauth2) {
      return Promise.resolve();
    }

    const existingScript = document.getElementById('google-identity-services');
    if (existingScript) {
      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(), 5000);
        const resolveWhenReady = () => {
          window.clearTimeout(timeout);
          resolve();
        };

        if (window.google?.accounts?.oauth2) {
          resolveWhenReady();
          return;
        }

        existingScript.addEventListener('load', resolveWhenReady, { once: true });
        existingScript.addEventListener('error', () => {
          window.clearTimeout(timeout);
          reject();
        }, { once: true });
      });
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.id = 'google-identity-services';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.head.appendChild(script);
    });
  }

  private handleGoogleTokenResponse(response: GoogleTokenResponse): void {
    const accessToken = response?.access_token;

    if (response?.error || !accessToken || this.submitting) {
      this.googleLoading = false;
      if (response?.error) {
        this.toastr.error('Não foi possível entrar com Google.');
      }
      return;
    }

    this.submitting = true;
    this.googleLoading = true;

    this.onboardingV2Service.registerEmpresaGoogle({ accessToken }).pipe(
      switchMap((registerResponse) => this.autenticarAposCadastroGoogle(registerResponse)),
      switchMap(() => this.onboardingV2State.refreshProgress())
    ).subscribe({
      next: progress => {
        this.registrarEtapaFunil('FORMULARIO_CONCLUIDO');
        this.resetFunilSession();
        this.toastr.success('Conta criada. Complete a configuração inicial.');
        this.submitting = false;
        this.googleLoading = false;
        this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(progress));
      },
      error: err => {
        this.submitting = false;
        this.googleLoading = false;
        const msg = err?.error?.message || err?.message || 'Erro desconhecido';
        this.toastr.error('Erro ao entrar com Google: ' + msg);
      }
    });
  }

  private autenticarAposCadastro(
    response: OnboardingV2RegisterResponse,
    username: string,
    senha: string
  ) {
    if (response?.accessToken && response?.refreshToken) {
      return this.authService.autenticarComTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType ?? undefined,
      });
    }

    return this.authService.login(username, senha);
  }

  private autenticarAposCadastroGoogle(response: OnboardingV2RegisterResponse) {
    if (response?.accessToken && response?.refreshToken) {
      return this.authService.autenticarComTokens({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        tokenType: response.tokenType ?? undefined,
      });
    }

    throw new Error('O backend não retornou os tokens de acesso do Google.');
  }

  private nomeEmpresaProvisorio(nomeUsuario: string, emailUsuario: string): string {
    if (nomeUsuario) {
      return `Empresa de ${nomeUsuario}`;
    }

    const emailPrefix = emailUsuario.split('@')[0]?.trim();
    return emailPrefix ? `Empresa de ${emailPrefix}` : 'Minha empresa';
  }

  private registrarEtapaFunil(etapaFunil: LandingEtapaFunil, onComplete?: () => void): void {
    if (etapaFunil === 'FORMULARIO_CONCLUIDO') {
      this.enviarEtapaFunil(etapaFunil, onComplete);
      return;
    }

    const stageStorageKey = `${this.landingStageStoragePrefix}:${etapaFunil}:${this.getCurrentPath()}`;
    if (sessionStorage.getItem(stageStorageKey)) {
      onComplete?.();
      return;
    }

    this.enviarEtapaFunil(etapaFunil, () => {
      sessionStorage.setItem(stageStorageKey, '1');
      onComplete?.();
    });
  }

  private enviarEtapaFunil(etapaFunil: LandingEtapaFunil, onComplete?: () => void): void {
    this.landingpagePublicService.registrarEtapa({
      pagina: this.pageTitle,
      path: this.getCurrentPath(),
      sessionId: this.sessionId,
      etapaFunil,
    }).subscribe({
      next: () => onComplete?.(),
      error: () => onComplete?.(),
    });
  }

  private ensureSessionId(): string {
    const existing = sessionStorage.getItem(this.landingSessionStorageKey);
    if (existing) {
      return existing;
    }

    const generated =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `landing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

    sessionStorage.setItem(this.landingSessionStorageKey, generated);
    return generated;
  }

  private resetFunilSession(): void {
    this.sessionId = this.generateSessionId();
    sessionStorage.setItem(this.landingSessionStorageKey, this.sessionId);

    Object.keys(sessionStorage)
      .filter(key => key.startsWith(this.landingStageStoragePrefix))
      .forEach(key => sessionStorage.removeItem(key));
  }

  private generateSessionId(): string {
    return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `landing-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  private getCurrentPath(): string {
    return window.location.pathname || '/';
  }
}
