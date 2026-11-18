import { RevisaoDocumentoService } from 'src/app/components/compartilhamento-clickwhatsapp/revisao-documento.service';
import { CommonModule, DatePipe } from '@angular/common';
import { Component, HostListener, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import {
  ListFilterBarComponent,
  ListFilterChange,
  ListFilterDefinition,
} from 'src/app/components/list-filter-bar/list-filter-bar.component';
import { MetricCardComponent } from 'src/app/components/metric-card/metric-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { TelefonePipe } from 'src/app/pipe/telefone.pipe';
import { AuthService } from 'src/app/services/auth.service';
import { Orcamento, OrcamentoListagemParams, OrcamentoOrigem, OrcamentoResumo, OrcamentoStatus } from 'src/app/models/orcamento/orcamento.model';
import { OrcamentoResumoService } from 'src/app/services/orcamento-resumo.service';
import { OrcamentoService } from 'src/app/services/orcamento.service';
import { montarMensagemWhatsAppOrcamento, montarUrlWhatsAppOrcamento } from '../shared/orcamento-whatsapp.util';

type PeriodoFiltro = 'TODOS' | 'HOJE' | '7_DIAS' | '30_DIAS' | 'PERSONALIZADO';
type OrdenacaoFiltro = 'RECENTES' | 'ANTIGOS' | 'MAIOR_VALOR' | 'MENOR_VALOR';

type StatusOption = {
  value: OrcamentoStatus;
  label: string;
};

type IndicadorOrcamento = {
  titulo: string;
  valor: string;
  auxiliar: string;
  icon: string;
  accent: 'primary' | 'warning' | 'success' | 'neutral';
};

@Component({
  selector: 'app-listar-orcamentos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    TablerIconsModule,
    CardHeaderComponent,
    ListFilterBarComponent,
    MetricCardComponent,
    StatusBadgeComponent,
    TelefonePipe,
    DatePipe,
  ],
  templateUrl: './listar-orcamentos.component.html',
  styleUrl: './listar-orcamentos.component.scss',
})
export class ListarOrcamentosComponent implements OnInit {
  orcamentos: Orcamento[] = [];
  totalOrcamentos = 0;
  resumoOrcamentos: OrcamentoResumo | null = null;
  carregando = false;
  erro = false;
  pagina = 0;
  tamanhoPagina = 10;
  termoPesquisa = '';
  statusSelecionado: OrcamentoStatus | '' = '';
  origemSelecionada: OrcamentoOrigem | '' = '';
  periodoSelecionado: PeriodoFiltro = 'TODOS';
  ordenacaoSelecionada: OrdenacaoFiltro = 'RECENTES';
  dataInicioPersonalizada = '';
  dataFimPersonalizada = '';
  isMobileView = false;
  indicadores: IndicadorOrcamento[] = [];
  filtrosOrcamento: ListFilterDefinition[] = [
    {
      key: 'status',
      label: 'Status',
      value: '',
      options: [
        { value: '', label: 'Todos' },
        { value: 'NOVO', label: 'Novos' },
        { value: 'EM_ATENDIMENTO', label: 'Em atendimento' },
        { value: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
        { value: 'CONVERTIDO', label: 'Convertidos' },
        { value: 'PERDIDO', label: 'Não convertidos' },
      ],
    },
    {
      key: 'origem',
      label: 'Origem',
      value: '',
      options: [
        { value: '', label: 'Todas' },
        { value: 'SITE', label: 'Site' },
        { value: 'BALCAO', label: 'Balcão' },
        { value: 'SMARTCALC', label: 'SmartCalc' },
        { value: 'API', label: 'API' },
        { value: 'INTEGRACAO', label: 'Integração' },
        { value: 'OUTRO', label: 'Outro' },
      ],
    },
    {
      key: 'periodo',
      label: 'Período',
      value: 'TODOS',
      options: [
        { value: 'TODOS', label: 'Todos' },
        { value: 'HOJE', label: 'Hoje' },
        { value: '7_DIAS', label: 'Últimos 7 dias' },
        { value: '30_DIAS', label: 'Últimos 30 dias' },
        { value: 'PERSONALIZADO', label: 'Personalizado' },
      ],
    },
    {
      key: 'ordenacao',
      label: 'Ordenação',
      value: 'RECENTES',
      options: [
        { value: 'RECENTES', label: 'Mais recentes' },
        { value: 'ANTIGOS', label: 'Mais antigos' },
        { value: 'MAIOR_VALOR', label: 'Maior valor' },
        { value: 'MENOR_VALOR', label: 'Menor valor' },
      ],
    },
  ];
  readonly linhasAtualizando = new Set<number>();
  readonly colunasExibidas = ['protocolo', 'cliente', 'contato', 'total', 'recebidoEm', 'status', 'acao'];
  readonly statusOptions: StatusOption[] = [
    { value: 'NOVO', label: 'Novo' },
    { value: 'EM_ATENDIMENTO', label: 'Em atendimento' },
    { value: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
    { value: 'CONVERTIDO', label: 'Convertido' },
    { value: 'PERDIDO', label: 'Não convertido' },
  ];
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  constructor(
    private readonly orcamentoService: OrcamentoService,
    private readonly orcamentoResumoService: OrcamentoResumoService,
    private readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly revisaoWhatsApp: RevisaoDocumentoService,
  ) {}

  ngOnInit(): void {
    this.atualizarViewport();
    this.carregarResumoIndicadores();
    this.carregarOrcamentos();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    this.atualizarViewport();
  }

  get podeEditar(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_EDITAR');
  }

  get podeCriar(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_CRIAR');
  }

  get podeCancelar(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_CANCELAR');
  }

  get possuiFiltros(): boolean {
    return !!this.termoPesquisa.trim()
      || !!this.statusSelecionado
      || !!this.origemSelecionada
      || this.periodoSelecionado !== 'TODOS'
      || this.ordenacaoSelecionada !== 'RECENTES';
  }

  get orcamentosFiltrados(): Orcamento[] {
    const termo = this.termoPesquisa.trim().toLowerCase();
    if (!termo) {
      return this.orcamentos;
    }

    return this.orcamentos.filter((orcamento) => [
      this.protocoloLabel(orcamento),
      this.clienteLabel(orcamento),
      this.telefoneOrcamento(orcamento),
      this.emailOrcamento(orcamento),
    ].some((valor) => String(valor || '').toLowerCase().includes(termo)));
  }

  carregarResumoIndicadores(): void {
    this.orcamentoResumoService.buscarResumo().subscribe({
      next: (response) => {
        this.resumoOrcamentos = response;
        this.atualizarIndicadores();
      },
      error: () => {
        this.resumoOrcamentos = null;
        this.indicadores = [];
      },
    });
  }

  carregarOrcamentos(): void {
    this.carregando = true;
    this.erro = false;
    this.orcamentoService
      .listar(this.buildFiltros())
      .subscribe({
        next: (response) => {
          this.orcamentos = response.content || [];
          if (this.orcamentos[0]) this.revisaoWhatsApp.preparar('/api/orcamentos/' + this.orcamentos[0].id + '/clickwhatsapp');
          this.totalOrcamentos = response.totalElements || 0;
          this.carregando = false;
        },
        error: () => {
          this.carregando = false;
          this.erro = true;
          this.toastr.error('Não foi possível carregar os orçamentos.');
        },
      });
  }

  onPaginaAlterada(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanhoPagina = event.pageSize;
    this.carregarOrcamentos();
  }

  onPesquisar(valor: string): void {
    this.termoPesquisa = valor || '';
  }

  onFiltroChange(event: ListFilterChange): void {
    if (event.key === 'status') {
      this.statusSelecionado = event.value as OrcamentoStatus | '';
    }
    if (event.key === 'origem') {
      this.origemSelecionada = event.value as OrcamentoOrigem | '';
    }
    if (event.key === 'periodo') {
      this.periodoSelecionado = event.value as PeriodoFiltro;
    }
    if (event.key === 'ordenacao') {
      this.ordenacaoSelecionada = event.value as OrdenacaoFiltro;
    }

    this.atualizarValoresFiltros();
    this.aplicarFiltros();
  }

  aplicarFiltros(): void {
    this.pagina = 0;
    this.carregarOrcamentos();
  }

  limparFiltros(): void {
    this.termoPesquisa = '';
    this.statusSelecionado = '';
    this.origemSelecionada = '';
    this.periodoSelecionado = 'TODOS';
    this.ordenacaoSelecionada = 'RECENTES';
    this.dataInicioPersonalizada = '';
    this.dataFimPersonalizada = '';
    this.pagina = 0;
    this.atualizarValoresFiltros();
    this.carregarOrcamentos();
  }

  alterarStatus(orcamento: Orcamento, novoStatus: OrcamentoStatus | string): void {
    const status = novoStatus as OrcamentoStatus;
    if (!this.podeEditar || !orcamento?.id || status === orcamento.status || this.linhaAtualizando(orcamento)) {
      return;
    }

    if (status === 'CONVERTIDO' || status === 'PERDIDO') {
      this.confirmarAlteracaoStatus(orcamento, status);
      return;
    }

    this.executarAlteracaoStatus(orcamento, status);
  }

  marcarStatus(orcamento: Orcamento, status: OrcamentoStatus): void {
    this.alterarStatus(orcamento, status);
  }

  cancelar(orcamento: Orcamento): void {
    if (!this.podeCancelar || !orcamento?.id) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Cancelar orçamento',
        message: `Deseja cancelar o orçamento ${this.protocoloLabel(orcamento)}?`,
        confirmText: 'Cancelar orçamento',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmou) => {
      if (!confirmou) {
        return;
      }

      this.orcamentoService.cancelar(orcamento.id).subscribe({
        next: () => {
          this.toastr.success('Orçamento cancelado com sucesso.');
          this.carregarResumoIndicadores();
          this.carregarOrcamentos();
        },
        error: () => this.toastr.error('Não foi possível cancelar o orçamento.'),
      });
    });
  }

