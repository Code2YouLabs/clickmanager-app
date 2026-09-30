import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { ToastrService } from 'ngx-toastr';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { InputTextoRestritoComponent } from 'src/app/components/inputs/input-texto/input-texto-restrito.component';
import { MaterialModule } from 'src/app/material.module';
import {
  ChamadoSuporteCategoria,
  ChamadoSuporteDetalhe,
  ChamadoSuportePrioridade,
  CriarChamadoSuporteRequest
} from '../models/chamado-suporte.model';
import { SuporteService } from '../services/suporte.service';

@Component({
  selector: 'app-chamado-suporte-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MaterialModule,
    InputTextoRestritoComponent,
    InputOptionsComponent,
    InputTextareaComponent
  ],
  templateUrl: './chamado-suporte-dialog.component.html',
  styleUrl: './chamado-suporte-dialog.component.scss'
})
export class ChamadoSuporteDialogComponent {
  salvando = false;

  readonly categorias: Array<{ value: ChamadoSuporteCategoria; label: string }> = [
    { value: 'DUVIDA', label: 'Dúvida' },
    { value: 'ERRO', label: 'Erro' },
    { value: 'FINANCEIRO', label: 'Financeiro' },
    { value: 'SUGESTAO', label: 'Sugestão' },
    { value: 'ACESSO', label: 'Acesso' },
    { value: 'OUTRO', label: 'Outro' }
  ];

  readonly prioridades: Array<{ value: ChamadoSuportePrioridade; label: string }> = [
    { value: 'BAIXA', label: 'Baixa' },
    { value: 'MEDIA', label: 'Média' },
    { value: 'ALTA', label: 'Alta' },
    { value: 'URGENTE', label: 'Urgente' }
  ];

  readonly form = this.fb.group({
    assunto: ['', [Validators.required, Validators.maxLength(160)]],
    categoria: ['DUVIDA' as ChamadoSuporteCategoria, [Validators.required]],
    prioridade: ['MEDIA' as ChamadoSuportePrioridade, [Validators.required]],
    mensagem: ['', [Validators.required, Validators.maxLength(3000)]]
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly dialogRef: MatDialogRef<ChamadoSuporteDialogComponent>,
    private readonly suporteService: SuporteService,
    private readonly toastr: ToastrService
  ) {}

  cancelar(): void {
    if (this.salvando) return;
    this.dialogRef.close(null);
  }

  salvar(): void {
    if (this.salvando) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const payload: CriarChamadoSuporteRequest = {
      assunto: String(raw.assunto || '').trim(),
      categoria: (raw.categoria || 'DUVIDA') as ChamadoSuporteCategoria,
      prioridade: (raw.prioridade || 'MEDIA') as ChamadoSuportePrioridade,
      mensagem: String(raw.mensagem || '').trim()
    };

    this.salvando = true;
    this.suporteService.criar$(payload).subscribe({
      next: (chamado: ChamadoSuporteDetalhe) => {
        this.salvando = false;
        this.toastr.success('Chamado aberto com sucesso.');
        this.dialogRef.close(chamado);
      },
      error: (err) => {
        this.salvando = false;
        this.toastr.error(err?.userMessage || 'Não foi possível abrir o chamado.');
      }
    });
  }

  get assuntoControl(): FormControl<string | null> {
    return this.form.controls.assunto;
  }

  get categoriaControl(): FormControl<ChamadoSuporteCategoria | null> {
    return this.form.controls.categoria;
  }

  get prioridadeControl(): FormControl<ChamadoSuportePrioridade | null> {
    return this.form.controls.prioridade;
  }

  get mensagemControl(): FormControl<string | null> {
    return this.form.controls.mensagem;
  }
}
