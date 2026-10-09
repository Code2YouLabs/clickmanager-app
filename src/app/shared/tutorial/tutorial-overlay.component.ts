import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TutorialLabels, TutorialPlacement, TutorialRect } from './tutorial.model';
import { TutorialService } from './tutorial.service';

type ResolvedPlacement = Exclude<TutorialPlacement, 'auto'>;

const DEFAULT_LABELS: TutorialLabels = {
  eyebrow: 'Guia rápido',
  back: 'Voltar',
  next: 'Próximo',
  exit: 'Sair',
  finish: 'Concluir',
};

@Component({
  selector: 'app-tutorial-overlay',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  templateUrl: './tutorial-overlay.component.html',
  styleUrl: './tutorial-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
})
export class TutorialOverlayComponent implements AfterViewInit {
  private readonly tutorial = inject(TutorialService);

  @ViewChild('popover') private popover?: ElementRef<HTMLElement>;

  readonly state = this.tutorial.state;
  readonly active = this.tutorial.isActive;
  readonly step = this.tutorial.currentStep;
  readonly rect = this.tutorial.rect;
  readonly currentIndex = this.tutorial.currentIndex;
  readonly totalSteps = this.tutorial.totalSteps;
  readonly canGoBack = this.tutorial.canGoBack;
  readonly isLastStep = this.tutorial.isLastStep;
  readonly viewport = signal({ width: window.innerWidth, height: window.innerHeight });
  readonly placement = signal<ResolvedPlacement>('bottom');
  readonly popoverStyles = signal<Record<string, string>>({});
  readonly labels = computed<TutorialLabels>(() => ({
    ...DEFAULT_LABELS,
    ...(this.state().definition?.labels ?? {}),
  }));
  readonly progressLabel = computed(() => `${this.currentIndex() + 1} de ${this.totalSteps()}`);
  readonly progressPercent = computed(() => {
    const total = this.totalSteps();
    return total ? ((this.currentIndex() + 1) / total) * 100 : 0;
  });
  readonly primaryActionDisabled = computed(() => !!this.step()?.advanceOn);
  readonly backActionDisabled = computed(() => !!this.step()?.advanceOn);
  readonly completionStep = computed(() => !!this.step()?.completion);
  readonly isMobile = computed(() => this.viewport().width <= 768);
  readonly overlayTop = computed(() => this.rect()?.top ?? 0);
  readonly overlayBottom = computed(() => {
    const rect = this.rect();
    return rect ? Math.max(this.viewport().height - rect.bottom, 0) : 0;
  });
  readonly overlayLeft = computed(() => this.rect()?.left ?? 0);
  readonly overlayRight = computed(() => {
    const rect = this.rect();
    return rect ? Math.max(this.viewport().width - rect.right, 0) : 0;
  });

  constructor() {
    effect(() => {
      const rect = this.rect();
      const step = this.step();
      if (!this.active() || !rect || !step) {
        this.popoverStyles.set({});
        return;
      }

      queueMicrotask(() => this.positionPopover(rect));
    });
  }

  ngAfterViewInit(): void {
    queueMicrotask(() => this.positionPopover(this.rect()));
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  onViewportChange(): void {
    this.viewport.set({ width: window.innerWidth, height: window.innerHeight });
    this.positionPopover(this.rect());
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.active()) {
      this.tutorial.handleEscape();
    }
  }

  next(): void {
    this.tutorial.primaryAction();
  }

  previous(): void {
    if (this.backActionDisabled()) {
      return;
    }

    this.tutorial.previous();
  }

  exit(): void {
    this.tutorial.exit();
  }

  finish(): void {
    this.tutorial.complete();
  }

  private positionPopover(rect: TutorialRect | null): void {
    const popover = this.popover?.nativeElement;
    const step = this.step();
    if (!popover || !rect || !step) {
      return;
    }

    const viewport = this.viewport();
    const gap = 16;
    const padding = 16;
    const popoverRect = popover.getBoundingClientRect();
    const popoverWidth = Math.min(popoverRect.width || 336, viewport.width - (padding * 2));
    const popoverHeight = popoverRect.height || 220;
    const preferred = step.preferredPlacement ?? 'auto';
    const spaces = {
      top: rect.top,
      right: viewport.width - rect.right,
      bottom: viewport.height - rect.bottom,
      left: rect.left,
    };
    const placements: ResolvedPlacement[] =
      preferred === 'auto'
        ? ['bottom', 'top', 'right', 'left']
        : [preferred, 'bottom', 'top', 'right', 'left'];
    const chosen = placements.find((placement) => {
      if (placement === 'top' || placement === 'bottom') {
        return spaces[placement] >= popoverHeight + gap + padding;
      }
      return spaces[placement] >= popoverWidth + gap + padding;
    }) ?? (viewport.width <= 768 ? 'bottom' : 'right');

    let top = rect.bottom + gap;
    let left = rect.left + (rect.width / 2) - (popoverWidth / 2);

    if (chosen === 'top') {
      top = rect.top - popoverHeight - gap;
    } else if (chosen === 'right') {
      top = rect.top + (rect.height / 2) - (popoverHeight / 2);
      left = rect.right + gap;
    } else if (chosen === 'left') {
      top = rect.top + (rect.height / 2) - (popoverHeight / 2);
      left = rect.left - popoverWidth - gap;
    }

    if (viewport.width <= 768) {
      const width = viewport.width - (padding * 2);
      const bottomSheetTop = Math.max(viewport.height - popoverHeight - 18, padding);
      const aboveTargetTop = Math.max(rect.top - popoverHeight - 12, padding);
      const targetNearBottom = rect.bottom > viewport.height - 144;
      this.placement.set(targetNearBottom ? 'top' : 'bottom');
      this.popoverStyles.set({
        top: `${targetNearBottom ? aboveTargetTop : bottomSheetTop}px`,
        left: `${padding}px`,
        width: `${width}px`,
      });
      return;
    }

    const maxLeft = viewport.width - popoverWidth - padding;
    const maxTop = viewport.height - popoverHeight - padding;
    left = Math.min(Math.max(left, padding), Math.max(maxLeft, padding));
    top = Math.min(Math.max(top, padding), Math.max(maxTop, padding));

    this.placement.set(chosen);
    this.popoverStyles.set({
      top: `${top}px`,
      left: `${left}px`,
      width: `${popoverWidth}px`,
    });
  }
}
