import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { MaterialModule } from 'src/app/material.module';
import { ToastrService } from 'ngx-toastr';
import { CatalogoStatusChipComponent } from '../../catalogo/shared/components/catalogo-status-chip.component';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaProduto } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

@Component({
  selector: 'app-grafica-produtos',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, CardHeaderComponent, CatalogoStatusChipComponent],
  template: `
    <mat-card class="cardWithShadow">
      <mat-card-content>
        <app-card-header titulo="Produtos gráficos" subtitulo="Configuração de venda para produtos do Catálogo">
          <button mat-flat-button color="primary" (click)="novo()">
            <mat-icon>add</mat-icon>
            Novo produto
          </button>
        </app-card-header>

        <form class="filters" [formGroup]="filters">
          <mat-form-field appearance="outline">
            <mat-label>Pesquisar</mat-label>
            <input matInput formControlName="texto" />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="ativo">
              <mat-option [value]="null">Todos</mat-option>
              <mat-option [value]="true">Ativos</mat-option>
              <mat-option [value]="false">Inativos</mat-option>
            </mat-select>
          </mat-form-field>
        </form>

        <div class="table-wrap">
          <div class="loading" *ngIf="carregando"><mat-spinner diameter="36"></mat-spinner></div>
          <table mat-table [dataSource]="filtrados" *ngIf="filtrados.length">
            <ng-container matColumnDef="produto">
              <th mat-header-cell *matHeaderCellDef>Produto</th>
              <td mat-cell *matCellDef="let item">
                <strong>{{ item.catalogoProdutoNome }}</strong>
                <small>{{ item.catalogoProdutoCodigo || '-' }}</small>
              </td>
            </ng-container>

            <ng-container matColumnDef="categoria">
              <th mat-header-cell *matHeaderCellDef>Categoria</th>
              <td mat-cell *matCellDef="let item">-</td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let item"><app-catalogo-status-chip [ativo]="item.ativo"></app-catalogo-status-chip></td>
            </ng-container>

            <ng-container matColumnDef="parametros">
              <th mat-header-cell *matHeaderCellDef>Campos</th>
              <td mat-cell *matCellDef="let item">{{ item.parametros?.length || 0 }}</td>
            </ng-container>

            <ng-container matColumnDef="resumo">
              <th mat-header-cell *matHeaderCellDef>Configuração</th>
              <td mat-cell *matCellDef="let item">{{ resumo(item) }}</td>
            </ng-container>

            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Ações</th>
              <td mat-cell *matCellDef="let item">
                <button mat-icon-button [matMenuTriggerFor]="menu" [matMenuTriggerData]="{ item: item }" aria-label="Ações">
                  <mat-icon>more_vert</mat-icon>
                </button>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas"></tr>
          </table>
          <div class="empty" *ngIf="!carregando && !filtrados.length">Nenhum produto gráfico encontrado.</div>
        </div>

        <mat-menu #menu="matMenu">
          <ng-template matMenuContent let-item="item">
            <button mat-menu-item (click)="configurar(item)">
              <mat-icon>tune</mat-icon>
              <span>Configurar</span>
            </button>
            <button mat-menu-item (click)="alterarStatus(item)">
              <mat-icon>{{ item.ativo ? 'block' : 'check_circle' }}</mat-icon>
              <span>{{ item.ativo ? 'Desativar' : 'Ativar' }}</span>
            </button>
          </ng-template>
        </mat-menu>

        <mat-paginator [length]="total" [pageIndex]="pagina" [pageSize]="tamanho" [pageSizeOptions]="[10,20,50]" (page)="paginar($event)"></mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .filters{display:grid;grid-template-columns:1fr 180px;gap:12px;margin:16px 0}
    .table-wrap{position:relative;min-height:180px;overflow:auto}
    .loading{position:absolute;inset:0;display:grid;place-items:center;background:rgba(255,255,255,.65);z-index:1}
    .empty{text-align:center;color:#6b7280;padding:24px}
    table{width:100%}
    td small{display:block;color:#6b7280;margin-top:2px}
    @media(max-width:760px){.filters{grid-template-columns:1fr}.table-wrap{overflow-x:auto}}
  `],
})
export class GraficaProdutosComponent implements OnInit {
  produtos: GraficaProduto[] = [];
  filtrados: GraficaProduto[] = [];
  total = 0;
  pagina = 0;
  tamanho = 10;
  carregando = false;
  colunas = ['produto', 'categoria', 'status', 'parametros', 'resumo', 'acoes'];
  filters = this.fb.group({ texto: [''], ativo: [null as boolean | null] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly router: Router,
    private readonly graficaService: GraficaProdutoService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.filters.valueChanges.pipe(debounceTime(250), distinctUntilChanged()).subscribe(() => this.aplicarFiltros());
    this.carregar();
  }

  carregar(): void {
    this.carregando = true;
    this.graficaService.listar(this.pagina, this.tamanho).subscribe({
      next: (page) => {
        this.produtos = page.content || [];
        this.total = page.totalElements || 0;
        this.carregando = false;
        this.aplicarFiltros();
      },
      error: (error) => {
        this.carregando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Não foi possível carregar produtos gráficos.'));
      },
    });
  }

  aplicarFiltros(): void {
    const texto = (this.filters.value.texto || '').toLowerCase().trim();
    const ativo = this.filters.value.ativo;
    this.filtrados = this.produtos.filter((item) => {
      const matchTexto = !texto || `${item.catalogoProdutoNome || ''} ${item.catalogoProdutoCodigo || ''}`.toLowerCase().includes(texto);
      const matchStatus = ativo === null || ativo === undefined || item.ativo === ativo;
      return matchTexto && matchStatus;
    });
  }

  resumo(item: GraficaProduto): string {
    const nomes = (item.parametros || []).slice(0, 3).map((parametro) => parametro.nome);
    if (!nomes.length) return 'Sem campos configurados';
    const sufixo = (item.parametros || []).length > 3 ? ` +${(item.parametros || []).length - 3}` : '';
    return `${nomes.join(', ')}${sufixo}`;
  }

  paginar(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
    this.carregar();
  }

  novo(): void {
    this.router.navigate(['/page/grafica/produtos/novo']);
  }

  configurar(item: GraficaProduto): void {
    this.router.navigate(['/page/grafica/produtos', item.id, 'editar']);
  }

  alterarStatus(item: GraficaProduto): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: item.ativo ? 'Desativar produto' : 'Ativar produto',
        message: `Deseja ${item.ativo ? 'desativar' : 'ativar'} "${item.catalogoProdutoNome}"?`,
        confirmText: item.ativo ? 'Desativar' : 'Ativar',
        confirmColor: item.ativo ? 'warn' : 'primary',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.graficaService.alterarStatus(item.id, !item.ativo).subscribe({
        next: () => {
          this.toastr.success('Status atualizado.');
          this.carregar();
        },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Não foi possível alterar o status.')),
      });
    });
  }
}
