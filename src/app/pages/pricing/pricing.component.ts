import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CmsContentService, CourseDisplay } from '../../services/cms-content.service';
import { SeoService } from '../../services/seo.service';

@Component({
  selector: 'app-pricing-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-shell">
      <section class="page-hero">
        <div class="container">
          <p class="ks-eyebrow">Transparent pricing</p>
          <h1>Training packages that fit your pace</h1>
          <p class="hero-subtitle">
            Compare scooty and bike courses. Prices include trainer-led sessions, safety briefing, and practice on training grounds.
          </p>
        </div>
      </section>
      <section class="ks-section">
        <div class="container">
          <div class="price-grid" *ngIf="!loading && courses.length">
            <article class="price-card" *ngFor="let c of courses">
              <img *ngIf="courseImage(c)" [src]="courseImage(c)" [alt]="c.name" loading="lazy" decoding="async" width="400" height="160" />
              <h2>{{ c.name }}</h2>
              <p class="price">{{ c.price_label || c.price }}</p>
              <p class="desc">{{ c.description }}</p>
              <ul *ngIf="c.features?.length || c.includes?.length">
                <li *ngFor="let f of (c.features || c.includes).slice(0, 5)">{{ f }}</li>
              </ul>
              <a class="ks-btn ks-btn-primary" [routerLink]="c.ctaPath" [queryParams]="c.ctaQuery">{{ c.cta_text || c.ctaText || 'Book this course' }}</a>
              <a class="detail-link" [routerLink]="['/courses', c.slug]">View details</a>
            </article>
          </div>
          <p *ngIf="loading" class="muted">Loading packages…</p>
          <p *ngIf="!loading && !courses.length" class="muted">Courses will appear here soon.</p>
          <div class="note">
            <h3>What’s included</h3>
            <p>
              Helmet guidance, trainer supervision, slot booking support, and road-safety tips.
              Need a custom package? <a routerLink="/contact">Contact us</a> or message us on WhatsApp.
            </p>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .price-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.25rem;
    }
    .price-card {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1.25rem;
      display: flex;
      flex-direction: column;
      gap: 0.65rem;
    }
    .price-card img {
      width: 100%;
      height: 160px;
      object-fit: cover;
      border-radius: 8px;
    }
    .price-card h2 { margin: 0; font-size: 1.15rem; }
    .price {
      margin: 0;
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--color-primary);
    }
    .desc { margin: 0; color: var(--color-muted); font-size: 0.925rem; }
    ul { margin: 0; padding-left: 1.1rem; color: var(--color-ink-soft); }
    .detail-link { font-size: 0.875rem; color: var(--color-primary); font-weight: 600; }
    .note { margin-top: 2rem; max-width: 720px; }
    .muted { color: var(--color-muted); }
  `]
})
export class PricingPageComponent implements OnInit {
  courses: CourseDisplay[] = [];
  loading = true;

  constructor(
    private cms: CmsContentService,
    private seo: SeoService
  ) {}

  async ngOnInit() {
    this.seo.setPage({
      title: 'Pricing',
      description:
        'Kolkata Scooty Bike Training course pricing in Kolkata — scooty, bike, doorstep, and RTO assistance packages with transparent fees.',
      path: '/pricing',
      keywords: 'scooty training pricing, scooty training fees Kolkata, bike training cost, riding school packages'
    });
    this.seo.setBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Pricing', path: '/pricing' }
    ]);
    try {
      this.courses = await this.cms.loadCourses(true);
    } finally {
      this.loading = false;
    }
  }

  courseImage(c: CourseDisplay): string {
    return c.image_url || c.image || '';
  }
}
