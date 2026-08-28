import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, FormControl, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatStepper } from '@angular/material/stepper';
import { ActivatedRoute, Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, finalize, map, Observable, Subject, switchMap, take } from 'rxjs';
import { ClienteSelectorCardComponent } from 'src/app/components/cliente-selector-card/cliente-selector-card.component';
import { ItemPedidoView, ItensPedidoSectionComponent } from 'src/app/components/itens-pedido-section/itens-pedido-section.component';
import { ObservacoesCardComponent } from 'src/app/components/observacoes-card/observacoes-card.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ClienteService } from '../../cliente/cliente.service';
import { ComposicaoComercialResolvida, GraficaComercialComposicaoRequest, GraficaOpcao, GraficaParametro, GraficaPrecificacaoResultado, GraficaProduto } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';
import { GraficaProdutoBuscaRapidaDialogComponent } from './grafica-produto-busca-rapida-dialog.component';

type ComercialBetaTipo = 'rascunhos' | 'orcamentos' | 'pedidos';
type FunilColuna = 'produto' | 'material' | 'formato' | 'cor';

interface FunilOpcao {
  key: string;
  label: string;
  produto?: GraficaProduto;
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
            <app-cliente-selector-card
              [cliente]="clienteConfirmado"
              [editando]="trocandoCliente || !clienteConfirmado"
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
              [itens]="itensView"
              [subtotal]="total"
              [permitirAlterarQuantidade]="false"
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
              [control]="observacoesControl"
              [textoSalvo]="observacaoSalva"
              [salvando]="false"
              [salvo]="observacaoSalvaFlag"
              placeholder="Insira observações relevantes sobre este atendimento..."
              (salvar)="confirmarObservacaoLocal()">
            </app-observacoes-card>
          </div>

