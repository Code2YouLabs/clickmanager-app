import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { PresencaPublicaService } from 'src/app/pages/config/presenca-publica/presenca-publica.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { LinksShareDialogComponent } from '../../components/share-dialog/links-share-dialog.component';
import { PaginaLinksResumo } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { LinksListaComponent } from './links-lista.component';

describe('LinksListaComponent', () => {
  let fixture: ComponentFixture<LinksListaComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;
  const originalPublicSiteBaseUrl = environment.publicSiteBaseUrl;
  const originalPublicBaseDomain = environment.publicBaseDomain;

  const paginas: PaginaLinksResumo[] = [
    {
      id: 1,
      slug: 'pagina-publicada',
      titulo: 'Página publicada',
      descricao: 'Descrição',
      ativa: true,
      publicada: true,
      principal: true,
      tema: 'CLARO',
      corPrincipal: '#0D6EFD',
      corFundo: '#F6F8FB',
      formatoBotao: 'ARREDONDADO',
      quantidadeItens: 2,
      createdAt: '',
      updatedAt: '',
    },
    {
      id: 2,
      slug: 'pagina-inativa',
      titulo: 'Página inativa',
      descricao: null,
      ativa: false,
      publicada: false,
      principal: false,
      tema: 'CLARO',
      corPrincipal: '#0D6EFD',
      corFundo: '#F6F8FB',
      formatoBotao: 'ARREDONDADO',
      quantidadeItens: 0,
      createdAt: '',
      updatedAt: '',
    },
  ];

  beforeEach(async () => {
    environment.publicSiteBaseUrl = '';
    environment.publicBaseDomain = 'clickmanager.com.br';
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    await TestBed.configureTestingModule({
      imports: [LinksListaComponent, NoopAnimationsModule, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: LinksService, useValue: { listarPaginas: () => of(paginas), alterarPublicacao: () => of({ ...paginas[0], itens: [], identidade: null }), tornarPrincipal: () => of({ ...paginas[0], itens: [], identidade: null }), excluirPagina: () => of(void 0) } },
        { provide: EmpresaIdentidadePublicaService, useValue: { buscar: () => of({ nome: 'Empresa', slug: 'empresa-de-teste', logoUrl: null }) } },
        { provide: PresencaPublicaService, useValue: { buscar: () => of({ slugPublico: 'empresa-de-teste', dominioProprio: null, dominioProprioAtivo: false }) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) },
        { provide: MatDialog, useValue: dialog },
        { provide: ActivatedRoute, useValue: {} },
        { provide: AuthService, useValue: { usuario$: of({ empresa: { id: 1 } }), temPermissao: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinksListaComponent);
    (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
  });

  afterEach(() => {
    environment.publicSiteBaseUrl = originalPublicSiteBaseUrl;
    environment.publicBaseDomain = originalPublicBaseDomain;
  });

  it('renderiza a listagem sem titulo duplicado no componente', () => {
    const text = fixture.nativeElement.textContent;
    expect((text.match(/Páginas ClickLink/g) || []).length).toBe(1);
    expect(text).not.toContain('Página inativa');
  });

  it('exibe Compartilhar como acao direta e abre o dialog reutilizavel', () => {
    expect(fixture.nativeElement.textContent).toContain('Compartilhar');
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Editar página"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Compartilhar página"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Abrir página"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Mais ações"]')?.getAttribute('ng-reflect-message')).toBe('Mais ações');

    fixture.componentInstance.compartilhar(paginas[0]);

    expect(dialog.open).toHaveBeenCalledWith(LinksShareDialogComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({ url: 'https://empresa-de-teste.clickmanager.com.br/links' }),
    }));
  });

  it('mantem acoes de estado e exclusao no menu da listagem', () => {
    fixture.componentInstance.paginaMenu = paginas[0];
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Mais ações"]')?.click();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Despublicar');
    expect(document.body.textContent).not.toContain('Arquivar');
    expect(document.body.textContent).toContain('Excluir');
  });

  it('exige confirmacao antes de excluir pela listagem', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(false) } as never);

    fixture.componentInstance.excluir(paginas[0]);

    expect(dialog.open).toHaveBeenCalledWith(jasmine.any(Function), jasmine.objectContaining({
      data: jasmine.objectContaining({
        title: 'Excluir página?',
        confirmText: 'Excluir página',
      }),
    }));
    expect(fixture.componentInstance.paginas.length).toBe(1);
  });

  it('remove pagina da listagem apos confirmar exclusao', () => {
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as never);

    fixture.componentInstance.excluir(paginas[0]);

    expect(fixture.componentInstance.paginas).toEqual([]);
  });
});
