import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize, switchMap } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { AuthService } from 'src/app/services/auth.service';
import { AuthTokens } from 'src/app/models/auth-tokens.interface';
import { resolveTipoEmpresa, TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import {
  OnboardingV2RegisterRequest,
  OnboardingV2RegisterResponse,
  isOnboardingV2Finished,
  resolveOnboardingV2RouteFromProgress,
} from '../models/onboarding-v2.models';
import { OnboardingV2Service } from '../services/onboarding-v2.service';
import { OnboardingV2StateService } from '../services/onboarding-v2-state.service';
import { SegmentOption, SegmentSelectorComponent } from '../components/segment-selector/segment-selector.component';

@Component({
  selector: 'app-onboarding-v2-entry-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    MaterialModule,
    InputTextoRestritoComponent,
    InputEmailComponent,
    InputTelefoneComponent,
    SegmentSelectorComponent,
  ],
  templateUrl: './onboarding-v2-entry-page.component.html',
  styleUrl: './onboarding-v2-entry-page.component.scss',
})
export class OnboardingV2EntryPageComponent implements OnInit {
  readonly segmentosDisponiveis: SegmentOption[] = [
    {
      id: 'grafica',
      icon: '🖨️',
      title: 'Gráfica',
      description:
        'Impressão, comunicação visual, banners, adesivos, cartões, fachadas e serviços gráficos.',
      tipoEmpresa: TipoEmpresa.GRAFICA,
    },
    {
      id: 'deposito',
      icon: '🏗️',
      title: 'Depósito de Acabamentos',
      description:
        'Pisos, revestimentos, tintas, louças, metais, iluminação e materiais para acabamento.',
      tipoEmpresa: TipoEmpresa.DEPOSITO,
    },
  ];

  readonly form: FormGroup = this.fb.group({
    empresaNome: ['', [Validators.required, Validators.minLength(2)]],
    responsavelNome: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    telefone: [''],
    senha: ['', [Validators.required, Validators.minLength(6)]],
    confirmarSenha: ['', [Validators.required]],
  });

  loading = false;
  selectedTipoEmpresa: TipoEmpresa | null = null;

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    private readonly onboardingV2Service: OnboardingV2Service,
    private readonly onboardingV2State: OnboardingV2StateService
  ) {}

  ngOnInit(): void {
    const tipoEmpresa = this.route.snapshot.queryParamMap.get('tipoEmpresa');
    this.selectedTipoEmpresa = tipoEmpresa ? resolveTipoEmpresa(tipoEmpresa) : null;
    if (!this.authService.isAuthenticated()) {
      this.router.navigateByUrl('/authentication/registro-gestor');
      return;
    }

    this.loading = true;
      this.onboardingV2State.refreshProgress().pipe(finalize(() => (this.loading = false))).subscribe({
      next: (progress) => {
        if (progress.onboardingVersion !== 'v2') {
          this.router.navigateByUrl(this.authService.getOnboardingRouteForUsuario(progress.onboardingConcluido));
          return;
        }

        if (isOnboardingV2Finished(progress)) {
          this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario());
          return;
        }

        this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(progress));
      },
      error: () => {},
    });
  }

  get empresaNomeControl(): FormControl {
    return this.form.get('empresaNome') as FormControl;
  }

  get responsavelNomeControl(): FormControl {
    return this.form.get('responsavelNome') as FormControl;
  }

  get emailControl(): FormControl {
    return this.form.get('email') as FormControl;
  }

  get telefoneControl(): FormControl {
    return this.form.get('telefone') as FormControl;
  }

  get senhaControl(): FormControl {
    return this.form.get('senha') as FormControl;
  }

  get confirmarSenhaControl(): FormControl {
    return this.form.get('confirmarSenha') as FormControl;
  }

  get senhaDivergente(): boolean {
    const senha = this.senhaControl.value;
    const confirmarSenha = this.confirmarSenhaControl.value;
    return !!senha && !!confirmarSenha && senha !== confirmarSenha;
  }

  get hasSelectedSegment(): boolean {
    return this.selectedTipoEmpresa !== null;
  }

  get ctaLabel(): string {
    if (this.loading) {
      return 'Criando conta...';
    }

    return this.hasSelectedSegment ? 'Continuar' : 'Escolha um segmento';
  }

  onSegmentSelected(tipoEmpresa: TipoEmpresa): void {
    this.selectedTipoEmpresa = tipoEmpresa;
  }

  submit(): void {
    if (this.loading) {
      return;
    }

    if (!this.hasSelectedSegment) {
      return;
    }

    if (this.form.invalid || this.senhaDivergente) {
      this.form.markAllAsTouched();
      if (this.senhaDivergente) {
        this.confirmarSenhaControl.setErrors({ mismatch: true });
      }
      return;
    }

    const payload = this.buildPayload();
    this.loading = true;

    this.onboardingV2Service
      .registerEmpresa(payload)
      .pipe(
        switchMap((response) => this.autenticarAposCadastro(response, payload.usuario.username, payload.usuario.senha)),
        switchMap(() => this.onboardingV2State.refreshProgress()),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (progress) => {
          if (progress.onboardingVersion !== 'v2') {
            this.router.navigateByUrl(this.authService.getOnboardingRouteForUsuario(progress.onboardingConcluido));
            return;
          }

          if (isOnboardingV2Finished(progress)) {
            this.toastr.success('Conta criada. Seu painel já está liberado.');
            this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario());
            return;
          }

          this.toastr.success('Conta criada. Vamos preparar sua base inicial.');
          this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(progress));
        },
        error: () => {
          this.toastr.error(this.onboardingV2State.error() || 'Não foi possível iniciar o onboarding agora.');
        },
      });
  }

  private buildPayload(): OnboardingV2RegisterRequest {
    const empresaNome = String(this.empresaNomeControl.value || '').trim();
    const responsavelNome = String(this.responsavelNomeControl.value || '').trim();
    const email = String(this.emailControl.value || '').trim();
    const telefone = String(this.telefoneControl.value || '').trim() || null;

    return {
      empresa: {
        nome: empresaNome,
        email,
        telefone,
        tipoEmpresa: this.selectedTipoEmpresa ?? TipoEmpresa.GRAFICA,
      },
      usuario: {
        nome: responsavelNome,
        username: email,
        telefone,
        senha: String(this.senhaControl.value || ''),
      },
    };
  }

  private toAuthTokens(response: { accessToken: string; refreshToken: string; tokenType?: string | null }): AuthTokens {
    return {
      accessToken: response.accessToken,
      refreshToken: response.refreshToken,
      tokenType: response.tokenType ?? undefined,
    };
  }

  private autenticarAposCadastro(
    response: OnboardingV2RegisterResponse,
    username: string,
    senha: string
  ) {
    if (response?.accessToken && response?.refreshToken) {
      return this.authService.autenticarComTokens(
        this.toAuthTokens({
          accessToken: response.accessToken,
          refreshToken: response.refreshToken,
          tokenType: response.tokenType,
        })
      );
    }

    return this.authService.login(username, senha);
  }
}
