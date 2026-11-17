import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SILENT_REQUEST } from 'src/app/interceptors/loading.interceptor';
import { environment } from 'src/environments/environment';
import { Configuracao, Detalhe, Direito, Estado, Filtro, ItemHistorico, ItemOcorrencia, Mensagem, OcorrenciaOperacional, OperacaoEnvio, Periodo, Preferencia, Qr, Resumo, Tentativa, Webhook } from './clickwhatsapp.models';

@Injectable({ providedIn: 'root' })
export class ClickWhatsAppService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiUrl + '/api/clickwhatsapp';
  private options() { return { context: new HttpContext().set(SILENT_REQUEST, true) }; }
  private conexao(id: string) { return this.base + '/conexoes/' + encodeURIComponent(id); }
  private periodo(p: Periodo) { return new HttpParams().set('inicio', p.inicio).set('fim', p.fim); }

  configuracao() { return this.http.get<Configuracao>(this.base + '/configuracao', this.options()); }
  direito(habilitado: boolean) {
    return this.http.put<{ mudou: boolean; direito: Direito }>(this.base + '/direito', { habilitado }, this.options());
  }
  criar() {
    return this.http.post<{ id: string; estado: 'NAO_PROVISIONADA' | 'IDENTIFICADA' | 'PROVISIONADA' }>(this.base + '/conexoes', null, this.options());
  }
  estado(id: string) { return this.http.get<Estado>(this.conexao(id) + '/estado', this.options()); }
  provisionar(id: string) { return this.http.post<Estado>(this.conexao(id) + '/provisionar', null, this.options()); }
  reconciliar(id: string) { return this.http.post<Estado>(this.conexao(id) + '/reconciliar', null, this.options()); }
  desconectar(id: string) { return this.http.post<Estado>(this.conexao(id) + '/desconectar', null, this.options()); }
  qr(id: string) { return this.http.post<Qr>(this.conexao(id) + '/qr', null, this.options()); }
  webhook(id: string) { return this.http.get<{ situacao: Webhook }>(this.conexao(id) + '/webhook', this.options()); }
  configurarWebhook(id: string) { return this.http.post<{ situacao: Webhook }>(this.conexao(id) + '/webhook', null, this.options()); }
  preferencia(id: string, ativa: boolean, versao: number) {
    return this.http.put<Preferencia>(this.conexao(id) + '/preferencia', { ativa, versao }, this.options());
  }
  enviar(id: string, operacao: OperacaoEnvio) {
    return this.http.post<Mensagem>(this.conexao(id) + '/mensagens', operacao.corpo, {
      ...this.options(), headers: { 'Idempotency-Key': operacao.chave }, observe: 'response',
    });
  }
  historico(f: Filtro, excluirOcorrencias = false) {
    let params = this.periodo(f).set('pagina', f.pagina).set('tamanho', f.tamanho);
    if (f.fase) params = params.set('fase', f.fase);
    if (excluirOcorrencias) params = params.set('excluirOcorrencias', true);
    return this.http.get<ItemHistorico[]>(this.base + '/mensagens', { ...this.options(), params });
  }
  detalhe(id: string, mensagem: string) {
    return this.http.get<Detalhe>(this.conexao(id) + '/mensagens/' + encodeURIComponent(mensagem), this.options());
  }
  tentativas(id: string, mensagem: string) {
    return this.http.get<Tentativa[]>(this.conexao(id) + '/mensagens/' + encodeURIComponent(mensagem) + '/tentativas', this.options());
  }
  ocorrencias(pagina: number) {
    return this.http.get<ItemOcorrencia[]>(this.base + '/ocorrencias', {
      ...this.options(), params: new HttpParams().set('pagina', pagina),
    });
  }
  ocorrencia(id: string, mensagem: string, investigar = false) {
    const url = this.conexao(id) + '/mensagens/' + encodeURIComponent(mensagem);
    return investigar
      ? this.http.post<OcorrenciaOperacional>(url + '/investigar', null, this.options())
      : this.http.get<OcorrenciaOperacional>(url + '/ocorrencia', this.options());
  }
  resumo(p: Periodo) {
    return this.http.get<Resumo>(this.base + '/resumo', { ...this.options(), params: this.periodo(p).set('fuso', 'America/Sao_Paulo') });
  }
}
