import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

export interface CookieConsentState {
  essential: true;
  analytics: boolean;
  decision: 'accepted' | 'rejected' | 'custom';
  updatedAt: string;
}

const STORAGE_KEY = 'kbt_cookie_consent';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="cookie-banner" *ngIf="visible && !isAdminRoute" role="dialog" aria-label="Cookie consent">
      <div class="cookie-inner" *ngIf="!managing">
        <div class="cookie-copy">
          <strong>We use cookies</strong>
          <p>
            Essential cookies keep the site working. Analytics cookies help us improve the experience and are optional.
            See our <a routerLink="/cookies">Cookie Policy</a>.
          </p>
        </div>
        <div class="cookie-actions">
          <button type="button" class="btn-ghost" (click)="openManage()">Manage Preferences</button>
          <button type="button" class="btn-ghost" (click)="reject()">Reject</button>
          <button type="button" class="btn-accept" (click)="accept()">Accept</button>
        </div>
      </div>

      <div class="cookie-inner manage" *ngIf="managing">
        <div class="cookie-copy">
          <strong>Cookie preferences</strong>
          <label class="pref-row locked">
            <input type="checkbox" checked disabled />
            <span>
              <em>Essential</em>
              Always on — sign-in, security, and core booking features.
            </span>
          </label>
          <label class="pref-row">
            <input type="checkbox" [(ngModel)]="analyticsDraft" />
            <span>
              <em>Analytics</em>
              Optional usage insights to improve the website.
            </span>
          </label>
        </div>
        <div class="cookie-actions">
          <button type="button" class="btn-ghost" (click)="managing = false">Back</button>
          <button type="button" class="btn-accept" (click)="saveCustom()">Save preferences</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .cookie-banner {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 1200;
      padding: 1rem;
      pointer-events: none;
    }
    .cookie-inner {
      pointer-events: auto;
      max-width: 960px;
      margin: 0 auto;
      display: flex;
      flex-wrap: wrap;
      gap: 1rem;
      align-items: center;
      justify-content: space-between;
      padding: 1.1rem 1.25rem;
      background: var(--color-card, #fff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: var(--radius-lg, 12px);
      box-shadow: 0 -8px 32px rgba(15, 23, 42, 0.12);
    }
    .cookie-copy {
      flex: 1 1 280px;
      min-width: 0;
    }
    .cookie-copy strong {
      display: block;
      margin-bottom: 0.35rem;
      font-size: 1rem;
      color: var(--color-ink, #111);
    }
    .cookie-copy p {
      margin: 0;
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--color-muted, #64748b);
    }
    .cookie-copy a {
      color: var(--color-primary, #2563eb);
      font-weight: 600;
    }
    .cookie-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      justify-content: flex-end;
    }
    .btn-ghost, .btn-accept {
      min-height: 40px;
      padding: 0.45rem 0.95rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.85rem;
      cursor: pointer;
    }
    .btn-ghost {
      background: var(--color-bg, #f8fafc);
      border: 1px solid var(--color-border, #e5e7eb);
      color: var(--color-ink, #111);
    }
    .btn-accept {
      background: var(--color-primary, #2563eb);
      border: none;
      color: #fff;
    }
    .pref-row {
      display: flex;
      gap: 0.65rem;
      align-items: flex-start;
      margin-top: 0.75rem;
      font-size: 0.875rem;
      color: var(--color-muted, #64748b);
      cursor: pointer;
    }
    .pref-row.locked { cursor: default; opacity: 0.9; }
    .pref-row em {
      display: block;
      font-style: normal;
      font-weight: 700;
      color: var(--color-ink, #111);
      margin-bottom: 0.1rem;
    }
    .pref-row input { margin-top: 0.2rem; }
    @media (max-width: 640px) {
      .cookie-actions { width: 100%; }
      .cookie-actions button { flex: 1 1 auto; }
    }
  `]
})
export class CookieConsentComponent implements OnInit, OnDestroy {
  visible = false;
  managing = false;
  isAdminRoute = false;
  analyticsDraft = false;
  private routerSub: Subscription | null = null;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.checkAdmin(this.router.url);
    this.visible = !this.hasStoredConsent();
    this.routerSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        this.checkAdmin(e.urlAfterRedirects || e.url);
      });
  }

  ngOnDestroy(): void {
    this.routerSub?.unsubscribe();
  }

  private checkAdmin(url: string): void {
    const path = url.split('?')[0].split('#')[0];
    this.isAdminRoute = path === '/admin' || path.startsWith('/admin/');
  }

  private hasStoredConsent(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const parsed = JSON.parse(raw) as CookieConsentState;
      return !!parsed?.decision;
    } catch {
      return false;
    }
  }

  private persist(state: CookieConsentState): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
    this.visible = false;
    this.managing = false;
  }

  accept(): void {
    this.persist({
      essential: true,
      analytics: true,
      decision: 'accepted',
      updatedAt: new Date().toISOString()
    });
  }

  reject(): void {
    this.persist({
      essential: true,
      analytics: false,
      decision: 'rejected',
      updatedAt: new Date().toISOString()
    });
  }

  openManage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as CookieConsentState;
        this.analyticsDraft = !!parsed.analytics;
      } else {
        this.analyticsDraft = false;
      }
    } catch {
      this.analyticsDraft = false;
    }
    this.managing = true;
  }

  saveCustom(): void {
    this.persist({
      essential: true,
      analytics: !!this.analyticsDraft,
      decision: 'custom',
      updatedAt: new Date().toISOString()
    });
  }
}
