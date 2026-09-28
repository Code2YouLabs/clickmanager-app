import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ToastrService } from 'ngx-toastr';
import { forkJoin } from 'rxjs';
import { ConfirmDialogComponent } from 'src/app/components/dialog/confirm-dialog/confirm-dialog.component';
import { DataTableCellDirective } from 'src/app/components/data-table/data-table-cell.directive';
import { DataTableComponent } from 'src/app/components/data-table/data-table.component';
import { DataTableAction, DataTableActionEvent, DataTableColumn } from 'src/app/components/data-table/data-table.models';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { Perfil } from 'src/app/models/perfil.model';
import { PerfilRequest } from 'src/app/models/perfil/perfil-request.model';
import { PermissaoCatalogo } from 'src/app/models/permissao.model';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { AuthService } from 'src/app/services/auth.service';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { PerfilService } from '../../usuarios/services/perfil.service';
import { PerfilDialogComponent } from '../modal-perfil/perfil-dialog.component';
import { TrocarPerfilDialogComponent } from '../modal-trocar-perfil/trocar-perfil-dialog.component';

@Component({
  selector: 'app-gerenciar-perfil',
  templateUrl: './gerenciar-perfil.component.html',
  styleUrls: ['./gerenciar-perfil.component.scss'],
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatListModule, MatProgressSpinnerModule,
    PageCardComponent, SectionCardComponent, DataTableComponent, DataTableCellDirective],
})
export class GerenciarPerfilComponent implements OnInit {
  perfis: Perfil[] = [];
  usuarios: Usuario[] = [];
  perfilSelecionado?: Perfil;
  carregandoPerfis = false;
  erroPerfis: string | null = null;
  carregandoUsuarios = false;
  erroUsuarios: string | null = null;
  readonly imagemUtil = ImagemUtil;
  readonly colunasUsuarios: DataTableColumn<Usuario>[] = [
    { key: 'usuario', label: 'Usuário' },
    { key: 'perfil', label: 'Perfil', width: '180px' },
  ];
  readonly acoesUsuarios: DataTableAction<Usuario>[] = [
    { id: 'trocar-perfil', label: 'Trocar perfil', icon: 'swap_horiz', visible: () => this.podeEditar },
  ];
  private requisicaoUsuarios = 0;

  constructor(
    private perfilService: PerfilService,
    private dialog: MatDialog,
    private toastrService: ToastrService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    if (this.podeVer) this.carregarPerfis(false);
  }

  get podeVer(): boolean { return this.authService.temPermissao('PERFIS_PERMISSOES_VER'); }
  get podeCadastrar(): boolean { return this.authService.temPermissao('PERFIS_PERMISSOES_CADASTRAR'); }
  get podeEditar(): boolean { return this.authService.temPermissao('PERFIS_PERMISSOES_EDITAR'); }
  get podeExcluir(): boolean { return this.authService.temPermissao('PERFIS_PERMISSOES_EXCLUIR'); }

  carregarPerfis(preservarSelecao = true): void {
    if (!this.podeVer) return;
    const perfilSelecionadoId = preservarSelecao ? this.perfilSelecionado?.id : undefined;
    this.carregandoPerfis = true;
    this.erroPerfis = null;
    this.perfilService.listar().subscribe({
      next: perfis => {
        this.perfis = perfis;
        this.carregandoPerfis = false;
        if (perfilSelecionadoId !== undefined) {
          const perfilAtualizado = perfis.find(perfil => perfil.id === perfilSelecionadoId);
          perfilAtualizado ? this.selecionarPerfil(perfilAtualizado) : this.limparSelecao();
        }
      },
      error: err => {
        this.carregandoPerfis = false;
        this.erroPerfis = this.mensagemErro(err, 'Não foi possível carregar os perfis.');
      },
    });
  }

  selecionarPerfil(perfil: Perfil): void {
    this.perfilSelecionado = perfil;
    this.usuarios = [];
    this.erroUsuarios = null;
    this.carregandoUsuarios = true;
    const requisicaoAtual = ++this.requisicaoUsuarios;
    this.perfilService.listarUsuariosDoPerfil(perfil.id).subscribe({
      next: usuarios => {
        if (requisicaoAtual !== this.requisicaoUsuarios) return;
        this.usuarios = usuarios;
        this.carregandoUsuarios = false;
      },
      error: err => {
        if (requisicaoAtual !== this.requisicaoUsuarios) return;
        this.carregandoUsuarios = false;
        this.erroUsuarios = this.mensagemErro(err, 'Não foi possível carregar os usuários deste perfil.');
      },
    });
  }

  repetirUsuarios(): void {
    if (this.perfilSelecionado) this.selecionarPerfil(this.perfilSelecionado);
  }

  editar(perfil: Perfil): void {
    if (this.podeEditar) this.openDialogPerfil('Edit', perfil);
  }

  excluir(id: number): void {
    if (!this.podeExcluir) return;
    this.perfilService.listarUsuariosDoPerfil(id).subscribe({
      next: usuarios => {
        if (usuarios.length > 0) {
          this.toastrService.warning('Não é possível excluir este perfil. Há usuários vinculados.');
          return;
        }
        const dialogRef = this.dialog.open(ConfirmDialogComponent, {
          data: { title: 'Excluir Perfil', message: 'Deseja realmente excluir este perfil?', confirmText: 'Excluir', confirmColor: 'warn' },
          width: '400px',
        });
        dialogRef.afterClosed().subscribe(confirmado => {
          if (!confirmado) return;
          this.perfilService.excluir(id).subscribe({
            next: () => {
              this.toastrService.success('Perfil excluído com sucesso.');
              if (this.perfilSelecionado?.id === id) this.limparSelecao();
              this.carregarPerfis();
            },
            error: err => this.exibirErro(err, 'Erro ao excluir o perfil.'),
          });
        });
      },
      error: err => this.exibirErro(err, 'Não foi possível verificar os usuários vinculados.'),
    });
  }

