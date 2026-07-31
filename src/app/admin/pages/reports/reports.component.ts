import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="admin-page reports-page">
      <div class="admin-sticky-toolbar">
      <header class="admin-hero">
        <div>
          <h1>Reports & insights</h1>
          <p>Read-only operational snapshot from live booking, attendance, and system health data.</p>
        </div>
        <div class="admin-hero-actions">
          <button type="button" class="admin-btn admin-btn-secondary" (click)="load()" [disabled]="loading">
            {{ loading ? 'Refreshing…' : 'Refresh' }}
          </button>
          <a routerLink="/admin/bookings" class="admin-btn admin-btn-primary">Booking history</a>
        </div>
      </header>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3]"></div>
      </div>

      <ng-container *ngIf="!loading && !stats">
        <div class="admin-empty-state">
          <div class="admin-empty-state-icon" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
              <line x1="18" y1="20" x2="18" y2="10"></line>
              <line x1="12" y1="20" x2="12" y2="4"></line>
              <line x1="6" y1="20" x2="6" y2="14"></line>
            </svg>
          </div>
          <h3>Reports unavailable</h3>
          <p>Could not load operational data. Try refreshing.</p>
          <button type="button" class="admin-btn admin-btn-primary" (click)="load()">Retry</button>
        </div>
      </ng-container>

      <ng-container *ngIf="!loading && stats">
        <section class="admin-panel">
          <h2>Today’s operations</h2>
          <div class="admin-kpi-grid">
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.todayOperations?.todayBookings) }}</div>
              <div class="kpi-label">Bookings today</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.todayOperations?.todayOnlineBookings) }}</div>
              <div class="kpi-label">Online</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.todayOperations?.todayOfflineBookings) }}</div>
              <div class="kpi-label">Offline</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.todayOperations?.todayAttended) }}</div>
              <div class="kpi-label">Attended</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.todayOperations?.todayPending) }}</div>
              <div class="kpi-label">Pending attendance</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.todayOperations?.todayNoShows) }}</div>
              <div class="kpi-label">No-shows</div>
            </article>
          </div>
        </section>

        <section class="admin-panel">
          <h2>System health</h2>
          <div class="admin-kpi-grid">
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.systemHealth?.activeVehicles) }}</div>
              <div class="kpi-label">Active vehicles</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.systemHealth?.activeTrainers) }}</div>
              <div class="kpi-label">Active trainers</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.systemHealth?.futureSlots) }}</div>
              <div class="kpi-label">Future slots</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(stats.systemHealth?.capacityWarnings) }}</div>
              <div class="kpi-label">Capacity warnings</div>
            </article>
          </div>
        </section>

        <section class="admin-panel links">
          <h2>Deep-dive tracking</h2>
          <div class="link-grid">
            <a routerLink="/admin/bookings">Booking history & attendance</a>
            <a routerLink="/admin/payments">Payment verification history</a>
            <a routerLink="/admin/audit-logs">Audit / login / user actions</a>
            <a routerLink="/admin/users">Customer management</a>
            <a routerLink="/admin">Live dashboard charts</a>
          </div>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .link-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 0.65rem;
    }
    .link-grid a {
      display: block;
      padding: 0.9rem 1rem;
      border-radius: var(--admin-radius);
      border: 1px solid var(--admin-border-light);
      background: var(--admin-bg-subtle);
      color: var(--admin-text);
      text-decoration: none;
      font-weight: 600;
      font-size: 0.9rem;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .link-grid a:hover {
      border-color: var(--admin-primary);
      transform: translateY(-1px);
    }
  `]
})
export class AdminReportsComponent implements OnInit {
  stats: any = null;
  loading = false;

  constructor(private admin: AdminService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
  }

  async load() {
    this.loading = true;
    try {
      this.stats = await this.admin.getDashboardStats();
    } catch (e: any) {
      this.toast.error(e?.message || 'Failed to load reports');
    } finally {
      this.loading = false;
    }
  }

  n(v: any): number | string {
    return v == null ? 0 : v;
  }
}