  copiarContato(orcamento: Orcamento): void {
    const contato = this.telefoneOrcamento(orcamento) || this.emailOrcamento(orcamento);
    if (!contato) {
      this.toastr.info('Este orçamento não possui contato informado.');
      return;
    }

    navigator.clipboard?.writeText(contato)
      .then(() => this.toastr.success('Contato copiado.'))
      .catch(() => this.toastr.error('Não foi possível copiar o contato.'));
  }

  copiarProtocolo(orcamento: Orcamento): void {
    const protocolo = this.protocoloLabel(orcamento);
    navigator.clipboard?.writeText(protocolo)
      .then(() => this.toastr.success('Protocolo copiado.'))
      .catch(() => this.toastr.error('Não foi possível copiar o protocolo.'));
  }

  abrirWhatsApp(orcamento: Orcamento): void {
    if (this.revisaoWhatsApp.manualAtivo) { this.abrirWhatsAppManual(orcamento); return; }
    this.orcamentoService.detalhar(orcamento.id).subscribe({
      next: documento => this.revisaoWhatsApp.abrir('/api/orcamentos/' + documento.id + '/clickwhatsapp',
        this.telefoneNormalizado(documento) || '', montarMensagemWhatsAppOrcamento(documento),
        () => this.abrirWhatsAppManual(orcamento)),
      error: () => this.toastr.error('Não foi possível carregar os dados do orçamento para o WhatsApp.'),
    });
  }