  openDialogPerfil(action: 'Add' | 'Edit', perfil: Partial<Perfil> = {}): void {
    if ((action === 'Add' && !this.podeCadastrar) || (action === 'Edit' && !this.podeEditar)) return;
    if (action === 'Edit' && perfil.id !== undefined) {
      forkJoin({
        perfil: this.perfilService.obter(perfil.id),
        permissoes: this.perfilService.listarPermissoesPorPerfil(perfil.id),
        usuarios: this.perfilService.listarUsuariosDoPerfil(perfil.id),
      }).subscribe({
        next: ({ perfil: perfilCompleto, permissoes, usuarios }) =>
          this.abrirDialog(action, perfilCompleto, permissoes, usuarios.some(usuario => !!usuario.proprietario)),
        error: err => this.exibirErro(err, 'Erro ao carregar permissões do perfil.'),
      });
      return;
    }
    this.perfilService.listarPermissoesDisponiveis().subscribe({
      next: permissoes => this.abrirDialog(action, perfil, permissoes, false),
      error: err => this.exibirErro(err, 'Erro ao carregar catálogo de permissões.'),
    });
  }

  openDialogTrocarPerfil(usuario: Usuario): void {
    if (!this.podeEditar) return;
    const dialogRef = this.dialog.open(TrocarPerfilDialogComponent, {
      data: { usuario, perfis: this.perfis }, autoFocus: false, width: '600px', maxWidth: 'calc(100vw - 32px)',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (!result?.novoPerfilId || !result?.usuarioId) return;
      this.perfilService.trocarPerfil(result.usuarioId, result.novoPerfilId).subscribe({
        next: usuarioAtualizado => {
          this.toastrService.success(`Perfil do usuário ${usuarioAtualizado.nome} alterado com sucesso.`);
          this.carregarPerfis();
        },
        error: err => this.exibirErro(err, `Erro ao alterar o perfil do usuário ${usuario.nome}.`),
      });
    });
  }

  onAcaoUsuario(event: DataTableActionEvent<Usuario>): void {
    if (event.action === 'trocar-perfil') this.openDialogTrocarPerfil(event.row);
  }

  salvarPerfil(dados: PerfilRequest): void {
    this.perfilService.salvar(dados).subscribe({
      next: () => { this.toastrService.success('Perfil salvo com sucesso'); this.carregarPerfis(); },
      error: err => this.exibirErro(err, 'Erro ao salvar perfil'),
    });
  }

  atualizarPerfil(id: number, dados: PerfilRequest): void {
    this.perfilService.atualizar(id, dados).subscribe({
      next: () => {
        this.toastrService.success('Perfil atualizado com sucesso');
        this.carregarPerfis();
        this.recarregarUsuarioSePerfilAtual(id);
      },
      error: err => this.exibirErro(err, 'Erro ao atualizar perfil'),
    });
  }

  usarImagemPadrao(event: Event): void {
    const imagem = event.target as HTMLImageElement | null;
    if (!imagem || imagem.dataset['fallbackApplied'] === 'true') return;
    imagem.dataset['fallbackApplied'] = 'true';
    imagem.onerror = null;
    imagem.src = 'assets/images/profile/user-1.jpg';
  }

  private abrirDialog(action: 'Add' | 'Edit', perfil: Partial<Perfil>, permissoesCatalogo: PermissaoCatalogo[], perfilProprietario: boolean): void {
    const dialogRef = this.dialog.open(PerfilDialogComponent, {
      data: { action, perfil, permissoesCatalogo, perfilProprietario },
      autoFocus: false, width: '860px', maxWidth: 'calc(100vw - 32px)',
    });
    dialogRef.afterClosed().subscribe(result => {
      if (result?.event !== 'Save') return;
      const payload = this.montarPayloadPerfil(result.data);
      if (action === 'Add') this.salvarPerfil(payload);
      else if (perfil.id !== undefined) this.atualizarPerfil(perfil.id, payload);
    });
  }

  private limparSelecao(): void {
    this.requisicaoUsuarios++;
    this.perfilSelecionado = undefined;
    this.usuarios = [];
    this.carregandoUsuarios = false;
    this.erroUsuarios = null;
  }

  private exibirErro(err: unknown, fallback: string): void { this.toastrService.error(this.mensagemErro(err, fallback)); }
  private mensagemErro(err: any, fallback: string): string { return err?.userMessage || err?.error?.message || err?.message || fallback; }

  private montarPayloadPerfil(data: any): PerfilRequest {
    const permissoes = Object.entries(data.permissoes || {})
      .map(([id, selecionada]) => ({ id: Number(id), selecionada: !!selecionada }))
      .filter((permissao): permissao is { id: number; selecionada: boolean } => Number.isFinite(permissao.id));
    return { nome: data.nome, descricao: data.descricao, permissoes };
  }

  private recarregarUsuarioSePerfilAtual(perfilId: number): void {
    let usuarioAtual: Usuario | null = null;
    try { usuarioAtual = this.authService.getUsuario(); } catch { return; }
    if (usuarioAtual?.perfil?.id !== perfilId) return;
    this.authService.carregarUsuarioCompleto().subscribe({
      error: err => this.exibirErro(err, 'Perfil atualizado, mas não foi possível recarregar suas permissões atuais.'),
    });
  }
}
