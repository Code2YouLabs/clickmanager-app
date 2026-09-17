import { Component, inject } from '@angular/core';
import { MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { BibliotecaProdutosSelectorComponent } from './biblioteca-produtos-selector.component';
@Component({
  standalone: true, imports: [MaterialModule, BibliotecaProdutosSelectorComponent],
  template: `<h2 mat-dialog-title>Biblioteca de produtos e serviços</h2>
    <mat-dialog-content><app-biblioteca-produtos-selector (importado)="alterado = true" (ocupado)="ocupado = $event; ref.disableClose = $event" /></mat-dialog-content>
    <mat-dialog-actions align="end"><button mat-button [disabled]="ocupado" (click)="ref.close(alterado)">Fechar</button></mat-dialog-actions>`,
})
export class BibliotecaDialogComponent {
  readonly ref = inject(MatDialogRef<BibliotecaDialogComponent>);
  ocupado = false;
  alterado = false;
}
