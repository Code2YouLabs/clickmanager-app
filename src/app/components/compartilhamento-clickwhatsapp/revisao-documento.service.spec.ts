import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { provideRouter } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { RevisaoDocumentoService } from './revisao-documento.service';

describe('Revisão nos caminhos legados de Orçamento',()=>{
  const endpoint='/api/orcamentos/1/clickwhatsapp';
  let http:HttpTestingController;
  let service:RevisaoDocumentoService;
  let dialog:jasmine.SpyObj<MatDialog>;
  let usuario$:BehaviorSubject<any>;
  beforeEach(()=>{
    dialog=jasmine.createSpyObj('dialog',['open']);
    usuario$=new BehaviorSubject({id:1,empresa:{id:1}});
    TestBed.configureTestingModule({providers:[provideHttpClient(),provideHttpClientTesting(),provideRouter([]),
      {provide:MatDialog,useValue:dialog},{provide:AuthService,useValue:{usuario$}}]});
    http=TestBed.inject(HttpTestingController);service=TestBed.inject(RevisaoDocumentoService);
  });
  afterEach(()=>http.verify());
  it('desativado executa o compartilhamento anterior sem nova revisão',()=>{
    const legado=jasmine.createSpy();
    service.abrir(endpoint,'15555550123','Mensagem',legado);
    http.expectOne(environment.apiUrl+endpoint).flush({habilitado:false});
    expect(legado).toHaveBeenCalledTimes(1);
    expect(dialog.open).not.toHaveBeenCalled();
  });
  it('projeção desativada carregada antes do clique preserva abertura síncrona',()=>{
    const legado=jasmine.createSpy();
    service.preparar(endpoint);
    http.expectOne(environment.apiUrl+endpoint).flush({habilitado:false});
    service.abrir(endpoint,'15555550123','Mensagem',legado);
    expect(legado).toHaveBeenCalledTimes(1);
    http.expectNone(environment.apiUrl+endpoint);
  });
  it('ativado abre revisão e não executa o legado automaticamente',()=>{
    const legado=jasmine.createSpy();
    service.abrir(endpoint,'15555550123','Mensagem',legado);
    http.expectOne(environment.apiUrl+endpoint).flush({habilitado:true});
    expect(dialog.open).toHaveBeenCalled();
    expect(legado).not.toHaveBeenCalled();
  });
  it('falha de consulta continua em revisão e troca de empresa cancela consulta',()=>{
    const legado=jasmine.createSpy();
    service.abrir(endpoint,'15555550123','Mensagem',legado);
    http.expectOne(environment.apiUrl+endpoint).flush({}, {status:503,statusText:'Unavailable'});
    expect(dialog.open).toHaveBeenCalledTimes(1);
    expect(legado).not.toHaveBeenCalled();
    service.abrir(endpoint,'15555550123','Mensagem',legado);
    const consulta=http.expectOne(environment.apiUrl+endpoint);
    usuario$.next({id:1,empresa:{id:2}});
    expect(consulta.cancelled).toBeTrue();
    expect(dialog.open).toHaveBeenCalledTimes(1);
  });
});
