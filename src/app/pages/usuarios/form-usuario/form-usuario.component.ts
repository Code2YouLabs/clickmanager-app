import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { Observable, Subject, Subscription, finalize, forkJoin, of, takeUntil } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputPasswordComponent } from 'src/app/components/inputs/input-password/input-password.component';
import { Perfil } from 'src/app/models/perfil.model';
import { UsuarioService } from '../services/usuario.service';
import { PerfilService } from '../services/perfil.service';

@Component({
  selector: 'app-form-usuario', standalone: true,
  templateUrl: './form-usuario.component.html',
  imports: [CommonModule, ReactiveFormsModule, MatSlideToggleModule, MatProgressSpinnerModule, MatButtonModule,
    PageCardComponent, SectionCardComponent, InputTextoRestritoComponent, InputEmailComponent, InputOptionsComponent, InputPasswordComponent],
})
export class FormUsuarioComponent implements OnInit, OnDestroy {
  form!: FormGroup;
  readonly formState = new PageFormState(() => this.form);
  perfis: Perfil[] = [];
  isEditMode = false;
  usuarioId?: number;
  carregando = true;
  erro: string | null = null;
  semPermissao = false;
  saving = false;
  private consulta?: Subscription;
  private readonly destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, private usuarioService: UsuarioService, private perfilService: PerfilService,
    private toastrService: ToastrService, private router: Router, private route: ActivatedRoute) {}

  get pronto(): boolean { return !this.carregando && !this.erro && !this.semPermissao; }
  get footerActions(): PageCardAction[] {
    return this.pronto ? [{ id: 'salvar',
      type: 'submit', form: 'usuario-form', disabled: this.form.invalid }] : [];
  }

  ngOnInit(): void {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.maxLength(100)]],
      username: ['', [Validators.required, Validators.maxLength(50), Validators.email]],
      senha: ['', [Validators.required, Validators.minLength(6)]],
      perfilId: [null, Validators.required], ativo: [true],
    });
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      const id = params.get('id');
      this.isEditMode = !!id;
      this.usuarioId = id ? Number(id) : undefined;
      this.form.reset({ nome: '', username: '', senha: '', perfilId: null, ativo: true });
      this.senhaControl.setValidators(this.isEditMode ? [] : [Validators.required, Validators.minLength(6)]);
      this.senhaControl.updateValueAndValidity();
      this.formState.begin(this.isEditMode ? 'edit' : 'create');
      this.carregarDados();
    });
  }

  carregarDados(): void {
    this.consulta?.unsubscribe();
    this.carregando = true; this.erro = null; this.semPermissao = false;
    if (this.isEditMode && (!this.usuarioId || !Number.isFinite(this.usuarioId))) {
      this.carregando = false; this.erro = 'ID do usuário inválido.'; return;
    }
    this.consulta = forkJoin({
      perfis: this.perfilService.listar(),
      usuario: this.isEditMode ? this.usuarioService.buscarPorId(this.usuarioId!) : of(null),
    }).subscribe({
      next: ({ perfis, usuario }) => {
        this.perfis = perfis;
        if (usuario) {
          this.form.patchValue({ nome: usuario.nome, username: usuario.username,
            perfilId: usuario.perfil?.id ?? null, ativo: usuario.ativo });
          this.formState.loaded();
        }
        this.carregando = false;
      },
      error: error => {
        this.carregando = false; this.semPermissao = error.status === 403;
        this.erro = this.semPermissao ? null : 'Não foi possível carregar os dados do usuário e os perfis.';
      },
    });
  }

  onSubmit(): void {
    if (!this.pronto || this.saving) return;
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    // Preserva o objeto JSON atual. O PUT resumido aceita JSON; a assinatura
    // FormData do serviço também é usada pelo fluxo multipart de perfil pessoal.
    const usuario = this.form.value;
    this.saving = true;
    const request: Observable<unknown> = this.isEditMode
      ? this.usuarioService.atualizar(this.usuarioId!, usuario)
      : this.usuarioService.salvar(usuario);
    request.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toastrService.success(this.isEditMode ? 'Usuário atualizado com sucesso!' : 'Usuário cadastrado com sucesso!');
        this.router.navigate(['/page/usuarios/listar']);
      },
      error: () => this.toastrService.error(this.isEditMode ? 'Erro ao atualizar usuário.' : 'Erro ao cadastrar usuário.'),
    });
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe(); this.destroy$.next(); this.destroy$.complete();
  }
  get nomeControl(): FormControl { return this.form.get('nome') as FormControl; }
  get emailControl(): FormControl { return this.form.get('username') as FormControl; }
  get senhaControl(): FormControl { return this.form.get('senha') as FormControl; }
  get perfilControl(): FormControl { return this.form.get('perfilId') as FormControl; }
}
