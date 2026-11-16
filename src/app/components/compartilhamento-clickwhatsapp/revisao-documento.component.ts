import { ToastrService } from 'ngx-toastr';
import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { CompartilhamentoClickWhatsAppComponent } from './compartilhamento-clickwhatsapp.component';

@Component({
  standalone: true,
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, CompartilhamentoClickWhatsAppComponent],
  templateUrl: './revisao-documento.component.html',
  styleUrl: './revisao-documento.component.scss',
})
export class RevisaoDocumentoComponent {
  private readonly toast = inject(ToastrService);
  readonly dados = inject<{ endpoint: string; numero: string; texto: string }>(MAT_DIALOG_DATA);
  bloqueado = false;
  readonly mensagem = new FormControl(this.dados.texto, { nonNullable: true });
  copiar() {
    navigator.clipboard.writeText(this.mensagem.value)
      .then(() => this.toast.success('Mensagem copiada!'))
      .catch(() => this.toast.error('Não foi possível copiar.'));
  }
  manual(revisado?: { numero: string; texto: string }) {
    const numero = revisado?.numero ?? this.dados.numero;
    const texto = revisado?.texto ?? this.mensagem.value;
    if (/^\+?[1-9]\d{7,14}$/.test(numero)) window.open('https://wa.me/' + numero.replace(/^\+/, '') + '?text=' + encodeURIComponent(texto), '_blank', 'noopener,noreferrer');
  }
}
