import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  styleUrl: './confirm-dialog.component.scss',
  template: `
    <h2 mat-dialog-title>{{ data.title || 'Confirmação' }}</h2>
    <mat-dialog-content class="m-b-16">
      <p>{{ data.message }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(false)">
        {{ data.cancelText || 'Cancelar' }}
      </button>
      <button mat-flat-button [color]="data.confirmColor || 'warn'" (click)="dialogRef.close(true)">
        {{ data.confirmText || 'Confirmar' }}
      </button>
    </mat-dialog-actions>
  `
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA)
    public data: {
      title?: string;
      message: string;
      confirmText?: string;
      cancelText?: string;             // << novo
      confirmColor?: 'primary' | 'accent' | 'warn';
    }
  ) {}
}