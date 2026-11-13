import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BreakpointObserver } from '@angular/cdk/layout';
import { AuthService } from 'src/app/services/auth.service';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { ComercialListComponent } from './comercial-list.component';
import { PedidoPrazoRelogio } from 'src/app/shared/pedido-prazo/pedido-prazo-relogio';

describe('Consulta temporal de lista e Kanban', () => {
 let c:ComercialListComponent, params:BehaviorSubject<any>, service:any, requests:Subject<any>[];
 beforeEach(() => {
  requests=[];params=new BehaviorSubject(convertToParamMap({}));
  service={listarPedidosComerciais:jasmine.createSpy().and.callFake(()=>{const s=new Subject();requests.push(s);return s;})};
  TestBed.configureTestingModule({providers:[{provide:AuthService,useValue:{temPermissao:()=>true}}, {provide:BreakpointObserver,useValue:{observe:()=>of({matches:false})}}]});
  c=TestBed.runInInjectionContext(()=>new ComercialListComponent({data:of({tipo:'pedidos'}),queryParamMap:params} as any,
   {navigate:jasmine.createSpy()} as any,service,{} as any,{} as any,{iniciarSeNecessario:()=>{},registrarKanbanSelecionado:()=>{}} as any,document));
  c.ngOnInit();
 });
 afterEach(()=>c.ngOnDestroy());
 it('envia prazo e ordenação ao servidor e reinicia paginação',()=>{
  c.pagina=4;params.next(convertToParamMap({status:'PENDENTE',prazo:'ATRASADO',sort:'previsaoEntrega,desc'}));
  expect(c.pagina).toBe(0);expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0,10,'PENDENTE','ATRASADO','previsaoEntrega,desc');
  expect(c.filters.find(x=>x.key==='prazo')?.options.length).toBe(6);
 });
 it('preserva o escopo do dashboard na lista, paginação e Kanban',()=>{
  params.next(convertToParamMap({somenteAbertos:'true',prazo:'SEM_PREVISAO',sort:'previsaoEntrega,asc'}));
  expect(c.filterState['somenteAbertos']).toBeTrue();
  expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0,10,null,'SEM_PREVISAO','previsaoEntrega,asc',false,true);
  c.alterarVisualizacao('kanban');
  expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0,20,'PENDENTE','SEM_PREVISAO','previsaoEntrega,asc',false,true);
  params.next(convertToParamMap({}));
  expect(c.somenteAbertos).toBeFalse();
 });
 it('descarta respostas de colunas antigas depois de trocar o filtro',()=>{
  c.alterarVisualizacao('kanban');const anteriores=[...requests];
  params.next(convertToParamMap({prazo:'ATRASO_CRITICO'}));
  anteriores.forEach(s=>s.next({content:[{id:999,status:'PENDENTE'}],totalElements:1}));
  expect(c.kanbanColumns.every(x=>!x.items.some((p:any)=>p.id===999))).toBeTrue();
  expect(service.listarPedidosComerciais).toHaveBeenCalledWith(0,20,'PENDENTE','ATRASO_CRITICO',null);
 });
 it('reconsulta após concluir produção no recorte de abertos, mesmo sem filtro temporal',()=>{
  c.somenteAbertos=true;const spy=spyOn<any>(c,'revalidarPrazos');
  (c as any).aplicarStatusRetornado(1,{id:1,status:'PRONTO'},{items:[]});
  expect(spy).toHaveBeenCalled();
 });
 it('mantém nulos por último e desempate estável após movimentação',()=>{
  c.sort={active:'previsaoEntrega',direction:'desc'};
  const itens=[{id:3,prazo:{previsaoEntrega:null}},{id:2,prazo:{previsaoEntrega:'2026-11-20T10:00:00Z'}},{id:1,prazo:{previsaoEntrega:'2026-11-20T10:00:00Z'}}];
  expect((c as any).ordenarPedidosPorData(itens).map((x:any)=>x.id)).toEqual([1,2,3]);
 });
 it('reconsulta página vazia ao atingir fronteira de registro fora do filtro',fakeAsync(()=>{
  const agora=new Date().toISOString();requests[0].next({content:[],totalElements:0,referenciaEm:agora,proximaMudancaEm:new Date(Date.now()+100).toISOString()});
  tick(125);expect(service.listarPedidosComerciais).toHaveBeenCalledTimes(2);
 }));
});

describe('Relógio de atualização do prazo',()=>{
 it('remove timer e listener ao sair',fakeAsync(()=>{
  const atualizar=jasmine.createSpy();const r=new PedidoPrazoRelogio(atualizar);
  r.agendar({referenciaEm:new Date().toISOString(),proximaMudancaEm:new Date(Date.now()+200).toISOString()});
  r.destruir();tick(1000);document.dispatchEvent(new Event('visibilitychange'));expect(atualizar).not.toHaveBeenCalled();
 }));
});
