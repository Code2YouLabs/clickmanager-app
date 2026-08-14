import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NgxMaskDirective } from 'ngx-mask';
import { ToastrService } from 'ngx-toastr';
import { MaterialModule } from 'src/app/material.module';
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
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, NgxMaskDirective],
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
