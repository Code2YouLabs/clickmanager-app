import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Observable, Subject, of, throwError } from 'rxjs';
import { environment } from 'src/environments/environment';
import { SiteConfigService } from '../../site/services/site-config.service';
import { AlterarEnderecoPublicoDialogComponent } from './components/alterar-endereco-publico-dialog.component';
import { PresencaPublicaComponent } from './presenca-publica.component';
import { PresencaPublicaResponse } from './presenca-publica.models';
import { PresencaPublicaService } from './presenca-publica.service';

describe('PresencaPublicaComponent', () => {
  let fixture: ComponentFixture<PresencaPublicaComponent>;
  let component: PresencaPublicaComponent;
  let service: jasmine.SpyObj<PresencaPublicaService>;
  let siteConfigService: jasmine.SpyObj<SiteConfigService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  const originalPublicSiteBaseUrl = environment.publicSiteBaseUrl;
  const originalPublicBaseDomain = environment.publicBaseDomain;
  const originalProduction = environment.production;

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

  function setup(buscar$: Observable<PresencaPublicaResponse> = of(presencaA), siteAtivo = false): void {
    environment.publicSiteBaseUrl = 'http://localhost:4500';
    environment.publicBaseDomain = 'clickmanager.com.br';
    environment.production = false;
    service = jasmine.createSpyObj<PresencaPublicaService>('PresencaPublicaService', [
      'buscar',
      'consultarSlugDisponivel',
      'alterarSlug',
      'configurarDominioProprio',
      'removerDominioProprio',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    siteConfigService = jasmine.createSpyObj<SiteConfigService>('SiteConfigService', ['buscar']);

    service.buscar.and.returnValue(buscar$);
    service.consultarSlugDisponivel.and.returnValue(of({ slug: 'nova-loja', disponivel: true }));
    service.alterarSlug.and.returnValue(of(presencaB));
    service.configurarDominioProprio.and.returnValue(of(presencaA));
    service.removerDominioProprio.and.returnValue(of({ slugPublico: 'santa-luzia', dominioProprio: null, dominioProprioAtivo: false }));
    siteConfigService.buscar.and.returnValue(of({
      siteAtivo,
      slugPublico: 'santa-luzia',
      orcamentoAtivo: false,
      whatsappAtivo: false,
      whatsappExibicao: 'ICONE',
    }));
    dialog.open.and.returnValue({ afterClosed: () => of(undefined) } as any);

    TestBed.configureTestingModule({
      imports: [PresencaPublicaComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PresencaPublicaService, useValue: service },
        { provide: SiteConfigService, useValue: siteConfigService },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
      ],
    });
    TestBed.overrideProvider(MatDialog, { useValue: dialog });

    fixture = TestBed.createComponent(PresencaPublicaComponent);
    component = fixture.componentInstance;
    (component as any).dialog = dialog;
    fixture.detectChanges();
  }

  function buttonByText(text: string): HTMLButtonElement | undefined {
    return Array.from<HTMLButtonElement>(fixture.nativeElement.querySelectorAll('button'))
      .find((button) => button.textContent?.includes(text));
  }

  afterEach(() => {
    environment.publicSiteBaseUrl = originalPublicSiteBaseUrl;
    environment.publicBaseDomain = originalPublicBaseDomain;
    environment.production = originalProduction;
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('carrega presença e mostra a página como resumo do endereço atual', () => {
    setup();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Presença Pública');
    expect(text).toContain('Gerencie como sua empresa é acessada publicamente.');
    expect(text).toContain('Endereço público');
    expect(text).toContain('Seu endereço público ClickManager.');
    expect(text).toContain('https://santa-luzia.clickmanager.com.br');
    expect(text).toContain('Abrir site');
    expect(text).toContain('Copiar endereço');
    expect(text).toContain('Alterar endereço');
    expect(text).toContain('Site não publicado');
    expect(text).toContain('Seu endereço já está reservado. Publique o site quando o conteúdo estiver pronto.');
    expect(text).toContain('Configurar publicação');
    expect(text).not.toContain('Novo subdomínio');
    expect(text).not.toContain('Verificar disponibilidade');
    expect(text).not.toContain('Usar este endereço');
    expect(text).not.toContain('Salvar');
    expect(text).not.toContain('Cancelar');
    expect(fixture.nativeElement.querySelector('.page-card__footer')).toBeNull();
  });

  it('mostra status publicado de forma compacta', () => {
    setup(of(presencaA), true);

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Site publicado');
    expect(text).not.toContain('Configurar publicação');
    expect(text).not.toContain('Site ativo');
  });

  it('abre e copia o endereço público sem depender de permissão de edição', fakeAsync(() => {
    setup();
    const openSpy = spyOn(window, 'open').and.returnValue({ opener: null } as Window);
    const writeText = jasmine.createSpy('writeText').and.returnValue(Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });

    buttonByText('Abrir site')?.click();
    buttonByText('Copiar endereço')?.click();
    tick();

    expect(openSpy).toHaveBeenCalledOnceWith('https://santa-luzia.clickmanager.com.br', '_blank', 'noopener,noreferrer');
    expect(writeText).toHaveBeenCalledOnceWith('https://santa-luzia.clickmanager.com.br');
    expect(toastr.success).toHaveBeenCalledWith('Endereço copiado.');
  }));

  it('não renderiza ambiente de desenvolvimento em produção', () => {
    setup();
    environment.production = true;
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;

    expect(text).not.toContain('Ambiente de desenvolvimento');
    expect(text).not.toContain('localhost');
    expect(component.mostrarAmbienteDesenvolvimento).toBeFalse();
  });

  it('mostra ambiente de desenvolvimento somente fora de produção', () => {
    setup();

    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Ambiente de desenvolvimento');
    expect(text).toContain('http://localhost:4500/loja/santa-luzia');
  });

  it('abre dialog de alteração com os dados do endereço atual', () => {
    setup();

    buttonByText('Alterar endereço')?.click();

    expect(dialog.open).toHaveBeenCalledOnceWith(AlterarEnderecoPublicoDialogComponent, jasmine.objectContaining({
      width: '620px',
      maxWidth: 'calc(100vw - 32px)',
      autoFocus: false,
      data: jasmine.objectContaining({
        presenca: presencaA,
        dominioPublico: 'clickmanager.com.br',
        urlAtual: 'https://santa-luzia.clickmanager.com.br',
      }),
    }));
    expect(service.consultarSlugDisponivel).not.toHaveBeenCalled();
    expect(service.alterarSlug).not.toHaveBeenCalled();
  });

  it('response do dialog atualiza endereço sem novo GET', () => {
    const closed$ = new Subject<PresencaPublicaResponse | undefined>();
    setup();
    dialog.open.and.returnValue({ afterClosed: () => closed$.asObservable() } as any);

    component.abrirAlteracaoEndereco();
    closed$.next(presencaB);
    fixture.detectChanges();

    expect(service.buscar).toHaveBeenCalledTimes(1);
    expect(component.presenca).toEqual(presencaB);
    expect(fixture.nativeElement.textContent).toContain('https://nova-loja.clickmanager.com.br');
    expect(toastr.success).toHaveBeenCalledWith('Endereço público alterado com sucesso.');
  });

  it('cancelamento do dialog não altera presença', () => {
    const closed$ = new Subject<PresencaPublicaResponse | undefined>();
    setup();
    dialog.open.and.returnValue({ afterClosed: () => closed$.asObservable() } as any);

    component.abrirAlteracaoEndereco();
    closed$.next(undefined);
    fixture.detectChanges();

    expect(component.presenca).toEqual(presencaA);
    expect(fixture.nativeElement.textContent).toContain('https://santa-luzia.clickmanager.com.br');
    expect(toastr.success).not.toHaveBeenCalledWith('Endereço público alterado com sucesso.');
  });

  it('mantém erro/retry do carregamento principal', () => {
    environment.publicSiteBaseUrl = 'http://localhost:4500';
    environment.publicBaseDomain = 'clickmanager.com.br';
    environment.production = false;
    service = jasmine.createSpyObj<PresencaPublicaService>('PresencaPublicaService', [
      'buscar',
      'consultarSlugDisponivel',
      'alterarSlug',
      'configurarDominioProprio',
      'removerDominioProprio',
    ]);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'warning', 'error']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    siteConfigService = jasmine.createSpyObj<SiteConfigService>('SiteConfigService', ['buscar']);
    service.buscar.and.returnValues(throwError(() => ({ userMessage: 'Falha de rede' })), of(presencaA));
    siteConfigService.buscar.and.returnValue(of({
      siteAtivo: false,
      slugPublico: 'santa-luzia',
      orcamentoAtivo: false,
      whatsappAtivo: false,
      whatsappExibicao: 'ICONE',
    }));

    TestBed.configureTestingModule({
      imports: [PresencaPublicaComponent, NoopAnimationsModule],
      providers: [
        provideRouter([]),
        { provide: PresencaPublicaService, useValue: service },
        { provide: SiteConfigService, useValue: siteConfigService },
        { provide: MatDialog, useValue: dialog },
        { provide: ToastrService, useValue: toastr },
      ],
    });

    fixture = TestBed.createComponent(PresencaPublicaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Não foi possível carregar a presença pública');

    component.carregar();
    fixture.detectChanges();

    expect(service.buscar).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.textContent).toContain('https://santa-luzia.clickmanager.com.br');
  });

  it('mostra acesso restrito quando o GET retorna 403', () => {
    setup(throwError(() => ({ status: 403 })));

    expect(fixture.nativeElement.textContent).toContain('Acesso restrito');
    expect(buttonByText('Alterar endereço')).toBeUndefined();
    expect(toastr.error).not.toHaveBeenCalled();
  });
});
