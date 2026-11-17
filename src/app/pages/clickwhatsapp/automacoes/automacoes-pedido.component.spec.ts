import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { BehaviorSubject, of } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { AutomacoesPedidoComponent, PainelAutomacoes } from './automacoes-pedido.component';

describe('Automações de Pedidos', () => {
  let http: HttpTestingController;
  let usuario: BehaviorSubject<any>;
  let confirmar: jasmine.Spy;
  const base = environment.apiUrl + '/api/clickwhatsapp/automacoes/pedidos';
  const painel: PainelAutomacoes = { podeAtivar: true, variaveis: ['cliente_nome', 'pedido_numero'], recentes: [], itens: [
    { tipo: 'CRIADO', nome: 'Pedido criado', descricao: 'Após confirmação comercial', ativa: false, modelo: 'Olá {cliente_nome}', revisao: 0, previa: 'Olá Cliente demonstrativo' },
  ] };
  beforeEach(() => {
    usuario = new BehaviorSubject({ id: 10, empresa: { id: 1 } });
    confirmar = jasmine.createSpy('confirmar').and.returnValue({ afterClosed: () => of(true) });
    TestBed.configureTestingModule({ imports: [AutomacoesPedidoComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(),
      { provide: AuthService, useValue: { usuario$: usuario } }, { provide: MatDialog, useValue: { open: confirmar } },
      { provide: ToastrService, useValue: { success: jasmine.createSpy() } },
    ] });
    TestBed.overrideComponent(AutomacoesPedidoComponent, {
      add: { providers: [{ provide: MatDialog, useValue: { open: confirmar } }] },
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function criar() { const f = TestBed.createComponent(AutomacoesPedidoComponent); f.detectChanges(); return f; }
  function abrir(f: ReturnType<typeof criar>, dados = painel) {
    f.componentInstance.abrir(); http.expectOne(base).flush(structuredClone(dados)); flushMicrotasks(); f.detectChanges();
  }
  it('não consulta nem ativa automaticamente; permanece configurável desconectada', fakeAsync(() => {
    const f = criar(); http.expectNone(base); expect(f.nativeElement.textContent).toContain('configuração permanece disponível');
    abrir(f); expect(f.componentInstance.painel!.itens[0].ativa).toBeFalse(); expect(f.nativeElement.textContent).toContain('Inativa');
  }));
  it('salva somente após confirmação e mantém revisão do backend', fakeAsync(() => {
    const f = criar(); abrir(f); const c = f.componentInstance; c.painel!.itens[0].ativa = true;
    c.salvar(c.painel!.itens[0]); flushMicrotasks(); const req = http.expectOne(base + '/CRIADO');
    expect(req.request.method).toBe('PUT'); expect(req.request.body).toEqual({ ativa: true, modelo: 'Olá {cliente_nome}', revisao: 0 });
    expect(req.request.body.empresaId).toBeUndefined();
    req.flush({ ...painel, itens: [{ ...painel.itens[0], ativa: true, revisao: 1 }] }); flushMicrotasks();
    expect(c.painel!.itens[0].revisao).toBe(1);
  }));
  it('cancelar confirmação preserva configuração sem requests', fakeAsync(() => {
    confirmar.and.returnValue({ afterClosed: () => of(false) }); const f = criar(); abrir(f);
    f.componentInstance.salvar(f.componentInstance.painel!.itens[0]); flushMicrotasks(); http.expectNone(base + '/CRIADO');
    expect(f.componentInstance.painel?.itens[0].ativa).toBeFalse();
  }));
  it('preview é demonstrativo e erro de variável não vira envio', fakeAsync(() => {
    const f = criar(); abrir(f); const item = f.componentInstance.painel!.itens[0]; item.modelo = '{empresa.segredo}';
    f.componentInstance.previa(item); http.expectOne(base + '/previa').flush({ codigo: 'REQUISICAO_INVALIDA' }, { status: 400, statusText: 'Bad Request' });
    flushMicrotasks(); expect(f.componentInstance.erroPrevia).toContain('variáveis'); expect(item.previa).toBe('Olá Cliente demonstrativo');
  }));
  it('sem autorização para ativar mantém leitura e permite desativar', fakeAsync(() => {
    const f = criar(); abrir(f, { ...painel, podeAtivar: false }); const c = f.componentInstance;
    c.painel!.itens[0].ativa = true; c.salvar(c.painel!.itens[0]); flushMicrotasks(); http.expectNone(base + '/CRIADO');
    expect(confirmar).not.toHaveBeenCalled();
  }));
  it('troca de empresa cancela leitura e apaga configurações anteriores', fakeAsync(() => {
    const f = criar(); f.componentInstance.abrir(); const req = http.expectOne(base);
    usuario.next({ id: 20, empresa: { id: 2 } }); flushMicrotasks(); expect(req.cancelled).toBeTrue();
    expect(f.componentInstance.painel).toBeNull(); expect(f.componentInstance.aberto).toBeFalse();
  }));
  it('conflito não sobrescreve revisão nem repete automaticamente', fakeAsync(() => {
    const f = criar(); abrir(f); const c = f.componentInstance; c.salvar(c.painel!.itens[0]); flushMicrotasks();
    http.expectOne(base + '/CRIADO').flush({ codigo: 'AUTOMACAO_CONFLITO' }, { status: 409, statusText: 'Conflict' }); flushMicrotasks();
    expect(c.erro).toContain('Atualize'); expect(c.painel!.itens[0].revisao).toBe(0);
  }));
  it('distingue enfileiramento de entrega e mostra motivo seguro da ocorrência ignorada', fakeAsync(() => {
    const f = criar(); abrir(f, { ...painel, recentes: [{ ocorrencia: 'e1', pedido: 42, origem: 'PEDIDO', tipo: 'CRIADO', resultado: 'ENFILEIRADA', motivo: null, mensagem: 'm1', conexao: 'c1', fase: 'PENDENTE', confirmacao: 'NAO_CONFIRMADA', criadaEm: '2026-11-16T10:00:00Z' }] });
    expect(f.nativeElement.textContent).toContain('Na fila'); expect(f.nativeElement.textContent).toContain('Sem confirmação');
    expect(f.nativeElement.textContent).toContain('Enfileirar não confirma entrega');
  }));
  it('mantém a lista compacta e salva o template sem alterar a ativação', fakeAsync(() => {
    const f = criar(); abrir(f);
    expect(f.nativeElement.querySelector('textarea')).toBeNull();
    expect(f.nativeElement.textContent).toContain('0 de 1 automações ativas');
    const c = f.componentInstance;
    c.original = c.painel!.itens[0];
    c.rascunho = { ...c.original, modelo: 'Texto revisado' };
    void c.alternarAtivacao();
    flushMicrotasks();
    http.expectNone(base + '/CRIADO');
    void c.salvarTexto();
    flushMicrotasks();
    const request = http.expectOne(base + '/CRIADO');
    expect(request.request.body).toEqual({ ativa: false, modelo: 'Texto revisado', revisao: 0 });
    request.flush({ ...painel, itens: [{ ...painel.itens[0], modelo: 'Texto revisado', revisao: 1 }] });
    flushMicrotasks();
    expect(c.alterado).toBeFalse();
    void c.alternarAtivacao();
    flushMicrotasks();
    const ativacao = http.expectOne(base + '/CRIADO');
    expect(ativacao.request.body).toEqual({ ativa: true, modelo: 'Texto revisado', revisao: 1 });
    ativacao.flush(painel);
    flushMicrotasks();
  }));

  it('pede confirmação antes de sair do painel com texto não salvo', fakeAsync(() => {
    const f = criar(); abrir(f);
    const ref = {
      beforeClosed: () => of(), afterClosed: () => of(),
      keydownEvents: () => of(), backdropClick: () => of(),
      updateSize() { return this; }, updatePosition() { return this; }, close: jasmine.createSpy('close'),
    };
    confirmar.and.returnValue(ref);
    const c = f.componentInstance;
    f.nativeElement.querySelector('button[aria-label="Editar Pedido criado"]').click();
    c.rascunho!.modelo = 'Ainda sem salvar';
    confirmar.and.returnValue({ afterClosed: () => of(false) });
    let podeSair = true;
    void c.podeSair().then(valor => { podeSair = valor; });
    flushMicrotasks();
    expect(podeSair).toBeFalse();
    expect(c.rascunho?.modelo).toBe('Ainda sem salvar');
    confirmar.and.returnValue({ afterClosed: () => of(true) });
    void c.fecharEditor();
    flushMicrotasks();
    expect(ref.close).toHaveBeenCalledTimes(1);
    expect(c.rascunho).toBeNull();
    http.expectNone(base + '/CRIADO');
  }));

});
