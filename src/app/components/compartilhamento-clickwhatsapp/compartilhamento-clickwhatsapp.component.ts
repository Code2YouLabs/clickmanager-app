import { CommonModule } from '@angular/common';
import { HttpClient, HttpContext, HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { firstValueFrom, Subject, takeUntil, timeout } from 'rxjs';
import { MobileTotalBarComponent } from '../mobile-total-bar/mobile-total-bar.component';
import { ConfirmDialogComponent } from '../dialog/confirm-dialog/confirm-dialog.component';
import { ClickWhatsAppEnvioStore, EnvioDocumento, contextoEnvio } from 'src/app/pages/clickwhatsapp/clickwhatsapp-envio.store';
import { CONFIRMACOES, falha, FASES, novaOperacao } from 'src/app/pages/clickwhatsapp/clickwhatsapp.models';
import { AuthService } from 'src/app/services/auth.service';
import { SILENT_REQUEST } from 'src/app/interceptors/loading.interceptor';
import { environment } from 'src/environments/environment';

export interface CanalDocumento {
  habilitado: boolean;
  disponivel: boolean;
  motivo: string | null;
  conexao: string | null;
  limiteBytes: number;
  podeConfigurar: boolean;
  podeConsultarHistorico: boolean;
}

@Component({
  selector: 'app-compartilhamento-clickwhatsapp',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatButtonModule, MatIconModule, MatProgressBarModule, MobileTotalBarComponent],
  templateUrl: './compartilhamento-clickwhatsapp.component.html',
  styleUrl: './compartilhamento-clickwhatsapp.component.scss',
})
export class CompartilhamentoClickWhatsAppComponent implements OnChanges {
  @Input({ required: true }) endpoint = '';
  @Input({ required: true }) mensagem!: FormControl<string>;
  @Input() telefone = '';
  @Input() mobile = false;
  @Output() bloquearEditor = new EventEmitter<boolean>();
  @Output() canalChange = new EventEmitter<CanalDocumento>();
  @Output() copiar = new EventEmitter<void>();
  @Output() manual = new EventEmitter<{ numero: string; texto: string } | undefined>();
  private readonly http = inject(HttpClient);
  private readonly store = inject(ClickWhatsAppEnvioStore);
  private readonly dialog = inject(MatDialog);
  private readonly destroy = inject(DestroyRef);
  private readonly troca = new Subject<void>();
  private geracao = 0;
  private contextoInicial: string | null | undefined;
  contextoAlterado = false;
  manualPermitido = true;
  disponibilidade: CanalDocumento | null = null;
  carregando = false;
  enviando = false;
  erro = '';
  numero = '';

  constructor() {
    inject(AuthService).usuario$.pipe(takeUntilDestroyed()).subscribe(u => {
      const contexto = contextoEnvio(u);
      if (this.contextoInicial === undefined || this.contextoInicial === null) this.contextoInicial = contexto;
      else if (contexto !== this.contextoInicial) {
        this.contextoAlterado = true;
        this.cancelar();
        this.notificarBloqueio(true);
        this.disponibilidade = null;
        this.erro = 'Reabra o documento para carregar os dados da empresa atual.';
      }
    });
    this.destroy.onDestroy(() => this.cancelar());
  }

  ngOnChanges() {
    this.cancelar();
    this.numero = this.telefone;
    this.disponibilidade = null;
    if (this.envio) {
      this.numero = this.envio.operacao.corpo.numero;
      this.mensagem.setValue(this.envio.operacao.corpo.texto);
      this.notificarBloqueio(true);
    } else this.notificarBloqueio(false);
    if (this.endpoint && !this.contextoAlterado) void this.consultar();
  }

  private notificarBloqueio(bloqueado: boolean) {
    const geracao = this.geracao;
    queueMicrotask(() => { if (geracao === this.geracao) this.bloquearEditor.emit(bloqueado); });
  }

