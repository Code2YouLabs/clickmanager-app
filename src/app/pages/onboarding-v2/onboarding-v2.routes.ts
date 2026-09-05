import { Routes } from '@angular/router';
import { OnboardingV2CompanyPageComponent } from './company-step/onboarding-v2-company-page.component';
import { OnboardingV2EntryPageComponent } from './entry/onboarding-v2-entry-page.component';
import { OnboardingV2SummaryPageComponent } from './summary-step/onboarding-v2-summary-page.component';

export const OnboardingV2Routes: Routes = [
  {
    path: '',
    component: OnboardingV2EntryPageComponent,
  },
  {
    path: 'empresa',
    component: OnboardingV2CompanyPageComponent,
  },
  {
    path: 'produtos',
    redirectTo: 'resumo',
    pathMatch: 'full',
  },
  {
    path: 'resumo',
    component: OnboardingV2SummaryPageComponent,
  },
];
