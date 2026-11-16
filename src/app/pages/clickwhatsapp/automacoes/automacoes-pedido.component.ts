import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, DestroyRef, EventEmitter, inject, Input, Output } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { firstValueFrom, Subject, takeUntil, timeout } from 'rxjs';
import { AuthService } from 'src/app/services/auth.service';
import { SILENT_REQUEST } from 'src/app/interceptors/loading.interceptor';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { environment } from 'src/environments/environment';
import { CONFIRMACOES, FASES, falha, Confirmacao, Fase } from '../clickwhatsapp.models';
import { contextoEnvio } from '../clickwhatsapp-envio.store';

export interface AutomacaoPedido { tipo: string; nome: string; descricao: string; ativa: boolean; modelo: string; revisao: number; previa: string; }
interface Registro { ocorrencia: string; pedido: number; origem: string; tipo: string; resultado: string; motivo: string | null; mensagem: string | null; conexao: string | null; fase: Fase | null; confirmacao: Confirmacao | null; criadaEm: string; }
export interface PainelAutomacoes { itens: AutomacaoPedido[]; variaveis: string[]; recentes: Registro[]; podeAtivar: boolean; }
@Component({
  selector: 'app-automacoes-pedido', standalone: true,
  imports: [RouterModule, CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSlideToggleModule, MatProgressBarModule, SectionCardComponent],
  templateUrl: './automacoes-pedido.component.html', styleUrl: './automacoes-pedido.component.scss',
})
export class AutomacoesPedidoComponent {
  @Input() operacional = false;
  @Input() historico = false;
  @Output() edicaoChange = new EventEmitter<boolean>();
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly toast = inject(ToastrService);
  private readonly troca = new Subject<void>();
  private sessao = 0;
  private contexto: string | null | undefined;
  private readonly base = environment.apiUrl + '/api/clickwhatsapp/automacoes/pedidos';
  aberto = false;
  ocupado = false;
  confirmando = false;
  painel: PainelAutomacoes | null = null;
  erro = '';
  readonly fases = FASES;
  readonly confirmacoes = CONFIRMACOES;
  readonly motivos: Record<string, string> = {
    AUTOMACAO_DESATIVADA: 'Automação desativada na ocorrência', CONFIGURACAO_ALTERADA: 'Configuração mudou antes do processamento',
    OCORRENCIA_EXPIRADA: 'Ocorrência expirada', AUTORIZACAO_REVOGADA: 'Autorização indisponível ou revogada',
    SEM_CONEXAO: 'Sem conexão', TELEFONE_INVALIDO: 'Telefone ausente ou inválido', ENVIOS_PAUSADOS: 'Envios pausados',
    CONEXAO_NAO_ABERTA: 'WhatsApp desconectado', RESULTADO_INCERTO: 'Conexão em quarentena',
    SERVICO_MENSAGEM_INDISPONIVEL: 'Serviço de mensagens indisponível', FILA_INDISPONIVEL: 'Preparação será repetida dentro da validade',
  };
  constructor() {
    inject(AuthService).usuario$.pipe(takeUntilDestroyed()).subscribe(u => {
      const contexto = contextoEnvio(u);
      if (this.contexto !== contexto) {
        this.contexto = contexto; this.sessao++; this.troca.next();
        this.painel = null; this.aberto = false; this.ocupado = false; this.erro = '';
      }
    });
    inject(DestroyRef).onDestroy(() => { this.sessao++; this.troca.next(); });
  }
  private opcoes() { return { context: new HttpContext().set(SILENT_REQUEST, true) }; }
  private async executar(acao: () => Promise<void>) {
    if (this.ocupado || !this.contexto) return;
    const s = this.sessao; this.ocupado = true; this.erro = '';
    try { await acao(); } catch (e) { if (s === this.sessao) this.erro = this.mensagemErro(e); }
    finally { if (s === this.sessao) this.ocupado = false; }
  }
  private ler<T>(request: import('rxjs').Observable<T>) { return firstValueFrom(request.pipe(timeout(15000), takeUntil(this.troca))); }
  private mensagemErro(e: unknown) {
    const f = falha(e);
    if (f.status === 409) return 'A configuração foi alterada. Atualize antes de salvar novamente.';
    if (f.status === 400) return 'Revise o template: use apenas as variáveis apresentadas, com até 2000 caracteres e dentro do limite de texto.';
    return f.mensagem;
  }
  async abrir() {
    this.aberto = true; this.edicaoChange.emit(true);
    await this.executar(async () => { const s = this.sessao; const p = await this.ler(this.http.get<PainelAutomacoes>(this.base, this.opcoes())); if (s === this.sessao) this.painel = p; });
  }
  recolher() { if (!this.ocupado && !this.confirmando) { this.aberto = false; this.edicaoChange.emit(false); } }
  async previa(item: AutomacaoPedido) {
    await this.executar(async () => {
      const s = this.sessao;
      const p = await this.ler(this.http.post<{ texto: string }>(this.base + '/previa', { modelo: item.modelo }, this.opcoes()));
      if (s === this.sessao) item.previa = p.texto;
    });
  }
  async salvar(item: AutomacaoPedido) {
    if (this.ocupado || this.confirmando || (item.ativa && !this.painel?.podeAtivar)) return;
    const s = this.sessao;
    const snapshot = { ativa: item.ativa, modelo: item.modelo, revisao: item.revisao };
    this.confirmando = true;
    const confirmado = await firstValueFrom(this.dialog.open(ConfirmDialogComponent, { data: {
      title: 'Salvar automação', message: snapshot.ativa ? 'Novas ocorrências deste acontecimento poderão gerar mensagens ao cliente. A conexão e as autorizações serão verificadas no processamento.' : 'Esta automação ficará desativada. Mensagens já transmitidas preservam seu resultado.',
      confirmText: 'Salvar configuração',
    }, maxWidth: 'calc(100vw - 24px)' }).afterClosed());
    this.confirmando = false;
    if (!confirmado || s !== this.sessao) return;
    await this.executar(async () => {
      const p = await this.ler(this.http.put<PainelAutomacoes>(this.base + '/' + encodeURIComponent(item.tipo), snapshot, this.opcoes()));
      if (s === this.sessao) { this.painel = p; this.toast.success('Automação salva.'); }
    });
  }
  nome(tipo: string) { return this.painel?.itens.find(i => i.tipo === tipo)?.nome ?? 'Automação de Pedido'; }
  origem(origem: string) { return ({ PEDIDO: 'Pedido transversal', PEDIDO_LEGADO: 'Gráfica legada', PEDIDO_DEPOSITO: 'Depósito' } as Record<string, string>)[origem] ?? 'Pedido'; }
}
