import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoriaOption, CatalogoProduto, CatalogoProdutoOption, CatalogoProdutoRequest } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoCategoriaService, CatalogoProdutoService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage, catalogoSlugify, CATALOGO_UNIDADES_VENDA } from '../../catalogo/shared/utils/catalogo-utils';
import {
  GraficaDependencia,
  GraficaOpcao,
  GraficaParametro,
  GraficaParametroRequest,
  GraficaPrecoPolitica,
  GraficaPrecoPoliticaRequest,
  GraficaPrecificacaoResultado,
  GraficaProduto,
  GraficaTipoPrecificacao,
  GraficaTipoParametro,
} from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type OrigemProduto = 'EXISTENTE' | 'NOVO';
type ModoVenda = 'SIMPLES' | 'CONFIGURAVEL' | 'QUANTIDADE' | 'MEDIDA';

interface TemplateUi {
  codigo: string;
  nome: string;
  descricao: string;
  modo: ModoVenda;
}

interface TipoPrecoUi {
  value: GraficaTipoPrecificacao;
  label: string;
}

@Component({
  selector: 'app-grafica-produto-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, PageCardComponent, SectionCardComponent],
  template: `
    <app-page-card [titulo]="titulo" subtitulo="Cadastro progressivo de produto gráfico" botaoTexto="Voltar" [botaoRota]="['/page/grafica/produtos']" botaoIcone="arrow_back">
      <mat-tab-group [selectedIndex]="aba" (selectedIndexChange)="aba = $event">
        <mat-tab label="Produto">
          <app-section-card titulo="Produto" subtitulo="Use um produto do Catálogo ou crie um cadastro mínimo">
            <form [formGroup]="produtoForm" class="stack">
              <mat-button-toggle-group formControlName="origem">
                <mat-button-toggle value="EXISTENTE"><mat-icon>inventory_2</mat-icon>Existente</mat-button-toggle>
                <mat-button-toggle value="NOVO"><mat-icon>add_box</mat-icon>Novo</mat-button-toggle>
              </mat-button-toggle-group>

              <div class="grid" *ngIf="produtoForm.value.origem === 'EXISTENTE'">
                <mat-form-field appearance="outline">
                  <mat-label>Produto do Catálogo</mat-label>
                  <mat-select formControlName="catalogoProdutoId">
                    <mat-option *ngFor="let item of produtosCatalogo" [value]="item.id">{{ item.codigo }} - {{ item.nome }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>

              <div class="grid" *ngIf="produtoForm.value.origem === 'NOVO'">
                <mat-form-field appearance="outline">
                  <mat-label>Nome</mat-label>
                  <input matInput formControlName="nome" />
                </mat-form-field>
                <mat-form-field appearance="outline">
                  <mat-label>Categoria</mat-label>
                  <mat-select formControlName="categoriaId">
                    <mat-option *ngIf="!categorias.length" disabled>Nenhuma categoria ativa encontrada</mat-option>
                    <mat-option *ngFor="let item of categorias" [value]="item.id">{{ item.nome }}</mat-option>
                  </mat-select>
                </mat-form-field>
                <div class="field-help wide" *ngIf="!categorias.length">
                  Cadastre uma categoria ativa no Catálogo para criar produtos novos.
                  <a routerLink="/page/catalogo/categorias/nova">Nova categoria</a>
                </div>
                <mat-form-field appearance="outline">
                  <mat-label>Unidade</mat-label>
                  <mat-select formControlName="unidadeVenda">
                    <mat-option *ngFor="let item of unidades" [value]="item.value">{{ item.label }}</mat-option>
                  </mat-select>
                </mat-form-field>
              </div>
            </form>
          </app-section-card>
        </mat-tab>

        <mat-tab label="Venda">
          <app-section-card titulo="Como este produto é vendido?" subtitulo="Escolha o caminho mais próximo; tudo poderá ser editado depois">
            <form [formGroup]="vendaForm" class="stack">
              <mat-radio-group class="choice-list" formControlName="modoVenda">
                <mat-radio-button value="SIMPLES">Produto simples</mat-radio-button>
                <mat-radio-button value="CONFIGURAVEL">Produto configurável</mat-radio-button>
                <mat-radio-button value="QUANTIDADE">Produto por quantidade</mat-radio-button>
                <mat-radio-button value="MEDIDA">Produto por medida</mat-radio-button>
              </mat-radio-group>

              <div class="template-list" *ngIf="vendaForm.value.modoVenda !== 'SIMPLES'">
                <button mat-stroked-button type="button" *ngFor="let template of templatesFiltrados()" [class.selected-template]="vendaForm.value.template === template.codigo" (click)="selecionarTemplate(template)">
                  <mat-icon>auto_awesome_motion</mat-icon>
                  <span>
                    <strong>{{ template.nome }}</strong>
                    <small>{{ template.descricao }}</small>
                  </span>
                </button>
              </div>
            </form>
          </app-section-card>
        </mat-tab>

        <mat-tab label="Opções">
          <app-section-card titulo="Campos e opções" subtitulo="Adicione, remova, ordene e altere campos sem criar combinações manualmente">
            <div class="quick-actions" *ngIf="graficaProduto">
              <button mat-stroked-button type="button" *ngFor="let sugestao of sugestoes" (click)="usarSugestao(sugestao)">
                <mat-icon>add</mat-icon>{{ sugestao.nome }}
              </button>
              <button mat-stroked-button type="button" (click)="novoParametro()"><mat-icon>add_circle</mat-icon>Outro campo</button>
            </div>

            <form class="param-form" *ngIf="graficaProduto && editandoParametro" [formGroup]="parametroForm" (ngSubmit)="salvarParametro()">
              <mat-form-field appearance="outline"><mat-label>Nome do campo</mat-label><input matInput formControlName="nome" /></mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Como o cliente informa?</mat-label>
                <mat-select formControlName="tipoDado">
                  <mat-option *ngFor="let tipo of tipos" [value]="tipo.value">{{ tipo.label }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-checkbox formControlName="obrigatorio">Obrigatório</mat-checkbox>
              <mat-checkbox formControlName="ativo">Ativo</mat-checkbox>
              <div class="form-actions">
                <button mat-flat-button color="primary" type="submit" [disabled]="parametroForm.invalid || salvando"><mat-icon>save</mat-icon>Salvar</button>
                <button mat-button type="button" (click)="cancelarParametro()">Cancelar</button>
              </div>
            </form>

            <div class="empty" *ngIf="!graficaProduto">Finalize Produto e Venda para carregar a configuração.</div>
            <mat-accordion *ngIf="graficaProduto">
              <mat-expansion-panel *ngFor="let parametro of graficaProduto.parametros; let i = index">
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ parametro.nome }}</mat-panel-title>
                  <mat-panel-description>{{ tipoLabel(parametro.tipoDado) }} · {{ parametro.obrigatorio ? 'Obrigatório' : 'Opcional' }} · {{ parametro.ativo ? 'Ativo' : 'Inativo' }}</mat-panel-description>
                </mat-expansion-panel-header>

                <div class="row-actions">
                  <button mat-icon-button type="button" matTooltip="Subir" [disabled]="i === 0" (click)="moverParametro(i, -1)"><mat-icon>arrow_upward</mat-icon></button>
                  <button mat-icon-button type="button" matTooltip="Descer" [disabled]="i === graficaProduto.parametros.length - 1" (click)="moverParametro(i, 1)"><mat-icon>arrow_downward</mat-icon></button>
                  <button mat-button type="button" (click)="editarParametro(parametro)"><mat-icon>edit</mat-icon>Editar</button>
                  <button mat-button type="button" (click)="alternarParametro(parametro)"><mat-icon>{{ parametro.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>{{ parametro.ativo ? 'Desativar' : 'Ativar' }}</button>
                  <button mat-button color="warn" type="button" (click)="removerParametro(parametro)"><mat-icon>delete</mat-icon>Remover</button>
                </div>

                <form class="batch-form" *ngIf="parametro.tipoDado === 'SELECAO'" [formGroup]="opcoesLoteForm" (ngSubmit)="adicionarOpcoesEmLote(parametro)">
                  <mat-form-field appearance="outline">
                    <mat-label>Adicionar várias opções</mat-label>
                    <textarea matInput rows="3" formControlName="texto" placeholder="500, 1000, 2500 ou uma opção por linha"></textarea>
                  </mat-form-field>
                  <button mat-stroked-button color="primary" type="submit"><mat-icon>playlist_add</mat-icon>Adicionar</button>
                </form>

                <div class="option-list" *ngIf="parametro.tipoDado === 'SELECAO'">
                  <div class="option-row" *ngFor="let opcao of parametro.opcoes; let oi = index">
                    <span>{{ opcao.nome }}</span>
                    <small>{{ opcao.ativo ? 'Ativa' : 'Inativa' }}</small>
                    <button mat-icon-button matTooltip="Subir" [disabled]="oi === 0" (click)="moverOpcao(parametro, oi, -1)"><mat-icon>arrow_upward</mat-icon></button>
                    <button mat-icon-button matTooltip="Descer" [disabled]="oi === parametro.opcoes.length - 1" (click)="moverOpcao(parametro, oi, 1)"><mat-icon>arrow_downward</mat-icon></button>
                    <button mat-icon-button matTooltip="Alternar status" (click)="alternarOpcao(parametro, opcao)"><mat-icon>{{ opcao.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon></button>
                    <button mat-icon-button color="warn" matTooltip="Remover" (click)="removerOpcao(parametro, opcao)"><mat-icon>delete</mat-icon></button>
                  </div>
                </div>
              </mat-expansion-panel>
            </mat-accordion>
          </app-section-card>

          <app-section-card *ngIf="graficaProduto" titulo="Dependências" subtitulo="Defina quais opções continuam disponíveis depois de uma escolha">
            <form class="dependency-form" [formGroup]="dependenciaForm" (ngSubmit)="salvarDependencia()">
              <mat-form-field appearance="outline">
                <mat-label>Quando este campo for</mat-label>
                <mat-select formControlName="parametroOrigemId" (selectionChange)="dependenciaForm.patchValue({ opcaoOrigemId: null })">
                  <mat-option *ngFor="let parametro of parametrosSelecao()" [value]="parametro.id">{{ parametro.nome }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Opção escolhida</mat-label>
                <mat-select formControlName="opcaoOrigemId">
                  <mat-option *ngFor="let opcao of opcoesDoParametro(dependenciaForm.value.parametroOrigemId)" [value]="opcao.id">{{ opcao.nome }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>O campo permitido será</mat-label>
                <mat-select formControlName="parametroDestinoId" (selectionChange)="dependenciaForm.patchValue({ opcoesDestinoIds: [] })">
                  <mat-option *ngFor="let parametro of parametrosSelecao()" [value]="parametro.id">{{ parametro.nome }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Opções permitidas</mat-label>
                <mat-select multiple formControlName="opcoesDestinoIds">
                  <mat-option *ngFor="let opcao of opcoesDoParametro(dependenciaForm.value.parametroDestinoId)" [value]="opcao.id">{{ opcao.nome }}</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit" [disabled]="dependenciaForm.invalid || salvando"><mat-icon>rule</mat-icon>Salvar regra</button>
            </form>

            <div class="rule-list">
              <div class="rule-row" *ngFor="let regra of dependencias">
                <mat-icon>rule</mat-icon>
                <span>Quando {{ regra.parametroOrigemNome }} for {{ regra.opcaoOrigemNome }}, {{ regra.parametroDestinoNome }} permite {{ regra.opcaoDestinoNome }}</span>
              </div>
              <div class="empty compact" *ngIf="!dependencias.length">Nenhuma dependência configurada.</div>
            </div>
          </app-section-card>
        </mat-tab>

        <mat-tab label="Preços">
          <app-section-card titulo="Preços" subtitulo="Configure como este produto é cobrado">
            <form class="price-form" [formGroup]="precoForm" (ngSubmit)="adicionarPolitica()">
              <mat-form-field appearance="outline">
                <mat-label>Como você cobra este produto?</mat-label>
                <mat-select formControlName="tipo">
                  <mat-option *ngFor="let tipo of tiposPreco" [value]="tipo.value">{{ tipo.label }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Nome da regra</mat-label>
                <input matInput formControlName="nome" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Esta regra vale quando</mat-label>
                <mat-select multiple formControlName="selecaoOpcaoIds">
                  <mat-optgroup *ngFor="let parametro of parametrosSelecao()" [label]="parametro.nome">
                    <mat-option *ngFor="let opcao of parametro.opcoes" [value]="opcao.id">{{ opcao.nome }}</mat-option>
                  </mat-optgroup>
                </mat-select>
              </mat-form-field>
              <mat-checkbox formControlName="ativo">Ativa</mat-checkbox>

              <mat-form-field appearance="outline" *ngIf="precoForm.value.tipo === 'FIXO'">
                <mat-label>Preço</mat-label>
                <input matInput type="number" formControlName="valorFixo" />
              </mat-form-field>
              <mat-checkbox *ngIf="precoForm.value.tipo === 'FIXO'" formControlName="multiplicaQuantidade">Multiplica pela quantidade</mat-checkbox>

              <mat-form-field appearance="outline" *ngIf="precoForm.value.tipo === 'POR_METRO_QUADRADO'">
                <mat-label>Preço/m²</mat-label>
                <input matInput type="number" formControlName="precoMetroQuadrado" />
              </mat-form-field>
              <mat-form-field appearance="outline" *ngIf="precoForm.value.tipo === 'POR_METRO_QUADRADO'">
                <mat-label>Mínimo faturável m²</mat-label>
                <input matInput type="number" formControlName="minimoMetroQuadrado" />
              </mat-form-field>

              <mat-form-field appearance="outline" class="wide" *ngIf="precoForm.value.tipo === 'POR_FAIXA_QUANTIDADE'">
                <mat-label>Faixas: de;até;valor por unidade</mat-label>
                <textarea matInput rows="5" formControlName="faixasTexto" placeholder="1;9;0.25&#10;10;19;0.20&#10;50;;0.15"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="wide" *ngIf="precoForm.value.tipo === 'POR_LOTE'">
                <mat-label>Preços fechados: quantidade;valor</mat-label>
                <textarea matInput rows="5" formControlName="lotesTexto" placeholder="2500;274.17&#10;5000;418.00&#10;10000;752.40"></textarea>
              </mat-form-field>

              <div class="form-actions wide">
                <button mat-stroked-button type="button" (click)="limparPrecoForm()">Cancelar</button>
                <button mat-flat-button color="primary" type="submit"><mat-icon>add</mat-icon>Adicionar regra</button>
                <button mat-flat-button color="primary" type="button" [disabled]="!graficaProduto || salvando" (click)="salvarPoliticas()"><mat-icon>save</mat-icon>Salvar preços</button>
              </div>
            </form>

            <div class="bulk-actions" *ngIf="politicas.length">
              <mat-form-field appearance="outline">
                <mat-label>Reajuste percentual</mat-label>
                <input matInput type="number" [formControl]="reajustePercentualControl" />
              </mat-form-field>
              <button mat-stroked-button type="button" (click)="aplicarReajustePercentual()"><mat-icon>percent</mat-icon>Aplicar nos preços visíveis</button>
              <button mat-stroked-button color="warn" type="button" (click)="limparPoliticasLocais()"><mat-icon>delete_sweep</mat-icon>Limpar alterações locais</button>
            </div>

            <div class="price-list">
              <div class="price-row" *ngFor="let politica of politicas; let pi = index">
                <div>
                  <strong>{{ politica.nome }}</strong>
                  <small>{{ tipoPrecoLabel(politica.tipo) }} · {{ politica.ativo ? 'Ativa' : 'Inativa' }} · {{ selecoesPrecoLabel(politica) }}</small>
                </div>
                <button mat-icon-button matTooltip="Remover regra" color="warn" (click)="removerPoliticaLocal(pi)"><mat-icon>delete</mat-icon></button>
                <div class="price-lines" *ngIf="politica.tipo === 'POR_FAIXA_QUANTIDADE'">
                  <span *ngFor="let faixa of politica.faixas">{{ faixa.inicio }}–{{ faixa.fim || '∞' }}: {{ faixa.valorUnitario | currency:'BRL':'symbol':'1.2-4' }}</span>
                </div>
                <div class="price-lines" *ngIf="politica.tipo === 'POR_LOTE'">
                  <span *ngFor="let lote of politica.lotes">{{ lote.quantidade }}: {{ lote.valorLote | currency:'BRL' }}</span>
                </div>
                <div class="price-lines" *ngIf="politica.tipo === 'FIXO'">
                  <span>{{ politica.valorFixo | currency:'BRL' }} {{ politica.multiplicaQuantidade ? 'por unidade' : 'total' }}</span>
                </div>
                <div class="price-lines" *ngIf="politica.tipo === 'POR_METRO_QUADRADO'">
                  <span>{{ politica.precoMetroQuadrado | currency:'BRL' }}/m² · mínimo {{ politica.minimoMetroQuadrado || 0 }} m²</span>
                </div>
              </div>
              <div class="empty compact" *ngIf="!politicas.length">Nenhuma regra de preço cadastrada.</div>
            </div>
          </app-section-card>

          <app-section-card titulo="Preview com preço" subtitulo="Teste uma configuração usando o cálculo oficial do backend">
            <form class="preview-price-form" [formGroup]="previewPrecoForm" (ngSubmit)="calcularPreview()">
              <mat-form-field appearance="outline" *ngFor="let parametro of parametrosSelecao()">
                <mat-label>{{ parametro.nome }}</mat-label>
                <mat-select [value]="previewSelecoes[parametro.codigo]" (selectionChange)="previewSelecoes[parametro.codigo] = $event.value">
                  <mat-option *ngFor="let opcao of parametro.opcoes" [value]="opcao.codigo">{{ opcao.nome }}</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Quantidade</mat-label>
                <input matInput type="number" formControlName="quantidade" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Largura</mat-label>
                <input matInput type="number" formControlName="largura" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Altura</mat-label>
                <input matInput type="number" formControlName="altura" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Unidade</mat-label>
                <mat-select formControlName="unidadeDimensao">
                  <mat-option value="METRO">Metro</mat-option>
                  <mat-option value="CENTIMETRO">Centímetro</mat-option>
                  <mat-option value="MILIMETRO">Milímetro</mat-option>
                </mat-select>
              </mat-form-field>
              <button mat-flat-button color="primary" type="submit"><mat-icon>calculate</mat-icon>Calcular</button>
            </form>

            <div class="price-result" *ngIf="resultadoPreco">
              <strong>{{ resultadoPreco.status === 'PRECO_CALCULADO' ? (resultadoPreco.valorTotal | currency:'BRL') : resultadoPreco.mensagem }}</strong>
              <small *ngIf="resultadoPreco.regraAplicadaNome">{{ resultadoPreco.regraAplicadaNome }}</small>
              <div class="price-lines">
                <span *ngFor="let detalhe of resultadoPreco.detalhes">{{ detalhe }}</span>
              </div>
            </div>
          </app-section-card>
        </mat-tab>

        <mat-tab label="Revisão">
          <app-section-card titulo="Revisão" subtitulo="Confira como o operador verá a configuração no admin">
            <div class="review">
              <div>
                <strong>{{ produtoResumo }}</strong>
                <small>{{ vendaResumo }}</small>
              </div>
              <div class="preview-list" *ngIf="graficaProduto">
                <div class="preview-field" *ngFor="let parametro of graficaProduto.parametros">
                  <label>{{ parametro.nome }}</label>
                  <div class="chips" *ngIf="parametro.tipoDado === 'SELECAO'; else inputPreview">
                    <span *ngFor="let opcao of parametro.opcoes | slice:0:6">{{ opcao.nome }}</span>
                  </div>
                  <ng-template #inputPreview><input disabled [placeholder]="tipoLabel(parametro.tipoDado)" /></ng-template>
                </div>
              </div>
              <div class="empty" *ngIf="!graficaProduto && vendaForm.value.modoVenda === 'SIMPLES'">Produto criado no Catálogo. Este produto não precisa de configuração gráfica.</div>
            </div>
          </app-section-card>
        </mat-tab>
      </mat-tab-group>

      <div class="actions">
        <button mat-stroked-button type="button" (click)="voltar()"><mat-icon>arrow_back</mat-icon>Voltar</button>
        <button mat-button type="button" [disabled]="aba === 0" (click)="aba = aba - 1">Anterior</button>
        <button mat-button type="button" [disabled]="aba === 4" (click)="avancar()">Próximo</button>
        <button mat-flat-button color="primary" type="button" *ngIf="!isEdit" [disabled]="salvando" (click)="finalizarNovo()">
          <mat-icon>save</mat-icon>{{ salvando ? 'Salvando...' : 'Salvar' }}
        </button>
      </div>
    </app-page-card>
  `,
  styles: [`
    mat-tab-group{margin-top:8px}.stack{display:grid;gap:16px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.choice-list{display:grid;gap:10px}.template-list,.quick-actions,.bulk-actions{display:flex;flex-wrap:wrap;gap:10px}.template-list button{height:auto;min-height:58px;text-align:left}.template-list span{display:grid}.template-list small{color:#6b7280}.selected-template{border-color:#5d87ff}.param-form,.dependency-form,.price-form,.preview-price-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;align-items:center;margin-bottom:16px}.wide{grid-column:1/-1}.field-help{color:#64748b;font-size:13px;margin-top:-8px}.field-help a{color:#1e88e5;font-weight:600;margin-left:6px;text-decoration:none}.form-actions,.row-actions,.actions{display:flex;gap:10px;align-items:center;justify-content:flex-end;flex-wrap:wrap}.batch-form{display:grid;grid-template-columns:1fr auto;gap:12px;align-items:start;margin:12px 0}.option-list,.rule-list,.preview-list,.price-list{display:grid;gap:8px}.option-row,.rule-row,.preview-field,.price-row,.price-result{display:flex;align-items:center;gap:8px;border:1px solid #e5eaef;border-radius:8px;padding:8px 10px}.price-row,.price-result{display:grid}.option-row span{font-weight:600}.option-row small,.price-row small,.price-result small{color:#6b7280;margin-right:auto}.rule-row span{line-height:1.35}.price-lines{display:flex;flex-wrap:wrap;gap:8px}.price-lines span{border:1px solid #d7dde5;border-radius:16px;padding:4px 10px;background:#fff}.review{display:grid;gap:16px}.review strong{display:block;font-size:18px}.review small{display:block;color:#6b7280;margin-top:2px}.preview-field{display:block}.preview-field label{display:block;font-weight:600;margin-bottom:8px}.chips{display:flex;flex-wrap:wrap;gap:8px}.chips span{border:1px solid #d7dde5;border-radius:16px;padding:4px 10px;background:#fff}.preview-field input{width:100%;border:1px solid #d7dde5;border-radius:6px;padding:10px;background:#f8fafc}.empty{color:#6b7280;text-align:center;padding:20px}.empty.compact{padding:8px}.actions{margin-top:16px}@media(max-width:960px){.grid,.param-form,.dependency-form,.price-form,.preview-price-form{grid-template-columns:1fr}.batch-form{grid-template-columns:1fr}.actions{justify-content:stretch}.actions button{flex:1}.option-row{flex-wrap:wrap}.option-row small{width:100%}}`],
})
export class GraficaProdutoFormComponent implements OnInit {
  produtosCatalogo: CatalogoProdutoOption[] = [];
  categorias: CatalogoCategoriaOption[] = [];
  unidades = CATALOGO_UNIDADES_VENDA;
  graficaProduto: GraficaProduto | null = null;
  dependencias: GraficaDependencia[] = [];
  politicas: GraficaPrecoPolitica[] = [];
  previewSelecoes: Record<string, string> = {};
  resultadoPreco: GraficaPrecificacaoResultado | null = null;
  isEdit = false;
  aba = 0;
  salvando = false;
  editandoParametro: GraficaParametro | null = null;

