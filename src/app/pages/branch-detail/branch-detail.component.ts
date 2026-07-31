import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Branch, BranchService } from '../../services/branch.service';
import { SeoService } from '../../services/seo.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-branch-detail',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-shell" *ngIf="branch as b">
      <section class="page-hero page-hero--branches">
        <div class="container">
          <p class="ks-eyebrow">Training branch</p>
          <h1>{{ b.name }}</h1>
          <p class="hero-subtitle">{{ b.address }}</p>
        </div>
      </section>
      <section class="ks-section">
        <div class="container detail">
          <img
            *ngIf="imageUrl"
            class="branch-photo"
            [src]="imageUrl"
            [alt]="b.name"
            loading="lazy"
            width="1200"
            height="675" />
          <div class="meta-grid">
            <div *ngIf="b.contact_phone">
              <span>Phone</span>
              <strong><a [href]="'tel:' + b.contact_phone">{{ b.contact_phone }}</a></strong>
            </div>
            <div *ngIf="b.contact_email">
              <span>Email</span>
              <strong><a [href]="'mailto:' + b.contact_email">{{ b.contact_email }}</a></strong>
            </div>
            <div *ngIf="b.opening_time">
              <span>Business hours</span>
              <strong>{{ b.opening_time }} – {{ b.closing_time }}</strong>
            </div>
            <div *ngIf="workingDaysLabel">
              <span>Working days</span>
              <strong>{{ workingDaysLabel }}</strong>
            </div>
            <div *ngIf="b.slot_duration_minutes">
              <span>Slot length</span>
              <strong>{{ b.slot_duration_minutes }} minutes</strong>
            </div>
            <div class="full" *ngIf="b.address">
              <span>Address</span>
              <strong>{{ b.address }}</strong>
            </div>
          </div>

          <div class="map-panel" *ngIf="mapEmbedUrl">
            <h2>Find us on the map</h2>
            <div class="map-frame">
              <iframe
                [src]="mapEmbedUrl"
                title="Branch location map"
                loading="lazy"
                referrerpolicy="no-referrer-when-downgrade"
                allowfullscreen></iframe>
            </div>
          </div>

          <div class="actions">
            <a class="ks-btn ks-btn-primary" [routerLink]="['/booking']" [queryParams]="{ branch: b.slug }">Book at this branch</a>
            <a *ngIf="b.contact_phone" class="ks-btn ks-btn-ghost" [href]="'tel:' + b.contact_phone">Call now</a>
            <a *ngIf="whatsappUrl" class="ks-btn ks-btn-ghost" [href]="whatsappUrl" target="_blank" rel="noopener noreferrer">WhatsApp</a>
            <a *ngIf="directionsUrl" class="ks-btn ks-btn-ghost" [href]="directionsUrl" target="_blank" rel="noopener noreferrer">Get directions</a>
            <a *ngIf="openMapsUrl" class="ks-btn ks-btn-ghost" [href]="openMapsUrl" target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
            <a class="ks-btn ks-btn-ghost" routerLink="/branches">All branches</a>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .detail { max-width: 920px; }
    .branch-photo {
      display: block;
      width: 100%;
      max-height: 420px;
      object-fit: cover;
      border-radius: var(--radius-md);
      border: 1px solid var(--color-border);
      margin-bottom: 1.5rem;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-bottom: 1.75rem;
    }
    .meta-grid .full { grid-column: 1 / -1; }
    .meta-grid div {
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      padding: 1rem;
    }
    .meta-grid span {
      display: block;
      font-size: var(--text-body-sm);
      font-weight: 600;
      color: var(--color-muted);
      margin-bottom: 0.35rem;
    }
    .meta-grid strong, .meta-grid a {
      color: var(--color-ink);
      font-weight: 600;
      text-decoration: none;
    }
    .map-panel { margin-bottom: 1.75rem; }
    .map-panel h2 {
      font-size: 1.125rem;
      margin: 0 0 0.75rem;
    }
    .map-frame {
      border-radius: var(--radius-md);
      overflow: hidden;
      border: 1px solid var(--color-border);
      aspect-ratio: 16 / 9;
      background: var(--color-bg);
    }
    .map-frame iframe {
      width: 100%;
      height: 100%;
      border: 0;
      display: block;
    }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.65rem;
    }
  `]
})
export class BranchDetailComponent implements OnInit {
  branch: Branch | null = null;
  imageUrl = '';
  mapEmbedUrl: SafeResourceUrl | null = null;
  directionsUrl = '';
  openMapsUrl = '';
  whatsappUrl = '';
  workingDaysLabel = '';

  constructor(
    private route: ActivatedRoute,
    private api: BranchService,
    private seo: SeoService,
    private sanitizer: DomSanitizer
  ) {}

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') || '';
    this.branch = await this.api.getBySlug(slug);
    const b = this.branch;
    if (!b) return;

    this.imageUrl = this.api.resolveImageUrl(b.image_url) || '';
    this.workingDaysLabel = this.formatWorkingDays(b.working_days);

    const query = encodeURIComponent(b.maps_url || b.address || `${b.name} Kolkata`);
    const embed = `https://www.google.com/maps?q=${query}&output=embed&z=15`;
    this.mapEmbedUrl = this.sanitizer.bypassSecurityTrustResourceUrl(embed);
    this.openMapsUrl = b.maps_url || `https://www.google.com/maps/search/?api=1&query=${query}`;
    this.directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${query}`;
    const phoneDigits = (b.contact_phone || '').replace(/\D/g, '');
    if (phoneDigits) {
      const wa = phoneDigits.startsWith('91') ? phoneDigits : `91${phoneDigits.replace(/^0/, '')}`;
      this.whatsappUrl = `https://wa.me/${wa}?text=${encodeURIComponent(`Hi, I would like to enquire about training at ${b.name}.`)}`;
    }

    this.seo.setPage({
      title: `${b.name} Branch`,
      description: `Visit ${b.name} for scooty and bike training in Kolkata. ${b.address || ''} Call ${b.contact_phone || 'us'} to book.`,
      path: `/branches/${b.slug}`,
      keywords: `bike training ${b.name}, scooty classes Kolkata, riding school near me`
    });
    this.seo.setBreadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Branches', path: '/branches' },
      { name: b.name, path: `/branches/${b.slug}` }
    ]);
      this.seo.setLocalBusinessSchema({
      name: b.name,
      address: b.address,
      phone: b.contact_phone,
      mapsUrl: this.openMapsUrl,
      openingHours: b.opening_time && b.closing_time ? `${b.opening_time}-${b.closing_time}` : undefined
    });
  }

  private formatWorkingDays(raw: unknown): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let days: number[] = [];
    if (Array.isArray(raw)) {
      days = raw.map((d) => Number(d)).filter((d) => Number.isFinite(d));
    } else if (typeof raw === 'string' && raw.trim()) {
      days = raw.split(/[,\s]+/).map((d) => Number(d)).filter((d) => Number.isFinite(d));
    }
    if (!days.length) return '';
    return days.map((d) => dayNames[((d % 7) + 7) % 7] || String(d)).join(', ');
  }
}
