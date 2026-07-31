import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface FaqItem {
  question: string;
  answer: string;
}

@Component({
  selector: 'app-faq-accordion',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      class="xp-faq-list"
      [class.xp-faq-list--compact]="compact"
      role="presentation">
      <article
        class="xp-faq-item"
        *ngFor="let faq of faqs; let i = index"
        [class.is-open]="openIndex === i">
        <h3 class="xp-faq-heading">
          <button
            type="button"
            class="xp-faq-trigger"
            (click)="toggle(i)"
            [attr.aria-expanded]="openIndex === i"
            [attr.aria-controls]="panelId(i)"
            [id]="triggerId(i)">
            <span class="xp-faq-question">{{ faq.question }}</span>
            <span class="xp-faq-chevron" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </button>
        </h3>

        <div
          class="xp-faq-panel"
          [id]="panelId(i)"
          role="region"
          [attr.aria-labelledby]="triggerId(i)"
          [attr.aria-hidden]="openIndex !== i"
          [attr.inert]="openIndex !== i ? '' : null">
          <div class="xp-faq-panel-inner">
            <div class="xp-faq-answer">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  `,
  styleUrls: ['./faq-accordion.component.css']
})
export class FaqAccordionComponent {
  @Input() faqs: FaqItem[] = [];
  @Input() compact = false;

  openIndex = -1;
  readonly uid = Math.random().toString(36).slice(2, 8);

  triggerId(index: number): string {
    return `faq-trigger-${this.uid}-${index}`;
  }

  panelId(index: number): string {
    return `faq-panel-${this.uid}-${index}`;
  }

  toggle(index: number): void {
    this.openIndex = this.openIndex === index ? -1 : index;
  }
}
