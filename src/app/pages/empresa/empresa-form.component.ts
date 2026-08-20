import { Component, OnInit, ViewChild, ElementRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors, FormControl } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TablerIconsModule } from 'angular-tabler-icons';
import { NgxMaskDirective, provideNgxMask } from 'ngx-mask';
import { ImagemUtil } from 'src/app/utils/imagem-util';
import { ToastrService } from 'ngx-toastr';
import { ValidadorUtil } from 'src/app/utils/validador-util';
import { EnderecoViaCep } from 'src/app/models/endereco/endereco.viacep.model';
import { CepUtilService } from 'src/app/utils/cep-util.service';
import { EmpresaFormService } from './empresa-form.service';
import { AuthService } from 'src/app/services/auth.service';
import { filter, take } from 'rxjs';
import { CardHeaderComponent } from "src/app/components/card-header/card-header.component";
import { Empresa } from 'src/app/models/empresa/empresa.model';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { InputDocumentoComponent } from 'src/app/components/inputs/input-documento/input-documento.component';
import { InputCepComponent } from 'src/app/components/inputs/input-cep/input-cep.component';
import { EmpresaIdentidadePublicaService } from './empresa-identidade-publica.service';
import { LinksIdentidadePublica } from '../links/models/links.models';
import { getClickManagerPublicHost } from '../links/utils/links-url.util';

type EmpresaOnboardingSection = 'all' | 'empresa' | 'logo' | 'endereco';

@Component({
  selector: 'app-empresa-form',
  standalone: true,
  templateUrl: './empresa-form.component.html',
  styleUrls: ['./empresa-form.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatCardModule,
    MatSelectModule,
    MatRadioModule,
    MatSlideToggleModule,
    TablerIconsModule,
    NgxMaskDirective,
    CardHeaderComponent,
    InputTextoRestritoComponent,
    InputEmailComponent,
    InputTelefoneComponent,
    InputDocumentoComponent,
    InputCepComponent
  ],
  providers: [provideNgxMask()]
})
export class EmpresaFormComponent implements OnInit {

  @Input() modoOnboarding = false;
  @Input() esconderAcoesOnboarding = false;
  @Input() onboardingSection: EmpresaOnboardingSection = 'all';
  @Output() empresaSalva = new EventEmitter<void>();

  form!: FormGroup;

