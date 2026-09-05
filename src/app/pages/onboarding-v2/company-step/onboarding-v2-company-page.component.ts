import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize } from 'rxjs/operators';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { OnboardingShellComponent } from 'src/app/components/onboarding/onboarding-shell.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import {
  OnboardingV2CompanyPayload,
  isOnboardingV2Finished,
  resolveOnboardingV2RouteFromProgress,
  resolveOnboardingV2StepFromProgress,
} from '../models/onboarding-v2.models';
import { OnboardingV2StateService } from '../services/onboarding-v2-state.service';

@Component({
  selector: 'app-onboarding-v2-company-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    OnboardingShellComponent,
    SectionCardComponent,
    InputTextoRestritoComponent,
    InputTelefoneComponent,
    InputEmailComponent,
  ],
  templateUrl: './onboarding-v2-company-page.component.html',
  styleUrls: ['./onboarding-v2-company-page.component.scss'],
})
export class OnboardingV2CompanyPageComponent implements OnInit {
  readonly form: FormGroup = this.fb.group({
    nome: ['', [Validators.required, Validators.minLength(2)]],
    telefone: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    responsavelNome: ['', [Validators.required, Validators.minLength(2)]],
    responsavelTelefone: [''],
  });

  carregando = true;

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
    protected readonly onboardingV2State: OnboardingV2StateService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/onboarding-v2']);
      return;
    }

    this.loadStep();
  }

  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }

  get telefoneControl(): FormControl {
    return this.form.get('telefone') as FormControl;
  }

  get emailControl(): FormControl {
    return this.form.get('email') as FormControl;
  }

  get responsavelNomeControl(): FormControl {
    return this.form.get('responsavelNome') as FormControl;
  }

  get responsavelTelefoneControl(): FormControl {
    return this.form.get('responsavelTelefone') as FormControl;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.onboardingV2State.saveCompany(this.buildPayload()).subscribe({
      next: (progress) => {
        this.toastr.success('Dados salvos. Confira o resumo para finalizar.');
        this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(progress));
      },
      error: () => {
        this.toastr.error(this.onboardingV2State.error() || 'Erro ao salvar os dados da empresa.');
      },
    });
  }

  private loadStep(): void {
    this.carregando = true;

    this.onboardingV2State
      .refreshProgress()
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: (progress) => {
          if (progress.onboardingVersion !== 'v2') {
            this.router.navigateByUrl(this.authService.getOnboardingRouteForUsuario(progress.onboardingConcluido));
            return;
          }

          if (isOnboardingV2Finished(progress)) {
            this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario());
            return;
          }

          if (resolveOnboardingV2StepFromProgress(progress) !== 'company') {
            this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(progress));
            return;
          }

          this.patchForm(progress);
        },
        error: () => {
          this.toastr.error(this.onboardingV2State.error() || 'Não foi possível carregar o onboarding.');
        },
      });
  }

  private patchForm(progress: { empresa: any }): void {
    const empresa = progress.empresa || {};

    this.form.patchValue({
      nome: empresa.nome || '',
      telefone: empresa.telefone || '',
      email: empresa.email || '',
      responsavelNome: empresa.responsavelNome || '',
      responsavelTelefone: empresa.responsavelTelefone || '',
    });
  }

  private buildPayload(): OnboardingV2CompanyPayload {
    const raw = this.form.getRawValue();

    return {
      nome: raw.nome,
      telefone: raw.telefone || null,
      email: raw.email || null,
      cnpj: null,
      inscricaoEstadual: null,
      horario: null,
      responsavelNome: raw.responsavelNome || null,
      responsavelTelefone: raw.responsavelTelefone || null,
      endereco: null,
    };
  }
}
