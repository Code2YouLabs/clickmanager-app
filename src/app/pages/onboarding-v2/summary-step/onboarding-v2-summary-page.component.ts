import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { BibliotecaService } from '../../grafica/biblioteca/biblioteca.service';
import { SetupProgress, SetupProgressComponent } from 'src/app/components/setup-progress/setup-progress.component';
import { finalize } from 'rxjs/operators';
import { MaterialModule } from 'src/app/material.module';
import { OnboardingShellComponent } from 'src/app/components/onboarding/onboarding-shell.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { AuthService } from 'src/app/services/auth.service';
import {
  isOnboardingV2Finished,
  resolveOnboardingV2RouteFromProgress,
  resolveOnboardingV2StepFromProgress,
} from '../models/onboarding-v2.models';
import { OnboardingV2StateService } from '../services/onboarding-v2-state.service';

@Component({
  selector: 'app-onboarding-v2-summary-page',
  standalone: true,
  imports: [CommonModule, MaterialModule, OnboardingShellComponent, SectionCardComponent, SetupProgressComponent],
  templateUrl: './onboarding-v2-summary-page.component.html',
  styleUrls: ['./onboarding-v2-summary-page.component.scss'],
})
export class OnboardingV2SummaryPageComponent implements OnInit {
  job: SetupProgress | null = null;
  carregando = true;
  erroCarregamento = false;

  constructor(
    private readonly biblioteca: BibliotecaService,
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

  submit(): void {
    if (this.carregando || this.erroCarregamento || this.onboardingV2State.saving()) return;
    this.onboardingV2State.finishOnboarding().subscribe({
      next: () => {
        this.toastr.success('Onboarding finalizado. Seu painel já está liberado.');
        this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario());
      },
      error: () => {
        this.toastr.error(this.onboardingV2State.error() || 'Não foi possível concluir o onboarding.');
      },
    });
  }

  loadStep(): void {
    this.erroCarregamento = false;
    this.carregando = true;
    forkJoin({ resumo: this.onboardingV2State.loadResumo(), job: this.biblioteca.ultima() })
      .pipe(finalize(() => (this.carregando = false)))
      .subscribe({
        next: ({ resumo, job }) => {
          this.job = job;
          if (resumo.onboardingVersion !== 'v2') {
            this.router.navigateByUrl(this.authService.getOnboardingRouteForUsuario(resumo.onboardingConcluido));
            return;
          }

          if (isOnboardingV2Finished(resumo)) {
            this.router.navigateByUrl(this.authService.getDefaultRouteForUsuario());
            return;
          }

          if (resolveOnboardingV2StepFromProgress(resumo) !== 'summary') {
            this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(resumo));
          }
        },
        error: () => {
          this.erroCarregamento = true;
          this.toastr.error(this.onboardingV2State.error() || 'Não foi possível carregar o resumo.');
        },
      });
  }
}
