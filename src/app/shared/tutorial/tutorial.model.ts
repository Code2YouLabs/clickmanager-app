export type TutorialPlacement = 'auto' | 'top' | 'right' | 'bottom' | 'left';

export type TutorialEventType = 'started' | 'stepChanged' | 'exited' | 'completed' | 'error';

export interface TutorialStep {
  id: string;
  title: string;
  description: string;
  targetId: string;
  route?: string;
  preferredPlacement?: TutorialPlacement;
  scrollBlock?: ScrollLogicalPosition;
  advanceOn?: string;
  timeoutMs?: number;
  actionLabel?: string;
  action?: 'next' | 'clickTarget' | 'clickTargetThenNext';
}

export interface TutorialDefinition {
  id: string;
  steps: TutorialStep[];
  labels?: Partial<TutorialLabels>;
}

export interface TutorialLabels {
  eyebrow: string;
  back: string;
  next: string;
  exit: string;
  finish: string;
}

export interface TutorialRect {
  top: number;
  left: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export interface TutorialRuntimeState {
  status: 'idle' | 'waiting' | 'active' | 'error';
  definition: TutorialDefinition | null;
  step: TutorialStep | null;
  stepIndex: number;
  totalSteps: number;
  rect: TutorialRect | null;
  waitingTargetId?: string;
  error?: string;
}

export interface TutorialEvent {
  type: TutorialEventType;
  tutorialId: string;
  stepId?: string;
  stepIndex?: number;
  reason?: string;
  error?: string;
}
