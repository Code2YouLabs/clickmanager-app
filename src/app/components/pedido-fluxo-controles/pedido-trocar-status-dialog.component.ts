import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, OnInit, Optional } from '@angular/core';
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
import { ResponsiveConfirmationService } from '../dialog/confirm-dialog/responsive-confirmation.service';
import { Subscription } from 'rxjs';

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
export class PedidoTrocarStatusDialogComponent implements OnInit, AfterViewInit, OnDestroy {
  private static nextId = 0;
  readonly messageId = `order-status-selection-${PedidoTrocarStatusDialogComponent.nextId++}`;
  private presentation?: Subscription;
  mobile = false;
  control = new FormControl<string | null>(null);

  constructor(
    private dialogRef: MatDialogRef<PedidoTrocarStatusDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { statusAtual: string; statusAtualLabel?: string; statusDestino?: string | null; opcoes: DialogOpcao[]; cancelamentoSeparado?: boolean; selectionOnly?: boolean },
    @Optional() private readonly presentationService?: ResponsiveConfirmationService,
    @Optional() private readonly element?: ElementRef<HTMLElement>,
  ) {
    const statusInicial = data.statusDestino || (data.opcoes || []).find(o => !o.bloqueado &&
      (!data.cancelamentoSeparado || classificarTransicaoPedido(o.status) !== 'cancelamento'))?.status || null;
    this.control.setValue(statusInicial);
  }

  ngOnInit(): void {
    if (this.data.selectionOnly && this.element) this.presentation = this.presentationService?.attach(this.dialogRef, this.element.nativeElement,
      { title: 'Selecionar novo status', message: this.statusAtualLabel, details: this.data.opcoes.map(opcao => ({ label: opcao.status, value: opcao.label })) }, mobile => this.mobile = mobile);
  }
  ngAfterViewInit(): void { if (this.data.selectionOnly && this.element) this.presentationService?.describe(this.element.nativeElement, this.messageId); }
  ngOnDestroy(): void { this.presentation?.unsubscribe(); }

  get statusAtualLabel(): string {
    return this.data.statusAtualLabel || this.labelStatus(this.data.statusAtual);
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
