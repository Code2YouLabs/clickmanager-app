import { ComponentType } from '@angular/cdk/portal';
import { TemplateRef } from '@angular/core';
import { MatDialog, MatDialogConfig, MatDialogRef } from '@angular/material/dialog';
import { fromEvent, merge, take, takeUntil } from 'rxjs';

/** Full-screen right-hand panel shared by mobile filters and forms.
 * Material retains focus trapping, scroll locking, Escape and navigation handling.
 */
export function openMobileSidePanel<T, D = unknown, R = unknown>(
  dialog: MatDialog,
  content: ComponentType<T> | TemplateRef<T>,
  config: MatDialogConfig<D>,
): MatDialogRef<T, R> {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const extraClasses = typeof config.panelClass === 'string' ? [config.panelClass] : config.panelClass || [];
  const ref = dialog.open<T, D, R>(content, {
    ...config,
    panelClass: ['mobile-side-panel', ...extraClasses],
    // Focusing a translated child can scroll the overlay mid-slide.
    autoFocus: 'dialog', delayFocusTrap: false, restoreFocus: true, closeOnNavigation: true,
    width: '100vw', maxWidth: '100vw', height: '100dvh', maxHeight: '100dvh',
    position: { top: '0', right: '0' },
    enterAnimationDuration: reducedMotion ? 0 : 360,
    exitAnimationDuration: reducedMotion ? 0 : 300,
  });
  // Start the exit before Material removes --open to avoid a hidden frame.
  ref.beforeClosed().pipe(take(1)).subscribe(() => ref.addPanelClass('mobile-side-panel--closing'));
  const viewport = window.visualViewport;
  if (viewport) {
    const fitViewport = () => ref.updateSize('100vw', `${viewport.height}px`)
      .updatePosition({ top: `${viewport.offsetTop}px`, right: '0' });
    fitViewport();
    merge(fromEvent(viewport, 'resize'), fromEvent(viewport, 'scroll'))
      .pipe(takeUntil(ref.afterClosed())).subscribe(fitViewport);
  }
  return ref;
}
