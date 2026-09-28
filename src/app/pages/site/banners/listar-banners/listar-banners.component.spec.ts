import { of, Subject, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { ListarBannersComponent } from './listar-banners.component';
import { SiteBannerService } from '../../services/site-banner.service';
import { SiteBannerResponse } from '../../models/site-banner.models';

describe('ListarBannersComponent', () => {
  let service: jasmine.SpyObj<SiteBannerService>;
  let router: jasmine.SpyObj<Router>;
  let dialog: jasmine.SpyObj<MatDialog>;
  let toastr: jasmine.SpyObj<ToastrService>;
  let component: ListarBannersComponent;

  const banners: SiteBannerResponse[] = [
    { id: 1, titulo: 'A', ordem: 1, ativo: true, dataInicio: '2026-09-28T00:00:00' },
    { id: 2, titulo: 'B', ordem: 2, ativo: false, dataFim: '2026-09-30T23:59:59' },
  ];

  beforeEach(() => {
    service = jasmine.createSpyObj('SiteBannerService', ['listar', 'alterarStatus', 'excluir', 'reordenar']);
    router = jasmine.createSpyObj('Router', ['navigate']);
    dialog = jasmine.createSpyObj('MatDialog', ['open']);
    toastr = jasmine.createSpyObj('ToastrService', ['success', 'error']);
    component = new ListarBannersComponent(service, router, dialog, toastr);
  });

  it('carrega pagina backend com busca global e sort por ordem asc', () => {
    service.listar.and.returnValue(of({ content: banners, totalElements: 30 }));
    component.termoPesquisa = 'promo';
    component.pagina = 1;
    component.tamanhoPagina = 20;

    component.carregarBanners();

    expect(service.listar).toHaveBeenCalledWith({ page: 1, size: 20, sort: 'ordem,asc', textoPesquisa: 'promo' });
    expect(component.banners).toEqual(banners);
    expect(component.totalBanners).toBe(30);
    expect(component.carregando).toBeFalse();
  });

  it('mantem compatibilidade com resposta em array', () => {
    service.listar.and.returnValue(of(banners));

    component.carregarBanners();

    expect(component.banners).toEqual(banners);
    expect(component.totalBanners).toBe(2);
  });

  it('reinicia pagina na busca sem debounce extra no container', () => {
    service.listar.and.returnValue(of({ content: [], totalElements: 0 }));
    component.pagina = 4;

    component.onPesquisar('fachada');

    expect(component.pagina).toBe(0);
    expect(service.listar).toHaveBeenCalledWith(jasmine.objectContaining({ textoPesquisa: 'fachada' }));
  });

  it('preserva dados durante refresh e registra erro sem exibir vazio falso', () => {
    component.banners = banners;
    service.listar.and.returnValue(throwError(() => ({ userMessage: 'Falha de rede' })));

    component.carregarBanners(true);

    expect(component.banners).toEqual(banners);
    expect(component.refreshing).toBeFalse();
    expect(component.erro).toBe('Falha de rede');
  });

  it('marca forbidden para erro 403', () => {
    service.listar.and.returnValue(throwError(() => ({ status: 403 })));

    component.carregarBanners();

    expect(component.semPermissao).toBeTrue();
    expect(component.erro).toBeNull();
  });

  it('descarta resposta obsoleta quando uma consulta mais nova vence', () => {
    const first = new Subject<any>();
    const second = new Subject<any>();
    service.listar.and.returnValues(first.asObservable(), second.asObservable());

    component.carregarBanners();
    component.onPesquisar('nova');
    second.next({ content: [banners[1]], totalElements: 1 });
    first.next({ content: [banners[0]], totalElements: 1 });

    expect(component.banners).toEqual([banners[1]]);
  });

  it('reordena usando indice da pagina atual e recarrega apos sucesso', () => {
    service.listar.and.returnValue(of({ content: banners, totalElements: 2 }));
    service.reordenar.and.returnValue(of(void 0));
    component.banners = banners;
    component.pagina = 2;
    component.tamanhoPagina = 10;

    component.mover(banners[0], 1);

    expect(service.reordenar).toHaveBeenCalledWith({
      banners: [{ id: 2, ordem: 21 }, { id: 1, ordem: 22 }],
    });
    expect(toastr.success).toHaveBeenCalledWith('Ordem dos banners atualizada.');
    expect(service.listar).toHaveBeenCalled();
  });

  it('altera status e exclui com confirmacao preservando permissoes no template', () => {
    service.listar.and.returnValue(of({ content: banners, totalElements: 2 }));
    service.alterarStatus.and.returnValue(of(banners[0]));
    service.excluir.and.returnValue(of(void 0));
    dialog.open.and.returnValue({ afterClosed: () => of(true) } as any);

    component.alterarStatus(banners[1]);
    component.excluir(banners[0]);

    expect(service.alterarStatus).toHaveBeenCalledWith(2, true);
    expect(service.excluir).toHaveBeenCalledWith(1);
    expect(toastr.success).toHaveBeenCalled();
  });

  it('formata imagem, vigencia e rotas de edicao/criacao', () => {
    component.editar(banners[0]);
    component.navegarCriacao();

    expect(router.navigate).toHaveBeenCalledWith(['/page/site/banners/editar', 1]);
    expect(router.navigate).toHaveBeenCalledWith(['/page/site/banners/novo']);
    expect(component.statusKey(false)).toBe('INATIVO');
    expect(component.vigenciaLabel({ id: 3, ativo: true })).toBe('Sempre visível');
  });
});