  readonly IMAGEM_PADRAO = './assets/images/logos/LogoPadrao.png';
  imagemPreview: string | ArrayBuffer | null = null;
  imagemOriginal: string | null = './assets/images/logos/LogoPadrao.png';
  imagemBlob: File | null = null;
  removerLogo = false;
  identidadePublica: LinksIdentidadePublica | null = null;
  carregandoIdentidade = false;
  salvandoFavicon = false;
  faviconPreviewUrl = '';
  faviconArquivoNome = '';
  faviconArquivoTamanho = '';
  faviconErro = '';
  private faviconSelecionado: File | null = null;
  private readonly faviconFallbackUrl = 'favicon.ico';

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private cepUtilService: CepUtilService,
    private empresaService: EmpresaFormService,
    private identidadeService: EmpresaIdentidadePublicaService,
    private authService: AuthService) { }

  ngOnInit(): void {
    this.form = this.criarFormulario();

    this.authService.usuario$
      .pipe(
        filter(usuario => !!usuario),
      ).subscribe(usuario => {
        if (usuario?.empresa?.id) {
          this.empresaService.buscarEmpresa(usuario.empresa.id).subscribe({
            next: empresa => this.preencherFormulario(empresa),
            error: () => this.toastr.warning('Erro ao buscar empresa')
          });
          this.carregarIdentidadePublica();
        }
      });
  }

  get mostrarSecaoEmpresa(): boolean {
    return this.onboardingSection === 'all' || this.onboardingSection === 'empresa';
  }

  get mostrarSecaoLogo(): boolean {
    return this.onboardingSection === 'all' || this.onboardingSection === 'logo';
  }

  get mostrarSecaoEndereco(): boolean {
    return this.onboardingSection === 'all' || this.onboardingSection === 'endereco';
  }

  isCurrentSectionValid(): boolean {
    switch (this.onboardingSection) {
      case 'empresa':
        return [
          this.nomeControl,
          this.telefoneControl,
          this.emailControl,
          this.cnpjControl,
        ].every((control) => control.valid);
      case 'logo':
        return true;
      case 'endereco':
        return [
          this.cepControl,
          this.logradouroControl,
          this.numeroControl,
          this.bairroControl,
          this.cidadeControl,
          this.estadoControl,
        ].every((control) => control.valid);
      default:
        return this.form.valid;
    }
  }

  private criarFormulario(): FormGroup {
    return this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(3)]],
      telefone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      cnpj: ['', [Validators.required, ValidadorUtil.validarCNPJ]],
      inscricaoEstadual: [''],
      horario: [''],
      instagramUrl: [''],
      facebookUrl: [''],
      siteUrl: [''],
      youtubeUrl: [''],
      ativa: [true],
      enderecoRequest: this.fb.group({
        cep: ['', Validators.required],
        logradouro: ['', Validators.required],
        numero: ['', Validators.required],
        complemento: [''],
        bairro: ['', Validators.required],
        cidade: ['', Validators.required],
        estado: ['', Validators.required]
      }),
      logo: [null]
    });
  }

  private preencherFormulario(empresa: Empresa): void {
    this.form.patchValue({
      nome: empresa.nome,
      telefone: empresa.telefone,
      email: empresa.email,
      cnpj: empresa.cnpj,
      inscricaoEstadual: empresa.inscricaoEstadual || '',
      horario: empresa.horario || '',
      instagramUrl: empresa.instagramUrl || '',
      facebookUrl: empresa.facebookUrl || '',
      siteUrl: empresa.siteUrl || '',
      youtubeUrl: empresa.youtubeUrl || '',
      ativa: empresa.ativa ?? true,
      enderecoRequest: {
        cep: empresa.endereco?.cep || '',
        logradouro: empresa.endereco?.logradouro || '',
        numero: empresa.endereco?.numero || '',
        complemento: empresa.endereco?.complemento || '',
        bairro: empresa.endereco?.bairro || '',
        cidade: empresa.endereco?.cidade || '',
        estado: empresa.endereco?.estado || ''
      }
    });

    this.imagemOriginal = empresa.logoUrl || this.IMAGEM_PADRAO;

    this.imagemPreview = this.imagemOriginal;
    this.removerLogo = false;
  }

  get nomePublico(): string {
    return this.identidadePublica?.nome || this.nomeControl.value || 'Nome público não definido';
  }

  get enderecoClickManager(): string {
    return getClickManagerPublicHost(this.identidadePublica?.slug) || 'Endereço ainda não gerado';
  }

  get faviconPreview(): string {
    return this.faviconPreviewUrl || this.identidadePublica?.faviconUrl || this.faviconFallbackUrl;
  }

  get podeSalvarFavicon(): boolean {
    return !this.salvandoFavicon && !!this.faviconSelecionado;
  }

  carregarIdentidadePublica(): void {
    this.carregandoIdentidade = true;
    this.identidadeService.buscar().subscribe({
      next: (identidade) => {
        this.carregandoIdentidade = false;
        this.identidadePublica = identidade;
        if (identidade.logoUrl) {
          this.imagemOriginal = identidade.logoUrl;
          this.imagemPreview = identidade.logoUrl;
        }
      },
      error: () => {
        this.carregandoIdentidade = false;
        this.toastr.warning('Não foi possível carregar a identidade pública.');
      },
    });
  }


  onFileSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    ImagemUtil.processarImagemSelecionada(file, 216, 340, 0.8, 'contain')
      .then(({ preview, blob }) => {
        this.imagemPreview = preview;

        const fileFromBlob = new File([blob], file.name, { type: blob.type });
        this.imagemBlob = fileFromBlob;
        this.form.get('logo')?.setValue(fileFromBlob);
        this.removerLogo = false;
      })
      .catch(err => this.toastr.warning(err));
  }

  resetarImagem(input: HTMLInputElement): void {
    this.imagemPreview = null;
    this.imagemBlob = null;
    this.form.get('logo')?.setValue(null);
    this.imagemOriginal = this.IMAGEM_PADRAO;
    this.removerLogo = true;

    if (input) input.value = '';
  }

  onFaviconSelecionado(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0];
    if (!file) return;

    if (!this.validarFavicon(file)) {
      this.limparInputArquivo(input);
      return;
    }

    this.faviconSelecionado = file;
    this.faviconArquivoNome = file.name;
    this.faviconArquivoTamanho = this.formatarTamanho(file.size);
    this.faviconErro = '';

    const reader = new FileReader();
    reader.onload = () => {
      this.faviconPreviewUrl = String(reader.result || '');
    };
    reader.readAsDataURL(file);
    this.limparInputArquivo(input);
  }

  salvarFavicon(): void {
    if (!this.faviconSelecionado || this.salvandoFavicon) return;
    this.salvandoFavicon = true;
    this.identidadeService.alterarFavicon(this.faviconSelecionado).subscribe({
      next: (identidade) => {
        this.salvandoFavicon = false;
        this.identidadePublica = identidade;
        this.limparFaviconSelecionado();
        this.toastr.success('Favicon da identidade pública atualizado.');
      },
      error: (err) => {
        this.salvandoFavicon = false;
        this.toastr.error(err?.userMessage || 'Erro ao atualizar o favicon.');
      },
    });
  }

  removerFavicon(): void {
    if (this.salvandoFavicon || !this.identidadePublica?.faviconUrl) return;
    this.salvandoFavicon = true;
    this.identidadeService.removerFavicon().subscribe({
      next: (identidade) => {
        this.salvandoFavicon = false;
        this.identidadePublica = identidade;
        this.limparFaviconSelecionado();
        this.toastr.success('Favicon removido. O padrão do ClickManager será usado.');
      },
      error: (err) => {
        this.salvandoFavicon = false;
        this.toastr.error(err?.userMessage || 'Erro ao remover o favicon.');
      },
    });
  }

  cancelarFaviconSelecionado(): void {
    this.limparFaviconSelecionado();
  }

  copiarEnderecoClickManager(): void {
    const host = getClickManagerPublicHost(this.identidadePublica?.slug);
    if (!host) {
      this.toastr.warning('Endereço ClickManager ainda não disponível.');
      return;
    }

    navigator.clipboard?.writeText(host)
      .then(() => this.toastr.success('Endereço ClickManager copiado.'))
      .catch(() => this.toastr.warning('Não foi possível copiar o endereço.'));
  }

  onSubmit(): void {
  if (this.form.invalid) {
    this.toastr.warning('Preencha todos os campos obrigatórios corretamente.', 'Formulário inválido');
    this.form.markAllAsTouched();
    return;
  }

  const formData = this.montarFormData();

  this.empresaService.cadastrarEmpresaFormData(formData).subscribe({
    next: () => {
      this.toastr.success('Empresa cadastrada com sucesso!');

      if (this.modoOnboarding) {
        this.empresaSalva.emit();
      }
    },
    error: () => this.toastr.error('Erro ao cadastrar empresa')
  });
}


  private montarFormData(): FormData {
    const formData = new FormData();
    const rawValues = this.form.getRawValue();

    // Adiciona os campos principais da empresa (exceto logo e enderecoRequest)
    Object.entries(rawValues).forEach(([key, value]) => {
      if (
        value !== null &&
        value !== undefined &&
        key !== 'logo' &&
        key !== 'enderecoRequest'
      ) {
        formData.append(key, String(value));
      }
    });

    // Adiciona os campos do endereço
    const endereco = rawValues['enderecoRequest'];
    if (endereco) {
      Object.entries(endereco).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(`enderecoRequest.${key}`, String(value));
        }
      });
    }

    // Adiciona a imagem do logo da empresa, se houver
    if (this.imagemBlob) {
      formData.append('logo', this.imagemBlob, this.imagemBlob.name);
    }

    if (this.removerLogo) {
      formData.append('removerLogo', 'true');
    }

    // Adiciona o ID do usuário logado
    const usuarioId = this.authService.getJwtId();
    if (usuarioId) {
      formData.append('usuarioId', String(usuarioId));
    }

    return formData;
  }


  buscarEnderecoPorCep(): void {
    const cep = this.form.get('enderecoRequest.cep')?.value;
    if (!cep) return;

    this.cepUtilService.buscarEndereco(cep).subscribe((dados: EnderecoViaCep | null) => {
      if (!dados) {
        this.toastr.warning('CEP não encontrado');
        return;
      }

      this.form.patchValue({
        enderecoRequest: {
          logradouro: dados.logradouro || '',
          bairro: dados.bairro || '',
          cidade: dados.localidade || '',
          estado: dados.uf || ''
        }
      });
    });
  }

  preencherEnderecoViaCep(dados: EnderecoViaCep | null): void {
    if (!dados) return;
    this.form.patchValue({
      enderecoRequest: {
        logradouro: dados.logradouro || '',
        bairro: dados.bairro || '',
        cidade: dados.localidade || '',
        estado: dados.uf || ''
      }
    });
  }

  private validarFavicon(file: File): boolean {
    const tiposPermitidos = ['image/png', 'image/svg+xml', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon'];
    const nomeValido = /\.(png|svg|webp|ico)$/i.test(file.name);

    if (!tiposPermitidos.includes(file.type) && !nomeValido) {
      this.faviconErro = 'Formato inválido. Use PNG, SVG, WEBP ou ICO.';
      this.limparFaviconSelecionado(false);
      return false;
    }

    if (file.size > 1024 * 1024) {
      this.faviconErro = 'O favicon deve ter até 1 MB.';
      this.limparFaviconSelecionado(false);
      return false;
    }

    return true;
  }

  private limparFaviconSelecionado(limparErro = true): void {
    this.faviconSelecionado = null;
    this.faviconPreviewUrl = '';
    this.faviconArquivoNome = '';
    this.faviconArquivoTamanho = '';
    if (limparErro) {
      this.faviconErro = '';
    }
  }

  private limparInputArquivo(input?: HTMLInputElement | null): void {
    if (input) {
      input.value = '';
    }
  }

  private formatarTamanho(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
      return '';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Getters para inputs reutilizáveis
  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }
  get telefoneControl(): FormControl {
    return this.form.get('telefone') as FormControl;
  }
  get emailControl(): FormControl {
    return this.form.get('email') as FormControl;
  }
  get cnpjControl(): FormControl {
    return this.form.get('cnpj') as FormControl;
  }
  get inscricaoEstadualControl(): FormControl {
    return this.form.get('inscricaoEstadual') as FormControl;
  }
  get horarioControl(): FormControl {
    return this.form.get('horario') as FormControl;
  }
  get instagramUrlControl(): FormControl {
    return this.form.get('instagramUrl') as FormControl;
  }
  get facebookUrlControl(): FormControl {
    return this.form.get('facebookUrl') as FormControl;
  }
  get siteUrlControl(): FormControl {
    return this.form.get('siteUrl') as FormControl;
  }
  get youtubeUrlControl(): FormControl {
    return this.form.get('youtubeUrl') as FormControl;
  }
  get logoControl(): FormControl {
    return this.form.get('logo') as FormControl;
  }

  get cepControl(): FormControl {
    return this.form.get('enderecoRequest.cep') as FormControl;
  }
  get logradouroControl(): FormControl {
    return this.form.get('enderecoRequest.logradouro') as FormControl;
  }
  get numeroControl(): FormControl {
    return this.form.get('enderecoRequest.numero') as FormControl;
  }
  get complementoControl(): FormControl {
    return this.form.get('enderecoRequest.complemento') as FormControl;
  }
  get bairroControl(): FormControl {
    return this.form.get('enderecoRequest.bairro') as FormControl;
  }
  get cidadeControl(): FormControl {
    return this.form.get('enderecoRequest.cidade') as FormControl;
  }
  get estadoControl(): FormControl {
    return this.form.get('enderecoRequest.estado') as FormControl;
  }

}
