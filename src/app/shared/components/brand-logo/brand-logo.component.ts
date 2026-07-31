import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type BrandLogoVariant = 'default' | 'light' | 'dark' | 'mark';

@Component({
  selector: 'app-brand-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <img
      class="brand-logo"
      [class.brand-logo-mark]="variant === 'mark'"
      [src]="src"
      [alt]="alt"
      [attr.width]="variant === 'mark' ? markSize : null"
      [attr.height]="variant === 'mark' ? markSize : null"
      loading="eager"
      decoding="async" />
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; line-height: 0; }
    .brand-logo {
      height: var(--brand-logo-height, 36px);
      width: auto;
      max-width: 100%;
      display: block;
    }
    .brand-logo-mark {
      height: var(--brand-mark-size, 36px);
      width: var(--brand-mark-size, 36px);
    }
  `]
})
export class BrandLogoComponent {
  @Input() variant: BrandLogoVariant = 'default';
  @Input() alt = 'Kolkata Scooty Bike Training';
  @Input() markSize = 36;

  get src(): string {
    switch (this.variant) {
      case 'light':
        return '/assets/brand/logo-light.svg';
      case 'dark':
        return '/assets/brand/logo-dark.svg';
      case 'mark':
        return '/assets/brand/mark.svg';
      default:
        return '/assets/brand/logo.svg';
    }
  }
}
