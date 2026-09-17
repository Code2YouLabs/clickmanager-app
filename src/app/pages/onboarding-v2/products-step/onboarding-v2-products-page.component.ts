import { BibliotecaProdutosSelectorComponent } from '../../grafica/biblioteca/biblioteca-produtos-selector.component';
import { OnboardingV2Service } from '../services/onboarding-v2.service';
import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { finalize, switchMap } from 'rxjs/operators';
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
  selector: 'app-onboarding-v2-products-page',
  standalone: true,
  imports: [CommonModule, MaterialModule, OnboardingShellComponent, SectionCardComponent, BibliotecaProdutosSelectorComponent],
  templateUrl: './onboarding-v2-products-page.component.html',
  styleUrls: ['./onboarding-v2-products-page.component.scss'],
})
export class OnboardingV2ProductsPageComponent implements OnInit {
  @ViewChild(BibliotecaProdutosSelectorComponent) seletor?: BibliotecaProdutosSelectorComponent;
  carregando = true;
  importando = false;
  avancando = false;

  constructor(
    private readonly api: OnboardingV2Service,
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
    if (this.importando || this.avancando) return;
    if (this.seletor?.selecionados.size) { this.seletor.adicionar(); return; }
    this.avancando = true;
    const concluido = !!this.seletor?.job && !this.seletor.importando;
    const fluxo = concluido ? this.api.concluirBiblioteca().pipe(switchMap(() => this.onboardingV2State.finishOnboarding())) : this.api.concluirBiblioteca();
    fluxo.pipe(finalize(() => this.avancando = false)).subscribe({
      next: progress => this.router.navigateByUrl(concluido ? this.authService.getDefaultRouteForUsuario() : resolveOnboardingV2RouteFromProgress(progress)),
      error: () => this.toastr.error('Não foi possível continuar. Tente novamente.'),
    });
  }

  get acaoPrincipal() {
    if (this.importando) return 'Preparando...';
    if (this.seletor?.job) return 'Entrar no ClickManager';
    return this.seletor?.selecionados.size ? 'Preparar minha empresa' : 'Continuar sem produtos';
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

          if (resolveOnboardingV2StepFromProgress(progress) !== 'products') {
            this.router.navigateByUrl(resolveOnboardingV2RouteFromProgress(progress));
            return;
          }


        },
        error: () => {
          this.toastr.error(this.onboardingV2State.error() || 'Não foi possível carregar seus produtos sugeridos.');
        },
      });
  }

}
