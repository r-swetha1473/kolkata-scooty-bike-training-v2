import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BlogPost, BlogService } from '../../services/blog.service';
import { SeoService } from '../../services/seo.service';
import { MotionService } from '../../services/motion.service';

@Component({
  selector: 'app-blogs-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="blogs-page page-shell page-enter">
      <section class="page-hero page-hero--photo motion-reveal">
        <div class="container">
          <p class="xp-eyebrow light">Tips & news</p>
          <h1 class="hero-title">Blog</h1>
          <p class="hero-subtitle">Practical riding advice and updates from our training centres.</p>
        </div>
      </section>

      <section class="xp-section motion-reveal">
        <div class="container">
          <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
            <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3]"></div>
          </div>

          <div class="ks-empty" *ngIf="!loading && !posts.length">
            Blog posts will appear here when published.
          </div>

          <div class="blog-list motion-stagger" *ngIf="!loading && posts.length">
            <article class="blog-card" *ngFor="let post of posts">
              <a class="blog-card-media" [routerLink]="['/blogs', post.slug]" *ngIf="previewUrl(post.featured_image_url) as img">
                <img [src]="img" [alt]="post.title" loading="lazy" />
              </a>
              <div class="blog-card-body">
                <p class="blog-meta" *ngIf="post.category || post.published_at">
                  <span *ngIf="post.category">{{ post.category }}</span>
                  <span *ngIf="post.published_at">{{ formatDate(post.published_at) }}</span>
                </p>
                <h2><a [routerLink]="['/blogs', post.slug]">{{ post.title }}</a></h2>
                <p *ngIf="post.excerpt">{{ post.excerpt }}</p>
                <a class="ks-btn ks-btn-ghost" [routerLink]="['/blogs', post.slug]">Read more</a>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .blogs-page { background: var(--color-card); }
    .page-hero .xp-eyebrow.light { color: var(--color-primary, #2563EB); }
    .hero-title {
      font-size: clamp(1.85rem, 4vw, 2.75rem);
      font-weight: 800;
      color: #0F172A;
      margin: 0 0 0.75rem;
    }
    .hero-subtitle {
      margin: 0;
      font-size: 1.1rem;
      color: #475569;
      max-width: 36rem;
    }
    .blog-list { display: flex; flex-direction: column; gap: var(--space-6); }
    .blog-card {
      display: grid;
      grid-template-columns: minmax(0, 280px) 1fr;
      gap: var(--space-5);
      align-items: start;
    }
    .blog-card-media img {
      width: 100%;
      aspect-ratio: 16 / 10;
      object-fit: cover;
      border-radius: var(--radius-lg, 12px);
    }
    .blog-meta {
      display: flex;
      gap: var(--space-3);
      flex-wrap: wrap;
      margin: 0 0 var(--space-2);
      font-size: var(--text-body-sm);
      color: var(--color-muted);
    }
    .blog-card-body h2 {
      margin: 0 0 var(--space-2);
      font-size: clamp(1.25rem, 2vw, 1.6rem);
    }
    .blog-card-body h2 a {
      color: inherit;
      text-decoration: none;
    }
    .blog-card-body h2 a:hover { color: var(--color-primary); }
    .blog-card-body p { margin: 0 0 var(--space-4); color: var(--color-muted); line-height: 1.6; }
    @media (max-width: 720px) {
      .blog-card { grid-template-columns: 1fr; }
    }
  `]
})
export class BlogsPageComponent implements OnInit, AfterViewInit {
  posts: BlogPost[] = [];
  loading = true;

  constructor(
    private api: BlogService,
    private seo: SeoService,
    private motion: MotionService
  ) {}

  async ngOnInit() {
    this.seo.setPage({
      title: 'Blog',
      description: 'Training tips and news from Kolkata Scooty Bike Training.',
      path: '/blogs'
    });
    try {
      this.posts = await this.api.list();
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
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '';
    }
  }
}
