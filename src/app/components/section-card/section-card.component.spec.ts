import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SectionCardComponent } from './section-card.component';
import { BreakpointObserver } from '@angular/cdk/layout';
import { BehaviorSubject } from 'rxjs';

@Component({ standalone: true, imports: [SectionCardComponent], template: `
  <app-section-card title="Filtros" subtitle="Status" [mobilePlain]="plain" [mobileCollapsible]="collapsible" [(mobileExpanded)]="expanded" mobileSummary="Resumo">
    <button section-card-actions>Ação</button><p>Conteúdo</p><input value="Rascunho preenchido">
  </app-section-card>` })
class Host { plain = false; collapsible = false; expanded = true; }

describe('SectionCard mobile opt-in', () => {
  it('recolhe somente no mobile sem destruir campos e preserva desktop', () => {
    const viewport = new BehaviorSubject({ matches: true, breakpoints: {} });
    TestBed.configureTestingModule({ providers: [{ provide: BreakpointObserver, useValue: { observe: () => viewport } }] });
    const f = TestBed.createComponent(Host); f.componentInstance.collapsible = true; f.detectChanges();
    const field = f.nativeElement.querySelector('input');
    const button = f.nativeElement.querySelector('.section-card__toggle');
    expect(button.getAttribute('aria-expanded')).toBe('true'); button.click(); f.detectChanges();
    const body = f.nativeElement.querySelector('.section-card__body'); expect(body.hidden).toBeTrue(); expect(body.hasAttribute('inert')).toBeTrue();
    expect(button.getAttribute('aria-controls')).toBe(body.id);
    button.click(); f.detectChanges(); expect(f.nativeElement.querySelector('input')).toBe(field); expect(field.value).toBe('Rascunho preenchido');
    f.componentInstance.expanded = false; viewport.next({ matches: false, breakpoints: {} }); f.detectChanges();
    expect(body.hidden).toBeFalse(); expect(f.nativeElement.querySelector('.section-card__toggle')).toBeNull();
    f.destroy();
  });
  it('preserva conteúdo, título, divisor e projeção ao ativar a variante', () => {
    const f = TestBed.createComponent(Host); f.detectChanges();
    const card = f.nativeElement.querySelector('mat-card');
    expect(card.classList.contains('section-card--mobile-plain')).toBeFalse();
    f.componentInstance.plain = true; f.detectChanges();
    expect(card.classList.contains('section-card--mobile-plain')).toBeTrue();
    expect(card.textContent).toContain('Filtros');
    expect(card.textContent).toContain('Status');
    expect(card.querySelector('.section-card__actions button').textContent).toContain('Ação');
    expect(card.querySelector('.section-card__body p').textContent).toContain('Conteúdo');
    expect(card.querySelector('mat-divider')).toBeTruthy();
  });
});
