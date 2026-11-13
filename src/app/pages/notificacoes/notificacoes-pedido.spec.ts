import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AppNotificacoesComponent } from './notificacoes.component';
import { NotificacaoService } from './services/notificacao.service';
import { AuthService } from 'src/app/services/auth.service';
import { PagesRoutes } from '../pages.routes';
import { featureModuleGuard } from 'src/app/guards/feature-module.guard';
import { permissionGuard } from 'src/app/guards/permission.guard';

describe('Alertas de Pedido na central existente', () => {
  let service: any;
  beforeEach(async () => {
    service = jasmine.createSpyObj('NotificacaoService', ['buscarPorId$', 'listar$', 'marcarComoLida$']);
    service.listar$.and.returnValue(of({itens:[], naoLidas:0}));
    service.marcarComoLida$.and.returnValue(of(undefined));
    await TestBed.configureTestingModule({imports:[AppNotificacoesComponent,TablerIconsModule.pick(TablerIcons)], providers:[
      provideRouter([]), provideNoopAnimations(), {provide:NotificacaoService,useValue:service},
      {provide:AuthService,useValue:{usuario$:of({}),temAlgumaPermissao:()=>false}},
      {provide:ToastrService,useValue:jasmine.createSpyObj('ToastrService',['error','success'])}
    ]}).compileComponents();
  });
  function criar() { const fixture=TestBed.createComponent(AppNotificacoesComponent);fixture.detectChanges();return fixture; }
  const item:any={id:7,titulo:'Pedido P-7 · Atraso crítico',nivel:'CRITICO',link:'/page/comercial/pedidos/7',lida:true};
  it('revalida abertura no servidor e usa apenas o destino atualizado',()=>{
    const fixture=criar(), c=fixture.componentInstance, resposta=new Subject<any>();
    const navegar=spyOn(TestBed.inject(Router),'navigateByUrl').and.resolveTo(true);
    c.selecionada.set(item);service.buscarPorId$.and.returnValue(resposta);
    c.abrirLink(item.link);expect(navegar).not.toHaveBeenCalled();
    resposta.next({...item,link:'/page/comercial/pedidos/8'});
    expect(service.buscarPorId$).toHaveBeenCalledWith(7);expect(navegar).toHaveBeenCalledOnceWith('/page/comercial/pedidos/8');fixture.destroy();
  });
  it('mostra aviso invalidado no histórico, sem ação ou leitura nova',()=>{
    const fixture=criar(),c=fixture.componentInstance;
    service.buscarPorId$.and.returnValue(of({...item,invalidadaEm:'2026-11-12T15:00:00Z',link:null,lida:false}));
    c.notificacoesFiltradas.set([{...item,invalidadaEm:'2026-11-12T15:00:00Z',link:null}]);
    c.selecionarNotificacao(item,false);fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.notify-line .notify-time').textContent).toContain('Encerrado');
    expect(fixture.nativeElement.textContent).toContain('Aviso encerrado');
    expect(service.marcarComoLida$).not.toHaveBeenCalled();
    c.abrirLink(item.link);expect(service.buscarPorId$.calls.count()).toBe(1);fixture.destroy();
  });
  it('revogação impede navegação e limpa conteúdo e contador em cache',()=>{
    const fixture=criar(),c=fixture.componentInstance;
    const navegar=spyOn(TestBed.inject(Router),'navigateByUrl').and.resolveTo(true);
    c.selecionada.set(item);c.naoLidas=1;service.buscarPorId$.and.returnValue(throwError(()=>({status:404})));
    c.abrirLink(item.link);expect(navegar).not.toHaveBeenCalled();expect(c.selecionada()).toBeNull();expect(c.naoLidas).toBe(0);fixture.destroy();
  });
  it('destino canônico exige PEDIDOS_VER e capability PEDIDOS, sem GRAFICA',()=>{
    const route=PagesRoutes.find(r=>r.path==='comercial/pedidos/:id')!;
    expect(route).toBeTruthy();expect(route.data?.['featureKey']).toBe('PEDIDOS');
    expect(route.data?.['requiredPermission']).toEqual(['PEDIDOS_VER']);
    expect(route.canActivate).toEqual([featureModuleGuard,permissionGuard]);
  });
});
