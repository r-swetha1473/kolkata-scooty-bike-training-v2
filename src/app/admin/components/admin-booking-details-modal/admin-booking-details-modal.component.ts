import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService } from '../../../services/admin.service';
import { PermissionService } from '../../../services/permission.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { PaymentService } from '../../../services/payment.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { categorizeVehicleName } from '../../../utils/vehicle.utils';
import { firstValueFrom } from 'rxjs';
import { AdminModalComponent } from '../admin-modal/admin-modal.component';

@Component({
  selector: 'app-admin-booking-details-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent],
  template: `
    <app-admin-modal
      #detailsModal
      [open]="open"
      title="Booking Details"
      [subtitle]="getReference()"
      [wide]="true"
      [dirty]="false"
      [hasFooter]="!loading && !!booking"
      (closed)="onModalClosed()">
      <div *ngIf="loading">
        <div class="admin-table-skeleton" aria-busy="true">
          <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
        </div>
      </div>

      <div class="booking-details-body" *ngIf="!loading && booking">
        <div class="badge-row">
          <span class="admin-badge" [class.admin-badge-success]="booking.booking_source !== 'OFFLINE'" [class.admin-badge-warning]="booking.booking_source === 'OFFLINE'">
            {{ booking.booking_source === 'OFFLINE' ? 'OFFLINE' : 'ONLINE' }}
          </span>
          <span class="admin-badge" [ngClass]="statusBadgeClass(booking.status)">{{ booking.status }}</span>
          <span class="admin-badge admin-badge-info">{{ formatAttendance(booking.attendance_status) }}</span>
          <span class="admin-badge admin-badge-danger" *ngIf="booking.slot?.capacity_exceeded">OVER CAPACITY</span>
        </div>

        <section class="detail-section">
          <h3>Reference</h3>
          <div class="detail-grid">
            <div class="full"><label>Booking reference</label><strong>{{ getReference() || '—' }}</strong></div>
          </div>
        </section>

        <section class="detail-section">
          <h3>Booking</h3>
          <div class="detail-grid">
            <div><label>Status</label><span>{{ booking.status }}</span></div>
            <div><label>Source</label><span>{{ booking.customer?.source || (booking.booking_source === 'OFFLINE' ? 'Offline' : 'Online') }}</span></div>
            <div><label>Slot</label><span>{{ formatDateTime(booking.start_time) }}</span></div>
            <div><label>Created</label><span>{{ formatDateTime(booking.created_at) }}</span></div>
          </div>
        </section>

        <section class="detail-section">
          <h3>Customer</h3>
          <div class="detail-grid">
            <div><label>Name</label><strong>{{ booking.customer?.name || getCustomerName() }}</strong></div>
            <div><label>Phone</label><span>{{ booking.customer?.phone || booking.phone || '—' }}</span></div>
            <div><label>Email</label><span>{{ booking.user_email || '—' }}</span></div>
          </div>
        </section>

        <section class="detail-section" *ngIf="booking.customer_history">
          <h3>Customer progress</h3>
          <div class="detail-grid">
            <div><label>Total bookings</label><strong>{{ booking.customer_history.total_bookings || 0 }}</strong></div>
            <div><label>Attended</label><strong>{{ booking.customer_history.attended_sessions || 0 }}</strong></div>
            <div><label>No shows</label><strong>{{ booking.customer_history.no_shows || 0 }}</strong></div>
            <div><label>Cancelled</label><strong>{{ booking.customer_history.cancelled_bookings || 0 }}</strong></div>
            <div><label>Last booking</label><span>{{ formatDateOnly(booking.customer_history.last_booking_date) }}</span></div>
            <div><label>Next booking</label><span>{{ formatDateOnly(booking.customer_history.next_booking_date) }}</span></div>
          </div>
        </section>

        <section class="detail-section">
          <h3>Trainer &amp; vehicle</h3>
          <div class="detail-grid">
            <div><label>Trainer</label><span>{{ booking.trainer_name || 'Unassigned' }}</span></div>
            <div><label>Vehicle</label><span>{{ getVehicleLabel() }}</span></div>
          </div>
        </section>

        <section class="detail-section" *ngIf="booking.notes">
          <h3>Notes</h3>
          <p class="notes-block">{{ booking.notes }}</p>
        </section>

        <section class="detail-section" *ngIf="booking.payment">
          <h3>Payment Information</h3>
          <div class="detail-grid">
            <div><label>Amount</label><strong>₹{{ booking.payment.amount }}</strong></div>
            <div><label>Method</label><span>{{ formatPaymentMethod(booking.payment.payment_method) }}</span></div>
            <div><label>Status</label><span>{{ formatPaymentStatus(booking.payment.status) }}</span></div>
            <div><label>Approval</label><span>{{ booking.payment.approval_status || '—' }}</span></div>
            <div><label>Transaction Number</label><span>{{ booking.payment.reference_number || '—' }}</span></div>
            <div><label>Payment Date</label><span>{{ formatDateTime(booking.payment.payment_date) }}</span></div>
            <div><label>Approved By</label><span>{{ booking.payment.reviewed_by_name || '—' }}</span></div>
            <div><label>Approved Date</label><span>{{ formatDateTime(booking.payment.reviewed_at) }}</span></div>
            <div class="full" *ngIf="booking.payment.payment_notes">
              <label>Payment notes</label><span>{{ booking.payment.payment_notes }}</span>
            </div>
            <div class="full" *ngIf="booking.payment.receipt_path">
              <label>Uploaded Proof</label>
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="viewPaymentProof()">
                View / Download
              </button>
              <span class="admin-cell-muted" *ngIf="booking.payment.receipt_original_name">
                {{ booking.payment.receipt_original_name }}
              </span>
            </div>
          </div>
        </section>

        <section class="detail-section" *ngIf="perms.can('bookings', 'edit')">
          <h3>Attendance</h3>
          <div class="attendance-controls">
            <select [(ngModel)]="attendanceDraft" class="admin-select">
              <option value="SCHEDULED">Scheduled</option>
              <option value="ATTENDED">Attended</option>
              <option value="NO_SHOW">No Show</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
            <button type="button" class="admin-btn admin-btn-primary admin-btn-sm" (click)="saveAttendance()" [disabled]="savingAttendance">
              {{ savingAttendance ? 'Saving…' : 'Update attendance' }}
            </button>
          </div>
        </section>

        <section class="detail-section">
          <h3>Audit</h3>
          <div class="detail-grid">
            <div><label>Created by</label><span>{{ booking.audit?.created_by || '—' }}</span></div>
            <div><label>Created at</label><span>{{ formatDateTime(booking.audit?.created_at) }}</span></div>
            <div><label>Updated by</label><span>{{ booking.audit?.updated_by || '—' }}</span></div>
            <div><label>Updated at</label><span>{{ formatDateTime(booking.audit?.updated_at) }}</span></div>
          </div>
        </section>

        <section class="detail-section">
          <h3>Timeline</h3>
          <div class="admin-empty-state compact" *ngIf="!booking.timeline?.length">
            <p>No timeline events recorded yet.</p>
          </div>
          <div class="timeline" *ngIf="booking.timeline?.length">
            <article class="timeline-item" *ngFor="let event of booking.timeline; let last = last" [class.timeline-item-last]="last">
              <div class="timeline-dot" [class.timeline-dot-success]="isSuccessEvent(event)" [class.timeline-dot-warning]="isWarningEvent(event)"></div>
              <div class="timeline-body">
                <div class="timeline-time">{{ formatDateTime(event.created_at) }}</div>
                <div class="timeline-title">{{ event.title }}</div>
                <div class="timeline-type admin-cell-muted">{{ formatEventType(event.event_type) }}</div>
                <div class="timeline-desc" *ngIf="event.description">{{ event.description }}</div>
                <div class="timeline-actor" *ngIf="event.actor_name">By {{ event.actor_name }}</div>
              </div>
            </article>
          </div>
        </section>

        <div class="admin-alert-warning" *ngIf="booking.slot?.capacity_exceeded">
          Current bookings exceed active vehicle capacity. Existing bookings are preserved.
        </div>
      </div>

      <div adminModalFooter class="booking-details-footer">
        <ng-container *ngIf="!loading && booking">
          <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="printDetails()">Print</button>
          <button
            type="button"
            class="admin-btn admin-btn-secondary admin-btn-sm"
            *ngIf="perms.can('bookings', 'edit') && !booking.trainer_name"
            (click)="requestAssignTrainer()">
            Assign trainer
          </button>
          <button
            type="button"
            class="admin-btn admin-btn-primary admin-btn-sm"
            *ngIf="booking.status === 'pending' && perms.can('bookings', 'edit')"
            (click)="updateStatus('confirmed')"
            [disabled]="statusSaving">
            Approve
          </button>
          <button
            type="button"
            class="admin-btn admin-btn-danger admin-btn-sm"
            *ngIf="booking.status === 'pending' && perms.can('bookings', 'edit')"
            (click)="updateStatus('cancelled')"
            [disabled]="statusSaving">
            Reject
          </button>
          <button
            type="button"
            class="admin-btn admin-btn-primary admin-btn-sm"
            *ngIf="booking.status === 'confirmed' && perms.can('bookings', 'edit')"
            (click)="updateStatus('completed')"
            [disabled]="statusSaving">
            Complete
          </button>
          <button
            type="button"
            class="admin-btn admin-btn-secondary admin-btn-sm"
            *ngIf="['pending', 'confirmed'].includes(booking.status) && perms.can('bookings', 'edit')"
            (click)="updateStatus('cancelled')"
            [disabled]="statusSaving">
            Cancel booking
          </button>
          <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="detailsModal.requestClose()">Close</button>
        </ng-container>
      </div>
    </app-admin-modal>
  `,
  styles: [`
    .badge-row { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
    .detail-section { margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border); }
    .detail-section h3 { font-size: 0.8125rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: var(--color-muted); margin: 0 0 0.75rem; }
    .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.75rem 1rem; }
    .detail-grid .full { grid-column: 1 / -1; }
    .detail-grid label { display: block; font-size: 0.75rem; color: var(--color-muted); margin-bottom: 0.15rem; }
    .detail-grid strong, .detail-grid span { font-size: 0.875rem; }
    .notes-block { margin: 0; font-size: 0.875rem; white-space: pre-wrap; }
    .attendance-controls { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
    .timeline { display: flex; flex-direction: column; gap: 0; }
    .timeline-item { display: flex; gap: 0.75rem; padding-bottom: 1rem; position: relative; }
    .timeline-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--color-border); margin-top: 0.35rem; flex-shrink: 0; }
    .timeline-dot-success { background: var(--color-success, #16a34a); }
    .timeline-dot-warning { background: var(--color-warning, #d97706); }
    .timeline-time { font-size: 0.75rem; color: var(--color-muted); }
    .timeline-title { font-weight: 600; font-size: 0.875rem; }
    .booking-details-footer { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .admin-empty-state.compact { padding: 1rem; }
    @media (max-width: 480px) {
      .detail-grid { grid-template-columns: 1fr; }
    }
  `]
})
export class AdminBookingDetailsModalComponent implements OnChanges {
  @Input() open = false;
  @Input() bookingId: string | null = null;
  @Output() closed = new EventEmitter<void>();
  @Output() updated = new EventEmitter<void>();
  @Output() assignTrainer = new EventEmitter<string>();

