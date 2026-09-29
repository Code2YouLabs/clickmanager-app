import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, of, throwError } from 'rxjs';
import { TipoEmpresa } from 'src/app/models/empresa/tipo-empresa.enum';
import { AuthService } from 'src/app/services/auth.service';
import { PagesRoutes } from '../../pages.routes';
import { navItems } from 'src/app/layouts/full/vertical/sidebar/sidebar-data';
import { EmailServidorComponent } from './email-servidor.component';
import { EmailServidorConfig, EmailServidorService, EmailServidorTesteRequest } from './email-servidor.service';

describe('EmailServidorComponent', () => {
  let fixture: ComponentFixture<EmailServidorComponent>;
  let component: EmailServidorComponent;
  let emailService: jasmine.SpyObj<EmailServidorService>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let dialogOpenSpy: jasmine.Spy;

  const configA: EmailServidorConfig = {
    id: 42,
    host: 'smtp-a.example.com',
    porta: 587,
    usuario: 'smtp-a@example.com',
    senha: 'senha-a',
    remetente: 'remetente-a@example.com',
    usarSsl: true,
  };

  const configB: EmailServidorConfig = {
    id: 42,
    host: 'smtp-b.example.com',
    porta: 465,
    usuario: 'smtp-b@example.com',
    senha: 'senha-b',
    remetente: 'remetente-b@example.com',
    usarSsl: false,
  };

  function setup(options: {
    obter?: Observable<EmailServidorConfig>;
    usuarioEmail?: string | null;
  } = {}): void {
    emailService = jasmine.createSpyObj<EmailServidorService>('EmailServidorService', ['obter', 'atualizar', 'testarEnvio']);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);
    dialogOpenSpy = spyOn(MatDialog.prototype, 'open').and.returnValue({
      afterClosed: () => of({ emailDestino: 'destino@example.com', mensagem: 'Mensagem de teste' }),
    } as any);
    const authService = {
      usuario$: of(options.usuarioEmail === undefined ? { email: 'usuario@clickmanager.com.br' } : { email: options.usuarioEmail }),
    };

    emailService.obter.and.returnValue(options.obter ?? of(configA));
    emailService.atualizar.and.returnValue(of(void 0));
    emailService.testarEnvio.and.returnValue(of(void 0));

    TestBed.configureTestingModule({
      imports: [EmailServidorComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: EmailServidorService, useValue: emailService },
        { provide: ToastrService, useValue: toastr },
        { provide: AuthService, useValue: authService },
      ],
    });

    fixture = TestBed.createComponent(EmailServidorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function text(): string {
    return fixture.nativeElement.textContent;
  }

  function buttonByText(label: string): HTMLButtonElement | undefined {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes(label));
  }

  function patchValid(value: Partial<EmailServidorConfig>): void {
    component.form.patchValue(value);
    component.form.markAsDirty();
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('mantém rota exclusiva da gráfica com permissão CONFIG_EMAIL', () => {
    const route = PagesRoutes.find((item) => item.path === 'config/email-servidor');
    const menuItem = navItems
      .flatMap((item) => item.children || [])
      .find((item) => item.route === '/page/config/email-servidor');

    expect(route?.data?.['allowedEmpresaTipos']).toEqual([TipoEmpresa.GRAFICA]);
    expect(route?.data?.['requiredPermission']).toEqual(['CONFIG_EMAIL']);
    expect(menuItem?.allowedEmpresaTipos).toEqual([TipoEmpresa.GRAFICA]);
    expect(menuItem?.requiredPermission).toEqual(['CONFIG_EMAIL']);
  });

  it('carrega a configuração e preenche o formulário sem renderizar erro', () => {
    setup();

    expect(emailService.obter).toHaveBeenCalledTimes(1);
    expect(component.form.getRawValue()).toEqual(configA);
    expect(text()).toContain('Servidor SMTP');
    expect(text()).toContain('Credenciais e remetente');
    expect(text()).not.toContain('Não foi possível carregar');
  });

  it('mostra erro, retry e não renderiza formulário com defaults em falha de GET', () => {
    setup({ obter: throwError(() => ({ userMessage: 'Falha no GET' })) });

    expect(text()).toContain('Não foi possível carregar a configuração de e-mail');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    emailService.obter.and.returnValue(of(configA));
    component.carregar();
    fixture.detectChanges();

    expect(emailService.obter).toHaveBeenCalledTimes(2);
    expect(component.hostControl.value).toBe('smtp-a.example.com');
  });

  it('mostra acesso restrito em 403 sem toast genérico', () => {
    setup({ obter: throwError(() => ({ status: 403 })) });

    expect(text()).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('usa PageCard, SectionCard, footer canônico e submit por form id', () => {
    setup();

    expect(fixture.debugElement.queryAll(By.css('app-page-card')).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.css('app-section-card')).length).toBe(2);
    expect(fixture.nativeElement.querySelector('form')?.getAttribute('id')).toBe('email-servidor-form');
    expect(buttonByText('Salvar')?.getAttribute('form')).toBe('email-servidor-form');
    expect(buttonByText('Cancelar')).toBeTruthy();
    expect(fixture.debugElement.query(By.css('.actions-row'))).toBeNull();
    expect(text()).not.toContain('Voltar');
  });

  it('usa InputPassword para senha e não renderiza senha como texto comum inicialmente', () => {
    setup();

    expect(fixture.debugElement.query(By.css('app-input-password'))).toBeTruthy();
    expect(fixture.debugElement.queryAll(By.css('input[type="password"]')).length).toBe(1);
  });

  it('valida campos obrigatórios e e-mails antes de salvar', () => {
    setup();

    component.form.patchValue({ host: '', porta: 0, usuario: 'usuario-invalido', senha: '', remetente: 'remetente-invalido' });
    component.form.markAsDirty();
    component.salvar();

    expect(emailService.atualizar).not.toHaveBeenCalled();
    expect(component.hostControl.hasError('required')).toBeTrue();
    expect(component.portaControl.hasError('min')).toBeTrue();
    expect(component.usuarioControl.hasError('email')).toBeTrue();
    expect(component.senhaControl.hasError('required')).toBeTrue();
    expect(component.remetenteControl.hasError('email')).toBeTrue();
  });

  it('salva por PUT com payload atual, evita duplo submit e atualiza baseline sem novo GET', fakeAsync(() => {
    const salvar$ = new Subject<void>();
    setup();
    emailService.atualizar.and.returnValue(salvar$.asObservable());
    patchValid(configB);

    component.salvar();
    component.salvar();

    expect(emailService.atualizar).toHaveBeenCalledTimes(1);
    expect(emailService.atualizar.calls.mostRecent().args[0]).toEqual(configB);

    salvar$.next();
    salvar$.complete();
    tick();
    fixture.detectChanges();

    expect(toastr.success).toHaveBeenCalledWith('Configuração de e-mail salva');
    expect(component.form.pristine).toBeTrue();

    patchValid({ host: 'smtp-c.example.com' });
    buttonByText('Cancelar')?.click();
    tick();

    expect(component.hostControl.value).toBe('smtp-b.example.com');
    expect(emailService.obter).toHaveBeenCalledTimes(1);
  }));

  it('mantém valores digitados em erro de save e libera nova tentativa', () => {
    setup();
    emailService.atualizar.and.returnValue(throwError(() => ({ userMessage: 'Falha ao salvar' })));
    patchValid(configB);

    component.salvar();

    expect(component.hostControl.value).toBe('smtp-b.example.com');
    expect(component.salvando).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Falha ao salvar');
  });

  it('cancelar restaura todos os campos carregados sem navegar e sem novo GET', fakeAsync(() => {
    setup();
    patchValid(configB);

    buttonByText('Cancelar')?.click();
    tick();

    expect(component.form.getRawValue()).toEqual(configA);
    expect(emailService.obter).toHaveBeenCalledTimes(1);
  }));

  it('testar usa valores atuais não salvos, id e destinatário padrão do usuário', () => {
    setup();
    patchValid(configB);

    component.testar();

    expect(dialogOpenSpy).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      width: '600px',
      data: jasmine.objectContaining({
        emailDestino: 'usuario@clickmanager.com.br',
        mensagemPadrao: component.mensagemPadraoTeste,
      }),
    }));
    const payload = emailService.testarEnvio.calls.mostRecent().args[0] as EmailServidorTesteRequest;
    expect(payload).toEqual({
      emailDestino: 'destino@example.com',
      mensagem: 'Mensagem de teste',
      id: 42,
      host: 'smtp-b.example.com',
      porta: 465,
      usuario: 'smtp-b@example.com',
      senha: 'senha-b',
      remetente: 'remetente-b@example.com',
      usarSsl: false,
    });
  });

  it('não abre dialog de teste quando formulário está inválido', () => {
    setup();
    component.senhaControl.setValue('');

    component.testar();

    expect(dialogOpenSpy).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalledWith('Preencha a configuração antes de testar.');
  });

  it('abre dialog de teste com destinatário vazio quando usuário não tem e-mail', () => {
    setup({ usuarioEmail: null });

    component.testar();

    expect(dialogOpenSpy.calls.mostRecent().args[1]).toEqual(jasmine.objectContaining({
      data: jasmine.objectContaining({ emailDestino: '' }),
    }));
  });

  it('evita múltiplos POST de teste pendentes e preserva baseline original', fakeAsync(() => {
    const teste$ = new Subject<void>();
    setup();
    emailService.testarEnvio.and.returnValue(teste$.asObservable());
    patchValid(configB);

    component.testar();
    component.testar();

    expect(emailService.testarEnvio).toHaveBeenCalledTimes(1);

    teste$.next();
    teste$.complete();
    tick();
    fixture.detectChanges();

    expect(toastr.success).toHaveBeenCalledWith('E-mail de teste enviado. Verifique a caixa de entrada de destino@example.com.');
    buttonByText('Cancelar')?.click();
    tick();

    expect(component.form.getRawValue()).toEqual(configA);
  }));

  it('preserva feedback de erro do teste sem expor credenciais em mensagem própria', () => {
    setup();
    emailService.testarEnvio.and.returnValue(throwError(() => ({ userMessage: 'SMTP indisponível' })));

    component.testar();

    expect(component.testando).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('SMTP indisponível');
  });
});
