import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { Router, RouterModule } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { CardHeaderComponent } from 'src/app/components/card-header/card-header.component';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { ToastrService } from 'ngx-toastr';
import { CatalogoCategoria, CatalogoCategoriaOption } from '../shared/models/catalogo.models';
import { CatalogoCategoriaService } from '../shared/services/catalogo.service';
import { catalogoErrorMessage } from '../shared/utils/catalogo-utils';
import { CatalogoStatusChipComponent } from '../shared/components/catalogo-status-chip.component';

@Component({
  selector: 'app-catalogo-categoria-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MaterialModule, CardHeaderComponent, CatalogoStatusChipComponent],
  template: `
    <mat-card class="cardWithShadow">
      <mat-card-content>
        <app-card-header titulo="Categorias do Catalogo" subtitulo="Hierarquia e organizacao do novo catalogo administrativo">
          <button mat-flat-button color="primary" *ngIf="podeCriar" (click)="nova()">
            <mat-icon>add</mat-icon>
            Nova categoria
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
          <mat-form-field appearance="outline">
            <mat-label>Categoria pai</mat-label>
            <mat-select formControlName="categoriaPaiId">
              <mat-option [value]="null">Todas</mat-option>
              <mat-option *ngFor="let categoria of categoriasOptions" [value]="categoria.id">{{ categoria.nome }}</mat-option>
            </mat-select>
          </mat-form-field>
        </form>

        <div class="table-wrap">
          <div class="loading" *ngIf="carregando"><mat-spinner diameter="36"></mat-spinner></div>
          <table mat-table [dataSource]="categorias" *ngIf="categorias.length">
            <ng-container matColumnDef="codigo"><th mat-header-cell *matHeaderCellDef>Codigo</th><td mat-cell *matCellDef="let item">{{ item.codigo }}</td></ng-container>
            <ng-container matColumnDef="nome"><th mat-header-cell *matHeaderCellDef>Nome</th><td mat-cell *matCellDef="let item">{{ nomeComPai(item) }}</td></ng-container>
            <ng-container matColumnDef="pai"><th mat-header-cell *matHeaderCellDef>Categoria pai</th><td mat-cell *matCellDef="let item">{{ item.categoriaPaiNome || '-' }}</td></ng-container>
            <ng-container matColumnDef="ordem"><th mat-header-cell *matHeaderCellDef>Ordem</th><td mat-cell *matCellDef="let item">{{ item.ordemExibicao ?? '-' }}</td></ng-container>
            <ng-container matColumnDef="destaque"><th mat-header-cell *matHeaderCellDef>Destaque</th><td mat-cell *matCellDef="let item">{{ item.destaque ? 'Sim' : 'Nao' }}</td></ng-container>
            <ng-container matColumnDef="ativo"><th mat-header-cell *matHeaderCellDef>Status</th><td mat-cell *matCellDef="let item"><app-catalogo-status-chip [ativo]="item.ativo"></app-catalogo-status-chip></td></ng-container>
            <ng-container matColumnDef="acoes">
              <th mat-header-cell *matHeaderCellDef>Acoes</th>
              <td mat-cell *matCellDef="let item">
                <button mat-icon-button matTooltip="Caracteristicas" *ngIf="podeVerCaracteristicas" (click)="caracteristicas(item)"><mat-icon>tune</mat-icon></button>
                <button mat-icon-button matTooltip="Editar" *ngIf="podeEditar" (click)="editar(item)"><mat-icon>edit</mat-icon></button>
                <button mat-icon-button matTooltip="Clonar" *ngIf="podeCriar" (click)="clonar(item)"><mat-icon>content_copy</mat-icon></button>
                <button mat-icon-button matTooltip="Inativar" *ngIf="podeExcluir && item.ativo" (click)="inativar(item)"><mat-icon>block</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="colunas"></tr>
            <tr mat-row *matRowDef="let row; columns: colunas"></tr>
          </table>
          <div class="empty" *ngIf="!carregando && !categorias.length">Nenhuma categoria encontrada.</div>
        </div>

        <mat-paginator [length]="total" [pageIndex]="pagina" [pageSize]="tamanho" [pageSizeOptions]="[10, 20, 50]" (page)="paginar($event)"></mat-paginator>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .filters { display: grid; grid-template-columns: 1fr 180px 260px; gap: 12px; margin: 16px 0; }
    .table-wrap { position: relative; min-height: 160px; overflow: auto; }
    .loading { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(255,255,255,.65); z-index: 1; }
    .empty { color: #6b7280; padding: 24px 0; text-align: center; }
    table { width: 100%; }
    @media (max-width: 768px) { .filters { grid-template-columns: 1fr; } }
  `],
})
export class CatalogoCategoriaListComponent implements OnInit {
  @ViewChild(MatPaginator) paginator?: MatPaginator;
  categorias: CatalogoCategoria[] = [];
  categoriasOptions: CatalogoCategoriaOption[] = [];
  total = 0;
  pagina = 0;
  tamanho = 10;
  carregando = false;
  colunas = ['codigo', 'nome', 'pai', 'ordem', 'destaque', 'ativo', 'acoes'];
  filters = this.fb.group({ texto: [''], ativo: [null as boolean | null], categoriaPaiId: [null as number | null] });

