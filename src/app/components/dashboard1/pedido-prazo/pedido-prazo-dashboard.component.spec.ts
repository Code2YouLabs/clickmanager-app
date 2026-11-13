import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { provideRouter, Router } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import * as TablerIcons from 'angular-tabler-icons/icons';
import { Subject } from 'rxjs';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { PedidoPrazoDashboardComponent } from './pedido-prazo-dashboard.component';

const dados = {pedidosAbertos:21,dentroDoPrazo:3,proximosDoPrazo:6,atrasados:9,atrasosCriticos:3,semPrevisao:3,prioridades:[],referenciaEm:'2026-11-12T15:00:00Z',proximaMudancaEm:null};
describe('Prazos no dashboard',()=>{
 let fixture:ComponentFixture<PedidoPrazoDashboardComponent>, c:PedidoPrazoDashboardComponent, requests:Subject<any>[], service:any, router:Router;
 beforeEach(()=>{
  requests=[];service={indicadores:jasmine.createSpy().and.callFake(()=>{const r=new Subject(); requests.push(r);return r;})};
  TestBed.configureTestingModule({imports:[PedidoPrazoDashboardComponent,NoopAnimationsModule,TablerIconsModule.pick(TablerIcons)],providers:[provideRouter([]),{provide:PedidoPrazoService,useValue:service}]});
  fixture=TestBed.createComponent(PedidoPrazoDashboardComponent);c=fixture.componentInstance;router=TestBed.inject(Router);spyOn(router,'navigate');fixture.detectChanges();
 });
 afterEach(()=>fixture.destroy());
 it('não mostra zeros durante carga e apresenta críticos como parte dos atrasados',()=>{
  expect(fixture.nativeElement.querySelectorAll('.prazo-metrica').length).toBe(0);
  requests[0].next(dados);requests[0].complete();fixture.detectChanges();
  expect(fixture.nativeElement.querySelectorAll('.prazo-metrica').length).toBe(4);
  expect(fixture.nativeElement.textContent).toContain('3 em atraso crítico');
  const cards=fixture.nativeElement.querySelectorAll('.prazo-metrica');cards[2].click();
  expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos'],{queryParams:{prazo:'ATRASADO',somenteAbertos:true,sort:'previsaoEntrega,asc'}});
  c.abrirFiltro('ATRASO_CRITICO');expect(router.navigate).toHaveBeenCalledWith(['/page/grafica/comercial/pedidos'],{queryParams:{prazo:'ATRASO_CRITICO',somenteAbertos:true,sort:'previsaoEntrega,asc'}});
 });
 it('abre prioridade na rota protegida do Pedido',()=>{
  c.abrirPedido(42);expect(router.navigate).toHaveBeenCalledWith(['/page/comercial/pedidos',42]);
 });
 it('descarta respostas antigas e remove os dados se perder acesso',()=>{
  c.carregar();requests[0].next(dados);expect(c.dados).toBeNull();
  requests[1].next(dados);requests[1].complete();expect(c.dados).toEqual(dados);
  c.carregar();requests[2].error({status:403});fixture.detectChanges();
  expect(c.dados).toBeNull();expect(fixture.nativeElement.querySelectorAll('.prazo-metrica').length).toBe(0);
  expect(fixture.nativeElement.textContent).toContain('Tentar novamente');
 });
 it('atualiza uma lista vazia na fronteira e cancela timer ao sair',fakeAsync(()=>{
  requests[0].next({...dados,proximaMudancaEm:'2026-11-12T15:00:00.100Z'});requests[0].complete();
  tick(125);expect(service.indicadores).toHaveBeenCalledTimes(2);
  requests[1].next({...dados,proximaMudancaEm:'2026-11-12T15:00:00.100Z'});requests[1].complete();
  c.ngOnDestroy();tick(125);expect(service.indicadores).toHaveBeenCalledTimes(2);
 }));
});