  readonly tipos: Array<{ value: GraficaTipoParametro; label: string }> = [
    { value: 'SELECAO', label: 'Escolhe entre opções' },
    { value: 'NUMERO_INTEIRO', label: 'Digita um número' },
    { value: 'NUMERO_DECIMAL', label: 'Digita um valor' },
    { value: 'TEXTO', label: 'Digita um texto' },
  ];
  readonly tiposPreco: TipoPrecoUi[] = [
    { value: 'FIXO', label: 'Um preço único' },
    { value: 'POR_FAIXA_QUANTIDADE', label: 'O preço muda conforme a quantidade' },
    { value: 'POR_LOTE', label: 'Tenho preços fechados por quantidade' },
    { value: 'POR_METRO_QUADRADO', label: 'Cobro por metro quadrado' },
  ];
  readonly sugestoes: Array<{ nome: string; tipo: GraficaTipoParametro }> = [
    { nome: 'Formato', tipo: 'SELECAO' },
    { nome: 'Material', tipo: 'SELECAO' },
    { nome: 'Papel', tipo: 'SELECAO' },
    { nome: 'Gramatura', tipo: 'SELECAO' },
    { nome: 'Cor', tipo: 'SELECAO' },
    { nome: 'Cores de impressão', tipo: 'SELECAO' },
    { nome: 'Quantidade', tipo: 'SELECAO' },
    { nome: 'Acabamento', tipo: 'SELECAO' },
    { nome: 'Largura', tipo: 'NUMERO_DECIMAL' },
    { nome: 'Altura', tipo: 'NUMERO_DECIMAL' },
    { nome: 'Número de páginas', tipo: 'NUMERO_INTEIRO' },
    { nome: 'Tipo de impressão', tipo: 'SELECAO' },
  ];
  readonly templates: TemplateUi[] = [
    { codigo: 'CONFIGURAVEL', nome: 'Produto configurável', descricao: 'Começa sem campos prontos', modo: 'CONFIGURAVEL' },
    { codigo: 'PANFLETO', nome: 'Panfleto', descricao: 'Formato, papel, gramatura, cores e quantidade', modo: 'CONFIGURAVEL' },
    { codigo: 'CARTAO_VISITA', nome: 'Cartão de visita', descricao: 'Campos comuns para cartão', modo: 'CONFIGURAVEL' },
    { codigo: 'XEROX_IMPRESSAO', nome: 'Xerox / impressão', descricao: 'Quantidade, formato e cor', modo: 'QUANTIDADE' },
    { codigo: 'BANNER', nome: 'Banner / por medida', descricao: 'Material, largura, altura e acabamento', modo: 'MEDIDA' },
    { codigo: 'PERSONALIZADO', nome: 'Personalizado', descricao: 'Sem campos iniciais', modo: 'CONFIGURAVEL' },
    { codigo: 'COMECAR_DO_ZERO', nome: 'Começar do zero', descricao: 'Configuração vazia', modo: 'CONFIGURAVEL' },
  ];

