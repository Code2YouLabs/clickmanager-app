import { CommonModule, DatePipe } from '@angular/common';
import { HttpResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TablerIconsModule } from 'angular-tabler-icons';
import { ToastrService } from 'ngx-toastr';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { FormatoImpressaoOrcamento, Orcamento, OrcamentoItem, OrcamentoStatus } from 'src/app/models/orcamento/orcamento.model';
import { ClienteCreateDialogComponent } from 'src/app/pages/cliente/cliente-create-dialog/cliente-create-dialog.component';
import { TelefonePipe } from 'src/app/pipe/telefone.pipe';
import { AuthService } from 'src/app/services/auth.service';
import { FeatureFlagService } from 'src/app/services/feature-flag.service';
import { OrcamentoService } from 'src/app/services/orcamento.service';
import { montarUrlWhatsAppOrcamento } from '../shared/orcamento-whatsapp.util';

type StatusOption = {
  value: OrcamentoStatus;
  label: string;
};

type AcaoImpressaoOrcamento = 'A4' | 'TERMICA_80MM' | 'DOWNLOAD_A4';

@Component({
  selector: 'app-detalhe-orcamento',
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
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
    TablerIconsModule,
    CardHeaderComponent,
    SectionCardComponent,
    StatusBadgeComponent,
    TelefonePipe,
    DatePipe,
  ],
  templateUrl: './detalhe-orcamento.component.html',
  styleUrl: './detalhe-orcamento.component.scss',
})
export class DetalheOrcamentoComponent implements OnInit {
  orcamento: Orcamento | null = null;
  observacaoInterna = '';
  carregando = false;
  salvandoObservacao = false;
  atualizandoStatus = false;
  cancelando = false;
  associandoCliente = false;
  clientesDisponivel = false;
  gerandoImpressao: AcaoImpressaoOrcamento | null = null;
  readonly colunasItens = ['tipo', 'produto', 'unidade', 'quantidade', 'precoUnitario', 'desconto', 'subtotal', 'observacao', 'acoes'];
  readonly statusOptions: StatusOption[] = [
    { value: 'NOVO', label: 'Novo' },
    { value: 'EM_ATENDIMENTO', label: 'Em atendimento' },
    { value: 'AGUARDANDO_CLIENTE', label: 'Aguardando cliente' },
    { value: 'CONVERTIDO', label: 'Convertido' },
    { value: 'PERDIDO', label: 'Não convertido' },
  ];

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly orcamentoService: OrcamentoService,
    private readonly authService: AuthService,
    private readonly featureFlagService: FeatureFlagService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!id) {
      this.voltar();
      return;
    }

    this.carregarOrcamento(id);
    this.featureFlagService.carregar().subscribe((features) => {
      this.clientesDisponivel = features['CLIENTES'] === true;
    });
  }

  get podeEditar(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_EDITAR');
  }

  get podeCancelar(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_CANCELAR');
  }

  get podeImprimir(): boolean {
    return this.authService.temPermissao('ORCAMENTOS_IMPRIMIR');
  }

  get podeCadastrarContatoComoCliente(): boolean {
    return this.clientesDisponivel
      && this.authService.temPermissao('CLIENTE_CADASTRAR')
      && this.authService.temPermissao('ORCAMENTOS_EDITAR')
      && !this.orcamento?.clienteId
      && this.orcamento?.status !== 'CONVERTIDO'
      && this.orcamento?.status !== 'PERDIDO';
  }

  get clienteVinculado(): boolean {
    return !!this.orcamento?.clienteId;
  }

  get telefone(): string | null {
    return this.orcamento?.telefoneContato || this.orcamento?.telefoneCliente || this.orcamento?.telefone || null;
  }

  get email(): string | null {
    return this.orcamento?.emailContato || this.orcamento?.emailCliente || this.orcamento?.email || null;
  }

  get nomeCliente(): string {
    return this.orcamento?.nomeContato || this.orcamento?.nomeCliente || this.orcamento?.nome || 'Não informado';
  }

  get responsavel(): string {
    return this.orcamento?.responsavelNome || this.orcamento?.usuarioResponsavelNome || 'Usuário autenticado';
  }

  carregarOrcamento(id: number): void {
    this.carregando = true;
    this.orcamentoService.detalhar(id).subscribe({
      next: (response) => {
        this.orcamento = response;
        this.observacaoInterna = response.observacaoInterna || '';
        this.carregando = false;
      },
      error: () => {
        this.carregando = false;
        this.toastr.error('Não foi possível carregar o orçamento.');
        this.voltar();
      },
    });
  }

  voltar(): void {
    this.router.navigate(['/page/orcamentos']);
  }

  alterarStatus(novoStatus: OrcamentoStatus | string): void {
    const status = novoStatus as OrcamentoStatus;
    if (!this.orcamento?.id || !this.podeEditar || status === this.orcamento.status || this.atualizandoStatus) {
      return;
    }

    if (status === 'CONVERTIDO' || status === 'PERDIDO') {
      this.confirmarAlteracaoStatus(status);
      return;
    }

    this.executarAlteracaoStatus(status);
  }

  marcarStatus(status: OrcamentoStatus): void {
    this.alterarStatus(status);
  }

  deveMostrarAcaoStatus(status: OrcamentoStatus): boolean {
    return this.podeEditar && this.orcamento?.status !== status;
  }

  salvarObservacaoInterna(): void {
    if (!this.orcamento?.id || !this.podeEditar || this.salvandoObservacao) {
      return;
    }

    this.salvandoObservacao = true;
    this.orcamentoService
      .atualizarObservacaoInterna(this.orcamento.id, this.observacaoInterna.trim() || null)
      .subscribe({
        next: (response) => {
          this.orcamento = response;
          this.observacaoInterna = response.observacaoInterna || '';
          this.salvandoObservacao = false;
          this.toastr.success('Anotação salva com sucesso.');
        },
        error: () => {
          this.salvandoObservacao = false;
          this.toastr.error('Não foi possível salvar a anotação.');
        },
      });
  }

  cancelarOrcamento(): void {
    if (!this.orcamento?.id || !this.podeCancelar || this.cancelando) {
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Cancelar orçamento',
        message: 'Deseja cancelar este orçamento?',
        confirmText: 'Cancelar orçamento',
        confirmColor: 'warn',
      },
    });

    dialogRef.afterClosed().subscribe((confirmou) => {
      if (!confirmou || !this.orcamento?.id) {
        return;
      }

      this.cancelando = true;
      this.orcamentoService.cancelar(this.orcamento.id).subscribe({
        next: (response) => {
          this.orcamento = response;
          this.cancelando = false;
          this.toastr.success('Orçamento cancelado com sucesso.');
        },
        error: () => {
          this.cancelando = false;
          this.toastr.error('Não foi possível cancelar o orçamento.');
        },
      });
    });
  }

  copiarTexto(valor: string | null | undefined, label: string): void {
    if (!valor) {
      return;
    }

    navigator.clipboard?.writeText(valor)
      .then(() => this.toastr.success(`${label} copiado.`))
      .catch(() => this.toastr.error(`Não foi possível copiar ${label.toLowerCase()}.`));
  }

  abrirWhatsApp(): void {
    const telefone = this.telefoneNormalizado();
    if (!telefone || !this.orcamento) {
      this.toastr.info('Este orçamento não possui telefone para WhatsApp.');
      return;
    }

    window.open(
      montarUrlWhatsAppOrcamento(telefone, this.orcamento),
      '_blank',
      'noopener,noreferrer'
    );
  }

  cadastrarContatoComoCliente(): void {
    if (!this.orcamento?.id || !this.podeCadastrarContatoComoCliente || this.associandoCliente) {
      return;
    }

    const dialogRef = this.dialog.open(ClienteCreateDialogComponent, {
      width: '760px',
      maxWidth: '96vw',
      data: {
        nome: this.nomeCliente,
        telefone: this.telefone,
        email: this.email,
      },
    });

    dialogRef.afterClosed().subscribe((cliente) => {
      if (!cliente || !this.orcamento?.id) {
        return;
      }

      this.associandoCliente = true;
      this.orcamentoService.atualizarContato(this.orcamento.id, {
        clienteId: cliente.id,
        nomeContato: this.nomeCliente,
        telefoneContato: this.telefone || '',
        emailContato: this.email || null,
      }).subscribe({
        next: (response) => {
          this.orcamento = response;
          this.associandoCliente = false;
          this.toastr.success('Cliente associado ao orçamento.');
        },
        error: () => {
          this.associandoCliente = false;
          this.toastr.error('Cliente criado, mas não foi possível associar ao orçamento.');
        },
      });
    });
  }

  imprimirA4(): void {
    this.abrirImpressao('A4', 'A4');
  }

  imprimirTermica80mm(): void {
    this.abrirImpressao('TERMICA_80MM', 'TERMICA_80MM');
  }

  baixarPdfA4(): void {
    if (!this.orcamento?.id || !this.podeImprimir || this.gerandoImpressao) {
      return;
    }

    this.gerandoImpressao = 'DOWNLOAD_A4';
    this.orcamentoService.baixarImpressao(this.orcamento.id, 'A4').subscribe({
      next: (response) => {
        this.baixarBlob(response, `orcamento-${this.orcamento?.id || 'documento'}.pdf`);
        this.gerandoImpressao = null;
      },
      error: () => {
        this.gerandoImpressao = null;
        this.toastr.error('Não foi possível gerar o orçamento para impressão.');
      },
    });
  }

  impressaoEmAndamento(acao: AcaoImpressaoOrcamento): boolean {
    return this.gerandoImpressao === acao;
  }

  itensLabel(): string {
    const quantidade = this.orcamento?.quantidadeItens ?? this.orcamento?.itens?.length ?? 0;
    return quantidade === 1 ? '1 item' : `${quantidade} itens`;
  }

  quantidadeLabel(item: OrcamentoItem): string {
    const quantidade = item.quantidade ?? 0;
    return `${quantidade}`;
  }

  valorUnitario(item: OrcamentoItem): number | null {
    return item.valorUnitario ?? item.precoPromocional ?? item.precoUnitario ?? null;
  }

  itemDescricao(item: OrcamentoItem): string {
    return item.descricao || item.produtoNome || 'Item não informado';
  }

  itemTipoLabel(item: OrcamentoItem): string {
    return item.tipoItem === 'LIVRE' ? 'Item livre' : 'Catálogo';
  }

  itemUnidadeLabel(item: OrcamentoItem): string {
    return this.formatarUnidadeVenda(item.unidade || item.unidadeVenda);
  }

  itemSubtotal(item: OrcamentoItem): number | null {
    return item.subtotal ?? item.subtotalEstimado ?? null;
  }

  statusLabel(status: OrcamentoStatus | string | null | undefined): string {
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
      WHATSAPP: 'WhatsApp',
      ADMIN: 'Balcão',
      INTEGRACAO: 'Integração',
      OUTRO: 'Outro',
    };

    return origem ? labels[origem] || origem : 'Não informado';
  }

  dataCriacao(): string | null {
    return this.orcamento?.createdAt || this.orcamento?.criadoEm || null;
  }

  dataAtualizacao(): string | null {
    return this.orcamento?.atualizadoEm || this.orcamento?.updatedAt || null;
  }

  totalEstimado(): number | null {
    return this.orcamento?.total ?? this.orcamento?.totalEstimado ?? null;
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

  private confirmarAlteracaoStatus(status: OrcamentoStatus): void {
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
        this.executarAlteracaoStatus(status);
      }
    });
  }

  private executarAlteracaoStatus(status: OrcamentoStatus): void {
    if (!this.orcamento?.id) {
      return;
    }

    this.atualizandoStatus = true;
    this.orcamentoService.alterarStatus(this.orcamento.id, status).subscribe({
      next: (response) => {
        this.orcamento = response;
        this.observacaoInterna = response.observacaoInterna || '';
        this.atualizandoStatus = false;
        this.toastr.success(status === 'CONVERTIDO' ? 'Orçamento marcado como convertido.' : 'Status atualizado com sucesso.');
      },
      error: () => {
        this.atualizandoStatus = false;
        this.toastr.error('Não foi possível atualizar o status.');
      },
    });
  }

  private abrirImpressao(formato: FormatoImpressaoOrcamento, acao: AcaoImpressaoOrcamento): void {
    if (!this.orcamento?.id || !this.podeImprimir || this.gerandoImpressao) {
      return;
    }

    this.gerandoImpressao = acao;
    this.orcamentoService.abrirImpressao(this.orcamento.id, formato).subscribe({
      next: (response) => {
        this.abrirBlobEmNovaJanela(response.body);
        this.gerandoImpressao = null;
      },
      error: () => {
        this.gerandoImpressao = null;
        this.toastr.error('Não foi possível gerar o orçamento para impressão.');
      },
    });
  }

  private abrirBlobEmNovaJanela(blob: Blob | null): void {
    if (!blob) {
      this.toastr.error('Não foi possível gerar o orçamento para impressão.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (!popup) {
      this.toastr.warning('O PDF foi gerado, mas o navegador bloqueou a nova janela. Permita pop-ups para este site ou utilize “Baixar PDF”.');
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
      return;
    }

    window.setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  private baixarBlob(response: HttpResponse<Blob>, fallbackName: string): void {
    const blob = response.body;
    if (!blob) {
      this.toastr.error('Não foi possível gerar o orçamento para impressão.');
      return;
    }

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.extrairNomeArquivo(response) || fallbackName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  private extrairNomeArquivo(response: HttpResponse<Blob>): string | null {
    const disposition = response.headers.get('Content-Disposition') || response.headers.get('content-disposition');
    const match = disposition?.match(/filename\*=UTF-8''([^;]+)|filename="?([^"]+)"?/i);
    const fileName = match?.[1] || match?.[2];

    return fileName ? decodeURIComponent(fileName.trim()) : null;
  }

  private telefoneNormalizado(): string | null {
    const telefone = this.telefone?.replace(/\D/g, '') || '';
    if (!telefone) {
      return null;
    }

    return telefone.startsWith('55') ? telefone : `55${telefone}`;
  }

  private formatarUnidadeVenda(valor: string | null | undefined): string {
    const labels: Record<string, string> = {
      UNIDADE: 'un.',
      METRO: 'm',
      METRO_QUADRADO: 'm2',
      METRO_CUBICO: 'm3',
      CAIXA: 'caixa',
      PACOTE: 'pacote',
      SACO: 'saco',
      LITRO: 'L',
      MILILITRO: 'ml',
      QUILOGRAMA: 'kg',
      GRAMA: 'g',
      PAR: 'par',
      JOGO: 'jogo',
      ROLO: 'rolo',
    };

    return valor ? labels[valor] || valor.toLowerCase() : 'un.';
  }
}
