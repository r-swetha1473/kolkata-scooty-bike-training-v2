import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ToastService } from '../../services/toast.service';
import {
  extractDateFromDateTime,
  extractTime,
  formatTimeToAMPM,
  isPastDateTime,
  calculateDurationMinutes
} from '../../utils/date.utils';

export interface BookingRow {
  id: string;
  slot_id: string;
  trainer_id: string;
  booking_reference?: string;
  status: 'pending' | 'pending_payment' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  notes?: string;
  start_time: string;
  end_time: string;
  slot_date?: string;
  formatted_slot_time?: string;
  trainer_name: string;
  trainer_avatar?: string;
  vehicle_name?: string;
  vehicle_type?: string;
  branch_name?: string;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
  payment_id?: string;
  payment_reference?: string;
  payment_receipt_path?: string;
  created_at: string;
  cancellation_reason?: string;
  cancelled_at?: string;
}

@Component({
  selector: 'app-my-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="portal-page my-bookings-page">
      <div class="portal-head">
        <div>
          <p class="ks-eyebrow">Customer portal</p>
          <h1>My Bookings</h1>
          <p class="sub">Upcoming and past sessions for your account.</p>
        </div>
        <a routerLink="/booking" class="btn-primary">Book a slot</a>
      </div>

      <div *ngIf="loading" class="portal-skeleton" aria-busy="true" aria-label="Loading bookings">
        <div class="portal-skel-card" *ngFor="let _ of [1,2,3]"></div>
      </div>

      <div *ngIf="loadError" class="load-error" role="alert">
        {{ loadError }}
        <button type="button" class="btn-retry" (click)="retryLoad()">Try again</button>
      </div>

      <div *ngIf="!loading && !loadError && bookings.length === 0" class="portal-empty">
        <h3>No bookings yet</h3>
        <p>Book a training slot to see it listed here.</p>
        <a routerLink="/booking" class="btn-primary">Book a Slot</a>
      </div>

      <ng-container *ngIf="!loading && !loadError && bookings.length > 0">
        <section *ngIf="getUpcomingBookings().length" class="portal-section">
          <h2 class="section-title">Upcoming</h2>
          <article
            class="portal-card booking-card"
            *ngFor="let b of getUpcomingBookings()"
            [class.expanded]="expandedId === b.id">
            <div class="card-top">
              <div class="card-title-block">
                <h3>{{ b.vehicle_name || 'Training session' }}</h3>
                <p class="meta-line" *ngIf="b.booking_reference">Ref {{ b.booking_reference }}</p>
              </div>
              <span class="status-badge" [class]="'status-' + b.status">{{ formatStatus(b.status) }}</span>
            </div>

            <div class="timeline" aria-label="Booking progress">
              <span
                *ngFor="let step of timelineSteps(b)"
                class="tl-step"
                [class.done]="step.done"
                [class.current]="step.current"
                [class.cancelled]="step.cancelled">
                {{ step.label }}
              </span>
            </div>

            <dl class="facts">
              <div><dt>Vehicle</dt><dd>{{ b.vehicle_name || '—' }}<span *ngIf="b.vehicle_type"> ({{ b.vehicle_type }})</span></dd></div>
              <div><dt>Trainer</dt><dd>{{ b.trainer_name }}</dd></div>
              <div *ngIf="b.branch_name"><dt>Branch</dt><dd>{{ b.branch_name }}</dd></div>
              <div><dt>Date</dt><dd>{{ formatDateOnly(b) }}</dd></div>
              <div><dt>Time</dt><dd>{{ formatTimeOnly(b) }}</dd></div>
              <div *ngIf="b.payment_status"><dt>Payment</dt><dd>{{ formatStatus(b.payment_status) }}</dd></div>
              <div><dt>Status</dt><dd>{{ formatStatus(b.status) }}</dd></div>
            </dl>

            <div class="detail-panel" *ngIf="expandedId === b.id">
              <div class="detail-row"><span>Duration</span><span>{{ formatDuration(b.start_time, b.end_time) }}</span></div>
              <div class="detail-row" *ngIf="b.notes"><span>Notes</span><span>{{ b.notes }}</span></div>
              <div class="detail-row" *ngIf="b.payment_amount != null"><span>Amount</span><span>₹{{ b.payment_amount }}</span></div>
              <div class="detail-row" *ngIf="b.payment_reference"><span>Payment ref</span><span>{{ b.payment_reference }}</span></div>
              <div class="detail-row" *ngIf="b.cancellation_reason"><span>Cancel reason</span><span>{{ b.cancellation_reason }}</span></div>
            </div>

            <div class="booking-actions">
              <button type="button" class="btn-ghost" (click)="toggleView(b)">
                {{ expandedId === b.id ? 'Hide' : 'View' }}
              </button>
              <button
                *ngIf="hasInvoice(b)"
                type="button"
                class="btn-ghost"
                (click)="printInvoice(b)">
                Invoice
              </button>
              <button
                *ngIf="canCancelBooking(b)"
                type="button"
                class="btn-cancel"
                (click)="openCancel(b)">
                Cancel
              </button>
              <a
                *ngIf="canRequestReschedule(b)"
                class="btn-ghost"
                [routerLink]="['/contact']"
                [queryParams]="{ subject: 'Reschedule request', booking: b.id }">
                Reschedule
              </a>
              <button
                *ngIf="canRateBooking(b)"
                type="button"
                class="btn-ghost"
                (click)="openRate(b)">
                Rate class
              </button>
            </div>
          </article>
        </section>

        <section *ngIf="getPastBookings().length" class="portal-section">
          <h2 class="section-title">Past</h2>
          <article
            class="portal-card booking-card past"
            *ngFor="let b of getPastBookings()"
            [class.expanded]="expandedId === b.id">
            <div class="card-top">
              <div class="card-title-block">
                <h3>{{ b.vehicle_name || 'Training session' }}</h3>
                <p class="meta-line" *ngIf="b.booking_reference">Ref {{ b.booking_reference }}</p>
              </div>
              <span class="status-badge" [class]="'status-' + b.status">{{ formatStatus(b.status) }}</span>
            </div>

            <div class="timeline" aria-label="Booking progress">
              <span
                *ngFor="let step of timelineSteps(b)"
                class="tl-step"
                [class.done]="step.done"
                [class.current]="step.current"
                [class.cancelled]="step.cancelled">
                {{ step.label }}
              </span>
            </div>

            <dl class="facts">
              <div><dt>Vehicle</dt><dd>{{ b.vehicle_name || '—' }}<span *ngIf="b.vehicle_type"> ({{ b.vehicle_type }})</span></dd></div>
              <div><dt>Trainer</dt><dd>{{ b.trainer_name }}</dd></div>
              <div *ngIf="b.branch_name"><dt>Branch</dt><dd>{{ b.branch_name }}</dd></div>
              <div><dt>Date</dt><dd>{{ formatDateOnly(b) }}</dd></div>
              <div><dt>Time</dt><dd>{{ formatTimeOnly(b) }}</dd></div>
              <div *ngIf="b.payment_status"><dt>Payment</dt><dd>{{ formatStatus(b.payment_status) }}</dd></div>
              <div><dt>Status</dt><dd>{{ formatStatus(b.status) }}</dd></div>
            </dl>

            <div class="detail-panel" *ngIf="expandedId === b.id">
              <div class="detail-row"><span>Duration</span><span>{{ formatDuration(b.start_time, b.end_time) }}</span></div>
              <div class="detail-row" *ngIf="b.notes"><span>Notes</span><span>{{ b.notes }}</span></div>
              <div class="detail-row" *ngIf="b.payment_amount != null"><span>Amount</span><span>₹{{ b.payment_amount }}</span></div>
              <div class="detail-row" *ngIf="b.payment_reference"><span>Payment ref</span><span>{{ b.payment_reference }}</span></div>
              <div class="detail-row" *ngIf="b.cancellation_reason"><span>Cancel reason</span><span>{{ b.cancellation_reason }}</span></div>
            </div>

            <div class="booking-actions">
              <button type="button" class="btn-ghost" (click)="toggleView(b)">
                {{ expandedId === b.id ? 'Hide' : 'View' }}
              </button>
              <button
                *ngIf="hasInvoice(b)"
                type="button"
                class="btn-ghost"
                (click)="printInvoice(b)">
                Invoice
              </button>
              <button
                *ngIf="canCancelBooking(b)"
                type="button"
                class="btn-cancel"
                (click)="openCancel(b)">
                Cancel
              </button>
              <button
                *ngIf="canRateBooking(b)"
                type="button"
                class="btn-ghost"
                (click)="openRate(b)">
                Rate class
              </button>
            </div>
          </article>
        </section>
      </ng-container>

      <div *ngIf="cancelOpen" class="modal-overlay" (click)="closeCancel()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Cancel booking</h3>
          <p>Are you sure you want to cancel?</p>
          <label class="sr-only" for="cancelReason">Reason (optional)</label>
          <textarea
            id="cancelReason"
            [(ngModel)]="cancelReason"
            rows="3"
            placeholder="Reason (optional)"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="closeCancel()">Keep booking</button>
            <button type="button" class="btn-danger" (click)="confirmCancel()" [disabled]="cancelling">
              {{ cancelling ? 'Cancelling…' : 'Cancel' }}
            </button>
          </div>
        </div>
      </div>

      <div *ngIf="rateOpen" class="modal-overlay" (click)="closeRate()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <h3>Rate your class</h3>
          <div class="stars">
            <button
              type="button"
              *ngFor="let star of [1, 2, 3, 4, 5]"
              class="star-btn"
              [class.active]="star <= ratingValue"
              (click)="ratingValue = star">
              {{ star <= ratingValue ? '★' : '☆' }}
            </button>
            <span class="rating-value">{{ ratingValue }} / 5</span>
          </div>
          <textarea rows="3" [(ngModel)]="ratingComments" placeholder="Comments (optional)"></textarea>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" (click)="closeRate()">Close</button>
            <button type="button" class="btn-danger" (click)="submitRating()">Submit</button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .my-bookings-page { animation: ks-fade-up 0.4s ease both; }
      .portal-head {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-end;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.75rem;
      }
      .portal-head h1 {
        margin: 0.25rem 0 0.35rem;
        font-size: var(--text-display-md);
        font-weight: 700;
        color: var(--color-ink);
      }
      .sub { margin: 0; color: var(--color-muted); }
      .btn-primary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 44px;
        padding: 0.65rem 1.15rem;
        background: var(--color-primary);
        color: #fff !important;
        text-decoration: none;
        border-radius: var(--radius-md);
        font-weight: 600;
        font-size: var(--text-btn);
        border: none;
        cursor: pointer;
      }
      .portal-skeleton { display: grid; gap: 0.85rem; }
      .portal-skel-card {
        height: 140px;
        border-radius: var(--radius-lg);
        background: linear-gradient(90deg, var(--color-border) 25%, var(--color-card) 50%, var(--color-border) 75%);
        background-size: 200% 100%;
        animation: skel 1.2s ease infinite;
      }
      @keyframes skel {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .load-error {
        background: rgba(192, 57, 43, 0.08);
        border: 1px solid rgba(192, 57, 43, 0.25);
        color: var(--ks-error, #C0392B);
        padding: 1.25rem;
        border-radius: var(--radius-md);
        margin-bottom: 1.25rem;
        text-align: center;
      }
      .btn-retry {
        display: block;
        margin: 12px auto 0;
        padding: 8px 16px;
        border-radius: 8px;
        border: 1px solid currentColor;
        background: white;
        color: inherit;
        font-weight: 600;
        cursor: pointer;
      }
      .section-title {
        font-size: var(--text-body-lg);
        font-weight: 600;
        margin: 0 0 0.85rem;
        color: var(--color-ink);
      }
      .portal-section + .portal-section { margin-top: 2rem; }
      .booking-card { margin-bottom: 0.85rem; }
      .booking-card.past { opacity: 0.92; }
      .card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 0.75rem;
        margin-bottom: 0.85rem;
      }
      .card-title-block h3 {
        margin: 0;
        font-size: 1.05rem;
        font-weight: 650;
      }
      .meta-line {
        margin: 0.2rem 0 0;
        font-size: 0.8rem;
        font-family: ui-monospace, monospace;
        color: var(--color-primary);
      }
      .status-badge {
        padding: 4px 10px;
        border-radius: 999px;
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .status-confirmed, .status-verified { background: #dbeafe; color: #1e40af; }
      .status-pending, .status-pending_payment, .status-pending_upload, .status-pending_verification {
        background: #fef3c7; color: #92400e;
      }
      .status-completed { background: #d1fae5; color: #065f46; }
      .status-cancelled, .status-rejected { background: #fee2e2; color: #991b1b; }
      .status-no_show { background: #f3f4f6; color: #374151; }
      .timeline {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
        margin-bottom: 1rem;
      }
      .tl-step {
        font-size: 0.7rem;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        padding: 0.3rem 0.55rem;
        border-radius: 6px;
        background: var(--color-bg, #f4f6f8);
        color: var(--color-muted);
        border: 1px solid var(--color-border);
      }
      .tl-step.done { background: #ecfdf5; color: #065f46; border-color: #a7f3d0; }
      .tl-step.current { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
      .tl-step.cancelled { background: #fef2f2; color: #991b1b; border-color: #fecaca; }
      .facts {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 0.65rem 1rem;
        margin: 0;
      }
      .facts div { margin: 0; }
      .facts dt {
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--color-muted);
        margin: 0 0 0.15rem;
      }
      .facts dd { margin: 0; font-size: 0.9rem; color: var(--color-ink); }
      .detail-panel {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--color-border);
        display: grid;
        gap: 0.45rem;
      }
      .detail-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        font-size: 0.875rem;
      }
      .detail-row span:first-child { color: var(--color-muted); font-weight: 600; }
      .booking-actions {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--color-border);
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
      }
      .btn-ghost, .btn-cancel {
        min-height: 40px;
        padding: 0.45rem 0.9rem;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        cursor: pointer;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
      }
      .btn-ghost {
        background: var(--color-bg, #f4f6f8);
        color: var(--color-ink);
        border: 1px solid var(--color-border);
      }
      .btn-cancel {
        background: #fee2e2;
        color: #991b1b;
        border: none;
      }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 16px;
      }
      .modal-content {
        background: white;
        border-radius: 12px;
        padding: 24px;
        max-width: 440px;
        width: 100%;
      }
      .modal-content h3 { margin-top: 0; }
      .modal-content textarea {
        width: 100%;
        margin: 12px 0;
        padding: 10px;
        border: 2px solid var(--border-primary, var(--color-border));
        border-radius: 8px;
        font-family: inherit;
      }
      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 12px;
      }
      .btn-secondary {
        padding: 8px 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg);
        cursor: pointer;
      }
      .btn-danger {
        padding: 8px 16px;
        border: none;
        border-radius: 8px;
        background: #dc2626;
        color: white;
        cursor: pointer;
      }
      .stars {
        display: flex;
        align-items: center;
        gap: 6px;
        margin: 12px 0;
      }
      .star-btn {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        padding: 0;
        color: #d1d5db;
      }
      .star-btn.active { color: #f59e0b; }
      .rating-value { margin-left: 8px; font-weight: 600; }
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
      }
      @media (max-width: 768px) {
        .modal-actions { flex-direction: column-reverse; }
        .modal-actions button { width: 100%; }
      }
    `
  ]
})
export class MyBookingsComponent implements OnInit {
  bookings: BookingRow[] = [];
  loading = false;
  loadError: string | null = null;
  cancelOpen = false;
  rateOpen = false;
  selected: BookingRow | null = null;
  cancelReason = '';
  cancelling = false;
  ratingValue = 5;
  ratingComments = '';
  expandedId: string | null = null;

  constructor(
    private apiService: ApiService,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    await this.retryLoad();
  }

  async retryLoad() {
    this.loading = true;
    this.loadError = null;
    try {
      await this.loadBookings();
    } catch (e: any) {
      const status = e?.status;
      if (status === 401) {
        this.loadError = 'Please sign in again to view your bookings.';
      } else {
        this.loadError =
          e?.error?.message || e?.message || 'Could not load bookings. Check your connection and try again.';
      }
      this.bookings = [];
    } finally {
      this.loading = false;
    }
  }

  async loadBookings() {
    const raw = await firstValueFrom(this.apiService.getMyBookings());
    this.bookings = (raw || []).map((b: any) => ({
      id: b.id,
      slot_id: b.slot_id,
      trainer_id: b.trainer_id,
      booking_reference: b.booking_reference,
      status: b.status,
      notes: b.notes || '',
      start_time: b.start_time || b.slot_time || b.booking_datetime,
      end_time: b.end_time,
      slot_date: b.slot_date,
      formatted_slot_time: b.formatted_slot_time,
      trainer_name: b.trainer_name || 'Trainer',
      trainer_avatar: b.trainer_avatar,
      vehicle_name: b.vehicle_name || '',
      vehicle_type: b.vehicle_type || '',
      branch_name: b.branch_name || '',
      payment_status: b.payment_status || undefined,
      payment_amount: b.payment_amount != null ? Number(b.payment_amount) : undefined,
      payment_currency: b.payment_currency || 'INR',
      payment_id: b.payment_id || undefined,
      payment_reference: b.payment_reference || undefined,
      payment_receipt_path: b.payment_receipt_path || undefined,
      created_at: b.created_at || new Date().toISOString(),
      cancellation_reason: b.cancellation_reason,
      cancelled_at: b.cancelled_at
    }));
  }

  isPastBooking(b: BookingRow): boolean {
    return isPastDateTime(b.start_time);
  }

  getUpcomingBookings(): BookingRow[] {
    return this.bookings.filter(
      (b) => !this.isPastBooking(b) && b.status !== 'cancelled' && b.status !== 'completed'
    );
  }

  getPastBookings(): BookingRow[] {
    return this.bookings.filter(
      (b) => this.isPastBooking(b) || b.status === 'completed' || b.status === 'cancelled'
    );
  }

  canCancelBooking(b: BookingRow): boolean {
    if (b.status === 'cancelled' || b.status === 'completed') return false;
    return !isPastDateTime(b.start_time);
  }

  canRequestReschedule(b: BookingRow): boolean {
    return b.status === 'confirmed' && !isPastDateTime(b.start_time);
  }

  canRateBooking(b: BookingRow): boolean {
    return b.status === 'completed';
  }

  hasInvoice(b: BookingRow): boolean {
    return !!(b.payment_id || b.payment_status || b.payment_amount != null || b.payment_reference);
  }

  formatStatus(status: string): string {
    return (status || '').replace(/_/g, ' ');
  }

  formatDateOnly(b: BookingRow): string {
    const iso = b.start_time;
    const date = b.slot_date || extractDateFromDateTime(iso);
    if (!date) return '—';
    const [y, m, d] = date.split('-').map(Number);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dateObj = new Date(Date.UTC(y, m - 1, d));
    return `${days[dateObj.getUTCDay()]}, ${months[m - 1]} ${d}, ${y}`;
  }

  formatTimeOnly(b: BookingRow): string {
    if (b.formatted_slot_time) {
      const parts = b.formatted_slot_time.split(',').map((s) => s.trim());
      return parts[parts.length - 1] || b.formatted_slot_time;
    }
    const time = extractTime(b.start_time);
    return time ? formatTimeToAMPM(time) : '—';
  }

  formatDuration(start: string, end: string): string {
    return `${calculateDurationMinutes(start, end)} minutes`;
  }

  timelineSteps(b: BookingRow): Array<{ label: string; done: boolean; current: boolean; cancelled?: boolean }> {
    if (b.status === 'cancelled') {
      return [
        { label: 'Booked', done: true, current: false },
        { label: 'Cancelled', done: false, current: true, cancelled: true }
      ];
    }
    const booked = true;
    const confirmed = ['confirmed', 'completed'].includes(b.status);
    const completed = b.status === 'completed';
    return [
      { label: 'Booked', done: booked && (confirmed || completed || b.status === 'pending' || b.status === 'pending_payment'), current: b.status === 'pending' || b.status === 'pending_payment' },
      { label: 'Confirmed', done: confirmed || completed, current: b.status === 'confirmed' },
      { label: 'Completed', done: completed, current: completed }
    ];
  }

  toggleView(b: BookingRow) {
    this.expandedId = this.expandedId === b.id ? null : b.id;
  }

  printInvoice(b: BookingRow) {
    const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!win) {
      this.toastService.error('Please allow pop-ups to print the invoice.');
      return;
    }
    const html = `<!DOCTYPE html><html><head><title>Invoice ${b.booking_reference || b.id}</title>
      <style>
        body{font-family:Georgia,serif;padding:40px;color:#111;max-width:640px;margin:0 auto}
        h1{font-size:1.4rem;margin:0 0 4px} .muted{color:#666;font-size:0.9rem}
        table{width:100%;border-collapse:collapse;margin-top:24px}
        th,td{text-align:left;padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:0.95rem}
        th{color:#666;font-weight:600;width:40%}
        .foot{margin-top:32px;font-size:0.85rem;color:#666}
        @media print{button{display:none}}
      </style></head><body>
      <h1>Kolkata Scooty Bike Training</h1>
      <p class="muted">Payment receipt / invoice</p>
      <table>
        <tr><th>Booking ref</th><td>${b.booking_reference || b.id}</td></tr>
        <tr><th>Date</th><td>${this.formatDateOnly(b)}</td></tr>
        <tr><th>Time</th><td>${this.formatTimeOnly(b)}</td></tr>
        <tr><th>Vehicle</th><td>${b.vehicle_name || '—'}${b.vehicle_type ? ' (' + b.vehicle_type + ')' : ''}</td></tr>
        <tr><th>Trainer</th><td>${b.trainer_name}</td></tr>
        ${b.branch_name ? `<tr><th>Branch</th><td>${b.branch_name}</td></tr>` : ''}
        <tr><th>Booking status</th><td>${this.formatStatus(b.status)}</td></tr>
        ${b.payment_status ? `<tr><th>Payment status</th><td>${this.formatStatus(b.payment_status)}</td></tr>` : ''}
        ${b.payment_amount != null ? `<tr><th>Amount</th><td>₹${b.payment_amount} ${b.payment_currency || 'INR'}</td></tr>` : ''}
        ${b.payment_reference ? `<tr><th>Payment ref</th><td>${b.payment_reference}</td></tr>` : ''}
      </table>
      <p class="foot">Generated ${new Date().toLocaleString('en-IN')} · For support contact the training centre.</p>
      <button onclick="window.print()">Print</button>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  }

  openCancel(b: BookingRow) {
    this.selected = b;
    this.cancelReason = '';
    this.cancelOpen = true;
  }

  closeCancel() {
    this.cancelOpen = false;
    this.selected = null;
  }

  async confirmCancel() {
    if (!this.selected) return;
    this.cancelling = true;
    try {
      await firstValueFrom(
        this.apiService.cancelBooking(this.selected.id, this.cancelReason)
      );
      this.closeCancel();
      try {
        await this.loadBookings();
      } catch {
        this.loadError = 'Booking was cancelled. Pull to refresh or tap Try again to update the list.';
      }
    } catch (e: any) {
      const msg = e?.error?.message || e?.message || 'Could not cancel';
      this.toastService.error(msg);
    } finally {
      this.cancelling = false;
    }
  }

  openRate(b: BookingRow) {
    this.selected = b;
    this.ratingValue = 5;
    this.ratingComments = '';
    this.rateOpen = true;
  }

  closeRate() {
    this.rateOpen = false;
    this.selected = null;
  }

  async submitRating() {
    if (!this.selected) return;
    try {
      await firstValueFrom(
        this.apiService.submitRating(this.selected.id, this.ratingValue, this.ratingComments)
      );
      this.closeRate();
      try {
        await this.loadBookings();
      } catch {
        this.loadError = 'Rating saved. Tap Try again if the list looks out of date.';
      }
    } catch (e: any) {
      this.toastService.error(e?.error?.message || 'Could not submit rating');
    }
  }
}