  private cancelar() { this.geracao++; this.troca.next(); this.carregando = this.enviando = false; }
  get identidadePronta() { return this.contextoInicial != null; }
  get envio(): EnvioDocumento | undefined { return this.store.documentos.get(this.endpoint); }
  get bloqueado() { return !!this.envio || this.enviando || this.contextoAlterado; }
  get integrado() { return !!this.disponibilidade?.disponivel; }
  get aviso() {
    if (this.disponibilidade?.habilitado === false) return '';
    const motivos: Record<string, string> = {
      ENVIOS_PAUSADOS: 'Os envios pelo ClickWhatsApp estão pausados.',
      RESULTADO_INCERTO: 'A conexão está em quarentena por um resultado incerto.',
      CONEXAO_NAO_ABERTA: 'O WhatsApp da empresa está desconectado ou precisa ter o estado atualizado.',
      SERVICO_MENSAGEM_INDISPONIVEL: 'O serviço de mensagens ainda não está configurado para receber solicitações.',
      SEM_CONEXAO: 'A empresa ainda não tem uma conexão configurada.',
      PERMISSAO_NEGADA: 'Você não tem permissão para enviar pelo ClickWhatsApp.',
      APLICACAO_BLOQUEADA: 'O ClickWhatsApp está indisponível neste ambiente.',
    };
    return this.disponibilidade ? motivos[this.disponibilidade.motivo ?? ''] ?? '' : 'Não foi possível verificar a disponibilidade do ClickWhatsApp.';
  }
  get situacao() {
    const m = this.envio?.resultado;
    return m ? FASES[m.fase] + ' · ' + CONFIRMACOES[m.confirmacao] : '';
  }
  private opcoes() { return { context: new HttpContext().set(SILENT_REQUEST, true) }; }
  private ler<T>(request: import('rxjs').Observable<T>) {
    return firstValueFrom(request.pipe(timeout(20000), takeUntil(this.troca)));
  }

  async consultar() {
    if (this.carregando || this.contextoAlterado) return;
    const geracao = this.geracao;
    this.carregando = true;
    this.erro = '';
    try {
      const d = await this.ler(this.http.get<CanalDocumento>(environment.apiUrl + this.endpoint, this.opcoes()));
      if (geracao === this.geracao) {
        this.disponibilidade = d;
        this.manualPermitido = true;
        this.canalChange.emit(d);
      }
    } catch (e) {
      if (geracao === this.geracao) {
        this.erro = falha(e).mensagem;
        this.manualPermitido = ![401,402,403].includes(falha(e).status);
      }
    } finally {
      if (geracao === this.geracao) this.carregando = false;
    }
  }

