import { resolveOnboardingV2RouteFromProgress } from './onboarding-v2.models';
describe('Rotas de onboarding com biblioteca', () => {
  it('respeita a etapa de produtos informada pelo backend', () => {
    expect(resolveOnboardingV2RouteFromProgress({status:'company_completed',currentStep:'products',onboardingConcluido:false})).toBe('/onboarding-v2/produtos');
  });
  it('vai ao resumo quando a etapa opcional já foi concluída', () => {
    expect(resolveOnboardingV2RouteFromProgress({status:'products_completed',currentStep:'summary',onboardingConcluido:false})).toBe('/onboarding-v2/resumo');
  });
});