  produtoForm = this.fb.group({
    origem: ['EXISTENTE' as OrigemProduto, Validators.required],
    catalogoProdutoId: [null as number | null],
    nome: [''],
    categoriaId: [null as number | null],
    unidadeVenda: ['UNIDADE'],
  });
  vendaForm = this.fb.group({
    modoVenda: ['CONFIGURAVEL' as ModoVenda, Validators.required],
    template: ['PANFLETO'],
  });
  parametroForm = this.fb.group({
    nome: ['', Validators.required],
    tipoDado: ['SELECAO' as GraficaTipoParametro, Validators.required],
    obrigatorio: [true],
    ativo: [true],
  });
  opcoesLoteForm = this.fb.group({ texto: [''] });
  dependenciaForm = this.fb.group({
    parametroOrigemId: [null as number | null, Validators.required],
    opcaoOrigemId: [null as number | null, Validators.required],
    parametroDestinoId: [null as number | null, Validators.required],
    opcoesDestinoIds: [[] as number[], Validators.required],
  });
  precoForm = this.fb.group({
    tipo: ['POR_LOTE' as GraficaTipoPrecificacao, Validators.required],
    nome: [''],
    selecaoOpcaoIds: [[] as number[]],
    ativo: [true],
    multiplicaQuantidade: [false],
    valorFixo: [null as number | null],
    precoMetroQuadrado: [null as number | null],
    minimoMetroQuadrado: [null as number | null],
    faixasTexto: [''],
    lotesTexto: [''],
  });
  previewPrecoForm = this.fb.group({
    quantidade: [null as number | null],
    largura: [null as number | null],
    altura: [null as number | null],
    unidadeDimensao: ['METRO'],
  });
  reajustePercentualControl = new FormControl<number | null>(null);

