import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver } from '@angular/cdk/layout';
import { of } from 'rxjs';
import { HistoricoUnificadoComponent, PaginaHistorico, RegistroHistorico } from './historico-unificado.component';
import { environment } from 'src/environments/environment';

describe('Histórico unificado', () => {
  const base = environment.apiUrl + '/api/clickwhatsapp/historico';
  const item: RegistroHistorico = { id: 'm:teste', tipoRegistro: 'MENSAGEM', tipo: 'AVULSA', acontecimento: null, pedido: null, nomeCliente: 'Cliente fictício', destinatarioMascarado: '***0123', criadoEm: '2026-11-18T12:00:00Z', situacao: 'PENDENTE', motivoCodigo: null, motivoDescricao: null, etapa: 'MENSAGEM', mensagemId: 'm1', conexaoId: 'c1', processamento: 'PENDENTE', validaAte: '2026-11-18T12:05:00Z' };
  const resposta = (itens = [item]): PaginaHistorico => ({ itens, pagina: 0, tamanho: 20, total: itens.length, temMais: false, referencia: '2026-11-18T12:00:00Z', motivos: { NAO_INFORMADO: 'Motivo não informado' } });
  let f: ComponentFixture<HistoricoUnificadoComponent>, http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [HistoricoUnificadoComponent], providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(), { provide: BreakpointObserver, useValue: { observe: () => of({ matches: false, breakpoints: {} }) } }] });
    f = TestBed.createComponent(HistoricoUnificadoComponent); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => { TestBed.inject(MatDialog).closeAll(); f.destroy(); http.verify(); });
  const req = () => http.expectOne(r => r.url === base);
  function iniciar(itens = [item]) { f.detectChanges(); expect(f.componentInstance.carregando).toBeTrue(); req().flush(resposta(itens)); f.detectChanges(); }
  it('carrega tabela, máscaras, motivo e estado vazio', () => {
    iniciar(); expect(f.nativeElement.textContent).toContain('Cliente fictício'); expect(f.nativeElement.textContent).toContain('Pendente');
    f.componentInstance.carregar(true); req().flush(resposta([])); f.detectChanges(); expect(f.nativeElement.textContent).toContain('Nenhum registro encontrado');
  });
  it('mostra erro HTTP e não consulta sem permissão', () => {
    f.componentInstance.permitido = false; f.detectChanges(); http.expectNone(base);
    f.componentInstance.permitido = true; f.componentInstance.carregar(); req().flush({}, { status: 503, statusText: 'Unavailable' }); f.detectChanges(); expect(f.componentInstance.erro).toBeTruthy();
  });
  it('pesquisa com debounce e cancela resposta anterior', fakeAsync(() => {
    iniciar(); const input = f.nativeElement.querySelector('input'); input.value = 'Ana'; input.dispatchEvent(new Event('input'));
    tick(349); http.expectNone(base); tick(1); const anterior = req(); expect(anterior.request.params.get('pesquisa')).toBe('Ana');
    f.componentInstance.pesquisar('Maria'); expect(anterior.cancelled).toBeTrue(); req().flush(resposta([])); expect(f.componentInstance.pagina).toBe(0);
    f.componentInstance.pesquisar('ab'); http.expectNone(base); expect(f.componentInstance.erroPesquisa).toContain('3');
  }));
  it('combina filtros, preserva ordenação, pagina no servidor e limpa', () => {
    iniciar(); const c = f.componentInstance; c.filtro = { ...c.filtro, tipo: 'AUTOMATICA', situacao: 'NAO_ENVIADA', acontecimento: 'CRIADO', motivo: 'NAO_INFORMADO' };
    c.ordenar({ active: 'tipo', direction: 'asc' }); let r = req(); expect(r.request.params.get('tipo')).toBe('AUTOMATICA'); expect(r.request.params.get('situacao')).toBe('NAO_ENVIADA'); expect(r.request.params.get('direction')).toBe('asc'); r.flush({ ...resposta(), total: 30, temMais: true });
    c.paginar({ pageIndex: 1, pageSize: 20 }); r = req(); expect(r.request.params.get('page')).toBe('1'); expect(r.request.params.has('referencia')).toBeTrue(); r.flush(resposta());
    c.ordenar({ active: 'tipo', direction: 'desc' }); r = req(); expect(r.request.params.get('page')).toBe('0'); expect(r.request.params.get('direction')).toBe('desc'); r.flush(resposta());
    c.limpar(); r = req(); expect(r.request.params.has('tipo')).toBeFalse(); expect(r.request.params.get('sort')).toBe('tipo'); r.flush(resposta());
  });
  it('reutiliza detalhe de mensagem sem perder estado', () => {
    iniciar(); const c = f.componentInstance; spyOn(c.mensagem, 'emit'); c.pesquisa = 'Ana'; c.pagina = 2; c.ver(item);
    expect(c.mensagem.emit).toHaveBeenCalledWith(item); expect(c.pesquisa).toBe('Ana'); expect(c.pagina).toBe(2);
  });
  it('ocorrência sem mensagem abre lateral, mostra causa e não inventa tentativas', fakeAsync(() => {
    iniciar(); const c = f.componentInstance; const o = { ...item, id: 'o:teste', tipoRegistro: 'OCORRENCIA' as const, tipo: 'AUTOMATICA', situacao: 'NAO_ENVIADA', motivoDescricao: 'Motivo não informado', mensagemId: null, acontecimento: 'CRIADO', pedido: '38', processamento: 'IGNORADA' };
    c.ver(o); http.expectOne(base + '/o%3Ateste').flush(o); f.detectChanges(); tick();
    const painel = document.querySelector('mat-dialog-container')!; expect(painel.textContent).toContain('Não enviada'); expect(painel.textContent).toContain('Motivo não informado');
    expect(painel.textContent).toContain('Encerrado sem mensagem'); expect(painel.closest('.mobile-side-panel')).not.toBeNull(); http.expectNone(r => r.url.includes('tentativas'));
  }));
  it('aplica período próprio e rejeita datas invertidas', () => {
    iniciar(); const c = f.componentInstance; c.rascunho = { ...c.filtro, inicio: '2026-11-19T12:00', fim: '2026-11-18T12:00' }; c.aplicar(); http.expectNone(base); expect(c.erroFiltro).toBeTruthy();
    c.rapido(30); c.aplicar(); req().flush(resposta()); expect(c.pagina).toBe(0);
  });
});
