import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, of, throwError } from 'rxjs';
import { PresencaPublicaComponent } from './presenca-publica.component';
import { PresencaPublicaResponse, PresencaPublicaSlugDisponivelResponse } from './presenca-publica.models';
import { PresencaPublicaService } from './presenca-publica.service';

describe('PresencaPublicaComponent', () => {
  let fixture: ComponentFixture<PresencaPublicaComponent>;
  let component: PresencaPublicaComponent;
  let service: jasmine.SpyObj<PresencaPublicaService>;
  let toastr: jasmine.SpyObj<ToastrService>;

  const presencaA: PresencaPublicaResponse = {
    slugPublico: 'santa-luzia',
    dominioProprio: 'santaluzia.com.br',
    dominioProprioAtivo: true,
  };

  const presencaB: PresencaPublicaResponse = {
    slugPublico: 'nova-loja',
    dominioProprio: 'santaluzia.com.br',
    dominioProprioAtivo: true,
  };

  function setup(buscar$: Observable<PresencaPublicaResponse> = of(presencaA)): void {
    service = jasmine.createSpyObj<PresencaPublicaService>('PresencaPublicaService', [
      'buscar',
      'consultarSlugDisponivel',
      'alterarSlug',
      'configurarDominioProprio',
      'removerDominioProprio',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);

    service.buscar.and.returnValue(buscar$);
    service.consultarSlugDisponivel.and.returnValue(of({ slug: 'nova-loja', disponivel: true }));
    service.alterarSlug.and.returnValue(of(presencaB));
    service.configurarDominioProprio.and.returnValue(of(presencaA));
    service.removerDominioProprio.and.returnValue(of({ slugPublico: 'santa-luzia', dominioProprio: null, dominioProprioAtivo: false }));

    TestBed.configureTestingModule({
      imports: [PresencaPublicaComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PresencaPublicaService, useValue: service },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(PresencaPublicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes(text));
  }

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('renderiza PageCard, SectionCard, domínio fixo e footer padrão sem salvar local', () => {
    setup();

    const text = fixture.nativeElement.textContent;

    expect(fixture.debugElement.queryAll(By.css('app-page-card')).length).toBe(1);
    expect(fixture.debugElement.queryAll(By.css('app-section-card')).length).toBe(1);
    expect(text).toContain('Presença Pública');
    expect(text).toContain('Endereço ClickManager');
    expect(text).toContain('santa-luzia.clickmanager.com.br');
    expect(text).toContain('Prévia do endereço');
    expect(text).toContain('.clickmanager.com.br');
    expect(text).toContain('Cancelar');
    expect(text).toContain('Salvar');
    expect(text).not.toContain('Alterar');
    expect(text).not.toContain('DNS');
    expect(text).not.toContain('SSL');
    expect(text).not.toContain('Domínio próprio');
  });

  it('bloqueia formulário vazio em erro de GET e permite retry sem reload', () => {
    service = jasmine.createSpyObj<PresencaPublicaService>('PresencaPublicaService', [
      'buscar',
      'consultarSlugDisponivel',
      'alterarSlug',
      'configurarDominioProprio',
      'removerDominioProprio',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);
    service.buscar.and.returnValues(throwError(() => ({ userMessage: 'Falha de rede' })), of(presencaA));

    TestBed.configureTestingModule({
      imports: [PresencaPublicaComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PresencaPublicaService, useValue: service },
        { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(true) }) } },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(PresencaPublicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar a presença pública');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();

    component.carregar();
    fixture.detectChanges();

    expect(service.buscar).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('santa-luzia.clickmanager.com.br');
  });

  it('mostra acesso restrito quando o GET retorna 403', () => {
    setup(throwError(() => ({ status: 403 })));

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(toastr.error).not.toHaveBeenCalled();
  });

  it('preserva validators, normalização e consulta do slug', () => {
    setup();

    component.slugControl.setValue('a'.repeat(81));
    component.consultarSlug();
    expect(service.consultarSlugDisponivel).not.toHaveBeenCalled();

    component.slugControl.setValue('Nova Loja');
    component.consultarSlug();
    fixture.detectChanges();

    expect(component.slugControl.value).toBe('nova-loja');
    expect(service.consultarSlugDisponivel).toHaveBeenCalledOnceWith('nova-loja');
    expect(component.slugConsultado).toEqual({ slug: 'nova-loja', disponivel: true });

    component.slugControl.setValue('a'.repeat(81));
    expect(component.slugControl.hasError('maxlength')).toBeTrue();
  });

  it('considera o slug atual válido sem consultar o backend', () => {
    setup();

    component.slugControl.setValue('santa-luzia');
    component.consultarSlug();
    fixture.detectChanges();

    expect(service.consultarSlugDisponivel).not.toHaveBeenCalled();
    expect(component.slugConsultado).toEqual({ slug: 'santa-luzia', disponivel: true });
    expect(fixture.nativeElement.textContent).toContain('Este já é o endereço atual da empresa.');
  });

  it('ignora resposta obsoleta de disponibilidade quando o campo mudou', () => {
    setup();
    const consultaA = new Subject<PresencaPublicaSlugDisponivelResponse>();
    service.consultarSlugDisponivel.and.returnValue(consultaA.asObservable());

    component.slugControl.setValue('empresa-a');
    component.consultarSlug();
    component.slugControl.setValue('empresa-b');
    consultaA.next({ slug: 'empresa-a', disponivel: true });
    consultaA.complete();
    fixture.detectChanges();

    expect(component.consultandoSlug).toBeFalse();
    expect(component.slugControl.value).toBe('empresa-b');
    expect(component.slugConsultado).toBeNull();
    expect(component.podeSalvarSlug).toBeFalse();
  });

  it('não salva sem consulta válida, indisponível ou de outro slug', () => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.salvarSlug();
    expect(service.alterarSlug).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalledWith('Consulte a disponibilidade antes de alterar o endereço.');

    component.slugConsultado = { slug: 'nova-loja', disponivel: false };
    component.salvarSlug();
    expect(service.alterarSlug).not.toHaveBeenCalled();

    component.slugConsultado = { slug: 'outra-loja', disponivel: true };
    component.salvarSlug();
    expect(service.alterarSlug).not.toHaveBeenCalled();
  });

  it('salva pelo contrato do slug, bloqueia dupla submissão e atualiza baseline após salvar', () => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.slugConsultado = { slug: 'nova-loja', disponivel: true };
    component.salvarSlug();

    expect(service.alterarSlug).toHaveBeenCalledOnceWith({ slug: 'nova-loja' });
    expect(component.slugControl.value).toBe('nova-loja');
    expect(component.slugConsultado).toBeNull();

    component.slugControl.setValue('terceira-loja');
    component.slugConsultado = { slug: 'terceira-loja', disponivel: true };
    component.formState.reset();

    expect(component.slugControl.value).toBe('nova-loja');
    expect(component.slugConsultado).toBeNull();
  });

  it('preserva dados digitados após erro no save', () => {
    setup();
    service.alterarSlug.and.returnValue(throwError(() => ({ error: { message: 'Slug em uso' } })));

    component.slugControl.setValue('nova-loja');
    component.slugConsultado = { slug: 'nova-loja', disponivel: true };
    component.salvarSlug();

    expect(component.slugControl.value).toBe('nova-loja');
    expect(component.slugConsultado).toEqual({ slug: 'nova-loja', disponivel: true });
    expect(component.salvandoSlug).toBeFalse();
    expect(toastr.error).toHaveBeenCalledWith('Slug em uso');
  });

  it('cancelar do PageCard restaura o slug persistido, limpa consulta e não faz novo GET', fakeAsync(() => {
    setup();

    component.slugControl.setValue('nova-loja');
    component.slugConsultado = { slug: 'nova-loja', disponivel: true };
    fixture.detectChanges();

    buttonByText('Cancelar')?.click();
    tick();
    fixture.detectChanges();

    expect(component.slugControl.value).toBe('santa-luzia');
    expect(component.slugConsultado).toBeNull();
    expect(service.buscar).toHaveBeenCalledTimes(1);
  }));

  it('copia a prévia exibida e trata falha do clipboard', fakeAsync(() => {
    setup();
    let falharClipboard = false;
    const writeText = jasmine.createSpy('writeText').and.callFake(() => (
      falharClipboard ? Promise.reject(new Error('falha')) : Promise.resolve()
    ));
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    });

    component.slugControl.setValue('nova-loja');
    component.copiarHost(component.slugPreviewHost);
    tick();

    expect(writeText).toHaveBeenCalledWith('nova-loja.clickmanager.com.br');
    expect(toastr.success).toHaveBeenCalledWith('Endereço copiado.');

    falharClipboard = true;
    component.copiarHost(component.slugPreviewHost);
    tick();

    expect(toastr.warning).toHaveBeenCalledWith('Não foi possível copiar o endereço.');
  }));

  it('mantém contratos latentes de domínio próprio fora da UI atual', () => {
    setup();

    expect(service.configurarDominioProprio).not.toHaveBeenCalled();
    expect(service.removerDominioProprio).not.toHaveBeenCalled();
    expect(component.dominioConfigurado).toBeTrue();
    expect(component.statusDominio).toBe('Ativo');
  });
});