  constructor(
    private readonly fb: FormBuilder,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly graficaService: GraficaProdutoService,
    private readonly catalogoProdutoService: CatalogoProdutoService,
    private readonly categoriaService: CatalogoCategoriaService,
    private readonly toastr: ToastrService
  ) {}

  get titulo(): string { return this.isEdit ? 'Configurar produto gráfico' : 'Novo produto gráfico'; }
  get produtoResumo(): string {
    return this.graficaProduto?.catalogoProdutoNome || this.nomeProdutoSelecionado() || this.produtoForm.value.nome || 'Produto';
  }
  get vendaResumo(): string {
    if (this.vendaForm.value.modoVenda === 'SIMPLES') return 'Produto simples, sem configuração gráfica';
    const template = this.templates.find((item) => item.codigo === this.vendaForm.value.template);
    return template ? template.nome : 'Configuração personalizada';
  }

  ngOnInit(): void {
    this.carregarProdutosCatalogo();
    this.carregarCategorias();
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (id) {
      this.isEdit = true;
      this.graficaService.detalhar(id).subscribe({
        next: (produto) => this.aplicarGraficaProduto(produto),
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Produto gráfico não encontrado.')),
      });
    }
  }

  templatesFiltrados(): TemplateUi[] {
    const modo = this.vendaForm.value.modoVenda;
    if (modo === 'QUANTIDADE') return this.templates.filter((item) => item.modo === 'QUANTIDADE' || item.codigo === 'COMECAR_DO_ZERO');
    if (modo === 'MEDIDA') return this.templates.filter((item) => item.modo === 'MEDIDA' || item.codigo === 'COMECAR_DO_ZERO');
    return this.templates.filter((item) => item.modo === 'CONFIGURAVEL');
  }

