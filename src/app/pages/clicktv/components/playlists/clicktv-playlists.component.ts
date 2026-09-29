import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Subject, catchError, finalize, switchMap, takeUntil, tap } from 'rxjs';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableItemDirective } from 'src/app/components/data-table/data-table-item.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import {
  DataTableAction,
  DataTableActionEvent,
  DataTableColumn,
  DataTableFilter,
  DataTableFilterState,
  DataTablePagination,
  DataTableSearchConfig,
} from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import { CLICKTV_ORIENTACOES, ClickTvOrientacao, ClickTvPlaylistPayload, ClickTvPlaylistResumo } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvNameDialogComponent, ClickTvPlaylistDialogComponent } from '../dialogs/clicktv-dialogs.component';

@Component({
  selector: 'app-clicktv-playlists',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    PageCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    DataTableItemDirective,
    TemPermissaoDirective,
  ],
  templateUrl: './clicktv-playlists.component.html',
  styleUrls: ['../../clicktv.scss'],
})
export class ClickTvPlaylistsComponent implements OnInit, OnDestroy {
  playlists: ClickTvPlaylistResumo[] = [];
  total = 0;
  page = 0;
  size = 10;
  nome = '';
  orientacao: ClickTvOrientacao | '' = '';
  ativa: boolean | '' = '';
  carregandoInicial = false;
  refreshing = false;
  erro: string | null = null;
  semPermissao = false;
  private ignorarProximoStateChangeVazio = false;

  readonly orientacoes = CLICKTV_ORIENTACOES;
  readonly columns: DataTableColumn<ClickTvPlaylistResumo>[] = [
    { key: 'nome', label: 'Nome' },
    { key: 'orientacao', label: 'Orientação' },
    { key: 'itens', label: 'Itens', align: 'center' },
    { key: 'versao', label: 'Versão', align: 'center' },
    { key: 'status', label: 'Status' },
  ];
  readonly filters: DataTableFilter[] = [
    {
      key: 'orientacao',
      label: 'Orientação',
      type: 'select',
      options: this.orientacoes.map((value) => ({ value, label: value })),
    },
    {
      key: 'ativa',
      label: 'Status',
      type: 'select',
      options: [
        { value: true, label: 'Ativa' },
        { value: false, label: 'Inativa' },
      ],
    },
  ];
  readonly actions: DataTableAction<ClickTvPlaylistResumo>[] = [
    { id: 'abrir', label: 'Editar conteúdo', icon: 'queue_music' },
    { id: 'editar', label: 'Editar dados', icon: 'edit', visible: () => this.podeGerenciar },
    { id: 'duplicar', label: 'Duplicar', icon: 'content_copy', visible: () => this.podeGerenciar },
    { id: 'desativar', label: 'Desativar', icon: 'block', color: 'warn', visible: () => this.podeGerenciar, disabled: (row) => !row.ativa },
  ];
  readonly emptyState = {
    title: 'Nenhuma playlist encontrada',
    description: 'Crie uma playlist para montar a sequência exibida nas telas.',
    filteredTitle: 'Nenhuma playlist encontrada para os filtros',
    filteredDescription: 'Altere a busca, orientação ou status para ver outros resultados.',
  };
  readonly podeGerenciar = this.auth.temPermissao('CLICKTV_PLAYLISTS_GERENCIAR');

