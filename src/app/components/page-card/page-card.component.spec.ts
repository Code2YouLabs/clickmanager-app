import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { PageFormState } from './page-form-state';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MaterialModule } from 'src/app/material.module';
import { PageCardComponent, PageCardAction } from './page-card.component';

@Component({
  standalone: true,
  imports: [PageCardComponent, MaterialModule],
  template: `
    <app-page-card
      titulo="Produtos gráficos"
      subtitulo="Configuração de venda"
      [showFooter]="showFooter"
      [headerDivider]="headerDivider"
      [footerDivider]="footerDivider">
      <button page-header-actions mat-button>Nova ação</button>
      <div class="body-content">Conteúdo principal</div>
      <button page-footer-left mat-button>Cancelar</button>
      <button page-footer-right mat-flat-button>Salvar</button>
    </app-page-card>
  `,
})
class PageCardHostComponent {
  showFooter = false;
  headerDivider = true;
  footerDivider = true;
}

describe('PageCardComponent', () => {
  let fixture: ComponentFixture<PageCardHostComponent>;
  let host: PageCardHostComponent;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [PageCardHostComponent, NoopAnimationsModule],
    });

    fixture = TestBed.createComponent(PageCardHostComponent);
    host = fixture.componentInstance;
  });

  afterEach(() => TestBed.resetTestingModule());

  it('projeta titulo, subtitulo, acoes de header e conteudo principal', () => {
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Produtos gráficos');
    expect(text).toContain('Configuração de venda');
    expect(text).toContain('Nova ação');
    expect(text).toContain('Conteúdo principal');
    expect(fixture.debugElement.query(By.css('.page-card__footer'))).toBeNull();
  });

  it('renderiza footer em areas esquerda e direita quando habilitado', () => {
    host.showFooter = true;
    fixture.detectChanges();

    const footer = fixture.debugElement.query(By.css('.page-card__footer'));
    expect(footer).not.toBeNull();
    expect(footer.query(By.css('.page-card__footer-left')).nativeElement.textContent).toContain('Cancelar');
    expect(footer.query(By.css('.page-card__footer-right')).nativeElement.textContent).toContain('Salvar');
  });

  it('controla divisores de header e footer separadamente', () => {
    host.showFooter = true;
    host.headerDivider = false;
    host.footerDivider = false;
    fixture.detectChanges();

    expect(fixture.debugElement.query(By.css('app-card-header mat-divider'))).toBeNull();
    expect(fixture.debugElement.query(By.css('.page-card__footer-divider'))).toBeNull();
  });
});

@Component({ standalone: true, imports: [PageCardComponent, ReactiveFormsModule], template: `
  <app-page-card titulo="Cadastro" [footerActions]="actions" [formState]="state" [saving]="saving" [actionsDisabled]="disabled" (footerAction)="commands.push($event)">
    <form id="contract-form" [formGroup]="form" (submit)="submits = submits + 1; $event.preventDefault()"><input formControlName="name" /></form>
  </app-page-card>` })
class ActionsHost {
  form = new FormGroup({ name: new FormControl('', { nonNullable: true }) });
  state = new PageFormState(() => this.form);
  constructor() { this.state.begin('create'); }

