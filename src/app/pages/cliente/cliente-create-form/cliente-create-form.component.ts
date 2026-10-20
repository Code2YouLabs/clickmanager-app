import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, ElementRef, inject, AfterViewInit, ViewChildren, QueryList, DestroyRef, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { InputCepComponent } from 'src/app/components/inputs/input-cep/input-cep.component';
import { InputDocumentoComponent } from 'src/app/components/inputs/input-documento/input-documento.component';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputTelefoneComponent } from 'src/app/components/inputs/input-telefone/input-telefone.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { MaterialModule } from 'src/app/material.module';
import { EnderecoViaCep } from 'src/app/models/endereco/endereco.viacep.model';
import { ClienteRequest } from 'src/app/models/cliente/cliente-request.model';
import { ClienteResponse } from 'src/app/models/cliente/cliente-response.model';
import { extrairMensagemErro } from 'src/app/utils/mensagem.util';
import { ClienteService } from '../cliente.service';

export interface ClienteCreateInitialValue {
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
  documento?: string | null;
  endereco?: Partial<ClienteRequest['endereco']> | null;
}

@Component({
  selector: 'app-cliente-create-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MaterialModule,
    InputCepComponent,
    InputDocumentoComponent,
    InputEmailComponent,
    InputTelefoneComponent,
    InputTextoRestritoComponent,
  ],
  templateUrl: './cliente-create-form.component.html',
  styleUrl: './cliente-create-form.component.scss',
  host: { '[class.cliente-create-form--quick]': 'quickMobile' },
})
export class ClienteCreateFormComponent implements AfterViewInit {
  private readonly element = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly mobile = toSignal(inject(BreakpointObserver).observe(MOBILE_FOUNDATION_QUERY)
    .pipe(map(state => state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches)), { initialValue: false });
  @ViewChildren('clientField', { read: ChangeDetectorRef }) private fieldViews!: QueryList<ChangeDetectorRef>;
  private readonly destroyRef = inject(DestroyRef);
  @Input() mobileMode: 'quick' | 'full' = 'full';
  @Input() formId = 'novo-cliente-dialog-form';
  @Input() set initialValue(value: ClienteCreateInitialValue | null | undefined) {
    if (value) this.form.patchValue({ nome: value.nome || '', telefone: value.telefone || '', email: value.email || '',
      ...(value.documento != null ? { documento: value.documento } : {}), ...(value.endereco ? { endereco: value.endereco } : {}) });
  }
  @Output() valueChange = new EventEmitter<ClienteRequest>();
  @Output() created = new EventEmitter<ClienteResponse>();
  @Output() cancelled = new EventEmitter<void>();
  @Output() savingChange = new EventEmitter<boolean>();
  additionalExpanded = false;
  get quickMobile(): boolean { return this.mobileMode === 'quick' && this.mobile(); }
  salvando = false;
  readonly form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly clienteService: ClienteService,
    private readonly toastr: ToastrService,
  ) {
    this.form = this.fb.group({
      nome: ['', [Validators.required, Validators.minLength(2)]],
      telefone: ['', [Validators.required, Validators.minLength(10)]],
      email: ['', [Validators.email]],
      documento: [''],
      endereco: this.fb.group({
        cep: [''],
        logradouro: [''],
        numero: [''],
        complemento: [''],
        bairro: [''],
        cidade: [''],
        estado: [''],
      }),
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.valueChange.emit(this.form.getRawValue()));
  }

  ngAfterViewInit(): void {
    this.linkInputLabels();
    this.fieldViews.changes.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.linkInputLabels());
  }

  private linkInputLabels(): void {
    if (!this.quickMobile) return;
    // Existing inputs render their labels outside mat-form-field. Link them locally.
    this.element.nativeElement.querySelectorAll<HTMLElement>('[data-client-field]').forEach(field => {
      const input = field.querySelector<HTMLInputElement>('input');
      const label = field.querySelector<HTMLElement>('mat-label');
      if (!input || !label) return;
      label.id = `${input.id}-label`;
      input.setAttribute('aria-labelledby', label.id);
    });
  }

  get nomeControl(): FormControl {
    return this.form.get('nome') as FormControl;
  }

  get telefoneControl(): FormControl {
    return this.form.get('telefone') as FormControl;
  }

  get emailControl(): FormControl {
    return this.form.get('email') as FormControl;
  }

  get documentoControl(): FormControl {
    return this.form.get('documento') as FormControl;
  }

  get enderecoGroup(): FormGroup {
    return this.form.get('endereco') as FormGroup;
  }

  get cepControl(): FormControl {
    return this.enderecoGroup.get('cep') as FormControl;
  }

  get logradouroControl(): FormControl {
    return this.enderecoGroup.get('logradouro') as FormControl;
  }

  get numeroControl(): FormControl {
    return this.enderecoGroup.get('numero') as FormControl;
  }

  get bairroControl(): FormControl {
    return this.enderecoGroup.get('bairro') as FormControl;
  }

  get cidadeControl(): FormControl {
    return this.enderecoGroup.get('cidade') as FormControl;
  }

  get estadoControl(): FormControl {
    return this.enderecoGroup.get('estado') as FormControl;
  }

  get complementoControl(): FormControl {
    return this.enderecoGroup.get('complemento') as FormControl;
  }

  onEnderecoEncontrado(endereco: EnderecoViaCep | null): void {
    if (!endereco) {
      return;
    }

    this.enderecoGroup.patchValue({
      logradouro: endereco.logradouro || '',
      bairro: endereco.bairro || '',
      cidade: endereco.localidade || '',
      estado: endereco.uf || '',
    });
  }

  cancelar(): void {
    if (!this.salvando) this.cancelled.emit();
  }

  toggleAdditional(): void {
    if (this.additionalExpanded && (this.documentoControl.invalid && this.documentoControl.touched
      || this.enderecoGroup.invalid && this.enderecoGroup.touched)) {
      this.focusFirstInvalid();
      return;
    }
    this.additionalExpanded = !this.additionalExpanded;
  }

  private focusFirstInvalid(): void {
    if (!this.quickMobile) return;
    if (this.documentoControl.invalid || this.enderecoGroup.invalid) this.additionalExpanded = true;
    // Touching controls alone does not refresh the existing OnPush input components.
    this.fieldViews.forEach(view => view.markForCheck());
    this.cdr.detectChanges();
    const fields = ['nome', 'telefone', 'email', 'documento', ...['cep', 'logradouro', 'numero', 'bairro', 'cidade', 'estado', 'complemento'].map(key => `endereco.${key}`)];
    const first = fields.find(path => this.form.get(path)?.invalid);
    const input = this.element.nativeElement.querySelector<HTMLInputElement>(`[data-client-field="${first}"] input`);
    input?.focus({ preventScroll: true });
    input?.scrollIntoView({ block: 'nearest' });
  }

  salvar(): void {
    if (this.salvando) return;
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.focusFirstInvalid();
      return;
    }

    const value = this.form.getRawValue();
    const payload: ClienteRequest = {
      nome: String(value.nome || '').trim(),
      telefone: String(value.telefone || '').replace(/\D/g, ''),
      email: value.email?.trim() || null,
      documento: value.documento?.trim() || null,
      endereco: value.endereco as ClienteRequest['endereco'],
    };

    this.salvando = true;
    this.savingChange.emit(true);
    this.clienteService.salvar(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (cliente) => {
        this.salvando = false;
        this.savingChange.emit(false);
        this.toastr.success('Cliente cadastrado com sucesso.');
        this.created.emit(cliente);
      },
      error: (err) => {
        this.salvando = false;
        this.savingChange.emit(false);
        this.toastr.error(extrairMensagemErro(err, 'Não foi possível cadastrar o cliente.'));
      },
    });
  }
}
