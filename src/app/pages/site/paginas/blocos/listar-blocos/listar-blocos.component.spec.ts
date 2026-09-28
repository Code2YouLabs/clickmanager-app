import { of, Subject } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { SitePaginaBlocoResponse } from 'src/app/pages/site/models/site-pagina-bloco.models';
import { SitePaginaBlocoService } from 'src/app/pages/site/services/site-pagina-bloco.service';
import { ListarBlocosComponent } from './listar-blocos.component';

const bloco = (overrides: Partial<SitePaginaBlocoResponse> = {}): SitePaginaBlocoResponse => ({
  id: 1,
  tipo: 'TEXTO',
  titulo: 'Texto',
  ordem: 1,
  ativo: true,
  conteudoJson: null,
  ...overrides,
});

describe('ListarBlocosComponent', () => {
  let component: ListarBlocosComponent;
  let service: jasmine.SpyObj<SitePaginaBlocoService>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let auth: jasmine.SpyObj<AuthService>;
  let requests: Subject<SitePaginaBlocoResponse[]>[];

  beforeEach(() => {
    requests = [];
    service = jasmine.createSpyObj<SitePaginaBlocoService>('SitePaginaBlocoService', [
      'listar',
      'buscarPorId',
      'alterarStatus',
      'excluir',
      'reordenar',
    ]);
    service.listar.and.callFake(() => {
      const request = new Subject<SitePaginaBlocoResponse[]>();
      requests.push(request);
      return request;
    });
    service.buscarPorId.and.returnValue(of(bloco()));
    service.alterarStatus.and.returnValue(of(undefined as any));
    service.excluir.and.returnValue(of(undefined as any));
    service.reordenar.and.returnValue(of(undefined as any));
    dialog = jasmine.createSpyObj<MatDialog>('MatDialog', ['open']);
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);
    toastr = jasmine.createSpyObj<ToastrService>('ToastrService', ['success', 'error']);
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['temPermissao']);
    auth.temPermissao.and.returnValue(true);

    component = new ListarBlocosComponent(service, dialog, toastr, auth);
    component.paginaId = 12;
  });

  it('carrega, ordena e ignora resposta obsoleta', () => {
    component.carregarBlocos();
    component.carregarBlocos();

    requests[0].next([bloco({ id: 99, ordem: 1 })]);
    expect(component.blocos).toEqual([]);

    requests[1].next([bloco({ id: 2, ordem: 2 }), bloco({ id: 1, ordem: 1 })]);
    expect(component.blocos.map((item) => item.id)).toEqual([1, 2]);
  });

  it('diferencia erro comum e 403', () => {
    component.carregarBlocos();
    requests[0].error({ status: 500 });
    expect(component.erro).toBe('Não foi possível carregar os blocos da página.');
    expect(component.semPermissao).toBeFalse();

    component.carregarBlocos();
    requests[1].error({ status: 403 });
    expect(component.erro).toBeNull();
    expect(component.semPermissao).toBeTrue();
  });

  it('reordena usando endpoint de blocos da página', () => {
    component.blocos = [bloco({ id: 1, ordem: 1 }), bloco({ id: 2, ordem: 2 })];

    component.mover(component.blocos[1], -1);

    expect(service.reordenar).toHaveBeenCalledWith(12, { blocos: [{ id: 2, ordem: 1 }, { id: 1, ordem: 2 }] });
  });

  it('altera status, exclui com confirmação e recarrega', () => {
    component.blocos = [bloco()];
    component.alterarStatus(component.blocos[0]);
    component.excluir(component.blocos[0]);

    expect(service.alterarStatus).toHaveBeenCalledWith(12, 1, false);
    expect(service.excluir).toHaveBeenCalledWith(12, 1);
    expect(service.listar.calls.count()).toBe(2);
  });
});
