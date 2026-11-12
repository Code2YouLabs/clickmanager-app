import { BehaviorSubject, of, Subject, throwError } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { BreakpointObserver } from '@angular/cdk/layout';
import { PedidoPrazoService } from 'src/app/services/pedido-prazo.service';
import { ToastrService } from 'ngx-toastr';
import { PedidosConfigComponent } from './pedidos-config.component';
describe('Configuração visual de Pedidos',()=>{
 const parametros={prazo:7,unidade:'DIAS' as const,atencaoHoras:24,atrasoCriticoHoras:48};
 it('só permite salvar configuração carregada e valores inteiros nos limites do backend',()=>{
  const api={configuracao:()=>of({parametros}),configurar:jasmine.createSpy().and.returnValue(of({}))};
  const c=new PedidosConfigComponent(api as any,{success:()=>{},error:()=>{}} as any);c.salvar();expect(api.configurar).not.toHaveBeenCalled();
  c.ngOnInit();c.form.controls.prazo.setValue(3651);c.salvar();expect(api.configurar).not.toHaveBeenCalled();
  c.form.controls.unidade.setValue('HORAS');c.form.controls.prazo.setValue(87600);c.salvar();expect(api.configurar).toHaveBeenCalledWith({...parametros,unidade:'HORAS',prazo:87600});
  api.configurar.calls.reset();c.form.controls.atencaoHoras.setValue(1.5);c.salvar();expect(api.configurar).not.toHaveBeenCalled();c.ngOnDestroy();
 });
 it('falha de leitura não apresenta defaults como configuração carregada',()=>{
  const c=new PedidosConfigComponent({configuracao:()=>throwError(()=>new Error('rede'))} as any,{} as any);c.ngOnInit();expect(c.carregada).toBeFalse();expect(c.erro).toBeTruthy();c.ngOnDestroy();
 });
});

// Exercita o formulário real: os inputs numéricos compartilhados emitem texto.
describe('Configuração de Pedidos no padrão compartilhado', () => {
 let api: any;
 let viewport: BehaviorSubject<any>;
 const parametros = {prazo:7,unidade:'DIAS' as const,atencaoHoras:24,atrasoCriticoHoras:48};
 beforeEach(async () => {
  viewport = new BehaviorSubject({matches:false,breakpoints:{}});
  api = jasmine.createSpyObj('PedidoPrazoService',['configuracao','configurar']);
  api.configuracao.and.returnValue(of({parametros}));api.configurar.and.returnValue(of({parametros}));
  await TestBed.configureTestingModule({imports:[PedidosConfigComponent],providers:[provideNoopAnimations(),
   {provide:PedidoPrazoService,useValue:api},{provide:ToastrService,useValue:jasmine.createSpyObj('ToastrService',['success','error'])},
   {provide:BreakpointObserver,useValue:{observe:()=>viewport.asObservable()}}
  ]}).compileComponents();
 });
 it('usa inputs existentes e envia números quando o usuário digita pelo campo real', () => {
  const f=TestBed.createComponent(PedidosConfigComponent);f.detectChanges();
  expect(f.nativeElement.querySelectorAll('app-input-numerico').length).toBe(3);
  expect(f.nativeElement.querySelectorAll('app-input-options').length).toBe(1);
  const input=f.nativeElement.querySelector('app-input-numerico input') as HTMLInputElement;
  expect(input.value).toBe('7');input.value='12';input.dispatchEvent(new Event('input'));f.detectChanges();
  f.componentInstance.salvar();expect(api.configurar).toHaveBeenCalledWith({...parametros,prazo:12});
  f.destroy();
 });
 it('cancelar restaura a base carregada e o limite da unidade, sem salvar', () => {
  const f=TestBed.createComponent(PedidosConfigComponent);f.detectChanges();const c=f.componentInstance;
  c.form.controls.unidade.setValue('HORAS');c.form.controls.prazo.setValue('5000');expect(c.invalido).toBeFalse();
  c.formState.reset();expect(c.form.getRawValue()).toEqual(parametros);expect(c.limite).toBe(3650);
  c.form.controls.prazo.setValue('3651');expect(c.invalido).toBeTrue();expect(api.configurar).not.toHaveBeenCalled();
  f.destroy();
 });
 it('mantém os dados digitados em falha e oferece apenas um rodapé mobile', () => {
  viewport.next({matches:true,breakpoints:{}});
  const f=TestBed.createComponent(PedidosConfigComponent);f.detectChanges();const c=f.componentInstance;
  const envio=new Subject<any>();api.configurar.and.returnValue(envio);
  c.form.controls.atencaoHoras.setValue('2');c.salvar();c.salvar();expect(api.configurar).toHaveBeenCalledTimes(1);
  f.detectChanges();expect(f.nativeElement.querySelectorAll('app-mobile-total-bar').length).toBe(1);
  expect(f.nativeElement.querySelector('mat-card-actions')).toBeNull();
  envio.error({status:500});expect(c.form.controls.atencaoHoras.value).toBe('2');expect(c.salvando).toBeFalse();
  f.destroy();
 });
});
