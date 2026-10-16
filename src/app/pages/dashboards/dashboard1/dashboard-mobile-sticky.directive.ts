import { Directive, ElementRef, OnDestroy, OnInit, inject } from '@angular/core';

/** Dashboard-only offset: follows the existing shell's real height without changing global layout. */
@Directive({ selector: '[appDashboardMobileSticky]', standalone: true })
export class DashboardMobileStickyDirective implements OnInit, OnDestroy {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private observer?: ResizeObserver;

  ngOnInit(): void {
    const toolbar = this.element.nativeElement;
    const shellHeader = toolbar.closest('.pageWrapper')?.querySelector<HTMLElement>(':scope > .mobile-topbar');
    if (!shellHeader) return;
    const update = () => toolbar.style.setProperty('--dashboard-shell-header-height', shellHeader.getBoundingClientRect().height + 'px');
    update();
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(update);
      this.observer.observe(shellHeader);
    }
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
