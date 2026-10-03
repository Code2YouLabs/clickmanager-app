import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { EMPTY, Observable, Subject, catchError, finalize, switchMap, takeUntil, tap } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { InputPesquisaComponent } from 'src/app/components/inputs/input-pesquisa/input-pesquisa.component';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { TemPermissaoDirective } from 'src/app/diretivas/tem-permissao.directive';
import { MaterialModule } from 'src/app/material.module';
import { ClickTvMidia, ClickTvPage, ClickTvPlaylistDetalhe, ClickTvPlaylistItem } from '../../models/clicktv.models';
import { ClickTvService } from '../../services/clicktv.service';

@Component({
  selector: 'app-clicktv-playlist-editor',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    InputPesquisaComponent,
    TemPermissaoDirective,
  ],
  templateUrl: './clicktv-playlist-editor.component.html',
  styleUrls: ['../../clicktv.scss', './clicktv-playlist-editor.component.scss'],
})
export class ClickTvPlaylistEditorComponent implements OnInit, OnDestroy {
  playlist?: ClickTvPlaylistDetalhe;
  biblioteca: ClickTvMidia[] = [];
  busca = '';
  carregandoPlaylist = true;
  refreshingPlaylist = false;
  erroPlaylist: string | null = null;
  semPermissaoPlaylist = false;
  playlistNaoEncontrada = false;
  carregandoBiblioteca = false;
  refreshingBiblioteca = false;
  erroBiblioteca: string | null = null;
  salvando = false;
  readonly playlistId = Number(this.route.snapshot.paramMap.get('id'));

