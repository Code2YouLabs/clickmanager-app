import { BreakpointObserver } from '@angular/cdk/layout';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { PageCardComponent } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { ViewModeToggleComponent } from 'src/app/components/view-mode-toggle/view-mode-toggle.component';
import { MobileTotalBarComponent } from 'src/app/components/mobile-total-bar/mobile-total-bar.component';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTabsModule } from '@angular/material/tabs';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatDividerModule } from '@angular/material/divider';
import { ToastrService } from 'ngx-toastr';
import { AccountSettingService } from './account-setting.service';
import { ActivatedRoute, Router } from '@angular/router';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { AuthService } from 'src/app/services/auth.service';
import { Usuario } from 'src/app/models/usuario/usuario.model';
import { Subscription } from 'rxjs';
import { AppNotificacoesComponent } from '../../notificacoes/notificacoes.component';

@Component({
  selector: 'app-account-setting',
  standalone: true,
  imports: [
    PageCardComponent, SectionCardComponent, ViewModeToggleComponent, MobileTotalBarComponent,
    CommonModule,
    MatCardModule,
    MatIconModule,
    TablerIconsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatSlideToggleModule,
    MatSelectModule,
    MatInputModule,
    MatButtonModule,
    MatDividerModule,
    ReactiveFormsModule,
    AppNotificacoesComponent
  ],
  templateUrl: './account-setting.component.html',
  styleUrl: './account-setting.component.scss',
})
export class AppAccountSettingComponent implements OnInit, OnDestroy {
  
  isMobile = false;
  salvando = false;
  mobileSection: 'dados' | 'endereco' | 'foto' | 'senha' | null = 'dados';
  readonly mobileTabs = [
    { value: 'conta', label: 'Conta' },
    { value: 'preferencias', label: 'Preferências' },
    { value: 'notificacoes', label: 'Notificações' }
  ];
  private readonly responsiveSub = new Subscription();
  get mobileTab(): string { return this.mobileTabs[this.selectedTabIndex]?.value || 'conta'; }
  selecionarAbaMobile(value: string): void {
    const index = this.mobileTabs.findIndex(tab => tab.value === value);
    if (index >= 0) this.selectedTabIndex = index;
  }
  expandirSecao(section: 'dados' | 'endereco' | 'foto' | 'senha', expanded: boolean): void {
    this.mobileSection = expanded ? section : this.mobileSection === section ? null : this.mobileSection;
  }
  salvarMobile(): void {
    if (this.salvando) return;
    if (this.form.invalid) {
      if (this.form.get('nome')?.invalid || this.form.get('telefone')?.invalid) this.mobileSection = 'dados';
      else if (this.form.get('enderecoRequest')?.invalid) this.mobileSection = 'endereco';
      else this.mobileSection = 'senha';
    } else if (this.form.get('novaSenha')?.value !== this.form.get('confirmarNovaSenha')?.value) this.mobileSection = 'senha';
    this.salvar();
  }

