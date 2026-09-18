import { SetupProgress, preparacaoAtiva } from 'src/app/components/setup-progress/setup-progress.component';

export type OnboardingStage = 'EMPRESA' | 'CATALOGO' | 'PREPARANDO' | 'CONCLUIDO';
export function catalogStage(job: SetupProgress | null): OnboardingStage {
  return !job ? 'CATALOGO' : preparacaoAtiva(job) ? 'PREPARANDO' : 'CONCLUIDO';
}
export function stageNumber(stage: OnboardingStage): number {
  return stage === 'EMPRESA' ? 1 : stage === 'CATALOGO' ? 2 : 3;
}
