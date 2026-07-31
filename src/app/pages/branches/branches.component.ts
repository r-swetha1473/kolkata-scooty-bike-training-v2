import { Component, OnInit, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Branch, BranchService } from '../../services/branch.service';
import { SeoService } from '../../services/seo.service';
import { MotionService } from '../../services/motion.service';

@Component({
  selector: 'app-branches-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="branches-page page-enter">
      <section class="page-hero page-hero--photo page-hero--branches motion-reveal">
        <div class="container">
          <p class="xp-eyebrow light">Locations</p>
          <h1 class="hero-title">Train at a centre near you</h1>
          <p class="hero-subtitle">Premium scooty and bike training across Kolkata — same standard at every branch.</p>
        </div>
      </section>

      <section class="xp-section motion-reveal">
        <div class="container">
          <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
            <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3]"></div>
          </div>

          <div class="ks-empty" *ngIf="!loading && !branches.length">
            No branches published yet. Please check back soon.
          </div>

          <div class="xp-branch-grid motion-stagger" *ngIf="!loading && branches.length">
            <article class="xp-branch-card" *ngFor="let b of branches">
              <div class="xp-branch-map">
                <img
                  *ngIf="previewUrl(b.image_url) as img"
                  class="xp-branch-photo"
                  [src]="img"
                  [alt]="b.name"
                  loading="lazy"
                  width="640"
                  height="360" />
                <a *ngIf="!previewUrl(b.image_url)" [href]="mapsUrl(b)" target="_blank" rel="noopener noreferrer" class="xp-branch-map-placeholder" [attr.aria-label]="'Open ' + b.name + ' on Google Maps'">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                  View on Google Maps
                </a>
              </div>
              <div class="xp-branch-body">
                <h3>{{ b.name }}</h3>
                <div class="xp-branch-detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span>{{ b.address }}</span>
                </div>
                <div class="xp-branch-detail" *ngIf="b.opening_time">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  <span>{{ b.opening_time }} – {{ b.closing_time }}</span>
                </div>
                <div class="xp-branch-detail" *ngIf="b.contact_phone">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                  <span>{{ b.contact_phone }}</span>
                </div>
                <div class="xp-branch-detail">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
                  <span>Scooty &amp; bike programmes available</span>
                </div>
                <div class="xp-branch-actions">
                  <a class="ks-btn ks-btn-primary" [routerLink]="['/booking']" [queryParams]="{ branch: b.slug }">Book this branch</a>
                  <a class="ks-btn ks-btn-ghost" [routerLink]="['/branches', b.slug]">Details</a>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .branches-page { background: var(--color-card); }
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
    .xp-branch-photo {
      display: block;
      width: 100%;
      height: 180px;
      object-fit: cover;
      border-radius: var(--radius-md, 12px);
    }
  `]
})
export class BranchesPageComponent implements OnInit, AfterViewInit {
  branches: Branch[] = [];
  loading = true;

  constructor(
    private api: BranchService,
    private seo: SeoService,
    private motion: MotionService
  ) {}

  async ngOnInit() {
    this.seo.setPage({
      title: 'Branches',
      description: 'Kolkata Scooty Bike Training branch locations, hours, and booking links.',
      path: '/branches'
    });
    try {
      this.branches = await this.api.list(true);
    } finally {
      this.loading = false;
      this.motion.refreshAfterContent();
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.motion.initScrollReveal(), 80);
  }

  mapsUrl(branch: Branch): string {
    return this.api.mapsUrl(branch);
  }

  previewUrl(url?: string | null): string {
    return this.api.resolveImageUrl(url) || '';
  }
}
