import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { MaterialModule } from 'src/app/material.module';
import { UsuarioService } from 'src/app/pages/usuarios/services/usuario.service';
import {
  NotificacaoCriarRequest,
  NotificacaoNivel,
  NotificacaoTipoDestino
} from '../models/notificacao.model';
import { NotificacaoService } from '../services/notificacao.service';

type DestinoSelecionavel = Extract<NotificacaoTipoDestino, 'EMPRESA_INTEIRA' | 'USUARIOS_ESPECIFICOS'>;

@Component({
  selector: 'app-notificacao-enviar-dialog',
  host: { '[class.mobile-side-panel__layout]': 'mobilePanel' },
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MaterialModule],
  templateUrl: './notificacao-enviar-dialog.component.html',
  styleUrl: './notificacao-enviar-dialog.component.scss'
})
export class NotificacaoEnviarDialogComponent implements OnInit {
  readonly mobilePanel = !!inject<{ mobilePanel?: boolean }>(MAT_DIALOG_DATA, { optional: true })?.mobilePanel;
  salvando = false;
  carregandoUsuarios = false;
  usuarios: Usuario[] = [];

  readonly destinos: Array<{ value: DestinoSelecionavel; label: string }> = [
    { value: 'EMPRESA_INTEIRA', label: 'Todos os usuários da empresa' },
    { value: 'USUARIOS_ESPECIFICOS', label: 'Usuários específicos' }
  ];

  readonly niveis: Array<{ value: NotificacaoNivel; label: string }> = [
    { value: 'INFO', label: 'Informação' },
    { value: 'SUCESSO', label: 'Sucesso' },
    { value: 'ATENCAO', label: 'Atenção' },
    { value: 'CRITICO', label: 'Crítico' }
  ];

  readonly form = this.fb.group({
    titulo: ['', [Validators.required, Validators.maxLength(180)]],
    resumo: ['', [Validators.maxLength(280)]],
    conteudo: ['', [Validators.required]],
    nivel: ['INFO' as NotificacaoNivel, [Validators.required]],
    tipoDestino: ['EMPRESA_INTEIRA' as DestinoSelecionavel, [Validators.required]],
    usuarioIds: [[] as number[]],
    link: ['', [Validators.maxLength(400)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<NotificacaoEnviarDialogComponent>,
    private readonly usuarioService: UsuarioService,
    private readonly notificacaoService: NotificacaoService,
    private readonly toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.carregarUsuarios();
    this.atualizarValidacaoUsuarios();
    this.form.controls.tipoDestino.valueChanges.subscribe(() => this.atualizarValidacaoUsuarios());
  }

  cancelar(): void {
    if (this.salvando) return;
    this.dialogRef.close(false);
  }

  labelUsuario(usuario: Usuario): string {
    const nome = String(usuario.nome || 'Usuário sem nome');
    const email = String(usuario.email || '').trim();
    return email ? `${nome} • ${email}` : nome;
  }

  enviar(): void {
    if (this.salvando) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const titulo = String(raw.titulo || '').trim();
    const resumo = String(raw.resumo || '').trim();
    const conteudo = String(raw.conteudo || '').trim();
    const link = String(raw.link || '').trim();
    const tipoDestino = (raw.tipoDestino || 'EMPRESA_INTEIRA') as DestinoSelecionavel;

    const payload: NotificacaoCriarRequest = {
      titulo,
      conteudo,
      nivel: raw.nivel || 'INFO',
      tipoDestino
    };
    if (resumo) payload.resumo = resumo;
    if (link) payload.link = link;
    if (tipoDestino === 'USUARIOS_ESPECIFICOS') {
      const usuarioIds = Array.isArray(raw.usuarioIds)
        ? raw.usuarioIds
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id) && id > 0)
        : [];
      payload.usuarioIds = usuarioIds;
    }

    this.salvando = true;
    this.notificacaoService.enviar$(payload).subscribe({
      next: (res) => {
        this.salvando = false;
        const destinatarios = Number(res?.destinatariosCriados ?? 0);
        const notificacoes = Number(res?.notificacoesCriadas ?? 0);
        this.toastr.success(
          destinatarios > 0 || notificacoes > 0
            ? `Notificação enviada para ${destinatarios} usuário(s).`
            : 'Notificação enviada com sucesso.'
        );
        this.dialogRef.close(true);
      },
      error: (err) => {
        this.salvando = false;
        this.toastr.error(err?.userMessage || 'Não foi possível enviar a notificação.');
      }
    });
  }

  private carregarUsuarios(): void {
    this.carregandoUsuarios = true;
    this.usuarioService.listar(0, 50, null).subscribe({
      next: (res) => {
        const listaBruta = Array.isArray(res?.content)
          ? res.content
          : Array.isArray(res?.itens)
            ? res.itens
            : Array.isArray(res?.data)
              ? res.data
              : Array.isArray(res)
                ? res
                : [];

        this.usuarios = listaBruta
          .map((u: any) => {
            const id = Number(u?.id ?? u?.usuarioId ?? u?.idUsuario ?? u?.userId ?? 0);
            return {
              ...u,
              id: id > 0 ? id : undefined,
              nome: String(u?.nome ?? u?.username ?? u?.login ?? ''),
              email: String(u?.email ?? '')
            } as Usuario;
          })
          .filter((u: Usuario) => !!u.id)
          .sort((a: Usuario, b: Usuario) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
        this.carregandoUsuarios = false;
      },
      error: () => {
        this.carregandoUsuarios = false;
        this.usuarios = [];
        this.toastr.warning('Não foi possível carregar os usuários para seleção.');
      }
    });
  }

  private atualizarValidacaoUsuarios(): void {
    const control = this.form.controls.usuarioIds;
    const destino = this.form.controls.tipoDestino.value as DestinoSelecionavel;

    if (destino === 'USUARIOS_ESPECIFICOS') {
      control.setValidators([this.minArrayLength(1)]);
    } else {
      control.clearValidators();
      control.setValue([], { emitEvent: false });
    }
    control.updateValueAndValidity({ emitEvent: false });
  }

  private minArrayLength(min: number): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const valor = control.value;
      if (!Array.isArray(valor)) return { minArrayLength: true };
      return valor.length >= min ? null : { minArrayLength: true };
    };
  }
}
