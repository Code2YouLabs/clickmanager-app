import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TutorialOverlayComponent } from './tutorial-overlay.component';
import { TutorialService } from './tutorial.service';

@Component({
  standalone: true,
  imports: [TutorialOverlayComponent],
  template: `<app-tutorial-overlay />
    <div class="configurator" style="width: 700px">
      <app-tutorial-overlay embeddedForTarget="configurador" />
      <div class="prices" style="height: 100px">Total: R$ 13,50</div>
    </div>`,
})
class TutorialHost {}

describe('Tutorial inline no configurador', () => {
  let fixture: ComponentFixture<TutorialHost>;
  let step: ReturnType<typeof signal<any>>;
  beforeEach(async () => {
    step = signal({ id: 'configurador', targetId: 'configurador', title: 'Configure produto ou serviço', description: 'Escolha as opções reais do item e adicione ao pedido.', presentation: 'inline', advanceOn: 'item-adicionado' });
    await TestBed.configureTestingModule({ imports: [TutorialHost], providers: [
      { provide: TutorialService, useValue: {
        state: signal({ definition: { labels: {} } }), isActive: signal(true), currentStep: step,
        rect: signal({ top: 100, left: 40, right: 740, bottom: 580, width: 700, height: 480 }),
        currentIndex: signal(4), totalSteps: signal(9), canGoBack: signal(true), isLastStep: signal(false),
      } },
    ] }).compileComponents();
    fixture = TestBed.createComponent(TutorialHost);
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });
  afterEach(() => { fixture.nativeElement.remove(); fixture.destroy(); });

  it('renderiza apenas uma orientação em fluxo, acima dos valores', () => {
    const popovers = fixture.nativeElement.querySelectorAll('.guided-tutorial-popover');
    expect(popovers.length).toBe(1);
    const popover = popovers[0] as HTMLElement;
    const prices = fixture.nativeElement.querySelector('.prices') as HTMLElement;
    expect(popover.classList.contains('guided-tutorial-popover--inline')).toBeTrue();
    expect(getComputedStyle(popover).position).toBe('relative');
    expect(popover.getBoundingClientRect().bottom).toBeLessThanOrEqual(prices.getBoundingClientRect().top);
    expect(fixture.nativeElement.querySelectorAll('.guided-tutorial-mask').length).toBe(1);
  });

  it('não sobrepõe valores mesmo em contêiner estreito', () => {
    fixture.nativeElement.querySelector('.configurator').style.width = '360px';
    const popover = fixture.nativeElement.querySelector('.guided-tutorial-popover') as HTMLElement;
    const prices = fixture.nativeElement.querySelector('.prices') as HTMLElement;
    expect(popover.getBoundingClientRect().bottom).toBeLessThanOrEqual(prices.getBoundingClientRect().top);
  });

  it('mantém o popover flutuante nas outras etapas', async () => {
    step.set({ id: 'cliente', targetId: 'cliente', title: 'Cliente', description: 'Selecione um cliente.' });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const popovers = fixture.nativeElement.querySelectorAll('.guided-tutorial-popover');
    expect(popovers.length).toBe(1);
    expect(popovers[0].classList.contains('guided-tutorial-popover--inline')).toBeFalse();
    expect(getComputedStyle(popovers[0]).position).toBe('fixed');
  });
});
