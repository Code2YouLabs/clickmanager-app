import { of, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { SitePaginaResponse } from '../../models/site-pagina.models';
import { SitePaginaService } from '../../services/site-pagina.service';
import { ListarPaginasComponent } from './listar-paginas.component';

const pagina = (overrides: Partial<SitePaginaResponse> = {}): SitePaginaResponse => ({
  id: 1,
  tipo: 'PERSONALIZADA',
  titulo: 'Quem somos',
  slug: 'quem-somos',
  resumo: 'Resumo',
  ativa: true,
  exibirNoMenu: true,
  ordemMenu: 1,
  exibirNaHome: false,
  ordemHome: null,
  paginaSistema: false,
  ...overrides,
});

describe('ListarPaginasComponent', () => {
  let component: ListarPaginasComponent;
  let service: jasmine.SpyObj<SitePaginaService>;
  let router: jasmine.SpyObj<Router>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let auth: jasmine.SpyObj<AuthService>;
  let requests: Subject<any>[];

  beforeEach(() => {
    requests = [];
    service = jasmine.createSpyObj<SitePaginaService>('SitePaginaService', [
      'listar',
      'alterarStatus',
      'alterarMenu',
      'alterarHome',
      'excluir',
      'reordenarMenu',
      'reordenarHome',
    ]);
    service.listar.and.callFake(() => {
      const request = new Subject<any>();
      requests.push(request);
      return request;
    });
    service.alterarStatus.and.returnValue(of(undefined as any));
    service.alterarMenu.and.returnValue(of(undefined as any));
    service.alterarHome.and.returnValue(of(undefined as any));
    service.excluir.and.returnValue(of(undefined as any));
    service.reordenarMenu.and.returnValue(of(undefined as any));
    service.reordenarHome.and.returnValue(of(undefined as any));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error', 'warning']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.returnValue(true);

    component = new ListarPaginasComponent(service, router, dialog, toastr, auth);
  });

  it('busca páginas no backend com paginação, ordenação e texto global', () => {
    component.ngOnInit();
    expect(service.listar).toHaveBeenCalledWith({ page: 0, size: 10, sort: 'ordemMenu,asc', textoPesquisa: '' });

    requests[0].next({ content: [pagina()], totalElements: 32 });
    expect(component.paginas.length).toBe(1);
    expect(component.totalPaginas).toBe(32);

    component.onPesquisar('contato');
    expect(service.listar).toHaveBeenCalledWith({ page: 0, size: 10, sort: 'ordemMenu,asc', textoPesquisa: 'contato' });
  });

  it('ignora resposta antiga e preserva dados durante refresh', () => {
    component.ngOnInit();
    requests[0].next({ content: [pagina({ id: 1, titulo: 'Atual' })], totalElements: 1 });

    component.onPesquisar('novo');
    requests[0].next({ content: [pagina({ id: 99, titulo: 'Antiga' })], totalElements: 1 });
    expect(component.paginas[0].titulo).toBe('Atual');

    requests[1].next({ content: [pagina({ id: 2, titulo: 'Nova' })], totalElements: 1 });
    expect(component.paginas[0].titulo).toBe('Nova');
  });

  it('não mostra erro como vazio e diferencia 403', () => {
    component.ngOnInit();
    requests[0].error({ status: 500 });
    expect(component.erro).toBe('Não foi possível carregar as páginas do site.');
    expect(component.semPermissao).toBeFalse();

    component.carregarPaginas();
    requests[1].error({ status: 403 });
    expect(component.erro).toBeNull();
    expect(component.semPermissao).toBeTrue();
  });

  it('bloqueia desativação da HOME e exclusão de páginas de sistema', () => {
    const home = pagina({ codigo: 'HOME', tipo: 'SISTEMA', paginaSistema: true });
    component.alterarStatus(home);
    component.excluir(home);

    expect(service.alterarStatus).not.toHaveBeenCalled();
    expect(service.excluir).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalledWith('A página HOME deve permanecer ativa.');
    expect(toastr.warning).toHaveBeenCalledWith('Páginas de sistema não podem ser excluídas.');
  });

  it('reordena somente itens carregados e aptos no menu e home', () => {
    component.paginas = [
      pagina({ id: 1, ordemMenu: 1, exibirNoMenu: true, exibirNaHome: true, ordemHome: 1 }),
      pagina({ id: 2, ordemMenu: 2, exibirNoMenu: true, exibirNaHome: true, ordemHome: 2 }),
      pagina({ id: 3, exibirNoMenu: false, exibirNaHome: false }),
    ];

    component.moverMenu(component.paginas[1], -1);
    component.moverHome(component.paginas[0], 1);

    expect(service.reordenarMenu).toHaveBeenCalledWith({ paginas: [{ id: 2, ordemMenu: 1 }, { id: 1, ordemMenu: 2 }] });
    expect(service.reordenarHome).toHaveBeenCalledWith({ paginas: [{ id: 2, ordemHome: 1 }, { id: 1, ordemHome: 2 }] });
  });
});
