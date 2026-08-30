import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Payment, PaymentService } from '../../services/payment.service';
import { ToastService } from '../../services/toast.service';
type StatusFilter = 'all' | Payment['status'];

@Component({
  selector: 'app-my-payments',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <div class="portal-page my-payments-page">
      <div class="portal-head">
        <div>
          <p class="ks-eyebrow">Customer portal</p>
          <h1>My Payments</h1>
          <p class="sub">Receipts, verification status, and invoices for your bookings.</p>
        </div>
        <a routerLink="/account" class="btn-ghost">Back to dashboard</a>
      </div>

      <div class="filter-chips" role="tablist" aria-label="Filter by status">
        <button
          type="button"
          *ngFor="let chip of statusChips"
          class="chip"
          [class.active]="statusFilter === chip.value"
          (click)="statusFilter = chip.value">
          {{ chip.label }}
          <span class="chip-count" *ngIf="chip.value !== 'all'">{{ countByStatus(chip.value) }}</span>
        </button>
      </div>

      <div class="portal-skeleton" *ngIf="loading" aria-busy="true" aria-label="Loading payments">
        <div class="portal-skel-card" *ngFor="let _ of [1,2,3]"></div>
      </div>

      <div class="portal-empty" *ngIf="!loading && !payments.length">
        <h3>No payments yet</h3>
        <p>When you book a session, payment records will appear here.</p>
        <a routerLink="/booking" class="btn-primary">Book a session</a>
      </div>

      <div class="portal-empty" *ngIf="!loading && payments.length && !filteredPayments.length">
        <h3>No matching payments</h3>
        <p>Try another status filter.</p>
      </div>

      <div class="pay-table-wrap" *ngIf="!loading && filteredPayments.length">
        <table class="pay-table">
          <thead>
            <tr>
              <th>Amount</th>
              <th>Date</th>
              <th>Booking ref</th>
              <th>Method</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of filteredPayments">
              <td class="amount">₹{{ p.amount }}</td>
              <td>{{ formatDate(p.created_at) }}</td>
              <td class="ref">{{ p.booking_reference || shortId(p.booking_id) }}</td>
              <td>{{ paymentMethod(p) }}</td>
              <td><span class="status-badge" [class]="'status-' + p.status">{{ formatStatus(p.status) }}</span></td>
              <td class="actions">
                <button
                  type="button"
                  class="btn-ghost"
                  (click)="printInvoice(p)">
                  Invoice
                </button>
                <button
                  type="button"
                  class="btn-ghost"
                  *ngIf="p.receipt_path"
                  (click)="downloadReceipt(p)"
                  [disabled]="downloadingId === p.id">
                  {{ downloadingId === p.id ? 'Opening…' : 'Receipt file' }}
                </button>
                <a
                  class="btn-primary-sm"
                  *ngIf="p.status === 'pending_upload' || p.status === 'rejected'"
                  routerLink="/booking"
                  [queryParams]="{ resumePayment: p.id }">
                  Upload receipt
                </a>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="pay-cards-mobile">
          <article class="portal-card pay-card" *ngFor="let p of filteredPayments">
            <div class="pay-card-top">
              <strong class="amount">₹{{ p.amount }}</strong>
              <span class="status-badge" [class]="'status-' + p.status">{{ formatStatus(p.status) }}</span>
            </div>
            <dl class="facts">
              <div><dt>Date</dt><dd>{{ formatDate(p.created_at) }}</dd></div>
              <div><dt>Booking ref</dt><dd class="ref">{{ p.booking_reference || shortId(p.booking_id) }}</dd></div>
              <div><dt>Method</dt><dd>{{ paymentMethod(p) }}</dd></div>
              <div *ngIf="p.course_name"><dt>Course</dt><dd>{{ p.course_name }}</dd></div>
              <div *ngIf="p.branch_name"><dt>Branch</dt><dd>{{ p.branch_name }}</dd></div>
              <div *ngIf="p.rejection_reason"><dt>Reason</dt><dd>{{ p.rejection_reason }}</dd></div>
            </dl>
            <div class="pay-actions">
              <button type="button" class="btn-ghost" (click)="printInvoice(p)">Invoice</button>
              <button
                type="button"
                class="btn-ghost"
                *ngIf="p.receipt_path"
                (click)="downloadReceipt(p)"
                [disabled]="downloadingId === p.id">
                {{ downloadingId === p.id ? 'Opening…' : 'Receipt file' }}
              </button>
              <a
                class="btn-primary-sm"
                *ngIf="p.status === 'pending_upload' || p.status === 'rejected'"
                routerLink="/booking"
                [queryParams]="{ resumePayment: p.id }">
                Upload receipt
              </a>
            </div>
          </article>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-payments-page { animation: ks-fade-up 0.4s ease both; }
    .portal-head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    .portal-head h1 {
      margin: 0.25rem 0 0.35rem;
      font-size: var(--text-display-md);
      font-weight: 700;
    }
    .sub { margin: 0; color: var(--color-muted); }
    .filter-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 1.25rem;
    }
    .chip {
      min-height: 36px;
      padding: 0.35rem 0.85rem;
      border-radius: 999px;
      border: 1px solid var(--color-border);
      background: var(--color-card);
      color: var(--color-muted);
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .chip.active {
      background: rgba(37, 99, 235, 0.08);
      border-color: rgba(37, 99, 235, 0.35);
      color: var(--color-primary);
    }
    .chip-count {
      font-size: 0.7rem;
      opacity: 0.75;
    }
    .portal-skeleton { display: grid; gap: 0.85rem; }
    .portal-skel-card {
      height: 88px;
      border-radius: var(--radius-lg);
      background: linear-gradient(90deg, var(--color-border) 25%, var(--color-card) 50%, var(--color-border) 75%);
      background-size: 200% 100%;
      animation: skel 1.2s ease infinite;
    }
    @keyframes skel {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .btn-primary, .btn-primary-sm {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--color-primary);
      color: #fff !important;
      text-decoration: none;
      border-radius: var(--radius-md);
      font-weight: 600;
      border: none;
      cursor: pointer;
    }
    .btn-primary { min-height: 44px; padding: 0.65rem 1.15rem; }
    .btn-primary-sm { min-height: 36px; padding: 0.4rem 0.85rem; font-size: 0.8rem; }
    .btn-ghost {
      min-height: 36px;
      padding: 0.4rem 0.85rem;
      border-radius: 8px;
      border: 1px solid var(--color-border);
      background: var(--color-bg, #f4f6f8);
      color: var(--color-ink);
      font-weight: 600;
      font-size: 0.8rem;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
    }
    .pay-table-wrap { overflow-x: auto; }
    .pay-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-card);
      border: 1px solid var(--color-border);
      border-radius: var(--radius-lg);
      overflow: hidden;
    }
    .pay-table th, .pay-table td {
      padding: 0.85rem 1rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
      font-size: 0.875rem;
      vertical-align: middle;
    }
    .pay-table th {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--color-muted);
      background: var(--color-bg, #f8fafc);
    }
    .pay-table tr:last-child td { border-bottom: none; }
    .amount { font-weight: 700; }
    .ref { font-family: ui-monospace, monospace; font-size: 0.8rem; color: var(--color-primary); }
    .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; justify-content: flex-end; }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .status-verified { background: #d1fae5; color: #065f46; }
    .status-pending_upload, .status-pending_verification { background: #fef3c7; color: #92400e; }
    .status-rejected { background: #fee2e2; color: #991b1b; }
    .pay-cards-mobile { display: none; gap: 0.85rem; }
    .pay-card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.85rem;
    }
    .facts {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.55rem;
      margin: 0 0 1rem;
    }
    .facts dt {
      font-size: 0.7rem;
      font-weight: 600;
      text-transform: uppercase;
      color: var(--color-muted);
      margin: 0 0 0.1rem;
    }
    .facts dd { margin: 0; font-size: 0.875rem; }
    .pay-actions { display: flex; flex-wrap: wrap; gap: 0.45rem; }
    @media (max-width: 800px) {
      .pay-table { display: none; }
      .pay-cards-mobile { display: grid; }
    }
  `]
})
export class MyPaymentsComponent implements OnInit {
  payments: Payment[] = [];
  loading = true;
  downloadingId = '';
  statusFilter: StatusFilter = 'all';

  statusChips: Array<{ label: string; value: StatusFilter }> = [
    { label: 'All', value: 'all' },
    { label: 'Pending upload', value: 'pending_upload' },
    { label: 'Pending verification', value: 'pending_verification' },
    { label: 'Verified', value: 'verified' },
    { label: 'Rejected', value: 'rejected' }
  ];

  constructor(
    private paymentsApi: PaymentService,
    private toast: ToastService
  ) {}

  get filteredPayments(): Payment[] {
    if (this.statusFilter === 'all') return this.payments;
    return this.payments.filter((p) => p.status === this.statusFilter);
  }

  async ngOnInit() {
    try {
      this.payments = await this.paymentsApi.myPayments();
    } catch {
      this.toast.error('Failed to load payments');
    } finally {
      this.loading = false;
    }
  }

  countByStatus(status: StatusFilter): number {
    if (status === 'all') return this.payments.length;
    return this.payments.filter((p) => p.status === status).length;
  }

  formatStatus(status: string): string {
    return status.replace(/_/g, ' ');
  }

  paymentMethod(p: Payment): string {
    if (p.method) return p.method;
    if (p.receipt_path || p.reference_number) return 'UPI';
    return 'Manual';
  }

  formatDate(iso?: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  shortId(id: string): string {
    return id ? id.slice(0, 8) : '—';
  }

  printInvoice(p: Payment) {
    const win = window.open('', '_blank', 'noopener,noreferrer,width=720,height=900');
    if (!win) {
      this.toast.error('Please allow pop-ups to print the invoice.');
      return;
    }
    const ref = p.booking_reference || this.shortId(p.booking_id);
    const html = `<!DOCTYPE html><html><head><title>Invoice ${ref}</title>
      <style>
        body{font-family:Georgia,serif;padding:40px;color:#111;max-width:640px;margin:0 auto}
        h1{font-size:1.4rem;margin:0 0 4px} .muted{color:#666;font-size:0.9rem}
        table{width:100%;border-collapse:collapse;margin-top:24px}
        th,td{text-align:left;padding:10px 0;border-bottom:1px solid #e5e7eb;font-size:0.95rem}
        th{color:#666;font-weight:600;width:40%}
        .foot{margin-top:32px;font-size:0.85rem;color:#666}
        @media print{button{display:none}}
      </style></head><body>
      <img src="${typeof window !== 'undefined' ? window.location.origin : ''}/assets/brand/logo.svg" alt="Kolkata Scooty Bike Training" style="height:40px;margin-bottom:12px" />
      <h1>Kolkata Scooty Bike Training</h1>
      <p class="muted">Payment invoice</p>
      <table>
        <tr><th>Amount</th><td>₹${p.amount} ${p.currency || 'INR'}</td></tr>
        <tr><th>Date</th><td>${this.formatDate(p.created_at)}</td></tr>
        <tr><th>Booking ref</th><td>${ref}</td></tr>
        <tr><th>Method</th><td>${this.paymentMethod(p)}</td></tr>
        <tr><th>Status</th><td>${this.formatStatus(p.status)}</td></tr>
        ${p.reference_number ? `<tr><th>UPI / txn ref</th><td>${p.reference_number}</td></tr>` : ''}
        ${p.course_name ? `<tr><th>Course</th><td>${p.course_name}</td></tr>` : ''}
        ${p.branch_name ? `<tr><th>Branch</th><td>${p.branch_name}</td></tr>` : ''}
      </table>
      <p class="foot">Generated ${new Date().toLocaleString('en-IN')} · Kolkata Scooty Bike Training</p>
      <button onclick="window.print()">Print</button>
      <script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
      </body></html>`;
    win.document.write(html);
    win.document.close();
  }

  async downloadReceipt(payment: Payment) {
    this.downloadingId = payment.id;
    try {
      await this.paymentsApi.openReceipt(payment);
    } catch (e: any) {
      this.toast.error(e?.message || 'Could not open receipt');
    } finally {
      this.downloadingId = '';
    }
  }
}