  private abrirWhatsAppManual(orcamento: Orcamento): void {
    const telefone = this.telefoneNormalizado(orcamento);
    if (!telefone) {
      this.toastr.info('Este orçamento não possui telefone para WhatsApp.');
      return;
    }

    const popup = window.open('about:blank', '_blank');
    if (!popup) {
      this.toastr.info('O navegador bloqueou a nova janela. Permita pop-ups para abrir o WhatsApp.');
      return;
    }

    popup.opener = null;
    this.orcamentoService.detalhar(orcamento.id).subscribe({
      next: (detalhe) => {
        const telefoneDetalhe = this.telefoneNormalizado(detalhe) || telefone;
        popup.location.href = montarUrlWhatsAppOrcamento(telefoneDetalhe, detalhe);
      },
      error: () => {
        popup.close();
        this.toastr.error('Não foi possível carregar os dados do orçamento para o WhatsApp.');
      },
    });
  }

  trackByOrcamento(index: number, orcamento: Orcamento): number {
    return orcamento.id ?? index;
  }

  protocoloLabel(orcamento: Orcamento): string {
    return orcamento.protocolo || `#${orcamento.id}`;
  }

  clienteLabel(orcamento: Orcamento): string {
    return orcamento.nomeContato || orcamento.nomeCliente || orcamento.nome || 'Cliente não informado';
  }