  private readonly carregar$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: ClickTvService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly router: Router,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.carregar$.pipe(
      tap(() => {
        this.semPermissao = false;
        this.erro = null;
        if (this.playlists.length) {
          this.refreshing = true;
        } else {
          this.carregandoInicial = true;
        }
      }),
      switchMap(() => this.service.listarPlaylists({
        nome: this.nome.trim() || undefined,
        orientacao: this.orientacao || undefined,
        ativa: this.ativa === '' ? undefined : this.ativa,
        page: this.page,
        size: this.size,
      }).pipe(
        catchError((error: HttpErrorResponse) => {
          this.tratarErroListagem(error);
          return EMPTY;
        }),
        finalize(() => {
          this.carregandoInicial = false;
          this.refreshing = false;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      this.playlists = res.content || [];
      this.total = res.totalElements || 0;
    });

    this.carregar();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get searchConfig(): DataTableSearchConfig {
    return { enabled: true, label: 'Buscar', placeholder: 'Buscar por nome', debounceMs: 300, value: this.nome };
  }

  get filterState(): DataTableFilterState {
    return {
      orientacao: this.orientacao || null,
      ativa: this.ativa === '' ? null : this.ativa,
    };
  }

  get pagination(): DataTablePagination {
    return { pageIndex: this.page, pageSize: this.size, totalItems: this.total, pageSizeOptions: [10, 20, 50] };
  }

  get temFiltrosAtivos(): boolean {
    return !!this.nome.trim() || !!this.orientacao || this.ativa !== '';
  }

  carregar(): void {
    this.carregar$.next();
  }

  pesquisar(nome: string): void {
    this.nome = nome;
    this.page = 0;
    this.carregar();
  }

  alterarFiltros(filtros: DataTableFilterState): void {
    if (this.ignorarProximoStateChangeVazio && !Object.keys(filtros).length) {
      this.ignorarProximoStateChangeVazio = false;
      return;
    }
    this.orientacao = (filtros['orientacao'] || '') as ClickTvOrientacao | '';
    this.ativa = typeof filtros['ativa'] === 'boolean' ? filtros['ativa'] : '';
    this.page = 0;
    this.carregar();
  }

  limparFiltros(): void {
    this.ignorarProximoStateChangeVazio = true;
    this.nome = '';
    this.orientacao = '';
    this.ativa = '';
    this.page = 0;
    this.carregar();
  }

  pagina(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.carregar();
  }

  executarAcao(event: DataTableActionEvent<ClickTvPlaylistResumo>): void {
    const handlers: Record<string, (playlist: ClickTvPlaylistResumo) => void> = {
      abrir: (playlist) => this.abrir(playlist),
      editar: (playlist) => this.editar(playlist),
      duplicar: (playlist) => this.duplicar(playlist),
      desativar: (playlist) => this.desativar(playlist),
    };
    handlers[event.action]?.(event.row);
  }

  criar(): void {
    this.dialog.open(ClickTvPlaylistDialogComponent, { width: '560px', data: null }).afterClosed()
      .subscribe((payload: ClickTvPlaylistPayload | undefined) => {
        if (!payload) return;
        this.service.criarPlaylist(payload).subscribe({
          next: (playlist) => {
            this.toastr.success('Playlist criada.');
            this.router.navigate(['/page/clicktv/playlists', playlist.id]);
          },
          error: () => this.toastr.error('Não foi possível criar a playlist.'),
        });
      });
  }

  editar(playlist: ClickTvPlaylistResumo): void {
    this.dialog.open(ClickTvPlaylistDialogComponent, { width: '560px', data: playlist }).afterClosed()
      .subscribe((payload: ClickTvPlaylistPayload | undefined) => {
        if (!payload) return;
        this.service.editarPlaylist(playlist.id, payload).subscribe({
          next: () => { this.toastr.success('Playlist atualizada.'); this.carregar(); },
          error: () => this.toastr.error('Não foi possível editar a playlist.'),
        });
      });
  }

  abrir(playlist: ClickTvPlaylistResumo): void {
    this.router.navigate(['/page/clicktv/playlists', playlist.id]);
  }

  duplicar(playlist: ClickTvPlaylistResumo): void {
    this.dialog.open(ClickTvNameDialogComponent, {
      width: '500px',
      data: { titulo: 'Duplicar playlist', nome: `${playlist.nome} (cópia)` },
    }).afterClosed().subscribe((nome) => {
      if (!nome) return;
      this.service.duplicarPlaylist(playlist.id, nome).subscribe({
        next: () => { this.toastr.success('Playlist duplicada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível duplicar a playlist.'),
      });
    });
  }

  desativar(playlist: ClickTvPlaylistResumo): void {
    if (!playlist.ativa) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title: 'Desativar playlist', message: `Desativar "${playlist.nome}"?`, confirmText: 'Desativar', confirmColor: 'warn' },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.desativarPlaylist(playlist.id).subscribe({
        next: () => { this.toastr.success('Playlist desativada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível desativar a playlist.'),
      });
    });
  }

  private tratarErroListagem(error: HttpErrorResponse): void {
    if (error.status === 403) {
      this.semPermissao = true;
      this.erro = null;
      return;
    }
    this.erro = error.error?.message || 'Não foi possível carregar as playlists.';
  }
}
