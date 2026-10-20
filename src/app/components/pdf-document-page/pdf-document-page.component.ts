import { BreakpointObserver } from '@angular/cdk/layout';
import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnDestroy, Optional, Output, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { PageCardComponent } from '../page-card/page-card.component';

/** Presentation only: the owner projects its safe PDF frame and retains all document operations. */
@Component({
  selector: 'app-pdf-document-page', standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule, PageCardComponent],
  templateUrl: './pdf-document-page.component.html', styleUrl: './pdf-document-page.component.scss',
})
export class PdfDocumentPageComponent implements AfterViewInit, OnDestroy {
  @Input() title = 'Documento PDF';
  @Input() subtitle = '';
  @Input() backLink: any[] = [];
  @Input() loading = false;
  @Input() error: string | null = null;
  @Input() pdfAvailable = false;
  @Input() saveAvailable = false;
  @Input() printAvailable = false;
  @Input() retryAvailable = true;
  @Input() viewerLabel = 'Visualizador de PDF';
  @Output() save = new EventEmitter<void>();
  @Output() print = new EventEmitter<void>();
  @Output() retry = new EventEmitter<void>();
  @ViewChild('viewer') private viewer?: ElementRef<HTMLElement>;
  isMobile = false;
  readonly inlinePdfSupported = typeof navigator === 'undefined' || navigator.pdfViewerEnabled !== false;
  private readonly layoutChanges?: Subscription;
  private observer?: ResizeObserver;
  private animationFrame?: number;
  private destroyed = false;

  constructor(private readonly element: ElementRef<HTMLElement>, @Optional() breakpoints?: BreakpointObserver) {
    this.layoutChanges = breakpoints?.observe(MOBILE_FOUNDATION_QUERY).subscribe(state => {
      this.isMobile = state.matches; this.scheduleFit();
    });
  }
  ngAfterViewInit(): void {
    if (typeof ResizeObserver !== 'undefined') {
      this.observer = new ResizeObserver(this.scheduleFit);
      this.observer.observe(this.element.nativeElement);
    }
    window.addEventListener('resize', this.scheduleFit);
    window.visualViewport?.addEventListener('resize', this.scheduleFit);
    this.scheduleFit();
  }
  private readonly scheduleFit = (): void => {
    if (!this.isMobile || this.destroyed) return;
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = requestAnimationFrame(() => {
      this.animationFrame = undefined;
      const viewer = this.viewer?.nativeElement;
      if (!viewer || this.destroyed) return;
      const viewport = window.visualViewport;
      const top = Math.max(0, viewer.getBoundingClientRect().top - (viewport?.offsetTop || 0));
      this.element.nativeElement.style.setProperty('--pdf-offset-top', `${top}px`);
      this.element.nativeElement.style.setProperty('--pdf-viewport-height', `${viewport?.height || window.innerHeight}px`);
    });
  };
  ngOnDestroy(): void {
    this.destroyed = true; this.layoutChanges?.unsubscribe(); this.observer?.disconnect();
    window.removeEventListener('resize', this.scheduleFit);
    window.visualViewport?.removeEventListener('resize', this.scheduleFit);
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
  }
}
