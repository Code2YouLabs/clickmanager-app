import { DOCUMENT } from '@angular/common';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
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
      <button
        appTutorialTarget="primary-action"
        style="display:block;width:160px;height:44px;margin:96px 0 0 96px"
        (click)="clicks = clicks + 1"
        (pointerdown)="pointerDowns = pointerDowns + 1"
        (mousedown)="mouseDowns = mouseDowns + 1">
        Primario
      </button>
    }
    @if (showReplacementPrimary) {
      <button
        appTutorialTarget="primary-action"
        style="display:block;width:220px;height:54px;margin:160px 0 0 320px">
        Primario substituto
      </button>
    }
    <button appTutorialTarget="secondary-action" style="display:block;width:150px;height:40px;margin:24px 0 0 96px">Secundario</button>
  `,
})
class TutorialHostComponent {
  showPrimary = true;
  showReplacementPrimary = false;
  clicks = 0;
  pointerDowns = 0;
  mouseDowns = 0;
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

  it('inicia tutorial e exibe overlay no primeiro alvo', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('active');
    expect(service.currentStep()?.id).toBe('primary');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')?.textContent).toContain('Acao principal');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeTruthy();
    expect(scrollSpy).toHaveBeenCalled();
    expect(events.map((event) => event.type)).toEqual(['started', 'stepChanged']);
  }));

  it('avanca e volta entre etapas sem concluir antes da ultima acao', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    service.next();
    tick(20);
    fixture.detectChanges();

    expect(service.currentStep()?.id).toBe('secondary');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')?.textContent).toContain('Acao secundaria');

    service.previous();
    tick(20);
    fixture.detectChanges();

    expect(service.currentStep()?.id).toBe('primary');
    expect(service.state().status).toBe('active');
    expect(events.map((event) => event.type)).toEqual(['started', 'stepChanged', 'stepChanged', 'stepChanged']);
  }));

  it('notify avanca apenas quando o evento corresponde ao passo atual', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    service.notify('secondary-ready');
    tick(20);
    fixture.detectChanges();

    expect(service.currentStep()?.id).toBe('primary');
    expect(service.state().status).toBe('active');

    service.next();
    tick(20);
    fixture.detectChanges();

    service.notify('evento-errado');
    tick(20);
    fixture.detectChanges();

    expect(service.currentStep()?.id).toBe('secondary');
    expect(service.state().status).toBe('active');

    service.notify('secondary-ready');
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(events.map((event) => event.type)).toEqual(['started', 'stepChanged', 'stepChanged', 'completed']);
  }));

  it('oculta voltar e acao primaria quando o passo aguarda evento real', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    service.next();
    tick(20);
    fixture.detectChanges();

    const primaryButton = fixture.nativeElement.querySelector('.guided-tutorial-popover__actions button[mat-flat-button]') as HTMLButtonElement | null;
    const backButton = fixture.nativeElement.querySelector('.guided-tutorial-popover__actions button[mat-stroked-button]') as HTMLButtonElement | null;
    const giveUpButton = fixture.nativeElement.querySelector('.guided-tutorial-popover__give-up') as HTMLButtonElement;
    expect(service.currentStep()?.id).toBe('secondary');
    expect(primaryButton).toBeNull();
    expect(backButton).toBeNull();
    expect(giveUpButton.disabled).toBeFalse();

    service.primaryAction();
    tick(20);
    fixture.detectChanges();

    expect(service.currentStep()?.id).toBe('secondary');

    service.notify('secondary-ready');
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
  }));

  it('permite desistir mesmo quando o passo aguarda evento real', fakeAsync(() => {
    service.start(definition);
    tick(20);
    fixture.detectChanges();

    service.next();
    tick(20);
    fixture.detectChanges();

    const giveUpButton = fixture.nativeElement.querySelector('.guided-tutorial-popover__give-up') as HTMLButtonElement;
    expect(service.currentStep()?.id).toBe('secondary');
    expect(giveUpButton.disabled).toBeFalse();

    giveUpButton.click();
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'exited',
      reason: 'user',
    }));
  }));

  it('exibe passo de conclusao sem botao de desistir', fakeAsync(() => {
    service.start({
      id: 'completion-tour',
      steps: [{
        id: 'primary',
        title: 'Tudo pronto',
        description: 'Fluxo finalizado.',
        targetId: 'primary-action',
        actionLabel: 'Concluir',
        completion: true,
      }],
    });
    tick(20);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover--completion')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover__success-icon')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover__give-up')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover__actions button[mat-flat-button]')?.textContent)
      .toContain('Concluir');
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
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeFalsy();
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
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeFalsy();
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'exited',
      reason: 'escape',
    }));
  }));

  it('conclui com cleanup de estado e overlay', fakeAsync(() => {
    service.start({
      id: 'single-step-tour',
      steps: [{
        id: 'primary',
        title: 'Acao principal',
        description: 'Passo unico.',
        targetId: 'primary-action',
      }],
    });
    tick(20);
    fixture.detectChanges();

    service.complete();
    tick(20);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(service.currentStep()).toBeNull();
    expect(service.rect()).toBeNull();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeFalsy();
    expect(events.at(-1)).toEqual(jasmine.objectContaining({ type: 'completed' }));
  }));

  it('mantem a infraestrutura inativa sem overlay nem bloqueio no app', () => {
    const button = fixture.nativeElement.querySelector('[data-tutorial-target="primary-action"]') as HTMLButtonElement;

    button.click();
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(fixture.componentInstance.clicks).toBe(1);
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeFalsy();
  });

  it('mantem o target destacado clicavel e compatível com eventos nativos de drag', fakeAsync(() => {
    service.start({
      id: 'interactive-tour',
      steps: [{
        id: 'primary',
        title: 'Interativo',
        description: 'Aguarda acao real no alvo.',
        targetId: 'primary-action',
        advanceOn: 'target-clicked',
      }],
    });
    tick(20);
    fixture.detectChanges();

    const mask = fixture.nativeElement.querySelector('.guided-tutorial-mask') as HTMLElement;
    const spotlight = fixture.nativeElement.querySelector('.guided-tutorial-mask__spotlight') as HTMLElement;
    const button = fixture.nativeElement.querySelector('[data-tutorial-target="primary-action"]') as HTMLButtonElement;

    expect(getComputedStyle(mask).pointerEvents).toBe('none');
    expect(getComputedStyle(spotlight).pointerEvents).toBe('none');

    button.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    button.click();
    fixture.detectChanges();

    expect(fixture.componentInstance.pointerDowns).toBe(1);
    expect(fixture.componentInstance.mouseDowns).toBe(1);
    expect(fixture.componentInstance.clicks).toBe(1);
    expect(service.state().status).toBe('active');
  }));

  it('remeasure o alvo depois do layout tardio de modal animado', fakeAsync(() => {
    const button = fixture.nativeElement.querySelector('[data-tutorial-target="primary-action"]') as HTMLButtonElement;
    let left = 40;
    spyOn(button, 'getBoundingClientRect').and.callFake(() => ({
      top: 40,
      left,
      right: left + 120,
      bottom: 88,
      width: 120,
      height: 48,
      x: left,
      y: 40,
      toJSON: () => ({}),
    } as DOMRect));

    service.start({
      id: 'late-layout-tour',
      steps: [{
        id: 'primary',
        title: 'Layout tardio',
        description: 'Recalcula o alvo apos animacao.',
        targetId: 'primary-action',
      }],
    });
    tick(20);
    fixture.detectChanges();

    expect(service.rect()?.left).toBe(30);

    left = 180;
    tick(80);
    fixture.detectChanges();

    expect(service.rect()?.left).toBe(170);
  }));

  it('acao primaria pode clicar no alvo destacado usando o fluxo real da tela', fakeAsync(() => {
    service.start({
      id: 'target-click-action-tour',
      steps: [{
        id: 'primary',
        title: 'Clique real',
        description: 'Aciona o alvo destacado.',
        targetId: 'primary-action',
        action: 'clickTarget',
      }],
    });
    tick(20);
    fixture.detectChanges();

    service.primaryAction();
    fixture.detectChanges();

    expect(fixture.componentInstance.clicks).toBe(1);
    expect(service.currentStep()?.id).toBe('primary');
  }));

  it('acao primaria pode clicar no alvo e seguir para o proximo passo', fakeAsync(() => {
    service.start({
      id: 'target-click-then-next-tour',
      steps: [
        {
          id: 'primary',
          title: 'Clique e avance',
          description: 'Aciona o alvo destacado e segue.',
          targetId: 'primary-action',
          action: 'clickTargetThenNext',
        },
        {
          id: 'secondary',
          title: 'Proximo',
          description: 'Segundo passo.',
          targetId: 'secondary-action',
        },
      ],
    });
    tick(20);
    fixture.detectChanges();

    service.primaryAction();
    flushMicrotasks();
    tick(20);
    fixture.detectChanges();

    expect(fixture.componentInstance.clicks).toBe(1);
    expect(service.currentStep()?.id).toBe('secondary');
  }));

  it('passa a mirar o alvo mais recente quando um modal registra o mesmo target', fakeAsync(() => {
    service.start({
      id: 'replacement-target-tour',
      steps: [{
        id: 'primary',
        title: 'Alvo substituto',
        description: 'Recalcula o alvo atual.',
        targetId: 'primary-action',
      }],
    });
    tick(20);
    fixture.detectChanges();
    const originalLeft = service.rect()?.left ?? 0;

    fixture.componentInstance.showReplacementPrimary = true;
    fixture.detectChanges();
    flushMicrotasks();
    tick(20);

    expect(service.rect()?.left).toBeGreaterThan(originalLeft);
  }));

  it('remove listeners de viewport ao sair, concluir e falhar por timeout', fakeAsync(() => {
    const addSpy = spyOn(window, 'addEventListener').and.callThrough();
    const removeSpy = spyOn(window, 'removeEventListener').and.callThrough();
    const startAndExpectListeners = () => {
      service.start(definition);
      tick(20);
      fixture.detectChanges();
      expect(addSpy.calls.allArgs().some(([event]) => event === 'resize')).toBeTrue();
      expect(addSpy.calls.allArgs().some(([event]) => event === 'scroll')).toBeTrue();
    };

    startAndExpectListeners();
    service.exit();
    tick(20);
    fixture.detectChanges();

    startAndExpectListeners();
    service.complete();
    tick(20);
    fixture.detectChanges();

    service.start({
      id: 'timeout-cleanup',
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

    const removedEvents = removeSpy.calls.allArgs().map(([event]) => event);
    expect(removedEvents.filter((event) => event === 'resize').length).toBeGreaterThanOrEqual(3);
    expect(removedEvents.filter((event) => event === 'scroll').length).toBeGreaterThanOrEqual(3);
    expect(service.state().status).toBe('idle');
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.guided-tutorial-popover')).toBeFalsy();
  }));

  it('remove o alvo do registro quando a diretiva e destruida', fakeAsync(() => {
    fixture.componentInstance.showPrimary = false;
    fixture.detectChanges();

    service.start({
      id: 'destroyed-target-tour',
      steps: [{
        id: 'primary',
        title: 'Destruido',
        description: 'Alvo destruido.',
        targetId: 'primary-action',
        timeoutMs: 30,
      }],
    });
    tick(31);
    fixture.detectChanges();

    expect(service.state().status).toBe('idle');
    expect(events.at(-1)).toEqual(jasmine.objectContaining({
      type: 'error',
      tutorialId: 'destroyed-target-tour',
      stepId: 'primary',
    }));
    expect(fixture.nativeElement.querySelector('.guided-tutorial-mask')).toBeFalsy();
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