  constructor(
    private readonly fb: FormBuilder,
    private readonly service: CatalogoCategoriaService,
    private readonly router: Router,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.service.options(null).subscribe({ next: (items) => (this.categoriasOptions = items || []) });
    this.filters.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.pagina = 0;
      this.carregar();
    });
    this.carregar();
  }

  get podeCriar(): boolean { return this.auth.temPermissao('CATALOGO_CATEGORIAS_CADASTRAR'); }
  get podeEditar(): boolean { return this.auth.temPermissao('CATALOGO_CATEGORIAS_EDITAR'); }
  get podeExcluir(): boolean { return this.auth.temPermissao('CATALOGO_CATEGORIAS_EXCLUIR'); }
  get podeVerCaracteristicas(): boolean { return this.auth.temPermissao('CATALOGO_CARACTERISTICAS_VER'); }

  carregar(): void {
    this.carregando = true;
    const value = this.filters.value;
    this.service.listar({
      page: this.pagina,
      size: this.tamanho,
      sort: 'ordemExibicao,asc',
      texto: value.texto || '',
      ativo: value.ativo,
      categoriaPaiId: value.categoriaPaiId,
    }).subscribe({
      next: (page) => {
        this.categorias = page.content || [];
        this.total = page.totalElements || 0;
        this.carregando = false;
      },
      error: (error) => {
        this.carregando = false;
        this.toastr.error(catalogoErrorMessage(error, 'Nao foi possivel carregar as categorias.'));
      },
    });
  }

  paginar(event: PageEvent): void {
    this.pagina = event.pageIndex;
    this.tamanho = event.pageSize;
    this.carregar();
  }

  nomeComPai(item: CatalogoCategoria): string {
    return item.categoriaPaiNome ? `${item.categoriaPaiNome} > ${item.nome}` : item.nome;
  }

  nova(): void { this.router.navigate(['/page/catalogo/categorias/nova']); }
  editar(item: CatalogoCategoria): void { this.router.navigate(['/page/catalogo/categorias', item.id, 'editar']); }
  clonar(item: CatalogoCategoria): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: 'Clonar categoria',
        message: `Deseja usar "${item.nome}" como base para criar uma nova categoria?`,
        confirmText: 'Clonar',
      },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.router.navigate(['/page/catalogo/categorias/nova'], { queryParams: { cloneFrom: item.id } });
    });
  }
  caracteristicas(item: CatalogoCategoria): void { this.router.navigate(['/page/catalogo/categorias', item.id, 'caracteristicas']); }

  inativar(item: CatalogoCategoria): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title: 'Inativar categoria', message: `Deseja inativar "${item.nome}"?`, confirmText: 'Inativar', confirmColor: 'warn' },
    });
    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.inativar(item.id).subscribe({
        next: () => { this.toastr.success('Categoria inativada.'); this.carregar(); },
        error: (error) => this.toastr.error(catalogoErrorMessage(error, 'Erro ao inativar categoria.')),
      });
    });
  }
}
