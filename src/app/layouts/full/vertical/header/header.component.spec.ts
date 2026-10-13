import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ActivatedRoute, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { BehaviorSubject, of } from 'rxjs';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { AuthService } from 'src/app/services/auth.service';
import { ConfiguracaoAplicativosService } from 'src/app/services/configuracao-aplicativos.service';
import { CoreService } from 'src/app/services/core.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { NotificacaoService } from 'src/app/pages/notificacoes/services/notificacao.service';
import { HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  let fixture: ComponentFixture<HeaderComponent>;

  beforeEach(() => {
    const usuario$ = new BehaviorSubject<Usuario | null>(null);
    const configuracao = signal({ aplicativos: [], atalhos: [] });

    TestBed.configureTestingModule({
      imports: [HeaderComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        { provide: CoreService, useValue: { getOptions: () => ({}) } },
        {
          provide: AuthService,
          useValue: {
            usuario$: usuario$.asObservable(),
            temAlgumaPermissao: () => false,
            temPermissao: () => true,
            getTipoEmpresa: () => 'GRAFICA',
            getJwtId: () => 7,
            logout: jasmine.createSpy('logout'),
          },
        },
        {
          provide: NotificacaoService,
          useValue: {
            obterResumo$: () => of({ itens: [], naoLidas: 0 }),
            marcarComoLida$: () => of({}),
            marcarTodasComoLidas$: () => of({}),
          },
        },
        {
          provide: ConfiguracaoAplicativosService,
          useValue: {
            configuracao,
            carregar: () => of({ aplicativos: [], atalhos: [] }),
          },
        },
        { provide: FeatureFlagService, useValue: { carregar: () => of({}), isEnabled: () => true } },
        {
          provide: Router,
          useValue: {
            events: of(),
            navigate: jasmine.createSpy('navigate'),
            createUrlTree: (commands: unknown[]) => commands,
            serializeUrl: (tree: unknown[]) => tree.join(''),
          },
        },
        { provide: ActivatedRoute, useValue: {} },
      ],
    });

    fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture?.destroy();
    TestBed.resetTestingModule();
  });

  it('exibe atalho acessível para a Central de Ajuda no header', () => {
    const ajudaButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button[aria-label="Abrir Central de Ajuda"]')
    ) as HTMLButtonElement[];

    expect(ajudaButtons.length).toBeGreaterThan(0);
    expect(ajudaButtons.some((button) =>
      button.getAttribute('ng-reflect-router-link') === '/page/ajuda'
      || button.getAttribute('routerLink') === '/page/ajuda'
    )).toBeTrue();
  });
});
