import { BreakpointObserver } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Component, Inject, ViewChild, inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { map } from 'rxjs';
import { MaterialModule } from 'src/app/material.module';
import { MOBILE_FOUNDATION_QUERY } from 'src/app/shared/responsive/mobile-foundation';
import { TutorialTargetDirective } from 'src/app/shared/tutorial/tutorial-target.directive';
import { ClienteResponse } from 'src/app/models/cliente/cliente-response.model';
import { ClienteCreateFormComponent, ClienteCreateInitialValue } from '../cliente-create-form/cliente-create-form.component';

export type ClienteCreateDialogData = ClienteCreateInitialValue & {
  tutorialTarget?: string | null;
  mobileMode?: 'quick' | 'full';
};

@Component({
  selector: 'app-cliente-create-dialog', standalone: true,
  imports: [CommonModule, MaterialModule, TutorialTargetDirective, ClienteCreateFormComponent],
  templateUrl: './cliente-create-dialog.component.html',
  styleUrl: './cliente-create-dialog.component.scss',
})
export class ClienteCreateDialogComponent {
  @ViewChild('createForm', { static: true }) createForm!: ClienteCreateFormComponent;
  private readonly mobile = toSignal(inject(BreakpointObserver).observe(MOBILE_FOUNDATION_QUERY)
    .pipe(map(state => state.breakpoints[MOBILE_FOUNDATION_QUERY] ?? state.matches)), { initialValue: false });
  get quickMobile(): boolean { return this.data?.mobileMode === 'quick' && this.mobile(); }
  get salvando(): boolean { return this.createForm?.salvando ?? false; }
  get form() { return this.createForm.form; }
  get nomeControl() { return this.createForm.nomeControl; }
  get telefoneControl() { return this.createForm.telefoneControl; }
  constructor(
    private readonly dialogRef: MatDialogRef<ClienteCreateDialogComponent, ClienteResponse | null>,
    @Inject(MAT_DIALOG_DATA) readonly data: ClienteCreateDialogData | null,
  ) {}
  salvar(): void { this.createForm.salvar(); }
  cancelar(): void { if (!this.salvando) this.dialogRef.close(null); }
  concluir(cliente: ClienteResponse): void { this.dialogRef.close(cliente); }
}
