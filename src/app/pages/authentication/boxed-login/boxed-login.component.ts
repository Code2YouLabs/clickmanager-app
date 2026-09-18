import { AfterViewInit, Component } from '@angular/core';
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
import { AuthService } from '../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';
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
  selector: 'app-boxed-login',
  standalone: true,
  imports: [
    RouterModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule,
    BrandingComponent,
  ],
  templateUrl: './boxed-login.component.html',
  styleUrls: ['./boxed-login.component.scss'],
})
export class AppBoxedLoginComponent implements AfterViewInit {
  options = this.settings.getOptions();
  showPassword = false;
  submitting = false;
  googleLoading = false;
  private googleTokenClient?: GoogleTokenClient;

  constructor(
    private settings: CoreService,
    private router: Router,
    private authService: AuthService,
    private toastr: ToastrService) {}

  form = new FormGroup({
    uname: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    lembrar: new FormControl(false)
  });

  get f() {
    return this.form.controls;
  }

  ngAfterViewInit(): void {
    if (!environment.googleClientId) {
      return;
    }

    this.carregarGoogleScript()
      .then(() => this.inicializarGoogleClient())
      .catch(() => undefined);
  }

  submit() {
    if (this.submitting || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { uname, password, lembrar } = this.form.value;

    this.submitting = true;
    this.authService.login(uname!, password!, lembrar!).subscribe({
      next: (usuario) => {
        this.submitting = false;
        this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario(usuario));
      },
      error: (error) => {
        this.submitting = false;
        if (error?.status === 402) {
          return;
        }

        this.toastr.error('E-mail ou senha inválidos');
      }
    });
  }

  handleGoogleClick(): void {
    if (this.submitting || this.googleLoading) {
      return;
    }

    if (!environment.googleClientId) {
      this.toastr.warning('Configure o Google Client ID para habilitar esse login.');
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

  abrirCriacaoConta(): void {
    this.authService.clearSession();
    this.router.navigateByUrl('/authentication/registro-gestor');
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

    this.authService.loginGoogle({ accessToken }, this.form.value.lembrar === true).subscribe({
      next: usuario => {
        this.submitting = false;
        this.googleLoading = false;
        this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario(usuario));
      },
      error: err => {
        this.submitting = false;
        this.googleLoading = false;
        const msg = err?.error?.message || err?.message || 'Não foi possível entrar com Google.';
        this.toastr.error(msg);
      }
    });
  }
  
}
