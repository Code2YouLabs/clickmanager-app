import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { CepUtilService } from 'src/app/utils/cep-util.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { EmpresaIdentidadePublicaService } from './empresa-identidade-publica.service';
import { EmpresaFormComponent } from './empresa-form.component';
import { EmpresaFormService } from './empresa-form.service';

describe('EmpresaFormComponent', () => {
  let fixture: ComponentFixture<EmpresaFormComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [EmpresaFormComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        {
          provide: EmpresaFormService,
          useValue: {
            buscarEmpresa: () => of({
              id: 1,
              nome: 'Santa Luzia',
              telefone: '31999999999',
              email: 'contato@santaluzia.com.br',
              cnpj: '12345678000190',
              logoUrl: 'https://cdn/logo.png',
              ativa: true,
              endereco: {
                cep: '30000000',
                logradouro: 'Rua A',
                numero: '10',
                bairro: 'Centro',
                cidade: 'BH',
                estado: 'MG',
              },
            }),
            cadastrarEmpresaFormData: () => of(void 0),
          },
        },
        {
          provide: EmpresaIdentidadePublicaService,
          useValue: {
            buscar: () => of({ nome: 'Santa Luzia', slug: 'santa-luzia', logoUrl: 'https://cdn/logo.png', faviconUrl: 'https://cdn/favicon.png' }),
            alterarFavicon: () => of({ nome: 'Santa Luzia', slug: 'santa-luzia', logoUrl: 'https://cdn/logo.png', faviconUrl: 'https://cdn/favicon.png' }),
            removerFavicon: () => of({ nome: 'Santa Luzia', slug: 'santa-luzia', logoUrl: 'https://cdn/logo.png', faviconUrl: null }),
          },
        },
        { provide: AuthService, useValue: { usuario$: of({ empresa: { id: 1 } }), getJwtId: () => 1 } },
        { provide: CepUtilService, useValue: { buscarEndereco: () => of(null) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) },
      ],
    });

    fixture = TestBed.createComponent(EmpresaFormComponent);
    fixture.detectChanges();
  });

  afterEach(() => TestBed.resetTestingModule());

  it('exibe Identidade Publica com nome logo favicon e endereco ClickManager sem editar slug', () => {
    const text = fixture.nativeElement.textContent;
    const component = fixture.componentInstance;

    expect(text).toContain('Identidade Pública');
    expect(component.nomePublico).toBe('Santa Luzia');
    expect(component.enderecoClickManager).toBe('santa-luzia.clickmanager.com.br');
    expect(component.faviconPreview).toBe('https://cdn/favicon.png');
    expect(text).not.toContain('Slug público');
    expect(text).not.toContain('Alterar endereço');
  });
});
