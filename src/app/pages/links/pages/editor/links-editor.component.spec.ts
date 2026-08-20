import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { EmpresaIdentidadePublicaService } from '../../../empresa/empresa-identidade-publica.service';
import { EmpresaFormService } from '../../../empresa/empresa-form.service';
import { PaginaLinksDetalhe } from '../../models/links.models';
import { LinksService } from '../../services/links.service';
import { LinksPreviewDialogComponent } from '../../components/preview-dialog/links-preview-dialog.component';
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

  function setup(path = ':id', pagina = detalhe, abaSelecionada = 0): ComponentFixture<LinksEditorComponent> {
    let paginaAtual = { ...pagina };
    TestBed.configureTestingModule({
      imports: [LinksEditorComponent, NoopAnimationsModule, RouterTestingModule.withRoutes([])],
      providers: [
        { provide: ActivatedRoute, useValue: { snapshot: { routeConfig: { path }, paramMap: { get: () => '7' } } } },
        {
          provide: LinksService,
          useValue: {
            buscarPagina: () => of(paginaAtual),
            editarPagina: (_id: number, payload: Partial<PaginaLinksDetalhe>) => {
              paginaAtual = { ...paginaAtual, ...payload };
              return of(paginaAtual);
            },
            criarPagina: (payload: Partial<PaginaLinksDetalhe>) => {
              paginaAtual = { ...paginaAtual, ...payload };
              return of(paginaAtual);
            },
            alterarPublicacao: (_id: number, publicada: boolean) => {
              paginaAtual = { ...paginaAtual, publicada };
              return of(paginaAtual);
            },
            arquivarPagina: () => of(void 0),
            removerItem: () => of(void 0),
          },
        },
        { provide: EmpresaIdentidadePublicaService, useValue: { buscar: () => of(pagina.identidade) } },
        {
          provide: EmpresaFormService,
          useValue: {
            buscarEmpresa: () => of({
              id: 1,
              nome: 'Empresa',
              telefone: '(31) 99999-9999',
              email: 'contato@empresa.com',
              instagramUrl: '@empresa',
              facebookUrl: '',
              siteUrl: 'www.empresa.com',
              youtubeUrl: '',
              endereco: { logradouro: 'Rua A', numero: '10', bairro: 'Centro', cidade: 'BH', estado: 'MG' },
            }),
          },
        },
        { provide: ToastrService, useValue: jasmine.createSpyObj('ToastrService', ['success', 'warning', 'error', 'info']) },
        { provide: MatDialog, useValue: jasmine.createSpyObj('MatDialog', ['open']) },
        { provide: AuthService, useValue: { usuario$: of({ empresa: { id: 1 } }), temPermissao: () => true } },
      ],
    });
    const fixture = TestBed.createComponent(LinksEditorComponent);
    fixture.componentInstance.abaSelecionada = abaSelecionada;
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('mantem Salvar no footer com Cancelar secundario e fora do header', () => {
    const fixture = setup();
    const footer = fixture.nativeElement.querySelector('.links-editor-footer');
    const cancelar = footer?.querySelector('button');

    expect(footer?.textContent).toContain('Cancelar');
    expect(footer?.textContent).toContain('Salvar');
    expect(cancelar?.hasAttribute('mat-stroked-button')).toBeTrue();
    expect(cancelar?.getAttribute('color')).toBe('primary');
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
    expect(text).not.toContain('Excluir página');
  });

  it('mostra somente Despublicar quando a pagina esta publicada', () => {
    const fixture = setup(':id', { ...detalhe, publicada: true });
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Despublicar');
    expect(text).not.toContain('Publicar');
  });

  it('mostra somente Publicar quando a pagina nao esta publicada', () => {
    const fixture = setup();
    const text = fixture.nativeElement.textContent;

    expect(text).toContain('Publicar');
    expect(text).not.toContain('Despublicar');
  });

  it('mantem abas Links e Compartilhar acessiveis na criacao', () => {
    const fixture = setup('nova');
    const tabs = Array.from(fixture.nativeElement.querySelectorAll('.mat-mdc-tab')) as HTMLElement[];
    const linksTab = tabs.find((tab) => tab.textContent?.includes('Links'));
    const compartilharTab = tabs.find((tab) => tab.textContent?.includes('Compartilhar'));

    expect(linksTab).toBeTruthy();
    expect(compartilharTab).toBeTruthy();
    expect(linksTab?.getAttribute('aria-disabled')).not.toBe('true');
    expect(compartilharTab?.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('salva alteracoes antes de publicar quando formulario foi alterado', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.tituloControl.setValue('Título para publicar');
    component.alterarPublicacao(true);

    expect(component.pagina?.titulo).toBe('Título para publicar');
    expect(component.pagina?.publicada).toBeTrue();
  });

  it('usa botao para abrir preview em dialog em vez de renderizar preview embutido', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    (component as unknown as { dialog: Pick<MatDialog, 'open'> }).dialog = dialog;

    expect(fixture.nativeElement.querySelector('app-links-public-preview')).toBeNull();

    component.visualizarMobile();

    expect(dialog.open).toHaveBeenCalledWith(LinksPreviewDialogComponent, jasmine.objectContaining({
      width: '100vw',
      height: '100dvh',
      panelClass: 'links-preview-dialog-panel',
    }));
  });

  it('renderiza preview inline compacto na aba Aparencia', () => {
    const fixture = setup(':id', detalhe, 2);
    fixture.detectChanges();

    const preview = fixture.nativeElement.querySelector('app-links-public-preview');
    expect(preview).toBeTruthy();
    expect(preview.textContent).toContain('Página salva');
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

  it('sugere links a partir dos dados existentes da empresa', () => {
    const fixture = setup(':id', detalhe, 1);
    const text = fixture.nativeElement.textContent;
    const component = fixture.componentInstance;
    const sugestoes = component.sugestoesEmpresa();

    expect(text).toContain('Sugestões da empresa');
    expect(text).toContain('Crie links rapidamente usando dados já cadastrados na empresa.');
    expect(sugestoes.map((sugestao) => sugestao.tipo)).toEqual(jasmine.arrayContaining(['WHATSAPP', 'TELEFONE', 'EMAIL', 'INSTAGRAM', 'LINK', 'LOCALIZACAO']));
    expect(sugestoes.find((sugestao) => sugestao.tipo === 'WHATSAPP')?.url).toContain('wa.me');
    expect(sugestoes.find((sugestao) => sugestao.tipo === 'INSTAGRAM')?.url).toBe('https://instagram.com/empresa');
    expect(sugestoes.find((sugestao) => sugestao.tipo === 'LINK')?.url).toBe('https://www.empresa.com');
    const urlsLocalizacao = sugestoes.filter((sugestao) => sugestao.tipo === 'LOCALIZACAO').map((sugestao) => sugestao.url);
    expect(urlsLocalizacao.some((url) => url.includes('google.com/maps'))).toBeTrue();
    expect(urlsLocalizacao.some((url) => url.includes('waze.com/ul'))).toBeTrue();
  });

  it('adiciona tooltips nas acoes da tabela de links', () => {
    const fixture = setup(':id', {
      ...detalhe,
      itens: [
        {
          id: 3,
          tipo: 'LINK',
          titulo: 'Site',
          subtitulo: null,
          url: 'https://empresa.com',
          ativo: true,
          ordem: 0,
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 4,
          tipo: 'TELEFONE',
          titulo: 'Telefone',
          subtitulo: null,
          url: 'tel:+5531999999999',
          ativo: false,
          ordem: 1,
          createdAt: '',
          updatedAt: '',
        },
      ],
    }, 1);

    const tooltips = Array.from(fixture.nativeElement.querySelectorAll('[ng-reflect-message]') as NodeListOf<Element>)
      .map((element: Element) => element.getAttribute('ng-reflect-message'));

    expect(tooltips).toEqual(jasmine.arrayContaining(['Editar', 'Desativar', 'Ativar', 'Remover', 'Mover para cima', 'Mover para baixo']));
  });

  it('renderiza painel de compartilhamento com QR inline', () => {
    const fixture = setup(':id', detalhe, 3);

    const sharePanel = fixture.nativeElement.querySelector('app-links-share-panel');
    expect(sharePanel).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('QR Code');
    expect(fixture.nativeElement.textContent).toContain('Baixar QR Code');
  });

  it('remove link sem voltar para a aba Geral', () => {
    const fixture = setup(':id', {
      ...detalhe,
      itens: [{
        id: 3,
        tipo: 'LINK',
        titulo: 'Site',
        subtitulo: null,
        url: 'https://empresa.com',
        ativo: true,
        ordem: 0,
        createdAt: '',
        updatedAt: '',
      }],
    });
    const component = fixture.componentInstance;
    (component as unknown as { dialog: Pick<MatDialog, 'open'> }).dialog = {
      open: () => ({ afterClosed: () => of(true) }) as never,
    };

    component.abaSelecionada = 1;
    component.removerItem(component.itensOrdenados()[0]);

    expect(component.abaSelecionada).toBe(1);
    expect(component.itensOrdenados()).toEqual([]);
  });
});
