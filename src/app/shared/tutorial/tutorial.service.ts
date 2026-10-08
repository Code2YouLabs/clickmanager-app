import { DOCUMENT } from '@angular/common';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription, fromEvent, merge } from 'rxjs';
import { auditTime } from 'rxjs/operators';
import { TutorialDefinition, TutorialEvent, TutorialRect, TutorialRuntimeState, TutorialStep } from './tutorial.model';

const DEFAULT_TARGET_TIMEOUT_MS = 4000;
const DEFAULT_SPOTLIGHT_PADDING = 10;

@Injectable({ providedIn: 'root' })
export class TutorialService {
  private readonly document = inject(DOCUMENT);
  private readonly router = inject(Router);
  private readonly targets = new Map<string, Set<HTMLElement>>();
  private readonly targetChangesSubject = new Subject<string>();
  private readonly eventsSubject = new Subject<TutorialEvent>();
  private readonly stateSignal = signal<TutorialRuntimeState>({
    status: 'idle',
    definition: null,
    step: null,
    stepIndex: -1,
    totalSteps: 0,
    rect: null,
  });

  private viewportSubscription?: Subscription;
  private targetWaitSubscription?: Subscription;
  private measureTimeout?: ReturnType<typeof setTimeout>;
  private targetTimeout?: ReturnType<typeof setTimeout>;
  private activationToken = 0;

  readonly state = computed(() => this.stateSignal());
  readonly activeDefinition = computed(() => this.stateSignal().definition);
  readonly currentStep = computed(() => this.stateSignal().step);
  readonly currentIndex = computed(() => this.stateSignal().stepIndex);
  readonly totalSteps = computed(() => this.stateSignal().totalSteps);
  readonly rect = computed(() => this.stateSignal().rect);
  readonly isActive = computed(() => this.stateSignal().status === 'active');
  readonly isWaiting = computed(() => this.stateSignal().status === 'waiting');
  readonly canGoBack = computed(() => this.stateSignal().stepIndex > 0);
  readonly isLastStep = computed(() => {
    const state = this.stateSignal();
    return state.stepIndex >= Math.max(state.totalSteps - 1, 0);
  });
  readonly events$ = this.eventsSubject.asObservable();

  registerTarget(targetId: string, element: HTMLElement): () => void {
    const id = targetId.trim();
    const elements = this.targets.get(id) ?? new Set<HTMLElement>();
    elements.add(element);
    this.targets.set(id, elements);
    this.targetChangesSubject.next(id);

    return () => {
      const current = this.targets.get(id);
      current?.delete(element);
      if (current && current.size === 0) {
        this.targets.delete(id);
      }
      this.targetChangesSubject.next(id);
    };
  }

  start(definition: TutorialDefinition, startStepId?: string): boolean {
    if (!definition.steps.length) {
      this.emitEvent({ type: 'error', tutorialId: definition.id, error: 'Tutorial sem etapas.' });
      return false;
    }

    this.resetRuntime();
    this.stateSignal.set({
      status: 'waiting',
      definition,
      step: null,
      stepIndex: -1,
      totalSteps: definition.steps.length,
      rect: null,
    });
    this.emitEvent({ type: 'started', tutorialId: definition.id });
    this.bindViewportListeners();

    const requestedIndex = startStepId ? definition.steps.findIndex((step) => step.id === startStepId) : 0;
    void this.activateStep(requestedIndex >= 0 ? requestedIndex : 0);
    return true;
  }

  next(): void {
    const state = this.stateSignal();
    if (!state.definition || state.stepIndex < 0) {
      return;
    }

    if (state.stepIndex >= state.definition.steps.length - 1) {
      this.complete();
      return;
    }

    void this.activateStep(state.stepIndex + 1);
  }

  previous(): void {
    const state = this.stateSignal();
    if (!state.definition || state.stepIndex <= 0) {
      return;
    }

    void this.activateStep(state.stepIndex - 1);
  }

  notify(eventName: string): void {
    const step = this.stateSignal().step;
    if (!step?.advanceOn || step.advanceOn !== eventName) {
      return;
    }

    this.next();
  }

  exit(reason = 'user'): void {
    const state = this.stateSignal();
    if (!state.definition) {
      return;
    }

    this.emitEvent({
      type: 'exited',
      tutorialId: state.definition.id,
      stepId: state.step?.id,
      stepIndex: state.stepIndex >= 0 ? state.stepIndex : undefined,
      reason,
    });
    this.stop();
  }

  complete(): void {
    const state = this.stateSignal();
    if (!state.definition) {
      return;
    }

    this.emitEvent({
      type: 'completed',
      tutorialId: state.definition.id,
      stepId: state.step?.id,
      stepIndex: state.stepIndex >= 0 ? state.stepIndex : undefined,
    });
    this.stop();
  }

  handleEscape(): void {
    if (this.document.querySelector('.cdk-overlay-pane .mat-mdc-dialog-container')) {
      return;
    }

    this.exit('escape');
  }

  stop(): void {
    this.resetRuntime();
    this.stateSignal.set({
      status: 'idle',
      definition: null,
      step: null,
      stepIndex: -1,
      totalSteps: 0,
      rect: null,
    });
  }

  remeasure(): void {
    const step = this.stateSignal().step;
    if (!step) {
      return;
    }

    const target = this.findVisibleTarget(step.targetId);
    if (!target) {
      return;
    }

    this.stateSignal.update((state) => ({
      ...state,
      rect: this.buildRect(target.getBoundingClientRect()),
    }));
  }

