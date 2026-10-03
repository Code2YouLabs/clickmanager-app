import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
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

export type ClienteCreateDialogData = {
  nome?: string | null;
  telefone?: string | null;
  email?: string | null;
};

@Component({
  selector: 'app-cliente-create-dialog',
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
  templateUrl: './cliente-create-dialog.component.html',
  styleUrl: './cliente-create-dialog.component.scss',
})
export class ClienteCreateDialogComponent {
  salvando = false;
  readonly form: FormGroup;

  constructor(
    private readonly fb: FormBuilder,
    private readonly clienteService: ClienteService,
    private readonly toastr: ToastrService,
    private readonly dialogRef: MatDialogRef<ClienteCreateDialogComponent, ClienteResponse | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: ClienteCreateDialogData | null,
  ) {
    this.form = this.fb.group({
      nome: [this.data?.nome || '', [Validators.required, Validators.minLength(2)]],
      telefone: [this.data?.telefone || '', [Validators.required, Validators.minLength(10)]],
      email: [this.data?.email || '', [Validators.email]],
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
    this.dialogRef.close(null);
  }

  salvar(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.salvando) {
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
    this.clienteService.salvar(payload).subscribe({
      next: (cliente) => {
        this.salvando = false;
        this.toastr.success('Cliente cadastrado com sucesso.');
        this.dialogRef.close(cliente);
      },
      error: (err) => {
        this.salvando = false;
        this.toastr.error(extrairMensagemErro(err, 'Não foi possível cadastrar o cliente.'));
      },
    });
  }
}
