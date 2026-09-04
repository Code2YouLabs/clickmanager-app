import { CommonModule } from '@angular/common';
import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormsModule, ReactiveFormsModule, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, forkJoin, map, Observable, Subject, switchMap, take, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { ClienteSelectorCardComponent } from 'src/app/components/cliente-selector-card/cliente-selector-card.component';
import { ItemPedidoView, ItensPedidoSectionComponent } from 'src/app/components/itens-pedido-section/itens-pedido-section.component';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputDataComponent } from 'src/app/components/inputs/input-data/input-data.component';
import { InputMoedaComponent } from 'src/app/components/inputs/input-moeda/input-moeda.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { ObservacoesCardComponent } from 'src/app/components/observacoes-card/observacoes-card.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PedidoFluxoControlesComponent } from 'src/app/components/pedido-fluxo-controles/pedido-fluxo-controles.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { StatusBadgeComponent } from 'src/app/components/status-badge/status-badge.component';
import { MaterialModule } from 'src/app/material.module';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { AuthService } from 'src/app/services/auth.service';
import { ClienteService } from '../../cliente/cliente.service';
import { ComercialItemResponse, ComposicaoComercialResolvida, GraficaComercialComposicaoRequest, GraficaComercialDestinoResponse, GraficaOpcao, GraficaParametro, GraficaPrecoFaixa, GraficaPrecoLote, GraficaPrecoPolitica, GraficaPrecificacaoResultado, GraficaProduto, GraficaProdutoAcabamento, GraficaServico, OrcamentoComercialDetalhe, PedidoAjustesFinanceirosRequest, PedidoComercialDetalhe, PedidoFluxoPermissoes, PedidoFluxoResponse, RascunhoComercialResponse, RecebimentoPretendidoRequest, RecebimentoResponse, ResumoFinanceiroOrigem } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaBuscaRapidaItem, GraficaProdutoBuscaRapidaDialogComponent } from './grafica-produto-busca-rapida-dialog.component';
import { PedidoDocumentosAcoesComponent } from './pedido-documentos-acoes.component';

type ComercialBetaTipo = 'rascunhos' | 'orcamentos' | 'pedidos';
type FunilColuna = 'produto' | 'material' | 'formato' | 'cor';

interface FunilOpcao {
  key: string;
  label: string;
  produto?: GraficaProduto;
  servico?: GraficaServico;
  tipo?: 'PRODUTO' | 'SERVICO';
}

interface AcabamentoComercialCalculado {
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  unidadeVenda: string;
  politica: GraficaPrecoPolitica | null;
}

interface GraficaServicoWizardData {
  cliente: {
    clienteId?: number | null;
    clienteNome?: string | null;
    clienteTelefone?: string | null;
    clienteEmail?: string | null;
  };
  servico: GraficaServico;
}

@Component({
  selector: 'app-grafica-servico-wizard-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    InputNumericoComponent,
  ],
  template: `
    <div class="service-wizard">
      <div class="service-wizard__header">
        <div>
          <span class="service-wizard__eyebrow">Serviço</span>
          <h2 mat-dialog-title>{{ data.servico.nome }}</h2>
        </div>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <mat-divider></mat-divider>

      <mat-dialog-content class="service-wizard__content">
        <p class="service-wizard__description" *ngIf="data.servico.descricao">{{ data.servico.descricao }}</p>

        <div class="state-row state-row--error" *ngIf="!politica">
          <mat-icon>warning</mat-icon>
          <span>Este serviço ainda não possui preço configurado.</span>
        </div>

        <form [formGroup]="form" class="service-wizard__form" *ngIf="politica">
          <div class="service-wizard__policy">
            <span>Precificação</span>
            <strong>{{ tipoPrecoLabel }}</strong>
          </div>

          <app-input-numerico
            [control]="quantidadeControl"
            label="Quantidade">
          </app-input-numerico>

          <ng-container *ngIf="politica.tipo === 'POR_METRO_QUADRADO'">
            <div class="service-wizard__grid">
              <app-input-numerico
                [control]="larguraControl"
                label="Largura">
              </app-input-numerico>
              <app-input-numerico
                [control]="alturaControl"
                label="Altura">
              </app-input-numerico>
            </div>
            <mat-form-field appearance="outline">
              <mat-label>Unidade</mat-label>
              <mat-select formControlName="unidadeDimensao">
                <mat-option value="METRO">Metro (m)</mat-option>
                <mat-option value="CENTIMETRO">Centímetro (cm)</mat-option>
                <mat-option value="MILIMETRO">Milímetro (mm)</mat-option>
              </mat-select>
            </mat-form-field>
          </ng-container>
        </form>

        <div class="service-wizard__price" *ngIf="preco">
          <span>Total</span>
          <strong>{{ preco.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
          <small *ngIf="preco.valorUnitario">Unitário: {{ preco.valorUnitario | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</small>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="service-wizard__actions">
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
        <button mat-stroked-button type="button" [disabled]="!politica || form.invalid || precificando" (click)="calcular()">
          Calcular
        </button>
        <button mat-flat-button color="primary" type="button" [disabled]="!preco || precificando" (click)="adicionar()">
          Adicionar
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .service-wizard {
      display: flex;
      flex-direction: column;
      width: min(520px, calc(100vw - 32px));
      max-height: min(82vh, 720px);
      background: #fff;
    }

    .service-wizard__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding: 18px 22px 14px;
    }

    .service-wizard__header h2 {
      margin: 2px 0 0;
      padding: 0;
      font-size: 1.25rem;
      line-height: 1.3;
      font-weight: 700;
    }

    .service-wizard__eyebrow {
      color: #64748b;
      font-size: 0.76rem;
      font-weight: 800;
      text-transform: uppercase;
    }

    .service-wizard__content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 18px 22px !important;
      overflow: auto;
    }

    .service-wizard__description {
      margin: 0;
      color: #475569;
    }

    .service-wizard__form,
    .service-wizard__grid {
      display: grid;
      gap: 14px;
    }

    .service-wizard__grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    .service-wizard__policy,
    .service-wizard__price,
    .state-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #f8fafc;
    }

    .service-wizard__policy span,
    .service-wizard__price span,
    .service-wizard__price small {
      color: #64748b;
      font-size: 0.84rem;
      font-weight: 700;
    }

    .service-wizard__price {
      align-items: flex-start;
      flex-direction: column;
      background: #ecfdf5;
      border-color: #bbf7d0;
    }

    .service-wizard__price strong {
      color: #166534;
      font-size: 1.4rem;
      line-height: 1.2;
    }

    .state-row--error {
      justify-content: flex-start;
      border-color: #fecaca;
      color: #991b1b;
      background: #fef2f2;
    }

    .service-wizard__actions {
      padding: 10px 22px 18px;
    }

    @media (max-width: 620px) {
      .service-wizard {
        width: calc(100vw - 16px);
        max-height: calc(100dvh - 16px);
      }

      .service-wizard__grid {
        grid-template-columns: 1fr;
      }

      .service-wizard__actions {
        align-items: stretch;
        flex-direction: column;
      }
    }
  `],
})
export class GraficaServicoWizardDialogComponent {
  readonly politica = (this.data.servico.politicas || []).find((item) => item.ativo !== false) || null;
  readonly form = this.fb.group({
    quantidade: this.fb.control(1, { nonNullable: true, validators: [Validators.required, Validators.min(1)] }),
    largura: this.fb.control<number | null>(null),
    altura: this.fb.control<number | null>(null),
    unidadeDimensao: this.fb.control('METRO', { nonNullable: true }),
  });
  preco: GraficaPrecificacaoResultado | null = null;
  precificando = false;

  get quantidadeControl(): FormControl<number> { return this.form.controls.quantidade; }
  get larguraControl(): FormControl<number | null> { return this.form.controls.largura; }
  get alturaControl(): FormControl<number | null> { return this.form.controls.altura; }

  get tipoPrecoLabel(): string {
    switch (this.politica?.tipo) {
      case 'FIXO': return 'Preço Fixo';
      case 'POR_FAIXA_QUANTIDADE': return 'Faixa de Quantidade';
      case 'POR_LOTE': return 'Quantidade Fechada';
      case 'POR_METRO_QUADRADO': return 'Preço por Metro';
      default: return 'A configurar';
    }
  }

  constructor(
    private readonly fb: FormBuilder,
    private readonly graficaService: GraficaProdutoService,
    private readonly toastr: ToastrService,
    private readonly dialogRef: MatDialogRef<GraficaServicoWizardDialogComponent, ComposicaoComercialResolvida | null>,
    @Inject(MAT_DIALOG_DATA) public readonly data: GraficaServicoWizardData,
  ) {
    if (this.politica?.tipo === 'POR_METRO_QUADRADO') {
      this.form.controls.largura.addValidators([Validators.required, Validators.min(0.0001)]);
      this.form.controls.altura.addValidators([Validators.required, Validators.min(0.0001)]);
    }
  }

