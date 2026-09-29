import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { EmailServidorTesteDialogComponent, EmailTesteDialogData } from './email-servidor-teste-dialog.component';

describe('EmailServidorTesteDialogComponent', () => {
  let fixture: ComponentFixture<EmailServidorTesteDialogComponent>;
  let component: EmailServidorTesteDialogComponent;
  let dialogRef: jasmine.SpyObj<MatDialogRef<EmailServidorTesteDialogComponent>>;

  const data: EmailTesteDialogData = {
    emailDestino: 'usuario@clickmanager.com.br',
    mensagemPadrao: 'E-mail de teste do servidor de e-mail do ClickManager. Se você recebeu esta mensagem, sua configuração está funcionando.',
  };

  function setup(override: Partial<EmailTesteDialogData> = {}): void {
    dialogRef = jasmine.createSpyObj<MatDialogRef<EmailServidorTesteDialogComponent>>('MatDialogRef', ['close']);

    TestBed.configureTestingModule({
      imports: [EmailServidorTesteDialogComponent, NoopAnimationsModule],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { ...data, ...override } },
      ],
    });

    fixture = TestBed.createComponent(EmailServidorTesteDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('inicializa destinatário e mensagem padrão', () => {
    setup();

    expect(component.emailControl.value).toBe(data.emailDestino);
    expect(component.mensagemControl.value).toBe(data.mensagemPadrao);
  });

  it('permite usuário sem e-mail inicial e exige preenchimento válido', () => {
    setup({ emailDestino: '' });

    expect(component.emailControl.value).toBe('');
    expect(component.form.valid).toBeFalse();

    component.emailControl.setValue('invalido');
    component.mensagemControl.setValue('abcd');
    expect(component.emailControl.hasError('email')).toBeTrue();
    expect(component.mensagemControl.hasError('minlength')).toBeTrue();
  });

  it('usa InputEmail, InputTextarea e submit associado ao form id', () => {
    setup();

    expect(fixture.debugElement.query(By.css('app-input-email'))).toBeTruthy();
    expect(fixture.debugElement.query(By.css('app-input-textarea'))).toBeTruthy();
    expect(fixture.nativeElement.querySelector('form')?.getAttribute('id')).toBe('email-servidor-teste-form');
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.getAttribute('form')).toBe('email-servidor-teste-form');
  });

  it('envia pelo formulário e fecha com payload válido', () => {
    setup();

    component.emailControl.setValue('destino@example.com');
    component.mensagemControl.setValue('Mensagem válida');
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));

    expect(dialogRef.close).toHaveBeenCalledWith({
      emailDestino: 'destino@example.com',
      mensagem: 'Mensagem válida',
    });
  });

  it('cancelar fecha sem disparar request', () => {
    setup();

    component.cancelar();

    expect(dialogRef.close).toHaveBeenCalledWith();
  });

  it('não fecha com payload quando form está inválido', () => {
    setup();
    component.emailControl.setValue('');

    component.enviar();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.emailControl.touched).toBeTrue();
  });
});