  private readonly carregarPlaylist$ = new Subject<void>();
  private readonly carregarBiblioteca$ = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly route: ActivatedRoute,
    private readonly service: ClickTvService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.carregarPlaylist$.pipe(
      tap(() => {
        this.erroPlaylist = null;
        this.semPermissaoPlaylist = false;
        this.playlistNaoEncontrada = false;
        if (this.playlist) {
          this.refreshingPlaylist = true;
        } else {
          this.carregandoPlaylist = true;
        }
      }),
      switchMap(() => this.service.detalharPlaylist(this.playlistId).pipe(
        catchError((error: HttpErrorResponse) => {
          this.tratarErroDetalhe(error);
          return EMPTY;
        }),
        finalize(() => {
          this.carregandoPlaylist = false;
          this.refreshingPlaylist = false;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe((playlist) => {
      this.playlist = {
        ...playlist,
        itens: this.ordenarItens(playlist.itens),
      };
    });

    this.carregarBiblioteca$.pipe(
      tap(() => {
        this.erroBiblioteca = null;
        if (this.biblioteca.length) {
          this.refreshingBiblioteca = true;
        } else {
          this.carregandoBiblioteca = true;
        }
      }),
      switchMap(() => this.service.listarMidias({
        nome: this.busca.trim() || undefined,
        status: 'DISPONIVEL',
        page: 0,
        size: 100,
      }).pipe(
        catchError((error: HttpErrorResponse) => {
          this.erroBiblioteca = error.error?.message || 'Não foi possível carregar a biblioteca de mídias.';
          return EMPTY;
        }),
        finalize(() => {
          this.carregandoBiblioteca = false;
          this.refreshingBiblioteca = false;
        })
      )),
      takeUntil(this.destroy$)
    ).subscribe((res: ClickTvPage<ClickTvMidia>) => {
      this.biblioteca = res.content || [];
    });

    this.carregarPlaylist();
    this.carregarBiblioteca();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  get titulo(): string {
    return this.playlist?.nome || 'Editor de playlist';
  }

  get subtitulo(): string {
    if (!this.playlist) return 'Organize mídias e sequência de reprodução.';
    return `${this.playlist.orientacao} · versão ${this.playlist.versao} · duração configurada ${this.duracaoTotal()}s`;
  }

  get podeExibirEditor(): boolean {
    return !!this.playlist && !this.carregandoPlaylist && !this.semPermissaoPlaylist && !this.playlistNaoEncontrada && !this.erroPlaylist;
  }

  carregarPlaylist(): void {
    this.carregarPlaylist$.next();
  }

  carregarBiblioteca(): void {
    this.carregarBiblioteca$.next();
  }

  pesquisarBiblioteca(valor: string): void {
    this.busca = valor;
    this.carregarBiblioteca();
  }

  adicionar(midia: ClickTvMidia): void {
    if (this.salvando) return;
    const duracao = midia.tipo === 'IMAGEM' ? (midia.duracaoSegundos || 10) : undefined;
    this.executar(() => this.service.adicionarItem(this.playlistId, midia.id, duracao), 'Mídia adicionada.', true);
  }

  mover(item: ClickTvPlaylistItem, direcao: -1 | 1): void {
    if (!this.playlist || this.salvando) return;
    const itens = this.ordenarItens(this.playlist.itens);
    const atual = itens.findIndex((value) => value.id === item.id);
    const destino = atual + direcao;
    if (atual < 0 || destino < 0 || destino >= itens.length) return;
    [itens[atual], itens[destino]] = [itens[destino], itens[atual]];
    this.executar(() => this.service.reordenarItens(this.playlistId, itens.map((value) => value.id)), 'Ordem atualizada.', true);
  }

  salvarItem(item: ClickTvPlaylistItem): void {
    if (this.salvando) return;
    const duracao = item.midiaTipo === 'IMAGEM' ? Number(item.duracaoSegundos) : null;
    if (item.midiaTipo === 'IMAGEM' && (!duracao || duracao <= 0)) {
      this.toastr.warning('Informe uma duração maior que zero para a imagem.');
      this.carregarPlaylist();
      return;
    }
    this.executar(() => this.service.editarItem(this.playlistId, item.id, duracao, item.ativo), 'Item atualizado.', true);
  }

  remover(item: ClickTvPlaylistItem): void {
    if (this.salvando) return;
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: { title: 'Remover item', message: `Remover "${item.midiaNome}" desta playlist?`, confirmText: 'Remover', confirmColor: 'warn' },
    }).afterClosed().subscribe((ok) => {
      if (!ok || this.salvando) return;
      this.salvando = true;
      this.service.removerItem(this.playlistId, item.id).subscribe({
        next: () => { this.salvando = false; this.toastr.success('Item removido.'); this.carregarPlaylist(); },
        error: (error) => this.tratarErroOperacao(error, true),
      });
    });
  }

  duracaoTotal(): number {
    return (this.playlist?.itens || []).filter((item) => item.ativo)
      .reduce((total, item) => total + Number(item.duracaoSegundos || 0), 0);
  }

  trackByItem(_index: number, item: ClickTvPlaylistItem): number {
    return item.id;
  }

  private executar(
    action: () => Observable<ClickTvPlaylistDetalhe>,
    sucesso: string,
    recarregarAoFalhar: boolean
  ): void {
    this.salvando = true;
    action().subscribe({
      next: (playlist) => {
        this.playlist = { ...playlist, itens: this.ordenarItens(playlist.itens) };
        this.salvando = false;
        this.toastr.success(sucesso);
      },
      error: (error) => this.tratarErroOperacao(error, recarregarAoFalhar),
    });
  }

  private tratarErroOperacao(error: HttpErrorResponse, recarregarAoFalhar: boolean): void {
    this.salvando = false;
    if (error.status === 409) {
      this.toastr.warning(error.error?.message || 'A playlist foi alterada ou a mídia está em conflito. Recarregamos os dados.');
      this.carregarPlaylist();
      return;
    }
    this.toastr.error(error.error?.message || 'Não foi possível atualizar a playlist.');
    if (recarregarAoFalhar) {
      this.carregarPlaylist();
    }
  }

  private tratarErroDetalhe(error: HttpErrorResponse): void {
    if (error.status === 403) {
      this.semPermissaoPlaylist = true;
      return;
    }
    if (error.status === 404) {
      this.playlistNaoEncontrada = true;
      return;
    }
    this.erroPlaylist = error.error?.message || 'Não foi possível carregar a playlist.';
  }

  private ordenarItens(itens: ClickTvPlaylistItem[] = []): ClickTvPlaylistItem[] {
    return [...itens].sort((a, b) => a.ordem - b.ordem);
  }
}
