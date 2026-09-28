import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-input-password', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule],
  templateUrl: './input-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InputPasswordComponent implements OnInit {
  @Input() control!: FormControl;
  @Input() label = 'Senha';
  @Input() placeholder = 'Digite a senha';
  @Input() autocomplete = 'new-password';
  @Input() requiredError = 'Campo obrigatório';
  hide = true;
  ngOnInit(): void {
    if (!this.control) throw new Error('FormControl é obrigatório para <app-input-password>');
  }
  get isRequired(): boolean { return this.control.hasValidator(Validators.required); }
  errorMessage(): string {
    if (this.control.hasError('required')) return this.requiredError;
    if (this.control.hasError('minlength')) return `Mínimo de ${this.control.getError('minlength').requiredLength} caracteres`;
    if (this.control.hasError('maxlength')) return `Máximo de ${this.control.getError('maxlength').requiredLength} caracteres`;
    return 'Valor inválido';
  }
}
