import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, Subscription, finalize, takeUntil } from 'rxjs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PageFormState } from 'src/app/components/page-card/page-form-state';
import { PageCardComponent, PageCardAction } from 'src/app/components/page-card/page-card.component';
import { SectionCardComponent } from 'src/app/components/section-card/section-card.component';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { ClienteRequest } from 'src/app/models/cliente/cliente-request.model';
import { ClienteService } from '../cliente.service';
import { InputTextoRestritoComponent } from "../../../components/inputs/input-texto/input-texto-restrito.component";
import { InputTelefoneComponent } from "../../../components/inputs/input-telefone/input-telefone.component";
import { InputEmailComponent } from "../../../components/inputs/input-email/input-custom.component";
import { InputDocumentoComponent } from "../../../components/inputs/input-documento/input-documento.component";
import { EnderecoFormComponent } from 'src/app/components/endereco-form/endereco-form.component';
import { extrairMensagemErro } from 'src/app/utils/mensagem.util';
import { InputCepComponent } from "../../../components/inputs/input-cep/input-cep.component";
import { EnderecoViaCep } from 'src/app/models/endereco/endereco.viacep.model';
import { MobileTotalBarComponent } from "../../../components/mobile-total-bar/mobile-total-bar.component";

@Component({
  selector: 'app-form-cliente',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    PageCardComponent,
    SectionCardComponent,
    MatProgressSpinnerModule,
    MatButtonModule,
    InputTextoRestritoComponent,
    InputTelefoneComponent,
    InputEmailComponent,
    EnderecoFormComponent,
    InputDocumentoComponent,
    InputCepComponent,
    MatIconModule,
    MobileTotalBarComponent
],
  templateUrl: './form-cliente.component.html',
  styleUrls: ['./form-cliente.component.scss']
})
export class FormClienteComponent implements OnInit, AfterViewInit, OnDestroy {
  form!: FormGroup;
  readonly formState = new PageFormState(() => this.form);
  isEditMode = false;
  clienteId?: number;
  retorno: string | null = null;
  isMobileView = false;
  mobileStep = 0;
  carregando = false;
  erro: string | null = null;
  semPermissao = false;
  saving = false;
  private consulta?: Subscription;
  private focusTimer?: ReturnType<typeof setTimeout>;
  private readonly destroy$ = new Subject<void>();

  get pronto(): boolean { return !this.carregando && !this.erro && !this.semPermissao; }

  get footerActions(): PageCardAction[] {
    if (!this.pronto) return [];
    return [
      { id: 'salvar', label: this.isEditMode ? 'Atualizar' : 'Salvar', type: 'submit', form: 'cliente-form', primary: true, disabled: this.form.invalid, pendingLabel: 'Salvando...' }
    ];
  }

