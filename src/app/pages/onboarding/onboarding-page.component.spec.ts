import { OnboardingPageComponent } from './onboarding-page.component';

describe('Entrada do onboarding', () => {
  it('encaminha o acesso inicial ao fluxo com Biblioteca', () => {
    const router = jasmine.createSpyObj('Router', ['navigateByUrl']);
    OnboardingPageComponent.prototype.ngOnInit.call({ reabrindoOnboarding: false, router } as any);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/onboarding-v2', { replaceUrl: true });
  });
});
