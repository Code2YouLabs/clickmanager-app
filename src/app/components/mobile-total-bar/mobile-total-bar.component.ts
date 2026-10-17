import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild, signal } from '@angular/core';
import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StatusBadgeComponent } from '../status-badge/status-badge.component';

@Component({
  selector: 'app-mobile-total-bar',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, StatusBadgeComponent, TutorialTargetDirective],
  templateUrl: './mobile-total-bar.component.html',
  styleUrls: ['./mobile-total-bar.component.scss'],
})
export class MobileTotalBarComponent implements OnChanges, AfterViewInit, OnDestroy {
  @Input() appearance: 'default' | 'compact' = 'default';
  @Input() actionType: 'button' | 'submit' = 'button';
  @Input() actionForm: string | null = null;
  @Input() actionTutorialTarget = '';
  @Input() reserveSpace = false;
  @Input() avoidKeyboard = false;
  @ViewChild('bar', { static: true }) private bar!: ElementRef<HTMLElement>;
  readonly reservedHeight = signal(112);
  readonly keyboardInset = signal(0);
  readonly visibleHeight = signal<string | null>(null);
  private resizeObserver?: ResizeObserver;
  private viewportCleanup?: () => void;
  private viewReady = false;
  get resolvedBottomOffset(): string {
    return this.avoidKeyboard
      ? `max(${this.bottomOffset}, env(safe-area-inset-bottom, 0px), ${this.keyboardInset()}px)` : this.bottomOffset;
  }
  ngAfterViewInit(): void { this.viewReady = true; this.syncLayout(); }
  private syncLayout(): void {
    if (this.viewReady && this.reserveSpace && !this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.reservedHeight.set(Math.ceil(this.bar.nativeElement.getBoundingClientRect().height) + 16));
      this.resizeObserver.observe(this.bar.nativeElement);
    } else if (!this.reserveSpace) { this.resizeObserver?.disconnect(); this.resizeObserver = undefined; }
    if (!this.avoidKeyboard) {
      this.viewportCleanup?.(); this.viewportCleanup = undefined; this.keyboardInset.set(0); this.visibleHeight.set(null);
    } else if (!this.viewportCleanup && typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport;
      const measure = () => {
        this.keyboardInset.set(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
        this.visibleHeight.set(`${viewport.height}px`);
      };
      viewport.addEventListener('resize', measure); viewport.addEventListener('scroll', measure); measure();
      this.viewportCleanup = () => { viewport.removeEventListener('resize', measure); viewport.removeEventListener('scroll', measure); };
    }
  }
  ngOnDestroy(): void { this.resizeObserver?.disconnect(); this.viewportCleanup?.(); }
  @Input() label = 'Total estimado';
  @Input() valueText = '';
  @Input() status: string | null | undefined = null;
  @Input() detailText = 'Ver detalhes';
  @Input() expandable = true;
  @Input() expanded = false;
  @Input() inlineDetails = false;
  @Input() awaitingResult = false;
  @Input() detailsPanelId = '';
  @Input() loading = false;
  @Input() secondaryActionText = '';
  @Input() secondaryActionDisabled = false;
  @Input() secondaryActionAriaLabel = 'Executar ação secundária';
  @Input() actionText = '';
  @Input() actionDisabled = false;
  @Input() expandAriaLabel = 'Ver detalhes do cálculo';
  @Input() actionAriaLabel = 'Executar ação principal';
  @Input() bottomOffset = '0px';
  @Input() attachedToBottomNav = false;

  // Notify the owner after the current input update has finished.
  @Output() collapse = new EventEmitter<void>(true);
  @Output() expand = new EventEmitter<void>();
  @Output() secondaryAction = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();

  private touchStartY: number | null = null;
  private handlePointer: { id: number; x: number; y: number; dragged: boolean; cancelled: boolean } | null = null;
  private suppressHandleClick = false;

  ngOnChanges(changes: SimpleChanges): void {
    this.syncLayout();
    if (changes['awaitingResult']?.currentValue) {
      this.handlePointer = null;
      this.touchStartY = null;
      this.collapse.emit();
    }
  }

  onRootClick(): void {
    if (this.awaitingResult || !this.expandable || this.inlineDetails) {
      return;
    }
    this.expand.emit();
  }

  onRootKeydown(event: KeyboardEvent): void {
    if (this.awaitingResult || !this.expandable || this.inlineDetails) {
      return;
    }

    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.expand.emit();
  }

  onTouchStart(event: TouchEvent): void {
    if (this.inlineDetails || this.awaitingResult) return;
    this.touchStartY = event.changedTouches[0]?.clientY ?? null;
  }

  onTouchEnd(event: TouchEvent): void {
    if (this.awaitingResult || !this.expandable || this.inlineDetails) {
      this.touchStartY = null;
      return;
    }

    if (this.touchStartY == null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? this.touchStartY;
    const deltaY = this.touchStartY - endY;
    this.touchStartY = null;

    if (deltaY > 24) {
      this.expand.emit();
    }
  }

  onHandlePointerDown(event: PointerEvent): void {
    if (this.awaitingResult || !this.inlineDetails || !this.expandable || event.button !== 0) return;
    if (!event.isPrimary || this.handlePointer) {
      this.handlePointer = null;
      this.suppressHandleClick = true;
      return;
    }
    this.suppressHandleClick = false;
    this.handlePointer = { id: event.pointerId, x: event.clientX, y: event.clientY, dragged: false, cancelled: false };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onHandlePointerMove(event: PointerEvent): void {
    const pointer = this.handlePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - pointer.x);
    const dy = Math.abs(event.clientY - pointer.y);
    if (Math.hypot(dx, dy) > 8) pointer.dragged = true;
    if (dx > 12 && dx > dy) pointer.cancelled = true;
  }

  onHandlePointerUp(event: PointerEvent): void {
    const pointer = this.handlePointer;
    if (!pointer || pointer.id !== event.pointerId) return;
    this.onHandlePointerMove(event);
    this.handlePointer = null;
    const target = event.currentTarget as HTMLElement;
    if (target.hasPointerCapture(event.pointerId)) target.releasePointerCapture(event.pointerId);
    this.suppressHandleClick = pointer.dragged || pointer.cancelled;
    if (this.awaitingResult || !this.inlineDetails || !this.expandable || pointer.cancelled) return;
    const dy = event.clientY - pointer.y;
    const dx = Math.abs(event.clientX - pointer.x);
    if (Math.abs(dy) < 32 || Math.abs(dy) < dx * 1.5) return;
    if ((dy < 0 && !this.expanded) || (dy > 0 && this.expanded)) this.expand.emit();
  }

  onHandlePointerCancel(event: PointerEvent): void {
    if (this.handlePointer?.id !== event.pointerId) return;
    this.handlePointer = null;
    this.suppressHandleClick = true;
  }

  onHandleClick(event: MouseEvent): void {
    event.stopPropagation();
    // A drag may be followed by a synthetic click. Keyboard/assistive clicks stay available.
    if (this.suppressHandleClick && event.detail !== 0) {
      this.suppressHandleClick = false;
      event.preventDefault();
      return;
    }
    this.onExpandClick(event);
  }

  onExpandClick(event: Event): void {
    event.stopPropagation();
    if (this.expandable && !this.awaitingResult) this.expand.emit();
  }

  onActionClick(event: Event): void {
    event.stopPropagation();
    this.action.emit();
  }

  onSecondaryActionClick(event: Event): void {
    event.stopPropagation();
    this.secondaryAction.emit();
  }
}