  private async activateStep(stepIndex: number): Promise<void> {
    const token = ++this.activationToken;
    this.clearPendingStepWork();
    const definition = this.stateSignal().definition;
    if (!definition) {
      return;
    }

    const step = definition.steps[stepIndex];
    if (!step) {
      this.complete();
      return;
    }

    this.stateSignal.update((state) => ({
      ...state,
      status: 'waiting',
      step,
      stepIndex,
      rect: null,
      waitingTargetId: step.targetId,
      error: undefined,
    }));

    try {
      await this.navigateIfNeeded(step);
      if (token !== this.activationToken) {
        return;
      }

      const target = this.findVisibleTarget(step.targetId);
      if (target) {
        this.showStep(definition, step, stepIndex, target);
        return;
      }

      this.waitForTarget(definition, step, stepIndex, token);
    } catch (error) {
      this.failStep(definition, step, stepIndex, this.errorMessage(error));
    }
  }

  private async navigateIfNeeded(step: TutorialStep): Promise<void> {
    if (!step.route || this.router.url === step.route) {
      return;
    }

    const navigated = await this.router.navigateByUrl(step.route);
    if (!navigated) {
      throw new Error(`Nao foi possivel navegar para ${step.route}.`);
    }
  }

  private waitForTarget(definition: TutorialDefinition, step: TutorialStep, stepIndex: number, token: number): void {
    const timeoutMs = step.timeoutMs ?? DEFAULT_TARGET_TIMEOUT_MS;

    this.targetWaitSubscription = this.targetChangesSubject
      .pipe(auditTime(16))
      .subscribe((changedTargetId) => {
        if (changedTargetId !== step.targetId || token !== this.activationToken) {
          return;
        }

        const target = this.findVisibleTarget(step.targetId);
        if (target) {
          this.clearPendingStepWork();
          this.showStep(definition, step, stepIndex, target);
        }
      });

    this.targetTimeout = setTimeout(() => {
      if (token !== this.activationToken) {
        return;
      }

      this.failStep(definition, step, stepIndex, `Alvo "${step.targetId}" nao foi encontrado.`);
    }, timeoutMs);
  }

  private showStep(definition: TutorialDefinition, step: TutorialStep, stepIndex: number, target: HTMLElement): void {
    this.scrollToTarget(target, step);
    const rect = this.buildRect(target.getBoundingClientRect());
    this.stateSignal.update((state) => ({
      ...state,
      status: 'active',
      step,
      stepIndex,
      rect,
      waitingTargetId: undefined,
      error: undefined,
    }));

    this.emitEvent({
      type: 'stepChanged',
      tutorialId: definition.id,
      stepId: step.id,
      stepIndex,
    });

    this.scheduleMeasure(target);
  }

  private failStep(definition: TutorialDefinition, step: TutorialStep, stepIndex: number, error: string): void {
    this.emitEvent({
      type: 'error',
      tutorialId: definition.id,
      stepId: step.id,
      stepIndex,
      error,
    });
    this.stateSignal.update((state) => ({
      ...state,
      status: 'error',
      rect: null,
      error,
    }));
    this.stop();
  }

  private findVisibleTarget(targetId: string): HTMLElement | null {
    const elements = this.targets.get(targetId);
    if (!elements) {
      return null;
    }

    for (const element of elements) {
      if (!element.isConnected) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        return element;
      }
    }

    return null;
  }

  private scrollToTarget(target: HTMLElement, step: TutorialStep): void {
    target.scrollIntoView({
      behavior: 'smooth',
      block: step.scrollBlock ?? 'center',
      inline: 'nearest',
    });
  }

  private scheduleMeasure(target: HTMLElement): void {
    this.clearMeasureTimeout();
    this.measureTimeout = setTimeout(() => {
      if (target.isConnected) {
        this.stateSignal.update((state) => ({
          ...state,
          rect: this.buildRect(target.getBoundingClientRect()),
        }));
      }
      this.measureTimeout = undefined;
    }, 260);
  }

  private buildRect(rect: DOMRect): TutorialRect {
    const padding = DEFAULT_SPOTLIGHT_PADDING;
    const top = Math.max(rect.top - padding, 8);
    const left = Math.max(rect.left - padding, 8);
    const right = Math.min(rect.right + padding, window.innerWidth - 8);
    const bottom = Math.min(rect.bottom + padding, window.innerHeight - 8);

    return {
      top,
      left,
      right,
      bottom,
      width: Math.max(right - left, 0),
      height: Math.max(bottom - top, 0),
    };
  }

  private bindViewportListeners(): void {
    this.viewportSubscription = merge(
      fromEvent(window, 'resize'),
      fromEvent(window, 'scroll', { capture: true }),
    )
      .pipe(auditTime(16))
      .subscribe(() => this.remeasure());
  }

  private resetRuntime(): void {
    this.activationToken++;
    this.clearPendingStepWork();
    this.viewportSubscription?.unsubscribe();
    this.viewportSubscription = undefined;
  }

  private clearPendingStepWork(): void {
    this.targetWaitSubscription?.unsubscribe();
    this.targetWaitSubscription = undefined;
    if (this.targetTimeout) {
      clearTimeout(this.targetTimeout);
      this.targetTimeout = undefined;
    }
    this.clearMeasureTimeout();
  }

  private clearMeasureTimeout(): void {
    if (this.measureTimeout) {
      clearTimeout(this.measureTimeout);
      this.measureTimeout = undefined;
    }
  }

  private emitEvent(event: TutorialEvent): void {
    this.eventsSubject.next(event);
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : 'Erro ao executar tutorial.';
  }
}
