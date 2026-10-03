import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription, finalize } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputNumericoComponent } from 'src/app/components/inputs/input-numerico/input-numerico.component';
import { InputPasswordComponent } from 'src/app/components/inputs/input-password/input-password.component';
import { PageCardAction, PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { EmailServidorConfig, EmailServidorService, EmailServidorTesteRequest } from './email-servidor.service';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { EmailServidorTesteDialogComponent } from './email-servidor-teste-dialog.component';
import { AuthService } from 'src/app/services/auth.service';

@Component({
  selector: 'app-email-servidor',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    PageCardComponent,
    SectionCardComponent,
    InputTextoRestritoComponent,
    InputEmailComponent,
    InputNumericoComponent,
    InputPasswordComponent,
  ],
  templateUrl: './email-servidor.component.html',
  styleUrls: ['./email-servidor.component.scss'],
})
export class EmailServidorComponent implements OnInit, OnDestroy {
  readonly formId = 'email-servidor-form';
  readonly mensagemPadraoTeste = 'E-mail de teste do servidor de e-mail do ClickManager. Se você recebeu esta mensagem, sua configuração está funcionando.';

  form!: FormGroup;
  formState!: PageFormState;
  carregando = false;
  salvando = false;
  testando = false;
  erro: string | null = null;
  semPermissao = false;
  private emailUsuario = '';
  private usuarioSub?: Subscription;

  constructor(
    private readonly fb: FormBuilder,
    private readonly emailService: EmailServidorService,
    private readonly toastr: ToastrService,
    private readonly dialog: MatDialog,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      id: [null as number | null],
      host: ['', Validators.required],
      porta: [587, [Validators.required, Validators.min(1)]],
      usuario: ['', [Validators.required, Validators.email]],
      senha: ['', Validators.required],
      remetente: ['', [Validators.required, Validators.email]],
      usarSsl: [true],
    });
    this.formState = new PageFormState(() => this.form);
    this.formState.begin('edit');
    this.usuarioSub = this.authService.usuario$.subscribe((usuario) => {
      this.emailUsuario = usuario?.email || '';
    });
    this.carregar();
  }

  ngOnDestroy(): void {
    this.usuarioSub?.unsubscribe();
  }

  get podeSalvar(): boolean {
    return !this.carregando && !this.salvando && !this.testando && !this.erro && !this.semPermissao && this.form.valid && this.form.dirty;
  }

  get footerActions(): PageCardAction[] {
    if (this.carregando || this.erro || this.semPermissao) return [];
    return [{
      id: 'salvar-email-servidor',
      type: 'submit',
      form: this.formId,
      disabled: !this.podeSalvar,
    }];
  }

  get pageFormState(): PageFormState | undefined {
    return !this.carregando && !this.erro && !this.semPermissao ? this.formState : undefined;
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.podeSalvar) {
      return;
    }

    this.salvando = true;
    this.emailService.atualizar(this.buildConfig()).pipe(finalize(() => this.salvando = false)).subscribe({
      next: () => {
        this.form.markAsPristine();
        this.formState.loaded();
        this.toastr.success('Configuração de e-mail salva');
      },
      error: (err) => this.exibirErro(err, 'Erro ao salvar configuração de e-mail'),
    });
  }

  testar(): void {
    if (this.testando) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Preencha a configuração antes de testar.');
      return;
    }

    const dialogRef = this.dialog.open(EmailServidorTesteDialogComponent, {
      width: '600px',
      data: {
        emailDestino: this.emailUsuario,
        mensagemPadrao: this.mensagemPadraoTeste,
      },
    });

    dialogRef.afterClosed().subscribe((result: { emailDestino: string; mensagem: string } | undefined) => {
      if (!result) return;
      this.dispararTeste(result);
    });
  }

  carregar(): void {
    this.carregando = true;
    this.erro = null;
    this.semPermissao = false;
    this.formState.begin('edit');
    this.emailService.obter().subscribe({
      next: (cfg) => {
        this.carregando = false;
        if (cfg) {
          this.form.patchValue(cfg, { emitEvent: false });
        }
        this.form.markAsPristine();
        this.formState.loaded();
      },
      error: (err) => {
        this.carregando = false;
        this.semPermissao = err?.status === 403;
        this.erro = this.semPermissao ? null : (err?.userMessage || 'Não foi possível carregar configuração de e-mail');
        if (!this.semPermissao) {
          this.toastr.error(this.erro || 'Não foi possível carregar configuração de e-mail');
        }
      },
    });
  }

  get hostControl(): FormControl {
    return this.form.get('host') as FormControl;
  }

  get portaControl(): FormControl {
    return this.form.get('porta') as FormControl;
  }

  get usuarioControl(): FormControl {
    return this.form.get('usuario') as FormControl;
  }

  get senhaControl(): FormControl {
    return this.form.get('senha') as FormControl;
  }

  get remetenteControl(): FormControl {
    return this.form.get('remetente') as FormControl;
  }

  private dispararTeste(result: { emailDestino: string; mensagem: string }): void {
    if (this.testando) {
      return;
    }

    const config = this.buildConfig();
    const payload: EmailServidorTesteRequest = {
      emailDestino: result.emailDestino,
      mensagem: result.mensagem,
      host: config.host,
      porta: config.porta,
      usuario: config.usuario,
      senha: config.senha,
      remetente: config.remetente,
      usarSsl: config.usarSsl,
      id: config.id,
    };

    this.testando = true;
    this.emailService.testarEnvio(payload).pipe(finalize(() => this.testando = false)).subscribe({
      next: () => {
        this.toastr.success(`E-mail de teste enviado. Verifique a caixa de entrada de ${payload.emailDestino}.`);
      },
      error: (err) => this.exibirErro(err, 'Não foi possível enviar o e-mail de teste.'),
    });
  }

  private buildConfig(): EmailServidorConfig {
    const raw = this.form.getRawValue();
    return {
      id: raw.id ?? undefined,
      host: raw.host,
      porta: Number(raw.porta),
      usuario: raw.usuario,
      senha: raw.senha,
      remetente: raw.remetente,
      usarSsl: !!raw.usarSsl,
    };
  }

  private exibirErro(err: any, fallback: string): void {
    const mensagem = err?.userMessage || fallback;
    this.toastr.error(mensagem);
  }
}