          <div class="summary-column">
            <div class="summary-sticky">
              <app-section-card titulo="Resumo financeiro" [divider]="true" class="summary-card">
                <div class="summary-row">
                  <span>Subtotal</span>
                  <strong class="value align-right">{{ total | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Acréscimos</span>
                  <strong class="value align-right">{{ 0 | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="summary-row">
                  <span>Descontos</span>
                  <strong class="value align-right">{{ 0 | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <mat-divider class="m-t-8 m-b-8"></mat-divider>
                <div class="summary-row total">
                  <span>Total</span>
                  <strong class="value highlight">{{ total | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
                <div class="summary-row resta" *ngIf="tipo === 'pedidos'">
                  <span>Em aberto</span>
                  <strong class="value highlight">{{ total | currency:'BRL':'symbol':'1.2-2' }}</strong>
                </div>
              </app-section-card>

              <app-section-card>
                <div class="actions-final">
                  <div class="checklist" *ngIf="!itens.length">
                    <div class="check-item">
                      <span class="icon">•</span>
                      <span>Adicione ao menos 1 item</span>
                    </div>
                  </div>

                  <div class="d-flex gap-8 flex-wrap action-buttons">
                    <button mat-stroked-button color="warn" type="button" (click)="voltar()">
                      Cancelar
                    </button>
                    <button mat-flat-button color="primary" type="button" [disabled]="!itens.length || salvando" (click)="salvar()">
                      {{ acaoSalvar }}
                    </button>
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
    .pedido-layout { display: grid; grid-template-columns: minmax(0, 1fr) 360px; gap: 20px; align-items: start; }
    .main-column { display: flex; flex-direction: column; gap: 16px; }
    .summary-column { min-width: 0; }
    .summary-sticky { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 16px; }
    .summary-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .summary-row.total { font-size: 16px; }
    .summary-row .value { white-space: nowrap; }
    .summary-row .highlight { color: #1e40af; font-size: 18px; }
    .actions-final { display: flex; flex-direction: column; gap: 16px; }
    .checklist { display: flex; flex-direction: column; gap: 8px; color: #64748b; }
    .check-item { display: flex; align-items: center; gap: 8px; }
    .check-item .icon { color: #64748b; }
    .action-buttons { justify-content: flex-end; }
    @media (max-width: 980px) {
      .pedido-layout { grid-template-columns: 1fr; }
      .summary-sticky { position: static; }
    }
  `],
})
export class ComercialBetaEditorComponent implements OnInit {
  tipo: ComercialBetaTipo = 'rascunhos';
  itens: ComposicaoComercialResolvida['itens'] = [];
  salvando = false;
  clienteConfirmado: any | null = null;
  trocandoCliente = true;
  observacaoSalva = '';
  observacaoSalvaFlag = false;
  form = this.fb.group({
    clienteId: [null as any],
    observacaoCliente: [''],
  });

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly fb: FormBuilder,
    private readonly graficaService: GraficaProdutoService,
    private readonly clienteService: ClienteService,
  ) {}

  get titulo(): string {
    return this.tipo === 'pedidos' ? 'Novo Pedido' : this.tipo === 'orcamentos' ? 'Novo Orçamento' : 'Rascunho';
  }

  get subtitulo(): string {
    return 'Fluxo Comercial Beta da Gráfica.';
  }

  get acaoSalvar(): string {
    return this.tipo === 'pedidos' ? 'Criar pedido' : this.tipo === 'orcamentos' ? 'Salvar orçamento' : 'Salvar rascunho';
  }

  get total(): number {
    return this.itens.reduce((acc, item) => acc + Number(item.valorTotal || 0), 0);
  }

  get itensView(): ItemPedidoView[] {
    return this.itens.map((item) => ({
      descricao: item.nomeProduto || 'Produto gráfico',
      quantidade: Number(item.quantidade || 1),
      valor: Number(item.valorUnitario || 0),
      subTotal: Number(item.valorTotal || 0),
    }));
  }

  get clienteControl(): FormControl {
    return this.form.get('clienteId') as FormControl;
  }

  get observacoesControl(): FormControl<string> {
    return this.form.get('observacaoCliente') as FormControl<string>;
  }

  ngOnInit(): void {
    this.route.data.subscribe((data) => this.tipo = data['tipo'] || 'rascunhos');
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
    }).afterClosed().subscribe((produto?: GraficaProduto | null) => {
      if (produto) {
        this.abrirWizardProduto(produto);
      }
    });
  }

  private abrirWizardProduto(produtoPreSelecionado?: GraficaProduto): void {
    this.dialog.open(GraficaProdutoWizardDialogComponent, {
      width: 'calc(100vw - 24px)',
      height: 'calc(100vh - 24px)',
      maxWidth: '96vw',
      maxHeight: '98vh',
      panelClass: 'dialog-grande',
      data: { cliente: this.clientePayload(), produtoPreSelecionado },
    }).afterClosed().subscribe((composicao?: ComposicaoComercialResolvida) => {
      if (composicao?.itens?.length) {
        this.itens = [...this.itens, ...composicao.itens];
      }
    });
  }

  remover(index: number): void {
    this.itens = this.itens.filter((_, itemIndex) => itemIndex !== index);
  }

  salvar(): void {
    if (!this.itens.length) return;
    const primeiro = this.itens[0];
    const snapshot = this.safeJson(primeiro.snapshotComercial);
    const produtoGraficoId = Number(snapshot?.produtoGraficoId || 0);
    const precificacao = snapshot?.entrada;
    if (!produtoGraficoId) return;
    const body: GraficaComercialComposicaoRequest = {
      clienteId: this.clienteConfirmado?.id || null,
      clienteNome: this.clienteConfirmado?.nome || null,
      clienteTelefone: this.clienteConfirmado?.telefone || null,
      clienteEmail: this.clienteConfirmado?.email || null,
      observacaoCliente: this.form.value.observacaoCliente || null,
      precificacao: {
        selecoes: this.selecoesDoSnapshot(snapshot),
        quantidade: precificacao?.quantidadeSolicitada || Number(primeiro.quantidade),
        largura: precificacao?.largura || null,
        altura: precificacao?.altura || null,
        unidadeDimensao: precificacao?.unidadeDimensao || null,
      },
    };
    const action = this.tipo === 'pedidos'
      ? this.graficaService.criarPedidoGrafico(produtoGraficoId, body)
      : this.tipo === 'orcamentos'
        ? this.graficaService.criarOrcamentoGrafico(produtoGraficoId, body)
        : this.graficaService.criarRascunhoGrafico(produtoGraficoId, body);
    this.salvando = true;
    action.pipe(finalize(() => this.salvando = false)).subscribe({ next: () => this.voltar() });
  }

  voltar(): void {
    this.router.navigate(['/page/grafica/comercial-beta', this.tipo]);
  }

  buscarClientes = (termo: string): Observable<any[]> =>
    this.clienteService.buscarPorNome(termo).pipe(map((res: any) => res.content || []));

  mostrarCliente = (cliente: any): string =>
    cliente ? `${cliente.nome}${cliente.telefone ? ' - ' + cliente.telefone : ''}` : '';

  confirmarClienteSelecionado(): void {
    const selecionado = this.clienteControl.value;
    if (!selecionado?.id) {
      return;
    }

    this.clienteService.buscarPorId(selecionado.id).pipe(take(1)).subscribe({
      next: (clienteCompleto) => {
        this.clienteConfirmado = clienteCompleto;
        this.clienteControl.setValue(clienteCompleto, { emitEvent: false });
        this.trocandoCliente = false;
      },
    });
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

  confirmarObservacaoLocal(): void {
    this.observacaoSalva = this.observacoesControl.value || '';
    this.observacaoSalvaFlag = true;
  }

  private safeJson(value?: string | null): any {
    try { return value ? JSON.parse(value) : null; } catch { return null; }
  }

  private selecoesDoSnapshot(snapshot: any): Record<string, string> {
    const selecoes = Array.isArray(snapshot?.selecoes) ? snapshot.selecoes : [];
    return selecoes.reduce((acc: Record<string, string>, selecao: any) => {
      if (selecao.parametroCodigo && selecao.opcaoCodigo) {
        acc[selecao.parametroCodigo] = selecao.opcaoCodigo;
      }
      return acc;
    }, {});
  }

  private clientePayload(): any {
    return {
      clienteId: this.clienteConfirmado?.id || null,
      clienteNome: this.clienteConfirmado?.nome || null,
      clienteTelefone: this.clienteConfirmado?.telefone || null,
      clienteEmail: this.clienteConfirmado?.email || null,
      observacaoCliente: this.form.value.observacaoCliente || null,
    };
  }
}

@Component({
  selector: 'app-grafica-produto-wizard-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, FormsModule, ReactiveFormsModule],
  template: `
    <div class="wizard-shell">
      <div class="dialog-header">
        <div class="title-stack">
          <h2 mat-dialog-title class="m-b-0">
            <span class="title-main">Adicionar produto</span>
            <span class="title-divider">-</span>
            <span class="title-step" aria-live="polite">{{ currentStepLabel }}</span>
          </h2>
        </div>
        <button mat-icon-button mat-dialog-close aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content class="wizard-body">
        <mat-horizontal-stepper [linear]="true" #stepper class="wizard-stepper">
          <mat-step [stepControl]="produtoForm" label="Produto e Variação">
            <form [formGroup]="produtoForm" class="step-inner step-full produto-step">
                  <ng-container *ngIf="!produtoSelecionado; else produtoResolvidoTpl">
                    <div class="funnel-grid">
                      <section class="funnel-column">
                        <div class="funnel-header">
                          <div class="rev-title">Produto</div>
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
                            [class.active]="produtoNomeSelecionado === opcao.label"
                            (click)="selecionarProdutoFunil(opcao)">
                            <span>{{ opcao.label }}</span>
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                          <div class="empty-state compact" *ngIf="carregandoFunil">
                            <mat-icon>hourglass_empty</mat-icon>
                            <span>Carregando produtos...</span>
                          </div>
                          <div class="empty-state compact" *ngIf="!carregandoFunil && !opcoesFunil('produto').length">
                            <span>Nenhum produto encontrado.</span>
                          </div>
                        </div>
                        <div class="funnel-separator"></div>
                        <div class="funnel-pager">
                          <button mat-icon-button type="button" [disabled]="!podePaginarAnterior('produto')" (click)="paginaAnteriorFunil('produto')" aria-label="Página anterior de produtos">
                            <mat-icon>chevron_left</mat-icon>
                          </button>
                          <span>{{ paginaAtualFunil('produto') }} / {{ totalPaginasFunil('produto') }}</span>
                          <button mat-icon-button type="button" [disabled]="!podePaginarProxima('produto')" (click)="proximaPaginaFunil('produto')" aria-label="Próxima página de produtos">
                            <mat-icon>chevron_right</mat-icon>
                          </button>
                        </div>
                      </section>

                      <section class="funnel-column" *ngIf="produtoNomeSelecionado">
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

                      <section class="funnel-column" *ngIf="produtoNomeSelecionado && materialSelecionadoId">
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

                      <section class="funnel-column" *ngIf="produtoNomeSelecionado && materialSelecionadoId && formatoSelecionadoId">
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
                  </ng-container>

                  <ng-template #produtoResolvidoTpl>
                      <div class="resolved-product">
                        <mat-icon>check_circle</mat-icon>
                        <div>
                          <div class="rev-title">Produto encontrado</div>
                          <h3>{{ produtoSelecionado ? produtoNome(produtoSelecionado) : '-' }}</h3>
                          <p>{{ resumoProdutoResolvido }}</p>
                          <small>Código: {{ produtoSelecionado?.catalogoProdutoCodigo || produtoSelecionado?.catalogoProdutoId }}</small>
                          <div class="resolved-actions">
                            <button mat-stroked-button color="primary" type="button" (click)="limparProdutoSelecionado()">Alterar seleção</button>
                            <button mat-flat-button color="primary" type="button" (click)="avancarStep()">Continuar</button>
                          </div>
                        </div>
                      </div>
                  </ng-template>
            </form>
          </mat-step>

          <mat-step [stepControl]="quantidadeForm" label="Configurar Preço">
            <form [formGroup]="quantidadeForm" class="step-inner step-wide">
              <div class="price-layout">
                <mat-card appearance="outlined" class="price-card">
                  <mat-card-content>
                    <h3>{{ produtoSelecionado ? produtoNome(produtoSelecionado) : 'Produto' }}</h3>
                    <p>{{ produtoSelecionado?.catalogoProdutoDescricao || 'Configure a quantidade para calcular o preço.' }}</p>

                    <div class="form-grid">
                      <mat-form-field appearance="outline">
                        <mat-label>Quantidade</mat-label>
                        <input matInput type="number" formControlName="quantidade" (input)="limparPreco()" />
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Largura</mat-label>
                        <input matInput type="number" formControlName="largura" (input)="limparPreco()" />
                      </mat-form-field>
                      <mat-form-field appearance="outline">
                        <mat-label>Altura</mat-label>
                        <input matInput type="number" formControlName="altura" (input)="limparPreco()" />
                      </mat-form-field>
                    </div>

                    <button mat-flat-button color="primary" type="button" [disabled]="quantidadeForm.invalid || precificando" (click)="precificar()">
                      <mat-icon>calculate</mat-icon>
                      <span>{{ precificando ? 'Calculando...' : 'Calcular preço' }}</span>
                    </button>
                  </mat-card-content>
                </mat-card>

                <div class="price-box" [class.ready]="preco">
                  <mat-icon>{{ preco ? 'check_circle' : 'pending' }}</mat-icon>
                  <div>
                    <strong>{{ preco ? 'Configuração pronta' : 'Aguardando cálculo' }}</strong>
                    <span>{{ preco ? 'Clique em “Próximo” para continuar.' : 'Calcule o preço para avançar.' }}</span>
                    <div class="price-summary" *ngIf="preco">
                      <span>Tipo</span>
                      <strong>{{ preco.tipoPrecificacao || '-' }}</strong>
                      <span>Subtotal estimado</span>
                      <strong>{{ preco.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </form>
          </mat-step>

          <mat-step label="Serviços">
            <div class="step-inner step-wide">
              <div class="sec-title">Serviços disponíveis</div>
              <div class="opt-grid" *ngIf="produtoSelecionado?.servicos?.length; else semServicos">
                <label class="opt-card" *ngFor="let servico of produtoSelecionado?.servicos">
                  <mat-checkbox
                    class="opt-check"
                    [checked]="servicoSelecionado(servico.id)"
                    (change)="alternarServico(servico.id, $event.checked)">
                  </mat-checkbox>
                  <span>
                    <span class="opt-name">{{ servico.nome }}</span>
                    <span class="opt-desc">{{ servico.descricao || 'Serviço adicional' }}</span>
                  </span>
                  <span class="opt-price">-</span>
                </label>
              </div>
              <ng-template #semServicos>
                <div class="empty-state">
                  <mat-icon>design_services</mat-icon>
                  <span>Sem serviços disponíveis para este produto.</span>
                </div>
              </ng-template>
            </div>
          </mat-step>

          <mat-step label="Revisão">
            <div class="step-inner step-wide">
              <div class="review" *ngIf="composicao; else semComposicao">
                <h3>Revisão</h3>
                <div class="review-card">
                  <div class="rev-header">
                    <div>
                      <div class="rev-title">Produto</div>
                      <div class="rev-value">{{ produtoSelecionado ? produtoNome(produtoSelecionado) : '-' }}</div>
                      <div class="rev-subtle">{{ produtoSelecionado?.catalogoProdutoDescricao || '' }}</div>
                    </div>
                    <div>
                      <div class="rev-title">Variação</div>
                      <div class="rev-chipline">
                        <span class="rev-chip" *ngFor="let item of preco?.selecoesResolvidas">{{ item.opcaoNome }}</span>
                      </div>
                      <div class="rev-subtle">({{ preco?.quantidadeSolicitada || quantidadeForm.value.quantidade || 1 }})</div>
                    </div>
                  </div>
                </div>

                <div class="review-card">
                  <div class="rev-title">Itens</div>
                  <div class="rev-table">
                    <div class="rev-row rev-head">
                      <span>Item</span>
                      <span class="text-center">Qtd</span>
                      <span class="text-right">Total</span>
                    </div>
                    <div class="rev-row" *ngFor="let item of composicao.itens">
                      <span>
                        <strong class="rev-item">{{ item.nomeProduto }}</strong>
                        <small>{{ item.unidadeVenda || 'un' }}</small>
                      </span>
                      <span class="text-center">{{ item.quantidade | number:'1.0-3':'pt-BR' }}</span>
                      <span class="text-right">{{ item.valorTotal | currency:'BRL':'symbol':'1.2-2':'pt-BR' }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <ng-template #semComposicao>
                <div class="empty-state">
                  <mat-icon>receipt_long</mat-icon>
                  <span>Calcule o preço para gerar a revisão.</span>
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
    :host ::ng-deep .mat-mdc-dialog-content { max-height: initial !important; padding: 0 !important; }
    .wizard-shell { display: flex; flex-direction: column; min-height: 78vh; height: min(97vh, calc(100dvh - 8px)); max-height: 1200px; background: #fff; }
    .dialog-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 20px 8px; gap: 12px; }
    .title-stack h2 { font-size: 20px; line-height: 1.3; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .title-main { font-weight: 600; }
    .title-divider { color: #6b7280; font-weight: 500; }
    .title-step { font-weight: 700; color: var(--mdc-theme-primary, #1976d2); }
    .wizard-body { flex: 1; overflow: auto; background: #fff; }
    .wizard-stepper { display: flex; flex-direction: column; min-height: 100%; background: #fff; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-header-container { position: sticky; top: 0; z-index: 2; background: #fff; padding: 4px 24px 0; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-header { height: 56px; }
    .wizard-stepper ::ng-deep .mat-horizontal-content-container { flex: 1; display: flex; padding: 0; }
    .wizard-stepper ::ng-deep .mat-horizontal-stepper-content[aria-expanded='true'] { flex: 1; display: flex; min-width: 0; }
    .wizard-footer { position: sticky; bottom: 0; z-index: 3; background: #fff; border-top: 1px solid rgba(0, 0, 0, .06); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; gap: 12px; }
    .wizard-footer .right { display: flex; gap: 10px; }
    .primary-action { display: inline-flex; align-items: center; gap: 8px; }
    .step-inner { width: 100%; max-width: 1200px; margin: 0 auto; padding: 12px 24px 16px; }
    .step-wide { max-width: 1400px; }
    .step-full { max-width: none; }
    .produto-step { min-height: 0; }
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
    .funnel-grid { flex: 1; min-height: 468px; display: grid; grid-template-columns: repeat(4, minmax(220px, 1fr)); gap: 14px; align-items: stretch; }
    .funnel-column { min-width: 0; min-height: 0; display: grid; grid-template-rows: auto auto minmax(0, 1fr) auto auto; border: 1px solid #e2e8f0; border-radius: 8px; background: #fff; }
    .funnel-header { min-width: 0; padding: 12px 14px 10px; }
    .funnel-search { width: 100%; max-width: 100%; margin-top: 10px; font-size: 13px; }
    .funnel-search ::ng-deep .mat-mdc-form-field-infix { min-height: 36px; padding-top: 7px; padding-bottom: 7px; }
    .funnel-search ::ng-deep .mat-mdc-form-field-flex { min-width: 0; }
    .funnel-search ::ng-deep .mat-mdc-text-field-wrapper { background: #fff; }
    .funnel-search ::ng-deep .mat-mdc-form-field-icon-suffix { color: #64748b; }
    .funnel-separator { height: 1px; background: #e2e8f0; }
    .funnel-list { display: flex; flex-direction: column; gap: 6px; padding: 10px; }
    .funnel-option { width: 100%; min-height: 38px; justify-content: space-between; text-align: left; border-radius: 6px; border: 1px solid transparent; color: #0f172a; cursor: pointer; }
    .funnel-option ::ng-deep .mdc-button__label { width: 100%; min-width: 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
    .funnel-option span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .funnel-option mat-icon { flex: 0 0 auto; width: 18px; height: 18px; font-size: 18px; color: #94a3b8; }
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
      .var-grid { grid-template-columns: 1fr; }
      .funnel-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    }
    @media (max-width: 720px) {
      .form-grid, .rev-header { grid-template-columns: 1fr; }
      .step-inner { padding: 16px; }
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
  produtos: GraficaProduto[] = [];
  produtosFunil: GraficaProduto[] = [];
  parametros: GraficaParametro[] = [];
  selecoes: Record<string, string> = {};
  caminhoSelecoes: Array<{ codigo: string; label: string; valor: string }> = [];
  parametroAtual: GraficaParametro | null = null;
  opcoesAtuais: GraficaOpcao[] = [];
  produtoSelecionado: GraficaProduto | null = null;
  produtoNomeSelecionado: string | null = null;
  materialSelecionadoId: number | null = null;
  formatoSelecionadoId: number | null = null;
  corSelecionadaId: number | null = null;
  paginasFunil: Record<FunilColuna, number> = { produto: 0, material: 0, formato: 0, cor: 0 };
  filtrosFunil: Record<FunilColuna, string> = { produto: '', material: '', formato: '', cor: '' };
  readonly itensPorPaginaFunil = 6;
  produtoBusca = '';
  acabamentosSelecionados = new Set<number>();
  servicosSelecionados = new Set<number>();
  preco: GraficaPrecificacaoResultado | null = null;
  composicao: ComposicaoComercialResolvida | null = null;
  precificando = false;
  buscandoProdutos = false;
  carregandoFunil = false;
  carregandoOpcoes = false;
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
    @Inject(MAT_DIALOG_DATA) readonly data: any,
  ) {}

  ngOnInit(): void {
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
    const produto = this.produtoSelecionado ? [{ label: this.produtoNome(this.produtoSelecionado) }] : [];
    return [...produto, ...this.caminhoSelecoes.map((item) => ({ label: item.valor }))];
  }

  get buscaAtiva(): boolean {
    return this.produtoBusca.trim().length > 0;
  }

  get currentStepLabel(): string {
    const labels = ['Produto e Variação', 'Configurar Preço', 'Serviços', 'Revisão'];
    return labels[this.stepper?.selectedIndex || 0] || labels[0];
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
      return this.produtoForm.invalid || !!this.parametroAtual || this.carregandoOpcoes;
    }
    if (index === 1) return this.quantidadeForm.invalid || !this.preco || this.precificando;
    if (index === 3) return !this.composicao;
    return false;
  }

  get resumoSelecoes(): string {
    return this.parametros
      .map((parametro) => {
        return this.caminhoSelecoes.find((item) => item.codigo === parametro.codigo)?.valor;
      })
      .filter(Boolean)
      .join(' - ');
  }

  buscarProdutosDireto(termo: string): void {
    this.buscaProdutos$.next((termo || '').trim());
  }

  opcoesFunil(coluna: FunilColuna): FunilOpcao[] {
    const filtrar = (opcoes: FunilOpcao[]) => this.filtrarOpcoesFunil(coluna, opcoes);
    if (coluna === 'produto') {
      return filtrar(this.agruparOpcoes(this.produtosFunil, (produto) => this.produtoNome(produto)));
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
    this.produtoNomeSelecionado = opcao.label;
    this.materialSelecionadoId = null;
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.resetarPaginasFunil('material', 'formato', 'cor');
    this.limparProdutoResolvido();
  }

  selecionarMaterialFunil(opcao: FunilOpcao): void {
    this.materialSelecionadoId = Number(opcao.key);
    this.formatoSelecionadoId = null;
    this.corSelecionadaId = null;
    this.resetarPaginasFunil('formato', 'cor');
    this.limparProdutoResolvido();
  }

  selecionarFormatoFunil(opcao: FunilOpcao): void {
    this.formatoSelecionadoId = Number(opcao.key);
    this.corSelecionadaId = null;
    this.resetarPaginasFunil('cor');
    this.limparProdutoResolvido();
  }

  selecionarCorFunil(opcao: FunilOpcao): void {
    this.corSelecionadaId = Number(opcao.key);
    if (opcao.produto) {
      this.selecionarProduto(opcao.produto, true);
    }
  }

  selecionarProduto(produto: GraficaProduto, direto = false, iniciarEmPreco = false): void {
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

  carregarProximaOpcao(): void {
    const id = this.produtoForm.value.produtoGraficoId;
    if (!id) return;
    this.carregandoOpcoes = true;
    this.graficaService.resolverOpcoes(id, { selecoes: this.selecoes }).subscribe({
      next: (resposta) => {
        this.parametroAtual = resposta.proximoParametro || null;
        this.opcoesAtuais = resposta.opcoes || [];
        if (this.parametroAtual && this.opcoesAtuais.length === 1) {
          queueMicrotask(() => this.selecionarOpcao(this.parametroAtual!, this.opcoesAtuais[0].codigo));
        }
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
    if (!id) return;
    const body = this.body();
    this.precificando = true;
    this.graficaService.precificar(id, body.precificacao).subscribe({
      next: (preco) => {
        this.preco = preco;
        this.resolverComposicao();
      },
      error: () => this.precificando = false,
    });
  }

  resolverComposicao(): void {
    const id = this.produtoForm.value.produtoGraficoId;
    if (!id) return;
    this.graficaService.resolverComposicaoComercial(id, this.body()).subscribe({
      next: (composicao) => this.composicao = composicao,
      complete: () => this.precificando = false,
      error: () => this.precificando = false,
    });
  }

  adicionar(): void {
    this.dialogRef.close(this.composicao);
  }

  avancarStep(): void {
    if (this.nextDisabled) return;
    if (this.isLastStep) {
      this.adicionar();
      return;
    }
    this.stepper?.next();
  }

  voltarStep(): void {
    this.stepper?.previous();
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

  acabamentoSelecionado(id: number): boolean {
    return this.acabamentosSelecionados.has(id);
  }

  alternarAcabamento(id: number, checked: boolean): void {
    checked ? this.acabamentosSelecionados.add(id) : this.acabamentosSelecionados.delete(id);
    this.limparPreco();
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

  limparComposicao(): void {
    if (this.preco) {
      this.resolverComposicao();
    }
  }

  private body(): GraficaComercialComposicaoRequest {
    const adicionais = [
      ...this.itensAdicionais(this.produtoSelecionado?.acabamentos || [], this.acabamentosSelecionados, 'Acabamento'),
      ...this.itensAdicionais(this.produtoSelecionado?.servicos || [], this.servicosSelecionados, 'Serviço'),
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
        unidadeDimensao: 'METRO',
      },
      adicionais,
    };
  }

  private itensAdicionais(
    itens: Array<{ id: number; nome: string; descricao?: string | null }>,
    selecionados: Set<number>,
    prefixo: string,
  ): NonNullable<GraficaComercialComposicaoRequest['adicionais']> {
    return itens
      .filter((item) => selecionados.has(item.id))
      .map((item) => ({
        linhaComercial: true,
        nomeProduto: `${prefixo}: ${item.nome}`,
        descricaoProduto: item.descricao || null,
        quantidade: 1,
        valorUnitario: 0,
        valorTotal: 0,
        snapshot: { origem: prefixo.toUpperCase(), id: item.id },
      }));
  }

  limparProdutoSelecionado(): void {
    this.produtoSelecionado = null;
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

  private produtosPorProduto(): GraficaProduto[] {
    return this.produtosFunil.filter((produto) => this.produtoNome(produto) === this.produtoNomeSelecionado);
  }

  private produtosPorMaterial(): GraficaProduto[] {
    return this.produtosPorProduto().filter((produto) => produto.material?.id === this.materialSelecionadoId);
  }

  private produtosPorFormato(): GraficaProduto[] {
    return this.produtosPorMaterial().filter((produto) => produto.formato?.id === this.formatoSelecionadoId);
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
    this.produtoForm.reset({ produtoGraficoId: null });
    this.parametros = [];
    this.selecoes = {};
    this.caminhoSelecoes = [];
    this.parametroAtual = null;
    this.opcoesAtuais = [];
    this.acabamentosSelecionados.clear();
    this.servicosSelecionados.clear();
    this.limparPreco();
  }
}
