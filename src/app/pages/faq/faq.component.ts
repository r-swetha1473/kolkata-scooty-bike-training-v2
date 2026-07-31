import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { FaqAccordionComponent, FaqItem } from '../../shared/components/faq-accordion/faq-accordion.component';
import { CmsContentService } from '../../services/cms-content.service';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-faq-page',
  standalone: true,
  imports: [CommonModule, RouterLink, FaqAccordionComponent],
  template: `
    <div class="page-shell">
      <section class="page-hero">
        <div class="container">
          <p class="ks-eyebrow">Help centre</p>
          <h1>Frequently asked questions</h1>
          <p class="hero-subtitle">
            Answers about scooty and bike training, booking, safety, and payments at Kolkata Scooty Bike Training.
          </p>
        </div>
      </section>
      <section class="ks-section">
        <div class="container faq-wrap">
          <h2>Courses &amp; training</h2>
          <app-faq-accordion [faqs]="courseFaqs"></app-faq-accordion>
          <h2>Booking &amp; contact</h2>
          <app-faq-accordion [faqs]="contactFaqs"></app-faq-accordion>
          <p class="cta">
            Still need help?
            <a routerLink="/contact">Contact us</a>
            or
            <a routerLink="/booking">book a trial slot</a>.
          </p>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .faq-wrap { max-width: 760px; }
    .faq-wrap h2 {
      font-size: 1.15rem;
      margin: 1.5rem 0 0.75rem;
    }
    .cta { margin-top: 2rem; color: var(--color-muted); }
    .cta a { color: var(--color-primary); font-weight: 600; }
  `]
})
export class FaqPageComponent implements OnInit, OnDestroy {
  courseFaqs: FaqItem[] = [];
  contactFaqs: FaqItem[] = [];
  private subs = new Subscription();

  constructor(
    private cms: CmsContentService,
    private seo: SeoService
  ) {}

  ngOnInit() {
    this.seo.setPage({
      title: 'FAQ',
      description:
        'Frequently asked questions about scooty training, bike lessons, booking, safety gear, and payments in Kolkata.',
      path: '/faq',
      keywords: 'scooty training FAQ, bike training questions Kolkata, riding school FAQ'
    });
    this.seo.setBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'FAQ', path: '/faq' }
    ]);

    this.subs.add(
      this.cms.coursesFaqs$().subscribe((faqs) => {
        this.courseFaqs = faqs;
        this.updateFaqSchema();
      })
    );
    this.subs.add(
      this.cms.contactFaqs$().subscribe((faqs) => {
        this.contactFaqs = faqs;
        this.updateFaqSchema();
      })
    );
  }

  private updateFaqSchema() {
    const all = [...this.courseFaqs, ...this.contactFaqs];
    if (all.length) {
      this.seo.setFaqSchema(
        all.map((f) => ({
          question: (f as any).question || (f as any).q || '',
          answer: (f as any).answer || (f as any).a || ''
        }))
      );
    }
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }
}