  saving = false; disabled = false; submits = 0; commands: string[] = [];
  actions: PageCardAction[] = [
    { id: 'cancel', label: 'Voltar', intent: 'cancel' },
    { id: 'save', label: 'Salvar', type: 'submit', form: 'contract-form', primary: true, pendingLabel: 'Salvando...' },
  ];
}
describe('PageCard footer action contract', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [ActionsHost, NoopAnimationsModule] }));
  afterEach(() => TestBed.resetTestingModule());
  it('gera Cancelar por padrão sem a tela declarar ação, texto ou handler', () => {
    const f = TestBed.createComponent(ActionsHost);
    f.componentInstance.actions = [];
    f.componentInstance.form.setValue({ name: 'Alterado' }); f.detectChanges();
    const buttons = f.nativeElement.querySelectorAll('.page-card__footer button');
    expect(buttons.length).toBe(1); expect(buttons[0].textContent.trim()).toBe('Cancelar');
    buttons[0].click(); expect(f.componentInstance.form.getRawValue()).toEqual({ name: '' });
    expect(f.componentInstance.commands).toEqual([]);
  });
  it('associa submit nativo ao form e nao emite comando duplicado de click', () => {
    const f = TestBed.createComponent(ActionsHost); f.detectChanges();
    // Native form association requires the fixture to be connected to the document.
    document.body.appendChild(f.nativeElement);
    const save: HTMLButtonElement = f.nativeElement.querySelector('button[type=submit]');
    expect(save.form?.id).toBe('contract-form'); save.click();
    expect(f.componentInstance.submits).toBe(1); expect(f.componentInstance.commands).toEqual([]);
    f.nativeElement.querySelector('button[type=button]').click(); expect(f.componentInstance.commands).toEqual([]);
    f.nativeElement.remove();
  });
  it('padroniza cancelamento em vermelho independentemente do texto e da cor informada', () => {
    const f = TestBed.createComponent(ActionsHost);
    f.componentInstance.actions[0] = { id: 'cancel', label: 'Voltar', intent: 'cancel', color: 'primary', primary: true };
    f.detectChanges();
    const cancel: HTMLButtonElement = f.nativeElement.querySelector('button[type=button]');
    expect(cancel.classList.contains('cancel-button')).toBeTrue();
    expect(cancel.hasAttribute('mat-stroked-button')).toBeTrue();
    expect(getComputedStyle(cancel).color).toBe('rgb(185, 28, 28)');
    expect(f.nativeElement.querySelector('button[type=submit]').classList.contains('cancel-button')).toBeFalse();
    cancel.click(); expect(f.componentInstance.commands).toEqual([]);
  });
  it('cancelar criação limpa dados e submitted sem emitir comando da tela', () => {
    const f = TestBed.createComponent(ActionsHost); f.detectChanges();
    f.componentInstance.form.setValue({ name: 'Rascunho' });
    f.componentInstance.form.markAllAsTouched(); f.componentInstance.form.markAsDirty();
    f.nativeElement.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    f.nativeElement.querySelector('button[type=button]').click();
    expect(f.componentInstance.form.getRawValue()).toEqual({ name: '' });
    expect(f.componentInstance.form.pristine).toBeTrue(); expect(f.componentInstance.form.untouched).toBeTrue();
    f.detectChanges();
    expect(f.nativeElement.querySelector('form').classList.contains('ng-submitted')).toBeFalse();
    expect(f.componentInstance.commands).toEqual([]);
  });
  it('cancelar edição restaura a base carregada e ignora alterações posteriores', () => {
    const f = TestBed.createComponent(ActionsHost);
    const host = f.componentInstance; host.state.begin('edit'); f.detectChanges();
    expect(f.nativeElement.querySelector('button[type=button]').disabled).toBeTrue();
    host.form.setValue({ name: 'Backend' }); host.state.loaded(); f.detectChanges();
    host.form.setValue({ name: 'Alterado' }); f.nativeElement.querySelector('button[type=button]').click();
    expect(host.form.getRawValue()).toEqual({ name: 'Backend' }); expect(host.commands).toEqual([]);
    host.form.setValue({ name: 'Segunda alteração' }); f.nativeElement.querySelector('button[type=button]').click();
    expect(host.form.getRawValue()).toEqual({ name: 'Backend' });
  });
  it('bloqueia acoes durante saving e informa processamento acessivel', () => {
    const f = TestBed.createComponent(ActionsHost); f.componentInstance.saving = true; f.detectChanges();
    expect([...f.nativeElement.querySelectorAll('button')].every((button: any) => button.disabled)).toBeTrue();
    expect(f.nativeElement.querySelector('mat-card').getAttribute('aria-busy')).toBe('true');
    expect(f.nativeElement.querySelector('[role=status]').textContent).toContain('Salvando');
    f.componentInstance.saving = false; f.componentInstance.disabled = true; f.detectChanges();
    expect(f.nativeElement.querySelector('button[type=submit]').disabled).toBeTrue();
  });
});
