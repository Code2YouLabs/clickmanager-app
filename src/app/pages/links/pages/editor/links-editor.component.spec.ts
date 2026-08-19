import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { PaginaLinksDetalhe } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { LinksEditorComponent } from './links-editor.component';

describe('LinksEditorComponent', () => {
  const detalhe: PaginaLinksDetalhe = {
    id: 7,
    titulo: 'Página salva',
    descricao: 'Descrição salva',
    ativa: true,
    publicada: false,
    principal: true,
    tema: 'CLARO',
    corPrincipal: '#0D6EFD',
    corFundo: '#F6F8FB',
    formatoBotao: 'ARREDONDADO',
    createdAt: '',
    updatedAt: '',
    identidade: { nome: 'Empresa', slug: 'empresa', logoUrl: 'https://cdn/logo.png' },
    itens: [],
  };

  function setup(path = ':id', pagina = detalhe): ComponentFixture<LinksEditorComponent> {
    TestBed.configureTestingModule({
      imports: [LinksEditorComponent, NoopAnimationsModule, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path }, paramMap: { get: () => '7' } } } },
        {
          provide: LinksService,
          useValue: {
            buscarPagina: () => of(pagina),
            editarPagina: (_id: number, payload: Partial<PaginaLinksDetalhe>) => of({ ...pagina, ...payload }),
            criarPagina: (payload: Partial<PaginaLinksDetalhe>) => of({ ...pagina, ...payload }),
            alterarPublicacao: (_id: number, publicada: boolean) => of({ ...pagina, publicada }),
            arquivarPagina: () => of(void 0),
          },
        },
        { provide: EmpresaIdentidadePublicaService, useValue: { buscar: () => of(pagina.identidade) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: AuthService, useValue: { temPermissao: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(LinksEditorComponent);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('mantem Salvar no footer com Cancelar e fora do header', () => {
    const fixture = setup();
    const footer = fixture.nativeElement.querySelector('.links-editor-footer');

    expect(footer?.textContent).toContain('Cancelar');
    expect(footer?.textContent).toContain('Salvar');
    expect(fixture.nativeElement.querySelector('app-card-header')?.textContent).not.toContain('Salvar');
  });

  it('cancela criacao restaurando defaults iniciais', () => {
    const fixture = setup('nova');
    const component = fixture.componentInstance;

    component.tituloControl.setValue('Alterado');
    component.descricaoControl.setValue('Texto');
    component.corPrincipalControl.setValue('#111111');
    component.cancelarAlteracoes();

    expect(component.tituloControl.value).toBe('Empresa');
    expect(component.descricaoControl.value).toBe('');
    expect(component.corPrincipalControl.value).toBe('#0D6EFD');
  });

  it('cancela edicao restaurando snapshot persistido e atualiza snapshot apos salvar', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.tituloControl.setValue('Alterado');
    component.cancelarAlteracoes();
    expect(component.tituloControl.value).toBe('Página salva');

    component.tituloControl.setValue('Novo salvo');
    component.salvarPagina();
    component.tituloControl.setValue('Alterado outra vez');
    component.cancelarAlteracoes();

    expect(component.tituloControl.value).toBe('Novo salvo');
  });

  it('posiciona publicacao em Geral e arquivamento em acoes avancadas', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Publicação');
    expect(text).toContain('Publicar');
    expect(text).toContain('Ações avançadas');
    expect(text).toContain('Arquivar página');
  });

  it('mantem identidade e endereco em modo leitura', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Identidade da empresa');
    expect(text).toContain('A logo e o endereço pertencem à identidade da empresa');
    expect(text).toContain('/l/empresa');
    expect(text).not.toContain('Alterar logo');
    expect(text).not.toContain('Remover');
    expect(text).not.toContain('Alterar endereço');
  });
});
