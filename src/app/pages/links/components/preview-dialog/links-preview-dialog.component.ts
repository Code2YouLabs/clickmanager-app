import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MaterialModule } from 'src/app/material.module';
import { LinksPreviewModel } from '../../models/links.models';
import { LinksPublicPreviewComponent } from '../public-preview/links-public-preview.component';

@Component({
  selector: 'app-links-preview-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, LinksPublicPreviewComponent],
  templateUrl: './links-preview-dialog.component.html',
  styleUrls: ['./links-preview-dialog.component.scss'],
})
export class LinksPreviewDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public readonly data: LinksPreviewModel,
    private readonly dialogRef: MatDialogRef<LinksPreviewDialogComponent>
  ) {}

  fechar(): void {
    this.dialogRef.close();
  }
}