  selecionarTemplate(template: TemplateUi): void {
    this.vendaForm.patchValue({ template: template.codigo, modoVenda: template.modo });
  }

  avancar(): void {
    if (this.aba === 0 && !this.validarProduto()) return;
    if (this.aba === 1 && !this.isEdit && !this.graficaProduto && this.vendaForm.value.modoVenda !== 'SIMPLES') {
      this.finalizarNovo();
      return;
    }
    this.aba = Math.min(4, this.aba + 1);
  }

  finalizarNovo(): void {
    if (!this.validarProduto()) return;
    this.salvando = true;
    this.resolverProdutoCatalogo().pipe(
      switchMap((produto) => {
        if (this.vendaForm.value.modoVenda === 'SIMPLES') return of({ produto, grafica: null as GraficaProduto | null });
        return this.graficaService.habilitar({ catalogoProdutoId: produto.id, ativo: true }).pipe(
          switchMap((grafica) => {
            const template = this.vendaForm.value.template || 'COMECAR_DO_ZERO';
            if (template === 'COMECAR_DO_ZERO' || template === 'PERSONALIZADO' || template === 'CONFIGURAVEL') return of(grafica);
            return this.graficaService.aplicarTemplate(grafica.id, template);
          }),
          switchMap((grafica) => of({ produto, grafica }))
        );
      })
    ).subscribe({
      next: ({ grafica }) => {
        this.salvando = false;
        if (!grafica) {
          this.toastr.success('Produto criado no Catálogo. Este produto não precisa de configuração gráfica.');
          this.aba = 3;
          return;
        }
        this.toastr.success('Produto gráfico criado.');
        this.router.navigate(['/page/grafica/produtos', grafica.id, 'editar']);
      },
      error: (error) => {
        this.salvando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o produto gráfico.'));
      },
    });
  }

