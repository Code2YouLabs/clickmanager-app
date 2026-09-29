import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, takeUntil, tap } from 'rxjs';
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
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { AuthService } from 'src/app/services/auth.service';
import {
  ClickTvPlaylistResumo,
  ClickTvStatusTela,
  ClickTvTela,
  ClickTvTelaPayload,
} from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';
import { ClickTvTelaDialogComponent } from '../dialogs/clicktv-dialogs.component';

@Component({
  selector: 'app-clicktv-telas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MaterialModule,
    PageCardComponent,
    DataTableComponent,
    DataTableCellDirective,
    DataTableItemDirective,
    TemPermissaoDirective,
  ],
  templateUrl: './clicktv-telas.component.html',
  styleUrls: ['../../clicktv.scss'],
})
export class ClickTvTelasComponent implements OnInit, OnDestroy {
  telas: ClickTvTela[] = [];
  playlists: ClickTvPlaylistResumo[] = [];
  total = 0;
  page = 0;
  size = 10;
  nome = '';
  status: ClickTvStatusTela | '' = '';
  carregandoInicial = false;
  refreshing = false;
  erro: string | null = null;
  semPermissao = false;
  carregandoPlaylists = false;
  erroPlaylists: string | null = null;
  readonly pendingPlaylistIds = new Set<number>();
  private ignorarProximoStateChangeVazio = false;

