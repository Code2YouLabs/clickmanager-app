import { DOCUMENT } from '@angular/common';
import { inject, Injectable, NgZone, OnDestroy } from '@angular/core';
import { OverlayContainer as ToastOverlayContainer } from 'ngx-toastr';
import { MOBILE_FOUNDATION_QUERY } from '../responsive/mobile-foundation';

/** Measures existing surfaces, without changing the shell or any page. */
@Injectable({ providedIn: 'root' })
export class MobileToastPositionService implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly zone = inject(NgZone);
  private readonly overlay = inject(ToastOverlayContainer);
  private mutations?: MutationObserver;
  private sizes?: ResizeObserver;
  private frame = 0;
  private observed: Element[] = [];
  private readonly schedule = () => {
    const win = this.document.defaultView;
    if (win && !this.frame) this.frame = win.requestAnimationFrame(() => { this.frame = 0; this.update(); });
  };

  track(): void {
    if (!this.mutations) this.zone.runOutsideAngular(() => {
      this.mutations = new MutationObserver(this.schedule);
      this.mutations.observe(this.document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'style'] });
      this.sizes = new ResizeObserver(this.schedule);
      const win = this.document.defaultView;
      win?.addEventListener('resize', this.schedule);
      win?.addEventListener('scroll', this.schedule, true);
      this.document.addEventListener('focusin', this.schedule);
      win?.visualViewport?.addEventListener('resize', this.schedule);
      win?.visualViewport?.addEventListener('scroll', this.schedule);
    });
    this.update();
  }

  private update(): void {
    const win = this.document.defaultView;
    if (!win) return;
    const container = this.overlay.getContainerElement();
    if (!container.querySelector('app-mobile-toast')) {
      this.ngOnDestroy();
      if (container.parentElement !== this.document.body) this.document.body.appendChild(container);
      if (container.getAttribute('aria-live') !== 'polite') container.setAttribute('aria-live', 'polite');
      return;
    }
    if (!win.matchMedia(MOBILE_FOUNDATION_QUERY).matches) {
      if (container.parentElement !== this.document.body) this.document.body.appendChild(container);
      if (container.getAttribute('aria-live') !== 'polite') container.setAttribute('aria-live', 'polite');
      return;
    }
    // One live region per notification, rather than both ngx-toastr's wrapper and content.
    if (container.getAttribute('aria-live') !== 'off') container.setAttribute('aria-live', 'off');
    const dialogs = Array.from(this.document.querySelectorAll<HTMLElement>('.cdk-overlay-pane .mat-mdc-dialog-container'));
    const dialog = dialogs.at(-1);
    const sheet = this.document.querySelector<HTMLElement>('.mobile-sheet--open');
    const header = dialog?.querySelector<HTMLElement>('.mobile-side-panel__header, [mat-dialog-title], .mat-mdc-dialog-title')
      || sheet?.querySelector<HTMLElement>('.mobile-sheet__top')
      || (!dialog && !sheet ? this.document.querySelector<HTMLElement>('.mobile-topbar') : null);
    // Stay inside the active modal's accessibility/focus boundary and stacking context.
    // Append outside its translated inner surface so fixed coordinates remain viewport-based.
    const parent = dialog || this.document.body;
    if (container.parentElement !== parent || (dialog && parent.lastElementChild !== container)) parent.appendChild(container);
    if (dialog) container.removeAttribute('aria-hidden');
    const viewport = win.visualViewport;
    const viewportTop = viewport?.offsetTop || 0;
    const viewportBottom = viewportTop + (viewport?.height || win.innerHeight);
    let top = Math.max(viewportTop, header?.getBoundingClientRect().bottom ?? dialog?.getBoundingClientRect().top ?? viewportTop) + 8;
    let available = viewportBottom - top - 8;
    const active = this.document.activeElement;
    const toast = container.querySelector<HTMLElement>('.mobile-toast:not([style*="display: none"])');
    if (active instanceof HTMLElement && active.matches('input, textarea, select, [contenteditable="true"]')) {
      const field = active.getBoundingClientRect();
      const height = toast?.getBoundingClientRect().height || 0;
      if (field.bottom > top && field.top < top + height) {
        if (field.top - top >= 44) available = Math.min(available, field.top - top - 8);
        else if (viewportBottom - field.bottom >= 60) { top = field.bottom + 8; available = viewportBottom - top - 8; }
      }
    }
    const properties: Record<string, string> = {
      '--mobile-toast-top': `${top}px`,
      '--mobile-toast-max-height': `${Math.max(0, Math.min(available - 16, (viewport?.height || win.innerHeight) * .35))}px`,
    };
    for (const [name, value] of Object.entries(properties)) if (container.style.getPropertyValue(name) !== value) container.style.setProperty(name, value);
    const observed = [header, toast].filter((element): element is HTMLElement => !!element);
    if (observed.length !== this.observed.length || observed.some((element, i) => element !== this.observed[i])) {
      this.sizes?.disconnect(); observed.forEach(element => this.sizes?.observe(element)); this.observed = observed;
    }
  }

  ngOnDestroy(): void {
    this.mutations?.disconnect(); this.sizes?.disconnect();
    this.mutations = undefined; this.sizes = undefined; this.observed = [];
    const win = this.document.defaultView;
    if (this.frame) win?.cancelAnimationFrame(this.frame);
    this.frame = 0;
    win?.removeEventListener('resize', this.schedule); win?.removeEventListener('scroll', this.schedule, true);
    this.document.removeEventListener('focusin', this.schedule);
    win?.visualViewport?.removeEventListener('resize', this.schedule); win?.visualViewport?.removeEventListener('scroll', this.schedule);
  }
}