  usarSugestao(sugestao: { nome: string; tipo: GraficaTipoParametro }): void {
    this.editandoParametro = null;
    this.parametroForm.reset({ nome: sugestao.nome, tipoDado: sugestao.tipo, obrigatorio: true, ativo: true });
  }

  novoParametro(): void {
    this.editandoParametro = null;
    this.parametroForm.reset({ nome: '', tipoDado: 'SELECAO', obrigatorio: true, ativo: true });
  }

  editarParametro(parametro: GraficaParametro): void {
    this.editandoParametro = parametro;
    this.parametroForm.reset({ nome: parametro.nome, tipoDado: parametro.tipoDado, obrigatorio: parametro.obrigatorio, ativo: parametro.ativo });
  }

  cancelarParametro(): void {
    this.editandoParametro = null;
  }

  salvarParametro(): void {
    if (!this.graficaProduto || this.parametroForm.invalid) return;
    this.salvando = true;
    const raw = this.parametroForm.getRawValue();
    const payload: GraficaParametroRequest = {
      codigo: this.codigo(raw.nome || ''),
      nome: raw.nome || '',
      tipoDado: raw.tipoDado || 'SELECAO',
      ordem: this.editandoParametro?.ordem || (this.graficaProduto.parametros.length + 1),
      obrigatorio: raw.obrigatorio,
      ativo: raw.ativo,
    };
    const request = this.editandoParametro
      ? this.graficaService.editarParametro(this.graficaProduto.id, this.editandoParametro.id, payload)
      : this.graficaService.cadastrarParametro(this.graficaProduto.id, payload);
    request.subscribe({
      next: (produto) => {
        this.salvando = false;
        this.editandoParametro = null;
        this.aplicarGraficaProduto(produto);
      },
      error: (error) => {
        this.salvando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar o campo.'));
      },
    });
  }

