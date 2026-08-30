import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Course, CourseService } from '../../services/course.service';
import { SeoService } from '../../services/seo.service';
import { displayCoursePrice, primaryCourseImageUrl, resolveMediaUrl } from '../../utils/media-url';

@Component({
  selector: 'app-course-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-shell" *ngIf="course as c">
      <section class="page-hero page-hero--photo" [style.--course-banner]="bannerUrl ? 'url(' + bannerUrl + ')' : null">
        <div class="container">
          <p class="ks-eyebrow">Course</p>
          <h1>{{ c.name }}</h1>
          <p class="hero-subtitle">{{ c.tagline || c.description }}</p>
        </div>
      </section>
      <section class="ks-section">
        <div class="container detail">
          <picture *ngIf="cardUrl" class="course-feature">
            <img [src]="cardUrl" [alt]="c.name + ' training at Kolkata Scooty Bike Training'" loading="lazy" decoding="async" width="1200" height="675" />
          </picture>
          <div class="price-row">
            <span class="price">{{ displayPrice }}</span>
            <span class="ks-badge ks-badge-info" *ngIf="c.duration_label">{{ c.duration_label }}</span>
            <span class="ks-badge" *ngIf="c.difficulty">{{ c.difficulty }}</span>
          </div>
          <p *ngIf="c.description" class="desc">{{ c.description }}</p>
          <ul class="features" *ngIf="c.features?.length">
            <li *ngFor="let f of c.features">{{ f }}</li>
          </ul>
          <div class="actions">
            <a class="ks-btn ks-btn-primary" [routerLink]="ctaPath" [queryParams]="ctaQuery">{{ ctaText }}</a>
            <a class="ks-btn ks-btn-ghost" routerLink="/courses">All courses</a>
            <a class="ks-btn ks-btn-ghost" routerLink="/pricing">Compare pricing</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .page-hero--photo {
      background-image: linear-gradient(120deg, rgba(15,23,42,.82), rgba(37,99,235,.55)), var(--course-banner, none);
      background-size: cover;
      background-position: center;
    }
    .detail { max-width: 720px; }
    .course-feature {
      display: block;
      margin-bottom: 1.25rem;
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--color-border);
    }
    .course-feature img {
      display: block;
      width: 100%;
      height: auto;
      aspect-ratio: 16 / 9;
      object-fit: cover;
    }
    .desc {
      color: var(--ks-ink-soft, var(--color-muted));
      line-height: 1.6;
      margin: 0 0 1.25rem;
    }
    .price-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }
    .price {
      font-size: var(--text-display-sm);
      font-weight: 700;
      color: var(--color-primary);
    }
    .features {
      margin: 0 0 1.75rem;
      padding: 0;
      list-style: none;
      display: grid;
      gap: 0.65rem;
    }
    .features li {
      position: relative;
      padding-left: 1.5rem;
      color: var(--ks-ink-soft);
      line-height: 1.55;
    }
    .features li::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0.45rem;
      width: 0.55rem;
      height: 0.55rem;
      border-radius: 2px;
      background: var(--color-primary);
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
  `]
})
export class CourseDetailComponent implements OnInit {
  course: Course | null = null;
  bannerUrl = '';
  cardUrl = '';
  displayPrice = '';
  ctaText = 'Book this course';
  ctaPath = '/booking';
  ctaQuery: Record<string, string> = {};

  constructor(
    private route: ActivatedRoute,
    private api: CourseService,
    private seo: SeoService
  ) {}
  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.course = await this.api.getBySlug(slug);
    const features = Array.isArray(this.course.features)
      ? this.course.features
      : typeof this.course.features === 'string'
        ? JSON.parse(this.course.features as any)
        : [];
    this.course = { ...this.course, features };

    const primary = primaryCourseImageUrl(this.course);
    this.bannerUrl = resolveMediaUrl(primary, '', this.api.apiBaseUrl);
    this.cardUrl = this.bannerUrl;
    this.displayPrice = displayCoursePrice(this.course);

    const rawLink = (this.course.cta_link || `/booking?course=${this.course.slug}`).trim();
    const [pathPart, queryPart = ''] = rawLink.split('?');
    this.ctaPath = pathPart || '/booking';
    this.ctaQuery = {};
    if (queryPart) {
      new URLSearchParams(queryPart).forEach((value, key) => {
        this.ctaQuery[key] = value;
      });
    }
    // Hardening: always include ?course=<slug> for booking so Select Course can be skipped.
    if (
      (this.ctaPath === '/booking' || this.ctaPath.endsWith('/booking')) &&
      !this.ctaQuery['course'] &&
      this.course.slug
    ) {
      this.ctaQuery['course'] = this.course.slug;
    }
    this.ctaText = this.course.cta_text || 'Book this course';

    this.seo.setPage({
      title: this.course.name,
      description: this.course.description,
      path: `/courses/${this.course.slug}`,
      image: this.cardUrl || undefined,
      keywords: `${this.course.name}, scooty training Kolkata, bike training Kolkata`
    });
    this.seo.setBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Courses', path: '/courses' },
      { name: this.course.name, path: `/courses/${this.course.slug}` }
    ]);
  }
}
