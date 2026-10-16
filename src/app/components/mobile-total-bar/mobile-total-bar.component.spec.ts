import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MobileTotalBarComponent } from './mobile-total-bar.component';

@Component({
  standalone: true,
  imports: [MobileTotalBarComponent],
  template: `
    <app-mobile-total-bar [inlineDetails]="inlineDetails" [awaitingResult]="awaitingResult" [loading]="loading" [expanded]="expanded" detailsPanelId="test-details"
      [expandable]="expandable" valueText="R$ 123,45" actionText="Criar rascunho" [actionDisabled]="disabled"
      secondaryActionText="Revisar" [detailText]="expanded ? 'Ocultar detalhes' : 'Detalhes'"
      (collapse)="expanded = false" (expand)="expanded = !expanded; expansions = expansions + 1"
      (action)="actions = actions + 1" (secondaryAction)="secondaryActions = secondaryActions + 1">
      <div total-bar-details><p>Distribuição da produção</p><button type="button" class="clear" (click)="clears = clears + 1">Limpar cálculo</button></div>
    </app-mobile-total-bar>`,
})
class HostComponent {
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
    TestBed.configureTestingModule({ imports: [HostComponent, NoopAnimationsModule] });
    fixture = TestBed.createComponent(HostComponent); fixture.detectChanges();
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
    expect(query('.mobile-total-bar__waiting').textContent).toContain('O resultado aparecerá aqui.');
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
