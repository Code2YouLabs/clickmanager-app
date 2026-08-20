import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { SiteConfigService } from '../services/site-config.service';
import { SiteConfiguracoesComponent } from './site-configuracoes.component';

describe('SiteConfiguracoesComponent', () => {
  let fixture: ComponentFixture<SiteConfiguracoesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [SiteConfiguracoesComponent, NoopAnimationsModule, RouterTestingModule.withRoutes([])],
      providers: [
        {
          provide: SiteConfigService,
          useValue: {
            buscar: () => of({
              siteAtivo: true,
              slugPublico: 'santa-luzia',
              dominioCustom: 'santaluzia.com.br',
              dominioCustomAtivo: true,
              faviconUrl: 'https://cdn/favicon.png',
              orcamentoAtivo: true,
              whatsappAtivo: true,
              whatsappExibicao: 'ICONE_TEXTO',
              whatsappTexto: 'Fale conosco',
              whatsappTelefone: null,
              whatsappMensagemInicial: null,
            }),
            atualizar: () => of({}),
          },
        },
        { provide: AuthService, useValue: { temPermissao: () => true } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error']) },
      ],
    });
    fixture = TestBed.createComponent(SiteConfiguracoesComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('nao exibe edicao de slug dominio proprio ou favicon no Site Publico', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Endereço público');
    expect(text).toContain('Gerenciar Presença Pública');
    expect(text).toContain('Gerenciar Identidade Pública');
    expect(text).not.toContain('Slug público');
    expect(text).not.toContain('Escolher favicon');
    expect(text).not.toContain('Salvar favicon');
    expect(text).not.toContain('Testar domínio próprio');
  });
});
