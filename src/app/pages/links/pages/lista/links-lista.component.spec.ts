import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { LinksShareDialogComponent } from '../../components/share-dialog/links-share-dialog.component';
import { PaginaLinksResumo } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { LinksListaComponent } from './links-lista.component';

describe('LinksListaComponent', () => {
  let fixture: ComponentFixture<LinksListaComponent>;
  let dialog: jasmine.SpyObj<MatDialog>;

  const paginas: PaginaLinksResumo[] = [
    {
      id: 1,
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
  ];

  beforeEach(async () => {
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    await TestBed.configureTestingModule({
      imports: [LinksListaComponent, NoopAnimationsModule, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: LinksService, useValue: { listarPaginas: () => of(paginas), alterarPublicacao: () => of({ ...paginas[0], itens: [], identidade: null }), arquivarPagina: () => of(void 0) } },
        { provide: EmpresaIdentidadePublicaService, useValue: { buscar: () => of({ nome: 'Empresa', slug: 'empresa', logoUrl: null }) } },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) },
        { provide: MatDialog, useValue: dialog },
        { provide: ActivatedRoute, useValue: {} },
        { provide: AuthService, useValue: { temPermissao: () => true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LinksListaComponent);
    (fixture.componentInstance as unknown as { dialog: MatDialog }).dialog = dialog;
    fixture.detectChanges();
  });

  it('renderiza a listagem sem titulo duplicado no componente', () => {
    const text = fixture.nativeElement.textContent;
    expect((text.match(/Páginas ClickLink/g) || []).length).toBe(1);
  });

  it('exibe Compartilhar como acao direta e abre o dialog reutilizavel', () => {
    expect(fixture.nativeElement.textContent).toContain('Compartilhar');
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Editar página"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Compartilhar página"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Abrir página"]')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('td.action-link button[aria-label="Mais ações"]')?.getAttribute('ng-reflect-message')).toBe('Mais ações');

    fixture.componentInstance.compartilhar(paginas[0]);

    expect(dialog.open).toHaveBeenCalledWith(LinksShareDialogComponent, jasmine.objectContaining({
      data: jasmine.objectContaining({ url: jasmine.stringMatching('/l/empresa') }),
    }));
  });

  it('mantem acoes de estado no menu conforme publicacao', () => {
    fixture.componentInstance.paginaMenu = paginas[0];
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button[aria-label="Mais ações"]')?.click();
    fixture.detectChanges();

    expect(document.body.textContent).toContain('Despublicar');
    expect(document.body.textContent).toContain('Arquivar');
  });
});