  ngOnDestroy(): void {
    this.consulta?.unsubscribe();
    clearTimeout(this.focusTimer);
    this.destroy$.next();
    this.destroy$.complete();
  }


  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private toastr: ToastrService,
    private router: Router,
    private route: ActivatedRoute,
    private host: ElementRef<HTMLElement>
  ) { }

  ngOnInit(): void {
    this.atualizarViewport();
    this.inicializarFormulario();
    this.verificarModoEdicao();

    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.retorno = params.get('retorno');
    });
    
  }

  ngAfterViewInit(): void {
    this.focusCampoAtualMobile();
  }

  @HostListener('window:resize')
  onWindowResize(): void {
    const wasMobile = this.isMobileView;
    this.atualizarViewport();
    if (wasMobile !== this.isMobileView) this.focusCampoAtualMobile();
  }

  private inicializarFormulario(): void {
    this.form = this.fb.group({
      nome: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telefone: ['', Validators.required],
      documento: [''],
      endereco: this.fb.group({
        cep: [''],
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        cidade: [''],
        estado: [''],
      })
    });
  }

  private atualizarViewport(): void {
    this.isMobileView = (globalThis?.innerWidth ?? 0) <= 900;
  }

  private verificarModoEdicao(): void {
    this.route.paramMap.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.consulta?.unsubscribe();
      const id = params.get('id');
      this.isEditMode = !!id;
      this.clienteId = id ? Number(id) : undefined;
      this.mobileStep = 0;
      this.erro = null;
      this.semPermissao = false;
      this.carregando = false;
      this.form.reset({ nome: '', email: '', telefone: '', documento: '',
        endereco: { cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '' } });
      this.formState.begin(this.isEditMode ? 'edit' : 'create');
      if (this.isEditMode) this.carregarCliente();
    });
  }

  carregarCliente(): void {
    this.consulta?.unsubscribe();
    this.erro = null;
    this.semPermissao = false;
    if (!this.clienteId || !Number.isFinite(this.clienteId)) {
      this.erro = 'ID do cliente inválido.';
      return;
    }
    this.carregando = true;
    this.consulta = this.clienteService.buscarPorId(this.clienteId).subscribe({
      next: cliente => {
        this.form.patchValue(cliente);
        this.formState.loaded();
        this.carregando = false;
        this.focusCampoAtualMobile();
      },
      error: err => {
        this.carregando = false;
        this.semPermissao = err.status === 403;
        this.erro = this.semPermissao ? null : extrairMensagemErro(err, 'Erro ao carregar cliente.');
      }
    });
  }

  onSubmit(): void {
    if (this.saving || !this.pronto) return;
    if (this.isMobileView && this.mobileStep === 0) {
      this.avancarMobile();
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.isEditMode && !this.clienteId) {
      this.toastr.error('ID do cliente inválido.');
      return;
    }
    const cliente: ClienteRequest = this.form.value;
    const destino = this.retorno ?? '/page/cliente';
    this.saving = true;
    const request = this.isEditMode
      ? this.clienteService.atualizar(this.clienteId!, cliente)
      : this.clienteService.salvar(cliente);
    request.pipe(takeUntil(this.destroy$), finalize(() => this.saving = false)).subscribe({
      next: () => {
        this.toastr.success(this.isEditMode ? 'Cliente atualizado com sucesso!' : 'Cliente cadastrado com sucesso!');
        this.router.navigate([destino]);
      },
      error: err => this.toastr.error(extrairMensagemErro(err,
        this.isEditMode ? 'Erro ao atualizar cliente.' : 'Erro ao cadastrar cliente.'))
    });
  }

  setEnderecoGroup(group: FormGroup): void {
    group.patchValue(this.enderecoGroup.value, { emitEvent: false });
    this.form.setControl('endereco', group);
  }

  avancarMobile(): void {
    if (!this.isMobileView || !this.pronto || this.saving) return;

    if (this.mobileStep === 0) {
      if (this.dadosBasicosInvalidos()) {
        this.marcarDadosBasicosComoTouched();
        return;
      }

      this.mobileStep = 1;
      this.focusCampoAtualMobile();
      return;
    }

    this.onSubmit();
  }

  voltarMobile(): void {
    if (!this.isMobileView || this.mobileStep === 0 || this.saving) return;
    this.mobileStep = 0;
    this.focusCampoAtualMobile();
  }

  salvarMobile(): void {
    this.onSubmit();
  }

  onEnderecoEncontradoMobile(endereco: EnderecoViaCep | null): void {
    if (!endereco) return;
    this.enderecoGroup.patchValue({
      logradouro: endereco.logradouro || '',
      bairro: endereco.bairro || '',
      cidade: endereco.localidade || '',
      estado: endereco.uf || ''
    });
  }

  progressoMobilePercentual(): number {
    return this.mobileStep === 0 ? 50 : 100;
  }

  get mobileFooterLabel(): string {
    if (this.saving) return 'Salvando...';
    return this.mobileStep === 0 ? 'Continuar →' : (this.isEditMode ? 'Salvar alterações' : 'Salvar cliente');
  }

  get mobileFooterValue(): string {
    return this.mobileStep === 0 ? 'Endereço' : 'Salvar cliente';
  }

  get mobileFooterDetail(): string {
    return '';
  }

  get mobileStepTitle(): string {
    return this.mobileStep === 0 ? 'Dados básicos' : 'Endereço';
  }

  get enderecoGroup(): FormGroup {
    return this.form.get('endereco') as FormGroup;
  }

  get podeAvancarMobile(): boolean {
    return this.mobileStep === 0 ? !this.dadosBasicosInvalidos() : this.form.valid;
  }

  private dadosBasicosInvalidos(): boolean {
    return this.nomeControl.invalid || this.telefoneControl.invalid || this.emailControl.invalid;
  }

  private marcarDadosBasicosComoTouched(): void {
    this.nomeControl.markAsTouched();
    this.telefoneControl.markAsTouched();
    this.emailControl.markAsTouched();
    this.documentoControl.markAsTouched();
  }

  private focusCampoAtualMobile(): void {
    if (!this.isMobileView || !this.pronto || this.saving) return;

    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      const selector = this.mobileStep === 0
        ? '.cliente-mobile-form app-input-texto-restrito input'
        : '.cliente-mobile-form app-input-cep input';
      const el = this.host.nativeElement.querySelector<HTMLInputElement>(selector);
      el?.focus();
    }, 80);
  }

  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }

  get emailControl(): FormControl {
    return this.form.get('email') as FormControl;
  }

  get telefoneControl(): FormControl {
    return this.form.get('telefone') as FormControl;
  }

  get documentoControl(): FormControl {
    return this.form.get('documento') as FormControl;
  }

  get cepControl() {
    return this.form.get('endereco.cep') as FormControl;
  }
  
  get logradouroControl() {
    return this.form.get('endereco.logradouro') as FormControl;
  }
  
  get numeroControl() {
    return this.form.get('endereco.numero') as FormControl;
  }
  
  get complementoControl() {
    return this.form.get('endereco.complemento') as FormControl;
  }
  
  get bairroControl() {
    return this.form.get('endereco.bairro') as FormControl;
  }
  
  get cidadeControl() {
    return this.form.get('endereco.cidade') as FormControl;
  }
  
  get estadoControl() {
    return this.form.get('endereco.estado') as FormControl;
  }

}
