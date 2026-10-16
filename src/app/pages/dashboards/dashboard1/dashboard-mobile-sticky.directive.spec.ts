import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DashboardMobileStickyDirective } from './dashboard-mobile-sticky.directive';

@Component({ standalone: true, imports: [DashboardMobileStickyDirective], template: `
  <main class="pageWrapper"><header class="mobile-topbar"></header>
    <section><header appDashboardMobileSticky>Visão geral</header><p>Conteúdo</p></section>
  </main>` })
class HostComponent {}

describe('Offset sticky local do Dashboard', () => {
  let callback: ResizeObserverCallback;
  let observe: jasmine.Spy;
  let disconnect: jasmine.Spy;
  let original: typeof ResizeObserver;

  beforeEach(() => {
    original = window.ResizeObserver;
    observe = jasmine.createSpy('observe'); disconnect = jasmine.createSpy('disconnect');
    window.ResizeObserver = class {
      constructor(cb: ResizeObserverCallback) { callback = cb; }
      observe = observe; unobserve = () => {}; disconnect = disconnect;
    } as any;
    TestBed.configureTestingModule({ imports: [HostComponent] });
  });
  afterEach(() => { TestBed.resetTestingModule(); window.ResizeObserver = original; });

  it('mede o cabeçalho existente, acompanha mudanças e desconecta ao destruir, sem editar o shell', () => {
    const measurement = spyOn(HTMLElement.prototype, 'getBoundingClientRect').and.returnValue({ height: 61 } as DOMRect);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    const shell = fixture.nativeElement.querySelector('.mobile-topbar') as HTMLElement;
    const toolbar = fixture.nativeElement.querySelector('[appDashboardMobileSticky]') as HTMLElement;
    expect(toolbar.style.getPropertyValue('--dashboard-shell-header-height')).toBe('61px');
    expect(observe).toHaveBeenCalledOnceWith(shell);
    measurement.and.returnValue({ height: 73 } as DOMRect);
    callback([], {} as ResizeObserver);
    expect(toolbar.style.getPropertyValue('--dashboard-shell-header-height')).toBe('73px');
    expect(shell.getAttribute('style')).toBeNull();
    fixture.destroy(); expect(disconnect).toHaveBeenCalledTimes(1);
  });
});
