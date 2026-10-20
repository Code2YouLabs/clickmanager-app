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
import { classificarTransicaoPedido } from './pedido-transicao-apresentacao';

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
    @Inject(MAT_DIALOG_DATA) public data: { statusAtual: string; statusDestino?: string | null; opcoes: DialogOpcao[]; cancelamentoSeparado?: boolean }
  ) {
    const statusInicial = data.statusDestino || (data.opcoes || []).find(o => !o.bloqueado &&
      (!data.cancelamentoSeparado || classificarTransicaoPedido(o.status) !== 'cancelamento'))?.status || null;
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
    if (this.encaminharCancelamento()) return;
    this.dialogRef.close({ status: this.control.value });
  }

  encaminharCancelamento(): boolean {
    if (!this.data.cancelamentoSeparado || !this.control.value || classificarTransicaoPedido(this.control.value) !== 'cancelamento') return false;
    this.dialogRef.close({ status: this.control.value }); return true;
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
