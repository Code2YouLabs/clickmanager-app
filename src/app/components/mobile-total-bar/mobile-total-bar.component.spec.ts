import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MobileTotalBarComponent } from './mobile-total-bar.component';
import { provideRouter } from '@angular/router';
import { By } from '@angular/platform-browser';

@Component({
  standalone: true,
  imports: [MobileTotalBarComponent],
  template: `
    <div class="form-scroll-port" [style.overflow-y]="scrollable ? 'auto' : null">
    <form id="test-form" (submit)="submits = submits + 1; $event.preventDefault()"><input class="form-field" value="Dados preservados"><button type="button" class="form-action">Adicionar produto</button></form>
    <app-mobile-total-bar [inlineDetails]="inlineDetails" [awaitingResult]="awaitingResult" [loading]="loading" [expanded]="expanded" detailsPanelId="test-details"
      [appearance]="appearance" [actionType]="actionType" [actionForm]="actionForm" [actionTutorialTarget]="tutorialTarget" [reserveSpace]="reserveSpace" [avoidKeyboard]="avoidKeyboard"
      [bottomAnchorSelector]="anchorSelector"
      [expandable]="expandable" valueText="R$ 123,45" actionText="Criar rascunho" [actionDisabled]="disabled"
      secondaryActionText="Revisar" [detailText]="expanded ? 'Ocultar detalhes' : 'Detalhes'"
      (collapse)="expanded = false" (expand)="expanded = !expanded; expansions = expansions + 1"
      (action)="actions = actions + 1" (secondaryAction)="secondaryActions = secondaryActions + 1">
      <h2 total-bar-details-header>Detalhes do cálculo</h2>
      <div total-bar-details><p>Distribuição da produção</p><button type="button" class="clear" (click)="clears = clears + 1">Limpar cálculo</button></div>
    </app-mobile-total-bar></div><nav class="test-bottom-anchor"></nav>`,
})
class HostComponent {
  appearance: 'default' | 'compact' = 'default';
  scrollable = false;
  anchorSelector = '';
  actionType: 'button' | 'submit' = 'button';
  actionForm: string | null = null;
  tutorialTarget = '';
  reserveSpace = false;
  avoidKeyboard = false;
  submits = 0;
  inlineDetails = true;
  awaitingResult = false;
  loading = false;
  expanded = false;
  expandable = true;
  disabled = false;
  expansions = 0;
  actions = 0;
  secondaryActions = 0;
  clears = 0;
}

