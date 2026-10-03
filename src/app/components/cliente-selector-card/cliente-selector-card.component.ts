import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Observable } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SectionCardComponent } from '../section-card/section-card.component';
import { AutoCompleteComponent } from '../inputs/auto-complete/auto-complete.component';
import { TelefonePipe } from 'src/app/pipe/telefone.pipe';

@Component({
  selector: 'app-cliente-selector-card',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    SectionCardComponent,
    AutoCompleteComponent,
    TelefonePipe
  ],
  templateUrl: './cliente-selector-card.component.html',
  styleUrls: ['./cliente-selector-card.component.scss']
})
export class ClienteSelectorCardComponent {

  @Input({ required: true }) control!: FormControl;
  @Input({ required: true }) buscarFn!: (termo: string) => Observable<any[]>;
  @Input({ required: true }) displayWith!: (item: any) => string;

  @Input() minimoCaracteres = 3;
  @Input() multiplo = false;
  @Input() label = 'Selecionar cliente';
  @Input() titulo = 'Dados do cliente';
  @Input() divider = true;
  @Input() renderCard = true;
  @Input() cliente: any | null = null;
  @Input() editando = false;
  @Input() salvando = false;
  @Input() emptyMessage = 'Nenhum cliente definido para este pedido.';
  @Input() showEmptyAlert = true;
  @Input() inativo = false;
  @Input() permitirCriarCliente = true;

  @Output() editarCliente = new EventEmitter<void>();
  @Output() cancelarEdicao = new EventEmitter<void>();
  @Output() salvarCliente = new EventEmitter<void>();
  @Output() criarCliente = new EventEmitter<void>();

  onCriarCliente(): void {
    this.criarCliente.emit();
  }

  onEditarCliente(): void {
    this.editarCliente.emit();
  }

  onCancelarEdicao(): void {
    this.cancelarEdicao.emit();
  }

  onSalvarCliente(): void {
    this.salvarCliente.emit();
  }

  formatarEndereco(cliente: any): string {
    const e = cliente?.endereco;
    if (!e) return '-';
    const rua = [e.logradouro, e.numero].filter(Boolean).join(', ');
    const bairro = e.bairro || '-';
    const cidadeUf = [e.cidade, e.estado].filter(Boolean).join(' / ') || '-';
    const cep = e.cep || '-';
    const compl = e.complemento || '';
    return [rua || '-', bairro, cidadeUf, cep, compl].filter(Boolean).join(' • ');
  }
}
