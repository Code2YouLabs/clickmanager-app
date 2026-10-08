import { Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit, Renderer2, SimpleChanges, inject } from '@angular/core';
import { TutorialService } from './tutorial.service';

@Directive({
  selector: '[appTutorialTarget]',
  standalone: true,
})
export class TutorialTargetDirective implements OnInit, OnChanges, OnDestroy {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly renderer = inject(Renderer2);
  private readonly tutorial = inject(TutorialService);
  private unregister?: () => void;
  private currentId: string | null = null;

  @Input({ alias: 'appTutorialTarget', required: true }) targetId = '';

  ngOnInit(): void {
    this.register();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['targetId'] || changes['targetId'].firstChange) {
      return;
    }

    this.register();
  }

  ngOnDestroy(): void {
    this.clearRegistration();
  }

  private register(): void {
    const nextId = this.targetId?.trim();
    if (!nextId || nextId === this.currentId) {
      return;
    }

    this.clearRegistration();
    this.currentId = nextId;
    this.renderer.setAttribute(this.elementRef.nativeElement, 'data-tutorial-target', nextId);
    this.unregister = this.tutorial.registerTarget(nextId, this.elementRef.nativeElement);
  }

  private clearRegistration(): void {
    this.unregister?.();
    this.unregister = undefined;
    this.currentId = null;
  }
}
