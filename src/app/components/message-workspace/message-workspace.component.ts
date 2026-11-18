import { Component, input } from '@angular/core';

@Component({
  selector: 'app-message-workspace',
  standalone: true,
  template: `
    <section class="lista" [hidden]="mobileDetail()" [attr.aria-label]="listLabel()">
      <ng-content select="[message-list]" />
    </section>
    <section class="detalhe" [hidden]="mobileList()" [attr.aria-label]="detailLabel()">
      <ng-content select="[message-detail]" />
    </section>
  `,
  styles: `
    :host {
      display: grid;
      grid-template-columns: clamp(19rem, 32%, 25rem) minmax(0, 1fr);
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: 16px;
      overflow: hidden;
    }

    section { min-width: 0; }
    .lista { border-inline-end: 1px solid var(--mat-sys-outline-variant); }
    .detalhe { background: var(--mat-sys-surface-container-lowest); }

    :host(.mobile) { grid-template-columns: minmax(0, 1fr); }
    :host(.mobile) .lista { border-inline-end: 0; }
  `,
  host: { '[class.mobile]': 'compact()' },
})
export class MessageWorkspaceComponent {
  readonly listLabel = input.required<string>();
  readonly detailLabel = input.required<string>();
  readonly compact = input(false);
  readonly detailOpen = input(false);

  protected mobileDetail() { return this.compact() && this.detailOpen(); }
  protected mobileList() { return this.compact() && !this.detailOpen(); }
}
