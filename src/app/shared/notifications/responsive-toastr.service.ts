import { DOCUMENT } from '@angular/common';
import { inject, Injectable, Injector, NgZone, SecurityContext } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { ActiveToast, IndividualConfig, Overlay, TOAST_CONFIG, ToastToken, ToastrService } from 'ngx-toastr';
import { take } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from '../responsive/mobile-foundation';
import { MobileToastComponent } from './mobile-toast.component';
import { MobileToastPositionService } from './mobile-toast-position.service';

type Kind = 'success' | 'error' | 'warning' | 'info';
const DURATION: Record<Kind, number> = { success: 3000, info: 4000, warning: 5000, error: 6000 };
const PRIORITY: Record<Kind, number> = { error: 0, warning: 1, info: 2, success: 3 };

/** Same public service token and ngx-toastr lifecycle; policies apply only at the mobile breakpoint. */
@Injectable()
export class ResponsiveToastrService extends ToastrService {
  private readonly document = inject(DOCUMENT);
  private readonly position = inject(MobileToastPositionService);
  private readonly htmlSanitizer = inject(DomSanitizer);
  private readonly kinds = new Map<number, Kind>();
  private readonly duplicates = new Map<string, ActiveToast<MobileToastComponent>>();

  constructor() {
    super(inject<ToastToken>(TOAST_CONFIG), inject(Overlay), inject(Injector), inject(DomSanitizer), inject(NgZone));
  }

  override success(message?: string, title?: string, override?: Partial<IndividualConfig>): ActiveToast<any> { return this.notify('success', message, title, override); }
  override error(message?: string, title?: string, override?: Partial<IndividualConfig>): ActiveToast<any> { return this.notify('error', message, title, override); }
  override warning(message?: string, title?: string, override?: Partial<IndividualConfig>): ActiveToast<any> { return this.notify('warning', message, title, override); }
  override info(message?: string, title?: string, override?: Partial<IndividualConfig>): ActiveToast<any> { return this.notify('info', message, title, override); }
  override show(message?: string, title?: string, override?: Partial<IndividualConfig>, type = ''): ActiveToast<any> {
    const kind = (Object.keys(this.toastrConfig.iconClasses) as Kind[]).find(key => this.toastrConfig.iconClasses[key] === type) || 'info';
    return this.notify(kind, message, title, override, type);
  }

  private notify(kind: Kind, message = '', title = '', override: Partial<IndividualConfig> = {}, type = this.toastrConfig.iconClasses[kind]): ActiveToast<any> {
    if (!this.document.defaultView?.matchMedia(MOBILE_FOUNDATION_QUERY).matches) {
      const toast = super.show(message, title, override, type);
      if (this.kinds.size) {
        // A desktop toast is active immediately. Keep ngx-toastr's active prefix intact
        // if a mobile queue survives a viewport change, so later removals cannot orphan it.
        const index = this.toasts.indexOf(toast);
        if (index >= this.currentlyActive) {
          this.toasts.splice(index, 1); this.toasts.splice(this.currentlyActive - 1, 0, toast);
        }
        this.position.track();
      }
      return toast;
    }
    const key = JSON.stringify([kind, title, message]);
    const duplicate = this.duplicates.get(key);
    if (duplicate) return duplicate;
    const timeOut = override.timeOut ?? Math.max(DURATION[kind], (message.length + title.length) * 45);
    const config: Partial<IndividualConfig> = {
      ...override,
      timeOut,
      // Mobile owns presentation, not page/business-specific content or payload.
      toastComponent: MobileToastComponent, toastClass: 'ngx-toastr mobile-toast', positionClass: 'toast-mobile',
      closeButton: true, tapToDismiss: false, newestOnTop: false, progressBar: false,
      easeTime: this.document.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 160,
    };
    // At most one pending group per semantic type: active + four queued groups.
    // Preserve every distinct message, including errors, instead of silently dropping overflow.
    const pending = this.toasts.slice(this.currentlyActive).find(toast => this.kinds.get(toast.toastId) === kind);
    let toast: ActiveToast<MobileToastComponent>;
    if (pending) {
      toast = pending;
      const component = toast.portal.instance;
      const asText = (text: string, html: boolean) => {
        if (!html) return text;
        const element = this.document.createElement('template');
        element.innerHTML = this.htmlSanitizer.sanitize(SecurityContext.HTML, text) || '';
        return element.content.textContent || '';
      };
      const oldText = [component.title, asText(component.message || '', component.options.enableHtml)].filter(Boolean).join('\n');
      const newText = [title, asText(message, !!override.enableHtml)].filter(Boolean).join('\n');
      component.title = ''; component.message = `${oldText}\n\n${newText}`;
      component.options.enableHtml = false;
      // Important batches remain consultable; routine batches still expire after reading time.
      component.options.disableTimeOut = component.options.disableTimeOut || override.disableTimeOut || kind === 'error' || kind === 'warning';
      if (component.options.timeOut === 0 || override.timeOut === 0) component.options.disableTimeOut = true;
      component.options.timeOut = Math.max(component.options.timeOut, timeOut, component.message.length * 45);
      component.originalTimeout = component.options.timeOut;
      toast.message = component.message; toast.title = '';
    } else {
      toast = this.withMobileQueue(() => super.show(message, title, config, `toast-${kind}`));
      this.kinds.set(toast.toastId, kind);
      toast.onHidden.pipe(take(1)).subscribe(() => {
        this.kinds.delete(toast.toastId);
        for (const [key, value] of this.duplicates) if (value === toast) this.duplicates.delete(key);
      });
      // Keep the active item first; prioritize only pending items. Never evict an active error.
      const active = this.toasts.slice(0, this.currentlyActive);
      const queued = this.toasts.slice(this.currentlyActive);
      queued.sort((a, b) => (PRIORITY[this.kinds.get(a.toastId) || 'info']) - (PRIORITY[this.kinds.get(b.toastId) || 'info']));
      this.toasts.splice(0, this.toasts.length, ...active, ...queued);
    }
    this.duplicates.set(key, toast);
    this.position.track();
    return toast;
  }

  override remove(toastId: number): boolean {
    const toast = this.toasts.find(item => item.toastId === toastId);
    if (!toast || !this.kinds.size) return super.remove(toastId);
    // ngx-toastr decrements its active count even when removing an inactive queued item.
    if (this.toasts.indexOf(toast) >= this.currentlyActive) this.currentlyActive++;
    return this.withMobileQueue(() => super.remove(toastId));
  }

  private withMobileQueue<T>(work: () => T): T {
    const original = this.toastrConfig;
    this.toastrConfig = { ...original, maxOpened: 1, autoDismiss: false, preventDuplicates: false };
    try { return work(); } finally { this.toastrConfig = original; }
  }
}
