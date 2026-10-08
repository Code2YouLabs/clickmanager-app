import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { TutorialDefinition, TutorialEvent } from './tutorial.model';
import { TutorialOverlayComponent } from './tutorial-overlay.component';
import { TutorialTargetDirective } from './tutorial-target.directive';
import { TutorialService } from './tutorial.service';

@Component({
  standalone: true,
  imports: [TutorialOverlayComponent, TutorialTargetDirective],
  template: `
    <app-tutorial-overlay></app-tutorial-overlay>
    @if (showPrimary) {
      <button appTutorialTarget="primary-action" style="display:block;width:160px;height:44px">Primario</button>
    }
    <button appTutorialTarget="secondary-action" style="display:block;width:150px;height:40px">Secundario</button>
  `,
})
class TutorialHostComponent {
  showPrimary = true;
}

describe('TutorialService', () => {
  let fixture: ComponentFixture<TutorialHostComponent>;
  let service: TutorialService;
  let events: TutorialEvent[];
  let scrollSpy: jasmine.Spy;

  const definition: TutorialDefinition = {
    id: 'fixture-tour',
    steps: [
      {
        id: 'primary',
        title: 'Acao principal',
        description: 'Mostra o primeiro alvo.',
        targetId: 'primary-action',
        timeoutMs: 500,
      },
      {
        id: 'secondary',
        title: 'Acao secundaria',
        description: 'Mostra o segundo alvo.',
        targetId: 'secondary-action',
        advanceOn: 'secondary-ready',
        timeoutMs: 500,
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [TutorialHostComponent, RouterTestingModule, NoopAnimationsModule],
    });

    service = TestBed.inject(TutorialService);
    events = [];
    service.events$.subscribe((event) => events.push(event));
    scrollSpy = spyOn(Element.prototype, 'scrollIntoView').and.stub();
    fixture = TestBed.createComponent(TutorialHostComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    service.stop();
    fixture.destroy();
    TestBed.resetTestingModule();
  });

  it('inicia, troca etapa e conclui mantendo eventos declarativos', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('active');
    expect(service.currentStep()?.id).toBe('primary');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')?.textContent).toContain('Acao principal');
    expect(scrollSpy).toHaveBeenCalled();

    service.next();
    tick(20);
    fixture.detectChanges();

    expect(service.currentStep()?.id).toBe('secondary');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')?.textContent).toContain('Acao secundaria');

    service.notify('secondary-ready');
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(events.map((event) => event.type)).toEqual(['started', 'stepChanged', 'stepChanged', 'completed']);
  }));

  it('aguarda alvo renderizado tardiamente antes de exibir o passo', fakeAsync(() => {
    fixture.componentInstance.showPrimary = false;
    fixture.detectChanges();

    service.start(definition);
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('waiting');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeFalsy();

    fixture.componentInstance.showPrimary = true;
    fixture.detectChanges();
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('active');
    expect(service.currentStep()?.id).toBe('primary');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeTruthy();
  }));

  it('emite erro e limpa estado quando o alvo nao aparece no tempo limite', fakeAsync(() => {
    fixture.componentInstance.showPrimary = false;
    fixture.detectChanges();

    service.start({
      id: 'missing-tour',
      steps: [{
        id: 'missing',
        title: 'Ausente',
        description: 'Alvo ausente.',
        targetId: 'missing-target',
        timeoutMs: 30,
      }],
    });
    tick(31);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'error',
      tutorialId: 'missing-tour',
      stepId: 'missing',
    }));
  }));

  it('sai pelo Escape sem interferir quando nao ha dialog material aberto', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'exited',
      reason: 'escape',
    }));
  }));
});

describe('TutorialService route handling', () => {
  it('navega para a rota declarada antes de medir o alvo', fakeAsync(() => {
    const router = {
      url: '/origem',
      navigateByUrl: jasmine.createSpy('navigateByUrl').and.callFake((url: string) => {
        router.url = url;
        return Promise.resolve(true);
      }),
    };

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [{ provide: Router, useValue: router }],
    });

    const service = TestBed.inject(TutorialService);
    const documentRef = TestBed.inject(DOCUMENT);
    const target = documentRef.createElement('button');
    target.style.display = 'block';
    target.style.width = '120px';
    target.style.height = '40px';
    documentRef.body.appendChild(target);
    spyOn(target, 'getBoundingClientRect').and.returnValue({
      top: 20,
      left: 20,
      right: 140,
      bottom: 60,
      width: 120,
      height: 40,
      x: 20,
      y: 20,
      toJSON: () => ({}),
    } as DOMRect);
    spyOn(target, 'scrollIntoView').and.stub();

    const unregister = service.registerTarget('route-target', target);
    service.start({
      id: 'route-tour',
      steps: [{
        id: 'route-step',
        title: 'Rota',
        description: 'Passo em outra rota.',
        targetId: 'route-target',
        route: '/destino',
      }],
    });
    flushMicrotasks();
    tick(20);

    expect(router.navigateByUrl).toHaveBeenCalledWith('/destino');
    expect(service.state().status).toBe('active');
    expect(service.currentStep()?.id).toBe('route-step');

    unregister();
    target.remove();
    service.stop();
    TestBed.resetTestingModule();
  }));
});
