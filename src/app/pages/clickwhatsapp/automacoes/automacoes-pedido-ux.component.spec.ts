import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BehaviorSubject, of, Subject } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from 'src/app/services/auth.service';
import { environment } from 'src/environments/environment';
import { AutomacoesPedidoComponent, PainelAutomacoes } from './automacoes-pedido.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';

describe('UX das automações com painel Material real', () => {
  const base = environment.apiUrl + '/api/clickwhatsapp/automacoes/pedidos';
  const tipos = ['CRIADO', 'EM_PRODUCAO', 'PRONTO', 'ENTREGUE', 'PREVISAO_ALTERADA', 'CANCELADO'];
  const nomes = ['Pedido criado', 'Pedido em produção', 'Pedido pronto', 'Pedido entregue', 'Previsão alterada', 'Pedido cancelado'];
  const dados = (): PainelAutomacoes => ({ podeAtivar: true, variaveis: ['cliente_nome', 'pedido_numero', 'previsao_entrega'], recentes: [],
    itens: tipos.map((tipo, i) => ({ tipo, nome: nomes[i], descricao: 'Pedido transversal, Gráfica legada ou Depósito.', ativa: i === 1,
      modelo: 'Olá {cliente_nome}', previa: 'Olá Cliente demonstrativo', revisao: 3 })) });
  let http: HttpTestingController;
  let dialog: MatDialog;
  let usuario: BehaviorSubject<any>;
  beforeEach(() => {
    usuario = new BehaviorSubject({ id: 10, empresa: { id: 1 } });
    TestBed.configureTestingModule({ imports: [AutomacoesPedidoComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(),
      { provide: AuthService, useValue: { usuario$: usuario } }, { provide: ToastrService, useValue: { success: jasmine.createSpy() } }] });
    http = TestBed.inject(HttpTestingController); dialog = TestBed.inject(MatDialog);
  });
  afterEach(() => { dialog.closeAll(); http.verify(); });
  function iniciar(p = dados()) {
    const f = TestBed.createComponent(AutomacoesPedidoComponent); dialog = f.debugElement.injector.get(MatDialog); f.detectChanges();
    void f.componentInstance.abrir(); http.expectOne(r => r.url === base).flush(p); flushMicrotasks(); f.detectChanges(); return f;
  }
  function editar(f: ReturnType<typeof iniciar>, nome = nomes[0]) {
    f.nativeElement.querySelector(`button[aria-label="Editar ${nome}"]`).click(); f.detectChanges(); tick();
    return document.querySelector('mat-dialog-container')!;
  }
  function confirmar(resultado: boolean | Subject<boolean> = true) {
    const open = dialog.open.bind(dialog);
    spyOn(dialog, 'open').and.callFake(((componente: any, config: any) => componente === ConfirmDialogComponent
      ? { afterClosed: () => typeof resultado === 'boolean' ? of(resultado) : resultado } : open(componente, config)) as any);
  }
  function digitar(f: ReturnType<typeof iniciar>, texto: string) {
    const campo = document.querySelector('textarea')!;
    campo.value = texto; campo.dispatchEvent(new Event('input')); f.detectChanges(); return campo;
  }
  it('mostra seis eventos, contador confirmado, ícone acessível e vazio compacto', fakeAsync(() => {
    const f = iniciar();
    expect(f.nativeElement.querySelectorAll('.automacao').length).toBe(6);
    expect(f.nativeElement.textContent).toContain('1 de 6 automações ativas');
    expect(f.nativeElement.textContent).not.toContain('Configuração por acontecimento');
    expect(f.nativeElement.querySelector('.registros')).toBeNull();
    expect(f.nativeElement.textContent).not.toContain('Enfileirar não confirma');
    const atualizar = f.nativeElement.querySelector('button[aria-label="Atualizar automações"]');
    atualizar.click(); f.detectChanges(); atualizar.click();
    const req = http.expectOne(r => r.url === base); expect(atualizar.disabled).toBeTrue();
    req.flush({}, { status: 503, statusText: 'Unavailable' }); flushMicrotasks(); f.detectChanges();
    expect(f.componentInstance.painel!.itens.length).toBe(6);
  }));
  it('abre painel compartilhado com descrição amigável e Salvar inicialmente desabilitado', fakeAsync(() => {
    const f = iniciar(); const painel = editar(f);
    expect(painel.textContent).toContain('Avisa o cliente quando um novo pedido é registrado.');
    expect(painel.textContent).not.toContain('Gráfica legada');
    expect(painel.className).toContain('mat-mdc-dialog-container');
    expect(Array.from(painel.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Salvar')!.disabled).toBeTrue();
    expect(painel.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false');
  }));
  it('switch só muda após confirmação da API, bloqueia duplicatas e atualiza contador', fakeAsync(() => {
    const f = iniciar(); editar(f); const resposta = new Subject<boolean>(); confirmar(resposta);
    const controle = document.querySelector<HTMLButtonElement>('[role="switch"]')!;
    controle.click(); f.detectChanges(); controle.click();
    expect(controle.getAttribute('aria-checked')).toBe('false'); http.expectNone(base + '/CRIADO');
    resposta.next(true); resposta.complete(); flushMicrotasks();
    const req = http.expectOne(base + '/CRIADO');
    expect(req.request.body).toEqual({ ativa: true, modelo: 'Olá {cliente_nome}', revisao: 3 });
    expect(f.componentInstance.ativas).toBe(1);
    const p = dados(); p.itens[0].ativa = true; p.itens[0].revisao = 4; req.flush(p); flushMicrotasks(); f.detectChanges();
    expect(controle.getAttribute('aria-checked')).toBe('true'); expect(f.componentInstance.ativas).toBe(2);
  }));
  it('erro ao ativar preserva estado, texto, revisão e contador', fakeAsync(() => {
    const f = iniciar(); editar(f); confirmar();
    document.querySelector<HTMLButtonElement>('[role="switch"]')!.click(); flushMicrotasks();
    http.expectOne(base + '/CRIADO').flush({}, { status: 409, statusText: 'Conflict' }); flushMicrotasks(); f.detectChanges();
    expect(document.querySelector('[role="switch"]')?.getAttribute('aria-checked')).toBe('false');
    expect(f.componentInstance.original?.revisao).toBe(3); expect(f.componentInstance.ativas).toBe(1);
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain('Atualize');
  }));
  it('permissão restrita impede ativação mas permite desativação confirmada', fakeAsync(() => {
    const p = dados(); p.podeAtivar = false; const f = iniciar(p); editar(f, nomes[1]); confirmar();
    document.querySelector<HTMLButtonElement>('[role="switch"]')!.click(); flushMicrotasks();
    const req = http.expectOne(base + '/EM_PRODUCAO'); expect(req.request.body.ativa).toBeFalse(); req.flush(p); flushMicrotasks();
    void f.componentInstance.fecharEditor(); flushMicrotasks(); tick(); editar(f);
    expect(document.querySelector<HTMLButtonElement>('[role="switch"]')!.disabled).toBeTrue();
  }));
  [0, 3, 6].forEach(pos => it(`insere variável na posição ${pos}, restaura foco e cursor`, fakeAsync(() => {
    const f = iniciar(); editar(f); const campo = digitar(f, 'abcdef'); campo.setSelectionRange(pos, pos);
    document.querySelector<HTMLButtonElement>('button[aria-label="Inserir Nome do cliente"]')!.click(); f.detectChanges();
    expect(campo.value).toBe('abcdef'.slice(0, pos) + '{cliente_nome}' + 'abcdef'.slice(pos));
    expect(campo.selectionStart).toBe(pos + 14); expect(campo.selectionEnd).toBe(pos + 14); expect(document.activeElement).toBe(campo);
    expect(f.componentInstance.alterado).toBeTrue();
    f.destroy(); tick(500);
  })));
  it('substitui seleção, atualiza contador e bloqueia ativação com texto pendente', fakeAsync(() => {
    const f = iniciar(); editar(f); const campo = digitar(f, 'abcXYZdef'); campo.setSelectionRange(3, 6);
    f.componentInstance.inserirVariavel('pedido_numero', campo); f.detectChanges();
    expect(campo.value).toBe('abc{pedido_numero}def'); expect(campo.selectionStart).toBe(18);
    expect(document.querySelector('mat-hint')?.textContent).toContain('21 / 2000');
    expect(document.querySelector<HTMLButtonElement>('[role="switch"]')!.disabled).toBeTrue();
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain('Salve ou descarte');
    f.destroy(); tick(500);
  }));
  it('não insere variável não permitida nem ultrapassa 2000; seleção pode liberar espaço', fakeAsync(() => {
    const f = iniciar(); editar(f); const c = f.componentInstance; const campo = digitar(f, 'x'.repeat(2000)); campo.setSelectionRange(2000, 2000);
    c.inserirVariavel('cliente_nome', campo); expect(campo.value.length).toBe(2000); expect(c.avisoVariavel).toContain('limite');
    c.inserirVariavel('segredo', campo); expect(c.avisoVariavel).toContain('não está disponível');
    campo.setSelectionRange(0, 14); c.inserirVariavel('cliente_nome', campo); expect(campo.value.length).toBe(2000);
    f.destroy(); tick(500);
  }));
  it('modelo inválido desabilita Salvar, não gera prévia e não perde texto', fakeAsync(() => {
    const f = iniciar(); editar(f);
    for (const texto of ['', ' ', '{segredo}', '{cliente_nome', 'x'.repeat(2001)]) {
      digitar(f, texto); tick(500); expect(f.componentInstance.modeloValido).toBeFalse();
      void f.componentInstance.salvarTexto(); http.expectNone(base + '/CRIADO'); http.expectNone(base + '/previa');
    }
    expect(f.componentInstance.rascunho?.modelo.length).toBe(2001);
  }));
  it('debounce cancela requisição anterior e ignora resultado obsoleto, sem bloquear edição', fakeAsync(() => {
    const f = iniciar(); editar(f); digitar(f, 'Primeira'); tick(499); http.expectNone(base + '/previa');
    tick(1); const primeira = http.expectOne(base + '/previa');
    expect(f.componentInstance.ocupado).toBeFalse(); expect(document.querySelector('textarea')!.readOnly).toBeFalse();
    digitar(f, 'Segunda\nlinha'); expect(primeira.cancelled).toBeTrue(); tick(500);
    const segunda = http.expectOne(base + '/previa'); expect(segunda.request.body).toEqual({ modelo: 'Segunda\nlinha' });
    segunda.flush({ texto: 'Segunda\nlinha' }); flushMicrotasks(); f.detectChanges();
    expect(document.querySelector('.bolha')?.textContent).toBe('Segunda\nlinha');
    expect(f.componentInstance.estadoPrevia).toBe('Prévia atualizada'); expect(f.componentInstance.original?.modelo).toBe('Olá {cliente_nome}');
    http.expectNone(base + '/CRIADO');
  }));
  it('falha de prévia preserva rascunho e prévia anterior; permite tentar novamente', fakeAsync(() => {
    const f = iniciar(); editar(f); digitar(f, 'Novo texto'); tick(500);
    http.expectOne(base + '/previa').flush({}, { status: 503, statusText: 'Unavailable' }); flushMicrotasks(); f.detectChanges();
    expect(f.componentInstance.rascunho?.modelo).toBe('Novo texto'); expect(document.querySelector('.bolha')?.textContent).toBe('Olá Cliente demonstrativo');
    expect(document.querySelector('mat-dialog-container')?.textContent).toContain('A prévia anterior foi mantida');
    Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Tentar novamente')!.click();
    http.expectOne(base + '/previa').flush({ texto: 'Novo texto' }); flushMicrotasks(); expect(f.componentInstance.erroPrevia).toBe('');
  }));
  it('salva texto somente após confirmação sem ativar e preserva revisão concorrente', fakeAsync(() => {
    const f = iniciar(); editar(f); confirmar(); digitar(f, 'Novo {pedido_numero}');
    void f.componentInstance.salvarTexto(); flushMicrotasks(); const req = http.expectOne(base + '/CRIADO');
    expect(req.request.body).toEqual({ ativa: false, modelo: 'Novo {pedido_numero}', revisao: 3 });
    const p = dados(); p.itens[0].modelo = req.request.body.modelo; p.itens[0].revisao++; req.flush(p); flushMicrotasks(); tick(500);
    http.expectNone(base + '/previa'); expect(f.componentInstance.alterado).toBeFalse(); expect(f.componentInstance.ativas).toBe(1);
  }));
  it('falha de salvamento conserva o texto editado sem PUT duplicado nem ativação', fakeAsync(() => {
    const f = iniciar(); editar(f); confirmar(); digitar(f, 'Ainda não salvo');
    void f.componentInstance.salvarTexto(); flushMicrotasks();
    void f.componentInstance.salvarTexto(); flushMicrotasks();
    http.expectOne(base + '/CRIADO').flush({}, { status: 409, statusText: 'Conflict' }); flushMicrotasks();
    expect(f.componentInstance.rascunho?.modelo).toBe('Ainda não salvo');
    expect(f.componentInstance.original?.modelo).toBe('Olá {cliente_nome}');
    expect(f.componentInstance.alterado).toBeTrue(); expect(f.componentInstance.ativas).toBe(1);
    tick(500); http.expectNone(base + '/previa');
  }));
  it('cancelamento, Escape e backdrop passam pela confirmação de descarte', fakeAsync(() => {
    const f = iniciar(); editar(f); confirmar(false); digitar(f, 'Pendente');
    const cancelar = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Cancelar')!;
    cancelar.click(); flushMicrotasks(); expect(f.componentInstance.rascunho?.modelo).toBe('Pendente');
    document.querySelector('mat-dialog-container')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); flushMicrotasks();
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')!.click(); flushMicrotasks();
    expect(dialog.open).toHaveBeenCalledTimes(3); expect(f.componentInstance.rascunho?.modelo).toBe('Pendente');
    f.destroy(); tick(500);
  }));
  it('troca de empresa cancela prévia e limpa o editor sem vazar resposta', fakeAsync(() => {
    const f = iniciar(); editar(f); digitar(f, 'Empresa anterior'); tick(500); const req = http.expectOne(base + '/previa');
    usuario.next({ id: 20, empresa: { id: 2 } }); flushMicrotasks(); tick();
    expect(req.cancelled).toBeTrue(); expect(f.componentInstance.rascunho).toBeNull(); expect(f.componentInstance.painel).toBeNull();
  }));
});