  async enviar() {
    if (!this.identidadePronta || !this.integrado || this.enviando || this.contextoAlterado || this.envio?.resultado) return;
    const d = this.disponibilidade!;
    const existente = this.envio;
    if (existente && (!existente.repetivel || Date.parse(existente.operacao.corpo.expiraEm) <= Date.now())) {
      this.erro = 'Esta solicitação precisa ser acompanhada antes de preparar outro envio.';
      return;
    }
    if (!existente) {
      if (!/^[+]?[1-9][0-9]{7,14}$/.test(this.numero) || !this.mensagem.value.trim()
          || new TextEncoder().encode(this.mensagem.value).length > d.limiteBytes) {
        this.erro = 'Informe um número internacional válido e uma mensagem de até ' + d.limiteBytes + ' bytes. Você pode editar ou escolher o compartilhamento manual.';
        return;
      }
      this.store.documentos.set(this.endpoint, { conexao: d.conexao!, operacao: novaOperacao(this.numero, this.mensagem.value),
        repetivel: true, mensagem: 'A confirmação do registro ainda não foi recebida.' });
    }
    const envio = this.envio!;
    this.notificarBloqueio(true);
    const geracao = this.geracao;
    this.enviando = true;
    this.erro = '';
    try {
      const resposta = await this.ler(this.http.post<import('src/app/pages/clickwhatsapp/clickwhatsapp.models').Mensagem>(
        environment.apiUrl + this.endpoint, { ...envio.operacao.corpo, conexaoEsperada: envio.conexao },
        { ...this.opcoes(), headers: { 'Idempotency-Key': envio.operacao.chave }, observe: 'response' }));
      if (geracao !== this.geracao) return;
      if (resposta.status === 202 && resposta.body?.id) envio.resultado = resposta.body;
      else envio.mensagem = 'A confirmação do registro não foi recebida. Recupere a solicitação antes de outra ação.';
    } catch (e) {
      if (geracao !== this.geracao) return;
      const status = (e as HttpErrorResponse).status;
      this.erro = falha(e).mensagem;
      const rejeitada = [400, 401, 402, 403, 404].includes(status)
        || (status === 503 && ['CHAVE_MENSAGEM_INVALIDA', 'SAIDA_CAPACIDADE'].includes(falha(e).codigo));
      if (!existente && rejeitada) {
        this.store.documentos.delete(this.endpoint);
        this.notificarBloqueio(false);
      }
      else {
        envio.mensagem = 'A solicitação anterior pode ter sido registrada. Recupere a mesma intenção.';
        envio.repetivel = status !== 409;
      }
    } finally {
      if (geracao === this.geracao) this.enviando = false;
    }
  }

  async acompanhar() {
    const envio = this.envio;
    if (!envio || this.enviando || this.contextoAlterado) return;
    const geracao = this.geracao;
    this.enviando = true;
    this.erro = '';
    try {
      const caminho = envio.resultado ? '/' + encodeURIComponent(envio.resultado.id)
        : '/solicitacoes/' + encodeURIComponent(envio.operacao.chave);
      const resultado = await this.ler(this.http.get<import('src/app/pages/clickwhatsapp/clickwhatsapp.models').Mensagem>(
        environment.apiUrl + this.endpoint + caminho, this.opcoes()));
      if (geracao === this.geracao) envio.resultado = resultado;
    } catch (e) {
      if (geracao === this.geracao) this.erro = falha(e).status === 404
        ? 'O registro ainda não foi localizado. Preserve a solicitação para recuperar ou repetir com a mesma chave.'
        : falha(e).mensagem;
    } finally {
      if (geracao === this.geracao) this.enviando = false;
    }
  }

  private async confirmarDuplicidade() {
    const ref = this.dialog.open(ConfirmDialogComponent, { data: {
      title: 'Possível duplicidade', message: 'A solicitação anterior pode ter sido enviada. Continuar pode gerar uma mensagem duplicada.',
      confirmText: 'Continuar mesmo assim', type: 'destructive',
    }, maxWidth: 'calc(100vw - 24px)' });
    return await firstValueFrom(ref.afterClosed());
  }

  async abrirManual() {
    if (!this.identidadePronta || this.enviando || this.carregando || this.contextoAlterado || !this.manualPermitido) return;
    if (this.disponibilidade?.habilitado !== false && !/^[+]?[1-9][0-9]{7,14}$/.test(this.numero)) {
      this.erro = 'Informe um número internacional válido para abrir o WhatsApp.';
      return;
    }
    const geracao = this.geracao;
    if (this.envio && !(await this.confirmarDuplicidade())) return;
    if (geracao !== this.geracao) return;
    if (this.disponibilidade?.habilitado === false && !this.envio) this.manual.emit(undefined);
    else this.manual.emit({ numero: this.numero.replace(/^[+]/, ''), texto: this.mensagem.value });
  }

  async novoEnvio() {
    if (this.enviando || this.contextoAlterado) return;
    const geracao = this.geracao;
    if (!(await this.confirmarDuplicidade()) || geracao !== this.geracao) return;
    this.store.documentos.delete(this.endpoint);
    this.notificarBloqueio(false);
    this.erro = '';
  }
}