describe('MobileTotalBarComponent — detalhes internos opcionais', () => {
  let fixture: ComponentFixture<HostComponent>;
  const query = <T extends HTMLElement = HTMLElement>(selector: string): T => fixture.nativeElement.querySelector(selector);
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HostComponent, NoopAnimationsModule], providers: [provideRouter([])] });
    fixture = TestBed.createComponent(HostComponent); fixture.detectChanges();
  });

  it('adota a aparência compacta compartilhada e preserva submit nativo e alvo do tutorial', () => {
    const host = fixture.componentInstance;
    expect(query('.mobile-total-bar--compact')).toBeNull();
    host.appearance = 'compact'; host.actionType = 'submit'; host.actionForm = 'test-form'; host.tutorialTarget = 'salvar-formulario';
    fixture.detectChanges(); expect(query('.mobile-total-bar--compact')).toBeTruthy();
    const button = query<HTMLButtonElement>('.mobile-total-bar__cta');
    expect(button.type).toBe('submit'); expect(button.form?.id).toBe('test-form');
    expect(button.getAttribute('data-tutorial-target')).toBe('salvar-formulario');
    button.click(); expect(host.submits).toBe(1); expect(host.actions).toBe(1);
    host.disabled = true; fixture.detectChanges(); button.click(); expect(host.submits).toBe(1);
  });

  it('oferece reserva de rolagem e acompanhamento do teclado como opções genéricas', () => {
    const visible = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
    spyOnProperty(window, 'visualViewport', 'get').and.returnValue(visible as VisualViewport);
    const host = fixture.componentInstance; host.reserveSpace = true; host.avoidKeyboard = true; fixture.detectChanges();
    expect(query('.mobile-total-bar__clearance').getAttribute('aria-hidden')).toBe('true');
    visible.height = window.innerHeight - 250; visible.dispatchEvent(new Event('resize')); fixture.detectChanges();
    expect(query('.mobile-total-bar').style.bottom).toContain('250px');
    host.reserveSpace = false; host.avoidKeyboard = false; fixture.detectChanges();
    expect(query('.mobile-total-bar__clearance')).toBeNull(); expect(query('.mobile-total-bar').style.bottom).toBe('0px');
  });

  describe('integração com a superfície real de rolagem', () => {
    let originalObserver: typeof ResizeObserver;
    let notifyResize: ResizeObserverCallback;
    let observer: ResizeObserver;

    beforeEach(() => {
      originalObserver = window.ResizeObserver;
      observer = { observe: jasmine.createSpy(), unobserve: jasmine.createSpy(), disconnect: jasmine.createSpy() };
      window.ResizeObserver = class {
        constructor(callback: ResizeObserverCallback) { notifyResize = callback; return observer; }
      } as any;
    });
    afterEach(() => { fixture.destroy(); window.ResizeObserver = originalObserver; });

    // Deterministic layout metrics exercise the arithmetic without visual testing or screenshots.
    const prepare = (tail = 50) => {
      const host = fixture.componentInstance;
      host.scrollable = true; host.reserveSpace = true; host.actionForm = 'test-form'; host.anchorSelector = '.test-bottom-anchor';
      const component = fixture.debugElement.query(By.directive(MobileTotalBarComponent)).componentInstance as MobileTotalBarComponent;
      const port = query('.form-scroll-port'), form = query('#test-form');
      const viewportHeight = window.innerHeight;
      port.style.scrollPaddingBottom = '24px';
      Object.defineProperties(port, {
        clientHeight: { configurable: true, value: viewportHeight },
        scrollHeight: { configurable: true, get: () => viewportHeight + 400 + (parseFloat(query('.mobile-total-bar__clearance')?.style.height || '0') || 0) },
        scrollTop: { configurable: true, writable: true, value: 123 },
      });
      spyOn(port, 'getBoundingClientRect').and.callFake(() => new DOMRect(0, 0, 360, viewportHeight));
      spyOn(form, 'getBoundingClientRect').and.callFake(() => new DOMRect(0, -port.scrollTop, 360, viewportHeight + 400 - tail));
      spyOn(query('.test-bottom-anchor'), 'getBoundingClientRect').and.returnValue(new DOMRect(0, viewportHeight - 72, 360, 72));
      spyOn(query('.mobile-total-bar'), 'getBoundingClientRect').and.callFake(() => {
        const height = 112 + (host.expanded ? 240 : 0);
        return new DOMRect(0, viewportHeight - Math.max(72, component.keyboardInset()) - height, 360, height);
      });
      spyOn(query('.mobile-total-bar__details'), 'getBoundingClientRect').and.callFake(() => new DOMRect(0, 0, 360, host.expanded ? 240 : 0));
      fixture.detectChanges();
      spyOn(query('.mobile-total-bar__clearance'), 'getBoundingClientRect').and.callFake(() => new DOMRect(0, 0, 360, parseFloat(query('.mobile-total-bar__clearance').style.height) || 0));
      return { host, component, port, form };
    };

    it('mede a navegação e reserva apenas o déficit, sem inflar o espaço ao expandir', fakeAsync(() => {
      const { port, component, host } = prepare(); tick(40); fixture.detectChanges();
      expect(component.anchorOffset()).toBe(72);
      expect(query('.mobile-total-bar').style.bottom).toBe('72px');
      expect(port.style.scrollPaddingBottom).toContain('192px');
      expect(component.reservedHeight()).toBe(142);
      host.expanded = true; fixture.detectChanges(); tick(20); fixture.detectChanges();
      expect(component.reservedHeight()).toBe(142); expect(port.scrollTop).toBe(123);
      expect(query('.mobile-total-bar__details-header').contains(query('[total-bar-details-header]'))).toBeTrue();
      expect(query('.mobile-total-bar__details-body').contains(query('[total-bar-details-header]'))).toBeFalse();
      expect(query('.mobile-total-bar__details').contains(query('.mobile-total-bar__controls'))).toBeFalse();
      expect(document.body.style.overflow).toBe('');
      query('.mobile-total-bar__details-body').dispatchEvent(new Event('scroll')); tick();
      expect(host.expanded).toBeTrue();
      port.dispatchEvent(new Event('scroll')); tick(); fixture.detectChanges();
      expect(host.expanded).toBeFalse(); // Native tutorial/form scrolling reveals the original surface.
      fixture.destroy(); expect(port.style.scrollPaddingBottom).toBe('24px'); expect(observer.disconnect).toHaveBeenCalled();
    }));

    it('reutiliza o espaço existente do shell sem duplicar a reserva inferior', fakeAsync(() => {
      const { component, port } = prepare(300); tick(40); fixture.detectChanges();
      expect(component.reservedHeight()).toBe(0); expect(port.style.scrollPaddingBottom).toContain('192px');
    }));

    it('mantém o campo focado acessível com teclado e recolhe detalhes sem perder dados', fakeAsync(() => {
      const visible = Object.assign(new EventTarget(), { height: window.innerHeight, offsetTop: 0 });
      spyOnProperty(window, 'visualViewport', 'get').and.returnValue(visible as VisualViewport);
      const { component, host, port } = prepare(); host.avoidKeyboard = true; fixture.detectChanges(); tick(40); fixture.detectChanges();
      host.expanded = true; fixture.detectChanges(); tick(20);
      const field = query<HTMLInputElement>('.form-field');
      spyOn(field, 'getBoundingClientRect').and.returnValue(new DOMRect(0, window.innerHeight - 100, 160, 32));
      const reveal = spyOn(field, 'scrollIntoView'); field.focus(); tick(40); fixture.detectChanges();
      expect(host.expanded).toBeFalse(); expect(field.value).toBe('Dados preservados');
      expect(reveal).toHaveBeenCalledWith({ block: 'nearest', inline: 'nearest', behavior: 'auto' });
      visible.height -= 250; visible.dispatchEvent(new Event('resize')); tick(20); fixture.detectChanges();
      expect(component.keyboardInset()).toBe(250); expect(port.style.scrollPaddingBottom).toContain('370px');
      expect(query('.mobile-total-bar').style.bottom).toContain('250px');
      visible.height = window.innerHeight; visible.dispatchEvent(new Event('resize')); tick(20); fixture.detectChanges();
      expect(component.keyboardInset()).toBe(0); expect(port.style.scrollPaddingBottom).toContain('192px');
      expect(field.value).toBe('Dados preservados');
      reveal.calls.reset(); visible.dispatchEvent(new Event('scroll')); tick(20);
      expect(reveal).not.toHaveBeenCalled();
    }));

    it('acompanha redimensionamento sem bloquear ações nem alterar o proprietário externo', fakeAsync(() => {
      const { port, component, host } = prepare(); tick(40); fixture.detectChanges();
      host.disabled = false; host.actionType = 'submit'; fixture.detectChanges();
      notifyResize([], observer); tick(20); fixture.detectChanges();
      query<HTMLButtonElement>('.mobile-total-bar__cta').click(); expect(host.submits).toBe(1);
      host.reserveSpace = false; fixture.detectChanges(); tick(20);
      expect(port.style.scrollPaddingBottom).toBe('24px'); expect(component.anchorOffset()).toBe(0);
    }));
  });

  const pointer = (type: string, x: number, y: number, options: PointerEventInit = {}) => {
    query('.mobile-total-bar__handle-toggle').dispatchEvent(new PointerEvent(type, {
      pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0, clientX: x, clientY: y, bubbles: true, ...options,
    }));
  };
  const ghostClick = () => query('.mobile-total-bar__handle-toggle').dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }));
  const prepareHandle = () => {
    const handle = query<HTMLButtonElement>('.mobile-total-bar__handle-toggle');
    spyOn(handle, 'setPointerCapture'); spyOn(handle, 'hasPointerCapture').and.returnValue(true); spyOn(handle, 'releasePointerCapture');
    return handle;
  };

  it('oferece handle nativo com nome, estado e expansão/recolhimento por clique', () => {
    const handle = query<HTMLButtonElement>('.mobile-total-bar__handle-toggle');
    expect(handle.tagName).toBe('BUTTON'); expect(handle.type).toBe('button');
    expect(handle.getAttribute('aria-label')).toBeTruthy();
    expect(handle.getAttribute('aria-controls')).toBe('test-details');
    expect(handle.getAttribute('aria-expanded')).toBe('false');
    handle.click(); fixture.detectChanges();
    expect(handle.getAttribute('aria-expanded')).toBe('true');
    handle.click(); fixture.detectChanges(); expect(fixture.componentInstance.expanded).toBeFalse();
  });

  it('arrasta para cima para expandir e para baixo para recolher sem duplo acionamento', () => {
    const handle = prepareHandle();
    pointer('pointerdown', 100, 200); pointer('pointermove', 103, 150);
    expect(fixture.componentInstance.expanded).toBeFalse();
    pointer('pointerup', 103, 150); fixture.detectChanges(); ghostClick();
    expect(fixture.componentInstance.expanded).toBeTrue(); expect(fixture.componentInstance.expansions).toBe(1);
    pointer('pointerdown', 100, 150); pointer('pointerup', 100, 200); fixture.detectChanges(); ghostClick();
    expect(fixture.componentInstance.expanded).toBeFalse(); expect(fixture.componentInstance.expansions).toBe(2);
    expect(handle.setPointerCapture).toHaveBeenCalledWith(1); expect(handle.releasePointerCapture).toHaveBeenCalledWith(1);
  });

  it('ignora arraste na direção contrária ao estado atual', () => {
    prepareHandle(); pointer('pointerdown', 100, 100); pointer('pointerup', 100, 150); ghostClick();
    expect(fixture.componentInstance.expanded).toBeFalse();
    fixture.componentInstance.expanded = true; fixture.detectChanges();
    pointer('pointerdown', 100, 150); pointer('pointerup', 100, 100); ghostClick();
    expect(fixture.componentInstance.expanded).toBeTrue(); expect(fixture.componentInstance.expansions).toBe(0);
  });

  it('cancela movimentos curtos, horizontais e diagonais sem converter arraste em clique', () => {
    prepareHandle();
    [[102, 180], [150, 198], [130, 160]].forEach(([x, y]) => {
      pointer('pointerdown', 100, 200); pointer('pointermove', x, y); pointer('pointerup', x, y); ghostClick();
    });
    expect(fixture.componentInstance.expansions).toBe(0);
  });

  it('cancela gestos interrompidos e perda de captura sem impedir nova ativação por teclado', () => {
    prepareHandle();
    ['pointercancel', 'lostpointercapture'].forEach(type => {
      pointer('pointerdown', 100, 200); pointer('pointermove', 100, 150); pointer(type, 100, 150);
      pointer('pointerup', 100, 150); ghostClick();
    });
    expect(fixture.componentInstance.expansions).toBe(0);
    // Native keyboard/assistive activation produces a click with detail 0.
    query<HTMLButtonElement>('.mobile-total-bar__handle-toggle').click();
    expect(fixture.componentInstance.expanded).toBeTrue();
  });

  it('cancela múltiplos ponteiros e não captura cliques secundários', () => {
    prepareHandle(); pointer('pointerdown', 100, 200);
    pointer('pointerdown', 110, 190, { pointerId: 2, isPrimary: false });
    pointer('pointerup', 100, 140); ghostClick();
    pointer('pointerdown', 100, 200, { button: 2 }); pointer('pointerup', 100, 140, { button: 2 });
    expect(fixture.componentInstance.expansions).toBe(0);
  });

  it('mantém um toque com pequena oscilação como clique e não altera o conteúdo ao mover fora do handle', () => {
    prepareHandle(); pointer('pointerdown', 100, 200); pointer('pointerup', 102, 198); ghostClick();
    expect(fixture.componentInstance.expanded).toBeTrue();
    query('.mobile-total-bar__details-content').dispatchEvent(new PointerEvent('pointerdown', { pointerId: 3, clientY: 200, bubbles: true }));
    query('.mobile-total-bar__details-content').dispatchEvent(new PointerEvent('pointerup', { pointerId: 3, clientY: 100, bubbles: true }));
    expect(fixture.componentInstance.expansions).toBe(1);
  });

  it('apresenta espera no mesmo painel, sem valores ou ações, com handle não expansível', fakeAsync(() => {
    const bar = query('.mobile-total-bar');
    fixture.componentInstance.awaitingResult = true; fixture.detectChanges(); tick(0);
    expect(query('.mobile-total-bar')).toBe(bar);
    expect(query('.mobile-total-bar__waiting').textContent).toContain('Aguardando cálculo');
    expect(query('.mobile-total-bar__waiting > div').textContent?.trim()).toBe('Aguardando cálculo');
    expect(query('.mobile-total-bar__waiting span')).toBeNull();
    expect(query('.mobile-total-bar__summary')).toBeNull(); expect(query('.mobile-total-bar__cta')).toBeNull();
    expect(query('.mobile-total-bar__expand--button')).toBeNull(); expect(query('#test-details')).toBeNull();
    expect(query<HTMLButtonElement>('.mobile-total-bar__handle-toggle').disabled).toBeTrue();
    query<HTMLButtonElement>('.mobile-total-bar__handle-toggle').click(); query('.mobile-total-bar').click();
    expect(fixture.componentInstance.expansions).toBe(0);
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).toBeNull();
  }));

  it('recolhe ao entrar em espera, informa processamento real e retorna ao resultado na mesma superfície', fakeAsync(() => {
    query('.mobile-total-bar__expand--button').click(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded).toBeTrue();
    const bar = query('.mobile-total-bar');
    fixture.componentInstance.awaitingResult = true; fixture.componentInstance.loading = true; fixture.detectChanges(); tick(0);
    expect(fixture.componentInstance.expanded).toBeFalse();
    expect(query('.mobile-total-bar__waiting').textContent).toContain('Calculando...');
    expect(query('.mobile-total-bar__waiting mat-progress-spinner')).not.toBeNull();
    fixture.componentInstance.awaitingResult = false; fixture.componentInstance.loading = false; fixture.detectChanges();
    expect(query('.mobile-total-bar')).toBe(bar); expect(query('.mobile-total-bar__waiting')).toBeNull();
    expect(query('.mobile-total-bar__summary').textContent).toContain('R$ 123,45');
    expect(query<HTMLButtonElement>('.mobile-total-bar__handle-toggle').disabled).toBeFalse();
    expect(query('#test-details').getAttribute('aria-hidden')).toBe('true');
  }));

  it('mantém os detalhes recolhidos e fora da navegação por teclado', () => {
    expect(query('#test-details').getAttribute('aria-hidden')).toBe('true');
    expect(query('#test-details').hasAttribute('inert')).toBeTrue();
    expect(query('.mobile-total-bar__expand--button').getAttribute('aria-expanded')).toBe('false');
    expect(query('.mobile-total-bar').getAttribute('role')).toBeNull();
  });

  it('expande e recolhe pela ação sem recriar resumo, CTA ou conteúdo projetado', () => {
    const bar = query('.mobile-total-bar'); const cta = query('.mobile-total-bar__cta'); const clear = query('.clear');
    const title = query('[total-bar-details-header]');
    expect(query('.mobile-total-bar__details-body').contains(title)).toBeFalse();
    expect(query('#test-details').contains(title)).toBeTrue();
    expect(query('.mobile-total-bar__details-body').contains(clear)).toBeTrue();
    query('.mobile-total-bar__expand--button').click(); fixture.detectChanges();
    expect(query('#test-details').hasAttribute('inert')).toBeFalse();
    expect(query('#test-details').getAttribute('aria-hidden')).toBe('false');
    expect(query('.mobile-total-bar__expand--button').getAttribute('aria-controls')).toBe('test-details');
    expect(bar.contains(query('#test-details'))).toBeTrue();
    expect(query('#test-details').textContent).toContain('Distribuição da produção');
    query('.mobile-total-bar__expand--button').click(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded).toBeFalse();
    expect(query('.mobile-total-bar')).toBe(bar);
    expect(query('.mobile-total-bar__cta')).toBe(cta);
    expect(query('.clear')).toBe(clear);
    expect(query('[total-bar-details-header]')).toBe(title);
    expect(bar.textContent).toContain('R$ 123,45');
  });

  it('não alterna ao clicar nos detalhes ou nas ações e preserva limpar', () => {
    query('.mobile-total-bar__expand--button').click(); fixture.detectChanges();
    query('.clear').click(); query('.mobile-total-bar__cta').click(); query('.mobile-total-bar__secondary').click();
    expect(fixture.componentInstance.clears).toBe(1);
    expect(fixture.componentInstance.actions).toBe(1);
    expect(fixture.componentInstance.secondaryActions).toBe(1);
    expect(fixture.componentInstance.expanded).toBeTrue();
    expect(fixture.componentInstance.expansions).toBe(1);
  });

  it('não captura Enter ou espaço das ações e conteúdo no modo interno', () => {
    ['Enter', ' '].forEach(key => query('.mobile-total-bar__cta').dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true })));
    expect(fixture.componentInstance.expansions).toBe(0);
  });

  it('respeita desabilitação da expansão e da ação principal', () => {
    fixture.componentInstance.expandable = false; fixture.componentInstance.disabled = true; fixture.detectChanges();
    query<HTMLButtonElement>('.mobile-total-bar__expand--button').click(); query<HTMLButtonElement>('.mobile-total-bar__cta').click();
    expect(fixture.componentInstance.expansions).toBe(0);
    expect(fixture.componentInstance.actions).toBe(0);
  });

  it('preserva o modo padrão sem detalhes projetados e sua expansão por clique e teclado', () => {
    fixture.componentInstance.inlineDetails = false; fixture.detectChanges();
    expect(query('#test-details')).toBeNull();
    expect(query('.mobile-total-bar').getAttribute('role')).toBe('button');
    expect(query('.mobile-total-bar__handle')).not.toBeNull();
    query('.mobile-total-bar').click(); fixture.detectChanges();
    expect(fixture.componentInstance.expanded).toBeTrue();
    query('.mobile-total-bar').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(fixture.componentInstance.expanded).toBeFalse();
  });

  it('preserva o gesto de expansão dos consumidores no modo padrão', () => {
    fixture.componentInstance.inlineDetails = false; fixture.detectChanges();
    const touch = (type: string, clientY: number) => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperty(event, 'changedTouches', { value: [{ clientY }] });
      query('.mobile-total-bar').dispatchEvent(event);
    };
    touch('touchstart', 400); touch('touchend', 350);
    expect(fixture.componentInstance.expansions).toBe(1);
  });
});
