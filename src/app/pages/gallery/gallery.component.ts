import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GalleryItem, GalleryService } from '../../services/gallery.service';
import { SeoService } from '../../services/seo.service';
import { MotionService } from '../../services/motion.service';

@Component({
  selector: 'app-gallery-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="gallery-page page-shell page-enter">
      <section class="page-hero page-hero--photo motion-reveal">
        <div class="container">
          <p class="xp-eyebrow light">Campus life</p>
          <h1 class="hero-title">Gallery</h1>
          <p class="hero-subtitle">Moments from scooty and bike training across our Kolkata centres.</p>
        </div>
      </section>

      <section class="xp-section motion-reveal">
        <div class="container">
          <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
            <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3]"></div>
          </div>

          <div class="ks-empty" *ngIf="!loading && !items.length">
            Gallery photos will appear here soon.
          </div>

          <ng-container *ngIf="!loading && items.length">
            <div class="gallery-filters" role="tablist" aria-label="Gallery categories">
              <button
                type="button"
                class="filter-chip"
                [class.active]="activeCategory === 'All'"
                (click)="setCategory('All')">All</button>
              <button
                type="button"
                class="filter-chip"
                *ngFor="let cat of categories"
                [class.active]="activeCategory === cat"
                (click)="setCategory(cat)">{{ cat }}</button>
            </div>

            <div class="gallery-grid motion-stagger">
              <figure class="gallery-item" *ngFor="let item of filteredItems">
                <picture *ngIf="previewUrl(item.image_url) as src">
                  <source type="image/webp" [attr.srcset]="webpSrc(item.image_url)" />
                  <img
                    [src]="src"
                    [alt]="altText(item)"
                    loading="lazy"
                    decoding="async"
                    width="800"
                    height="600" />
                </picture>
                <div class="gallery-item-placeholder" *ngIf="!previewUrl(item.image_url)" aria-hidden="true"></div>
                <figcaption *ngIf="item.title || item.category">
                  <strong *ngIf="item.title">{{ item.title }}</strong>
                  <span *ngIf="item.category">{{ item.category }}</span>
                </figcaption>
              </figure>
            </div>
          </ng-container>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .gallery-page { background: var(--color-card); }
    .page-hero .xp-eyebrow.light { color: rgba(96, 165, 250, 1); }
    .hero-title {
      font-size: clamp(1.85rem, 4vw, 2.75rem);
      font-weight: 800;
      color: #fff;
      margin: 0 0 0.75rem;
    }
    .hero-subtitle {
      margin: 0;
      font-size: 1.1rem;
      color: rgba(255, 255, 255, 0.78);
      max-width: 36rem;
    }
    .gallery-filters {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-bottom: 1.25rem;
    }
    .filter-chip {
      border: 1px solid var(--color-border);
      background: var(--color-bg, #fff);
      color: var(--color-ink);
      border-radius: 999px;
      padding: 0.4rem 0.9rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
    }
    .filter-chip.active {
      background: var(--color-primary, #2563EB);
      border-color: var(--color-primary, #2563EB);
      color: #fff;
    }
    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      gap: var(--space-4);
    }
    .gallery-item {
      margin: 0;
      overflow: hidden;
      border-radius: var(--radius-lg, 12px);
      background: var(--color-bg, #0f172a);
    }
    .gallery-item img {
      display: block;
      width: 100%;
      aspect-ratio: 4 / 3;
      object-fit: cover;
    }
    .gallery-item-placeholder {
      width: 100%;
      aspect-ratio: 4 / 3;
      background: var(--color-border, #e2e8f0);
    }
    .gallery-item figcaption {
      display: flex;
      flex-direction: column;
      gap: 2px;
      padding: var(--space-3);
      font-size: var(--text-body-sm);
      color: var(--color-muted);
    }
    .gallery-item figcaption strong {
      color: var(--color-text, inherit);
      font-weight: 600;
    }
  `]
})
export class GalleryPageComponent implements OnInit, AfterViewInit {
  items: GalleryItem[] = [];
  filteredItems: GalleryItem[] = [];
  categories: string[] = [];
  activeCategory = 'All';
  loading = true;

  constructor(
    private api: GalleryService,
    private seo: SeoService,
    private motion: MotionService
  ) {}

  async ngOnInit() {
    this.seo.setPage({
      title: 'Training Gallery',
      description:
        'Browse scooty training, bike practice, helmet safety, and branch photos from Kolkata Scooty Bike Training.',
      path: '/gallery',
      keywords: 'scooty training photos Kolkata, bike training gallery, riding school images'
    });
    this.seo.setBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Gallery', path: '/gallery' }
    ]);
    try {
      this.items = await this.api.list(true);
      this.categories = [...new Set(this.items.map((i) => i.category).filter(Boolean) as string[])];
      this.filteredItems = this.items;
    } finally {
      this.loading = false;
      this.motion.refreshAfterContent();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.motion.initScrollReveal(), 80);
  }

  setCategory(cat: string) {
    this.activeCategory = cat;
    this.filteredItems =
      cat === 'All' ? this.items : this.items.filter((i) => i.category === cat);
    this.motion.refreshAfterContent();
  }

  /** Prefer Admin/API URL as-is (Cloudinary secure_url). */
  previewUrl(url?: string | null): string {
    return this.api.resolveImageUrl(url) || '';
  }

  webpSrc(url?: string | null): string {
    return this.previewUrl(url);
  }

  altText(item: GalleryItem): string {
    return `${item.title || item.category || 'Training'} at Kolkata Scooty Bike Training`;
  }
}