  telefoneOrcamento(orcamento: Orcamento): string | null {
    return orcamento.telefoneContato || orcamento.telefoneCliente || orcamento.telefone || null;
  }

  emailOrcamento(orcamento: Orcamento): string | null {
    return orcamento.emailContato || orcamento.emailCliente || orcamento.email || null;
  }

  dataCriacao(orcamento: Orcamento): string | null {
    return orcamento.createdAt || orcamento.criadoEm || null;
  }

  dataAtualizacao(orcamento: Orcamento): string | null {
    return orcamento.atualizadoEm || orcamento.updatedAt || null;
  }

  itensLabel(orcamento: Orcamento): string {
    const quantidade = orcamento.quantidadeItens ?? orcamento.itens?.length ?? 0;
    return quantidade === 1 ? '1 item' : `${quantidade} itens`;
  }

  totalLabel(orcamento: Orcamento): number | null {
    return orcamento.totalEstimado ?? null;
  }

  statusLabel(status: OrcamentoStatus | null | undefined): string {
    const option = this.statusOptions.find((item) => item.value === status);
    return option?.label || 'Sem status';
  }

  statusClass(status: OrcamentoStatus | null | undefined): string {
    return `status-pill--${String(status || 'DESCONHECIDO').toLowerCase().replace(/_/g, '-')}`;
  }

  origemLabel(origem: string | null | undefined): string {
    const labels: Record<string, string> = {
      SITE_PUBLICO: 'Site',
      SITE: 'Site',
      BALCAO: 'Balcão',
      SMARTCALC: 'SmartCalc',
      API: 'API',
      CADASTRO_MANUAL: 'Balcão',
      MANUAL: 'Balcão',
      ADMIN: 'Balcão',
      INTEGRACAO: 'Integração',
      WHATSAPP: 'WhatsApp',
      OUTRO: 'Outro',
    };

    return origem ? labels[origem] || origem : 'Origem não informada';
  }