  readonly IMAGEM_PADRAO = 'assets/images/profile/user-1.jpg';
  form!: FormGroup;
  imagemPreview: string | null = null;
  imagemBlob: Blob | null = null;
  imagemOriginal = 'assets/images/profile/user-1.jpg';
  usuarioId?: string;
  isProprietario = false;
  usuarioAtual: Usuario | null = null;
  selectedTabIndex = 0;
  notificacaoSelecionadaId: number | null = null;
  private usuarioSub?: Subscription;
  private queryParamsSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private accountService: AccountSettingService,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    breakpoints?: BreakpointObserver
  ) {
    if (breakpoints) this.responsiveSub.add(breakpoints.observe(MOBILE_FOUNDATION_QUERY)
      .subscribe(state => this.isMobile = state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches));
  }

  ngOnInit(): void {
    this.form = this.criarFormulario();
    
    this.imagemOriginal = this.IMAGEM_PADRAO;
    this.usuarioSub = this.authService.usuario$.subscribe(u => {
      this.usuarioAtual = u;
      this.isProprietario = !!u?.proprietario;
    });

    this.queryParamsSub = this.route.queryParamMap.subscribe((params) => {
      const tab = String(params.get('tab') || '').toLowerCase();
      if (tab === 'notificacoes') {
        this.selectedTabIndex = 2;
      } else if (tab === 'preferencias') {
        this.selectedTabIndex = 1;
      } else {
        this.selectedTabIndex = 0;
      }

      const notificacaoIdRaw = params.get('notificacaoId');
      const notificacaoId = notificacaoIdRaw ? Number(notificacaoIdRaw) : NaN;
      this.notificacaoSelecionadaId = Number.isFinite(notificacaoId) && notificacaoId > 0 ? notificacaoId : null;
    });

    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.usuarioId = userId;
      this.carregarDadosUsuario(userId);
    }
  }

  ngOnDestroy(): void {
    this.responsiveSub.unsubscribe();
    this.usuarioSub?.unsubscribe();
    this.queryParamsSub?.unsubscribe();
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      nome: ['', Validators.required],
      telefone: ['', Validators.required],
      email: [{ value: '', disabled: true }],
      senhaAtual: ['', Validators.required],
      novaSenha: [''],
      confirmarNovaSenha: [''],
      enderecoRequest: this.fb.group({
        cep: ['', Validators.required],
        logradouro: ['', Validators.required],
        numero: ['', Validators.required],
        complemento: [''],
        bairro: ['', Validators.required],
        cidade: ['', Validators.required],
        estado: ['', Validators.required],
      }),
      fotoPerfil: [null]
    });
  }
  

  carregarDadosUsuario(id: string): void {
    this.accountService.buscarUsuarioPorId(id).subscribe({
      next: (usuario: Usuario) => {
        this.form.patchValue({
          nome: usuario.nome,
          telefone: usuario.telefone,
          email: usuario.email,
          enderecoRequest: {
            cep: usuario.endereco?.cep || '',
            logradouro: usuario.endereco?.logradouro || '',
            numero: usuario.endereco?.numero || '',
            complemento: usuario.endereco?.complemento || '',
            bairro: usuario.endereco?.bairro || '',
            cidade: usuario.endereco?.cidade || '',
            estado: usuario.endereco?.estado || ''
          }
        });

        this.imagemOriginal = usuario.fotoPerfil
        ? ImagemUtil.montarUrlImagemPerfil(usuario.fotoPerfil)
        : this.IMAGEM_PADRAO;
      },
      error: () => this.toastr.error('Erro ao carregar dados do usuário')
    });
  }

  salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toastr.warning('Preencha corretamente todos os campos obrigatórios.');
      return;
    }

    if (!this.validarNovaSenha()) return;

    const userId = this.usuarioId;
    if (!userId) {
      this.toastr.error('Usuário não identificado.');
      return;
    }

    const formData = this.montarFormData();

    this.salvando = true;
    this.accountService.atualizarDadosUsuario(userId, formData).subscribe({
      next: () => {
        this.salvando = false;
        this.authService.carregarUsuarioCompleto();
        this.toastr.success('Perfil atualizado com sucesso!');
        this.form.patchValue({
          senhaAtual: '',
          novaSenha: '',
          confirmarNovaSenha: ''
        });
      },
      error: () => { this.salvando = false; this.toastr.error('Erro ao salvar dados.'); }
    });
  }

  cancelar(): void {
    if (this.usuarioId) {
      this.carregarDadosUsuario(this.usuarioId);
    }
  
    this.form.patchValue({
      senhaAtual: '',
      novaSenha: '',
      confirmarNovaSenha: ''
    });

  this.imagemPreview = null;
  }

  private montarFormData(): FormData {
    const formData = new FormData();
    const rawValues = this.form.getRawValue();
  
    // Adiciona os campos principais (exceto fotoPerfil e enderecoRequest)
    Object.entries(rawValues).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'fotoPerfil' && key !== 'enderecoRequest') {
        formData.append(key, String(value));
      }
    });
  
    // Adiciona os campos do objeto enderecoRequest
    const endereco = rawValues['enderecoRequest'];
    if (endereco) {
      Object.entries(endereco).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(`enderecoRequest.${key}`, String(value));
        }
      });
    }
  
    // Adiciona a imagem
    if (this.imagemBlob) {
      formData.append('fotoPerfil', this.imagemBlob, 'perfil.jpg');
    }
  
    return formData;
  }
 

  private validarNovaSenha(): boolean {
    const { novaSenha, confirmarNovaSenha } = this.form.getRawValue();
    if ((novaSenha || confirmarNovaSenha) && novaSenha !== confirmarNovaSenha) {
      this.toastr.error('As novas senhas não conferem.');
      return false;
    }
    return true;
  }

  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
  
    ImagemUtil.processarImagemSelecionada(file, 150, 150)
      .then(({ preview, blob }) => {
        this.imagemPreview = preview;
        this.imagemBlob = new File([blob], 'perfil.jpg', { type: blob.type });
        this.form.get('fotoPerfil')?.setValue(this.imagemBlob);
      })
      .catch(err => this.toastr.warning(err));
  }

  resetarImagem(input: HTMLInputElement): void {
    this.imagemPreview = null;
    this.imagemBlob = null;
    this.form.get('fotoPerfil')?.setValue(null);
    this.imagemOriginal = this.IMAGEM_PADRAO;
  
    if (input) input.value = '';
  }

  usarImagemPadrao(event: Event): void {
    const imagem = event.target as HTMLImageElement | null;
    if (!imagem || imagem.dataset['fallbackApplied'] === 'true') {
      return;
    }

    imagem.dataset['fallbackApplied'] = 'true';
    imagem.onerror = null;
    imagem.src = 'assets/images/profile/user-1.jpg';
  }

  buscarEnderecoPorCep(): void {
    const cep = this.form.get('enderecoRequest.cep')?.value;

    if (!cep || cep.length < 8) return;

    this.accountService.buscarEndereco(cep).subscribe({
      next: (dados) => {
    if (dados.erro) {
      this.toastr.warning('CEP não encontrado');
      return;
    }

    this.form.get('enderecoRequest')?.patchValue({
      logradouro: dados.logradouro || '',
      bairro: dados.bairro || '',
      cidade: dados.localidade || '',
      estado: dados.uf || ''
    });        
  },
  error: () => this.toastr.error('Erro ao buscar o endereço')
});
  }

  abrirOnboarding(): void {
    const rota = this.authService.getOnboardingRouteForUsuario(false, this.usuarioAtual);
    if (rota === '/onboarding') {
      this.router.navigate(['/onboarding'], {
        queryParams: { reabrir: '1' },
      });
      return;
    }

    this.router.navigateByUrl(rota);
  }
}
