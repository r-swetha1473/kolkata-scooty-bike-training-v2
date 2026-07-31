import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';

@Component({
  selector: 'app-admin-scheduling-health',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="admin-page health-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Scheduling Engine Health</h1>
            <p>Production troubleshooting — availability, cache, jobs, and platform status.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-secondary" (click)="load()" [disabled]="loading">
              {{ loading ? 'Refreshing…' : 'Refresh' }}
            </button>
          </div>
        </header>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading && !health" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
      </div>

      <ng-container *ngIf="health">
        <section class="admin-panel health-summary">
          <div class="health-overall" [class]="overallClass(health.overallStatus)">
            <span class="health-dot"></span>
            <div>
              <strong>Overall: {{ labelStatus(health.overallStatus) }}</strong>
              <p class="admin-cell-muted">Checked {{ formatTime(health.checkedAt) }} · v{{ health.deploymentVersion }}</p>
            </div>
          </div>
        </section>

        <section class="admin-panel">
          <h2>Core components</h2>
          <div class="health-grid">
            <article class="health-card" *ngFor="let item of componentCards" [class]="statusClass(item.status)">
              <div class="health-card-head">
                <span class="health-check">{{ statusIcon(item.status) }}</span>
                <h3>{{ item.label }}</h3>
              </div>
              <p class="health-detail">{{ item.detail }}</p>
            </article>
          </div>
        </section>

        <section class="admin-panel">
          <h2>Operational counts</h2>
          <div class="admin-kpi-grid">
            <article class="admin-kpi-card"><div class="kpi-value">{{ n(health.counts?.activeBranches) }}</div><div class="kpi-label">Active Branches</div></article>
            <article class="admin-kpi-card"><div class="kpi-value">{{ n(health.counts?.activeTrainers) }}</div><div class="kpi-label">Active Trainers</div></article>
            <article class="admin-kpi-card"><div class="kpi-value">{{ n(health.counts?.activeVehicles) }}</div><div class="kpi-label">Active Vehicles</div></article>
            <article class="admin-kpi-card"><div class="kpi-value">{{ n(health.counts?.bookingQueue) }}</div><div class="kpi-label">Booking Queue</div></article>
            <article class="admin-kpi-card"><div class="kpi-value">{{ n(health.counts?.pendingPayments) }}</div><div class="kpi-label">Pending Payments</div></article>
            <article class="admin-kpi-card"><div class="kpi-value">{{ n(health.counts?.apiErrors24h) }}</div><div class="kpi-label">API Errors (24h)</div></article>
          </div>
        </section>

        <section class="admin-panel">
          <h2>Availability metrics</h2>
          <div class="admin-kpi-grid">
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ health.metrics?.averageAvailabilityResponseMs ?? '—' }}<span *ngIf="health.metrics?.averageAvailabilityResponseMs != null"> ms</span></div>
              <div class="kpi-label">Avg Availability Response</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ formatTime(health.metrics?.lastSlotCalculationTime) }}</div>
              <div class="kpi-label">Last Slot Calculation</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(health.components?.availabilityApi?.totalRequests) }}</div>
              <div class="kpi-label">Availability Requests</div>
            </article>
            <article class="admin-kpi-card">
              <div class="kpi-value">{{ n(health.components?.availabilityApi?.totalErrors) }}</div>
              <div class="kpi-label">Availability Errors</div>
            </article>
          </div>
        </section>

        <section class="admin-panel">
          <h2>Cron status</h2>
          <div class="admin-empty-state" *ngIf="!health.jobs?.cron?.length">
            <p>No cron runs recorded yet since server start.</p>
          </div>
          <div class="health-table-wrap" *ngIf="health.jobs?.cron?.length">
            <table class="admin-table">
              <thead>
                <tr><th>Job</th><th>Status</th><th>Last run</th><th>Runs</th><th>Failures</th><th>Last error</th></tr>
              </thead>
              <tbody>
                <tr *ngFor="let job of health.jobs.cron">
                  <td>{{ job.name }}</td>
                  <td><span class="admin-badge" [ngClass]="badgeClass(job.status)">{{ job.status }}</span></td>
                  <td>{{ formatTime(job.lastRunAt) }}</td>
                  <td>{{ n(job.runs) }}</td>
                  <td>{{ n(job.failures) }}</td>
                  <td>{{ job.lastError || '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="admin-panel" *ngIf="health.metrics?.recentApiErrors?.length">
          <h2>Recent API errors</h2>
          <ul class="health-error-list">
            <li *ngFor="let err of health.metrics.recentApiErrors">
              <span class="admin-cell-muted">{{ formatTime(err.at) }}</span>
              {{ err.message }}
            </li>
          </ul>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .health-summary { margin-bottom: 1rem; }
    .health-overall {
      display: flex; align-items: center; gap: 0.75rem; padding: 1rem 1.25rem;
      border-radius: var(--admin-radius-md, 10px); border: 1px solid var(--admin-border, #e2e8f0);
    }
    .health-overall.ok { background: rgba(34, 197, 94, 0.08); border-color: rgba(34, 197, 94, 0.35); }
    .health-overall.warning { background: rgba(245, 158, 11, 0.08); border-color: rgba(245, 158, 11, 0.35); }
    .health-overall.error { background: rgba(239, 68, 68, 0.08); border-color: rgba(239, 68, 68, 0.35); }
    .health-dot { width: 12px; height: 12px; border-radius: 50%; background: currentColor; flex-shrink: 0; }
    .health-overall.ok .health-dot { color: #16a34a; }
    .health-overall.warning .health-dot { color: #d97706; }
    .health-overall.error .health-dot { color: #dc2626; }
    .health-grid {
      display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 0.75rem;
    }
    .health-card {
      border: 1px solid var(--admin-border, #e2e8f0); border-radius: var(--admin-radius-md, 10px);
      padding: 1rem; background: var(--admin-surface, #fff);
    }
    .health-card.ok { border-left: 4px solid #16a34a; }
    .health-card.warning { border-left: 4px solid #d97706; }
    .health-card.error { border-left: 4px solid #dc2626; }
    .health-card.future { border-left: 4px solid #94a3b8; opacity: 0.92; }
    .health-card-head { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; }
    .health-card-head h3 { margin: 0; font-size: 0.95rem; }
    .health-check { font-weight: 700; }
    .health-detail { margin: 0; font-size: 0.85rem; color: var(--admin-text-muted, #64748b); }
    .health-table-wrap { overflow-x: auto; }
    .health-error-list { margin: 0; padding-left: 1.25rem; }
    .health-error-list li { margin-bottom: 0.5rem; }
  `]
})
export class AdminSchedulingHealthComponent implements OnInit, OnDestroy {
  health: any = null;
  loading = false;
  componentCards: Array<{ label: string; status: string; detail: string }> = [];
  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private admin: AdminService, private toast: ToastService) {}

  ngOnInit() {
    this.load();
    this.refreshTimer = setInterval(() => this.load(true), 60000);
  }

  ngOnDestroy() {
    if (this.refreshTimer) clearInterval(this.refreshTimer);
  }

  async load(silent = false) {
    if (!silent) this.loading = true;
    try {
      this.health = await this.admin.getSchedulingHealth();
      this.buildComponentCards();
    } catch (e) {
      if (!silent) this.toast.error(getApiErrorMessage(e, 'Failed to load engine health'));
    } finally {
      if (!silent) this.loading = false;
    }
  }

  buildComponentCards() {
    const c = this.health?.components || {};
    const cache = c.cache || {};
    const db = c.database || {};
    const avail = c.availabilityApi || {};
    this.componentCards = [
      { label: 'Availability API', status: avail.status || 'ok', detail: `${avail.endpoint || '/api/availability'} · ${this.n(avail.totalRequests)} requests` },
      { label: 'Cache Status', status: cache.status || 'ok', detail: `${this.n(cache.activeEntries)} active / ${this.n(cache.entries)} entries · TTL ${this.n(cache.ttlMs)}ms` },
      { label: 'Redis', status: c.redis?.status || 'future', detail: c.redis?.message || 'Future integration' },
      { label: 'Queue', status: c.queue?.status || 'future', detail: c.queue?.message || 'In-process cron only' },
      { label: 'Database', status: db.status || 'ok', detail: `${db.message || 'Connected'}${db.latencyMs != null ? ` · ${db.latencyMs}ms` : ''}` },
      { label: 'Pending Jobs', status: (this.health?.jobs?.pending?.length ? 'warning' : 'ok'), detail: `${this.n(this.health?.jobs?.pending?.length)} pending since startup` },
      { label: 'Failed Jobs', status: (this.health?.jobs?.failed?.length ? 'error' : 'ok'), detail: `${this.n(this.health?.jobs?.failed?.length)} failed cron run(s)` }
    ];
  }

  n(v: unknown): number {
    const x = Number(v);
    return Number.isFinite(x) ? x : 0;
  }

  formatTime(v: string | null | undefined): string {
    if (!v) return '—';
    try {
      return new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
    } catch {
      return String(v);
    }
  }

  labelStatus(s: string): string {
    if (s === 'ok') return 'Healthy';
    if (s === 'warning') return 'Degraded';
    if (s === 'future') return 'Planned';
    return 'Issue detected';
  }

  overallClass(s: string): string {
    if (s === 'warning') return 'warning';
    if (s === 'error') return 'error';
    return 'ok';
  }

  statusClass(s: string): string {
    if (s === 'error') return 'error';
    if (s === 'warning') return 'warning';
    if (s === 'future') return 'future';
    return 'ok';
  }

  statusIcon(s: string): string {
    if (s === 'ok') return '✓';
    if (s === 'future') return '○';
    if (s === 'warning') return '!';
    return '✗';
  }

  badgeClass(s: string): string {
    if (s === 'ok') return 'admin-badge-success';
    if (s === 'failed') return 'admin-badge-danger';
    return 'admin-badge-warning';
  }
}
