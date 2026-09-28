import { CommonModule } from '@angular/common';
import { Component, Inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { ToastrService } from 'ngx-toastr';
import { InputOptionsComponent } from 'src/app/components/inputs/input-options/input-options.component';
import { Perfil } from 'src/app/models/perfil.model';
import { Usuario } from 'src/app/models/usuario/usuario.model';

interface TrocarPerfilDialogData {
  usuario: Usuario;
  perfis: Perfil[];
}

@Component({
  selector: 'app-trocar-perfil-dialog',
  standalone: true,
  templateUrl: './trocar-perfil-dialog.component.html',
  styleUrls: ['./trocar-perfil-dialog.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatButtonModule, MatIconModule, InputOptionsComponent],
})
export class TrocarPerfilDialogComponent implements OnInit {
  form!: FormGroup<{ perfilId: FormControl<number | null> }>;
  perfis: Perfil[] = [];

  constructor(
    private fb: NonNullableFormBuilder,
    private dialogRef: MatDialogRef<TrocarPerfilDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: TrocarPerfilDialogData,
    private toastr: ToastrService,
  ) {}

  ngOnInit(): void {
    this.perfis = this.data.perfis;
    this.form = this.fb.group({
      perfilId: this.fb.control<number | null>(this.data.usuario.perfil?.id ?? null, Validators.required),
    });
  }

  get perfilControl(): FormControl<number | null> { return this.form.controls.perfilId; }

  salvar(): void {
    if (this.form.invalid || this.perfilControl.value === null) {
      this.form.markAllAsTouched();
      this.toastr.error('Selecione um perfil válido!');
      return;
    }
    this.dialogRef.close({ usuarioId: this.data.usuario.id, novoPerfilId: this.perfilControl.value });
  }

  cancelar(): void { this.dialogRef.close(); }
}
