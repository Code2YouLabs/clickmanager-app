import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { LinksSharePanelComponent } from '../share-panel/links-share-panel.component';

export interface LinksShareDialogData {
  titulo: string;
  url: string;
  slug: string;
}

@Component({
  selector: 'app-links-share-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, LinksSharePanelComponent],
  templateUrl: './links-share-dialog.component.html',
})
export class LinksShareDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: LinksShareDialogData,
    private readonly dialogRef: MatDialogRef<LinksShareDialogComponent>
  ) {}

  fechar(): void {
    this.dialogRef.close();
  }
}
