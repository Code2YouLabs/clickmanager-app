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
  let empresaService: jasmine.SpyObj<EmpresaFormService>;

  const empresaMock = {
    id: 1,
    nome: 'Santa Luzia',
    telefone: '31999999999',
    email: 'contato@santaluzia.com.br',
    cnpj: '11222333000181',
    inscricaoEstadual: 'ISENTO',
    horario: 'Seg a Sex, 08h às 18h',
    logoUrl: 'https://cdn/logo.png',
    instagramUrl: '@santaluzia',
    facebookUrl: 'https://facebook.com/santaluzia',
    siteUrl: 'https://santaluzia.com.br',
    youtubeUrl: 'https://youtube.com/@santaluzia',
    ativa: true,
    endereco: {
      cep: '30000000',
      logradouro: 'Rua A',
      numero: '10',
      complemento: 'Sala 1',
      bairro: 'Centro',
      cidade: 'BH',
      estado: 'MG',
    },
  };

  beforeEach(() => {
    empresaService = jasmine.createSpyObj<EmpresaFormService>('EmpresaFormService', ['buscarEmpresa', 'cadastrarEmpresaFormData']);
    empresaService.buscarEmpresa.and.returnValue(of(empresaMock));
    empresaService.cadastrarEmpresaFormData.and.returnValue(of(empresaMock));

    TestBed.configureTestingModule({
      imports: [EmpresaFormComponent, NoopAnimationsModule, TablerIconsModule.pick(TablerIcons)],
      providers: [
        { provide: EmpresaFormService, useValue: empresaService },
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

  it('remove logo da aba Empresa e organiza as secoes cadastrais', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Dados básicos');
    expect(text).toContain('Contato');
    expect(text).toContain('Atendimento');
    expect(text).toContain('Endereço');
    expect(text).toContain('Horário de Funcionamento');
    expect(text).not.toContain('Logo da Empresa');
    expect(text).not.toContain('Configurações da Empresa');
  });

  it('restaura o snapshot da aba Empresa ao cancelar', () => {
    const component = fixture.componentInstance;

    component.nomeControl.setValue('Nome alterado');
    expect(component.empresaDirty).toBeTrue();

    component.cancelarEmpresa();

    expect(component.nomeControl.value).toBe('Santa Luzia');
    expect(component.empresaDirty).toBeFalse();
  });

  it('salva a aba Empresa usando o footer padrao', () => {
    const component = fixture.componentInstance;

    component.telefoneControl.setValue('31988887777');
    component.salvarEmpresa();

    expect(empresaService.cadastrarEmpresaFormData).toHaveBeenCalled();
    expect(component.empresaDirty).toBeFalse();
  });

  it('mantem logo favicon e endereco na Identidade Publica com acoes padronizadas', () => {
    const component = fixture.componentInstance;

    expect(component.nomePublico).toBe('Santa Luzia');
    expect(component.enderecoClickManager).toBe('santa-luzia.clickmanager.com.br');
    expect(component.imagemPreview).toBe('https://cdn/logo.png');
    expect(component.faviconPreview).toBe('https://cdn/favicon.png');
    expect(component.identidadeDirty).toBeFalse();

    component.removerFavicon();
    expect(component.faviconPreview).toBe('favicon.ico');
    expect(component.identidadeDirty).toBeTrue();

    component.cancelarIdentidadePublica();
    expect(component.faviconPreview).toBe('https://cdn/favicon.png');
    expect(component.identidadeDirty).toBeFalse();
  });

  it('exibe footer padrao na tela e usa Website para URL externa', () => {
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Redes Sociais');
    expect(fixture.componentInstance.instagramUrlControl.value).toBe('@santaluzia');
    expect(fixture.componentInstance.facebookUrlControl.value).toBe('https://facebook.com/santaluzia');
    expect(fixture.componentInstance.youtubeUrlControl.value).toBe('https://youtube.com/@santaluzia');
    expect(fixture.componentInstance.siteUrlControl.value).toBe('https://santaluzia.com.br');
    expect(text).not.toContain('label="Site"');
    expect(text).toContain('Cancelar');
    expect(text).toContain('Salvar');
  });

  it('restaura snapshot de Redes Sociais ao cancelar', () => {
    const component = fixture.componentInstance;

    component.instagramUrlControl.setValue('@alterado');
    expect(component.redesDirty).toBeTrue();

    component.cancelarRedes();

    expect(component.instagramUrlControl.value).toBe('@santaluzia');
    expect(component.redesDirty).toBeFalse();
  });

  it('salva Redes Sociais e atualiza dirty state', () => {
    const component = fixture.componentInstance;

    expect(component.podeSalvarRedes).toBeFalse();
    component.siteUrlControl.setValue('https://novo-site.com.br');
    expect(component.podeSalvarRedes).toBeTrue();

    component.salvarRedes();

    expect(empresaService.cadastrarEmpresaFormData).toHaveBeenCalled();
    expect(component.redesDirty).toBeFalse();
  });
});
