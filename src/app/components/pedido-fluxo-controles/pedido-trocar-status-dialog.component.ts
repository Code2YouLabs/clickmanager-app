import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { StatusLabelPipe } from 'src/app/pipes/status-label.pipe';

interface DialogOpcao {
  status: string;
  label: string;
  bloqueado?: boolean;
  motivo?: string;
}

@Component({
  selector: 'app-pedido-trocar-status-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatOptionModule,
    MatDividerModule,
    MatIconModule,
    ReactiveFormsModule,
    StatusLabelPipe
  ],
  templateUrl: './pedido-trocar-status-dialog.component.html',
  styleUrls: ['./pedido-trocar-status-dialog.component.scss']
})
export class PedidoTrocarStatusDialogComponent {
  control = new FormControl<string | null>(null);

  constructor(
    private dialogRef: MatDialogRef<PedidoTrocarStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { statusAtual: string; statusDestino?: string | null; opcoes: DialogOpcao[] }
  ) {
    const statusInicial = data.statusDestino || (data.opcoes || []).find(o => !o.bloqueado)?.status || null;
    this.control.setValue(statusInicial);
  }

  get statusAtualLabel(): string {
    return this.labelStatus(this.data.statusAtual);
  }

  get statusSelecionadoLabel(): string {
    return this.labelStatus(this.control.value);
  }

  get selecaoTravada(): boolean {
    return !!this.data.statusDestino;
  }

  salvar(): void {
    this.dialogRef.close({ status: this.control.value });
  }

  cancelar(): void {
    this.dialogRef.close(null);
  }

  private labelStatus(status: string | null | undefined): string {
    if (!status) return '—';
    const opcao = (this.data.opcoes || []).find(o => o.status === status);
    if (opcao?.label) return opcao.label;

    const normalized = status.replace(/_/g, ' ').toLowerCase();
    return normalized.replace(/\b\w/g, c => c.toUpperCase());
  }
}
