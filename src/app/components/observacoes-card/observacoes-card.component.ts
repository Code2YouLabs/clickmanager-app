import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { SectionCardComponent } from '../section-card/section-card.component';
import { InputTextareaComponent } from '../inputs/input-textarea/input-textarea.component';

@Component({
  selector: 'app-observacoes-card',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, SectionCardComponent, InputTextareaComponent, MatDialogModule],
  templateUrl: './observacoes-card.component.html',
  styleUrls: ['./observacoes-card.component.scss'],
  host: { '[class.observacoes-panel-editor]': 'panelEditor' }
})
export class ObservacoesCardComponent implements OnChanges {
  @Input() panelEditor = false;
  @Output() aplicarTexto = new EventEmitter<string>();
  @Output() fecharEditor = new EventEmitter<void>();
  aplicarEdicao(): void {
    if (!this.panelEditor || this.salvando || this.inativo) return;
    if (this.control.invalid || this.control.pending) { this.control.markAsTouched(); return; }
    this.aplicarTexto.emit(this.control.value ?? '');
  }
  @Input() mobileCompact = false;
  @Input() titulo = 'Observações';
  @Input() renderCard = true;
  @Input() divider = true;
  @Input({ required: true }) control!: FormControl<string>;
  @Input() label = 'Observações';
  @Input() placeholder = 'Anotações sobre o pedido';
  @Input() textoSalvo = '';
  @Input() salvando = false;
  @Input() salvo = false;
  @Input() emptyMessage = 'Nenhuma observação cadastrada.';
  @Input() inativo = false;

  @Output() salvar = new EventEmitter<void>();

  editando = false;

  get hasTexto(): boolean {
    return !!((this.control?.value ?? '').toString().trim());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['textoSalvo']) {
      // sempre colapsa quando o texto salvo mudar (mostra modo visual)
      this.editando = false;
    }
  }

  editar(): void {
    this.editando = true;
    this.salvo = false;
  }

  cancelar(): void {
    this.control.setValue(this.textoSalvo ?? '', { emitEvent: false });
    this.editando = false;
  }

  iniciarEdicao(): void {
    this.editando = true;
  }

  onSalvar(): void {
    if (!this.hasTexto || this.salvando) return;
    this.textoSalvo = (this.control?.value ?? '').toString();
    this.editando = false;
    this.salvo = true;
    this.salvar.emit();
  }
}
