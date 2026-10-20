import { BreakpointObserver } from '@angular/cdk/layout';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { fakeAsync, TestBed, tick } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { BehaviorSubject } from 'rxjs';
import { ConfirmDialogComponent } from './confirm-dialog.component';
import { ConfirmDialogData } from './confirm-dialog.models';

@Component({ standalone: true, template: '<button>Abrir</button>' })
class Host {}

describe('Confirmação compartilhada responsiva', () => {
  let mobile: BehaviorSubject<any>;
  const overlay = () => TestBed.inject(OverlayContainer).getContainerElement();
  const open = (data: Partial<ConfirmDialogData> = {}, disableClose = false) => TestBed.inject(MatDialog).open(ConfirmDialogComponent, {
    width: '440px', disableClose, data: { message: 'Mensagem real.', ...data },
  });
  beforeEach(() => {
    mobile = new BehaviorSubject({ matches: true, breakpoints: {} });
    TestBed.configureTestingModule({ imports: [Host, ConfirmDialogComponent, NoopAnimationsModule], providers: [{ provide: BreakpointObserver, useValue: { observe: () => mobile } }] });
  });
  afterEach(fakeAsync(() => { TestBed.inject(MatDialog).closeAll(); tick(400); TestBed.resetTestingModule(); }));

  for (const [type, color] of [['default', 'primary'], ['warning', 'accent'], ['destructive', 'warn']] as const) {
    it(`suporta tipo ${type}, rótulos e detalhes sem mudar o retorno booleano`, fakeAsync(() => {
      const ref = open({ type, title: 'Executar ação?', confirmText: 'Executar ação', cancelText: 'Voltar', details: [{ label: 'Referência', value: '#33' }] }); tick();
      expect(ref.componentInstance.mobile).toBeTrue(); expect(ref.componentInstance.confirmColor).toBe(color);
      expect(overlay().querySelector('.confirmation-responsive')).not.toBeNull();
      expect(overlay().querySelector('.confirmation-overlay-wrapper')).not.toBeNull();
      expect(overlay().querySelector('.confirmation-handle')).not.toBeNull();
      expect(overlay().textContent).toContain('#33'); expect(overlay().textContent).toContain('Mensagem real.');
      let result: unknown; ref.afterClosed().subscribe(value => result = value);
      (overlay().querySelector('.confirmation-submit') as HTMLButtonElement).click(); tick(400); expect(result).toBeTrue();
    }));
  }

  for (const mode of ['Voltar', 'X', 'Escape', 'backdrop']) {
    it(`${mode} significa desistência e restaura o foco`, fakeAsync(() => {
      const f = TestBed.createComponent(Host); f.detectChanges(); document.body.appendChild(f.nativeElement);
      const trigger = f.nativeElement.querySelector('button'); trigger.focus();
      const ref = open({ type: 'destructive' }); let result: unknown = true; ref.afterClosed().subscribe(value => result = value); tick();
      expect(overlay().contains(document.activeElement)).toBeTrue();
      expect(document.activeElement?.classList.contains('confirmation-submit')).toBeFalse();
      if (mode === 'Voltar') (overlay().querySelector('.confirmation-back') as HTMLButtonElement).click();
      else if (mode === 'X') (overlay().querySelector('[aria-label="Fechar confirmação"]') as HTMLButtonElement).click();
      else if (mode === 'Escape') overlay().querySelector('.cdk-overlay-pane')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      else (overlay().querySelector('.cdk-overlay-backdrop') as HTMLElement).click();
      tick(400); expect(result === true).toBeFalse(); expect(document.activeElement).toBe(trigger);
      f.nativeElement.remove();
    }));
  }

  it('mantém desktop e compatibilidade com confirmColor legado, sem handle ou X novos', fakeAsync(() => {
    mobile.next({ matches: false }); const ref = open({ confirmColor: 'primary', message: 'Legado' }); tick();
    expect(ref.componentInstance.mobile).toBeFalse(); expect(ref.componentInstance.confirmColor).toBe('primary');
    expect(overlay().querySelector('.confirmation-handle')).toBeNull(); expect(overlay().querySelector('[aria-label="Fechar confirmação"]')).toBeNull();
    expect((overlay().querySelector('.cdk-overlay-pane') as HTMLElement).style.width).toBe('440px');
    expect((overlay().querySelector('.cdk-global-overlay-wrapper') as HTMLElement).style.alignItems).toBe('center');
  }));

  it('bloqueia duplicidade, processamento e fechamento, permitindo retry no modo assíncrono opt-in', fakeAsync(() => {
    const ref = open({ deferClose: true }); tick(); const component = ref.componentInstance;
    const requests = jasmine.createSpy(); component.confirmRequested.subscribe(requests);
    component.confirm(); component.confirm(); tick(); expect(requests).toHaveBeenCalledTimes(1);
    expect(component.processing).toBeTrue(); expect(ref.disableClose).toBeTrue();
    component.dismiss(); tick(); expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    component.setProcessing(false, 'Falha de API.'); ref.componentRef!.changeDetectorRef.detectChanges();
    expect(overlay().querySelector('[role="alert"]')!.textContent).toContain('Falha de API.');
    component.confirm(); expect(requests).toHaveBeenCalledTimes(2);
    let result: unknown; ref.afterClosed().subscribe(value => result = value); component.finish(true); tick(400); expect(result).toBeTrue();
  }));

  it('respeita disabled e disableClose do consumidor, sem confirmação implícita', fakeAsync(() => {
    const ref = open({ disabled: true }, true); tick(); ref.componentInstance.confirm();
    expect(TestBed.inject(MatDialog).openDialogs.length).toBe(1);
    ref.componentInstance.setProcessing(false); expect(ref.disableClose).toBeTrue();
    ref.componentInstance.dismiss(); tick(400); expect(TestBed.inject(MatDialog).openDialogs.length).toBe(0);
  }));

  it('descarta uma abertura repetida da mesma confirmação com resultado falso', fakeAsync(() => {
    const one = open(); tick(); const two = open(); let result: unknown = true; two.afterClosed().subscribe(value => result = value); tick(400);
    expect(result).toBeFalse(); expect(TestBed.inject(MatDialog).openDialogs).toEqual([one]);
  }));

  it('mantém texto longo e acompanha viewport simulada sem mover o formulário', fakeAsync(() => {
    const viewport = Object.assign(new EventTarget(), { height: 390, offsetTop: 0 });
    spyOnProperty(window, 'visualViewport', 'get').and.returnValue(viewport as VisualViewport);
    const text = 'Mensagem completa para consulta. '.repeat(100); const ref = open({ message: text }); tick();
    const pane = overlay().querySelector<HTMLElement>('.confirmation-responsive')!;
    expect(overlay().querySelector('mat-dialog-content')!.textContent).toContain(text);
    expect(pane.style.getPropertyValue('--confirmation-visible-height')).toBe('390px');
    viewport.height = 260; viewport.dispatchEvent(new Event('resize')); expect(pane.style.getPropertyValue('--confirmation-visible-height')).toBe('260px');
    const message = overlay().querySelector('mat-dialog-content')!;
    expect(overlay().querySelector('[role="dialog"]')!.getAttribute('aria-describedby')).toBe(message.id);
    ref.close(); tick(400); viewport.height = 300; viewport.dispatchEvent(new Event('resize'));
    expect(pane.style.getPropertyValue('--confirmation-visible-height')).toBe('260px');
  }));
});
