import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpContext } from '@angular/common/http';
import { Component, DestroyRef, inject, Input, OnInit, TemplateRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { BreakpointObserver } from '@angular/cdk/layout';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { openMobileSidePanel } from 'src/app/components/mobile-side-panel/mobile-side-panel';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
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
  imports: [RouterModule, CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatDialogModule, MatProgressBarModule, SectionCardComponent],
  templateUrl: './automacoes-pedido.component.html', styleUrl: './automacoes-pedido.component.scss',
})
export class AutomacoesPedidoComponent implements OnInit {
  @Input() operacional = false;
  @Input() historico = false;

  @Input() carregarAoEntrar = false;
  private readonly breakpoints = inject(BreakpointObserver);
  private editor?: MatDialogRef<unknown>;
  rascunho: AutomacaoPedido | null = null;
  original: AutomacaoPedido | null = null;
  get alterado() { return !!this.rascunho && this.rascunho.modelo !== this.original?.modelo; }
  get ativas() { return this.painel?.itens.filter(i => i.ativa).length ?? 0; }

  ngOnInit() { if (this.carregarAoEntrar) void this.abrir(); }

  editar(item: AutomacaoPedido, tela: TemplateRef<unknown>) {
    if (this.editor || this.ocupado) return;
    this.original = item;
    this.rascunho = { ...item };
    this.erro = '';
    const ref = openMobileSidePanel(this.dialog, tela, {
      ariaLabel: item.nome, disableClose: true, closeOnNavigation: false,
    }, this.breakpoints.isMatched(MOBILE_FOUNDATION_QUERY) ? undefined : '560px');
    this.editor = ref;
    ref.keydownEvents().pipe(takeUntil(ref.afterClosed())).subscribe(e => {
      if (e.key === 'Escape' && !this.confirmando) { e.preventDefault(); void this.fecharEditor(); }
    });
    ref.backdropClick().pipe(takeUntil(ref.afterClosed())).subscribe(() => void this.fecharEditor());
    ref.afterClosed().subscribe(() => {
      if (this.editor === ref) this.editor = undefined;
    });
  }

  async podeSair() {
    if (!this.editor) return true;
    if (this.ocupado || this.confirmando) return false;
    if (!this.alterado) return true;
    this.confirmando = true;
    try {
      return !!await firstValueFrom(this.dialog.open(ConfirmDialogComponent, { data: {
        title: 'Descartar alterações?',
        message: 'O texto editado ainda não foi salvo.',
        confirmText: 'Descartar',
        type: 'destructive',
      } }).afterClosed());
    } finally { this.confirmando = false; }
  }

  async fecharEditor() {
    const ref = this.editor;
    if (ref && await this.podeSair() && this.editor === ref) {
      this.rascunho = this.original = null;
      ref.close();
    }
  }

  salvarTexto() {
    if (this.rascunho && this.original) return this.salvar({ ...this.rascunho, ativa: this.original.ativa }, 'texto');
    return Promise.resolve();
  }

  alternarAtivacao() {
    if (this.original && !this.alterado) return this.salvar({ ...this.original, ativa: !this.original.ativa }, 'ativacao');
    return Promise.resolve();
  }

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
        this.editor?.close(); this.rascunho = this.original = null;
        this.painel = null; this.aberto = false; this.ocupado = false; this.erro = '';
      }
    });
    inject(DestroyRef).onDestroy(() => { this.sessao++; this.troca.next(); this.editor?.close(); });
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
    this.aberto = true;
    await this.executar(async () => { const s = this.sessao; const p = await this.ler(this.http.get<PainelAutomacoes>(this.base, this.opcoes())); if (s === this.sessao) this.painel = p; });
  }
  async previa(item: AutomacaoPedido) {
    await this.executar(async () => {
      const s = this.sessao;
      const p = await this.ler(this.http.post<{ texto: string }>(this.base + '/previa', { modelo: item.modelo }, this.opcoes()));
      if (s === this.sessao && (!this.rascunho || this.rascunho === item)) item.previa = p.texto;
    });
  }
  async salvar(item: AutomacaoPedido, modo: 'texto' | 'ativacao' = 'ativacao') {
    if (this.ocupado || this.confirmando || (item.ativa && !this.painel?.podeAtivar)) return;
    const s = this.sessao;
    const snapshot = { ativa: item.ativa, modelo: item.modelo, revisao: item.revisao };
    this.confirmando = true;
    const confirmado = await firstValueFrom(this.dialog.open(ConfirmDialogComponent, { data: {
      title: modo === 'texto' ? 'Salvar template' : 'Salvar automação', message: modo === 'texto' ? 'O novo texto será usado em ocorrências futuras. O estado de ativação permanece igual.' : snapshot.ativa ? 'Novas ocorrências deste acontecimento poderão gerar mensagens ao cliente. A conexão e as autorizações serão verificadas no processamento.' : 'Esta automação ficará desativada. Mensagens já transmitidas preservam seu resultado.',
      confirmText: 'Salvar configuração',
    }, maxWidth: 'calc(100vw - 24px)' }).afterClosed());
    this.confirmando = false;
    if (!confirmado || s !== this.sessao) return;
    await this.executar(async () => {
      const p = await this.ler(this.http.put<PainelAutomacoes>(this.base + '/' + encodeURIComponent(item.tipo), snapshot, this.opcoes()));
      if (s === this.sessao) {
        this.painel = p;
        const salvo = p.itens.find(i => i.tipo === item.tipo);
        if (salvo && this.rascunho?.tipo === salvo.tipo) {
          this.original = salvo;
          this.rascunho = { ...salvo };
        }
        this.toast.success('Automação salva.');
      }
    });
  }
  nome(tipo: string) { return this.painel?.itens.find(i => i.tipo === tipo)?.nome ?? 'Automação de Pedido'; }
  origem(origem: string) { return ({ PEDIDO: 'Pedido transversal', PEDIDO_LEGADO: 'Gráfica legada', PEDIDO_DEPOSITO: 'Depósito' } as Record<string, string>)[origem] ?? 'Pedido'; }
}