  tempoRelativo(iso: string | null | undefined, prefixo: string): string {
    if (!iso) {
      return 'Sem atualização';
    }

    const data = new Date(iso);
    const diffMs = Date.now() - data.getTime();
    const minutos = Math.max(0, Math.floor(diffMs / 60000));
    if (minutos < 1) {
      return `${prefixo} agora`;
    }
    if (minutos < 60) {
      return `${prefixo} há ${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    if (horas < 24) {
      return `${prefixo} há ${horas}h`;
    }

    const dias = Math.floor(horas / 24);
    return `${prefixo} há ${dias} ${dias === 1 ? 'dia' : 'dias'}`;
  }

  linhaAtualizando(orcamento: Orcamento): boolean {
    return this.linhasAtualizando.has(orcamento.id);
  }

  deveMostrarAcaoStatus(orcamento: Orcamento, status: OrcamentoStatus): boolean {
    return this.podeEditar && orcamento.status !== status;
  }

  possuiTelefone(orcamento: Orcamento): boolean {
    return !!this.telefoneNormalizado(orcamento);
  }

  private confirmarAlteracaoStatus(orcamento: Orcamento, status: OrcamentoStatus): void {
    const convertido = status === 'CONVERTIDO';
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: convertido ? 'Marcar como convertido' : 'Marcar como não convertido',
        message: convertido
          ? 'Deseja marcar este orçamento como convertido? A criação do pedido será habilitada em uma etapa futura.'
          : 'Deseja marcar este orçamento como não convertido?',
        confirmText: convertido ? 'Marcar convertido' : 'Marcar não convertido',
        confirmColor: convertido ? 'primary' : 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmou) => {
      if (confirmou) {
        this.executarAlteracaoStatus(orcamento, status);
      }
    });
  }

  private executarAlteracaoStatus(orcamento: Orcamento, status: OrcamentoStatus): void {
    this.linhasAtualizando.add(orcamento.id);
    this.orcamentoService.alterarStatus(orcamento.id, status).subscribe({
      next: (response) => {
        this.orcamentos = this.orcamentos.map((item) => item.id === response.id ? { ...item, ...response } : item);
        this.linhasAtualizando.delete(orcamento.id);
        this.carregarResumoIndicadores();
        this.toastr.success(status === 'CONVERTIDO' ? 'Orçamento marcado como convertido.' : 'Status atualizado com sucesso.');
      },
      error: () => {
        this.linhasAtualizando.delete(orcamento.id);
        this.toastr.error('Não foi possível atualizar o status.');
      },
    });
  }

  private buildFiltros(): OrcamentoListagemParams {
    const periodo = this.periodoFiltro();
    return {
      page: this.pagina,
      size: this.tamanhoPagina,
      sort: this.sortFiltro(),
      textoPesquisa: this.termoPesquisa.trim() || undefined,
      status: this.statusSelecionado || undefined,
      origem: this.origemSelecionada || undefined,
      dataInicio: periodo.dataInicio,
      dataFim: periodo.dataFim,
    };
  }

  private periodoFiltro(): { dataInicio?: string; dataFim?: string } {
    const hoje = new Date();
    const fim = this.formatarDataFiltro(hoje);
    if (this.periodoSelecionado === 'HOJE') {
      return { dataInicio: fim, dataFim: fim };
    }
    if (this.periodoSelecionado === '7_DIAS') {
      return { dataInicio: this.formatarDataFiltro(this.subtrairDias(hoje, 6)), dataFim: fim };
    }
    if (this.periodoSelecionado === '30_DIAS') {
      return { dataInicio: this.formatarDataFiltro(this.subtrairDias(hoje, 29)), dataFim: fim };
    }
    if (this.periodoSelecionado === 'PERSONALIZADO') {
      return {
        dataInicio: this.dataInicioPersonalizada || undefined,
        dataFim: this.dataFimPersonalizada || undefined,
      };
    }

    return {};
  }

  private sortFiltro(): string {
    const sorts: Record<OrdenacaoFiltro, string> = {
      RECENTES: 'createdAt,desc',
      ANTIGOS: 'createdAt,asc',
      MAIOR_VALOR: 'totalEstimado,desc',
      MENOR_VALOR: 'totalEstimado,asc',
    };

    return sorts[this.ordenacaoSelecionada];
  }

  private formatarDataFiltro(data: Date): string {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const dia = String(data.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private subtrairDias(data: Date, dias: number): Date {
    const novaData = new Date(data);
    novaData.setDate(novaData.getDate() - dias);
    return novaData;
  }

  private telefoneNormalizado(orcamento: Orcamento): string | null {
    const telefone = this.telefoneOrcamento(orcamento)?.replace(/\D/g, '') || '';
    if (!telefone) {
      return null;
    }

    return telefone.startsWith('55') ? telefone : `55${telefone}`;
  }

  private atualizarViewport(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.isMobileView = window.innerWidth <= 768;
    this.tamanhoPagina = this.isMobileView ? 20 : 10;
  }

  private atualizarValoresFiltros(): void {
    this.filtrosOrcamento = this.filtrosOrcamento.map((filter) => {
      if (filter.key === 'status') {
        return { ...filter, value: this.statusSelecionado };
      }
      if (filter.key === 'origem') {
        return { ...filter, value: this.origemSelecionada };
      }
      if (filter.key === 'periodo') {
        return { ...filter, value: this.periodoSelecionado };
      }
      if (filter.key === 'ordenacao') {
        return { ...filter, value: this.ordenacaoSelecionada };
      }

      return filter;
    });
  }

  private atualizarIndicadores(): void {
    const resumo = this.resumoOrcamentos;
    if (!resumo) {
      this.indicadores = [];
      return;
    }

    this.indicadores = [
      {
        titulo: 'Novos',
        valor: String(resumo.novos),
        auxiliar: 'Aguardando atendimento',
        icon: 'sparkles',
        accent: 'primary',
      },
      {
        titulo: 'Em andamento',
        valor: String(resumo.emAtendimento),
        auxiliar: 'Atendimentos em aberto',
        icon: 'progress',
        accent: 'warning',
      },
      {
        titulo: 'Aguardando cliente',
        valor: String(resumo.aguardandoCliente),
        auxiliar: 'Dependem de retorno',
        icon: 'hourglass',
        accent: 'neutral',
      },
      {
        titulo: 'Convertidos',
        valor: String(resumo.convertidos),
        auxiliar: 'Fechados com sucesso',
        icon: 'circle-check',
        accent: 'success',
      },
    ];
  }
}