  booking: any = null;
  loading = false;
  savingAttendance = false;
  statusSaving = false;
  attendanceDraft = 'SCHEDULED';

  constructor(
    private adminService: AdminService,
    private paymentService: PaymentService,
    public perms: PermissionService,
    private toastService: ToastService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnChanges(changes: SimpleChanges) {
    if ((changes['open'] || changes['bookingId']) && this.open && this.bookingId) {
      void this.load();
    }
  }

  async load() {
    if (!this.bookingId) return;
    this.loading = true;
    try {
      this.booking = await this.adminService.getBookingDetail(this.bookingId);
      this.attendanceDraft = this.booking?.attendance_status || 'SCHEDULED';
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to load booking details'));
      this.close();
    } finally {
      this.loading = false;
    }
  }

  getReference(): string {
    return this.booking?.booking_reference || this.booking?.offline_reference_number || '';
  }

  formatPaymentMethod(method?: string): string {
    if (!method) return '—';
    return String(method).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }

  formatPaymentStatus(status?: string): string {
    if (!status) return '—';
    return String(status).replace(/_/g, ' ');
  }

  async viewPaymentProof() {
    const payment = this.booking?.payment;
    if (!payment?.id) return;
    try {
      await this.paymentService.openReceipt({
        id: payment.id,
        receipt_path: payment.receipt_path
      });
    } catch (err: any) {
      this.toastService.error(err?.message || 'Payment proof unavailable');
    }
  }

  async saveAttendance() {
    if (!this.bookingId || this.savingAttendance) return;
    this.savingAttendance = true;
    try {
      await this.adminService.updateBookingAttendance(this.bookingId, this.attendanceDraft);
      this.toastService.success('Attendance updated');
      await this.load();
      this.updated.emit();
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to update attendance'));
    } finally {
      this.savingAttendance = false;
    }
  }

  async updateStatus(status: string) {
    if (!this.bookingId || this.statusSaving) return;
    const label = status === 'confirmed' ? 'approve' : status === 'cancelled' ? 'cancel' : 'update';
    const ok = await this.confirmDialog.confirm({
      title: `${label.charAt(0).toUpperCase() + label.slice(1)} booking?`,
      message: `Set booking status to "${status}"?`,
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel'
    });
    if (!ok) return;
    this.statusSaving = true;
    try {
      await firstValueFrom(this.adminService.updateBookingStatus(this.bookingId, status));
      this.toastService.success('Booking status updated');
      await this.load();
      this.updated.emit();
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to update status'));
    } finally {
      this.statusSaving = false;
    }
  }

  requestAssignTrainer() {
    if (this.bookingId) {
      this.assignTrainer.emit(this.bookingId);
      this.close();
    }
  }

  printDetails() {
    window.print();
  }

  getCustomerName(): string {
    if (!this.booking) return '';
    if (this.booking.booking_source === 'OFFLINE') {
      return this.booking.offline_customer_name || 'Walk-in customer';
    }
    return this.booking.user_name || this.booking.user?.full_name || 'N/A';
  }

  getVehicleLabel(): string {
    const name = this.booking?.vehicle_name || '';
    const cat = categorizeVehicleName(name);
    if (cat === 'ev_scooty') return 'Electric Scooty';
    if (cat === 'petrol_scooty') return 'Petrol Scooty';
    if (cat === 'bike') return 'Bike';
    return name || 'N/A';
  }

  statusBadgeClass(status?: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'confirmed' || s === 'completed' || s === 'verified') return 'admin-badge-success';
    if (s === 'cancelled' || s === 'rejected' || s === 'expired') return 'admin-badge-danger';
    if (s.includes('pending') || s === 'booked') return 'admin-badge-warning';
    return 'admin-badge-neutral';
  }

  formatAttendance(value?: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'Scheduled',
      ATTENDED: 'Attended',
      NO_SHOW: 'No Show',
      CANCELLED: 'Cancelled'
    };
    return map[String(value || 'SCHEDULED').toUpperCase()] || value || 'Scheduled';
  }

  formatDateTime(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  formatDateOnly(value?: string | null): string {
    if (!value) return '—';
    return new Date(value).toLocaleDateString();
  }

  formatEventType(type?: string): string {
    return String(type || '')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  isSuccessEvent(event: { event_type?: string }): boolean {
    const t = String(event?.event_type || '');
    return ['BOOKING_CONFIRMED', 'PAYMENT_APPROVED', 'BOOKING_COMPLETED', 'CERTIFICATE_GENERATED', 'ATTENDANCE_MARKED'].includes(t);
  }

  isWarningEvent(event: { event_type?: string }): boolean {
    const t = String(event?.event_type || '');
    return ['PAYMENT_REJECTED', 'BOOKING_CANCELLED'].includes(t);
  }

  onModalClosed() {
    this.close();
  }

  close() {
    this.booking = null;
    this.closed.emit();
  }
}