  readonly statuses: ClickTvStatusTela[] = ['AGUARDANDO_ATIVACAO', 'ONLINE', 'OFFLINE', 'DESATIVADA'];
  readonly statusLabels: Record<ClickTvStatusTela, string> = {
    AGUARDANDO_ATIVACAO: 'Aguardando ativação',
    ONLINE: 'Online',
    OFFLINE: 'Offline',
    DESATIVADA: 'Desativada',
  };
  readonly columns: DataTableColumn<ClickTvTela>[] = [
    { key: 'nome', label: 'Tela' },
    { key: 'orientacao', label: 'Orientação' },
    { key: 'status', label: 'Status' },
    { key: 'playlist', label: 'Playlist padrão' },
    { key: 'conexao', label: 'Última conexão' },
  ];
  readonly filters: DataTableFilter[] = [
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: this.statuses.map((value) => ({ value, label: this.statusLabels[value] })),
    },
  ];
  readonly actions: DataTableAction<ClickTvTela>[] = [
    { id: 'editar', label: 'Editar', icon: 'edit', visible: () => this.podeGerenciar },
    { id: 'vincular', label: 'Vincular novamente', icon: 'link', visible: () => this.podeGerenciar, disabled: (row) => row.status === 'DESATIVADA' },
    {
      id: 'desvincular',
      label: 'Desvincular',
      icon: 'link_off',
      visible: () => this.podeGerenciar,
      disabled: (row) => row.status === 'AGUARDANDO_ATIVACAO' || row.status === 'DESATIVADA',
    },
    { id: 'desativar', label: 'Desativar', icon: 'block', color: 'warn', visible: () => this.podeGerenciar, disabled: (row) => row.status === 'DESATIVADA' },
  ];
  readonly emptyState = {
    title: 'Nenhuma tela encontrada',
    description: 'Abra o player na TV e use o código exibido para vinculá-la.',
    filteredTitle: 'Nenhuma tela encontrada para os filtros atuais',
    filteredDescription: 'Altere a busca ou status para ver outros resultados.',
  };
  readonly podeGerenciar = this.auth.temPermissao('CLICKTV_TELAS_GERENCIAR');

  private readonly carregar$ = new Subject<void>();
  private readonly carregarPlaylists$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly service: ClickTvService,
    private readonly dialog: MatDialog,
    private readonly toastr: ToastrService,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.carregar$.pipe(
      tap(() => {
        this.semPermissao = false;
        this.erro = null;
        if (this.telas.length) {
          this.refreshing = true;
        } else {
          this.carregandoInicial = true;
        }
      }),
      switchMap(() => this.service.listarTelas({
        nome: this.nome.trim() || undefined,
        status: this.status || undefined,
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
      this.telas = res.content || [];
      this.total = res.totalElements || 0;
    });

    this.carregarPlaylists$.pipe(
      tap(() => {
        this.erroPlaylists = null;
        this.carregandoPlaylists = true;
      }),
      switchMap(() => this.service.listarPlaylists({ ativa: true, page: 0, size: 200 }).pipe(
        catchError((error: HttpErrorResponse) => {
          this.erroPlaylists = error.error?.message || 'Não foi possível carregar as playlists disponíveis.';
          return EMPTY;
        }),
        finalize(() => this.carregandoPlaylists = false)
      )),
      takeUntil(this.destroy$)
    ).subscribe((res) => {
      this.playlists = res.content || [];
    });

    this.carregar();
    this.carregarPlaylists();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get searchConfig(): DataTableSearchConfig {
    return { enabled: true, label: 'Buscar', placeholder: 'Buscar por nome ou local', debounceMs: 300, value: this.nome };
  }

  get filterState(): DataTableFilterState {
    return { status: this.status || null };
  }

  get pagination(): DataTablePagination {
    return { pageIndex: this.page, pageSize: this.size, totalItems: this.total, pageSizeOptions: [10, 20, 50] };
  }

  get temFiltrosAtivos(): boolean {
    return !!this.nome.trim() || !!this.status;
  }

  carregar(): void {
    this.carregar$.next();
  }

  carregarPlaylists(): void {
    this.carregarPlaylists$.next();
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
    this.status = (filtros['status'] || '') as ClickTvStatusTela | '';
    this.page = 0;
    this.carregar();
  }

  limparFiltros(): void {
    this.ignorarProximoStateChangeVazio = true;
    this.nome = '';
    this.status = '';
    this.page = 0;
    this.carregar();
  }

  pagina(event: PageEvent): void {
    this.page = event.pageIndex;
    this.size = event.pageSize;
    this.carregar();
  }

  executarAcao(event: DataTableActionEvent<ClickTvTela>): void {
    const handlers: Record<string, (tela: ClickTvTela) => void> = {
      editar: (tela) => this.editar(tela),
      vincular: (tela) => this.vincular(tela),
      desvincular: (tela) => this.desvincular(tela),
      desativar: (tela) => this.desativar(tela),
    };
    handlers[event.action]?.(event.row);
  }

  vincular(tela?: ClickTvTela): void {
    if (tela?.status === 'DESATIVADA') {
      this.toastr.warning('Uma tela desativada não pode ser vinculada novamente.');
      return;
    }
    this.dialog.open(ClickTvTelaDialogComponent, {
      width: '560px',
      data: { vincular: true, tela },
    }).afterClosed().subscribe((payload) => {
      if (!payload) return;
      this.service.vincularTela(payload).subscribe({
        next: () => { this.toastr.success(tela ? 'Tela vinculada novamente.' : 'Tela vinculada com sucesso.'); this.carregar(); },
        error: (error) => this.erroAtivacao(error),
      });
    });
  }

  editar(tela: ClickTvTela): void {
    this.dialog.open(ClickTvTelaDialogComponent, {
      width: '560px',
      data: { vincular: false, tela },
    }).afterClosed().subscribe((payload: ClickTvTelaPayload | undefined) => {
      if (!payload) return;
      this.service.editarTela(tela.id, payload).subscribe({
        next: () => { this.toastr.success('Tela atualizada.'); this.carregar(); },
        error: () => this.toastr.error('Não foi possível editar a tela.'),
      });
    });
  }

  alterarPlaylist(tela: ClickTvTela, value: number | null): void {
    if (tela.status === 'DESATIVADA' || this.pendingPlaylistIds.has(tela.id)) return;
    const anterior = tela.playlistPadraoId ?? null;
    if (anterior === value) return;
    this.pendingPlaylistIds.add(tela.id);
    tela.playlistPadraoId = value;
    this.service.alterarPlaylistPadrao(tela.id, value).pipe(
      finalize(() => this.pendingPlaylistIds.delete(tela.id))
    ).subscribe({
      next: () => { this.toastr.success('Playlist padrão atualizada.'); },
      error: () => {
        tela.playlistPadraoId = anterior;
        this.toastr.error('Não foi possível alterar a playlist padrão.');
        this.carregar();
      },
    });
  }

  desvincular(tela: ClickTvTela): void {
    if (tela.status === 'AGUARDANDO_ATIVACAO' || tela.status === 'DESATIVADA') return;
    this.confirmar(
      'Desvincular tela',
      `Desvincular "${tela.nome}"? O player precisará de um novo código para voltar a operar.`,
      'Desvincular',
      () => this.service.desvincularTela(tela.id),
      'Tela desvinculada.'
    );
  }

  desativar(tela: ClickTvTela): void {
    if (tela.status === 'DESATIVADA') return;
    this.confirmar(
      'Desativar tela',
      `Desativar "${tela.nome}"? Esta ação é permanente e a tela não poderá ser vinculada novamente.`,
      'Desativar',
      () => this.service.desativarTela(tela.id),
      'Tela desativada.'
    );
  }

  statusClass(status: ClickTvStatusTela): string {
    return status === 'ONLINE' ? 'success' : status === 'AGUARDANDO_ATIVACAO' ? 'warning' : status === 'DESATIVADA' ? 'neutral' : 'danger';
  }

  statusLabel(status: ClickTvStatusTela): string {
    return this.statusLabels[status] || status;
  }

  private confirmar(
    title: string,
    message: string,
    confirmText: string,
    action: () => Observable<ClickTvTela>,
    sucesso: string
  ): void {
    this.dialog.open(ConfirmDialogComponent, {
      width: '430px',
      data: { title, message, confirmText, confirmColor: 'warn' },
    }).afterClosed().subscribe((ok) => {
      if (!ok) return;
      action().subscribe({
        next: () => { this.toastr.success(sucesso); this.carregar(); },
        error: () => this.toastr.error('Não foi possível concluir a operação.'),
      });
    });
  }

  private tratarErroListagem(error: HttpErrorResponse): void {
    if (error.status === 403) {
      this.semPermissao = true;
      this.erro = null;
      return;
    }
    this.erro = error.error?.message || 'Não foi possível carregar as telas.';
  }

  private erroAtivacao(error: HttpErrorResponse): void {
    if (error.status === 409) {
      this.toastr.warning(error.error?.message || 'Este código já foi utilizado ou a tela não pode ser vinculada.');
    } else if (error.status === 404 || error.status === 410) {
      this.toastr.warning('Código inválido ou expirado. Gere um novo código no player.');
    } else {
      this.toastr.error(error.error?.message || 'Não foi possível vincular a tela.');
    }
  }
}
