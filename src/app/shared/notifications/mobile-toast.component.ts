import { Component, NgZone } from '@angular/core';
import { animate, state, style, transition, trigger } from '@angular/animations';
import { Toast, ToastPackage, ToastrService } from 'ngx-toastr';

/** Presentation only: activation, timers, dismissal and references remain ngx-toastr's. */
@Component({
  selector: 'app-mobile-toast',
  standalone: true,
  templateUrl: './mobile-toast.component.html',
  styleUrl: './mobile-toast.component.scss',
  host: {
    '[class]': 'toastClasses',
    '[@flyInOut]': '_state',
    '[style.display]': 'displayStyle',
  },
  animations: [trigger('flyInOut', [
    state('inactive', style({ opacity: 0 })),
    state('active', style({ opacity: 1 })),
    state('removed', style({ opacity: 0 })),
    transition('inactive => active, active => removed', animate('{{ easeTime }}ms cubic-bezier(0.22, 1, 0.36, 1)')),
  ])],
})
export class MobileToastComponent extends Toast {
  private activated = false;
  constructor(service: ToastrService, toastPackage: ToastPackage, zone: NgZone) {
    super(service, toastPackage, zone);
  }

  override activateToast(): void { this.activated = true; super.activateToast(); }
  override get displayStyle(): string | undefined { return this.activated ? super.displayStyle : 'none'; }
  // Synthesized mouseenter on touch must not leave a brief success permanently paused.
  override stickAround(): void {}
  override delayedHideToast(): void {}

  get kind(): string { return this.toastPackage.toastType.replace('toast-', ''); }
  get urgent(): boolean { return this.kind === 'error'; }
  get iconPath(): string {
    switch (this.kind) {
      case 'success': return 'm5 12 4 4 10-10';
      case 'error': return 'm9 9 6 6m0-6-6 6M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18';
      case 'warning': return 'm12 3 10 18H2L12 3Zm0 5v5m0 4h.01';
      default: return 'M12 11v6m0-10h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18';
    }
  }
}
