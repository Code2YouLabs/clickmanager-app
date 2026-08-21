import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { MaterialModule } from 'src/app/material.module';
import { CatalogoProdutoOption } from '../../catalogo/shared/models/catalogo.models';
import { CatalogoProdutoService } from '../../catalogo/shared/services/catalogo.service';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaOpcaoRequest, GraficaParametro, GraficaParametroRequest, GraficaProduto, GraficaTipoParametro } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

@Component({
  selector: 'app-grafica-produtos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <mat-card class="cardWithShadow">
      <mat-card-content>
        <div class="page-head">
          <div>
            <h2>Produtos graficos</h2>
            <p>Extensoes graficas vinculadas ao Catalogo.</p>
          </div>
          <form class="enable-form" [formGroup]="habilitarForm" (ngSubmit)="habilitarProduto()">
            <mat-form-field appearance="outline">
              <mat-label>Produto do Catalogo</mat-label>
              <mat-select formControlName="catalogoProdutoId">
                <mat-option *ngFor="let produto of produtosCatalogo" [value]="produto.id">
                  {{ produto.codigo }} - {{ produto.nome }}
                </mat-option>
              </mat-select>
            </mat-form-field>
            <button mat-flat-button color="primary" type="submit" [disabled]="habilitarForm.invalid || salvando">
              <mat-icon>add</mat-icon>
              Habilitar
            </button>
          </form>
        </div>

        <div class="content-grid">
          <section class="list-panel">
            <table mat-table [dataSource]="produtos" *ngIf="produtos.length">
              <ng-container matColumnDef="produto">
                <th mat-header-cell *matHeaderCellDef>Produto</th>
                <td mat-cell *matCellDef="let item">
                  <strong>{{ item.catalogoProdutoNome }}</strong>
                  <small>{{ item.catalogoProdutoCodigo }}</small>
                </td>
              </ng-container>
              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let item">
                  <span class="status" [class.off]="!item.ativo">{{ item.ativo ? 'Ativo' : 'Inativo' }}</span>
                </td>
              </ng-container>
              <ng-container matColumnDef="acoes">
                <th mat-header-cell *matHeaderCellDef></th>
                <td mat-cell *matCellDef="let item">
                  <button mat-icon-button (click)="selecionar(item)" matTooltip="Configurar">
                    <mat-icon>tune</mat-icon>
                  </button>
                  <button mat-icon-button (click)="alterarStatusProduto(item)" [matTooltip]="item.ativo ? 'Desativar' : 'Ativar'">
                    <mat-icon>{{ item.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  </button>
                </td>
              </ng-container>
              <tr mat-header-row *matHeaderRowDef="colunas"></tr>
              <tr mat-row *matRowDef="let row; columns: colunas" [class.selected]="selecionado?.id === row.id"></tr>
            </table>
            <div class="empty" *ngIf="!produtos.length">Nenhum produto grafico habilitado.</div>
            <mat-paginator [length]="total" [pageIndex]="pagina" [pageSize]="tamanho" [pageSizeOptions]="[10,20,50]" (page)="paginar($event)"></mat-paginator>
          </section>

          <section class="config-panel" *ngIf="selecionado">
            <div class="config-head">
              <div>
                <h3>{{ selecionado.catalogoProdutoNome }}</h3>
                <p>{{ selecionado.parametros.length }} parametros</p>
              </div>
              <button mat-stroked-button color="primary" (click)="novoParametro()">
                <mat-icon>add</mat-icon>
                Parametro
              </button>
            </div>

            <form class="param-form" *ngIf="editandoParametro" [formGroup]="parametroForm" (ngSubmit)="salvarParametro()">
              <mat-form-field appearance="outline"><mat-label>Codigo</mat-label><input matInput formControlName="codigo" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome" /></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Tipo</mat-label><mat-select formControlName="tipoDado"><mat-option *ngFor="let tipo of tipos" [value]="tipo">{{ tipo }}</mat-option></mat-select></mat-form-field>
              <mat-form-field appearance="outline"><mat-label>Ordem</mat-label><input matInput type="number" formControlName="ordem" /></mat-form-field>
              <mat-checkbox formControlName="obrigatorio">Obrigatorio</mat-checkbox>
              <mat-checkbox formControlName="ativo">Ativo</mat-checkbox>
              <button mat-flat-button color="primary" type="submit" [disabled]="parametroForm.invalid || salvando"><mat-icon>save</mat-icon>Salvar</button>
              <button mat-button type="button" (click)="cancelarParametro()">Cancelar</button>
            </form>

            <mat-accordion>
              <mat-expansion-panel *ngFor="let parametro of selecionado.parametros">
                <mat-expansion-panel-header>
                  <mat-panel-title>{{ parametro.ordem }}. {{ parametro.nome }}</mat-panel-title>
                  <mat-panel-description>{{ parametro.tipoDado }} · {{ parametro.ativo ? 'Ativo' : 'Inativo' }}</mat-panel-description>
                </mat-expansion-panel-header>
                <div class="row-actions">
                  <button mat-button (click)="editarParametro(parametro)"><mat-icon>edit</mat-icon>Editar</button>
                  <button mat-button (click)="alterarStatusParametro(parametro)"><mat-icon>{{ parametro.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon>{{ parametro.ativo ? 'Desativar' : 'Ativar' }}</button>
                  <button mat-button *ngIf="parametro.tipoDado === 'SELECAO'" (click)="novaOpcao(parametro)"><mat-icon>add</mat-icon>Opcao</button>
                </div>
                <form class="option-form" *ngIf="parametroOpcaoId === parametro.id" [formGroup]="opcaoForm" (ngSubmit)="salvarOpcao(parametro)">
                  <mat-form-field appearance="outline"><mat-label>Codigo</mat-label><input matInput formControlName="codigo" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Nome</mat-label><input matInput formControlName="nome" /></mat-form-field>
                  <mat-form-field appearance="outline"><mat-label>Ordem</mat-label><input matInput type="number" formControlName="ordem" /></mat-form-field>
                  <mat-checkbox formControlName="ativo">Ativo</mat-checkbox>
                  <button mat-flat-button color="primary" type="submit" [disabled]="opcaoForm.invalid || salvando"><mat-icon>save</mat-icon>Salvar</button>
                </form>
                <div class="options">
                  <div class="option" *ngFor="let opcao of parametro.opcoes">
                    <span>{{ opcao.ordem }}. {{ opcao.nome }}</span>
                    <small>{{ opcao.codigo }} · {{ opcao.ativo ? 'Ativa' : 'Inativa' }}</small>
                    <button mat-icon-button (click)="editarOpcao(parametro, opcao)" matTooltip="Editar opcao"><mat-icon>edit</mat-icon></button>
                    <button mat-icon-button (click)="alterarStatusOpcao(parametro, opcao)" matTooltip="Alternar status"><mat-icon>{{ opcao.ativo ? 'toggle_on' : 'toggle_off' }}</mat-icon></button>
                  </div>
                </div>
              </mat-expansion-panel>
            </mat-accordion>
          </section>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .page-head{display:flex;gap:16px;align-items:flex-start;justify-content:space-between;margin-bottom:18px}.page-head h2,.config-head h3{margin:0}.page-head p,.config-head p{margin:4px 0 0;color:#64748b}.enable-form{display:flex;gap:10px;align-items:flex-start;min-width:420px}.enable-form mat-form-field{flex:1}.content-grid{display:grid;grid-template-columns:minmax(320px,480px) 1fr;gap:18px}.list-panel,.config-panel{min-width:0}.selected{background:#eef6ff}.status{font-weight:600;color:#047857}.status.off{color:#9f1239}td small,.option small{display:block;color:#64748b}.config-head,.row-actions,.option{display:flex;align-items:center;justify-content:space-between;gap:10px}.param-form,.option-form{display:grid;grid-template-columns:repeat(4,minmax(120px,1fr));gap:10px;align-items:center;margin:12px 0}.options{display:grid;gap:8px}.option{border:1px solid #e5e7eb;border-radius:8px;padding:8px 10px}.empty{padding:24px;text-align:center;color:#64748b}@media(max-width:980px){.page-head,.enable-form{display:block;min-width:0}.content-grid{grid-template-columns:1fr}.param-form,.option-form{grid-template-columns:1fr}}`],
})
export class GraficaProdutosComponent implements OnInit {
  produtos: GraficaProduto[] = [];
  produtosCatalogo: CatalogoProdutoOption[] = [];
  selecionado: GraficaProduto | null = null;
  editandoParametro: GraficaParametro | null = null;
  parametroOpcaoId: number | null = null;
  opcaoEditandoId: number | null = null;
  total = 0;
  pagina = 0;
  tamanho = 20;
  salvando = false;
  colunas = ['produto', 'status', 'acoes'];
  tipos: GraficaTipoParametro[] = ['SELECAO', 'NUMERO_INTEIRO', 'NUMERO_DECIMAL', 'TEXTO'];

  habilitarForm = this.fb.group({ catalogoProdutoId: [null as number | null, Validators.required] });
  parametroForm = this.fb.group({
    codigo: ['', Validators.required],
    nome: ['', Validators.required],
    tipoDado: ['SELECAO' as GraficaTipoParametro, Validators.required],
    ordem: [0],
    obrigatorio: [true],
    ativo: [true],
  });
  opcaoForm = this.fb.group({ codigo: ['', Validators.required], nome: ['', Validators.required], ordem: [0], ativo: [true] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly graficaService: GraficaProdutoService,
    private readonly catalogoService: CatalogoProdutoService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.catalogoService.options(true).subscribe({ next: (items) => this.produtosCatalogo = items || [] });
    this.carregar();
  }

  carregar(): void {
    this.graficaService.listar(this.pagina, this.tamanho).subscribe({
      next: (page) => {
        this.produtos = page.content || [];
        this.total = page.totalElements || 0;
        if (!this.selecionado && this.produtos.length) this.selecionar(this.produtos[0]);
      },
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel carregar produtos graficos.')),
    });
  }

  paginar(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
    this.carregar();
  }

  habilitarProduto(): void {
    const catalogoProdutoId = this.habilitarForm.value.catalogoProdutoId;
    if (!catalogoProdutoId) return;
    this.salvando = true;
    this.graficaService.habilitar({ catalogoProdutoId, ativo: true }).subscribe({
      next: (produto) => {
        this.salvando = false;
        this.habilitarForm.reset();
        this.toastr.success('Produto habilitado para Grafica.');
        this.selecionar(produto);
        this.carregar();
      },
      error: (error) => { this.salvando = false; this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel habilitar o produto.')); },
    });
  }

  selecionar(produto: GraficaProduto): void {
    this.graficaService.detalhar(produto.id).subscribe({
      next: (detalhe) => this.selecionado = detalhe,
      error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel abrir a configuracao.')),
    });
  }

  alterarStatusProduto(produto: GraficaProduto): void {
    this.confirmar(`Deseja ${produto.ativo ? 'desativar' : 'ativar'} "${produto.catalogoProdutoNome}"?`, () => {
      this.graficaService.alterarStatus(produto.id, !produto.ativo).subscribe({ next: (detalhe) => this.atualizarSelecionado(detalhe), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel alterar status.')) });
    });
  }

  novoParametro(): void {
    this.editandoParametro = null;
    this.parametroForm.reset({ tipoDado: 'SELECAO', ordem: (this.selecionado?.parametros.length || 0) + 1, obrigatorio: true, ativo: true });
  }

  editarParametro(parametro: GraficaParametro): void {
    this.editandoParametro = parametro;
    this.parametroForm.reset({ codigo: parametro.codigo, nome: parametro.nome, tipoDado: parametro.tipoDado, ordem: parametro.ordem, obrigatorio: parametro.obrigatorio, ativo: parametro.ativo });
  }

  salvarParametro(): void {
    if (!this.selecionado || this.parametroForm.invalid) return;
    this.salvando = true;
    const raw = this.parametroForm.getRawValue();
    const payload: GraficaParametroRequest = {
      codigo: String(raw.codigo || ''),
      nome: String(raw.nome || ''),
      tipoDado: raw.tipoDado || 'SELECAO',
      ordem: raw.ordem,
      obrigatorio: raw.obrigatorio,
      ativo: raw.ativo,
    };
    const request = this.editandoParametro
      ? this.graficaService.editarParametro(this.selecionado.id, this.editandoParametro.id, payload)
      : this.graficaService.cadastrarParametro(this.selecionado.id, payload);
    request.subscribe({ next: (detalhe) => { this.salvando = false; this.editandoParametro = null; this.atualizarSelecionado(detalhe); }, error: (error) => { this.salvando = false; this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel salvar parametro.')); } });
  }

  cancelarParametro(): void {
    this.editandoParametro = null;
    this.parametroForm.reset({ tipoDado: 'SELECAO', ordem: 0, obrigatorio: true, ativo: true });
  }

  alterarStatusParametro(parametro: GraficaParametro): void {
    if (!this.selecionado) return;
    this.graficaService.alterarStatusParametro(this.selecionado.id, parametro.id, !parametro.ativo).subscribe({ next: (detalhe) => this.atualizarSelecionado(detalhe), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel alterar parametro.')) });
  }

  novaOpcao(parametro: GraficaParametro): void {
    this.parametroOpcaoId = parametro.id;
    this.opcaoEditandoId = null;
    this.opcaoForm.reset({ ordem: parametro.opcoes.length + 1, ativo: true });
  }

  editarOpcao(parametro: GraficaParametro, opcao: any): void {
    this.parametroOpcaoId = parametro.id;
    this.opcaoEditandoId = opcao.id;
    this.opcaoForm.reset({ codigo: opcao.codigo, nome: opcao.nome, ordem: opcao.ordem, ativo: opcao.ativo });
  }

  salvarOpcao(parametro: GraficaParametro): void {
    if (!this.selecionado || this.opcaoForm.invalid) return;
    const raw = this.opcaoForm.getRawValue();
    const payload: GraficaOpcaoRequest = {
      codigo: String(raw.codigo || ''),
      nome: String(raw.nome || ''),
      ordem: raw.ordem,
      ativo: raw.ativo,
    };
    const request = this.opcaoEditandoId
      ? this.graficaService.editarOpcao(this.selecionado.id, parametro.id, this.opcaoEditandoId, payload)
      : this.graficaService.cadastrarOpcao(this.selecionado.id, parametro.id, payload);
    request.subscribe({ next: (detalhe) => { this.parametroOpcaoId = null; this.opcaoEditandoId = null; this.atualizarSelecionado(detalhe); }, error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel salvar opcao.')) });
  }

  alterarStatusOpcao(parametro: GraficaParametro, opcao: any): void {
    if (!this.selecionado) return;
    this.graficaService.alterarStatusOpcao(this.selecionado.id, parametro.id, opcao.id, !opcao.ativo).subscribe({ next: (detalhe) => this.atualizarSelecionado(detalhe), error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel alterar opcao.')) });
  }

  private atualizarSelecionado(detalhe: GraficaProduto): void {
    this.selecionado = detalhe;
    this.produtos = this.produtos.map((item) => item.id === detalhe.id ? detalhe : item);
  }

  private confirmar(message: string, onConfirm: () => void): void {
    this.dialog.open(ConfirmDialogComponent, { width: '420px', data: { title: 'Confirmar', message, confirmText: 'Confirmar' } })
      .afterClosed()
      .subscribe((ok) => { if (ok) onConfirm(); });
  }
}