  calcular(): void {
    if (!this.politica || this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.precificando = true;
    this.graficaService.precificarServico(this.data.servico.id, this.precificacaoPayload())
      .pipe(finalize(() => this.precificando = false))
      .subscribe({
        next: (preco) => this.preco = preco,
        error: (error) => this.toastr.error(error?.error?.message || error?.message || 'Não foi possível calcular o serviço.'),
      });
  }

  adicionar(): void {
    if (!this.preco) return;
    this.precificando = true;
    this.graficaService.resolverComposicaoServico(this.data.servico.id, {
      ...this.data.cliente,
      precificacao: this.precificacaoPayload(),
    } as GraficaComercialComposicaoRequest)
      .pipe(finalize(() => this.precificando = false))
      .subscribe({
        next: (composicao) => this.dialogRef.close(composicao),
        error: (error) => this.toastr.error(error?.error?.message || error?.message || 'Não foi possível adicionar o serviço.'),
      });
  }

  private precificacaoPayload(): any {
    const raw = this.form.getRawValue();
    return {
      quantidade: Number(raw.quantidade || 1),
      largura: this.politica?.tipo === 'POR_METRO_QUADRADO' ? Number(raw.largura || 0) : null,
      altura: this.politica?.tipo === 'POR_METRO_QUADRADO' ? Number(raw.altura || 0) : null,
      unidadeDimensao: this.politica?.tipo === 'POR_METRO_QUADRADO' ? raw.unidadeDimensao : null,
    };
  }
}

@Component({
  selector: 'app-grafica-comercial-beta-editor',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    ReactiveFormsModule,
    PageCardComponent,
    SectionCardComponent,
    ClienteSelectorCardComponent,
    ItensPedidoSectionComponent,
    ObservacoesCardComponent,
    InputMoedaComponent,
    InputDataComponent,
    InputOptionsComponent,
    PedidoFluxoControlesComponent,
    PedidoDocumentosAcoesComponent,
    StatusBadgeComponent,
  ],
  template: `
    <app-page-card
      [titulo]="titulo"
      [subtitulo]="subtitulo"
      botaoTexto="Voltar"
      botaoIcone="arrow_back"
      botaoCor="primary"
      [botaoRota]="['/page/grafica/comercial-beta', tipo]"
      [mostrarDivisor]="true">

      <form [formGroup]="form">
        <div class="pedido-layout">
          <div class="main-column">
            <app-pedido-fluxo-controles
              *ngIf="mostrarFluxoPedido && fluxoPedido"
              [titulo]="'Fluxo do pedido'"
              [statusAtual]="fluxoPedido.statusAtual"
              [statusControl]="statusControl"
              [statusOptions]="statusOptionsFluxo"
              [transicoes]="transicoesFluxo"
              [fluxoSteps]="fluxoPedido.fluxo"
              [descricaoStatus]="fluxoPedido.descricao"
              [hints]="hintsFluxo"
              [isReadOnly]="!permissoesFluxo.alterarStatus"
              [inativo]="carregandoStatus"
              [restaPagar]="resumoFinanceiroView.saldoAberto"
              [totalPago]="resumoFinanceiroView.totalRecebido"
              [temPagamentos]="pagamentosView.length > 0"
              (salvarStatus)="alterarStatusSelecionado()"
              (trocarStatusSelecionado)="statusControl.setValue($event)"
              (cancelarPedido)="alterarStatus('CANCELADO')"
              (finalizarPedido)="alterarStatus('PRONTO')">
            </app-pedido-fluxo-controles>

            <app-section-card *ngIf="mostrarFluxoOrcamento && orcamento" titulo="Fluxo do orçamento" [divider]="true">
              <div class="orcamento-flow">
                <div class="orcamento-meta-grid">
                  <div class="orcamento-meta orcamento-meta--status">
                    <span>Status</span>
                    <app-status-badge [status]="orcamento.status"></app-status-badge>
                  </div>
                  <div class="orcamento-meta">
                    <span>Criado em</span>
                    <strong>{{ orcamento.createdAt | date:'dd/MM/yyyy' }}</strong>
                  </div>
                  <div class="orcamento-meta">
                    <span>Validade</span>
                    <strong>5 dias úteis</strong>
                  </div>
                </div>
                <div class="orcamento-validade">
                  <app-input-data [control]="validadeControl" label="Válido até"></app-input-data>
                  <button class="btn-save-validade" mat-stroked-button color="primary" type="button" [disabled]="!validadeControl.value || validadeControl.pristine || salvandoValidade" (click)="salvarValidadeOrcamento()">
                    Salvar validade
                  </button>
                </div>
                <div class="orcamento-actions">
                  <button mat-stroked-button class="status-action status-action--sent" type="button" *ngIf="orcamento.status === 'ABERTO'" [disabled]="carregandoStatus" (click)="alterarStatusOrcamento('ENVIADO')">Marcar enviado</button>
                  <button mat-stroked-button class="status-action status-action--approve" type="button" *ngIf="orcamentoEditavel" [disabled]="carregandoStatus" (click)="aprovarOrcamentoECriarPedido()">Aprovar e criar pedido</button>
                  <button mat-stroked-button class="status-action status-action--refuse" type="button" *ngIf="orcamentoEditavel" [disabled]="carregandoStatus" (click)="alterarStatusOrcamento('RECUSADO')">Recusar</button>
                  <button mat-stroked-button class="status-action status-action--cancel" type="button" *ngIf="orcamentoEditavel" [disabled]="carregandoStatus" (click)="alterarStatusOrcamento('CANCELADO')">Cancelar</button>
                </div>
              </div>
            </app-section-card>

            <app-cliente-selector-card
              [cliente]="clienteConfirmado"
              [editando]="trocandoCliente || !clienteConfirmado"
              [inativo]="somenteLeitura || !permissoesFluxo.editarCliente"
              [showEmptyAlert]="true"
              [control]="clienteControl"
              [displayWith]="mostrarCliente"
              [buscarFn]="buscarClientes"
              [minimoCaracteres]="3"
              emptyMessage="Nenhum cliente definido para este atendimento."
              (salvarCliente)="confirmarClienteSelecionado()"
              (editarCliente)="iniciarTrocaCliente()"
              (cancelarEdicao)="cancelarTrocaCliente()"
              (criarCliente)="onCriarCliente()">
            </app-cliente-selector-card>

            <app-itens-pedido-section
              [titulo]="itensTitulo"
              [itemContextoLabel]="itemContextoLabel"
              [itens]="itensView"
              [subtotal]="total"
              [permitirAlterarQuantidade]="false"
              [mostrarAcoes]="podeEditarItens"
              [mostrarDescreverItens]="false"
              [mostrarBuscaRapida]="true"
              buscarProdutosLabel="Adicionar produto"
              buscaRapidaLabel="Busca rápida"
              (buscarProdutos)="abrirWizard()"
              (buscaRapida)="abrirBuscaRapida()"
              (removerItem)="remover($event)">
            </app-itens-pedido-section>

            <app-observacoes-card
              class="observacoes-compact"
              titulo="Observação para o cliente"
              [control]="observacaoClienteControl"
              [textoSalvo]="observacaoClienteSalva"
              [salvando]="false"
              [salvo]="observacaoClienteSalvaFlag"
              [inativo]="somenteLeitura || !permissoesFluxo.observacoes"
              placeholder="Texto que pode aparecer no PDF e no WhatsApp..."
              (salvar)="confirmarObservacaoCliente()">
            </app-observacoes-card>

            <app-observacoes-card
              class="observacoes-compact"
              titulo="Observação interna"
              [control]="observacaoInternaControl"
              [textoSalvo]="observacaoInternaSalva"
              [salvando]="false"
              [salvo]="observacaoInternaSalvaFlag"
              [inativo]="somenteLeitura || !permissoesFluxo.observacoes"
              placeholder="Anotação visível somente dentro do ClickManager..."
              (salvar)="confirmarObservacaoInterna()">
            </app-observacoes-card>
          </div>

          <div class="summary-column">
            <div class="summary-sticky">
              <app-section-card [titulo]="resumoTitulo" [divider]="true" class="summary-card">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <strong class="value align-right">{{ resumoFinanceiroView.subtotal | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <form class="financial-adjustments" [formGroup]="ajustesFinanceirosForm" *ngIf="podeEditarAjustesFinanceiros; else ajustesFinanceirosLeitura">
                  <app-input-moeda [control]="acrescimoControl" label="Acréscimos"></app-input-moeda>
                  <app-input-moeda [control]="freteControl" label="Frete"></app-input-moeda>
                  <app-input-moeda [control]="descontoControl" label="Descontos"></app-input-moeda>
                  <button
                    *ngIf="pedidoId"
                    mat-stroked-button
                    color="primary"
                    type="button"
                    class="btn-save-adjustments"
                    [disabled]="ajustesFinanceirosForm.invalid || !ajustesFinanceirosForm.dirty || salvandoAjustesFinanceiros"
                    (click)="salvarAjustesFinanceiros()">
                    Salvar ajustes
                  </button>
                </form>
                <ng-template #ajustesFinanceirosLeitura>
                  <div class="summary-row">
                    <span>Acréscimos</span>
                    <strong class="value align-right">{{ resumoFinanceiroView.acrescimo | currency:'BRL':'symbol':'1.2-2' }}</strong>
                  </div>
                  <div class="summary-row">
                    <span>Frete</span>
                    <strong class="value align-right">{{ resumoFinanceiroView.frete | currency:'BRL':'symbol':'1.2-2' }}</strong>
                  </div>
                  <div class="summary-row">
                    <span>Descontos</span>
                    <strong class="value align-right">{{ resumoFinanceiroView.desconto | currency:'BRL':'symbol':'1.2-2' }}</strong>
                  </div>
                </ng-template>
                <mat-divider class="m-t-8 m-b-8"></mat-divider>
                <div class="summary-row total">
                  <span>Total</span>
                  <strong class="value highlight">{{ resumoFinanceiroView.total | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="summary-row pago" *ngIf="tipo === 'pedidos'">
                  <span>Pago</span>
                  <strong class="value success">{{ resumoFinanceiroView.totalRecebido | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="summary-row resta" *ngIf="tipo === 'pedidos'">
                  <span>Saldo</span>
                  <strong class="value highlight">{{ resumoFinanceiroView.saldoAberto | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <mat-progress-bar *ngIf="tipo === 'pedidos'" mode="determinate" [value]="percentualPagoView"></mat-progress-bar>
                <div class="percentual" *ngIf="tipo === 'pedidos'">{{ percentualPagoView | number:'1.0-2' }}% pago</div>
              </app-section-card>

              <app-section-card titulo="Responsável" [divider]="true" class="responsavel-card">
                <div class="responsavel-content">
                  <mat-icon>person</mat-icon>
                  <div>
                    <span>Atendente</span>
                    <strong>{{ responsavelNome }}</strong>
                  </div>
                </div>
              </app-section-card>

              <app-pedido-documentos-acoes
                *ngIf="mostrarDocumentosPedido"
                contexto="pedido"
                (pedidoCompleto)="abrirImpressaoPedido('completo')"
                (duasVias)="abrirImpressaoPedido('duas-vias')"
                (etiqueta)="abrirImpressaoPedido('etiqueta')"
                (whatsapp)="abrirWhatsAppPedido()">
              </app-pedido-documentos-acoes>

              <app-pedido-documentos-acoes
                *ngIf="mostrarDocumentosOrcamento"
                contexto="orcamento"
                (pedidoCompleto)="abrirImpressaoOrcamento()"
                (whatsapp)="abrirWhatsAppOrcamento()">
              </app-pedido-documentos-acoes>

              <app-section-card *ngIf="mostrarPagamentos" titulo="Pagamentos" [divider]="true" class="payments-card">
                <div class="payment-entry">
                  <form class="payment-form" [formGroup]="pagamentoForm">
                    <app-input-options
                      [control]="pagamentoFormaControl"
                      label="Forma"
                      placeholder="Selecione"
                      [options]="formasPagamento"
                      [showNull]="true"
                      nullLabel="Selecione">
                    </app-input-options>
                    <app-input-moeda [control]="pagamentoValorControl" label="Valor"></app-input-moeda>
                    <button mat-flat-button color="primary" type="button" [disabled]="pagamentoForm.invalid || pagamentoExcedeSaldo || salvandoPagamento || !permissoesFluxo.pagamentos" (click)="adicionarPagamento()">
                      <mat-icon>add</mat-icon>
                      Adicionar pagamento
                    </button>
                  </form>

                  <div class="payment-error" *ngIf="pagamentoExcedeSaldo">
                    Valor não pode exceder o saldo em aberto.
                  </div>
                </div>

                <div class="payment-history">
                  <div class="payment-context">
                    <div>
                      <span>Pago</span>
                      <strong class="success">{{ resumoFinanceiroView.totalRecebido | currency:'BRL':'symbol':'1.2-2' }}</strong>
                    </div>
                    <div>
                      <span>Saldo</span>
                      <strong class="highlight">{{ resumoFinanceiroView.saldoAberto | currency:'BRL':'symbol':'1.2-2' }}</strong>
                    </div>
                  </div>

                  <div class="payment-list" *ngIf="pagamentosView.length; else semPagamentos">
                    <div class="payment-item" *ngFor="let pagamento of pagamentosView; let i = index" [class.cancelado]="pagamento.status === 'CANCELADO'">
                      <div class="payment-main">
                        <strong>{{ formaPagamentoLabel(pagamento.formaPagamento) }}</strong>
                        <app-status-badge class="payment-status" [status]="pagamento.status"></app-status-badge>
                      </div>
                      <div class="payment-value">{{ pagamento.valor | currency:'BRL':'symbol':'1.2-2' }}</div>
                      <button class="payment-cancel" mat-icon-button color="warn" type="button" matTooltip="Cancelar pagamento"
                        *ngIf="pagamento.status !== 'CANCELADO' && permissoesFluxo.pagamentos"
                        aria-label="Cancelar pagamento"
                        (click)="cancelarPagamento(pagamento, i)">
                        <mat-icon>block</mat-icon>
                      </button>
                    </div>
                  </div>
                  <ng-template #semPagamentos>
                    <div class="empty-payments">Nenhum pagamento informado.</div>
                  </ng-template>
                </div>
              </app-section-card>

              <app-section-card class="submit-card" *ngIf="mostrarAcoesCriacao">
                <div class="actions-final">
                  <div class="required-alert" *ngIf="pendenciasSalvar.length; else prontoSalvar">
                    <mat-icon>error_outline</mat-icon>
                    <div>
                        <strong>Campos obrigatórios</strong>
                      <span>Preencha o que falta para concluir este atendimento comercial.</span>
                    </div>
                  </div>
                  <ng-template #prontoSalvar>
                    <div class="ready-alert">
                      <mat-icon>check_circle</mat-icon>
                      <div>
                        <strong>{{ prontoSalvarTitulo }}</strong>
                        <span>{{ prontoSalvarDescricao }}</span>
                      </div>
                    </div>
                  </ng-template>

                  <div class="checklist" *ngIf="pendenciasSalvar.length">
                    <div class="check-item" *ngFor="let pendencia of pendenciasSalvar">
                      <mat-icon>radio_button_unchecked</mat-icon>
                      <span>{{ pendencia }}</span>
                    </div>
                  </div>

                  <div class="d-flex gap-8 flex-wrap action-buttons">
                    <button mat-stroked-button color="warn" type="button" (click)="voltar()">
                      Cancelar
                    </button>
                    <ng-container *ngIf="tipo === 'rascunhos'; else acaoPrincipalUnica">
                      <button mat-stroked-button color="primary" type="button" [disabled]="!podeConcluirRascunho || salvando" (click)="concluirRascunho('orcamentos')">
                        Criar orçamento
                      </button>
                      <button mat-flat-button color="primary" type="button" [disabled]="!podeConcluirRascunho || salvando" (click)="concluirRascunho('pedidos')">
                        Criar pedido
                      </button>
                    </ng-container>
                    <ng-template #acaoPrincipalUnica>
                      <button mat-flat-button color="primary" type="button" [disabled]="!podeSalvar || salvando" (click)="salvar()">
                        {{ acaoSalvar }}
                      </button>
                    </ng-template>
                  </div>
                </div>
              </app-section-card>
            </div>
          </div>
        </div>
      </form>
    </app-page-card>
  `,
  styles: [`
    .pedido-layout { display: grid; grid-template-columns: minmax(0, 1fr) 380px; gap: 24px; align-items: start; }
    .main-column { display: flex; flex-direction: column; gap: 20px; min-width: 0; }
    .summary-column { min-width: 0; }
    .summary-sticky { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 18px; }
    .summary-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; color: #334155; }
    .summary-row.total { font-size: 16px; }
    .summary-row .value { white-space: nowrap; }
    .summary-row .highlight { color: #1e40af; font-size: 18px; }
	    .summary-row .success { color: #15803d; font-size: 18px; }
    .orcamento-flow { display: grid; gap: 16px; }
    .orcamento-meta-grid { display: grid; grid-template-columns: 180px repeat(2, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
    .orcamento-meta { display: flex; min-height: 58px; flex-direction: column; justify-content: center; gap: 5px; padding: 10px 12px; border: 1px solid #dbe5f1; border-radius: 10px; background: #f8fafc; }
    .orcamento-meta--status { align-items: flex-start; }
    .orcamento-meta span { color: #64748b; font-size: 12px; font-weight: 700; }
    .orcamento-meta strong { color: #0f172a; font-size: 14px; font-weight: 800; }
    .orcamento-validade { display: grid; grid-template-columns: 220px 180px; gap: 12px; align-items: start; padding-top: 2px; }
    .btn-save-validade { align-self: start; min-height: 40px; margin-top: 28px; border-radius: 999px; }
    .orcamento-actions { display: flex; flex-wrap: wrap; gap: 8px; padding-top: 2px; }
    .status-action { min-height: 36px; border-radius: 999px; }
    .status-action--sent { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .status-action--approve { background: #f0fdf4; border-color: #bbf7d0; color: #15803d; }
    .status-action--refuse { background: #fff7ed; border-color: #fed7aa; color: #c2410c; }
    .status-action--cancel { background: #fef2f2; border-color: #fecaca; color: #b91c1c; }
	    .financial-adjustments { display: grid; gap: 8px; margin: 10px 0 12px; }
	    .btn-save-adjustments { width: 100%; min-height: 36px; border-radius: 999px; }
	    .percentual { margin-top: 8px; color: #64748b; font-size: 12px; font-weight: 700; text-align: right; }
	    .payment-entry { padding-bottom: 14px; border-bottom: 1px solid #e2e8f0; }
	    .payment-form { display: grid; grid-template-columns: minmax(0, 1fr) 130px; gap: 10px; align-items: start; }
	    .payment-form button { grid-column: 1 / -1; width: 100%; min-height: 38px; border-radius: 999px; }
	    .payment-error { margin: 8px 0 0; color: #b91c1c; font-size: 12px; font-weight: 700; }
	    .payment-history { padding-top: 12px; }
	    .payment-context { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; padding-bottom: 10px; }
	    .payment-context div { display: flex; align-items: center; justify-content: space-between; gap: 8px; min-width: 0; }
	    .payment-context span { color: #64748b; font-size: 12px; font-weight: 700; }
	    .payment-context strong { font-size: 13px; white-space: nowrap; }
	    .payment-context .success { color: #15803d; }
	    .payment-context .highlight { color: #1e40af; }
	    .payment-list { display: flex; flex-direction: column; margin-top: 0; }
	    .payment-item { display: grid; grid-template-columns: minmax(0, 1fr) auto 32px; gap: 10px; align-items: center; min-height: 62px; padding: 10px 0; }
	    .payment-item + .payment-item { border-top: 1px solid #e2e8f0; }
	    .payment-main { display: flex; flex-direction: column; align-items: flex-start; gap: 5px; min-width: 0; }
	    .payment-main strong { display: block; color: #0f172a; font-size: 13px; font-weight: 800; line-height: 1.2; }
	    .payment-item.cancelado { opacity: .58; }
	    .payment-value { color: #0f172a; font-size: 15px; font-weight: 800; text-align: right; white-space: nowrap; }
	    .payment-cancel { width: 32px; height: 32px; line-height: 32px; }
	    .payment-cancel mat-icon { width: 18px; height: 18px; font-size: 18px; }
	    .empty-payments { padding: 12px; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 13px; text-align: center; }
    .actions-final { display: flex; flex-direction: column; gap: 16px; }
    .required-alert, .ready-alert { display: grid; grid-template-columns: auto 1fr; gap: 10px; align-items: start; padding: 14px; border-radius: 10px; font-size: 13px; }
    .required-alert { border: 1px solid #fed7aa; background: #fff7ed; color: #9a3412; }
    .ready-alert { border: 1px solid #bbf7d0; background: #f0fdf4; color: #166534; }
    .required-alert mat-icon, .ready-alert mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .required-alert strong, .required-alert span, .ready-alert strong, .ready-alert span { display: block; }
    .required-alert strong, .ready-alert strong { font-weight: 800; }
    .required-alert span, .ready-alert span { margin-top: 2px; line-height: 1.35; }
    .checklist { display: flex; flex-direction: column; gap: 10px; color: #64748b; }
    .check-item { display: flex; align-items: center; gap: 8px; font-size: 14px; }
    .check-item mat-icon { width: 16px; height: 16px; font-size: 16px; color: #94a3b8; }
    .action-buttons { justify-content: flex-end; gap: 10px; }
    .action-buttons button { min-height: 42px; border-radius: 999px; padding: 0 20px; }
    :host ::ng-deep .summary-card .section-card,
    :host ::ng-deep .responsavel-card .section-card,
    :host ::ng-deep .documents-card .section-card,
    :host ::ng-deep .payments-card .section-card,
    :host ::ng-deep .submit-card .section-card,
    :host ::ng-deep app-cliente-selector-card .section-card,
    :host ::ng-deep app-itens-pedido-section .section-card,
	    :host ::ng-deep app-observacoes-card .section-card {
	      border: 1px solid #e2e8f0;
	      border-radius: 16px;
	      box-shadow: 0 10px 30px rgba(15, 23, 42, .08);
	    }
	    :host ::ng-deep .payments-card app-input-options .mat-mdc-form-field,
	    :host ::ng-deep .payments-card app-input-moeda .mat-mdc-form-field,
	    :host ::ng-deep .summary-card app-input-moeda .mat-mdc-form-field {
	      margin-bottom: 0;
	    }
	    :host ::ng-deep .payments-card app-input-options .mat-mdc-text-field-wrapper,
	    :host ::ng-deep .payments-card app-input-moeda .mat-mdc-text-field-wrapper,
	    :host ::ng-deep .summary-card app-input-moeda .mat-mdc-text-field-wrapper {
	      min-height: 44px;
	    }
	    :host ::ng-deep .payments-card app-input-options .mat-mdc-form-field-infix,
	    :host ::ng-deep .payments-card app-input-moeda .mat-mdc-form-field-infix,
	    :host ::ng-deep .summary-card app-input-moeda .mat-mdc-form-field-infix {
	      min-height: 44px;
	      padding-top: 10px;
	      padding-bottom: 10px;
	    }
	    :host ::ng-deep .payment-status .status-chip {
	      min-height: 22px;
	      padding: 4px 8px;
	      gap: 4px;
	      font-size: 10px;
	    }
	    :host ::ng-deep .payment-status .status-chip mat-icon {
	      width: 13px;
	      height: 13px;
	      font-size: 13px;
	    }
	    .responsavel-content { display: grid; grid-template-columns: 38px minmax(0, 1fr); gap: 10px; align-items: center; }
	    .responsavel-content mat-icon { display: grid; place-items: center; width: 38px; height: 38px; border-radius: 999px; background: #eff6ff; color: #2563eb; font-size: 20px; }
	    .responsavel-content span,
	    .responsavel-content strong { display: block; }
	    .responsavel-content span { color: #64748b; font-size: 12px; font-weight: 700; }
	    .responsavel-content strong { margin-top: 2px; color: #0f172a; font-size: 14px; font-weight: 800; line-height: 1.25; }
	    @media (max-width: 980px) {
	      .pedido-layout { grid-template-columns: 1fr; }
	      .summary-sticky { position: static; }
	      .payment-form { grid-template-columns: 1fr; }
	      .payment-context { grid-template-columns: 1fr; }
	      .orcamento-meta-grid,
	      .orcamento-validade { grid-template-columns: 1fr; }
	    }
  `],
})
export class ComercialBetaEditorComponent implements OnInit, OnDestroy {
  tipo: ComercialBetaTipo = 'rascunhos';
  pedidoId: number | null = null;
  itens: ComposicaoComercialResolvida['itens'] = [];
  salvando = false;
  carregando = false;
  carregandoStatus = false;
  salvandoPagamento = false;
  salvandoAjustesFinanceiros = false;
  clienteConfirmado: any | null = null;
  trocandoCliente = true;
  observacaoClienteSalva = '';
  observacaoClienteSalvaFlag = false;
  observacaoInternaSalva = '';
  observacaoInternaSalvaFlag = false;
  formasPagamento: string[] = [];
  pagamentosPretendidos: RecebimentoPretendidoRequest[] = [];
  recebimentos: RecebimentoResponse[] = [];
  pedido: PedidoComercialDetalhe | null = null;
  rascunho: RascunhoComercialResponse | null = null;
  orcamento: OrcamentoComercialDetalhe | null = null;
  resumoFinanceiro: ResumoFinanceiroOrigem | null = null;
  fluxoPedido: PedidoFluxoResponse | null = null;
  usuarioLogado: Usuario | null = null;
  private readonly destroy$ = new Subject<void>();
  statusControl = new FormControl<string | null>(null);
  validadeControl = new FormControl<Date | null>(null);
  salvandoValidade = false;
  form = this.fb.group({
    clienteId: [null as any],
    observacaoCliente: [''],
    observacaoInterna: [''],
  });
  pagamentoForm = this.fb.group({
    formaPagamento: [null as string | null, Validators.required],
    valor: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });
  ajustesFinanceirosForm = this.fb.group({
    acrescimo: [0, [Validators.min(0)]],
    frete: [0, [Validators.min(0)]],
    desconto: [0, [Validators.min(0)]],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly fb: FormBuilder,
    private readonly graficaService: GraficaProdutoService,
    private readonly clienteService: ClienteService,
    private readonly toastr: ToastrService,
    private readonly authService: AuthService,
  ) {}

  get titulo(): string {
    if (this.pedidoId && this.tipo === 'pedidos') {
      return `Pedido #${this.pedidoId}`;
    }
    if (this.pedidoId && this.tipo === 'orcamentos') {
      return `Orçamento ${this.orcamento?.protocolo || '#' + this.pedidoId}`;
    }
    if (this.pedidoId && this.tipo === 'rascunhos') {
      return `Rascunho #${this.pedidoId}`;
    }
    return this.tipo === 'pedidos' ? 'Novo Pedido' : this.tipo === 'orcamentos' ? 'Novo Orçamento' : 'Rascunho';
  }

  get subtitulo(): string {
    if (this.tipo === 'orcamentos' && this.orcamento) {
      const partes = [
        this.orcamento.nomeCliente || null,
        this.orcamento.atendenteNomeSnapshot ? `Atendente: ${this.orcamento.atendenteNomeSnapshot}` : null,
      ].filter(Boolean);
      return partes.join(' · ');
    }
    if (this.tipo === 'pedidos') {
      return this.pedidoId ? 'Detalhe comercial do pedido' : 'Novo pedido comercial';
    }
    if (this.tipo === 'rascunhos' && this.rascunho) {
      return this.rascunho.clienteNome || 'Cliente não informado';
    }
    if (this.tipo === 'orcamentos') {
      return this.pedidoId ? 'Detalhe comercial do orçamento' : 'Novo orçamento comercial';
    }
    return 'Rascunho comercial';
  }

  get resumoTitulo(): string {
    if (this.tipo === 'orcamentos') {
      return 'Resumo do orçamento';
    }
    return this.tipo === 'rascunhos' ? 'Resumo comercial' : 'Resumo financeiro';
  }

  get itensTitulo(): string {
    return this.tipo === 'orcamentos'
      ? 'Itens do orçamento'
      : this.tipo === 'rascunhos'
        ? 'Itens do rascunho'
        : 'Itens do pedido';
  }

  get itemContextoLabel(): string {
    return this.tipo === 'orcamentos' ? 'orçamento' : this.tipo === 'rascunhos' ? 'rascunho' : 'pedido';
  }

  get responsavelNome(): string {
    if (this.tipo === 'orcamentos') {
      return this.orcamento?.atendenteNomeSnapshot || this.orcamento?.responsavelNome || this.usuarioLogado?.nome || this.usuarioLogado?.username || '-';
    }
    if (this.tipo === 'pedidos') {
      return this.pedido?.responsavelNome || this.usuarioLogado?.nome || this.usuarioLogado?.username || '-';
    }
    return this.usuarioLogado?.nome || this.usuarioLogado?.username || '-';
  }

  get contextoEditor(): {
    contexto: ComercialBetaTipo;
    modo: 'novo' | 'detalhe';
    mostrarFinanceiro: boolean;
    mostrarValidade: boolean;
    mostrarDocumentos: boolean;
    somenteLeitura: boolean;
  } {
    return {
      contexto: this.tipo,
      modo: this.pedidoId ? 'detalhe' : 'novo',
      mostrarFinanceiro: this.tipo === 'pedidos',
      mostrarValidade: this.tipo === 'orcamentos' && !!this.pedidoId,
      mostrarDocumentos: (this.tipo === 'pedidos' || this.tipo === 'orcamentos') && !!this.pedidoId,
      somenteLeitura: this.somenteLeitura,
    };
  }

  get mostrarFluxoPedido(): boolean {
    return this.tipo === 'pedidos' && !!this.pedidoId && !!this.fluxoPedido;
  }

  get mostrarFluxoOrcamento(): boolean {
    return this.tipo === 'orcamentos' && !!this.pedidoId && !!this.orcamento;
  }

  get mostrarDocumentosPedido(): boolean {
    return this.contextoEditor.mostrarDocumentos && this.tipo === 'pedidos';
  }

  get mostrarDocumentosOrcamento(): boolean {
    return this.contextoEditor.mostrarDocumentos && this.tipo === 'orcamentos';
  }

  get mostrarPagamentos(): boolean {
    return this.contextoEditor.mostrarFinanceiro;
  }

  get mostrarAcoesCriacao(): boolean {
    return this.contextoEditor.modo === 'novo' || this.tipo === 'rascunhos';
  }

  get podeEditarItens(): boolean {
    return !this.somenteLeitura && this.permissoesFluxo.editarItens;
  }

  get somenteLeitura(): boolean {
    return this.tipo === 'orcamentos' && !!this.pedidoId && !this.orcamentoEditavel;
  }

  get prontoSalvarTitulo(): string {
    if (this.tipo === 'rascunhos') {
      return 'Atendimento pronto';
    }
    return `${this.itemContextoLabel.charAt(0).toUpperCase()}${this.itemContextoLabel.slice(1)} pronto`;
  }

  get prontoSalvarDescricao(): string {
    if (this.tipo === 'rascunhos') {
      return 'Escolha se este atendimento vira pedido ou orçamento.';
    }
    return 'Revise os dados e conclua a criação.';
  }

  get acaoSalvar(): string {
    return this.tipo === 'pedidos' ? 'Criar pedido' : this.tipo === 'orcamentos' ? 'Salvar orçamento' : 'Salvar rascunho';
  }

  get total(): number {
    return this.itens.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  }

  get subtotal(): number {
    return this.itens.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  }

  get totalRecebidoTemporario(): number {
    return this.pagamentosPretendidos.reduce((acc, item) => acc + Number(item.valor || 0), 0);
  }

  get resumoFinanceiroView(): ResumoFinanceiroOrigem {
    const resumoBase = this.resumoFinanceiro;
    if (this.tipo === 'orcamentos' && this.pedidoId && this.orcamento) {
      const subtotal = this.valorMoeda(this.orcamento.subtotal);
      const desconto = this.valorMoeda(this.orcamento.desconto);
      const acrescimo = this.valorMoeda(this.orcamento.acrescimo);
      const frete = this.valorMoeda(this.orcamento.frete);
      const total = this.valorMoeda(this.orcamento.total ?? this.orcamento.totalEstimado);
      return {
        empresaId: this.orcamento.empresaId ?? 0,
        origemTipo: 'ORCAMENTO',
        origemId: this.orcamento.id,
        subtotal,
        desconto,
        acrescimo,
        frete,
        total,
        totalRecebido: 0,
        saldoAberto: total,
        percentualPago: 0,
        quitado: false,
      };
    }
    if (this.tipo === 'pedidos' && resumoBase) {
      return resumoBase;
    }
    const subtotal = resumoBase?.subtotal ?? this.subtotal;
    const totalRecebido = resumoBase?.totalRecebido ?? this.totalRecebidoTemporario;
    const ajustes = this.ajustesFinanceirosPayload();
    const total = Math.max(this.valorMoeda(subtotal + ajustes.acrescimo + ajustes.frete - ajustes.desconto), 0);
    const saldoAberto = Math.max(this.valorMoeda(total - totalRecebido), 0);
    const percentualPago = total > 0 ? (totalRecebido / total) * 100 : 100;
    return {
      empresaId: resumoBase?.empresaId ?? 0,
      origemTipo: resumoBase?.origemTipo ?? 'PEDIDO',
      origemId: resumoBase?.origemId ?? this.pedidoId ?? 0,
      subtotal,
      desconto: ajustes.desconto,
      acrescimo: ajustes.acrescimo,
      frete: ajustes.frete,
      total,
      totalRecebido,
      saldoAberto,
      percentualPago,
      quitado: saldoAberto === 0,
    };
  }

  get resumoFinanceiroPersistido(): ResumoFinanceiroOrigem {
    if (this.resumoFinanceiro) {
      return this.resumoFinanceiro;
    }
    const total = this.subtotal;
    const totalRecebido = this.totalRecebidoTemporario;
    const saldoAberto = Math.max(total - totalRecebido, 0);
    return {
      empresaId: 0,
      origemTipo: 'PEDIDO',
      origemId: this.pedidoId ?? 0,
      subtotal: total,
      desconto: 0,
      acrescimo: 0,
      frete: 0,
      total,
      totalRecebido,
      saldoAberto,
      percentualPago: total > 0 ? (totalRecebido / total) * 100 : 100,
      quitado: saldoAberto === 0,
    };
  }

  get percentualPagoView(): number {
    return Math.min(Math.max(Number(this.resumoFinanceiroView.percentualPago || 0), 0), 100);
  }

  get pagamentosView(): Array<RecebimentoResponse & { temporario?: boolean }> {
    if (this.pedidoId) {
      return this.recebimentos;
    }
    return this.pagamentosPretendidos.map((pagamento, index) => ({
      id: index,
      empresaId: 0,
      origemTipo: 'PEDIDO',
      origemId: 0,
      valor: pagamento.valor,
      formaPagamento: pagamento.formaPagamento,
      dataRecebimento: pagamento.dataRecebimento || null,
      status: 'CONFIRMADO',
      temporario: true,
    }));
  }

  get permissoesFluxo(): PedidoFluxoPermissoes {
    if (this.tipo === 'orcamentos' && this.pedidoId) {
      return {
        editarCliente: this.orcamentoEditavel,
        editarItens: this.orcamentoEditavel,
        observacoes: this.orcamentoEditavel,
        pagamentos: false,
        alterarStatus: this.orcamentoEditavel,
      };
    }
    return this.fluxoPedido?.permissoes || {
      editarCliente: true,
      editarItens: true,
      observacoes: true,
      pagamentos: true,
      alterarStatus: true,
    };
  }

  get statusOptionsFluxo(): string[] {
    return (this.fluxoPedido?.proximasTransicoes || []).map(transicao => transicao.status);
  }

  get transicoesFluxo(): { status: string; label: string; bloqueado: boolean; motivo?: string }[] {
    return (this.fluxoPedido?.proximasTransicoes || []).map(transicao => ({
      status: transicao.status,
      label: transicao.label,
      bloqueado: !transicao.permitida,
      motivo: transicao.motivo || undefined,
    }));
  }

  get hintsFluxo(): string[] {
    return this.transicoesFluxo
      .filter(transicao => transicao.bloqueado && !!transicao.motivo)
      .map(transicao => transicao.motivo!);
  }

  get pagamentoExcedeSaldo(): boolean {
    const valor = Number(this.pagamentoForm.value.valor || 0);
    return valor > 0 && valor > Number(this.resumoFinanceiroView.saldoAberto || 0);
  }

  get podeEditarAjustesFinanceiros(): boolean {
    if (this.tipo === 'orcamentos') {
      return !this.pedidoId || this.orcamentoEditavel;
    }
    return this.permissoesFluxo.pagamentos && this.ajustesFinanceirosForm.enabled;
  }

  get orcamentoEditavel(): boolean {
    return !this.orcamento || ['ABERTO', 'ENVIADO'].includes(this.orcamento.status);
  }

  get itensView(): ItemPedidoView[] {
    return this.itens.map((item, index) => this.itemView(item, index));
  }

  get clienteObrigatorio(): boolean {
    return this.tipo === 'pedidos';
  }

  get pendenciasSalvar(): string[] {
    const pendencias: string[] = [];
    if (this.clienteObrigatorio && !this.clienteConfirmado?.id) {
      pendencias.push('Informe o cliente.');
    }
    if (!this.itens.length) {
      pendencias.push('Adicione ao menos 1 item.');
    }
    return pendencias;
  }

  get podeSalvar(): boolean {
    return this.pendenciasSalvar.length === 0 && !this.pedidoId;
  }

  get podeConcluirRascunho(): boolean {
    if (this.tipo !== 'rascunhos') {
      return this.podeSalvar;
    }
    if (this.pedidoId) {
      return !!this.rascunho && !this.rascunho.convertidoParaId && this.itens.length > 0;
    }
    return this.podeSalvar;
  }

	  get clienteControl(): FormControl {
	    return this.form.get('clienteId') as FormControl;
	  }

	  get pagamentoFormaControl(): FormControl {
	    return this.pagamentoForm.get('formaPagamento') as FormControl;
	  }

	  get pagamentoValorControl(): FormControl {
	    return this.pagamentoForm.get('valor') as FormControl;
	  }

	  get acrescimoControl(): FormControl {
	    return this.ajustesFinanceirosForm.get('acrescimo') as FormControl;
	  }

	  get freteControl(): FormControl {
	    return this.ajustesFinanceirosForm.get('frete') as FormControl;
	  }

	  get descontoControl(): FormControl {
	    return this.ajustesFinanceirosForm.get('desconto') as FormControl;
	  }

	  get observacaoClienteControl(): FormControl<string> {
	    return this.form.get('observacaoCliente') as FormControl<string>;
  }

	  get observacaoInternaControl(): FormControl<string> {
	    return this.form.get('observacaoInterna') as FormControl<string>;
  }

  ngOnInit(): void {
    this.carregarUsuarioLogado();
    this.pagamentoFormaControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe((formaPagamento) => this.preencherValorRestante(formaPagamento));
    this.route.data.subscribe((data) => {
      this.tipo = data['tipo'] || 'rascunhos';
      if (this.tipo === 'pedidos') {
        this.carregarFormasPagamento();
      }
    });
    this.route.paramMap.subscribe((params) => {
      const rawId = params.get('id');
      const id = rawId ? Number(rawId) : null;
      this.pedidoId = id && !Number.isNaN(id) ? id : null;
      if (this.tipo === 'pedidos' && this.pedidoId) {
        this.carregarPedido(this.pedidoId);
      } else if (this.tipo === 'orcamentos' && this.pedidoId) {
        this.carregarOrcamento(this.pedidoId);
      } else if (this.tipo === 'rascunhos' && this.pedidoId) {
        this.carregarRascunho(this.pedidoId);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private carregarUsuarioLogado(): void {
    try {
      this.usuarioLogado = this.authService.getUsuario();
    } catch {
      this.usuarioLogado = null;
    }
  }

  carregarPedido(id: number): void {
    this.carregando = true;
    forkJoin({
      pedido: this.graficaService.buscarPedidoComercial(id),
      resumo: this.graficaService.buscarResumoFinanceiroPedido(id),
      recebimentos: this.graficaService.listarRecebimentosPedido(id),
      fluxo: this.graficaService.buscarFluxoPedidoComercial(id),
    }).pipe(finalize(() => this.carregando = false)).subscribe({
      next: ({ pedido, resumo, recebimentos, fluxo }) => {
        this.aplicarPedido(pedido);
        this.resumoFinanceiro = resumo;
        this.recebimentos = recebimentos?.content || [];
        this.aplicarFluxo(fluxo);
      },
      error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível carregar o pedido.')),
    });
  }

  private carregarFinanceiroPedido(id: number): void {
    forkJoin({
      resumo: this.graficaService.buscarResumoFinanceiroPedido(id),
      recebimentos: this.graficaService.listarRecebimentosPedido(id),
      fluxo: this.graficaService.buscarFluxoPedidoComercial(id),
    }).subscribe({
      next: ({ resumo, recebimentos, fluxo }) => {
        this.resumoFinanceiro = resumo;
        this.recebimentos = recebimentos?.content || [];
        this.aplicarFluxo(fluxo);
      },
      error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível atualizar o financeiro.')),
    });
  }

  private carregarFormasPagamento(): void {
    this.graficaService.listarFormasPagamento().subscribe({
      next: (formas) => this.formasPagamento = formas || [],
      error: (error) => {
        this.formasPagamento = [];
        this.toastr.error(this.errorMessage(error, 'Não foi possível carregar as formas de pagamento.'));
      },
    });
  }

  carregarOrcamento(id: number): void {
    this.carregando = true;
    this.graficaService.buscarOrcamentoComercial(id)
      .pipe(finalize(() => this.carregando = false))
      .subscribe({
        next: (orcamento) => this.aplicarOrcamento(orcamento),
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível carregar o orçamento.')),
      });
  }

  carregarRascunho(id: number): void {
    this.carregando = true;
    this.graficaService.buscarRascunhoComercial(id)
      .pipe(finalize(() => this.carregando = false))
      .subscribe({
        next: (rascunho) => this.aplicarRascunho(rascunho),
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível carregar o rascunho.')),
      });
  }

  private aplicarPedido(pedido: PedidoComercialDetalhe): void {
    this.pedido = pedido;
    this.itens = (pedido.itens || []).map((item) => this.itemComercialResolvido(item));
    this.clienteConfirmado = pedido.clienteId ? {
      id: pedido.clienteId,
      nome: pedido.clienteNome,
      documento: pedido.clienteDocumento,
      telefone: pedido.clienteTelefone,
      email: pedido.clienteEmail,
    } : null;
    this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
    this.carregarClienteConfirmado(pedido.clienteId);
    this.observacaoClienteControl.setValue(pedido.observacaoCliente || '', { emitEvent: false });
    this.observacaoInternaControl.setValue(pedido.observacaoInterna || '', { emitEvent: false });
    this.observacaoClienteSalva = pedido.observacaoCliente || '';
    this.observacaoInternaSalva = pedido.observacaoInterna || '';
    this.observacaoClienteSalvaFlag = false;
    this.observacaoInternaSalvaFlag = false;
    this.aplicarAjustesFinanceirosForm({
      desconto: pedido.desconto,
      acrescimo: pedido.acrescimo,
      frete: pedido.frete,
    });
    this.trocandoCliente = false;
  }

  private aplicarOrcamento(orcamento: OrcamentoComercialDetalhe): void {
    this.orcamento = orcamento;
    this.itens = (orcamento.itens || []).map((item) => this.itemComercialResolvido(item));
    this.clienteConfirmado = orcamento.clienteId ? {
      id: orcamento.clienteId,
      nome: orcamento.nomeCliente,
      telefone: orcamento.telefoneCliente,
      email: orcamento.emailCliente,
    } : null;
    this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
    this.carregarClienteConfirmado(orcamento.clienteId);
    this.observacaoClienteControl.setValue(orcamento.observacaoCliente || '', { emitEvent: false });
    this.observacaoInternaControl.setValue(orcamento.observacaoInterna || '', { emitEvent: false });
    this.observacaoClienteSalva = orcamento.observacaoCliente || '';
    this.observacaoInternaSalva = orcamento.observacaoInterna || '';
    this.observacaoClienteSalvaFlag = false;
    this.observacaoInternaSalvaFlag = false;
    this.validadeControl.setValue(this.parseDateLocal(orcamento.validoAte), { emitEvent: false });
    this.validadeControl.markAsPristine();
    this.aplicarAjustesFinanceirosForm({
      desconto: orcamento.desconto,
      acrescimo: orcamento.acrescimo,
      frete: orcamento.frete,
    });
    this.trocandoCliente = false;
    if (this.orcamentoEditavel) {
      this.ajustesFinanceirosForm.enable({ emitEvent: false });
      this.validadeControl.enable({ emitEvent: false });
    } else {
      this.ajustesFinanceirosForm.disable({ emitEvent: false });
      this.validadeControl.disable({ emitEvent: false });
    }
  }

  private aplicarRascunho(rascunho: RascunhoComercialResponse): void {
    this.rascunho = rascunho;
    this.itens = (rascunho.itens || []).map((item) => this.itemComercialResolvido(item));
    this.clienteConfirmado = rascunho.clienteId ? {
      id: rascunho.clienteId,
      nome: rascunho.clienteNome,
    } : null;
    this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
    this.carregarClienteConfirmado(rascunho.clienteId);
    this.observacaoClienteControl.setValue(rascunho.observacaoCliente || '', { emitEvent: false });
    this.observacaoInternaControl.setValue(rascunho.observacaoInterna || '', { emitEvent: false });
    this.observacaoClienteSalva = rascunho.observacaoCliente || '';
    this.observacaoInternaSalva = rascunho.observacaoInterna || '';
    this.observacaoClienteSalvaFlag = false;
    this.observacaoInternaSalvaFlag = false;
    this.aplicarAjustesFinanceirosForm({
      desconto: rascunho.desconto,
      acrescimo: rascunho.acrescimo,
      frete: rascunho.frete,
    });
    this.trocandoCliente = false;
  }

  private itemComercialResolvido(item: ComercialItemResponse): ComposicaoComercialResolvida['itens'][number] {
    const snapshot = item.snapshotComercial || item.snapshotGrafica || item.snapshotCalculadora || null;
    return {
      origem: this.normalizarOrigemItem(item.origem || item.origemProduto),
      catalogoProdutoId: Number(item.catalogoProdutoId || item.produtoOrigemId || 0),
      codigoProduto: item.codigoProduto || null,
      nomeProduto: item.nomeProduto || item.produtoNome || null,
      descricaoProduto: item.descricaoProduto || item.descricaoProdutoSnapshot || null,
      caracteristicasResumo: item.caracteristicasResumo || item.caracteristicasResumoSnapshot || null,
      unidadeVenda: item.unidadeVenda || item.unidadeVendaSnapshot || 'UN',
      quantidade: Number(item.quantidade || 1),
      valorUnitario: Number(item.valorUnitario ?? item.precoUnitario ?? 0),
      desconto: Number(item.desconto || 0),
      acrescimo: Number(item.acrescimo || 0),
      valorTotal: Number(item.valorTotal || item.subtotal || item.subtotalEstimado || 0),
      observacao: item.observacao || null,
      snapshotComercial: snapshot,
      ordem: item.ordem ?? null,
    };
  }

  private aplicarFluxo(fluxo: PedidoFluxoResponse): void {
    this.fluxoPedido = fluxo;
    this.statusControl.setValue(fluxo.statusAtual, { emitEvent: false });
    if (fluxo.permissoes.pagamentos) {
      this.pagamentoForm.enable({ emitEvent: false });
      this.ajustesFinanceirosForm.enable({ emitEvent: false });
    } else {
      this.pagamentoForm.disable({ emitEvent: false });
      this.ajustesFinanceirosForm.disable({ emitEvent: false });
    }
  }

  private aplicarAjustesFinanceirosForm(ajustes: {
    desconto?: number | null;
    acrescimo?: number | null;
    frete?: number | null;
  }, marcarLimpo = true): void {
    this.ajustesFinanceirosForm.patchValue({
      acrescimo: this.valorMoeda(ajustes.acrescimo),
      frete: this.valorMoeda(ajustes.frete),
      desconto: this.valorMoeda(ajustes.desconto),
    });
    if (marcarLimpo) {
      this.ajustesFinanceirosForm.markAsPristine();
      this.ajustesFinanceirosForm.markAsUntouched();
    }
  }

  private ajustesFinanceirosPayload(): PedidoAjustesFinanceirosRequest {
    return {
      acrescimo: this.valorMoeda(this.ajustesFinanceirosForm.value.acrescimo),
      frete: this.valorMoeda(this.ajustesFinanceirosForm.value.frete),
      desconto: this.valorMoeda(this.ajustesFinanceirosForm.value.desconto),
    };
  }

  private preencherValorRestante(formaPagamento: string | null): void {
    if (!formaPagamento || !this.permissoesFluxo.pagamentos || this.pagamentoForm.disabled) return;
    if (!this.temPagamentoValidoAnterior()) return;

    const saldoAberto = this.valorMoeda(this.resumoFinanceiroView.saldoAberto);
    const valorAtual = this.valorMoeda(this.pagamentoForm.value.valor);
    if (saldoAberto <= 0 || valorAtual > 0) return;

    this.pagamentoValorControl.setValue(saldoAberto);
  }

  private temPagamentoValidoAnterior(): boolean {
    return this.pagamentosPretendidos.some((pagamento) => this.valorMoeda(pagamento.valor) > 0)
      || this.recebimentos.some((recebimento) =>
        recebimento.status !== 'CANCELADO' && this.valorMoeda(recebimento.valor) > 0
      );
  }

  private valorMoeda(valor: unknown): number {
    return Math.round((Number(valor) || 0) * 100) / 100;
  }

  abrirWizard(): void {
    this.abrirWizardProduto();
  }

  abrirBuscaRapida(): void {
    this.dialog.open(GraficaProdutoBuscaRapidaDialogComponent, {
      width: '860px',
      maxWidth: '96vw',
      autoFocus: true,
      restoreFocus: false,
    }).afterClosed().subscribe((item?: GraficaBuscaRapidaItem | null) => {
      if (item?.tipo === 'PRODUTO') {
        this.abrirWizardProduto(item.produto);
      } else if (item?.tipo === 'SERVICO') {
        this.abrirWizardServico(item.servico);
      }
    });
  }

  private abrirWizardProduto(produtoPreSelecionado?: GraficaProduto): void {
    this.dialog.open(GraficaProdutoWizardDialogComponent, {
      width: 'min(1720px, calc(100vw - 104px))',
      height: 'min(900px, calc(100dvh - 96px))',
      maxWidth: '96vw',
      maxHeight: '92vh',
      panelClass: ['dialog-grande', 'grafica-produto-wizard-panel'],
      data: { cliente: this.clientePayload(), produtoPreSelecionado },
    }).afterClosed().subscribe((composicao?: ComposicaoComercialResolvida) => {
      if (composicao?.itens?.length) {
        this.itens = [...this.itens, ...composicao.itens];
      }
    });
  }

  private abrirWizardServico(servico: GraficaServico): void {
    this.dialog.open(GraficaServicoWizardDialogComponent, {
      width: '560px',
      maxWidth: '96vw',
      panelClass: ['grafica-servico-wizard-panel'],
      autoFocus: true,
      restoreFocus: false,
      data: { cliente: this.clientePayload(), servico },
    }).afterClosed().subscribe((composicao?: ComposicaoComercialResolvida) => {
      if (composicao?.itens?.length) {
        this.itens = [...this.itens, ...composicao.itens];
      }
    });
  }

  remover(index: number): void {
    if (index < 0 || index >= this.itens.length) return;
    this.itens = this.itens.filter((_, itemIndex) => itemIndex !== index);
  }

  salvar(): void {
    this.salvarComo(this.tipo);
  }

  salvarComo(destino: ComercialBetaTipo): void {
    if (!this.podeSalvar) return;
    const composicao = this.comercialComposicaoRequest(destino);
    if (!composicao) return;
    const { origemId, origemTipo, body } = composicao;
    const action = destino === 'pedidos'
      ? origemTipo === 'SERVICO'
        ? this.graficaService.criarPedidoServico(origemId, body)
        : this.graficaService.criarPedidoGrafico(origemId, body)
      : destino === 'orcamentos'
        ? origemTipo === 'SERVICO'
          ? this.graficaService.criarOrcamentoServico(origemId, body)
          : this.graficaService.criarOrcamentoGrafico(origemId, body)
        : origemTipo === 'SERVICO'
          ? this.graficaService.criarRascunhoServico(origemId, body)
          : this.graficaService.criarRascunhoGrafico(origemId, body);
    this.salvando = true;
    action.pipe(finalize(() => this.salvando = false)).subscribe({
      next: (response) => this.navegarAposCriacao(destino, response),
      error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível salvar.')),
    });
  }

  concluirRascunho(destino: 'pedidos' | 'orcamentos'): void {
    if (this.tipo !== 'rascunhos') return;
    if (!this.pedidoId) {
      this.salvarComo(destino);
      return;
    }
    if (!this.podeConcluirRascunho) return;
    const action = destino === 'pedidos'
      ? this.graficaService.converterRascunhoParaPedido(this.pedidoId)
      : this.graficaService.converterRascunhoParaOrcamento(this.pedidoId);
    this.salvando = true;
    action.pipe(finalize(() => this.salvando = false)).subscribe({
      next: (response) => this.navegarAposCriacao(destino, response),
      error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível converter o rascunho.')),
    });
  }

  private comercialComposicaoRequest(destino: ComercialBetaTipo): { origemTipo: 'PRODUTO' | 'SERVICO'; origemId: number; body: GraficaComercialComposicaoRequest } | null {
    const principalIndex = this.itens.findIndex((item) => {
      const snapshotItem = this.safeJson(item.snapshotComercial);
      return Number(this.produtoGraficoIdSnapshot(snapshotItem) || 0) > 0
        || Number(this.servicoGraficoIdSnapshot(snapshotItem) || 0) > 0;
    });
    const primeiro = this.itens[principalIndex >= 0 ? principalIndex : 0];
    const snapshot = this.safeJson(primeiro?.snapshotComercial);
    const produtoGraficoId = Number(this.produtoGraficoIdSnapshot(snapshot) || 0);
    const servicoGraficoId = Number(this.servicoGraficoIdSnapshot(snapshot) || 0);
    const precificacao = snapshot?.entrada || snapshot?.precificacao || {};
    const adicionais = this.itens.filter((_, index) => index !== (principalIndex >= 0 ? principalIndex : 0)).map((item) => ({
      linhaComercial: true,
      catalogoProdutoId: item.catalogoProdutoId,
      codigoProduto: item.codigoProduto || null,
      nomeProduto: item.nomeProduto || null,
      descricaoProduto: item.caracteristicasResumo || null,
      unidadeVenda: item.unidadeVenda || 'UN',
      quantidade: Number(item.quantidade || 1),
      valorUnitario: Number(item.valorUnitario || 0),
      desconto: Number(item.desconto || 0),
      acrescimo: Number(item.acrescimo || 0),
      valorTotal: Number(item.valorTotal || 0),
      observacao: item.observacao || null,
      snapshot: this.safeJson(item.snapshotComercial) || null,
    }));
    if (!produtoGraficoId && !servicoGraficoId) return null;
    const ajustesFinanceiros = this.ajustesFinanceirosPayload();
    const body: GraficaComercialComposicaoRequest = {
      clienteId: this.clienteConfirmado?.id || null,
      clienteNome: this.clienteConfirmado?.nome || null,
      clienteTelefone: this.clienteConfirmado?.telefone || null,
      clienteEmail: this.clienteConfirmado?.email || null,
      observacaoCliente: this.form.value.observacaoCliente || null,
      observacaoInterna: this.form.value.observacaoInterna || null,
      desconto: ajustesFinanceiros.desconto,
      acrescimo: ajustesFinanceiros.acrescimo,
      frete: ajustesFinanceiros.frete,
      precificacao: {
        selecoes: this.selecoesDoSnapshot(snapshot),
        quantidade: precificacao?.quantidade || Number(primeiro.quantidade),
        largura: precificacao?.largura || null,
        altura: precificacao?.altura || null,
        unidadeDimensao: precificacao?.unidadeDimensao || null,
      },
      adicionais,
      pagamentosPretendidos: destino === 'pedidos' ? this.pagamentosPretendidos : [],
    };
    return {
      origemTipo: servicoGraficoId ? 'SERVICO' : 'PRODUTO',
      origemId: servicoGraficoId || produtoGraficoId,
      body,
    };
  }

  private navegarAposCriacao(destino: ComercialBetaTipo, response: GraficaComercialDestinoResponse): void {
    if (response?.id && destino !== 'rascunhos') {
      this.router.navigate(['/page/grafica/comercial-beta', destino, response.id]);
      return;
    }
    this.router.navigate(['/page/grafica/comercial-beta', destino]);
  }

  salvarAjustesFinanceiros(): void {
    if (this.tipo === 'orcamentos') {
      if (!this.pedidoId || !this.orcamentoEditavel || this.ajustesFinanceirosForm.invalid) {
        this.ajustesFinanceirosForm.markAllAsTouched();
        return;
      }
      this.salvandoAjustesFinanceiros = true;
      this.graficaService.alterarAjustesComerciaisOrcamento(this.pedidoId, this.ajustesFinanceirosPayload())
        .pipe(finalize(() => this.salvandoAjustesFinanceiros = false))
        .subscribe({
          next: (orcamento) => this.aplicarOrcamento(orcamento),
          error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível salvar os ajustes do orçamento.')),
        });
      return;
    }
    if (!this.pedidoId || !this.permissoesFluxo.pagamentos || this.ajustesFinanceirosForm.invalid) {
      this.ajustesFinanceirosForm.markAllAsTouched();
      return;
    }
    this.salvandoAjustesFinanceiros = true;
    this.graficaService.alterarAjustesFinanceirosPedido(this.pedidoId, this.ajustesFinanceirosPayload())
      .pipe(finalize(() => this.salvandoAjustesFinanceiros = false))
      .subscribe({
        next: (pedido) => {
          this.aplicarPedido(pedido);
          this.carregarFinanceiroPedido(this.pedidoId!);
        },
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível salvar os ajustes financeiros.')),
      });
  }

  adicionarPagamento(): void {
    if (this.pagamentoForm.invalid || this.pagamentoExcedeSaldo || !this.permissoesFluxo.pagamentos) {
      this.pagamentoForm.markAllAsTouched();
      return;
    }
    const pagamento: RecebimentoPretendidoRequest = {
      formaPagamento: this.pagamentoForm.value.formaPagamento!,
      valor: Number(this.pagamentoForm.value.valor || 0),
    };
    if (!this.pedidoId) {
      this.pagamentosPretendidos = [...this.pagamentosPretendidos, pagamento];
      this.pagamentoForm.reset();
      return;
    }

    this.salvandoPagamento = true;
    this.graficaService.registrarRecebimentoPedido({
      ...pagamento,
      origemTipo: 'PEDIDO',
      origemId: this.pedidoId,
      empresaId: this.resumoFinanceiro?.empresaId || null,
    }).pipe(finalize(() => this.salvandoPagamento = false)).subscribe({
      next: () => {
        this.pagamentoForm.reset();
        this.carregarFinanceiroPedido(this.pedidoId!);
      },
      error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível adicionar o pagamento.')),
    });
  }

  cancelarPagamento(pagamento: RecebimentoResponse & { temporario?: boolean }, index: number): void {
    if (!this.permissoesFluxo.pagamentos) return;
    if (pagamento.temporario || !this.pedidoId) {
      this.pagamentosPretendidos = this.pagamentosPretendidos.filter((_, itemIndex) => itemIndex !== index);
      return;
    }
    this.salvandoPagamento = true;
    this.graficaService.cancelarRecebimento(pagamento.id, 'Cancelado pela tela de pedido')
      .pipe(finalize(() => this.salvandoPagamento = false))
      .subscribe({
        next: () => this.carregarFinanceiroPedido(this.pedidoId!),
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível cancelar o pagamento.')),
      });
  }

  voltar(): void {
    this.router.navigate(['/page/grafica/comercial-beta', this.tipo]);
  }

  buscarClientes = (termo: string): Observable<any[]> =>
    this.clienteService.buscarPorNome(termo).pipe(map((res: any) => res.content || []));

  mostrarCliente = (cliente: any): string =>
    cliente ? `${cliente.nome}${cliente.telefone ? ' - ' + cliente.telefone : ''}` : '';

  formaPagamentoLabel(forma: string): string {
    const labels: Record<string, string> = {
      DINHEIRO: 'Dinheiro',
      PIX: 'Pix',
      CARTAO_CREDITO: 'Cartão de crédito',
      CARTAO_DEBITO: 'Cartão de débito',
      TRANSFERENCIA: 'Transferência',
      BOLETO: 'Boleto',
      OUTRO: 'Outro',
    };
    return labels[forma] || forma;
  }

  confirmarClienteSelecionado(): void {
    const selecionado = this.clienteControl.value;
    const clienteId = selecionado?.id ?? selecionado?.clienteId;
    if (!clienteId) {
      return;
    }

    this.clienteService.buscarPorId(clienteId).pipe(take(1)).subscribe({
      next: (clienteCompleto) => {
        this.clienteConfirmado = this.normalizarClienteCard(clienteCompleto);
        this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
        this.trocandoCliente = false;
      },
    });
  }

  private carregarClienteConfirmado(clienteId?: number | null): void {
    if (!clienteId) {
      return;
    }
    this.clienteService.buscarPorId(clienteId).pipe(take(1)).subscribe({
      next: (clienteCompleto) => {
        this.clienteConfirmado = {
          ...this.clienteConfirmado,
          ...this.normalizarClienteCard(clienteCompleto),
        };
        this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
      },
      error: () => {
        // Mantém o snapshot do pedido/orçamento quando o cadastro completo não puder ser carregado.
      },
    });
  }

  private normalizarClienteCard(cliente: any): any {
    if (!cliente) {
      return null;
    }
    return {
      ...cliente,
      id: cliente.id ?? cliente.clienteId,
      endereco: cliente.endereco ?? cliente.enderecoPrincipal ?? null,
    };
  }

  iniciarTrocaCliente(): void {
    this.trocandoCliente = true;
    this.clienteControl.reset(null, { emitEvent: false });
  }

  cancelarTrocaCliente(): void {
    this.trocandoCliente = false;
    if (this.clienteConfirmado) {
      this.clienteControl.setValue(this.clienteConfirmado, { emitEvent: false });
    }
  }

  onCriarCliente(): void {
    this.router.navigate(['/page/cliente/criar'], {
      queryParams: { retorno: `/page/grafica/comercial-beta/${this.tipo}/novo` },
    });
  }

  confirmarObservacaoCliente(): void {
    if (!this.permissoesFluxo.observacoes) return;
    if (this.tipo === 'orcamentos' && this.pedidoId) {
      this.graficaService.alterarObservacaoOrcamento(this.pedidoId, this.observacaoClienteControl.value || null)
        .subscribe({
          next: (orcamento) => {
            this.aplicarOrcamento(orcamento);
            this.observacaoClienteSalvaFlag = true;
          },
          error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível salvar a observação.')),
        });
      return;
    }
    this.observacaoClienteSalva = this.observacaoClienteControl.value || '';
    this.observacaoClienteSalvaFlag = true;
  }

  confirmarObservacaoInterna(): void {
    if (!this.permissoesFluxo.observacoes) return;
    if (this.tipo === 'orcamentos' && this.pedidoId) {
      this.graficaService.alterarObservacaoInternaOrcamento(this.pedidoId, this.observacaoInternaControl.value || null)
        .subscribe({
          next: (orcamento) => {
            this.aplicarOrcamento(orcamento);
            this.observacaoInternaSalvaFlag = true;
          },
          error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível salvar a observação interna.')),
        });
      return;
    }
    this.observacaoInternaSalva = this.observacaoInternaControl.value || '';
    this.observacaoInternaSalvaFlag = true;
  }

  alterarStatusSelecionado(): void {
    const status = this.statusControl.value;
    if (status) {
      this.alterarStatus(status);
    }
  }

  alterarStatus(status: string): void {
    if (!this.pedidoId || !this.permissoesFluxo.alterarStatus) return;
    this.carregandoStatus = true;
    this.graficaService.alterarStatusPedidoComercial(this.pedidoId, status)
      .pipe(finalize(() => this.carregandoStatus = false))
      .subscribe({
        next: (pedido) => {
          this.aplicarPedido(pedido);
          this.carregarFinanceiroPedido(this.pedidoId!);
          this.toastr.success('Status atualizado.');
        },
        error: (error) => {
          this.statusControl.setValue(this.fluxoPedido?.statusAtual || null, { emitEvent: false });
          this.toastr.error(this.errorMessage(error, 'Não foi possível atualizar o status.'));
        },
      });
  }

  alterarStatusOrcamento(status: string): void {
    if (!this.pedidoId || !this.orcamentoEditavel) return;
    this.carregandoStatus = true;
    this.graficaService.alterarStatusOrcamentoComercial(this.pedidoId, status)
      .pipe(finalize(() => this.carregandoStatus = false))
      .subscribe({
        next: (orcamento) => {
          this.aplicarOrcamento(orcamento);
          this.toastr.success('Status do orçamento atualizado.');
        },
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível atualizar o orçamento.')),
      });
  }

  aprovarOrcamentoECriarPedido(): void {
    if (!this.pedidoId || !this.orcamentoEditavel) return;
    this.carregandoStatus = true;
    this.graficaService.aprovarOrcamentoECriarPedido(this.pedidoId)
      .pipe(finalize(() => this.carregandoStatus = false))
      .subscribe({
        next: (pedido) => {
          this.toastr.success('Pedido criado a partir do orçamento.');
          this.router.navigate(['/page/grafica/comercial-beta/pedidos', pedido.pedidoId]);
        },
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível aprovar o orçamento.')),
      });
  }

  salvarValidadeOrcamento(): void {
    if (!this.pedidoId || !this.orcamentoEditavel || !this.validadeControl.value) return;
    this.salvandoValidade = true;
    this.graficaService.alterarValidadeOrcamento(this.pedidoId, this.toDateIso(this.validadeControl.value))
      .pipe(finalize(() => this.salvandoValidade = false))
      .subscribe({
        next: (orcamento) => this.aplicarOrcamento(orcamento),
        error: (error) => this.toastr.error(this.errorMessage(error, 'Não foi possível alterar a validade.')),
      });
  }

  abrirImpressaoPedido(formato: 'completo' | 'duas-vias' | 'etiqueta'): void {
    if (!this.pedidoId) return;
    const comandos = formato === 'completo'
      ? ['/page/grafica/comercial-beta/pedidos', this.pedidoId, 'impressao']
      : ['/page/grafica/comercial-beta/pedidos', this.pedidoId, 'impressao', formato];
    this.router.navigate(comandos);
  }

  abrirWhatsAppPedido(): void {
    if (!this.pedidoId) return;
    this.router.navigate(['/page/grafica/comercial-beta/pedidos', this.pedidoId, 'whatsapp']);
  }

  abrirImpressaoOrcamento(): void {
    if (!this.pedidoId) return;
    this.router.navigate(['/page/grafica/comercial-beta/orcamentos', this.pedidoId, 'impressao']);
  }

  abrirWhatsAppOrcamento(): void {
    if (!this.pedidoId) return;
    this.router.navigate(['/page/grafica/comercial-beta/orcamentos', this.pedidoId, 'whatsapp']);
  }

  private safeJson(value?: string | null): any {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }

  private itemView(item: ComposicaoComercialResolvida['itens'][number], index: number): ItemPedidoView {
    const snapshot = this.safeJson(item.snapshotComercial);
    const tipoLinha = this.tipoLinhaItem(item, snapshot, index);
    const valorContexto = this.contextoPrecoItem(item, snapshot);
    const subtotalResumo = this.resumoCalculoItem(item, snapshot, valorContexto);
    return {
      descricao: this.nomeItem(item, tipoLinha),
      especificacao: item.caracteristicasResumo || this.especificacaoDoSnapshot(snapshot),
      detalhes: this.detalhesItem(item, snapshot, tipoLinha, valorContexto),
      tipoLinha,
      valorContexto,
      subtotalResumo,
      quantidade: Number(item.quantidade || 1),
      valor: Number(item.valorUnitario || 0),
      subTotal: Number(item.valorTotal || 0),
      sourceIndex: index,
    };
  }

  private nomeItem(item: ComposicaoComercialResolvida['itens'][number], tipoLinha: ItemPedidoView['tipoLinha']): string {
    const nome = item.nomeProduto || 'Produto gráfico';
    if ((tipoLinha === 'SERVICO' || tipoLinha === 'ACABAMENTO') && !/^servi[cç]o:|^acabamento:/i.test(nome)) {
      return `${tipoLinha === 'SERVICO' ? 'Serviço' : 'Acabamento'}: ${nome}`;
    }
    return nome;
  }

  private tipoLinhaItem(item: ComposicaoComercialResolvida['itens'][number], snapshot: any, index: number): ItemPedidoView['tipoLinha'] {
    const origem = String(snapshot?.tipo || snapshot?.origem || '').toUpperCase();
    const nome = String(item.nomeProduto || '');
    if (origem.includes('SERVICO') || origem.includes('SERVIÇO') || /^servi[cç]o:/i.test(nome)) return 'SERVICO';
    if (origem.includes('ACABAMENTO') || /^acabamento:/i.test(nome)) return 'ACABAMENTO';
    return 'PRINCIPAL';
  }

  private detalhesItem(item: ComposicaoComercialResolvida['itens'][number], snapshot: any, tipoLinha: ItemPedidoView['tipoLinha'], valorContexto: string | null): string[] {
    const detalhes: string[] = [];
    if (tipoLinha !== 'PRINCIPAL') {
      const servicoPrincipal = tipoLinha === 'SERVICO' && Number(this.servicoGraficoIdSnapshot(snapshot) || 0) > 0;
      detalhes.push(servicoPrincipal ? 'Serviço do pedido' : tipoLinha === 'SERVICO' ? 'Serviço adicional vinculado ao item' : 'Acabamento vinculado ao item');
    }
    if (valorContexto) {
      detalhes.push(`Cobrança: ${valorContexto}`);
    }
    const area = Number(snapshot?.precificacao?.areaFaturada ?? NaN);
    if (Number.isFinite(area) && area > 0) {
      detalhes.push(`Área faturada: ${this.formatarNumero(area)} m²`);
    }
    const comprimento = this.comprimentoFaturado(snapshot);
    if (comprimento) {
      detalhes.push(`Comprimento faturado: ${comprimento} m`);
    }
    return [...new Set(detalhes)];
  }

  private especificacaoDoSnapshot(snapshot: any): string | null {
    const produto = snapshot?.produto || {};
    const partes = [
      produto.material?.nome,
      produto.formato?.nome || this.medidasSnapshot(snapshot),
      produto.cor?.nome,
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : null;
  }

  private contextoPrecoItem(item: ComposicaoComercialResolvida['itens'][number], snapshot: any): string | null {
    const tipo = String(snapshot?.precificacao?.tipo || snapshot?.tipo || '').toUpperCase();
    const valor = Number(item.valorUnitario || snapshot?.precificacao?.valorUnitario || 0);
    if (this.isMetroLinearSnapshot(snapshot)) return `${this.formatarMoedaCurta(valor)}/m`;
    if (tipo.includes('METRO_QUADRADO')) return `${this.formatarMoedaCurta(valor)}/m²`;
    if (tipo.includes('LOTE')) return `${this.formatarMoedaCurta(Number(item.valorTotal || valor))} por lote`;
    if (tipo.includes('FAIXA') || tipo.includes('QUANTIDADE')) return `${this.formatarMoedaCurta(valor)}/un`;
    if (tipo.includes('FIXO') || this.tipoLinhaItem(item, snapshot, 1) !== 'PRINCIPAL') return `${this.formatarMoedaCurta(Number(item.valorTotal || valor))} fixo`;
    return item.unidadeVenda ? `${this.formatarMoedaCurta(valor)}/${String(item.unidadeVenda).toLowerCase()}` : null;
  }

  private resumoCalculoItem(item: ComposicaoComercialResolvida['itens'][number], snapshot: any, valorContexto: string | null): string | null {
    const total = this.formatarMoedaCurta(Number(item.valorTotal || 0));
    const tipo = String(snapshot?.precificacao?.tipo || snapshot?.tipo || '').toUpperCase();
    const area = Number(snapshot?.precificacao?.areaFaturada ?? NaN);
    const comprimento = this.comprimentoFaturado(snapshot);
    if (this.isMetroLinearSnapshot(snapshot) && comprimento) {
      return `${comprimento} m × ${this.formatarMoedaCurta(Number(item.valorUnitario || 0))} = ${total}`;
    }
    if (tipo.includes('METRO_QUADRADO') && Number.isFinite(area) && area > 0) {
      return `${this.formatarNumero(area)} m² × ${this.formatarMoedaCurta(Number(item.valorUnitario || 0))} = ${total}`;
    }
    if (tipo.includes('LOTE')) {
      return `Lote ${this.formatarNumero(Number(item.quantidade || 0))} un = ${total}`;
    }
    if (tipo.includes('FAIXA') || tipo.includes('QUANTIDADE')) {
      return `${this.formatarNumero(Number(item.quantidade || 0))} × ${this.formatarMoedaCurta(Number(item.valorUnitario || 0))} = ${total}`;
    }
    if (tipo.includes('FIXO') || valorContexto?.includes('fixo')) {
      return `Valor fixo = ${total}`;
    }
    return null;
  }

  private medidasSnapshot(snapshot: any): string | null {
    const entrada = snapshot?.entrada;
    if (!entrada?.largura || !entrada?.altura) return null;
    return `${this.medidaEmMetros(entrada.largura, entrada.unidadeDimensao)} x ${this.medidaEmMetros(entrada.altura, entrada.unidadeDimensao)} m`;
  }

  private comprimentoFaturado(snapshot: any): string | null {
    const areaFaturada = Number(snapshot?.precificacao?.areaFaturada ?? NaN);
    if (!this.isMetroLinearSnapshot(snapshot) || !Number.isFinite(areaFaturada) || areaFaturada <= 0) return null;
    return this.formatarNumero(areaFaturada);
  }

  private isMetroLinearSnapshot(snapshot: any): boolean {
    const tipo = String(snapshot?.precificacao?.tipo || snapshot?.tipo || '').toUpperCase();
    if (tipo.includes('METRO_LINEAR')) return true;
    const detalhes = Array.isArray(snapshot?.detalhes) ? snapshot.detalhes : [];
    return detalhes.some((detalhe: unknown) => String(detalhe).toUpperCase().includes('MODO: LINEAR'));
  }

  private medidaEmMetros(valor: number | string, unidade?: string | null): string {
    const numero = Number(valor);
    const fator = unidade === 'CENTIMETRO' ? 100 : unidade === 'MILIMETRO' ? 1000 : 1;
    return this.formatarNumero(numero / fator);
  }

  private formatarNumero(valor: number): string {
    return valor.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
  }

  private formatarMoedaCurta(valor: number): string {
    return valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatarMoeda(valor: number | string | null | undefined): string {
    const numero = Number(valor);
    if (!Number.isFinite(numero)) return '-';
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  private formatarData(valor: string): string {
    const [ano, mes, dia] = valor.split('-');
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : valor;
  }

  private parseDateLocal(valor?: string | null): Date | null {
    if (!valor) return null;
    const [ano, mes, dia] = valor.split('-').map(Number);
    if (!ano || !mes || !dia) return null;
    return new Date(ano, mes - 1, dia);
  }

  private toDateIso(valor: Date): string {
    const ano = valor.getFullYear();
    const mes = String(valor.getMonth() + 1).padStart(2, '0');
    const dia = String(valor.getDate()).padStart(2, '0');
    return `${ano}-${mes}-${dia}`;
  }

  private normalizarOrigemItem(origem?: string | null): 'CATALOGO' | 'GRAFICA' | 'SMARTCALC' {
    const valor = String(origem || '').toUpperCase();
    if (valor === 'GRAFICA' || valor === 'SMARTCALC') {
      return valor;
    }
    return 'CATALOGO';
  }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || error?.error?.userMessage || error?.message || fallback;
  }

  private selecoesDoSnapshot(snapshot: any): Record<string, string> {
    const selecoes = Array.isArray(snapshot?.selecoes)
      ? snapshot.selecoes
      : Array.isArray(snapshot?.entrada?.selecoesResolvidas)
        ? snapshot.entrada.selecoesResolvidas
        : Array.isArray(snapshot?.precificacao?.selecoesResolvidas)
          ? snapshot.precificacao.selecoesResolvidas
          : [];
    return selecoes.reduce((acc: Record<string, string>, selecao: any) => {
      if (selecao.parametroCodigo && selecao.opcaoCodigo) {
        acc[selecao.parametroCodigo] = selecao.opcaoCodigo;
      }
      return acc;
    }, {});
  }

  private produtoGraficoIdSnapshot(snapshot: any): number | null {
    return snapshot?.produtoGraficoId ?? snapshot?.produto?.id ?? null;
  }

  private servicoGraficoIdSnapshot(snapshot: any): number | null {
    return snapshot?.servicoGraficoId ?? snapshot?.servicoId ?? snapshot?.servico?.id ?? null;
  }

  private clientePayload(): any {
    return {
      clienteId: this.clienteConfirmado?.id || null,
      clienteNome: this.clienteConfirmado?.nome || null,
      clienteTelefone: this.clienteConfirmado?.telefone || null,
      clienteEmail: this.clienteConfirmado?.email || null,
      observacaoCliente: this.form.value.observacaoCliente || null,
      observacaoInterna: this.form.value.observacaoInterna || null,
    };
  }
}

@Component({
  selector: 'app-grafica-produto-wizard-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule, InputNumericoComponent],
  template: `
    <div class="wizard-shell">
      <div class="dialog-header">
        <div class="title-stack">
          <h2 mat-dialog-title class="m-b-0">
            <span class="title-main">Adicionar item</span>
            <span class="title-divider">-</span>
            <span class="title-step" aria-live="polite">{{ currentStepLabel }}</span>
          </h2>
        </div>
        <button mat-icon-button mat-dialog-close aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <mat-divider></mat-divider>

      <mat-dialog-content class="wizard-body">
        <mat-horizontal-stepper [linear]="true" #stepper class="wizard-stepper" (selectionChange)="onStepSelectionChange($event)">
          <mat-step [stepControl]="produtoForm" label="Produto/Serviço e Variação">
            <form [formGroup]="produtoForm" class="step-inner step-full produto-step">
                    <div class="funnel-grid">
                      <section class="funnel-column">
                        <div class="funnel-header">
                          <div class="rev-title">Produto ou serviço</div>
                          <mat-form-field appearance="outline" class="funnel-search" subscriptSizing="dynamic">
                            <input
                              matInput
                              type="search"
                              placeholder="Buscar"
                              [(ngModel)]="filtrosFunil.produto"
                              [ngModelOptions]="{ standalone: true }"
                              (ngModelChange)="buscarNaColunaFunil('produto', $event)" />
                            <mat-icon matSuffix>search</mat-icon>
                          </mat-form-field>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-list">
                          <button
                            mat-button
                            type="button"
                            class="funnel-option"
                            *ngFor="let opcao of opcoesPaginadas('produto')"
                            [class.active]="opcao.servico ? servicoAtual?.id === opcao.servico.id : produtoNomeSelecionado === opcao.label"
                            (click)="selecionarProdutoFunil(opcao)">
                            <span class="funnel-option-label">
                              <span>{{ opcao.label }}</span>
                              <small *ngIf="opcao.servico">Serviço</small>
                            </span>
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                          <div class="empty-state compact" *ngIf="carregandoFunil">
                            <mat-icon>hourglass_empty</mat-icon>
                            <span>Carregando itens...</span>
                          </div>
                          <div class="empty-state compact" *ngIf="!carregandoFunil && !opcoesFunil('produto').length">
                            <span>Nenhum item encontrado.</span>
                          </div>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-pager">
                          <button mat-icon-button type="button" [disabled]="!podePaginarAnterior('produto')" (click)="paginaAnteriorFunil('produto')" aria-label="Página anterior de itens">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <span>{{ paginaAtualFunil('produto') }} / {{ totalPaginasFunil('produto') }}</span>
                          <button mat-icon-button type="button" [disabled]="!podePaginarProxima('produto')" (click)="proximaPaginaFunil('produto')" aria-label="Próxima página de itens">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                        </div>
                      </section>

                      <section class="funnel-column" *ngIf="exibeColunaMaterial">
                        <div class="funnel-header">
                          <div class="rev-title">Material</div>
                          <mat-form-field appearance="outline" class="funnel-search" subscriptSizing="dynamic">
                            <input
                              matInput
                              type="search"
                              placeholder="Buscar"
                              [(ngModel)]="filtrosFunil.material"
                              [ngModelOptions]="{ standalone: true }"
                              (ngModelChange)="buscarNaColunaFunil('material', $event)" />
                            <mat-icon matSuffix>search</mat-icon>
                          </mat-form-field>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-list">
                          <button
                            mat-button
                            type="button"
                            class="funnel-option"
                            *ngFor="let opcao of opcoesPaginadas('material')"
                            [class.active]="materialSelecionadoId === +opcao.key"
                            (click)="selecionarMaterialFunil(opcao)">
                            <span>{{ opcao.label }}</span>
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                          <div class="empty-state compact" *ngIf="!opcoesFunil('material').length">
                            <span>Nenhum material encontrado.</span>
                          </div>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-pager">
                          <button mat-icon-button type="button" [disabled]="!podePaginarAnterior('material')" (click)="paginaAnteriorFunil('material')" aria-label="Página anterior de materiais">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <span>{{ paginaAtualFunil('material') }} / {{ totalPaginasFunil('material') }}</span>
                          <button mat-icon-button type="button" [disabled]="!podePaginarProxima('material')" (click)="proximaPaginaFunil('material')" aria-label="Próxima página de materiais">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                        </div>
                      </section>

                      <section class="funnel-column" *ngIf="exibeColunaFormato">
                        <div class="funnel-header">
                          <div class="rev-title">Formato</div>
                          <mat-form-field appearance="outline" class="funnel-search" subscriptSizing="dynamic">
                            <input
                              matInput
                              type="search"
                              placeholder="Buscar"
                              [(ngModel)]="filtrosFunil.formato"
                              [ngModelOptions]="{ standalone: true }"
                              (ngModelChange)="buscarNaColunaFunil('formato', $event)" />
                            <mat-icon matSuffix>search</mat-icon>
                          </mat-form-field>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-list">
                          <button
                            mat-button
                            type="button"
                            class="funnel-option"
                            *ngFor="let opcao of opcoesPaginadas('formato')"
                            [class.active]="formatoSelecionadoId === +opcao.key"
                            (click)="selecionarFormatoFunil(opcao)">
                            <span>{{ opcao.label }}</span>
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                          <div class="empty-state compact" *ngIf="!opcoesFunil('formato').length">
                            <span>Nenhum formato encontrado.</span>
                          </div>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-pager">
                          <button mat-icon-button type="button" [disabled]="!podePaginarAnterior('formato')" (click)="paginaAnteriorFunil('formato')" aria-label="Página anterior de formatos">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <span>{{ paginaAtualFunil('formato') }} / {{ totalPaginasFunil('formato') }}</span>
                          <button mat-icon-button type="button" [disabled]="!podePaginarProxima('formato')" (click)="proximaPaginaFunil('formato')" aria-label="Próxima página de formatos">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                        </div>
                      </section>

                      <section class="funnel-column" *ngIf="exibeColunaCor">
                        <div class="funnel-header">
                          <div class="rev-title">Cor</div>
                          <mat-form-field appearance="outline" class="funnel-search" subscriptSizing="dynamic">
                            <input
                              matInput
                              type="search"
                              placeholder="Buscar"
                              [(ngModel)]="filtrosFunil.cor"
                              [ngModelOptions]="{ standalone: true }"
                              (ngModelChange)="buscarNaColunaFunil('cor', $event)" />
                            <mat-icon matSuffix>search</mat-icon>
                          </mat-form-field>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-list">
                          <button
                            mat-button
                            type="button"
                            class="funnel-option"
                            *ngFor="let opcao of opcoesPaginadas('cor')"
                            [class.active]="corSelecionadaId === +opcao.key"
                            (click)="selecionarCorFunil(opcao)">
                            <span>{{ opcao.label }}</span>
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                          <div class="empty-state compact" *ngIf="!opcoesFunil('cor').length">
                            <span>Nenhuma cor encontrada.</span>
                          </div>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-pager">
                          <button mat-icon-button type="button" [disabled]="!podePaginarAnterior('cor')" (click)="paginaAnteriorFunil('cor')" aria-label="Página anterior de cores">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <span>{{ paginaAtualFunil('cor') }} / {{ totalPaginasFunil('cor') }}</span>
                          <button mat-icon-button type="button" [disabled]="!podePaginarProxima('cor')" (click)="proximaPaginaFunil('cor')" aria-label="Próxima página de cores">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                        </div>
                      </section>
                    </div>
            </form>
          </mat-step>

          <mat-step [stepControl]="quantidadeForm" label="Configurar Preço">
            <form [formGroup]="quantidadeForm" class="step-inner step-wide price-step">
              <div class="price-shell">
                <section class="price-product-card">
                  <div>
                    <div class="rev-title">Item selecionado</div>
                    <h3>{{ itemSelecionadoNome }}</h3>
                    <div class="price-variation">{{ itemSelecionadoResumo }}</div>
                  </div>
                  <span class="price-type">{{ tipoPrecoLabel }}</span>
                </section>

                <div class="price-config-grid">
                  <section class="price-config-card">
                    <ng-container *ngIf="tipoPrecoAtual === 'POR_LOTE'">
                      <h3>Escolha a quantidade</h3>
                      <div class="lot-grid">
                        <button
                          type="button"
                          class="lot-card"
                          *ngFor="let lote of lotesPreco"
                          [class.active]="loteSelecionado?.quantidade === lote.quantidade"
                          (click)="selecionarLotePreco(lote)">
                          <strong>{{ lote.quantidade | number:'1.0-0':'pt-BR' }} un</strong>
                          <span>{{ lote.valorLote | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                        </button>
                      </div>
                      <div class="price-hint">
                        <mat-icon>info</mat-icon>
                        <span>Selecione um lote para continuar.</span>
                      </div>
                    </ng-container>

                    <ng-container *ngIf="tipoPrecoAtual === 'FIXO'">
                      <h3>Confirme a quantidade</h3>
                      <div class="price-fixed">
                        Valor definido: <strong>{{ politicaPrecoAtual?.valorFixo | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                      </div>
                      <mat-form-field appearance="outline" *ngIf="mostraQuantidadePreco">
                        <mat-label>Quantidade</mat-label>
                        <input matInput type="number" min="1" formControlName="quantidade" />
                      </mat-form-field>
                      <button mat-flat-button color="primary" type="button" [disabled]="quantidadeForm.invalid || precificando" (click)="precificar()">
                        {{ precificando ? 'Calculando...' : 'Confirmar preço' }}
                      </button>
                    </ng-container>

                    <ng-container *ngIf="tipoPrecoAtual === 'POR_FAIXA_QUANTIDADE'">
                      <div class="quantity-range-layout">
                        <div class="quantity-entry-panel" #quantidadeWizardInputContainer>
                          <h3>Informe a quantidade</h3>
                          <div class="quantity-entry-row">
                            <app-input-numerico
                              class="quantity-input"
                              [control]="quantidadeForm.controls.quantidade"
                              label="Quantidade">
                            </app-input-numerico>
                            <button mat-flat-button color="primary" type="button" [disabled]="quantidadeForm.invalid || precificando" (click)="precificar()">
                              {{ precificando ? 'Calculando...' : 'Calcular' }}
                            </button>
                          </div>
                          <div class="quantity-keypad" aria-label="Teclado numérico da quantidade">
                            <button type="button" *ngFor="let tecla of tecladoQuantidade" (click)="acionarTecladoQuantidade(tecla)">
                              <mat-icon *ngIf="tecla === 'backspace'">backspace</mat-icon>
                              <mat-icon *ngIf="tecla === 'clear'">close</mat-icon>
                              <span *ngIf="tecla !== 'backspace' && tecla !== 'clear'">{{ tecla }}</span>
                            </button>
                          </div>
                        </div>

                        <div class="quantity-ranges-panel">
                          <div class="quantity-ranges-title">
                            <div>
                              <strong>Faixas de preço</strong>
                              <span>Confira a faixa aplicada pela quantidade.</span>
                            </div>
                            <mat-icon>table_rows</mat-icon>
                          </div>
                          <div class="price-ranges-panel" *ngIf="faixasPreco.length; else semFaixasPreco">
                            <div class="price-ranges-head">
                              <span>Faixa</span>
                              <span>Valor unitário</span>
                            </div>
                            <div class="price-ranges-list">
                              <div
                                class="price-range-row"
                                *ngFor="let faixa of faixasPreco"
                                [class.active]="faixaPrecoAplicada(faixa)">
                                <span>
                                  {{ faixaPrecoLabel(faixa) }}
                                  <small *ngIf="faixaPrecoAplicada(faixa)">Faixa atual</small>
                                </span>
                                <strong>{{ faixa.valorUnitario | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                              </div>
                            </div>
                          </div>
                          <ng-template #semFaixasPreco>
                            <div class="empty-state compact">
                              <span>Nenhuma faixa cadastrada.</span>
                            </div>
                          </ng-template>
                        </div>
                      </div>
                    </ng-container>

		                    <ng-container *ngIf="tipoPrecoAtual === 'POR_METRO_QUADRADO'">
		                      <div class="measure-layout">
		                        <div class="measure-entry-panel">
		                          <h3>Informe as medidas</h3>
		                          <div class="form-grid price-inputs">
		                            <app-input-numerico [control]="quantidadeForm.controls.largura" [label]="'Largura (' + unidadeDimensaoAtualSimbolo + ')'"></app-input-numerico>
		                            <app-input-numerico [control]="quantidadeForm.controls.altura" [label]="'Altura (' + unidadeDimensaoAtualSimbolo + ')'"></app-input-numerico>
		                            <app-input-numerico [control]="quantidadeForm.controls.quantidade" label="Quantidade"></app-input-numerico>
		                          </div>
		                          <button mat-flat-button color="primary" type="button" [disabled]="quantidadeForm.invalid || precificando" (click)="precificar()">
		                            {{ precificando ? 'Calculando...' : 'Calcular' }}
		                          </button>
		                        </div>
		                        <div class="measure-rules-panel">
		                          <div class="measure-rules-title">
		                            <div>
		                              <strong>Regras da medida</strong>
		                              <span>Valores e limites desta política.</span>
		                            </div>
		                            <mat-icon>straighten</mat-icon>
		                          </div>
		                          <div class="price-ranges-panel measure-rules-table">
		                            <div class="price-ranges-head">
		                              <span>Regra</span>
		                              <span>Valor</span>
		                            </div>
		                            <div class="price-ranges-list">
		                            <div class="price-range-row" *ngFor="let regra of regrasMedida">
		                              <span>{{ regra.label }}</span>
		                              <strong>{{ regra.value }}</strong>
		                            </div>
		                            </div>
		                          </div>
		                        </div>
		                      </div>
	                    </ng-container>

		                    <ng-container *ngIf="tipoPrecoAtual === 'POR_METRO_LINEAR' || tipoPrecoAtual === 'METRO_LINEAR'">
		                      <div class="measure-layout">
		                        <div class="measure-entry-panel">
		                          <h3>Informe a medida linear</h3>
		                          <div class="linear-width-selector" *ngIf="largurasLinearesOptions.length">
		                            <span>Largura ({{ unidadeDimensaoAtualSimbolo }}) *</span>
		                            <mat-button-toggle-group
		                              [value]="quantidadeForm.controls.largura.value"
		                              (change)="selecionarLarguraLinear($event.value)"
		                              aria-label="Largura linear">
		                              <mat-button-toggle *ngFor="let largura of largurasLinearesOptions" [value]="largura">
		                                {{ formatarMedida(largura) }} {{ unidadeDimensaoAtualSimbolo }}
		                              </mat-button-toggle>
		                            </mat-button-toggle-group>
		                            <small *ngIf="quantidadeForm.controls.largura.invalid && quantidadeForm.controls.largura.touched">
		                              {{ erroMedida('largura') }}
		                            </small>
		                          </div>
		                          <div class="form-grid price-inputs">
		                            <app-input-numerico [control]="quantidadeForm.controls.altura" [label]="'Altura (' + unidadeDimensaoAtualSimbolo + ')'"></app-input-numerico>
		                            <app-input-numerico [control]="quantidadeForm.controls.quantidade" label="Quantidade"></app-input-numerico>
		                          </div>
		                          <button mat-flat-button color="primary" type="button" [disabled]="quantidadeForm.invalid || precificando" (click)="precificar()">
		                            {{ precificando ? 'Calculando...' : 'Calcular' }}
		                          </button>
		                        </div>
		                        <div class="measure-rules-panel">
		                          <div class="measure-rules-title">
		                            <div>
		                              <strong>Regras da medida</strong>
		                              <span>Valores e limites desta política.</span>
		                            </div>
		                            <mat-icon>straighten</mat-icon>
		                          </div>
		                          <div class="price-ranges-panel measure-rules-table">
		                            <div class="price-ranges-head">
		                              <span>Regra</span>
		                              <span>Valor</span>
		                            </div>
		                            <div class="price-ranges-list">
		                            <div class="price-range-row" *ngFor="let regra of regrasMedida">
		                              <span>{{ regra.label }}</span>
		                              <strong>{{ regra.value }}</strong>
		                            </div>
		                            </div>
		                          </div>
		                        </div>
		                      </div>
	                    </ng-container>

                    <ng-container *ngIf="!tipoPrecoAtual">
                      <div class="empty-state compact">
                        <span>Forma de precificação não configurada.</span>
                      </div>
                    </ng-container>
                  </section>

                  <aside class="price-summary-card">
                    <h3>Resumo da precificação</h3>
                    <div class="summary-price-row">
                      <span>Tipo</span>
                      <strong>{{ tipoPrecoLabel }}</strong>
                    </div>
                    <div class="summary-price-row" *ngIf="preco?.quantidadeSolicitada">
                      <span>Quantidade</span>
                      <strong>{{ preco?.quantidadeSolicitada | number:'1.0-3':'pt-BR' }}</strong>
                    </div>
                    <div class="summary-price-row" *ngIf="preco?.valorUnitario !== null && preco?.valorUnitario !== undefined">
                      <span>Valor unitário</span>
                      <strong>{{ preco?.valorUnitario | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                    </div>
                    <div class="summary-price-row" *ngIf="preco?.areaFaturada">
                      <span>{{ medidaFaturadaLabel }}</span>
                      <strong>{{ preco?.areaFaturada | number:'1.2-2':'pt-BR' }} {{ medidaFaturadaUnidade }}</strong>
                    </div>
                    <div class="summary-price-total" *ngIf="preco?.valorTotal !== null && preco?.valorTotal !== undefined">
                      <span>Total</span>
                      <strong>{{ preco?.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                    </div>
                    <div class="summary-rule" *ngIf="preco?.regraAplicadaNome">
                      <mat-icon>verified_user</mat-icon>
                      <span>Regra aplicada: {{ preco?.regraAplicadaNome }}</span>
                    </div>
                  </aside>
                </div>
              </div>
            </form>
          </mat-step>

          <mat-step label="Acabamentos" [optional]="!possuiAdicionaisDisponiveis" [completed]="!possuiAdicionaisDisponiveis">
            <div class="step-inner step-wide services-step">
              <div class="services-shell">
                <section class="price-product-card">
                  <div>
                    <div class="rev-title">Item selecionado</div>
                    <h3>{{ itemSelecionadoNome }}</h3>
                    <div class="price-variation">{{ itemSelecionadoResumo }}</div>
                  </div>
                  <span class="price-type">{{ tipoPrecoLabel }}</span>
                </section>

                <div class="services-grid">
                  <section class="services-card">
                    <div class="services-card-head">
                      <h3>Acabamentos disponíveis</h3>
                      <span>{{ produtoSelecionado?.acabamentos?.length || 0 }}</span>
                    </div>
                    <div class="services-list" *ngIf="produtoSelecionado?.acabamentos?.length; else semAcabamentosServicos">
                      <label class="opt-card service-option" *ngFor="let acabamento of produtoSelecionado?.acabamentos">
                        <mat-checkbox
                          class="opt-check"
                          [checked]="acabamentoSelecionado(acabamento.id)"
                          (change)="alternarAcabamento(acabamento.id, $event.checked)">
                        </mat-checkbox>
                        <span>
                          <span class="opt-name">{{ acabamento.nome }}</span>
                          <span class="opt-desc">{{ acabamento.descricao || 'Acabamento gráfico' }}</span>
                        </span>
                        <span class="opt-price">{{ precoResumoAdicional(acabamento) }}</span>
                      </label>
                    </div>
                    <ng-template #semAcabamentosServicos>
                      <div class="empty-state compact">
                        <span>Sem acabamentos disponíveis.</span>
                      </div>
                    </ng-template>
                  </section>

                </div>
              </div>
            </div>
          </mat-step>

          <mat-step label="Revisão">
            <div class="step-inner step-wide review-step">
              <div class="review-shell" *ngIf="composicao; else semComposicao">
                <section class="price-product-card">
                  <div>
                    <div class="rev-title">Item selecionado</div>
                    <h3>{{ itemSelecionadoNome }}</h3>
                    <div class="price-variation">{{ itemSelecionadoResumo }}</div>
                  </div>
                  <span class="price-type">{{ tipoPrecoLabel }}</span>
                </section>

                <div class="review-grid">
                  <section class="review-card review-items-card">
                    <h3>Itens da composição</h3>
                    <div class="rev-table">
                      <div class="rev-row rev-head">
                        <span>Item</span>
                        <span class="text-center">Qtd</span>
                        <span class="text-right">Total</span>
                      </div>
                      <div class="rev-row" *ngFor="let item of itensRevisao">
                        <span>
                          <strong class="rev-item">{{ item.nomeProduto }}</strong>
                          <small>{{ item.unidadeVenda || 'un' }}</small>
                        </span>
                        <span class="text-center">{{ item.quantidade | number:'1.0-3':'pt-BR' }}</span>
                        <span class="text-right">{{ item.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                      </div>
                    </div>
                    <div class="review-actions">
                      <button mat-stroked-button color="primary" type="button" (click)="adicionarMaisItens()">
                        <mat-icon>add</mat-icon>
                        <span>Adicionar mais itens</span>
                      </button>
                    </div>

                  </section>

                  <aside class="price-summary-card">
                    <h3>Resumo</h3>
                    <div class="summary-price-row">
                      <span>Quantidade</span>
                      <strong>{{ preco?.quantidadeSolicitada || quantidadeForm.value.quantidade || 1 }}</strong>
                    </div>
                    <div class="summary-price-row" *ngIf="preco?.valorUnitario !== null && preco?.valorUnitario !== undefined">
                      <span>Valor unitário</span>
                      <strong>{{ preco?.valorUnitario | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                    </div>
                    <div class="summary-price-total">
                      <span>Total</span>
                      <strong>{{ totalComposicao | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                    </div>
                  </aside>
                </div>
              </div>
              <ng-template #semComposicao>
                <div class="empty-state">
                  <mat-icon>{{ precificando ? 'hourglass_empty' : 'receipt_long' }}</mat-icon>
                  <span>{{ precificando ? 'Gerando revisão...' : 'Não foi possível gerar a revisão.' }}</span>
                </div>
              </ng-template>
            </div>
          </mat-step>
        </mat-horizontal-stepper>
      </mat-dialog-content>

      <div class="wizard-footer">
        <button mat-flat-button color="accent" type="button" [disabled]="isFirstStep" (click)="voltarStep()">
          Voltar
        </button>
        <div class="right">
          <button mat-stroked-button color="primary" type="button" mat-dialog-close>Cancelar</button>
          <button mat-flat-button color="primary" class="primary-action" type="button" [disabled]="nextDisabled" (click)="avancarStep()">
            <span>{{ nextLabel }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; min-height: 0; }
    :host ::ng-deep .mat-mdc-dialog-content { max-height: initial !important; padding: 0 !important; }
    .wizard-shell { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #fff; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px 8px; gap: 12px; }
    .title-stack h2 { font-size: 20px; line-height: 1.3; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .title-main { font-weight: 600; }
    .title-divider { color: #6b7280; font-weight: 500; }
    .title-step { font-weight: 700; color: var(--mdc-theme-primary, #1976d2); }
    .wizard-body { flex: 1 1 auto; min-height: 0; overflow: auto; background: #fff; }
    .wizard-stepper { display: flex; flex-direction: column; height: 100%; min-height: 0; background: #fff; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-wrapper { flex: 1 1 auto; width: 100%; height: 100%; display: flex; flex-direction: column; min-width: 0; min-height: 0; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-header-container { position: sticky; top: 0; z-index: 2; background: #fff; padding: 18px 40px 14px; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-header { height: 56px; }
    .wizard-stepper ::ng-deep .mat-horizontal-content-container { flex: 1 1 auto; width: 100%; min-height: 0; display: flex; padding: 0; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-content[aria-expanded='true'] { flex: 1 1 auto; width: 100%; min-width: 0; min-height: 0; display: flex; }
    .wizard-footer { position: sticky; bottom: 0; z-index: 3; background: #fff; border-top: 1px solid rgba(0, 0, 0, .06); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .wizard-footer .right { display: flex; gap: 10px; }
    .primary-action { display: inline-flex; align-items: center; gap: 8px; }
    .step-inner { width: 100%; max-width: 1200px; box-sizing: border-box; margin: 0 auto; padding: 12px 40px 16px; }
    .step-wide { max-width: 1400px; }
    .step-full { max-width: none; }
    .produto-step { flex: 1 1 auto; width: 100%; max-width: none; min-height: 0; display: flex; flex-direction: column; }
    .compact-list, .option-list { display: flex; flex-direction: column; gap: 8px; }
    .sku-result, .option-button { width: 100%; justify-content: space-between; min-height: 50px; text-align: left; border-radius: 8px; color: #0f172a; border: 1px solid rgba(0, 0, 0, .06); padding: 6px 12px; }
    .sku-result span, .sku-result strong, .sku-result small { display: block; min-width: 0; }
    .sku-result strong, .option-button { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sku-result small { color: #6b7280; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sku-result.active, .option-button.active { background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); font-weight: 700; }
    .select-action { color: var(--mdc-theme-primary, #1976d2); font-weight: 700; flex: 0 0 auto; }
    .breadcrumb-line { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; margin-bottom: 16px; }
    .breadcrumb-line button { min-width: 0; padding: 0 8px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .breadcrumb-line button::after { content: '>'; color: #94a3b8; margin-left: 10px; }
    .breadcrumb-line button:last-child::after { content: ''; margin: 0; }
    .section-intro { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
    .section-intro h3, .resolved-product h3 { margin: 4px 0 0; font-size: 20px; overflow-wrap: anywhere; }
    .resolved-product { display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 18px; border: 1px solid #bfdbfe; border-radius: 10px; background: #eff6ff; }
    .resolved-product mat-icon { color: #0f766e; }
    .resolved-product p { margin: 4px 0; color: #475569; overflow-wrap: anywhere; }
    .resolved-actions { display: flex; justify-content: space-between; gap: 10px; margin-top: 18px; flex-wrap: wrap; }
    .funnel-grid { flex: 0 0 auto; width: min(1640px, calc(100vw - 184px)); max-width: 100%; min-width: 0; height: clamp(560px, calc(100dvh - 360px), 640px); display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 28px; align-items: stretch; }
    .funnel-column { width: 100%; height: 100%; min-width: 0; min-height: 0; overflow: hidden; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    .funnel-header { min-width: 0; padding: 12px 14px 10px; }
    .funnel-search { width: 100%; max-width: 100%; margin-top: 10px; font-size: 13px; }
    .funnel-search ::ng-deep .mat-mdc-form-field-infix { min-height: 36px; padding-top: 7px; padding-bottom: 7px; }
    .funnel-search ::ng-deep .mat-mdc-form-field-flex { min-width: 0; }
    .funnel-search ::ng-deep .mat-mdc-text-field-wrapper { background: #fff; }
    .funnel-search ::ng-deep .mat-mdc-form-field-icon-suffix { color: #64748b; }
    .funnel-separator { height: 1px; background: #e2e8f0; }
    .funnel-list { min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding: 10px; }
    .funnel-option { width: 100%; min-height: 38px; justify-content: space-between; text-align: left; border-radius: 6px; border: 1px solid transparent; color: #0f172a; cursor: pointer; }
    .funnel-option ::ng-deep .mdc-button__label { width: 100%; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .funnel-option span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .funnel-option-label { display: inline-flex; align-items: center; gap: 8px; }
    .funnel-option-label small { flex: 0 0 auto; padding: 2px 7px; border-radius: 999px; background: #eef2ff; color: #475569; font-size: 10px; font-weight: 700; text-transform: uppercase; }
    .funnel-option.active .funnel-option-label small { background: #dbeafe; color: var(--mdc-theme-primary, #1976d2); }
    .funnel-option mat-icon { order: 2; flex: 0 0 auto; width: 18px; height: 18px; font-size: 18px; color: #94a3b8; }
    .funnel-option:hover { background: #f8fafc; border-color: #cbd5e1; }
    .funnel-option.active { background: #e8f2ff; border-color: #93c5fd; color: var(--mdc-theme-primary, #1976d2); font-weight: 700; }
    .funnel-option.active mat-icon { color: var(--mdc-theme-primary, #1976d2); }
    .funnel-pager { display: flex; align-items: center; justify-content: center; gap: 8px; min-height: 42px; padding: 4px 8px; color: #475569; font-weight: 700; }
    .funnel-pager button { width: 32px; height: 32px; padding: 0; }
    .funnel-pager span { min-width: 46px; text-align: center; font-size: 13px; }
    .wizard-search { width: 100%; }
    .produto-table-card, .selected-panel, .review-card, .price-card, .price-box, .var-card { border: 1px solid rgba(0, 0, 0, .08); border-radius: 10px; background: #fff; }
    .produto-table-card { overflow: hidden; }
    .produto-table { width: 100%; border-collapse: collapse; }
    .produto-table th { text-align: left; font-weight: 700; background: #f8fafc; padding: 14px 18px; border-bottom: 1px solid rgba(0, 0, 0, .06); }
    .produto-table td { padding: 14px 18px; border-bottom: 1px solid rgba(0, 0, 0, .06); vertical-align: middle; }
    .produto-table tr { cursor: pointer; }
    .produto-table tr.selected, .produto-table tr:hover { background: #f8fafc; }
    .produto-table td span { color: #6b7280; margin-left: 4px; }
    .select-col { width: 120px; text-align: center !important; }
    .empty-cell { text-align: center; color: #6b7280; cursor: default; }
    .selected-panel { padding: 28px 32px; box-shadow: 0 8px 20px rgba(15, 23, 42, .04); }
    .selected-panel h3 { margin: 8px 0; font-size: 18px; }
    .selected-panel p { color: #6b7280; margin: 8px 0 18px; }
    .summary-line { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
    .var-grid { display: grid; gap: 16px; grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .sec-title { font-weight: 700; margin-bottom: 8px; font-size: 13px; text-transform: uppercase; color: #64748b; }
    .radio-col { display: flex; flex-direction: column; gap: 10px; }
    .selected-variation { display: flex; align-items: center; gap: 12px; padding: 14px 16px; border: 1px solid #bfdbfe; border-radius: 10px; background: #eff6ff; margin-top: 16px; }
    .selected-variation span, .selected-variation strong { display: block; }
    .opt-grid { display: grid; gap: 12px; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); }
    .opt-card { display: grid; align-items: start; grid-template-columns: auto 1fr auto; gap: 12px; padding: 12px 14px; border: 1px solid rgba(0, 0, 0, .08); border-radius: 10px; cursor: pointer; background: #fff; }
    .opt-card:hover { border-color: #cfd8dc; box-shadow: 0 2px 10px rgba(0, 0, 0, .06); }
    .opt-check { margin-top: 2px; }
    .opt-name { display: block; font-weight: 700; line-height: 1.2; }
    .opt-desc { display: block; font-size: 12px; color: #6b7280; margin-top: 2px; }
    .opt-price { font-weight: 700; white-space: nowrap; align-self: center; }
    .price-step, .services-step, .review-step { max-width: none; padding: 20px 40px 12px; }
    .price-shell, .services-shell, .review-shell { width: min(1640px, calc(100vw - 184px)); max-width: 100%; margin: 0 auto; display: flex; flex-direction: column; gap: 16px; }
    .price-product-card { display: flex; align-items: center; justify-content: space-between; gap: 18px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px 28px; background: #fff; }
    .price-product-card h3 { margin: 4px 0; font-size: 21px; line-height: 1.2; }
    .price-variation { color: #64748b; font-size: 13px; }
    .price-type { flex: 0 0 auto; border-radius: 999px; background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); padding: 7px 12px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .price-config-grid { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 430px; gap: 16px; align-items: stretch; }
    .price-config-card, .price-summary-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background: #fff; }
    .price-config-card { min-height: 330px; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; overflow: hidden; }
    .price-config-card h3, .price-summary-card h3 { margin: 0 0 10px; font-size: 18px; line-height: 1.3; }
    .price-inputs { align-items: start; }
    .lot-grid { width: 100%; display: grid; grid-template-columns: repeat(4, minmax(170px, 1fr)); gap: 18px; }
    .lot-card { min-height: 104px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; color: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font: inherit; }
    .lot-card strong { font-size: 18px; }
    .lot-card span { font-size: 20px; font-weight: 700; }
    .lot-card:hover, .lot-card.active { background: #e8f2ff; border-color: #93c5fd; color: var(--mdc-theme-primary, #1976d2); }
	    .price-hint { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; }
	    .price-hint mat-icon { width: 18px; height: 18px; font-size: 18px; }
			    .measure-layout { width: 100%; display: grid; grid-template-columns: minmax(390px, 480px) minmax(0, 1fr); gap: 24px; align-items: stretch; }
			    .measure-entry-panel { min-width: 0; display: flex; flex-direction: column; align-items: flex-start; gap: 16px; }
			    .measure-rules-panel { min-width: 0; border-left: 1px solid #edf2f7; padding-left: 24px; display: flex; flex-direction: column; gap: 10px; }
			    .measure-rules-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
			    .measure-rules-title strong, .measure-rules-title span { display: block; }
			    .measure-rules-title strong { color: #0f172a; font-size: 16px; line-height: 1.3; }
			    .measure-rules-title span { color: #64748b; font-size: 12px; margin-top: 3px; }
			    .measure-rules-title mat-icon { flex: 0 0 auto; width: 20px; height: 20px; font-size: 20px; color: #64748b; }
			    .measure-rules-table .price-ranges-list { max-height: none; }
			    .measure-rules-table .price-range-row strong { white-space: normal; text-align: right; overflow-wrap: anywhere; }
          .linear-width-selector { width: 100%; display: flex; flex-direction: column; gap: 8px; }
          .linear-width-selector > span { color: #0f172a; font-size: 14px; font-weight: 600; }
          .linear-width-selector small { color: #c2410c; font-size: 12px; font-weight: 600; }
          .linear-width-selector mat-button-toggle-group { width: 100%; display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); border: 1px solid #dbe5f0; border-radius: 8px; overflow: hidden; }
          .linear-width-selector mat-button-toggle { min-height: 42px; border-left: 1px solid #dbe5f0; color: #334155; font-weight: 600; }
          .linear-width-selector mat-button-toggle:first-child { border-left: 0; }
          .linear-width-selector ::ng-deep .mat-button-toggle-checked { background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); }
          .linear-width-selector ::ng-deep .mat-button-toggle-button { height: 100%; }
	    .price-fixed { font-size: 16px; }
    .quantity-range-layout { width: 100%; display: grid; grid-template-columns: minmax(390px, 480px) minmax(0, 1fr); gap: 24px; align-items: stretch; }
    .quantity-entry-panel { display: flex; flex-direction: column; align-items: flex-start; gap: 14px; }
    .quantity-entry-row { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: end; }
    .quantity-input { min-width: 0; }
    .quantity-input ::ng-deep .mat-mdc-form-field-subscript-wrapper { display: none; }
    .quantity-entry-row button { min-height: 48px; padding: 0 24px; border-radius: 999px; }
    .quantity-keypad { width: 100%; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-top: 2px; }
    .quantity-keypad button { min-height: 44px; border: 1px solid #dbe5f0; border-radius: 8px; background: #f8fafc; color: #0f172a; font: inherit; font-size: 18px; font-weight: 700; cursor: pointer; }
    .quantity-keypad button:hover { border-color: #93c5fd; background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); }
    .quantity-keypad mat-icon { width: 22px; height: 22px; font-size: 22px; }
    .quantity-ranges-panel { min-height: 220px; border-left: 1px solid #edf2f7; padding-left: 24px; display: flex; flex-direction: column; gap: 10px; }
    .quantity-ranges-title { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; }
    .quantity-ranges-title strong, .quantity-ranges-title span { display: block; }
    .quantity-ranges-title strong { color: #0f172a; font-size: 16px; line-height: 1.3; }
    .quantity-ranges-title span { color: #64748b; font-size: 12px; margin-top: 3px; }
    .quantity-ranges-title mat-icon { flex: 0 0 auto; width: 20px; height: 20px; font-size: 20px; color: #64748b; }
    .price-ranges-panel { width: 100%; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #fff; }
    .price-ranges-head, .price-range-row { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 16px; align-items: center; }
    .price-ranges-head { padding: 9px 14px; background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 700; text-transform: uppercase; }
    .price-ranges-list { max-height: 196px; overflow: auto; }
    .price-range-row { min-height: 39px; padding: 8px 14px; border-top: 1px solid #edf2f7; color: #334155; }
    .price-range-row strong { color: #0f172a; white-space: nowrap; }
    .price-range-row small { display: inline-flex; margin-left: 8px; padding: 3px 8px; border-radius: 999px; background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); font-size: 11px; font-weight: 700; }
    .price-range-row.active { background: #f4f8ff; }
    .price-summary-card { display: flex; flex-direction: column; gap: 16px; }
    .summary-price-row { display: flex; align-items: center; justify-content: space-between; gap: 18px; color: #475569; }
    .summary-price-row strong { color: #0f172a; }
    .summary-price-total { display: flex; align-items: center; justify-content: space-between; gap: 18px; margin-top: 4px; padding: 16px; border-radius: 6px; background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); font-size: 18px; font-weight: 700; }
    .summary-rule { display: flex; align-items: center; gap: 8px; color: #64748b; font-size: 13px; }
    .summary-rule mat-icon { width: 20px; height: 20px; font-size: 20px; }
    .services-grid { width: 100%; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 20px; align-items: start; }
    .services-card { min-height: 430px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px; background: #fff; }
    .services-card-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
    .services-card-head h3 { margin: 0; font-size: 18px; line-height: 1.3; }
    .services-card-head span { flex: 0 0 auto; min-width: 34px; height: 26px; padding: 0 10px; border-radius: 999px; display: inline-flex; align-items: center; justify-content: center; background: #e8f2ff; color: var(--mdc-theme-primary, #1976d2); font-size: 12px; font-weight: 700; }
    .services-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 12px; }
    .service-option { min-height: 86px; align-items: center; }
    .service-option .opt-desc { font-size: 13px; line-height: 1.35; }
    .review-grid { width: 100%; display: grid; grid-template-columns: minmax(0, 1fr) 430px; gap: 16px; align-items: start; }
    .review-items-card { min-height: 330px; padding: 28px; }
    .review-items-card h3 { margin: 0 0 16px; font-size: 18px; line-height: 1.3; }
    .review-actions { display: flex; justify-content: flex-end; margin-top: 16px; }
    .review-actions button { display: inline-flex; align-items: center; gap: 8px; }
    .review-actions mat-icon { width: 18px; height: 18px; font-size: 18px; }
    .review-addons { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin-top: 18px; }
    .review-addons h4 { margin: 0 0 10px; font-size: 15px; line-height: 1.3; }
    .addon-row { display: flex; align-items: center; justify-content: space-between; gap: 16px; min-height: 58px; padding: 12px 14px; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    .addon-row span, .addon-row strong, .addon-row small { min-width: 0; }
    .addon-row span { display: block; }
    .addon-row > strong { flex: 0 0 auto; white-space: nowrap; color: #0f172a; }
    .addon-row small { display: block; color: #64748b; font-size: 12px; margin-top: 2px; overflow-wrap: anywhere; }
    .price-layout { display: grid; grid-template-columns: minmax(0, 1fr) 520px; gap: 16px; align-items: start; }
    .price-card mat-card-content { display: flex; flex-direction: column; gap: 12px; }
    .price-card h3, .review h3 { margin: 0; font-size: 20px; }
    .price-card p { margin: 0 0 12px; color: #475569; }
    .form-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .price-box { display: grid; grid-template-columns: auto 1fr; gap: 12px; padding: 28px; border-color: #dbeafe; }
    .price-box mat-icon { border-radius: 8px; background: #eef2ff; color: #0f172a; padding: 10px; width: 44px; height: 44px; }
    .price-box.ready mat-icon { color: #0f172a; }
    .price-box strong, .price-box span { display: block; }
    .price-box > div > span { color: #6b7280; margin-top: 4px; }
    .price-summary { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 28px; margin-top: 24px; text-transform: uppercase; }
    .price-summary span { color: #6b7280; font-size: 12px; }
    .price-summary strong { text-transform: none; }
    .empty-state { display: flex; align-items: center; gap: 12px; min-height: 66px; padding: 20px; border: 1px dashed #cbd5e1; border-radius: 10px; color: #6b7280; background: #fff; }
    .empty-state.compact { min-height: auto; padding: 12px 16px; }
    .review { display: flex; flex-direction: column; gap: 16px; }
    .review-card { padding: 14px 16px; }
    .rev-header { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .rev-title { font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .rev-value { font-weight: 700; }
    .rev-subtle { font-size: 12px; color: #6b7280; margin-top: 2px; }
    .rev-chipline { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
    .rev-chip { padding: 4px 10px; border-radius: 999px; background: #f1f5f9; font-size: 12px; font-weight: 700; }
    .rev-table { width: 100%; border: 1px solid rgba(0, 0, 0, .06); border-radius: 10px; overflow: hidden; margin-top: 12px; }
    .rev-row { display: grid; grid-template-columns: 1fr 140px 160px; gap: 12px; padding: 10px 12px; border-top: 1px solid rgba(0, 0, 0, .06); }
    .rev-row:first-child { border-top: 0; }
    .rev-head { background: #f8fafc; font-weight: 700; }
    .rev-item { display: block; font-weight: 700; }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
	    @media (max-width: 1100px) {
	      .price-layout { grid-template-columns: 1fr; }
	      .price-config-grid, .services-grid, .review-grid { grid-template-columns: 1fr; }
	      .measure-layout { grid-template-columns: 1fr; }
	      .measure-rules-panel { border-left: 0; border-top: 1px solid #edf2f7; padding-left: 0; padding-top: 18px; }
	      .review-addons { grid-template-columns: 1fr; }
	      .var-grid { grid-template-columns: 1fr; }
	      .funnel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .form-grid, .rev-header { grid-template-columns: 1fr; }
      .step-inner { padding: 16px; }
      .wizard-stepper ::ng-deep .mat-horizontal-stepper-header-container { padding: 8px 16px 0; }
      .price-step, .services-step, .review-step { padding: 16px; }
      .price-product-card { align-items: flex-start; flex-direction: column; padding: 18px; }
      .quantity-range-layout { grid-template-columns: 1fr; }
      .quantity-entry-row { grid-template-columns: 1fr; }
      .quantity-ranges-panel { border-left: 0; border-top: 1px solid #edf2f7; padding-left: 0; padding-top: 18px; }
      .lot-grid, .services-list { grid-template-columns: 1fr; }
      .funnel-grid { grid-template-columns: 1fr; }
      .funnel-column { min-height: 360px; grid-template-rows: auto auto minmax(0, 1fr) auto auto; }
      .wizard-footer { align-items: stretch; }
      .wizard-footer .right { flex: 1; justify-content: flex-end; }
      .resolved-actions button { flex: 1 1 180px; }
    }
  `],
})
export class GraficaProdutoWizardDialogComponent implements OnInit {
  @ViewChild('stepper') stepper?: MatStepper;
  @ViewChild('quantidadeWizardInputContainer') quantidadeWizardInputContainer?: ElementRef<HTMLElement>;
  produtos: GraficaProduto[] = [];
  produtosFunil: GraficaProduto[] = [];
  servicosFunil: GraficaServico[] = [];
  parametros: GraficaParametro[] = [];
  selecoes: Record<string, string> = {};
  caminhoSelecoes: Array<{ codigo: string; label: string; valor: string }> = [];
  parametroAtual: GraficaParametro | null = null;
  opcoesAtuais: GraficaOpcao[] = [];
  produtoSelecionado: GraficaProduto | null = null;
  servicoAtual: GraficaServico | null = null;
  produtoNomeSelecionado: string | null = null;
  materialSelecionadoId: number | null = null;
  formatoSelecionadoId: number | null = null;
  corSelecionadaId: number | null = null;
  paginasFunil: Record<FunilColuna, number> = { produto: 0, material: 0, formato: 0, cor: 0 };
  filtrosFunil: Record<FunilColuna, string> = { produto: '', material: '', formato: '', cor: '' };
  readonly itensPorPaginaFunil = 6;
  readonly tecladoQuantidade = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'backspace'];
  produtoBusca = '';
  acabamentosSelecionados = new Set<number>();
  servicosSelecionados = new Set<number>();
  politicasPreco: GraficaPrecoPolitica[] = [];
  politicaPrecoAtual: GraficaPrecoPolitica | null = null;
  largurasLinearesOptions: number[] = [];
  loteSelecionado: GraficaPrecoLote | null = null;
  preco: GraficaPrecificacaoResultado | null = null;
  composicao: ComposicaoComercialResolvida | null = null;
  itensAcumulados: ComposicaoComercialResolvida['itens'] = [];
  precificando = false;
  buscandoProdutos = false;
  carregandoFunil = false;
  carregandoOpcoes = false;
  private tecladoQuantidadeEditando = false;
  private readonly buscaProdutos$ = new Subject<string>();
  produtoForm = this.fb.group({ produtoGraficoId: [null as number | null, Validators.required] });
  quantidadeForm = this.fb.group({
    quantidade: [1, [Validators.required, Validators.min(1)]],
    largura: [null as number | null],
    altura: [null as number | null],
  });

	  constructor(
	    private readonly fb: FormBuilder,
	    private readonly graficaService: GraficaProdutoService,
	    private readonly dialogRef: MatDialogRef<GraficaProdutoWizardDialogComponent>,
	    private readonly toastr: ToastrService,
	    @Inject(MAT_DIALOG_DATA) readonly data: any,
	  ) {}

  ngOnInit(): void {
    this.quantidadeForm.valueChanges.subscribe(() => this.limparPreco());
    this.carregarServicosFunil();
    this.buscaProdutos$.pipe(
      debounceTime(250),
      distinctUntilChanged(),
      switchMap((termo) => {
        this.buscandoProdutos = true;
        return this.graficaService.listar({ size: 20, ativo: true, search: termo || null, sort: 'nome,asc' })
          .pipe(finalize(() => this.buscandoProdutos = false));
      }),
    ).subscribe({
      next: (page) => this.produtos = page.content || [],
      error: () => this.produtos = [],
    });
    if (this.data?.produtoPreSelecionado) {
      this.selecionarProduto(this.data.produtoPreSelecionado, true, true);
    } else {
      this.buscarProdutosDireto('');
      this.carregarProdutosFunil();
    }
  }

  get breadcrumb(): Array<{ label: string }> {
    if (this.servicoAtual) {
      return [{ label: this.servicoAtual.nome }];
    }
    const produto = this.produtoSelecionado ? [{ label: this.produtoNome(this.produtoSelecionado) }] : [];
    return [...produto, ...this.caminhoSelecoes.map((item) => ({ label: item.valor }))];
  }

  get buscaAtiva(): boolean {
    return this.produtoBusca.trim().length > 0;
  }

  get currentStepLabel(): string {
    const labels = ['Produto/Serviço e Variação', 'Configurar Preço', 'Acabamentos', 'Revisão'];
    return labels[this.stepper?.selectedIndex || 0] || labels[0];
  }

  get itemSelecionadoNome(): string {
    if (this.servicoAtual) return this.servicoAtual.nome;
    return this.produtoSelecionado ? this.produtoNome(this.produtoSelecionado) : 'Item';
  }

  get itemSelecionadoResumo(): string {
    if (this.servicoAtual) return this.servicoAtual.descricao || 'Serviço gráfico';
    return this.resumoVariacaoSelecionada;
  }

  get isFirstStep(): boolean {
    return (this.stepper?.selectedIndex || 0) === 0;
  }

  get isLastStep(): boolean {
    return (this.stepper?.selectedIndex || 0) === 3;
  }

  get nextLabel(): string {
    return this.isLastStep ? 'Concluir' : 'Próximo';
  }

  get nextDisabled(): boolean {
    const index = this.stepper?.selectedIndex || 0;
    if (index === 0) {
      return !this.servicoAtual && (this.produtoForm.invalid || !!this.parametroAtual || this.carregandoOpcoes);
    }
    if (index === 1) return this.quantidadeForm.invalid || !this.precoValido || this.precificando;
    if (index === 3) return !this.composicao || this.precificando;
    return false;
  }

  get possuiAdicionaisDisponiveis(): boolean {
    return !!this.produtoSelecionado?.acabamentos?.length;
  }

  get tipoPrecoAtual(): string | null {
    const tipo = this.politicaPrecoAtual?.tipo || this.preco?.tipoPrecificacao || null;
    if (tipo === 'POR_METRO_QUADRADO' && this.politicaPrecoAtual?.modoCobranca === 'LINEAR') {
      return 'POR_METRO_LINEAR';
    }
    return tipo;
  }

  get tipoPrecoLabel(): string {
    switch (this.tipoPrecoAtual) {
      case 'FIXO': return 'Preço Fixo';
      case 'POR_FAIXA_QUANTIDADE': return 'Faixa de Quantidade';
      case 'POR_LOTE': return 'Quantidade Fechada';
      case 'POR_METRO_QUADRADO': return 'Preço por Metro';
      case 'POR_METRO_LINEAR':
      case 'METRO_LINEAR': return 'Preço por Metro';
      default: return 'Preço';
    }
  }

  get mostraQuantidadePreco(): boolean {
    return this.tipoPrecoAtual === 'POR_FAIXA_QUANTIDADE'
      || this.tipoPrecoAtual === 'POR_METRO_QUADRADO'
      || this.tipoPrecoAtual === 'POR_METRO_LINEAR'
      || this.tipoPrecoAtual === 'METRO_LINEAR'
      || (this.tipoPrecoAtual === 'FIXO' && this.politicaPrecoAtual?.multiplicaQuantidade !== false);
  }

  get mostraMedidasPreco(): boolean {
    return this.tipoPrecoAtual === 'POR_METRO_QUADRADO'
      || this.tipoPrecoAtual === 'POR_METRO_LINEAR'
      || this.tipoPrecoAtual === 'METRO_LINEAR';
  }

  get mostraLarguraPreco(): boolean {
    return this.tipoPrecoAtual === 'POR_METRO_QUADRADO';
  }

  get medidaFaturadaLabel(): string {
    return this.tipoPrecoAtual === 'POR_METRO_LINEAR' || this.tipoPrecoAtual === 'METRO_LINEAR'
      ? 'Comprimento faturado'
      : 'Área faturada';
  }

  get medidaFaturadaUnidade(): string {
    return this.tipoPrecoAtual === 'POR_METRO_LINEAR' || this.tipoPrecoAtual === 'METRO_LINEAR' ? 'm' : 'm²';
  }

  get unidadeDimensaoAtual(): string {
    return this.politicaPrecoAtual?.unidadeDimensao || this.preco?.unidadeDimensao || 'METRO';
  }

	  get unidadeDimensaoAtualSimbolo(): string {
	    switch (this.unidadeDimensaoAtual) {
	      case 'CENTIMETRO': return 'cm';
	      case 'MILIMETRO': return 'mm';
	      default: return 'm';
	    }
	  }

	  get limitesMedida(): string[] {
	    if (!this.mostraMedidasPreco) return [];
	    const unidade = this.unidadeDimensaoAtualSimbolo;
	    const limites = [`Mínimo: maior que zero ${unidade}`];
		    if (this.mostraLarguraPreco) {
		      if (this.politicaPrecoAtual?.larguraMaxima) {
		        limites.push(`Largura máxima: ${this.formatarMedida(this.politicaPrecoAtual.larguraMaxima)} ${unidade}`);
		      }
		    }
		    if (this.isMetroLinearPreco() && this.largurasPermitidasTexto) {
		      limites.push(`Larguras permitidas: ${this.largurasPermitidasTexto} ${unidade}`);
	    }
	    if (this.politicaPrecoAtual?.alturaMaxima) {
	      const label = this.tipoPrecoAtual === 'POR_METRO_LINEAR' || this.tipoPrecoAtual === 'METRO_LINEAR'
	        ? 'Comprimento máximo'
	        : 'Altura máxima';
	      limites.push(`${label}: ${this.formatarMedida(this.politicaPrecoAtual.alturaMaxima)} ${unidade}`);
	    }
	    return limites;
	  }

		  get largurasPermitidasTexto(): string {
		    return this.largurasPermitidasNumericas(this.politicaPrecoAtual?.largurasLinearesPermitidas)
		      .map((largura) => this.formatarMedida(largura))
		      .join(', ');
		  }

	  get regrasMedida(): Array<{ label: string; value: string }> {
	    if (!this.mostraMedidasPreco) return [];
	    const unidade = this.unidadeDimensaoAtualSimbolo;
	    const regras: Array<{ label: string; value: string }> = [
	      { label: 'Unidade', value: unidade },
	      { label: 'Valor por metro', value: this.formatarMoeda(this.politicaPrecoAtual?.precoMetroQuadrado) },
	      { label: 'Preço mínimo', value: this.formatarMoeda(this.politicaPrecoAtual?.minimoMetroQuadrado) },
	      { label: 'Mínimo da medida', value: `Maior que zero ${unidade}` },
	    ];
		    if (this.mostraLarguraPreco) {
		      regras.push({
		        label: 'Largura máxima',
		        value: this.politicaPrecoAtual?.larguraMaxima
		          ? `${this.formatarMedida(this.politicaPrecoAtual.larguraMaxima)} ${unidade}`
		          : 'Sem limite',
		      });
		    }
	    if (this.isMetroLinearPreco()) {
	      regras.push({
	        label: 'Larguras permitidas',
	        value: this.largurasPermitidasTexto ? `${this.largurasPermitidasTexto} ${unidade}` : 'Qualquer largura',
	      });
	    }
	    regras.push({
	      label: this.tipoPrecoAtual === 'POR_METRO_LINEAR' || this.tipoPrecoAtual === 'METRO_LINEAR'
	        ? 'Comprimento máximo'
	        : 'Altura máxima',
	      value: this.politicaPrecoAtual?.alturaMaxima
	        ? `${this.formatarMedida(this.politicaPrecoAtual.alturaMaxima)} ${unidade}`
	        : 'Sem limite',
	    });
	    return regras;
	  }

  get lotesPreco(): GraficaPrecoLote[] {
    return this.politicaPrecoAtual?.lotes || [];
  }

  get faixasPreco(): GraficaPrecoFaixa[] {
    return [...(this.politicaPrecoAtual?.faixas || [])].sort((a, b) => Number(a.inicio || 0) - Number(b.inicio || 0));
  }

  get precoValido(): boolean {
    return this.preco?.status === 'PRECO_CALCULADO';
  }

  get totalComposicao(): number {
    const itens = this.itensRevisao;
    return itens.length
      ? itens.reduce((total, item) => total + Number(item.valorTotal || 0), 0)
      : Number(this.preco?.valorTotal || 0);
  }

  get itensRevisao(): ComposicaoComercialResolvida['itens'] {
    return [
      ...this.itensAcumulados,
      ...(this.composicao?.itens || []),
    ];
  }

  get acabamentosSelecionadosDetalhe(): any[] {
    const itens = this.produtoSelecionado?.acabamentos || [];
    return itens.filter((item) => this.acabamentosSelecionados.has(item.id));
  }

  get adicionaisFixosTotal(): number {
    return [...this.acabamentosSelecionadosDetalhe]
      .map((item) => this.calcularAcabamentoComercial(item).valorTotal)
      .reduce((total, valor) => total + valor, 0);
  }

  get resumoSelecoes(): string {
    return this.parametros
      .map((parametro) => {
        return this.caminhoSelecoes.find((item) => item.codigo === parametro.codigo)?.valor;
      })
      .filter(Boolean)
      .join(' - ');
  }

  get exibeColunaMaterial(): boolean {
    return !!this.produtoNomeSelecionado && this.opcoesFunil('material').length > 0;
  }

  get exibeColunaFormato(): boolean {
    return !!this.produtoNomeSelecionado && this.etapaFunilPronta('material') && this.opcoesFunil('formato').length > 0;
  }

  get exibeColunaCor(): boolean {
    return !!this.produtoNomeSelecionado && this.etapaFunilPronta('material') && this.etapaFunilPronta('formato') && this.opcoesFunil('cor').length > 0;
  }

  buscarProdutosDireto(termo: string): void {
    this.buscaProdutos$.next((termo || '').trim());
  }

  opcoesFunil(coluna: FunilColuna): FunilOpcao[] {
    const filtrar = (opcoes: FunilOpcao[]) => this.filtrarOpcoesFunil(coluna, opcoes);
    if (coluna === 'produto') {
      return filtrar([
        ...this.agruparOpcoes(this.produtosFunil, (produto) => this.produtoNome(produto)),
        ...this.servicosFunil
          .filter((servico) => servico.ativo !== false)
          .map((servico) => ({
            key: `servico:${servico.id}`,
            label: servico.nome,
            servico,
            tipo: 'SERVICO' as const,
          })),
      ].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')));
    }
    if (coluna === 'material') {
      return filtrar(this.agruparCadastro(this.produtosPorProduto(), (produto) => produto.material));
    }
    if (coluna === 'formato') {
      return filtrar(this.agruparCadastro(this.produtosPorMaterial(), (produto) => produto.formato));
    }
    return filtrar(this.agruparCadastro(this.produtosPorFormato(), (produto) => produto.cor, true));
  }

  opcoesPaginadas(coluna: FunilColuna): FunilOpcao[] {
    const inicio = this.paginasFunil[coluna] * this.itensPorPaginaFunil;
    return this.opcoesFunil(coluna).slice(inicio, inicio + this.itensPorPaginaFunil);
  }

  paginaAtualFunil(coluna: FunilColuna): number {
    return Math.min(this.paginasFunil[coluna] + 1, this.totalPaginasFunil(coluna));
  }

  totalPaginasFunil(coluna: FunilColuna): number {
    return Math.max(1, Math.ceil(this.opcoesFunil(coluna).length / this.itensPorPaginaFunil));
  }

  podePaginarAnterior(coluna: FunilColuna): boolean {
    return this.paginasFunil[coluna] > 0;
  }

  podePaginarProxima(coluna: FunilColuna): boolean {
    return this.paginasFunil[coluna] + 1 < this.totalPaginasFunil(coluna);
  }

  paginaAnteriorFunil(coluna: FunilColuna): void {
    if (!this.podePaginarAnterior(coluna)) return;
    this.paginasFunil[coluna] -= 1;
  }

  proximaPaginaFunil(coluna: FunilColuna): void {
    if (!this.podePaginarProxima(coluna)) return;
    this.paginasFunil[coluna] += 1;
  }

  buscarNaColunaFunil(coluna: FunilColuna, termo: string): void {
    this.filtrosFunil[coluna] = termo || '';
    this.resetarPaginasFunil(coluna);
  }

  selecionarProdutoFunil(opcao: FunilOpcao): void {
    if (opcao.servico) {
      this.selecionarServicoFunil(opcao.servico);
      return;
    }
    this.servicoAtual = null;
    this.produtoNomeSelecionado = opcao.label;
    this.materialSelecionadoId = null;
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.resetarPaginasFunil('material', 'formato', 'cor');
    this.limparProdutoResolvido();
    this.avancarFunilAutomaticamente();
  }

  selecionarMaterialFunil(opcao: FunilOpcao): void {
    this.materialSelecionadoId = Number(opcao.key);
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.resetarPaginasFunil('formato', 'cor');
    this.limparProdutoResolvido();
    this.avancarFunilAutomaticamente();
  }

  selecionarFormatoFunil(opcao: FunilOpcao): void {
    this.formatoSelecionadoId = Number(opcao.key);
    this.corSelecionadaId = null;
    this.resetarPaginasFunil('cor');
    this.limparProdutoResolvido();
    this.avancarFunilAutomaticamente();
  }

  selecionarCorFunil(opcao: FunilOpcao): void {
    this.corSelecionadaId = Number(opcao.key);
    this.resolverProdutoFunil();
  }

  selecionarServicoFunil(servico: GraficaServico): void {
    this.servicoAtual = servico;
    this.produtoSelecionado = null;
    this.produtoNomeSelecionado = null;
    this.materialSelecionadoId = null;
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.parametros = [];
    this.selecoes = {};
    this.caminhoSelecoes = [];
    this.parametroAtual = null;
    this.opcoesAtuais = [];
    this.acabamentosSelecionados.clear();
    this.servicosSelecionados.clear();
    this.produtoForm.patchValue({ produtoGraficoId: servico.id });
    this.politicasPreco = (servico.politicas || []).filter((politica) => politica.ativo !== false);
    this.politicaPrecoAtual = this.resolverPoliticaPrecoAtual();
    this.loteSelecionado = this.lotesPreco[0] || null;
    if (this.loteSelecionado) {
      this.quantidadeForm.patchValue({ quantidade: this.loteSelecionado.quantidade }, { emitEvent: false });
    }
    this.configurarFormularioPreco();
    this.limparPreco();
    if (!this.politicaPrecoAtual) {
      this.composicao = this.composicaoServicoSemPreco(servico);
      this.irParaRevisaoSemAdicionais();
      return;
    }
    setTimeout(() => {
      if (this.stepper) {
        this.stepper.selectedIndex = 1;
        this.focarQuantidadePreco(true);
      }
    });
  }

  selecionarProduto(produto: GraficaProduto, direto = false, iniciarEmPreco = false): void {
    this.servicoAtual = null;
    this.produtoSelecionado = produto;
    this.produtoForm.patchValue({ produtoGraficoId: produto.id });
    this.graficaService.detalhar(produto.id).subscribe({
      next: (produto) => {
        this.produtoSelecionado = produto;
        this.parametros = (produto.parametros || []).filter((p) => p.ativo);
        this.selecoes = {};
        this.caminhoSelecoes = [];
        this.parametroAtual = null;
        this.opcoesAtuais = [];
        this.acabamentosSelecionados.clear();
        this.servicosSelecionados.clear();
        this.carregarPoliticasPreco(produto.id);
        this.preco = null;
        this.composicao = null;
        if (!direto) {
          this.carregarProximaOpcao();
        }
        if (direto) {
          this.produtoBusca = this.produtoNome(produto);
        }
        if (iniciarEmPreco) {
          setTimeout(() => {
            if (this.stepper) {
              this.stepper.selectedIndex = 1;
              this.focarQuantidadePreco(true);
            }
          });
        }
      },
    });
  }

  selecionarOpcao(parametro: GraficaParametro, codigoOpcao: string): void {
    const opcao = this.opcoesAtuais.find((item) => item.codigo === codigoOpcao)
      || parametro.opcoes.find((item) => item.codigo === codigoOpcao);
    this.selecoes[parametro.codigo] = codigoOpcao;
    this.caminhoSelecoes = [
      ...this.caminhoSelecoes.filter((item) => item.codigo !== parametro.codigo),
      { codigo: parametro.codigo, label: parametro.nome, valor: opcao?.nome || codigoOpcao },
    ];
    this.limparPreco();
    this.carregarProximaOpcao();
  }

  voltarParaSelecao(index: number): void {
    if (index === 0) {
      this.limparProdutoSelecionado();
      return;
    }
    const manter = this.caminhoSelecoes.slice(0, index - 1);
    this.selecoes = manter.reduce((acc, item) => ({ ...acc, [item.codigo]: this.selecoes[item.codigo] }), {});
    this.caminhoSelecoes = manter;
    this.limparPreco();
    this.carregarProximaOpcao();
  }

  voltarUltimaSelecao(): void {
    if (!this.caminhoSelecoes.length) {
      this.limparProdutoSelecionado();
      return;
    }
    this.voltarParaSelecao(this.caminhoSelecoes.length);
  }

  carregarProximaOpcao(): void {
    const id = this.produtoForm.value.produtoGraficoId;
    if (!id) return;
    this.carregandoOpcoes = true;
    this.graficaService.resolverOpcoes(id, { selecoes: this.selecoes }).subscribe({
      next: (resposta) => {
        this.parametroAtual = resposta.proximoParametro || null;
        this.opcoesAtuais = resposta.opcoes || [];
      },
      complete: () => this.carregandoOpcoes = false,
      error: () => {
        this.parametroAtual = null;
        this.opcoesAtuais = [];
        this.carregandoOpcoes = false;
      },
    });
  }

  precificar(): void {
    const id = this.produtoForm.value.produtoGraficoId;
    if (!id && !this.servicoAtual) return;
    const body = this.body();
	    this.precificando = true;
	    const precificacao$ = this.servicoAtual
	      ? this.graficaService.precificarServico(this.servicoAtual.id, body.precificacao)
	      : this.graficaService.precificar(id!, body.precificacao);
	    precificacao$.subscribe({
	      next: (preco) => {
	        this.preco = preco;
	        this.precificando = false;
	      },
	      error: (error) => {
	        this.precificando = false;
	        this.toastr.error(this.errorMessage(error, 'Não foi possível calcular o preço.'));
	      },
	    });
	  }

	  private errorMessage(error: any, fallback: string): string {
	    return error?.error?.message || error?.error?.userMessage || error?.message || fallback;
	  }

  private safeJson(value?: string | null): any {
    try {
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  resolverComposicao(depois?: () => void): void {
    const id = this.produtoForm.value.produtoGraficoId;
    if (!id && !this.servicoAtual) return;
    let finalizado = false;
    const finalizar = () => {
      if (finalizado) return;
      finalizado = true;
      this.precificando = false;
      depois?.();
    };
    this.precificando = true;
    const request$ = this.servicoAtual
      ? this.graficaService.resolverComposicaoServico(this.servicoAtual.id, this.body())
      : this.graficaService.resolverComposicaoComercial(id!, this.body());
    request$.subscribe({
      next: (composicao) => {
        this.composicao = this.servicoAtual ? this.composicaoServicoComSnapshot(composicao) : this.composicaoComAdicionais(composicao);
        finalizar();
      },
      complete: () => finalizar(),
      error: () => {
        if (this.servicoAtual) {
          this.composicao = null;
        } else {
          const composicao = this.composicaoDaPrecificacao();
          this.composicao = composicao ? this.composicaoComAdicionais(composicao) : null;
        }
        finalizar();
      },
    });
  }

  adicionar(): void {
    if (!this.composicao && !this.itensAcumulados.length) {
      this.dialogRef.close(null);
      return;
    }
    this.dialogRef.close(this.composicaoFinal());
  }

  adicionarMaisItens(): void {
    if (this.composicao?.itens?.length) {
      this.itensAcumulados = [...this.itensAcumulados, ...this.composicao.itens];
    }
    this.resetarItemAtual();
    if (this.stepper) {
      this.stepper.selectedIndex = 0;
      this.stepper.steps.forEach((step, index) => {
        step.completed = index === 0 ? false : step.completed;
        step.interacted = false;
      });
    }
  }

  avancarStep(): void {
    if (this.nextDisabled) return;
    if (this.isLastStep) {
      this.adicionar();
      return;
    }
    const indexAtual = this.stepper?.selectedIndex || 0;
    if (indexAtual === 1 && !this.possuiAdicionaisDisponiveis) {
      this.resolverComposicao(() => this.irParaRevisaoSemAdicionais());
      return;
    }
    if (indexAtual === 2) {
      this.resolverComposicao(() => this.irParaRevisaoComAdicionais());
      return;
    }
    this.stepper?.next();
    if (indexAtual === 0) {
      this.focarQuantidadePreco(true);
    }
  }

  voltarStep(): void {
    if ((this.stepper?.selectedIndex || 0) === 3 && !this.possuiAdicionaisDisponiveis) {
      if (this.stepper) {
        this.stepper.selectedIndex = 1;
      }
      return;
    }
    this.stepper?.previous();
  }

	  private irParaRevisaoSemAdicionais(): void {
	    if (!this.stepper) return;
	    const stepPreco = this.stepper.steps.get(1);
	    const stepAdicionais = this.stepper.steps.get(2);
	    if (stepPreco) {
	      stepPreco.completed = true;
	      stepPreco.interacted = true;
	    }
	    if (stepAdicionais) {
	      stepAdicionais.completed = true;
	      stepAdicionais.interacted = true;
	    }
	    setTimeout(() => {
	      if (this.stepper) {
	        this.stepper.selectedIndex = 3;
	      }
	    });
	  }

	  private irParaRevisaoComAdicionais(): void {
	    if (!this.stepper) return;
	    const stepPreco = this.stepper.steps.get(1);
	    const stepAdicionais = this.stepper.steps.get(2);
	    if (stepPreco) {
	      stepPreco.completed = true;
	      stepPreco.interacted = true;
	    }
	    if (stepAdicionais) {
	      stepAdicionais.completed = true;
	      stepAdicionais.interacted = true;
	    }
	    setTimeout(() => {
	      if (this.stepper && this.composicao) {
	        this.stepper.selectedIndex = 3;
	      }
	    });
	  }

  selecionarLotePreco(lote: GraficaPrecoLote): void {
    this.loteSelecionado = lote;
    this.quantidadeForm.patchValue({ quantidade: lote.quantidade });
    this.precificar();
  }

  selecionarLarguraLinear(largura: number): void {
    this.quantidadeForm.controls.largura.setValue(Number(largura));
    this.quantidadeForm.controls.largura.markAsTouched();
    this.quantidadeForm.controls.largura.updateValueAndValidity();
  }

  acionarTecladoQuantidade(tecla: string): void {
    const control = this.quantidadeForm.controls.quantidade;
    const atual = String(control.value || '');
    if (tecla === 'clear') {
      control.setValue(null);
      this.tecladoQuantidadeEditando = true;
      this.focarQuantidadePreco();
      return;
    }
    if (tecla === 'backspace') {
      const proximo = atual.slice(0, -1);
      control.setValue(proximo ? Number(proximo) : null);
      this.tecladoQuantidadeEditando = true;
      this.focarQuantidadePreco();
      return;
    }
    const deveSubstituirValorInicial = !this.tecladoQuantidadeEditando && atual === '1';
    const proximo = `${deveSubstituirValorInicial ? '' : atual}${tecla}`.replace(/^0+(?=\d)/, '');
    control.setValue(Number(proximo || 0));
    this.tecladoQuantidadeEditando = true;
    this.focarQuantidadePreco();
  }

  onStepSelectionChange(event: { selectedIndex: number }): void {
    if (event.selectedIndex === 1) {
      this.focarQuantidadePreco(true);
    }
  }

  faixaPrecoLabel(faixa: GraficaPrecoFaixa): string {
    const inicio = Number(faixa.inicio || 0);
    const fim = faixa.fim === null || faixa.fim === undefined ? null : Number(faixa.fim);
    if (!fim) return `${inicio.toLocaleString('pt-BR')}+ un`;
    return `${inicio.toLocaleString('pt-BR')} a ${fim.toLocaleString('pt-BR')} un`;
  }

  faixaPrecoAplicada(faixa: GraficaPrecoFaixa): boolean {
    const quantidade = Number(this.preco?.quantidadeSolicitada || this.quantidadeForm.value.quantidade || 0);
    const inicio = Number(faixa.inicio || 0);
    const fim = faixa.fim === null || faixa.fim === undefined ? null : Number(faixa.fim);
    return quantidade >= inicio && (!fim || quantidade <= fim);
  }

  produtoNome(produto: GraficaProduto): string {
    return produto.catalogoProdutoNome || produto.catalogoProdutoCodigo || `#${produto.id}`;
  }

  variacoesResumo(produto: GraficaProduto): string {
    const nomes = [produto.material?.nome, produto.formato?.nome, produto.cor?.nome].filter(Boolean);
    const extras = (produto.parametros || []).length;
    return nomes.length ? `${nomes.join(' / ')}${extras ? ' +' + extras : ''}` : `${extras} variações`;
  }

  get resumoProdutoResolvido(): string {
    return [this.variacoesResumo(this.produtoSelecionado!), this.resumoSelecoes].filter(Boolean).join(' · ');
  }

  get resumoVariacaoSelecionada(): string {
    return this.produtoSelecionado ? this.variacoesResumo(this.produtoSelecionado) : '';
  }

  acabamentoSelecionado(id: number): boolean {
    return this.acabamentosSelecionados.has(id);
  }

  alternarAcabamento(id: number, checked: boolean): void {
    checked ? this.acabamentosSelecionados.add(id) : this.acabamentosSelecionados.delete(id);
    this.limparComposicao();
  }

  servicoSelecionado(id: number): boolean {
    return this.servicosSelecionados.has(id);
  }

  alternarServico(id: number, checked: boolean): void {
    checked ? this.servicosSelecionados.add(id) : this.servicosSelecionados.delete(id);
    this.limparComposicao();
  }

  limparPreco(): void {
    this.preco = null;
    this.composicao = null;
  }

  private carregarPoliticasPreco(produtoId: number): void {
    this.politicasPreco = [];
    this.politicaPrecoAtual = null;
    this.loteSelecionado = null;
    this.graficaService.listarPrecos(produtoId).subscribe({
      next: (politicas) => {
        this.politicasPreco = (politicas || []).filter((politica) => politica.ativo !== false);
        this.politicaPrecoAtual = this.resolverPoliticaPrecoAtual();
        this.configurarFormularioPreco();
      },
      error: () => {
        this.politicasPreco = [];
        this.politicaPrecoAtual = null;
        this.configurarFormularioPreco();
      },
    });
  }

  private resolverPoliticaPrecoAtual(): GraficaPrecoPolitica | null {
    const politicas = [...this.politicasPreco].sort((a, b) => (b.especificidade || 0) - (a.especificidade || 0));
    return politicas.find((politica) => this.politicaCombinaComSelecoes(politica)) || politicas[0] || null;
  }

  private politicaCombinaComSelecoes(politica: GraficaPrecoPolitica): boolean {
    const selecoes = politica.selecoes || [];
    if (!selecoes.length) return true;
    return selecoes.every((selecao) => this.selecoes[selecao.parametroCodigo] === selecao.opcaoCodigo);
  }

  private configurarFormularioPreco(): void {
    const quantidade = this.quantidadeForm.controls.quantidade;
    const largura = this.quantidadeForm.controls.largura;
    const altura = this.quantidadeForm.controls.altura;
    const exigeLargura = this.mostraLarguraPreco || this.isMetroLinearPreco();
    const validadoresLargura: ValidatorFn[] = exigeLargura
      ? [Validators.required, Validators.min(0.01)]
      : [];
    if (this.mostraLarguraPreco) {
      validadoresLargura.push(this.larguraMaximaValidator());
    }
    this.largurasLinearesOptions = this.isMetroLinearPreco()
      ? this.largurasPermitidasNumericas(this.politicaPrecoAtual?.largurasLinearesPermitidas)
      : [];
    if (this.isMetroLinearPreco()) {
      validadoresLargura.push(this.larguraPermitidaValidator());
      this.preencherLarguraLinearPadrao();
    } else if (this.tipoPrecoAtual !== 'POR_METRO_QUADRADO') {
      largura.setValue(null, { emitEvent: false });
    }
    quantidade.setValidators(this.mostraQuantidadePreco || this.tipoPrecoAtual === 'POR_LOTE' ? [Validators.required, Validators.min(1)] : []);
    largura.setValidators(validadoresLargura);
    altura.setValidators(this.mostraMedidasPreco
      ? [Validators.required, Validators.min(0.01), this.alturaMaximaValidator()]
      : []);
    quantidade.updateValueAndValidity({ emitEvent: false });
    largura.updateValueAndValidity({ emitEvent: false });
    altura.updateValueAndValidity({ emitEvent: false });
  }

	  erroMedida(campo: 'largura' | 'altura'): string {
	    const control = this.quantidadeForm.controls[campo];
	    if (control.hasError('required')) return 'Campo obrigatório';
	    if (control.hasError('min')) return 'Informe um valor maior que zero';
	    if (control.hasError('max')) return `Máximo: ${this.formatarMedida(control.getError('max')?.max)} ${this.unidadeDimensaoAtualSimbolo}`;
	    if (control.hasError('larguraPermitida')) return `Larguras permitidas: ${this.largurasPermitidasTexto} ${this.unidadeDimensaoAtualSimbolo}`;
	    return 'Valor inválido';
	  }

  private larguraMaximaValidator(): ValidatorFn {
    return this.maximoPoliticaValidator(() => this.politicaPrecoAtual?.larguraMaxima ?? null);
  }

  private alturaMaximaValidator(): ValidatorFn {
    return this.maximoPoliticaValidator(() => this.politicaPrecoAtual?.alturaMaxima ?? null);
  }

  private maximoPoliticaValidator(maximo: () => number | null): ValidatorFn {
    return (control: AbstractControl) => {
      const valor = Number(control.value);
      const limite = maximo();
      if (!limite || !valor) return null;
      return valor > Number(limite) ? { max: { max: limite, actual: valor } } : null;
    };
  }

  private larguraPermitidaValidator(): ValidatorFn {
    return (control: AbstractControl) => {
      const valor = Number(control.value);
      const permitidasTexto = this.politicaPrecoAtual?.largurasLinearesPermitidas;
      const permitidas = this.largurasPermitidasNumericas(permitidasTexto);
      if (!valor || !permitidas.length) return null;
      return permitidas.some((largura) => largura === valor)
        ? null
        : { larguraPermitida: { permitidas: permitidasTexto } };
    };
  }

  private isMetroLinearPreco(): boolean {
    return this.tipoPrecoAtual === 'POR_METRO_LINEAR' || this.tipoPrecoAtual === 'METRO_LINEAR';
  }

  private preencherLarguraLinearPadrao(): void {
    const larguraControl = this.quantidadeForm.controls.largura;
    const larguraAtual = Number(larguraControl.value);
    if (this.largurasLinearesOptions.some((largura) => largura === larguraAtual)) return;
    const larguraPadrao = this.largurasLinearesOptions[0] ?? null;
    larguraControl.setValue(larguraPadrao, { emitEvent: false });
  }

	  private largurasPermitidasNumericas(valor: string | null | undefined): number[] {
	    return (valor || '')
	      .split(',')
	      .map((item) => Number(item.trim().replace(',', '.')))
	      .filter((item) => Number.isFinite(item) && item > 0);
	  }

		  formatarMedida(valor: number | string | null | undefined): string {
		    const numero = Number(valor);
		    if (!Number.isFinite(numero)) return '-';
		    return numero.toLocaleString('pt-BR', { maximumFractionDigits: 3 });
		  }

	  private formatarMoeda(valor: number | string | null | undefined): string {
	    const numero = Number(valor);
	    if (!Number.isFinite(numero)) return '-';
	    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
	  }

	  limparComposicao(): void {
    this.composicao = null;
  }

  private focarQuantidadePreco(reiniciarTeclado = false): void {
    if (reiniciarTeclado) {
      this.tecladoQuantidadeEditando = false;
    }
    setTimeout(() => {
      const input = this.quantidadeWizardInputContainer?.nativeElement.querySelector('input');
      input?.focus();
      input?.select();
    });
  }

  private body(): GraficaComercialComposicaoRequest {
    const adicionais = [
      ...this.itensAdicionais(this.produtoSelecionado?.acabamentos || [], this.acabamentosSelecionados, 'Acabamento'),
    ];
    return {
      clienteNome: this.data?.cliente?.clienteNome || null,
      clienteTelefone: this.data?.cliente?.clienteTelefone || null,
      observacaoCliente: this.data?.cliente?.observacaoCliente || null,
      precificacao: {
        selecoes: this.selecoes,
        quantidade: Number(this.quantidadeForm.value.quantidade || 1),
        largura: this.quantidadeForm.value.largura || null,
        altura: this.quantidadeForm.value.altura || null,
        unidadeDimensao: this.unidadeDimensaoAtual as any,
      },
      adicionais,
    };
  }

  private itensAdicionais(
    itens: GraficaProdutoAcabamento[],
    selecionados: Set<number>,
    prefixo: string,
  ): NonNullable<GraficaComercialComposicaoRequest['adicionais']> {
    return itens
      .filter((item) => selecionados.has(item.id))
      .map((item) => {
        const calculo = this.calcularAcabamentoComercial(item);
        return {
          linhaComercial: false,
          nomeProduto: `${prefixo}: ${item.nome}`,
          descricaoProduto: item.descricao || null,
          unidadeVenda: calculo.unidadeVenda,
          quantidade: calculo.quantidade,
          valorUnitario: calculo.valorUnitario,
          valorTotal: calculo.valorTotal,
          snapshot: {
            origem: prefixo.toUpperCase(),
            id: item.id,
            formaAplicacao: item.formaAplicacao,
            politica: calculo.politica,
          },
        };
      });
  }

  precoResumoAdicional(item: GraficaProdutoAcabamento): string {
    const calculo = this.calcularAcabamentoComercial(item);
    if (!calculo.politica) return 'Sem valor configurado';
    return `${this.labelFormaAplicacao(item.formaAplicacao)} · ${this.moeda(calculo.valorUnitario)}`;
  }

  private composicaoDaPrecificacao(): ComposicaoComercialResolvida | null {
    if (!this.preco || !this.precoValido || !this.produtoSelecionado) return null;
    const quantidade = Number(this.preco.quantidadeSolicitada || this.quantidadeForm.value.quantidade || 1);
    const valorUnitario = Number(this.preco.valorUnitario ?? this.preco.valorTotal ?? 0);
    const valorTotal = Number(this.preco.valorTotal || 0);
    return {
      clienteNome: this.data?.cliente?.clienteNome || null,
      clienteTelefone: this.data?.cliente?.clienteTelefone || null,
      observacaoCliente: this.data?.cliente?.observacaoCliente || null,
      origem: 'GRAFICA',
      referenciaOrigem: String(this.produtoSelecionado.id),
      desconto: 0,
      acrescimo: 0,
      frete: 0,
      itens: [{
        origem: 'GRAFICA',
        catalogoProdutoId: this.preco.catalogoProdutoId,
        codigoProduto: this.produtoSelecionado.catalogoProdutoCodigo || null,
        nomeProduto: this.produtoNome(this.produtoSelecionado),
        unidadeVenda: 'UN',
        caracteristicasResumo: this.resumoVariacaoSelecionada,
        quantidade,
        valorUnitario,
        desconto: 0,
        acrescimo: 0,
        valorTotal,
        observacao: null,
        ordem: 0,
        snapshotComercial: JSON.stringify({
          tipo: 'PRODUTO',
          produtoGraficoId: this.produtoSelecionado.id,
          entrada: this.body().precificacao,
          precificacao: this.preco,
        }),
      }],
    };
  }

  private composicaoServicoSemPreco(servico: GraficaServico): ComposicaoComercialResolvida {
    return {
      clienteNome: this.data?.cliente?.clienteNome || null,
      clienteTelefone: this.data?.cliente?.clienteTelefone || null,
      observacaoCliente: this.data?.cliente?.observacaoCliente || null,
      origem: 'GRAFICA',
      referenciaOrigem: String(servico.id),
      desconto: 0,
      acrescimo: 0,
      frete: 0,
      itens: [{
        origem: 'GRAFICA',
        catalogoProdutoId: 0,
        codigoProduto: servico.codigo || null,
        nomeProduto: `Serviço: ${servico.nome}`,
        unidadeVenda: 'UN',
        caracteristicasResumo: servico.descricao || 'Serviço gráfico',
        quantidade: 1,
        valorUnitario: 0,
        desconto: 0,
        acrescimo: 0,
        valorTotal: 0,
        observacao: null,
        ordem: 0,
        snapshotComercial: JSON.stringify({
          tipo: 'SERVICO',
          servicoGraficoId: servico.id,
          servicoId: servico.id,
          servicoNome: servico.nome,
          entrada: this.body().precificacao,
          precificacao: null,
        }),
      }],
    };
  }

  private composicaoServicoComSnapshot(composicao: ComposicaoComercialResolvida): ComposicaoComercialResolvida {
    if (!this.servicoAtual) return composicao;
    const entrada = this.body().precificacao;
    return {
      ...composicao,
      itens: (composicao.itens || []).map((item, index) => {
        const snapshotAtual = this.safeJson(item.snapshotComercial) || {};
        return {
          ...item,
          nomeProduto: item.nomeProduto || `Serviço: ${this.servicoAtual!.nome}`,
          ordem: item.ordem ?? index,
          snapshotComercial: JSON.stringify({
            ...snapshotAtual,
            tipo: snapshotAtual.tipo || 'SERVICO',
            servicoGraficoId: snapshotAtual.servicoGraficoId || this.servicoAtual!.id,
            servicoId: snapshotAtual.servicoId || this.servicoAtual!.id,
            servicoNome: snapshotAtual.servicoNome || this.servicoAtual!.nome,
            entrada: snapshotAtual.entrada || entrada,
            precificacao: snapshotAtual.precificacao || this.preco,
          }),
        };
      }),
    };
  }

  private composicaoFinal(): ComposicaoComercialResolvida | null {
    const itens = this.itensRevisao;
    if (!itens.length) return null;
    return {
      ...(this.composicao || {
        clienteNome: this.data?.cliente?.clienteNome || null,
        clienteTelefone: this.data?.cliente?.clienteTelefone || null,
        observacaoCliente: this.data?.cliente?.observacaoCliente || null,
        origem: 'GRAFICA',
        referenciaOrigem: null,
        desconto: 0,
        acrescimo: 0,
        frete: 0,
      }),
      itens,
    };
  }

  private composicaoComAdicionais(composicao: ComposicaoComercialResolvida): ComposicaoComercialResolvida {
    return {
      ...composicao,
      itens: [
        ...(composicao.itens || []),
        ...this.itensComerciaisAdicionais(),
      ],
    };
  }

  private itensComerciaisAdicionais(): ComposicaoComercialResolvida['itens'] {
    const principal = this.composicao?.itens?.[0];
    const catalogoFallback = principal?.catalogoProdutoId || this.preco?.catalogoProdutoId || this.produtoSelecionado?.catalogoProdutoId || 0;
    const criar = (item: GraficaProdutoAcabamento, tipo: 'ACABAMENTO' | 'SERVICO', index: number): ComposicaoComercialResolvida['itens'][number] => {
      const calculo = this.calcularAcabamentoComercial(item);
      return {
        origem: 'GRAFICA',
        catalogoProdutoId: Number(catalogoFallback),
        codigoProduto: null,
        nomeProduto: `${tipo === 'ACABAMENTO' ? 'Acabamento' : 'Serviço'}: ${item.nome}`,
        unidadeVenda: calculo.unidadeVenda,
        caracteristicasResumo: item.descricao || this.precoResumoAdicional(item),
        quantidade: calculo.quantidade,
        valorUnitario: calculo.valorUnitario,
        desconto: 0,
        acrescimo: 0,
        valorTotal: calculo.valorTotal,
        observacao: null,
        ordem: index + 1,
        snapshotComercial: JSON.stringify({
          tipo,
          id: item.id,
          formaAplicacao: item.formaAplicacao,
          politica: calculo.politica,
          gratuito: calculo.valorTotal === 0,
        }),
      };
    };
    const acabamentos = this.acabamentosSelecionadosDetalhe.map((item, index) => criar(item, 'ACABAMENTO', index));
    return acabamentos;
  }

  private calcularAcabamentoComercial(item: GraficaProdutoAcabamento): AcabamentoComercialCalculado {
    const politica = this.resolverPoliticaAcabamento(item);
    const quantidade = this.quantidadeAplicacaoAcabamento(item);
    const valorUnitario = politica ? this.valorUnitarioPoliticaAcabamento(politica, quantidade) : 0;
    return {
      quantidade,
      valorUnitario,
      valorTotal: this.arredondarMoeda(valorUnitario * quantidade),
      unidadeVenda: this.unidadeAplicacaoAcabamento(item),
      politica,
    };
  }

  private resolverPoliticaAcabamento(item: GraficaProdutoAcabamento): GraficaPrecoPolitica | null {
    const politicas = (item.politicas || [])
      .filter((politica) => politica.ativo !== false)
      .sort((a, b) => (b.especificidade || 0) - (a.especificidade || 0));
    return politicas.find((politica) => this.politicaCombinaComSelecoes(politica)) || politicas[0] || null;
  }

  private quantidadeAplicacaoAcabamento(item: GraficaProdutoAcabamento): number {
    const quantidadeProduto = Number(this.preco?.quantidadeSolicitada || this.quantidadeForm.value.quantidade || 1);
    switch (item.formaAplicacao) {
      case 'POR_SERVICO':
        return 1;
      case 'POR_METRO_QUADRADO': {
        const area = Number(this.preco?.areaFaturada ?? NaN);
        return Number.isFinite(area) && area > 0 ? area : quantidadeProduto;
      }
      case 'POR_METRO_LINEAR':
      case 'POR_FOLHA':
      case 'POR_PECA':
      default:
        return quantidadeProduto;
    }
  }

  private valorUnitarioPoliticaAcabamento(politica: GraficaPrecoPolitica, quantidade: number): number {
    if (politica.tipo === 'FIXO') {
      return this.numeroSeguro(politica.valorFixo);
    }
    if (politica.tipo === 'POR_FAIXA_QUANTIDADE') {
      const faixa = [...(politica.faixas || [])]
        .sort((a, b) => Number(a.inicio || 0) - Number(b.inicio || 0))
        .find((item) => quantidade >= Number(item.inicio || 0)
          && (item.fim === null || item.fim === undefined || quantidade <= Number(item.fim)));
      return faixa ? this.numeroSeguro(faixa.valorUnitario) : 0;
    }
    if (politica.tipo === 'POR_LOTE') {
      const lote = [...(politica.lotes || [])]
        .sort((a, b) => Number(a.quantidade || 0) - Number(b.quantidade || 0))
        .find((item) => quantidade <= Number(item.quantidade || 0));
      return lote && quantidade > 0 ? this.numeroSeguro(lote.valorLote) / quantidade : 0;
    }
    if (politica.tipo === 'POR_METRO_QUADRADO') {
      return this.numeroSeguro(politica.precoMetroQuadrado);
    }
    return 0;
  }

  private unidadeAplicacaoAcabamento(item: GraficaProdutoAcabamento): string {
    switch (item.formaAplicacao) {
      case 'POR_FOLHA': return 'FOLHA';
      case 'POR_PECA': return 'UN';
      case 'POR_METRO_QUADRADO': return 'M2';
      case 'POR_METRO_LINEAR': return 'ML';
      case 'POR_SERVICO':
      default: return 'UN';
    }
  }

  private labelFormaAplicacao(forma: GraficaProdutoAcabamento['formaAplicacao']): string {
    switch (forma) {
      case 'POR_FOLHA': return 'Por folha';
      case 'POR_PECA': return 'Por peça';
      case 'POR_METRO_QUADRADO': return 'Por m²';
      case 'POR_METRO_LINEAR': return 'Por metro linear';
      case 'POR_SERVICO':
      default: return 'Por serviço';
    }
  }

  private numeroSeguro(valor: number | null | undefined): number {
    const numero = Number(valor ?? NaN);
    return Number.isFinite(numero) ? numero : 0;
  }

  private arredondarMoeda(valor: number): number {
    return Math.round((Number(valor) + Number.EPSILON) * 100) / 100;
  }

  private moeda(valor: number): string {
    return this.arredondarMoeda(valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  limparProdutoSelecionado(): void {
    this.produtoSelecionado = null;
    this.servicoAtual = null;
    this.produtoForm.reset({ produtoGraficoId: null });
    this.produtoBusca = '';
    this.buscarProdutosDireto('');
    this.produtoNomeSelecionado = null;
    this.materialSelecionadoId = null;
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.filtrosFunil = { produto: '', material: '', formato: '', cor: '' };
    this.resetarPaginasFunil('produto', 'material', 'formato', 'cor');
    this.parametros = [];
    this.selecoes = {};
    this.caminhoSelecoes = [];
    this.parametroAtual = null;
    this.opcoesAtuais = [];
    this.acabamentosSelecionados.clear();
    this.servicosSelecionados.clear();
    this.politicasPreco = [];
    this.politicaPrecoAtual = null;
    this.loteSelecionado = null;
    this.limparPreco();
  }

  private carregarProdutosFunil(page = 0, acumulado: GraficaProduto[] = []): void {
    if (page === 0) {
      this.carregandoFunil = true;
    }
    this.graficaService.listar({ page, size: 200, ativo: true, sort: 'nome,asc' }).subscribe({
      next: (pagina) => {
        const produtos = [...acumulado, ...(pagina.content || [])];
        if (!pagina.last && pagina.content?.length) {
          this.carregarProdutosFunil(page + 1, produtos);
          return;
        }
        this.produtosFunil = produtos;
        this.carregandoFunil = false;
      },
      error: () => {
        this.produtosFunil = acumulado;
        this.carregandoFunil = false;
      },
    });
  }

  private carregarServicosFunil(): void {
    this.graficaService.listarServicos().subscribe({
      next: (servicos) => this.servicosFunil = (servicos || []).filter((servico) => servico.ativo !== false),
      error: () => this.servicosFunil = [],
    });
  }

  private produtosPorProduto(): GraficaProduto[] {
    return this.produtosFunil.filter((produto) => this.produtoNome(produto) === this.produtoNomeSelecionado);
  }

  private produtosPorMaterial(): GraficaProduto[] {
    const produtos = this.produtosPorProduto();
    if (this.materialSelecionadoId !== null) {
      return produtos.filter((produto) => produto.material?.id === this.materialSelecionadoId);
    }
    return this.existemOpcoesCadastro(produtos, (produto) => produto.material) ? [] : produtos;
  }

  private produtosPorFormato(): GraficaProduto[] {
    const produtos = this.produtosPorMaterial();
    if (this.formatoSelecionadoId !== null) {
      return produtos.filter((produto) => produto.formato?.id === this.formatoSelecionadoId);
    }
    return this.existemOpcoesCadastro(produtos, (produto) => produto.formato) ? [] : produtos;
  }

  private produtosPorCor(): GraficaProduto[] {
    const produtos = this.produtosPorFormato();
    if (this.corSelecionadaId !== null) {
      return produtos.filter((produto) => produto.cor?.id === this.corSelecionadaId);
    }
    return this.existemOpcoesCadastro(produtos, (produto) => produto.cor) ? [] : produtos;
  }

  private agruparCadastro(
    produtos: GraficaProduto[],
    cadastro: (produto: GraficaProduto) => { id: number; nome: string } | null | undefined,
    manterProduto = false,
  ): FunilOpcao[] {
    const mapa = new Map<string, FunilOpcao>();
    produtos.forEach((produto) => {
      const item = cadastro(produto);
      if (!item?.id || !item.nome) return;
      const key = String(item.id);
      if (!mapa.has(key)) {
        mapa.set(key, { key, label: item.nome, produto: manterProduto ? produto : undefined });
      }
    });
    return [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  private agruparOpcoes(produtos: GraficaProduto[], label: (produto: GraficaProduto) => string): FunilOpcao[] {
    const mapa = new Map<string, FunilOpcao>();
    produtos.forEach((produto) => {
      const nome = label(produto).trim();
      if (!nome) return;
      const key = nome.toLocaleLowerCase('pt-BR');
      if (!mapa.has(key)) {
        mapa.set(key, { key, label: nome });
      }
    });
    return [...mapa.values()].sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }

  private resetarPaginasFunil(...colunas: FunilColuna[]): void {
    colunas.forEach((coluna) => this.paginasFunil[coluna] = 0);
  }

  private etapaFunilPronta(coluna: Exclude<FunilColuna, 'produto'>): boolean {
    if (coluna === 'material') {
      return this.materialSelecionadoId !== null || this.opcoesFunil('material').length === 0;
    }
    if (coluna === 'formato') {
      return this.formatoSelecionadoId !== null || this.opcoesFunil('formato').length === 0;
    }
    return this.corSelecionadaId !== null || this.opcoesFunil('cor').length === 0;
  }

  private avancarFunilAutomaticamente(): void {
    let avancou = false;
    do {
      avancou = false;
      if (this.etapaFunilPronta('material') && this.etapaFunilPronta('formato') && this.etapaFunilPronta('cor')) {
        this.resolverProdutoFunil();
        return;
      }

      const material = this.opcoesFunil('material');
      if (this.materialSelecionadoId === null && material.length === 1) {
        this.materialSelecionadoId = Number(material[0].key);
        this.formatoSelecionadoId = null;
        this.corSelecionadaId = null;
        this.resetarPaginasFunil('formato', 'cor');
        avancou = true;
        continue;
      }

      if (this.etapaFunilPronta('material')) {
        const formato = this.opcoesFunil('formato');
        if (this.formatoSelecionadoId === null && formato.length === 1) {
          this.formatoSelecionadoId = Number(formato[0].key);
          this.corSelecionadaId = null;
          this.resetarPaginasFunil('cor');
          avancou = true;
          continue;
        }
      }

      if (this.etapaFunilPronta('material') && this.etapaFunilPronta('formato')) {
        const cor = this.opcoesFunil('cor');
        if (this.corSelecionadaId === null && cor.length === 1) {
          this.corSelecionadaId = Number(cor[0].key);
          avancou = true;
        }
      }
    } while (avancou);
  }

  private resolverProdutoFunil(): void {
    const candidatos = this.produtosPorCor();
    if (candidatos.length === 1) {
      this.selecionarProduto(candidatos[0], true, true);
    }
  }

  private existemOpcoesCadastro(
    produtos: GraficaProduto[],
    cadastro: (produto: GraficaProduto) => { id: number; nome: string } | null | undefined,
  ): boolean {
    return produtos.some((produto) => {
      const item = cadastro(produto);
      return !!item?.id && !!item.nome;
    });
  }

  private filtrarOpcoesFunil(coluna: FunilColuna, opcoes: FunilOpcao[]): FunilOpcao[] {
    const termo = this.normalizarBusca(this.filtrosFunil[coluna]);
    if (!termo) return opcoes;
    return opcoes.filter((opcao) => this.normalizarBusca(opcao.label).includes(termo));
  }

  private normalizarBusca(valor?: string | null): string {
    return (valor || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('pt-BR')
      .trim();
  }

  private limparProdutoResolvido(): void {
    this.produtoSelecionado = null;
    this.servicoAtual = null;
    this.produtoForm.reset({ produtoGraficoId: null });
    this.parametros = [];
    this.selecoes = {};
    this.caminhoSelecoes = [];
    this.parametroAtual = null;
    this.opcoesAtuais = [];
    this.acabamentosSelecionados.clear();
    this.servicosSelecionados.clear();
    this.politicasPreco = [];
    this.politicaPrecoAtual = null;
    this.loteSelecionado = null;
    this.limparPreco();
  }

  private resetarItemAtual(): void {
    this.produtoSelecionado = null;
    this.servicoAtual = null;
    this.produtoForm.reset({ produtoGraficoId: null });
    this.produtoBusca = '';
    this.produtoNomeSelecionado = null;
    this.materialSelecionadoId = null;
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.filtrosFunil = { produto: '', material: '', formato: '', cor: '' };
    this.resetarPaginasFunil('produto', 'material', 'formato', 'cor');
    this.parametros = [];
    this.selecoes = {};
    this.caminhoSelecoes = [];
    this.parametroAtual = null;
    this.opcoesAtuais = [];
    this.acabamentosSelecionados.clear();
    this.servicosSelecionados.clear();
    this.politicasPreco = [];
    this.politicaPrecoAtual = null;
    this.loteSelecionado = null;
    this.preco = null;
    this.composicao = null;
  }
}
