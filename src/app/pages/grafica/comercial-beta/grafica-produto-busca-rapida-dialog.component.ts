import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { catchError, debounceTime, distinctUntilChanged, finalize, map, of, Subject, switchMap, takeUntil, tap, timer } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { catalogoErrorMessage } from '../../catalogo/shared/utils/catalogo-utils';
import { GraficaProduto } from '../shared/grafica.models';
import { GraficaProdutoService } from '../shared/grafica.service';

type BuscaRequest = {
  termo: string;
  page: number;
  debounceMs: number;
};

@Component({
  selector: 'app-grafica-produto-busca-rapida-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MaterialModule],
  template: `
    <div class="quick-search-shell">
      <div class="dialog-header">
        <h2 mat-dialog-title class="m-0">Buscar produto</h2>
        <button mat-icon-button type="button" mat-dialog-close aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      <mat-divider></mat-divider>

      <mat-dialog-content class="quick-search-content">
        <mat-form-field appearance="outline" class="search-field">
          <mat-label>Pesquise por nome ou código</mat-label>
          <input matInput type="search" [formControl]="pesquisaControl" autocomplete="off" />
          <mat-icon matSuffix>search</mat-icon>
        </mat-form-field>

        <div class="state-row" *ngIf="carregando">
          <mat-progress-spinner mode="indeterminate" diameter="24"></mat-progress-spinner>
          <span>Buscando produtos...</span>
        </div>

        <div class="state-row state-row--error" *ngIf="!carregando && erro">
          <mat-icon>warning</mat-icon>
          <span>{{ erro }}</span>
        </div>

        <div class="results-list" *ngIf="!erro && produtos.length">
          <button
            mat-button
            type="button"
            class="result-row"
            *ngFor="let produto of produtos"
            (click)="selecionar(produto)">
            <span class="result-main">
              <strong>{{ produtoNome(produto) }}</strong>
              <small>{{ variacaoResumo(produto) }}</small>
            </span>
            <span class="result-code">{{ produto.catalogoProdutoCodigo || produto.catalogoProdutoId }}</span>
            <span class="result-action">Selecionar</span>
          </button>
        </div>

        <div class="empty-state" *ngIf="!carregando && !erro && !produtos.length">
          <mat-icon>search_off</mat-icon>
          <span>{{ emptyMessage }}</span>
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <mat-paginator
          *ngIf="total > pageSize"
          [length]="total"
          [pageIndex]="pageIndex"
          [pageSize]="pageSize"
          [hidePageSize]="true"
          (page)="onPage($event)">
        </mat-paginator>
        <button mat-stroked-button type="button" mat-dialog-close>Cancelar</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .quick-search-shell {
      display: flex;
      flex-direction: column;
      width: min(820px, calc(100vw - 32px));
      max-height: min(84vh, 780px);
      background: #fff;
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 16px 20px 12px;
    }

    .quick-search-content {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px 20px !important;
      overflow: auto;
    }

    .search-field {
      width: 100%;
    }

    .state-row,
    .empty-state {
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 58px;
      padding: 14px 12px;
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      color: #64748b;
      background: #fff;
    }

    .state-row--error {
      border-color: #fecaca;
      color: #991b1b;
      background: #fef2f2;
    }

    .results-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .result-row {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(96px, auto) auto;
      align-items: center;
      gap: 14px;
      width: 100%;
      min-height: 68px;
      padding: 10px 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      text-align: left;
      color: #0f172a;
    }

    .result-row:hover {
      background: #f8fafc;
      border-color: #cbd5e1;
    }

    .result-main,
    .result-main strong,
    .result-main small {
      display: block;
      min-width: 0;
    }

    .result-main strong,
    .result-main small {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .result-main small {
      margin-top: 3px;
      color: #64748b;
    }

    .result-code {
      color: #334155;
      font-weight: 700;
      white-space: nowrap;
    }

    .result-action {
      color: var(--mdc-theme-primary, #1976d2);
      font-weight: 700;
      white-space: nowrap;
    }

    .dialog-actions {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 20px 16px;
    }

    mat-paginator {
      margin-right: auto;
      background: transparent;
    }

    @media (max-width: 680px) {
      .quick-search-shell {
        width: calc(100vw - 16px);
        max-height: calc(100dvh - 16px);
      }

      .result-row {
        grid-template-columns: minmax(0, 1fr);
        gap: 6px;
      }

      .result-action {
        justify-self: start;
      }

      .dialog-actions {
        align-items: stretch;
        flex-direction: column;
      }

      mat-paginator {
        width: 100%;
        margin-right: 0;
      }
    }
  `],
})
export class GraficaProdutoBuscaRapidaDialogComponent implements OnInit, OnDestroy {
  readonly pesquisaControl = new FormControl('', { nonNullable: true });
  produtos: GraficaProduto[] = [];
  carregando = false;
  erro = '';
  total = 0;
  pageIndex = 0;
  readonly pageSize = 10;

  private readonly buscar$ = new Subject<BuscaRequest>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: GraficaProdutoService,
    private readonly dialogRef: MatDialogRef<GraficaProdutoBuscaRapidaDialogComponent, GraficaProduto | null>,
  ) {}

  ngOnInit(): void {
    this.pesquisaControl.valueChanges.pipe(
      debounceTime(350),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe((termo) => {
      this.pageIndex = 0;
      this.carregar(termo, 0, 0);
    });

    this.buscar$.pipe(
      switchMap((request) => timer(request.debounceMs).pipe(map(() => request))),
      distinctUntilChanged((a, b) => a.termo === b.termo && a.page === b.page),
      tap(() => {
        this.carregando = true;
        this.erro = '';
      }),
      switchMap((request) => this.service.listar({
        page: request.page,
        size: this.pageSize,
        ativo: true,
        search: request.termo || null,
        sort: 'nome,asc',
      }).pipe(
        catchError((error) => {
          this.erro = catalogoErrorMessage(error, 'Não foi possível buscar produtos.');
          return of({ content: [], pageNumber: request.page, pageSize: this.pageSize, totalElements: 0, totalPages: 0, last: true });
        }),
        finalize(() => this.carregando = false),
      )),
      takeUntil(this.destroy$),
    ).subscribe((page) => {
      this.produtos = page.content || [];
      this.total = page.totalElements || 0;
      this.pageIndex = page.pageNumber || 0;
    });

    this.carregar('', 0, 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get emptyMessage(): string {
    const termo = this.pesquisaControl.value.trim();
    return termo ? `Nenhum produto encontrado para "${termo}".` : 'Nenhum produto encontrado.';
  }

  onPage(event: PageEvent): void {
    this.carregar(this.pesquisaControl.value, event.pageIndex, 0);
  }

  selecionar(produto: GraficaProduto): void {
    this.dialogRef.close(produto);
  }

  produtoNome(produto: GraficaProduto): string {
    return produto.catalogoProdutoNome || produto.catalogoProdutoCodigo || `#${produto.id}`;
  }

  variacaoResumo(produto: GraficaProduto): string {
    return [produto.material?.nome, produto.formato?.nome, produto.cor?.nome].filter(Boolean).join(' · ') || 'Produto gráfico';
  }

  private carregar(termo: string, page: number, debounceMs: number): void {
    this.buscar$.next({ termo: (termo || '').trim(), page, debounceMs });
  }
}
