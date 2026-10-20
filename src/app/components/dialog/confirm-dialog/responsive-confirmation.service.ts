import { BreakpointObserver } from '@angular/cdk/layout';
import { DOCUMENT } from '@angular/common';
import { inject, Injectable } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { fromEvent, merge, Subscription, take } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from '../../../shared/responsive/mobile-foundation';
import { ConfirmDialogData } from './confirm-dialog.models';

/** Adapt only the existing simple-confirmation surface; Material owns its lifecycle. */
@Injectable({ providedIn: 'root' })
export class ResponsiveConfirmationService {
  private readonly breakpoints = inject(BreakpointObserver);
  private readonly document = inject(DOCUMENT);
  private readonly active = new Map<string, MatDialogRef<unknown>>();

  attach(ref: MatDialogRef<unknown>, host: HTMLElement, data: ConfirmDialogData, onMobile: (mobile: boolean) => void): Subscription {
    const subscriptions = new Subscription();
    const key = JSON.stringify([data.title, data.message, data.type, data.details, data.confirmText, data.cancelText, data.confirmColor]);
    if (this.active.has(key)) { ref.addPanelClass('confirmation-duplicate'); ref.close(false); return subscriptions; }
    this.active.set(key, ref);
    const pane = host.closest<HTMLElement>('.cdk-overlay-pane');
    const wrapper = pane?.parentElement;
    ref.addPanelClass('confirmation-responsive');
    wrapper?.classList.add('confirmation-overlay-wrapper');
    subscriptions.add(this.breakpoints.observe(MOBILE_FOUNDATION_QUERY).subscribe(state => onMobile(state.matches)));
    subscriptions.add(ref.beforeClosed().pipe(take(1)).subscribe(() => {
      this.active.delete(key); ref.addPanelClass('confirmation-responsive--closing');
    }));
    subscriptions.add(() => { if (this.active.get(key) === ref) this.active.delete(key); });
    const viewport = this.document.defaultView?.visualViewport;
    if (viewport && pane && wrapper) {
      const fit = () => {
        pane.style.setProperty('--confirmation-visible-height', `${viewport.height}px`);
        wrapper.style.setProperty('--confirmation-keyboard-offset', `${Math.max(0, (this.document.defaultView?.innerHeight || 0) - viewport.height - viewport.offsetTop)}px`);
      };
      fit(); subscriptions.add(merge(fromEvent(viewport, 'resize'), fromEvent(viewport, 'scroll')).subscribe(fit));
    }
    return subscriptions;
  }

  describe(host: HTMLElement, messageId: string): void {
    const dialog = host.closest('[role="dialog"], [role="alertdialog"]');
    if (dialog && !dialog.hasAttribute('aria-describedby')) dialog.setAttribute('aria-describedby', messageId);
  }
}
