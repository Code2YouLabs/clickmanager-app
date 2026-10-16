import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { SectionCardComponent } from './section-card.component';

@Component({ standalone: true, imports: [SectionCardComponent], template: `
  <app-section-card title="Filtros" subtitle="Status" [mobilePlain]="plain">
    <button section-card-actions>Ação</button><p>Conteúdo</p>
  </app-section-card>` })
class Host { plain = false; }

describe('SectionCard mobile opt-in', () => {
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
