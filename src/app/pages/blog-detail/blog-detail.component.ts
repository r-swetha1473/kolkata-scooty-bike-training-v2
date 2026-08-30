import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BlogPost, BlogService } from '../../services/blog.service';
import { SeoService } from '../../services/seo.service';
import { MotionService } from '../../services/motion.service';
import { getApiErrorMessage } from '../../utils/api-error';

@Component({
  selector: 'app-blog-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="blog-detail-page page-shell page-enter">
      <section class="page-hero page-hero--photo motion-reveal" *ngIf="!loading && post">
        <div class="container">
          <p class="xp-eyebrow light">{{ post.category || 'Blog' }}</p>
          <h1 class="hero-title">{{ post.title }}</h1>
          <p class="hero-subtitle" *ngIf="post.excerpt">{{ post.excerpt }}</p>
          <p class="hero-meta" *ngIf="post.author_name || post.published_at">
            <span *ngIf="post.author_name">{{ post.author_name }}</span>
            <span *ngIf="post.published_at">{{ formatDate(post.published_at) }}</span>
          </p>
        </div>
      </section>

      <section class="xp-section motion-reveal">
        <div class="container narrow">
          <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
            <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3]"></div>
          </div>

          <div class="ks-empty" *ngIf="!loading && error">
            {{ error }}
            <div style="margin-top: 1rem">
              <a class="ks-btn ks-btn-ghost" routerLink="/blogs">Back to blog</a>
            </div>
          </div>

          <ng-container *ngIf="!loading && post">
            <img
              *ngIf="previewUrl(post.featured_image_url) as img"
              class="featured"
              [src]="img"
              [alt]="post.title" />
            <div class="blog-content" [innerHTML]="post.content || ''"></div>
            <div class="blog-footer">
              <a class="ks-btn ks-btn-ghost" routerLink="/blogs">All posts</a>
              <a class="ks-btn ks-btn-primary" routerLink="/booking">Book training</a>
            </div>
          </ng-container>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .blog-detail-page { background: var(--color-card); }
    .page-hero .xp-eyebrow.light { color: var(--color-primary, #2563EB); }
    .hero-title {
      font-size: clamp(1.85rem, 4vw, 2.75rem);
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 0.75rem;
      max-width: 40rem;
    }
    .hero-subtitle {
      margin: 0 0 0.75rem;
      font-size: 1.1rem;
      color: #475569;
      max-width: 40rem;
    }
    .hero-meta {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      margin: 0;
      color: #64748B;
      font-size: 0.95rem;
    }
    .container.narrow { max-width: 760px; }
    .featured {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: var(--radius-lg, 12px);
      margin-bottom: var(--space-6);
    }
    .blog-content {
      line-height: 1.75;
      color: var(--color-text, inherit);
      font-size: 1.05rem;
    }
    .blog-content ::ng-deep p { margin: 0 0 1.1rem; }
    .blog-content ::ng-deep ul,
    .blog-content ::ng-deep ol { margin: 0 0 1.1rem; padding-left: 1.25rem; }
    .blog-content ::ng-deep a { color: var(--color-primary); }
    .blog-footer {
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin-top: var(--space-8);
      padding-top: var(--space-6);
      border-top: 1px solid var(--color-border);
    }
  `]
})
export class BlogDetailComponent implements OnInit, AfterViewInit {
  post: BlogPost | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private api: BlogService,
    private seo: SeoService,
    private motion: MotionService
  ) {}

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    if (!slug) {
      this.error = 'Blog post not found.';
      this.loading = false;
      return;
    }
    try {
      this.post = await this.api.getBySlug(slug);
      this.seo.setPage({
        title: this.post.meta_title || this.post.title,
        description: this.post.meta_description || this.post.excerpt || undefined,
        path: `/blogs/${this.post.slug}`,
        keywords: this.post.meta_keywords || undefined,
        image: this.post.featured_image_url
          ? this.api.resolveImageUrl(this.post.featured_image_url)
          : undefined
      });
      this.seo.setBreadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Blog', path: '/blogs' },
        { name: this.post.title, path: `/blogs/${this.post.slug}` }
      ]);
      this.seo.setArticleSchema({
        title: this.post.title,
        description: this.post.meta_description || this.post.excerpt || undefined,
        image: this.post.featured_image_url
          ? this.api.resolveImageUrl(this.post.featured_image_url)
          : undefined,
        path: `/blogs/${this.post.slug}`,
        datePublished: this.post.published_at || undefined,
        dateModified: this.post.updated_at || this.post.published_at || undefined,
        authorName: this.post.author_name || 'Kolkata Scooty Team'
      });
    } catch (e) {
      this.error = getApiErrorMessage(e, 'Blog post not found.');
    } finally {
      this.loading = false;
      this.motion.refreshAfterContent();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.motion.initScrollReveal(), 80);
  }

  previewUrl(url?: string | null): string {
    return this.api.resolveImageUrl(url) || '';
  }

  formatDate(value?: string | null): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }
}
