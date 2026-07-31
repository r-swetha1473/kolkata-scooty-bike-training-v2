import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { Payment, PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-customer-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="page-shell page-enter">
      <section class="page-hero">
        <div class="container">
          <p class="ks-eyebrow">Customer portal</p>
          <h1>Welcome{{ displayName ? ', ' + displayName : '' }}</h1>
          <p class="hero-subtitle">Manage bookings, payments, and your profile.</p>
        </div>
      </section>

      <section class="ks-section" *ngIf="!loading && progressRows.length">
        <div class="container">
          <h2 class="section-title">Your course progress</h2>
          <div class="progress-grid">
            <article class="progress-card" *ngFor="let row of progressRows">
              <h3>{{ row.course }}</h3>
              <dl class="progress-meta">
                <div><dt>Branch</dt><dd>{{ row.branch || '—' }}</dd></div>
                <div><dt>Trainer</dt><dd>{{ row.trainer || 'To be assigned' }}</dd></div>
                <div><dt>Classes</dt><dd>{{ row.classes_completed }} / {{ row.classes_purchased }} ({{ row.classes_remaining }} left)</dd></div>
                <div><dt>Attendance</dt><dd>{{ row.attendance_percent }}%</dd></div>
                <div><dt>Course status</dt><dd>{{ formatStatus(row.course_status) }}</dd></div>
                <div><dt>Payment</dt><dd>{{ formatStatus(row.payment_status) }}</dd></div>
                <div><dt>Certificate</dt><dd>{{ formatStatus(row.certificate_status) }}</dd></div>
                <div *ngIf="row.last_class_date"><dt>Last class</dt><dd>{{ formatDate(row.last_class_date) }}</dd></div>
                <div *ngIf="row.next_class_date"><dt>Upcoming class</dt><dd>{{ formatDate(row.next_class_date) }}</dd></div>
              </dl>
            </article>
          </div>
        </div>
      </section>

      <section class="ks-section">
        <div class="container dash-grid">
          <a routerLink="/my-bookings" class="dash-card">
            <h2>Booking history</h2>
            <p>View upcoming and past sessions. Cancel when eligible.</p>
            <span class="dash-stat" *ngIf="!loading">{{ upcomingCount }} upcoming</span>
          </a>
          <a routerLink="/my-payments" class="dash-card">
            <h2>Payment history</h2>
            <p>Track receipts, verification status, and downloads.</p>
            <span class="dash-stat" *ngIf="!loading">{{ pendingPayments }} awaiting action</span>
          </a>
          <a routerLink="/profile" class="dash-card">
            <h2>Profile</h2>
            <p>Update your contact details and account info.</p>
          </a>
          <a routerLink="/booking" class="dash-card primary">
            <h2>Book training</h2>
            <p>Choose a course, branch, and available slot.</p>
          </a>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .dash-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1rem;
    }
    .dash-card {
      display: block;
      padding: 1.25rem 1.35rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-card);
      text-decoration: none;
      color: inherit;
      transition: border-color 0.15s ease, transform 0.15s ease;
    }
    .dash-card:hover {
      border-color: var(--color-primary);
      transform: translateY(-2px);
    }
    .dash-card.primary {
      border-color: rgba(37, 99, 235, 0.35);
      background: rgba(37, 99, 235, 0.04);
    }
    .dash-card h2 {
      margin: 0 0 0.4rem;
      font-size: 1.15rem;
    }
    .dash-card p {
      margin: 0;
      color: var(--color-muted);
      font-size: 0.9rem;
      line-height: 1.45;
    }
    .dash-stat {
      display: inline-block;
      margin-top: 0.85rem;
      font-size: 0.8rem;
      font-weight: 600;
      color: var(--color-primary);
    }
    .section-title {
      margin: 0 0 1rem;
      font-size: 1.25rem;
    }
    .progress-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1rem;
    }
    .progress-card {
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      background: var(--color-card);
      padding: 1.1rem 1.25rem;
    }
    .progress-card h3 {
      margin: 0 0 0.75rem;
      font-size: 1.05rem;
    }
    .progress-meta {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.5rem 1rem;
      margin: 0;
    }
    .progress-meta dt {
      font-size: 0.72rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-muted);
    }
    .progress-meta dd {
      margin: 0.1rem 0 0;
      font-size: 0.9rem;
    }
  `]
})
export class CustomerDashboardComponent implements OnInit {
  displayName = '';
  loading = true;
  upcomingCount = 0;
  pendingPayments = 0;
  progressRows: any[] = [];

  constructor(
    private api: ApiService,
    private payments: PaymentService,
    private auth: AuthService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    const profile = this.auth.getUserProfile();
    this.displayName = profile?.full_name || profile?.email || '';
    try {
      const [bookings, paymentRows, progress] = await Promise.all([
        firstValueFrom(this.api.getMyBookings()).catch(() => []),
        this.payments.myPayments().catch(() => [] as Payment[]),
        firstValueFrom(this.api.getMyProgress()).catch(() => ({ enrollments: [] }))
      ]);
      const list = Array.isArray(bookings) ? bookings : [];
      this.upcomingCount = list.filter((b: any) =>
        ['pending_payment', 'confirmed', 'pending'].includes(b.status)
      ).length;
      this.pendingPayments = paymentRows.filter((p) =>
        ['pending_upload', 'pending_verification', 'rejected'].includes(p.status)
      ).length;
      this.progressRows = Array.isArray(progress?.enrollments) ? progress.enrollments : [];
    } catch {
      this.toast.error('Could not load dashboard summary');
    } finally {
      this.loading = false;
    }
  }

  formatStatus(value?: string): string {
    if (!value) return '—';
    return String(value).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatDate(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
  }
}