  adicionarOpcoesEmLote(parametro: GraficaParametro): void {
    if (!this.graficaProduto) return;
    const valores = this.parseOpcoes(this.opcoesLoteForm.value.texto || '');
    if (!valores.length) return;
    this.graficaService.cadastrarOpcoesEmLote(this.graficaProduto.id, parametro.id, { valores }).subscribe({
      next: (produto) => {
        this.opcoesLoteForm.reset();
        this.aplicarGraficaProduto(produto);
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível adicionar opções.')),
    });
  }

  moverParametro(index: number, delta: number): void {
    if (!this.graficaProduto) return;
    const itens = [...this.graficaProduto.parametros];
    const destino = index + delta;
    [itens[index], itens[destino]] = [itens[destino], itens[index]];
    this.graficaService.ordenarParametros(this.graficaProduto.id, { itens: itens.map((item, i) => ({ id: item.id, ordem: i + 1 })) })
      .subscribe({ next: (produto) => this.aplicarGraficaProduto(produto), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível ordenar campos.')) });
  }

  moverOpcao(parametro: GraficaParametro, index: number, delta: number): void {
    if (!this.graficaProduto) return;
    const itens = [...parametro.opcoes];
    const destino = index + delta;
    [itens[index], itens[destino]] = [itens[destino], itens[index]];
    this.graficaService.ordenarOpcoes(this.graficaProduto.id, parametro.id, { itens: itens.map((item, i) => ({ id: item.id, ordem: i + 1 })) })
      .subscribe({ next: (produto) => this.aplicarGraficaProduto(produto), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível ordenar opções.')) });
  }

  alternarParametro(parametro: GraficaParametro): void {
    if (!this.graficaProduto) return;
    this.graficaService.alterarStatusParametro(this.graficaProduto.id, parametro.id, !parametro.ativo)
      .subscribe({ next: (produto) => this.aplicarGraficaProduto(produto), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível alterar o campo.')) });
  }

  removerParametro(parametro: GraficaParametro): void {
    if (!this.graficaProduto) return;
    this.graficaService.removerParametro(this.graficaProduto.id, parametro.id)
      .subscribe({ next: (produto) => this.aplicarGraficaProduto(produto), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível remover o campo.')) });
  }

  alternarOpcao(parametro: GraficaParametro, opcao: GraficaOpcao): void {
    if (!this.graficaProduto) return;
    this.graficaService.alterarStatusOpcao(this.graficaProduto.id, parametro.id, opcao.id, !opcao.ativo)
      .subscribe({ next: (produto) => this.aplicarGraficaProduto(produto), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível alterar a opção.')) });
  }

  removerOpcao(parametro: GraficaParametro, opcao: GraficaOpcao): void {
    if (!this.graficaProduto) return;
    this.graficaService.removerOpcao(this.graficaProduto.id, parametro.id, opcao.id)
      .subscribe({ next: (produto) => this.aplicarGraficaProduto(produto), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível remover a opção.')) });
  }

  salvarDependencia(): void {
    if (!this.graficaProduto || this.dependenciaForm.invalid) return;
    const raw = this.dependenciaForm.getRawValue();
    this.graficaService.salvarDependencia(this.graficaProduto.id, {
      opcaoOrigemId: raw.opcaoOrigemId!,
      parametroDestinoId: raw.parametroDestinoId!,
      opcoesDestinoIds: raw.opcoesDestinoIds || [],
    }).subscribe({
      next: (produto) => {
        this.dependenciaForm.reset({ opcoesDestinoIds: [] });
        this.aplicarGraficaProduto(produto);
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível salvar a dependência.')),
    });
  }

  adicionarPolitica(): void {
    const raw = this.precoForm.getRawValue();
    const politica: GraficaPrecoPolitica = {
      nome: raw.nome || this.tipoPrecoLabel(raw.tipo || 'POR_LOTE'),
      tipo: raw.tipo || 'POR_LOTE',
      ativo: raw.ativo ?? true,
      multiplicaQuantidade: raw.multiplicaQuantidade,
      valorFixo: raw.valorFixo,
      precoMetroQuadrado: raw.precoMetroQuadrado,
      minimoMetroQuadrado: raw.minimoMetroQuadrado,
      selecoes: this.selecoesPorIds(raw.selecaoOpcaoIds || []),
      faixas: this.parseFaixas(raw.faixasTexto || ''),
      lotes: this.parseLotes(raw.lotesTexto || ''),
    };
    this.politicas = [...this.politicas, politica];
    this.limparPrecoForm();
  }

  salvarPoliticas(): void {
    if (!this.graficaProduto) return;
    this.salvando = true;
    const payload: GraficaPrecoPoliticaRequest[] = this.politicas.map((politica) => ({
      id: politica.id,
      nome: politica.nome,
      tipo: politica.tipo,
      ativo: politica.ativo,
      multiplicaQuantidade: politica.multiplicaQuantidade,
      valorFixo: politica.valorFixo,
      precoMetroQuadrado: politica.precoMetroQuadrado,
      minimoMetroQuadrado: politica.minimoMetroQuadrado,
      selecaoOpcaoIds: politica.selecoes.map((selecao) => selecao.opcaoId),
      faixas: politica.faixas,
      lotes: politica.lotes,
    }));
    this.graficaService.salvarPrecos(this.graficaProduto.id, payload).subscribe({
      next: (politicas) => {
        this.salvando = false;
        this.politicas = politicas || [];
        this.toastr.success('Preços salvos.');
      },
      error: (error) => {
        this.salvando = false;
        this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível salvar os preços.'));
      },
    });
  }

  removerPoliticaLocal(index: number): void {
    this.politicas = this.politicas.filter((_, i) => i !== index);
  }

  limparPoliticasLocais(): void {
    this.carregarPrecos();
  }

  limparPrecoForm(): void {
    this.precoForm.reset({ tipo: 'POR_LOTE', ativo: true, multiplicaQuantidade: false, selecaoOpcaoIds: [] });
  }

  aplicarReajustePercentual(): void {
    const percentual = Number(this.reajustePercentualControl.value || 0);
    if (!percentual) return;
    const fator = 1 + percentual / 100;
    this.politicas = this.politicas.map((politica) => ({
      ...politica,
      valorFixo: politica.valorFixo != null ? this.arredondar(politica.valorFixo * fator) : politica.valorFixo,
      precoMetroQuadrado: politica.precoMetroQuadrado != null ? this.arredondar(politica.precoMetroQuadrado * fator) : politica.precoMetroQuadrado,
      faixas: politica.faixas.map((faixa) => ({ ...faixa, valorUnitario: this.arredondar(faixa.valorUnitario * fator) })),
      lotes: politica.lotes.map((lote) => ({ ...lote, valorLote: this.arredondar(lote.valorLote * fator) })),
    }));
  }

  calcularPreview(): void {
    if (!this.graficaProduto) return;
    const raw = this.previewPrecoForm.getRawValue();
    this.graficaService.precificar(this.graficaProduto.id, {
      selecoes: this.previewSelecoes,
      quantidade: raw.quantidade,
      largura: raw.largura,
      altura: raw.altura,
      unidadeDimensao: raw.unidadeDimensao as any,
    }).subscribe({
      next: (resultado) => this.resultadoPreco = resultado,
      error: (error) => this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível calcular o preço.')),
    });
  }

  tipoPrecoLabel(tipo: GraficaTipoPrecificacao): string {
    return this.tiposPreco.find((item) => item.value === tipo)?.label || tipo;
  }

  selecoesPrecoLabel(politica: GraficaPrecoPolitica): string {
    if (!politica.selecoes?.length) return 'vale para qualquer configuração';
    return politica.selecoes.map((selecao) => `${selecao.parametroNome}: ${selecao.opcaoNome}`).join(', ');
  }

  parametrosSelecao(): GraficaParametro[] {
    return this.graficaProduto?.parametros.filter((parametro) => parametro.tipoDado === 'SELECAO' && parametro.ativo) || [];
  }

  opcoesDoParametro(parametroId?: number | null): GraficaOpcao[] {
    return this.graficaProduto?.parametros.find((parametro) => parametro.id === parametroId)?.opcoes.filter((opcao) => opcao.ativo) || [];
  }

  tipoLabel(tipo: GraficaTipoParametro): string {
    return this.tipos.find((item) => item.value === tipo)?.label || tipo;
  }

  voltar(): void {
    this.router.navigate(['/page/grafica/produtos']);
  }

  private aplicarGraficaProduto(produto: GraficaProduto): void {
    this.graficaProduto = produto;
    this.dependencias = produto.dependencias || [];
    this.carregarPrecos();
  }

  private carregarPrecos(): void {
    if (!this.graficaProduto) return;
    this.graficaService.listarPrecos(this.graficaProduto.id).subscribe({
      next: (politicas) => this.politicas = politicas || [],
      error: (error) => this.toastr.error(this.graficaErrorMessage(error, 'Não foi possível carregar preços.')),
    });
  }

  private carregarProdutosCatalogo(): void {
    this.catalogoProdutoService.options(true).pipe(
      catchError((error) => {
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar produtos do Catálogo.'));
        return of([]);
      })
    ).subscribe((produtos) => this.produtosCatalogo = produtos || []);
  }

  private carregarCategorias(): void {
    this.categoriaService.options(true).pipe(
      catchError((error) => {
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar categorias do Catálogo.'));
        return of([]);
      })
    ).subscribe((categorias) => this.categorias = categorias || []);
  }

  private validarProduto(): boolean {
    if (this.isEdit) return true;
    if (this.produtoForm.value.origem === 'EXISTENTE' && !this.produtoForm.value.catalogoProdutoId) {
      this.toastr.warning('Selecione um produto do Catálogo.');
      return false;
    }
    if (this.produtoForm.value.origem === 'NOVO' && (!this.produtoForm.value.nome || !this.produtoForm.value.categoriaId)) {
      this.toastr.warning('Informe nome e categoria do produto.');
      return false;
    }
    return true;
  }

  private resolverProdutoCatalogo() {
    if (this.produtoForm.value.origem === 'EXISTENTE') {
      const id = Number(this.produtoForm.value.catalogoProdutoId);
      const option = this.produtosCatalogo.find((item) => item.id === id);
      return of({ id, nome: option?.nome || '' } as CatalogoProduto);
    }
    const nome = String(this.produtoForm.value.nome || '').trim();
    const payload: CatalogoProdutoRequest = {
      codigo: this.codigo(nome).slice(0, 50),
      nome,
      slug: catalogoSlugify(nome),
      categoriaId: this.produtoForm.value.categoriaId,
      unidadeVenda: this.produtoForm.value.unidadeVenda as any,
      ordemExibicao: 0,
      destaque: false,
      ativo: true,
      comercial: { exibirPreco: false, sobConsulta: true, permiteOrcamento: true },
      imagens: [],
      caracteristicas: [],
    };
    return this.catalogoProdutoService.criar(payload);
  }

  private nomeProdutoSelecionado(): string {
    return this.produtosCatalogo.find((item) => item.id === this.produtoForm.value.catalogoProdutoId)?.nome || '';
  }

  private parseOpcoes(texto: string): string[] {
    return Array.from(new Set(texto.split(/[\n,;]+/).map((item) => item.trim()).filter(Boolean)));
  }

  private parseFaixas(texto: string) {
    return texto.split(/\n+/)
      .map((linha) => linha.trim())
      .filter(Boolean)
      .map((linha) => {
        const [inicio, fim, valorUnitario] = linha.split(/[;\t,]+/).map((item) => item.trim());
        return { inicio: Number(inicio), fim: fim ? Number(fim) : null, valorUnitario: Number(valorUnitario) };
      });
  }

  private parseLotes(texto: string) {
    return texto.split(/\n+/)
      .map((linha) => linha.trim())
      .filter(Boolean)
      .map((linha) => {
        const [quantidade, valorLote] = linha.split(/[;\t,]+/).map((item) => item.trim());
        return { quantidade: Number(quantidade), valorLote: Number(valorLote) };
      });
  }

  private selecoesPorIds(ids: number[]) {
    const opcoes = new Map<number, { parametro: GraficaParametro; opcao: GraficaOpcao }>();
    this.parametrosSelecao().forEach((parametro) => {
      parametro.opcoes.forEach((opcao) => opcoes.set(opcao.id, { parametro, opcao }));
    });
    return ids.map((id) => opcoes.get(id)).filter(Boolean).map((item) => ({
      parametroId: item!.parametro.id,
      parametroCodigo: item!.parametro.codigo,
      parametroNome: item!.parametro.nome,
      opcaoId: item!.opcao.id,
      opcaoCodigo: item!.opcao.codigo,
      opcaoNome: item!.opcao.nome,
    }));
  }

  private arredondar(valor: number): number {
    return Math.round(valor * 100) / 100;
  }

  private graficaErrorMessage(error: any, fallback: string): string {
    const codigo = catalogoErrorMessage(error, fallback);
    const mensagens: Record<string, string> = {
      GRAFICA_PRECO_REGRA_AMBIGUA: 'Existe mais de uma regra de preço para esta configuração.',
      GRAFICA_PRECO_FAIXA_NAO_ENCONTRADA: 'A quantidade informada não possui uma faixa de preço.',
      GRAFICA_PRECO_LOTE_NAO_ENCONTRADO: 'A quantidade informada não possui um preço fechado.',
      FAIXA_PRECO_COM_GAP: 'As faixas de quantidade possuem intervalo sem preço.',
      FAIXA_PRECO_SOBREPOSTA: 'As faixas de quantidade possuem sobreposição.',
      FAIXA_PRECO_INVERTIDA: 'Há uma faixa com final menor que o início.',
      VALOR_FIXO_INVALIDO: 'Informe um preço único válido.',
      PRECO_M2_INVALIDO: 'Informe um preço por metro quadrado válido.',
      MINIMO_M2_INVALIDO: 'Informe um mínimo faturável válido.',
      QUANTIDADE_INVALIDA: 'Informe uma quantidade válida.',
      LARGURA_INVALIDA: 'Informe uma largura válida.',
      ALTURA_INVALIDA: 'Informe uma altura válida.',
    };
    return mensagens[codigo] || codigo;
  }

  private codigo(valor: string): string {
    return catalogoSlugify(valor).toUpperCase().replace(/-/g, '_').slice(0, 80) || 'CAMPO';
  }
}
