import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { OverlayContainer } from '@angular/cdk/overlay';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ConfirmDialogComponent } from './confirm-dialog.component';

@Component({ standalone: true, imports: [MatDialogModule], template: '<button type="button">Abrir</button>' })
class Host {}

describe('ConfirmDialog contract', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [Host, ConfirmDialogComponent, NoopAnimationsModule] }));
  afterEach(() => TestBed.resetTestingModule());
  for (const confirmed of [false, true]) {
    it(`preserva mensagem, foco e fechamento com ${confirmed ? 'confirmação' : 'cancelamento'}`, fakeAsync(() => {
      const f = TestBed.createComponent(Host); f.detectChanges(); document.body.appendChild(f.nativeElement);
      const trigger = f.nativeElement.querySelector('button'); trigger.focus();
      const ref = TestBed.inject(MatDialog).open(ConfirmDialogComponent, { width: '480px', data: {
        title: 'Cancelar pedido?', message: 'Essa etapa é final.', cancelText: 'Voltar', confirmText: 'Cancelar pedido',
      } });
      let result: boolean | undefined;
      ref.afterClosed().subscribe(value => result = value);
      tick();
      const overlay = TestBed.inject(OverlayContainer).getContainerElement();
      const buttons = overlay.querySelectorAll<HTMLButtonElement>('mat-dialog-actions button');
      expect(overlay.textContent).toContain('Essa etapa é final.');
      expect(overlay.textContent).toContain('Voltar');
      expect(overlay.contains(document.activeElement)).toBeTrue();
      buttons[confirmed ? 1 : 0].click(); tick();
      expect(result).toBe(confirmed);
      expect(document.activeElement).toBe(trigger);
      f.nativeElement.remove();
    }));
  }
  it('mantém fechamento por Escape sem confirmar', fakeAsync(() => {
    const ref = TestBed.inject(MatDialog).open(ConfirmDialogComponent, { data: { message: 'Confirmar?' } });
    let result: boolean | undefined = true; ref.afterClosed().subscribe(value => result = value); tick();
    const overlay = TestBed.inject(OverlayContainer).getContainerElement();
    overlay.querySelector('.cdk-overlay-pane')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
    tick(); expect(result).toBeUndefined();
  }));
});
