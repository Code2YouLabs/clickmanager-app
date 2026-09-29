import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { InputEmailComponent } from 'src/app/components/inputs/input-email/input-custom.component';
import { InputTextareaComponent } from 'src/app/components/inputs/input-textarea/input-textarea.component';
import { MatButtonModule } from '@angular/material/button';

export interface EmailTesteDialogData {
  emailDestino: string;
  mensagemPadrao: string;
}

@Component({
  selector: 'app-email-servidor-teste-dialog',
  standalone: true,
  templateUrl: './email-servidor-teste-dialog.component.html',
  styleUrls: ['./email-servidor-teste-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    InputEmailComponent,
    InputTextareaComponent,
    MatButtonModule
  ]
})
export class EmailServidorTesteDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EmailServidorTesteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmailTesteDialogData,
  ) {
    this.form = this.fb.group({
      emailDestino: [data.emailDestino || '', [Validators.required, Validators.email]],
      mensagem: [data.mensagemPadrao || '', [Validators.required, Validators.minLength(5)]],
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.dialogRef.close(this.form.value);
  }

  get emailControl() {
    return this.form.get('emailDestino') as FormControl;
  }

  get mensagemControl() {
    return this.form.get('mensagem') as FormControl;
  }
}
