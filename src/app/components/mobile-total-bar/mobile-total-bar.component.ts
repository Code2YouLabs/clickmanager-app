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
  /** Optional fixed navigation anchor. Its measured edge takes precedence over the nominal offset. */
  @Input() bottomAnchorSelector = '';
  @ViewChild('bar', { static: true }) private bar!: ElementRef<HTMLElement>;
  @ViewChild('details') private details?: ElementRef<HTMLElement>;
  @ViewChild('controls') private controls?: ElementRef<HTMLElement>;
  @ViewChild('handle') private handle?: ElementRef<HTMLElement>;
  @ViewChild('clearance') private clearance?: ElementRef<HTMLElement>;
  readonly reservedHeight = signal(0);
  readonly keyboardInset = signal(0);
  readonly visibleHeight = signal<string | null>(null);
  readonly anchorOffset = signal(0);
  private resizeObserver?: ResizeObserver;
  private viewportCleanup?: () => void;
  private viewReady = false;
  private layoutFrame: number | null = null;
  private checkFocus = false;
  private formNode: HTMLElement | null = null;
  private anchorNode: HTMLElement | null = null;
  private scrollOwner: HTMLElement | null = null;
  private scrollEventsTarget: HTMLElement | Document | null = null;
  private ownerPadding = '';
  private ownerPaddingPriority = '';
  private ownerBasePadding = '0px';
  private readonly focusIn = (event: FocusEvent) => {
    const field = event.target as HTMLElement;
    if (!this.isFormControl(field) || !this.bar.nativeElement.getBoundingClientRect().height) return;
    if (this.expanded) this.collapse.emit();
    this.scheduleLayout(true);
  };
  private readonly outerScroll = () => {
    // Includes native scrollIntoView used by the tutorial; detail-body scrolling does not bubble here.
    if (this.expanded) this.collapse.emit();
  };
  get resolvedBottomOffset(): string {
    const offset = this.anchorOffset() > 0 ? `${this.anchorOffset()}px` : this.bottomOffset;
    return this.avoidKeyboard
      ? `max(${offset}, env(safe-area-inset-bottom, 0px), ${this.keyboardInset()}px)` : offset;
  }
  ngAfterViewInit(): void { this.viewReady = true; this.syncLayout(); }
  private syncLayout(): void {
    if (this.viewReady && this.reserveSpace && !this.resizeObserver && typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.scheduleLayout());
      for (const node of [this.bar, this.details, this.controls, this.handle]) if (node) this.resizeObserver.observe(node.nativeElement);
    } else if (!this.reserveSpace) {
      this.resizeObserver?.disconnect(); this.resizeObserver = undefined;
      this.releaseScrollOwner(); this.bindForm(null); this.anchorNode = null; this.anchorOffset.set(0);
    }
    if (this.viewReady && this.reserveSpace) this.scheduleLayout();
    if (!this.avoidKeyboard) {
      this.viewportCleanup?.(); this.viewportCleanup = undefined; this.keyboardInset.set(0); this.visibleHeight.set(null);
    } else if (!this.viewportCleanup && typeof window !== 'undefined' && window.visualViewport) {
      const viewport = window.visualViewport;
      const measure = (focus = false) => {
        this.keyboardInset.set(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
        this.visibleHeight.set(`${viewport.height}px`);
        this.scheduleLayout(focus);
      };
      const resize = () => measure(true), scroll = () => measure();
      viewport.addEventListener('resize', resize); viewport.addEventListener('scroll', scroll); measure();
      this.viewportCleanup = () => { viewport.removeEventListener('resize', resize); viewport.removeEventListener('scroll', scroll); };
    }
  }
  private scheduleLayout(focus = false): void {
    this.checkFocus ||= focus;
    if (!this.viewReady || !this.reserveSpace || this.layoutFrame !== null) return;
    this.layoutFrame = requestAnimationFrame(() => { this.layoutFrame = null; this.measureLayout(); });
  }
  private bindForm(form: HTMLElement | null): void {
    if (form === this.formNode) return;
    if (this.formNode) { this.formNode.removeEventListener('focusin', this.focusIn); this.resizeObserver?.unobserve(this.formNode); }
    this.formNode = form;
    if (form) { form.addEventListener('focusin', this.focusIn); this.resizeObserver?.observe(form); }
  }
  private findScrollOwner(node: HTMLElement): HTMLElement {
    for (let parent = node.parentElement; parent; parent = parent.parentElement) {
      if (/(auto|scroll|overlay)/.test(getComputedStyle(parent).overflowY) && parent.scrollHeight > parent.clientHeight) return parent;
    }
    return node.ownerDocument.scrollingElement as HTMLElement || node.ownerDocument.documentElement;
  }
  private releaseScrollOwner(): void {
    this.scrollEventsTarget?.removeEventListener('scroll', this.outerScroll); this.scrollEventsTarget = null;
    if (!this.scrollOwner) return;
    if (this.ownerPadding) this.scrollOwner.style.setProperty('scroll-padding-bottom', this.ownerPadding, this.ownerPaddingPriority);
    else this.scrollOwner.style.removeProperty('scroll-padding-bottom');
    this.scrollOwner = null;
  }
  private isFormControl(node: HTMLElement | null): boolean {
    return !!node?.matches('input, textarea, select, button, a[href], [contenteditable="true"], [role="combobox"], [tabindex]');
  }
  private measureLayout(): void {
    if (!this.reserveSpace) return;
    const bar = this.bar.nativeElement;
    const document = bar.ownerDocument;
    const box = bar.getBoundingClientRect();
    if (!box.height) { this.releaseScrollOwner(); this.reservedHeight.set(0); return; }
    const anchor = this.bottomAnchorSelector ? document.querySelector<HTMLElement>(this.bottomAnchorSelector) : null;
    if (anchor !== this.anchorNode) {
      if (this.anchorNode) this.resizeObserver?.unobserve(this.anchorNode);
      this.anchorNode = anchor; if (anchor) this.resizeObserver?.observe(anchor);
    }
    const anchorBox = anchor?.getBoundingClientRect();
    const offset = anchorBox?.height ? Math.max(0, window.innerHeight - anchorBox.top) : 0;
    if (offset !== this.anchorOffset()) { this.anchorOffset.set(offset); this.scheduleLayout(); }
    this.bindForm(this.actionForm ? document.getElementById(this.actionForm) : null);
    const owner = this.findScrollOwner(this.formNode || bar.parentElement!);
    if (owner !== this.scrollOwner) {
      this.releaseScrollOwner(); this.scrollOwner = owner;
      this.ownerPadding = owner.style.getPropertyValue('scroll-padding-bottom');
      this.ownerPaddingPriority = owner.style.getPropertyPriority('scroll-padding-bottom');
      this.ownerBasePadding = getComputedStyle(owner).scrollPaddingBottom || '0px';
      if (this.ownerBasePadding === 'auto') this.ownerBasePadding = '0px';
      this.scrollEventsTarget = owner === document.scrollingElement || owner === document.documentElement || owner === document.body ? document : owner;
      this.scrollEventsTarget.addEventListener('scroll', this.outerScroll);
    }
    const root = owner === document.scrollingElement || owner === document.documentElement || owner === document.body;
    const viewport = this.avoidKeyboard ? window.visualViewport : null;
    const portTop = root ? 0 : owner.getBoundingClientRect().top + owner.clientTop;
    const portBottom = root ? window.innerHeight : owner.getBoundingClientRect().bottom;
    // Expanded details never inflate the form's end spacer or move its scroll position.
    const collapsedHeight = Math.max(0, box.height - (this.details?.nativeElement.getBoundingClientRect().height || 0));
    const closedTop = box.bottom - collapsedHeight;
    // Native focus/scrollIntoView uses the scroll port, including its keyboard-covered portion.
    const obstruction = Math.ceil(Math.max(0, portBottom - closedTop) + 8);
    owner.style.setProperty('scroll-padding-bottom', `max(${this.ownerBasePadding}, ${obstruction}px)`);
    const spacer = this.clearance?.nativeElement.getBoundingClientRect().height || 0;
    const tail = this.formNode ? Math.max(0, owner.scrollHeight - (this.formNode.getBoundingClientRect().bottom - portTop + owner.scrollTop) - spacer) : 0;
    this.reservedHeight.set(Math.max(0, Math.ceil(obstruction - tail)));
    const active = document.activeElement as HTMLElement | null;
    if (this.checkFocus && this.formNode?.contains(active) && this.isFormControl(active)) {
      const field = active!.getBoundingClientRect();
      if (field.bottom > closedTop - 8 || field.top < Math.max(portTop, viewport?.offsetTop || 0) + 8) {
        active!.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      }
    }
    this.checkFocus = false;
  }
  ngOnDestroy(): void {
    if (this.layoutFrame !== null) cancelAnimationFrame(this.layoutFrame);
    this.releaseScrollOwner(); this.bindForm(null); this.resizeObserver?.disconnect(); this.viewportCleanup?.();
  }
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
