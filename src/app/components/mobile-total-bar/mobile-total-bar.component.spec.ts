import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MobileTotalBarComponent } from './mobile-total-bar.component';

@Component({
  standalone: true,
  imports: [MobileTotalBarComponent],
  template: `
    <app-mobile-total-bar [inlineDetails]="inlineDetails" [expanded]="expanded" detailsPanelId="test-details"
      [expandable]="expandable" valueText="R$ 123,45" actionText="Criar rascunho" [actionDisabled]="disabled"
      secondaryActionText="Revisar" [detailText]="expanded ? 'Ocultar detalhes' : 'Detalhes'"
      (expand)="expanded = !expanded; expansions = expansions + 1"
      (action)="actions = actions + 1" (secondaryAction)="secondaryActions = secondaryActions + 1">
      <div total-bar-details><p>Distribuição da produção</p><button type="button" class="clear" (click)="clears = clears + 1">Limpar cálculo</button></div>
    </app-mobile-total-bar>`,
})
class HostComponent {
  inlineDetails = true;
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
