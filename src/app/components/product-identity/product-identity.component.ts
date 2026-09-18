import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-product-identity',
  standalone: true,
  template: `
    <div class="product-identity__name">{{ name }}</div>
    @if (description) { <div class="product-identity__description">{{ description }}</div> }
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .product-identity__name { font-weight: 600; color: #111827; }
    .product-identity__description { margin-top: 3px; color: #64748b; font-size: 0.85rem; line-height: 1.4; }
  `],
})
export class ProductIdentityComponent {
  @Input({ required: true }) name = '';
  @Input() material?: string | null;
  @Input() format?: string | null;
  @Input() color?: string | null;

  get description(): string {
    return [this.material, this.format, this.color]
      .map(value => value?.trim())
      .filter((value): value is string => !!value)
      .join(' · ');
  }
}
