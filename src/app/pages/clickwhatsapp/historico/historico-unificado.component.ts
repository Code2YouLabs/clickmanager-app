import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, TemplateRef, ViewChild, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpParams } from '@angular/common/http';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableColumn, DataTableSort } from 'src/app/components/data-table/data-table.models';
import { openMobileSidePanel } from 'src/app/components/mobile-side-panel/mobile-side-panel';
import { environment } from 'src/environments/environment';
import { Subject, takeUntil, timeout } from 'rxjs';
import { falha } from '../clickwhatsapp.models';

export interface RegistroHistorico {
  id: string; tipoRegistro: 'MENSAGEM' | 'OCORRENCIA'; tipo: string; acontecimento: string | null;
  pedido: string | null; nomeCliente: string | null; destinatarioMascarado: string | null;
  criadoEm: string; situacao: string; motivoCodigo: string | null; motivoDescricao: string | null;
  etapa: string; mensagemId: string | null; conexaoId: string | null; processamento: string; validaAte: string;
}
export interface PaginaHistorico { naoIndexados?: number; itens: RegistroHistorico[]; pagina: number; tamanho: number; total: number; temMais: boolean; referencia: string; motivos: Record<string,string> }
interface Filtros { inicio: string; fim: string; tipo: string; situacao: string; acontecimento: string; motivo: string }
@Component({
  selector: 'app-historico-unificado', standalone: true,
  imports: [StatusBadgeComponent, CommonModule, FormsModule, MaterialModule, MatDialogModule, DataTableComponent, DataTableCellDirective, DataTableItemDirective],
  templateUrl: './historico-unificado.component.html', styleUrl: './historico-unificado.component.scss',
})
export class HistoricoUnificadoComponent implements OnInit, OnDestroy {
  @Output() mensagem = new EventEmitter<RegistroHistorico>();
  @Input() permitido = true;
  @ViewChild('filtrosPainel') filtrosPainel!: TemplateRef<unknown>;
  @ViewChild('ocorrenciaPainel') ocorrenciaPainel!: TemplateRef<unknown>;
  private readonly http = inject(HttpClient);
  private readonly dialog = inject(MatDialog);
  private readonly cancelar = new Subject<void>();
  private readonly sair = new Subject<void>();
  private readonly base = environment.apiUrl + '/api/clickwhatsapp/historico';
  private painel?: ReturnType<typeof openMobileSidePanel>;
  carregando = false; erro = ''; erroPesquisa = ''; pesquisa = ''; pagina = 0; tamanho = 20;
  referencia = ''; resultado: PaginaHistorico | null = null; detalhe: RegistroHistorico | null = null; erroDetalhe = ''; lendoDetalhe = false;
  sort: DataTableSort = { active: 'data', direction: 'desc' };
  filtro: Filtros = this.periodo(7); rascunho: Filtros = { ...this.filtro }; erroFiltro = '';
  private periodoPadrao = { inicio: this.filtro.inicio, fim: this.filtro.fim };
  readonly tipos: Record<string,string> = { AVULSA: 'Avulsa', AUTOMATICA: 'Automática', OUTRA: 'Outra' };
  readonly situacoes: Record<string,string> = { PENDENTE: 'Pendente', RESERVADA: 'Reservada', CHAMADA_INICIADA: 'Processando', ACEITA: 'Aceita', ENTREGUE: 'Entregue', LIDA: 'Lida', FALHA: 'Falha', CANCELADA: 'Cancelada', EXPIRADA: 'Expirada', INCERTA: 'Incerta', NAO_ENVIADA: 'Não enviada' };
  readonly acontecimentos: Record<string,string> = { CRIADO: 'Pedido criado', EM_PRODUCAO: 'Pedido em produção', PRONTO: 'Pedido pronto', ENTREGUE: 'Pedido entregue', PREVISAO_ALTERADA: 'Previsão alterada', CANCELADO: 'Pedido cancelado' };
  readonly colunas: DataTableColumn<RegistroHistorico>[] = [
    { key: 'data', label: 'Data', sortable: true }, { key: 'tipo', label: 'Tipo', sortable: true },
    { key: 'destinatario', label: 'Cliente / Destinatário' }, { key: 'pedido', label: 'Pedido', sortable: true },
    { key: 'situacao', label: 'Situação', sortable: true }, { key: 'motivo', label: 'Motivo' }, { key: 'acoes', label: 'Ações' },
  ];
  badge(s: string) { return s === 'INCERTA' ? 'PRECISA_AJUSTE' : ['FALHA','NAO_ENVIADA','CANCELADA','EXPIRADA'].includes(s) ? 'INATIVO' : s; }
  ngOnInit() { this.carregar(); }
  ngOnDestroy() { this.cancelar.next(); this.sair.next(); this.sair.complete(); this.cancelar.complete(); this.painel?.close(); }
  get filtrosAtivos() { return !!(this.filtro.inicio !== this.periodoPadrao.inicio || this.filtro.fim !== this.periodoPadrao.fim || this.filtro.tipo || this.filtro.situacao || this.filtro.acontecimento || this.filtro.motivo); }
  get paginacao() { return { pageIndex: this.pagina, pageSize: this.tamanho, totalItems: this.resultado?.total ?? 0, pageSizeOptions: [20,50,100] }; }
  periodo(dias: number): Filtros {
    const fim = new Date(Date.now() + 60000); const inicio = new Date(fim.getTime() - dias * 86400000);
    if (!dias) { const p = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(fim); return { inicio: p + 'T00:00', fim: this.local(fim.toISOString()), tipo: '', situacao: '', acontecimento: '', motivo: '' }; }
    return { inicio: this.local(inicio.toISOString()), fim: this.local(fim.toISOString()), tipo: '', situacao: '', acontecimento: '', motivo: '' };
  }
  private local(value: string) { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(value)).replace(' ', 'T'); }
  carregar(reiniciar = false) {
    this.cancelar.next(); if (!this.permitido) return;
    if (reiniciar) { this.pagina = 0; this.referencia = ''; }
    this.carregando = true; this.erro = '';
    let params = new HttpParams().set('inicio', new Date(this.filtro.inicio + '-03:00').toISOString()).set('fim', new Date(this.filtro.fim + '-03:00').toISOString())
      .set('pesquisa', this.pesquisa).set('page', this.pagina).set('size', this.tamanho).set('sort', this.sort.active || 'data').set('direction', this.sort.direction || 'desc');
    for (const key of ['tipo','situacao','acontecimento','motivo'] as const) if (this.filtro[key]) params = params.set(key, this.filtro[key]);
    if (this.referencia) params = params.set('referencia', this.referencia);
    this.http.get<PaginaHistorico>(this.base, { params }).pipe(timeout(15000), takeUntil(this.cancelar), takeUntil(this.sair)).subscribe({
      next: value => { this.resultado = value; this.referencia = value.referencia; this.carregando = false; },
      error: e => { this.erro = falha(e).mensagem; this.resultado = null; this.carregando = false; },
    });
  }
  pesquisar(value: string) {
    this.cancelar.next(); this.pesquisa = value.trim(); this.erroPesquisa = '';
    if (this.pesquisa && this.pesquisa.length < 3) { this.erroPesquisa = 'Digite pelo menos 3 caracteres.'; this.carregando = false; return; }
    this.carregar(true);
  }
  ordenar(sort: DataTableSort) { this.sort = { active: sort.active || 'data', direction: sort.direction || 'desc' }; this.carregar(true); }
  paginar(event: {pageIndex: number; pageSize: number}) { this.pagina = event.pageSize === this.tamanho ? event.pageIndex : 0; this.tamanho = event.pageSize; this.carregar(); }
  limpar() { this.filtro = this.periodo(7); this.periodoPadrao = { inicio: this.filtro.inicio, fim: this.filtro.fim }; this.pesquisa = ''; this.erroPesquisa = ''; this.carregar(true); }
  abrirFiltros() { if (this.painel) return; this.rascunho = { ...this.filtro }; this.erroFiltro = ''; this.abrir(this.filtrosPainel, 'Filtros do histórico'); }
  rapido(dias: number) { this.rascunho = { ...this.rascunho, ...{ inicio: this.periodo(dias).inicio, fim: this.periodo(dias).fim } }; }
  aplicar() {
    if (!Number.isFinite(Date.parse(this.rascunho.inicio)) || !Number.isFinite(Date.parse(this.rascunho.fim)) || this.rascunho.fim <= this.rascunho.inicio) { this.erroFiltro = 'Escolha um período válido.'; return; }
    this.filtro = { ...this.rascunho, acontecimento: this.rascunho.tipo === 'AUTOMATICA' ? this.rascunho.acontecimento : '' }; this.painel?.close(); this.carregar(true);
  }
  private abrir(template: TemplateRef<unknown>, nome: string) {
    const ref = openMobileSidePanel(this.dialog, template, { ariaLabel: nome }, '640px'); this.painel = ref;
    ref.afterClosed().pipe(takeUntil(this.sair)).subscribe(() => { if (this.painel === ref) this.painel = undefined; }); return ref;
  }
  ver(item: RegistroHistorico) {
    if (this.painel) return;
    if (item.tipoRegistro === 'MENSAGEM') { this.mensagem.emit(item); return; }
    this.detalhe = null; this.lendoDetalhe = true; this.erroDetalhe = '';
    const ref = this.abrir(this.ocorrenciaPainel, 'Detalhe do processamento automático');
    this.http.get<RegistroHistorico>(this.base + '/' + encodeURIComponent(item.id)).pipe(timeout(15000), takeUntil(ref.beforeClosed()), takeUntil(this.sair)).subscribe({ next: value => { this.detalhe = value; this.lendoDetalhe = false; }, error: e => { this.erroDetalhe = falha(e).mensagem; this.lendoDetalhe = false; } });
  }
}
