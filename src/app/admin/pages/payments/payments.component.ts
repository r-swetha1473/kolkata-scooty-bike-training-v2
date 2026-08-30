import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Branch, BranchService } from '../../../services/branch.service';
import { Payment, PaymentService } from '../../../services/payment.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';

@Component({
  selector: 'app-admin-payments',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminModalComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Payment approval</h1>
            <p>Verify receipts, confirm bookings, or reject for re-upload.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-secondary" (click)="reload()" [disabled]="loading" title="Refresh (R)">
              {{ loading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </header>
        <div class="admin-filters-bar">
          <div class="admin-filters-content">
            <div class="admin-filter-group admin-search-group">
              <svg class="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="search"
                class="admin-search-input"
                [(ngModel)]="searchQuery"
                (ngModelChange)="applySearch()"
                placeholder="Search booking, customer, reference, course…"
                aria-label="Search payments" />
            </div>
            <select class="admin-select" [(ngModel)]="status" (change)="reload()" aria-label="Filter by status">
              <option value="pending">Needs attention</option>
              <option value="">All statuses</option>
              <option value="pending_verification">Pending verification</option>
              <option value="pending_upload">Pending upload</option>
              <option value="verified">Approved</option>
              <option value="partial">Partial</option>
              <option value="rejected">Rejected</option>
            </select>
            <select class="admin-select" [(ngModel)]="branchId" (change)="reload()" aria-label="Filter by branch">
              <option value="">All branches</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
            </select>
            <div class="admin-filter-spacer"></div>
            <span class="admin-cell-muted" *ngIf="!loading">{{ filteredPayments.length }} shown</span>
          </div>
        </div>
      </div>
      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
      </div>
      <div class="admin-empty-state" *ngIf="!loading && !filteredPayments.length">
        <div class="admin-empty-state-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <rect x="2" y="5" width="20" height="14" rx="2"></rect>
            <line x1="2" y1="10" x2="22" y2="10"></line>
          </svg>
        </div>
        <h3>No payments match</h3>
        <p>Try another status, branch, or search term.</p>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="resetFilters()">Reset filters</button>
      </div>
      <div class="admin-table-container admin-table-sticky" *ngIf="!loading && filteredPayments.length">
        <table class="admin-data-table admin-hide-mobile">
          <thead>
            <tr>
              <th>Booking ID</th>
              <th>Customer</th>
              <th>Branch</th>
              <th>Course</th>
              <th>Amount</th>
              <th>Method</th>
              <th>Status</th>
              <th>Reference</th>
              <th>Payment Date</th>
              <th>Proof</th>
              <th class="actions-cell sticky-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of getPaginatedPayments()">
              <td>
                <div class="admin-cell-strong">{{ p.booking_reference || shortId(p.booking_id) }}</div>
                <div class="admin-cell-muted" *ngIf="p.booking_source === 'OFFLINE'">Offline</div>
              </td>
              <td>
                <div class="admin-cell-strong">{{ customerName(p) }}</div>
                <div class="admin-cell-muted">{{ p.user_email || '—' }}</div>
              </td>
              <td>{{ p.branch_name || '—' }}</td>
              <td>{{ p.course_name || '—' }}</td>
              <td class="amount">₹{{ p.amount }}</td>
              <td>{{ formatMethod(p.payment_method) }}</td>
              <td><span class="admin-badge" [ngClass]="statusClass(p.status)">{{ labelStatus(p.status) }}</span></td>
              <td>{{ p.reference_number || '—' }}</td>
              <td>{{ formatDate(p.payment_date || p.created_at) }}</td>
              <td>
                <button
                  type="button"
                  class="admin-action-btn"
                  *ngIf="p.receipt_path"
                  (click)="openReceipt(p)"
                  title="View proof"
                  aria-label="View proof">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                  </svg>
                </button>
                <span class="admin-cell-muted" *ngIf="!p.receipt_path">—</span>
              </td>
              <td class="actions-cell sticky-actions">
                <div class="admin-action-group">
                  <button
                    type="button"
                    class="admin-action-btn success"
                    *ngIf="p.status==='pending_verification'"
                    (click)="approve(p)"
                    title="Approve payment"
                    aria-label="Approve payment">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="admin-action-btn danger"
                    *ngIf="p.status==='pending_verification'"
                    (click)="openRejectDrawer(p)"
                    title="Reject payment"
                    aria-label="Reject payment">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </button>
                  <span class="admin-cell-muted" *ngIf="p.status!=='pending_verification'">—</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="admin-mobile-cards">
          <article class="admin-mobile-card" *ngFor="let p of getPaginatedPayments()">
            <div class="card-title">{{ customerName(p) }} · ₹{{ p.amount }}</div>
            <div class="card-meta">{{ p.booking_reference || shortId(p.booking_id) }} · {{ p.course_name || '—' }}</div>
            <div class="card-meta">{{ p.branch_name || '—' }} · {{ formatMethod(p.payment_method) }}</div>
            <div class="card-meta">Ref: {{ p.reference_number || '—' }} · {{ formatDate(p.payment_date || p.created_at) }}</div>
            <span class="admin-badge" [ngClass]="statusClass(p.status)">{{ labelStatus(p.status) }}</span>
            <div class="card-actions">
              <button
                type="button"
                class="admin-action-btn"
                *ngIf="p.receipt_path"
                (click)="openReceipt(p)"
                title="View proof"
                aria-label="View proof">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                  <circle cx="12" cy="12" r="3"></circle>
                </svg>
              </button>
              <button
                type="button"
                class="admin-action-btn success"
                *ngIf="p.status==='pending_verification'"
                (click)="approve(p)"
                title="Approve payment"
                aria-label="Approve payment">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </button>
              <button
                type="button"
                class="admin-action-btn danger"
                *ngIf="p.status==='pending_verification'"
                (click)="openRejectDrawer(p)"
                title="Reject payment"
                aria-label="Reject payment">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              </button>
            </div>
          </article>
        </div>
      </div>
      <app-admin-pagination
        *ngIf="!loading && filteredPayments.length > 0"
        [currentPage]="currentPage"
        [totalPages]="getTotalPages()"
        [totalRecords]="filteredPayments.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="payments"
        (pageChange)="currentPage = $event"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>
    </div>
    <app-admin-modal
      #rejectModal
      [open]="rejectDrawerOpen"
      title="Reject payment"
      [subtitle]="customerName(rejectTarget) + ' · ₹' + (rejectTarget?.amount ?? '')"
      [dirty]="!!rejectReason.trim()"
      (closed)="closeRejectDrawer()">
      <label class="form-group">
        <span>Reason for rejection</span>
        <textarea
          class="admin-textarea"
          rows="4"
          [(ngModel)]="rejectReason"
          placeholder="Explain what the customer should fix before re-uploading…"
          maxlength="500"></textarea>
      </label>
      <p class="admin-cell-muted">The customer will be notified to upload a new receipt.</p>
      <div adminModalFooter>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="rejectModal.requestClose()">Cancel</button>
        <button type="button" class="admin-btn admin-btn-danger" (click)="confirmReject()" [disabled]="rejectSaving || !rejectReason.trim()">
          {{ rejectSaving ? 'Rejecting…' : 'Reject payment' }}
        </button>
      </div>
    </app-admin-modal>
  `,
  styles: [`
    .amount { font-weight: 700; font-variant-numeric: tabular-nums; color: var(--color-ink); }
    .form-group span { display: block; margin-bottom: var(--space-2); font-size: var(--text-body-sm); font-weight: 500; color: var(--color-ink-soft); }

    :host .admin-table-container {
      overflow-x: auto;
      overflow-y: auto;
      max-height: calc(100vh - 260px);
      -webkit-overflow-scrolling: touch;
    }

    :host .admin-data-table {
      min-width: 1100px;
    }

    :host .sticky-actions {
      position: sticky;
      right: 0;
      z-index: 4;
      background: var(--color-card, #fff);
      box-shadow: -6px 0 10px rgba(15, 23, 42, 0.06);
      white-space: nowrap;
      min-width: 5.5rem;
    }

    :host thead .sticky-actions {
      z-index: 5;
      background: var(--color-card, #fff);
    }

    :host .admin-action-group {
      display: flex;
      flex-wrap: nowrap;
      gap: 0.35rem;
      justify-content: flex-end;
    }

    :host .admin-mobile-cards .card-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.75rem;
    }
  `]
})
export class AdminPaymentsComponent implements OnInit {
  payments: Payment[] = [];
  filteredPayments: Payment[] = [];
  branches: Branch[] = [];
  status = 'pending';
  branchId = '';
  searchQuery = '';
  loading = false;
  rejectDrawerOpen = false;
  rejectTarget: Payment | null = null;
  rejectReason = '';
  rejectSaving = false;
  currentPage = 1;
  itemsPerPage = 25;
  constructor(
    private paymentsApi: PaymentService,
    private branchesApi: BranchService,
    private toast: ToastService,
    private confirm: ConfirmDialogService
  ) {}
  async ngOnInit() {
    this.branches = await this.branchesApi.list(false).catch(() => []);
    await this.reload();
  }
  customerName(p: Payment | null | undefined): string {
    if (!p) return 'Customer';
    return p.offline_customer_name || p.user_name || '—';
  }
  shortId(id?: string): string {
    if (!id) return '—';
    return String(id).slice(0, 8);
  }
  formatMethod(method?: string): string {
    if (!method) return '—';
    return String(method).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  formatDate(value?: string): string {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleDateString();
  }
  statusClass(s: string) {
    if (s === 'verified') return 'admin-badge-success';
    if (s === 'rejected' || s === 'expired') return 'admin-badge-danger';
    if (s === 'pending_verification' || s === 'partial') return 'admin-badge-warning';
    return 'admin-badge-info';
  }
  labelStatus(s: string) {
    if (s === 'verified') return 'Approved';
    return (s || '').replace(/_/g, ' ');
  }
  applySearch() {
    const q = this.searchQuery.trim().toLowerCase();
    if (!q) {
      this.filteredPayments = [...this.payments];
    } else {
      this.filteredPayments = this.payments.filter((p) =>
        [
          p.user_name,
          p.offline_customer_name,
          p.user_email,
          p.course_name,
          p.branch_name,
          p.reference_number,
          p.booking_reference,
          p.booking_id,
          p.payment_method
        ]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      );
    }
    this.currentPage = 1;
  }
  getPaginatedPayments(): Payment[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.filteredPayments.slice(start, start + this.itemsPerPage);
  }
  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredPayments.length / this.itemsPerPage));
  }
  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 25;
    this.currentPage = 1;
  }
  resetFilters() {
    this.status = 'pending';
    this.branchId = '';
    this.searchQuery = '';
    void this.reload();
  }
  async reload() {
    this.loading = true;
    try {
      this.payments = await this.paymentsApi.adminList({
        status: this.status || undefined,
        branch_id: this.branchId || undefined
      });
      this.applySearch();
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Failed to load payments');
    } finally {
      this.loading = false;
    }
  }
  async openReceipt(p: Payment) {
    try {
      await this.paymentsApi.openReceipt(p);
    } catch (e: any) {
      this.toast.error(e?.message || 'Receipt unavailable');
    }
  }
  async approve(p: Payment) {
    const ok = await this.confirm.confirm({
      title: 'Approve payment?',
      message: `Verify ₹${p.amount} for ${this.customerName(p)} and confirm their booking.`,
      confirmLabel: 'Approve',
      cancelLabel: 'Cancel',
      variant: 'success'
    });
    if (!ok) return;
    try {
      await this.paymentsApi.approve(p.id);
      this.toast.success('Payment verified — booking confirmed');
      await this.reload();
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Approve failed');
    }
  }
  openRejectDrawer(p: Payment) {
    this.rejectTarget = p;
    this.rejectReason = '';
    this.rejectDrawerOpen = true;
  }
  closeRejectDrawer() {
    this.rejectDrawerOpen = false;
    this.rejectTarget = null;
    this.rejectReason = '';
  }
  async confirmReject() {
    if (!this.rejectTarget || !this.rejectReason.trim()) {
      this.toast.error('Rejection reason is required');
      return;
    }
    this.rejectSaving = true;
    try {
      await this.paymentsApi.reject(this.rejectTarget.id, this.rejectReason.trim());
      this.toast.success('Payment rejected — customer can re-upload');
      this.closeRejectDrawer();
      await this.reload();
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Reject failed');
    } finally {
      this.rejectSaving = false;
    }
  }
}
