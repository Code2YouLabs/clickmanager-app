import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { OverlayContainer, provideToastr } from 'ngx-toastr';
import { MobileToastPositionService } from './mobile-toast-position.service';

describe('Posicionamento global dos toasts mobile (métricas simuladas)', () => {
  let service: MobileToastPositionService;
  let container: HTMLElement;
  let shell: HTMLElement;
  let cdk: HTMLElement;
  let toast: HTMLElement;
  let viewport: EventTarget & { height: number; offsetTop: number };
  beforeEach(() => {
    spyOn(window, 'matchMedia').and.returnValue({ matches: true } as MediaQueryList);
    viewport = Object.assign(new EventTarget(), { height: 700, offsetTop: 0 });
    spyOnProperty(window, 'visualViewport', 'get').and.returnValue(viewport as VisualViewport);
    TestBed.configureTestingModule({ providers: [provideToastr()] });
    container = TestBed.inject(OverlayContainer).getContainerElement();
    shell = document.createElement('header'); shell.className = 'mobile-topbar'; document.body.appendChild(shell);
    spyOn(shell, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 360, 74));
    toast = document.createElement('app-mobile-toast'); toast.className = 'mobile-toast'; container.appendChild(toast);
    spyOn(toast, 'getBoundingClientRect').and.returnValue(new DOMRect(12, 82, 336, 60));
    service = TestBed.inject(MobileToastPositionService);
  });
  afterEach(() => { service.ngOnDestroy(); shell.remove(); cdk?.remove(); });

  it('mede a borda real do cabeçalho, sem altura fixa nem alteração do shell', () => {
    service.track();
    expect(container.style.getPropertyValue('--mobile-toast-top')).toBe('82px');
    expect(parseFloat(container.style.getPropertyValue('--mobile-toast-max-height'))).toBeCloseTo(245);
    expect(shell.getAttribute('style')).toBeNull();
    expect(container.getAttribute('aria-live')).toBe('off');
  });

  it('acompanha painel, diálogo e fechamento, mantendo a camada após o painel ativo', fakeAsync(() => {
    cdk = document.createElement('div'); cdk.className = 'cdk-overlay-container';
    cdk.innerHTML = '<div class="cdk-overlay-pane"><div class="mat-mdc-dialog-container"><header class="mobile-side-panel__header"></header></div></div>';
    document.body.appendChild(cdk);
    const panelHeader = cdk.querySelector<HTMLElement>('header')!;
    spyOn(panelHeader, 'getBoundingClientRect').and.returnValue(new DOMRect(0, 0, 360, 68));
    service.track(); expect(container.parentElement).toBe(cdk.querySelector<HTMLElement>('.mat-mdc-dialog-container')); expect(container.parentElement!.lastElementChild).toBe(container);
    expect(container.style.getPropertyValue('--mobile-toast-top')).toBe('76px');
    cdk.querySelector('.cdk-overlay-pane')!.remove(); window.dispatchEvent(new Event('resize')); tick(20);
    expect(container.parentElement).toBe(document.body); expect(container.style.getPropertyValue('--mobile-toast-top')).toBe('82px');
  }));

  it('segue cabeçalho de diálogo centralizado em vez do cabeçalho da tela atrás dele', () => {
    cdk = document.createElement('div'); cdk.className = 'cdk-overlay-container';
    cdk.innerHTML = '<div class="cdk-overlay-pane"><div class="mat-mdc-dialog-container"><h2 mat-dialog-title>Confirmar</h2></div></div>';
    document.body.appendChild(cdk);
    spyOn(cdk.querySelector<HTMLElement>('h2')!, 'getBoundingClientRect').and.returnValue(new DOMRect(24, 170, 312, 48));
    service.track(); expect(container.style.getPropertyValue('--mobile-toast-top')).toBe('226px');
  });

  it('acompanha viewport/teclado sem focar ou rolar o campo e evita o campo quando há espaço', fakeAsync(() => {
    const input = document.createElement('textarea'); document.body.appendChild(input); input.focus();
    spyOn(input, 'getBoundingClientRect').and.returnValue(new DOMRect(12, 90, 336, 44));
    const scroll = spyOn(input, 'scrollIntoView'); service.track();
    expect(container.style.getPropertyValue('--mobile-toast-top')).toBe('142px');
    viewport.height = 360; viewport.offsetTop = 20; viewport.dispatchEvent(new Event('resize')); tick(20);
    expect(parseFloat(container.style.getPropertyValue('--mobile-toast-max-height'))).toBeCloseTo(126);
    expect(document.activeElement).toBe(input); expect(scroll).not.toHaveBeenCalled();
    input.remove();
  }));

  it('desconecta observadores e listeners ao destruir, sem reagir a teclado posterior', fakeAsync(() => {
    service.track(); service.ngOnDestroy();
    viewport.offsetTop = 200; viewport.dispatchEvent(new Event('resize')); tick(20);
    expect(container.style.getPropertyValue('--mobile-toast-top')).toBe('82px');
  }));
});
