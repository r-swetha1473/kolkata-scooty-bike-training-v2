import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { SlotService, Slot } from '../../../services/slot.service';
import { HttpService } from '../../../services/http.service';
import { ToastService } from '../../../services/toast.service';
import { PermissionService } from '../../../services/permission.service';
import { Course, CourseService } from '../../../services/course.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { getKolkataToday, formatTimeToAMPM } from '../../../utils/date.utils';
import { getTotalAvailableSeats } from '../../../utils/vehicle.utils';
import { firstValueFrom } from 'rxjs';

interface VehicleOption {
  id: string;
  name: string;
  max_per_slot: number;
  is_active: boolean;
}

type PaymentMode = 'pending' | 'complete_now';

@Component({
  selector: 'app-admin-offline-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-page">
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">Offline Bookings</h1>
          <p class="admin-page-subtitle">Create walk-in bookings with optional payment capture</p>
        </div>
        <a routerLink="/admin/bookings" class="admin-btn admin-btn-secondary">View all bookings</a>
      </div>

      <div class="admin-split-grid" *ngIf="perms.can('bookings', 'create')">
        <section class="admin-panel">
          <h2>Create Booking</h2>
          <form (ngSubmit)="submitBooking()" class="admin-form-grid">
            <label for="bookingDate">Date *
              <input id="bookingDate" type="date" [(ngModel)]="selectedDate" name="selectedDate"
                [min]="minDate" (change)="onDateChange()" class="admin-input full-width" required>
            </label>
            <label for="slotSelect">Slot *
              <select id="slotSelect" [(ngModel)]="form.slot_id" name="slot_id" class="admin-select full-width"
                (change)="onSlotChange()" required [disabled]="loadingSlots || !slots.length">
                <option value="">{{ loadingSlots ? 'Loading slots…' : (slots.length ? 'Select slot' : 'No slots for this date') }}</option>
                <option *ngFor="let slot of slots" [value]="slot.id">
                  {{ formatSlotLabel(slot) }}
                </option>
              </select>
            </label>

            <label for="searchPhone">Search Phone
              <input id="searchPhone" type="tel" [(ngModel)]="searchPhone" name="searchPhone"
                class="admin-input full-width" maxlength="10" placeholder="10-digit mobile">
            </label>
            <label for="searchName">Search Name
              <input id="searchName" type="text" [(ngModel)]="searchName" name="searchName"
                class="admin-input full-width" placeholder="Customer name">
            </label>
            <div class="full">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="searchCustomers()" [disabled]="searchingCustomers">
                {{ searchingCustomers ? 'Searching…' : 'Search Customer' }}
              </button>
            </div>

            <div class="full admin-match-card" *ngIf="customerMatches.length">
              <strong>Existing Customer Found</strong>
              <div class="admin-match-item" *ngFor="let match of customerMatches">
                <div class="admin-cell-stack">
                  <div class="admin-cell-primary">{{ match.customer_name }}</div>
                  <div class="admin-cell-muted">{{ match.phone || 'No phone' }} · {{ match.source === 'profile' ? 'Registered user' : 'Previous offline booking' }}</div>
                </div>
                <button type="button" class="admin-btn admin-btn-primary" (click)="reuseCustomer(match)">Reuse</button>
              </div>
              <button type="button" class="admin-link-btn" (click)="clearCustomerSearch()">Create new customer anyway</button>
            </div>

            <label for="vehicleSelect">Vehicle *
              <select id="vehicleSelect" [(ngModel)]="form.vehicle_id" name="vehicle_id" class="admin-select full-width" required>
                <option value="">Select vehicle</option>
                <option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</option>
              </select>
            </label>
            <label for="courseSelect">Course
              <select id="courseSelect" [(ngModel)]="form.course_id" name="course_id" class="admin-select full-width"
                (change)="onCourseChange()">
                <option value="">Optional</option>
                <option *ngFor="let c of courses" [value]="c.id">{{ c.name }} (₹{{ c.amount_inr }})</option>
              </select>
            </label>
            <label for="customerName">Customer Name *
              <input id="customerName" type="text" [(ngModel)]="form.customer_name" name="customer_name"
                class="admin-input full-width" maxlength="120" required placeholder="Walk-in customer name">
            </label>

            <label for="customerPhone">Phone
              <input id="customerPhone" type="tel" [(ngModel)]="form.phone" name="phone"
                class="admin-input full-width" maxlength="10" placeholder="10-digit mobile (optional)">
            </label>
            <label for="customerAge">Age
              <input id="customerAge" type="number" [(ngModel)]="form.age" name="age"
                class="admin-input full-width" min="1" max="120" placeholder="Optional">
            </label>
            <label for="customerGender" class="full">Gender
              <select id="customerGender" [(ngModel)]="form.gender" name="gender" class="admin-select full-width">
                <option value="">Optional</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>

            <label for="notes" class="full">Notes
              <textarea id="notes" [(ngModel)]="form.notes" name="notes" rows="3"
                class="admin-textarea full-width" maxlength="1000" placeholder="Optional notes"></textarea>
            </label>

            <fieldset class="full payment-mode-fieldset">
              <legend>Payment</legend>
              <div class="payment-mode-options">
                <label class="payment-mode-option">
                  <input type="radio" name="payment_mode" [(ngModel)]="paymentMode" value="pending">
                  <span>
                    <strong>Save as Pending Payment</strong>
                    <small>Creates booking and queues it for Payment Approval</small>
                  </span>
                </label>
                <label class="payment-mode-option">
                  <input type="radio" name="payment_mode" [(ngModel)]="paymentMode" value="complete_now">
                  <span>
                    <strong>Complete Payment Now</strong>
                    <small>Record payment details; Paid status is approved immediately</small>
                  </span>
                </label>
              </div>
            </fieldset>

            <div class="full payment-section" *ngIf="paymentMode === 'complete_now'">
              <h3>Payment details</h3>
              <div class="admin-form-grid">
                <label for="paymentMethod">Payment Method *
                  <select id="paymentMethod" [(ngModel)]="paymentForm.payment_method" name="payment_method"
                    class="admin-select full-width" required>
                    <option value="">Select method</option>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label for="amountPaid">Amount Paid *
                  <input id="amountPaid" type="number" [(ngModel)]="paymentForm.amount_paid" name="amount_paid"
                    class="admin-input full-width" min="0" step="0.01" required placeholder="0.00">
                </label>
                <label for="paymentDate">Payment Date *
                  <input id="paymentDate" type="date" [(ngModel)]="paymentForm.payment_date" name="payment_date"
                    class="admin-input full-width" required>
                </label>
                <label for="paymentStatus">Payment Status *
                  <select id="paymentStatus" [(ngModel)]="paymentForm.payment_status" name="payment_status"
                    class="admin-select full-width">
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="partial">Partial</option>
                    <option value="failed">Failed</option>
                  </select>
                </label>
                <label for="referenceNumber" class="full">Transaction / Reference Number
                  <input id="referenceNumber" type="text" [(ngModel)]="paymentForm.reference_number" name="reference_number"
                    class="admin-input full-width" maxlength="100" placeholder="Optional">
                </label>
                <label for="paymentNotes" class="full">Notes
                  <textarea id="paymentNotes" [(ngModel)]="paymentForm.payment_notes" name="payment_notes" rows="2"
                    class="admin-textarea full-width" maxlength="1000" placeholder="Optional payment notes"></textarea>
                </label>
                <label for="paymentProof" class="full">Payment Proof (image or PDF)
                  <input id="paymentProof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf"
                    (change)="onProofSelected($event)" class="admin-input full-width">
                </label>
                <div class="full proof-preview" *ngIf="proofPreviewUrl || proofFile">
                  <img *ngIf="proofPreviewUrl" [src]="proofPreviewUrl" alt="Payment proof preview" class="proof-image">
                  <p class="admin-cell-muted" *ngIf="proofFile && !proofPreviewUrl">{{ proofFile.name }} (PDF)</p>
                  <button type="button" class="admin-link-btn" (click)="clearProof()">Remove file</button>
                </div>
              </div>
            </div>

            <div class="full admin-panel-actions">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="resetForm()" [disabled]="submitting">Reset</button>
              <button type="submit" class="admin-btn admin-btn-primary" [disabled]="submitting || !canSubmit()">
                {{ submitLabel() }}
              </button>
            </div>
          </form>
        </section>

        <section class="admin-panel">
          <div class="admin-list-item-top">
            <h2>Recent Offline Bookings</h2>
            <button type="button" class="admin-btn admin-btn-secondary" (click)="loadRecent()" [disabled]="loadingRecent">Refresh</button>
          </div>
          <p *ngIf="loadingRecent" class="admin-cell-muted">Loading…</p>
          <div class="admin-list-stack" *ngIf="!loadingRecent && recentBookings.length">
            <article class="admin-list-item" *ngFor="let b of recentBookings">
              <div class="admin-list-item-top">
                <strong>{{ b.offline_reference_number || b.offline_customer_name || 'Customer' }}</strong>
                <span class="admin-badge admin-badge-info">OFFLINE</span>
              </div>
              <div class="admin-list-meta">
                <span>{{ b.offline_customer_name }}</span>
                <span>{{ formatDateTime(b.start_time || b.slot?.start_time) }}</span>
                <span>{{ b.vehicle_name || 'Vehicle' }}</span>
                <span class="admin-badge" [ngClass]="statusBadgeClass(b.status)">{{ b.status }}</span>
              </div>
              <div class="admin-cell-muted" *ngIf="getCreatedByLabel(b)">Created by {{ getCreatedByLabel(b) }}</div>
            </article>
          </div>
          <p *ngIf="!loadingRecent && !recentBookings.length" class="admin-cell-muted">No offline bookings yet.</p>
        </section>
      </div>

      <p *ngIf="!perms.can('bookings', 'create')" class="admin-cell-muted">
        You do not have permission to create offline bookings.
      </p>
    </div>
  `,
  styles: [`
    .payment-mode-fieldset {
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      padding: 0.75rem 1rem 1rem;
      margin: 0;
    }
    .payment-mode-fieldset legend {
      padding: 0 0.35rem;
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--color-muted, #6b7280);
    }
    .payment-mode-options { display: flex; flex-direction: column; gap: 0.75rem; }
    .payment-mode-option {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      cursor: pointer;
    }
    .payment-mode-option strong { display: block; font-size: 0.875rem; }
    .payment-mode-option small { display: block; color: var(--color-muted, #6b7280); font-size: 0.75rem; }
    .payment-section {
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 8px;
      padding: 1rem;
      background: var(--color-surface-soft, #f9fafb);
    }
    .payment-section h3 {
      margin: 0 0 0.75rem;
      font-size: 0.9375rem;
    }
    .proof-preview { display: flex; flex-direction: column; gap: 0.5rem; }
    .proof-image {
      max-width: 220px;
      max-height: 160px;
      object-fit: contain;
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 6px;
      background: #fff;
    }
  `]
})
export class AdminOfflineBookingsComponent implements OnInit, OnDestroy {
  selectedDate = getKolkataToday();
  minDate = getKolkataToday();
  slots: Slot[] = [];
  vehicles: VehicleOption[] = [];
  courses: Course[] = [];
  loadingSlots = false;
  loadingRecent = false;
  submitting = false;
  recentBookings: any[] = [];
  searchPhone = '';
  searchName = '';
  searchingCustomers = false;
  customerMatches: any[] = [];
  reuseUserId: string | null = null;
  paymentMode: PaymentMode = 'pending';
  proofFile: File | null = null;
  proofPreviewUrl: string | null = null;

  form = {
    slot_id: '',
    vehicle_id: '',
    course_id: '',
    customer_name: '',
    phone: '',
    age: '' as string | number,
    gender: '',
    notes: ''
  };

  paymentForm = {
    payment_method: '',
    amount_paid: '' as string | number,
    payment_date: getKolkataToday(),
    reference_number: '',
    payment_notes: '',
    payment_status: 'paid'
  };

  constructor(
    private adminService: AdminService,
    private slotService: SlotService,
    private http: HttpService,
    private courseService: CourseService,
    private toastService: ToastService,
    public perms: PermissionService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadVehicles(), this.loadCourses(), this.onDateChange(), this.loadRecent()]);
  }

  ngOnDestroy() {
    this.revokePreview();
  }

  async loadVehicles() {
    try {
      this.vehicles = await firstValueFrom(this.http.get<VehicleOption[]>('/vehicles'));
    } catch {
      this.vehicles = [];
    }
  }

  async loadCourses() {
    try {
      this.courses = await this.courseService.list(true);
    } catch {
      this.courses = [];
    }
  }

  onCourseChange() {
    if (this.paymentMode !== 'complete_now') return;
    const course = this.courses.find((c) => c.id === this.form.course_id);
    if (course && (this.paymentForm.amount_paid === '' || this.paymentForm.amount_paid == null)) {
      this.paymentForm.amount_paid = course.amount_inr;
    }
  }

  async onDateChange() {
    if (!this.selectedDate) return;
    this.loadingSlots = true;
    this.form.slot_id = '';
    try {
      this.slots = await this.slotService.getSlotsByDate(this.selectedDate);
    } catch (err) {
      this.slots = [];
      this.toastService.error(getApiErrorMessage(err, 'Failed to load slots'));
    } finally {
      this.loadingSlots = false;
    }
  }

  onSlotChange() {}

  formatSlotLabel(slot: Slot): string {
    const time = slot.start_time ? formatTimeToAMPM(slot.start_time) : 'Time TBD';
    const available = getTotalAvailableSeats(slot);
    return `${time} · ${available} seat(s) available`;
  }

  canSubmit(): boolean {
    if (!(this.form.slot_id && this.form.vehicle_id && this.form.customer_name.trim())) return false;
    if (this.paymentMode === 'complete_now') {
      return !!(
        this.paymentForm.payment_method &&
        this.paymentForm.amount_paid !== '' &&
        this.paymentForm.amount_paid != null &&
        Number(this.paymentForm.amount_paid) >= 0 &&
        this.paymentForm.payment_date
      );
    }
    return true;
  }

  submitLabel(): string {
    if (this.submitting) return 'Creating…';
    return this.paymentMode === 'complete_now' ? 'Create & Record Payment' : 'Save as Pending Payment';
  }

  resetForm() {
    this.form = {
      slot_id: '',
      vehicle_id: '',
      course_id: '',
      customer_name: '',
      phone: '',
      age: '',
      gender: '',
      notes: ''
    };
    this.paymentMode = 'pending';
    this.paymentForm = {
      payment_method: '',
      amount_paid: '',
      payment_date: getKolkataToday(),
      reference_number: '',
      payment_notes: '',
      payment_status: 'paid'
    };
    this.clearProof();
    this.reuseUserId = null;
    this.customerMatches = [];
    this.searchPhone = '';
    this.searchName = '';
  }

  onProofSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] || null;
    this.clearProof();
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      this.toastService.error('Only JPEG, PNG, WebP, or PDF files are allowed');
      input.value = '';
      return;
    }
    this.proofFile = file;
    if (file.type.startsWith('image/')) {
      this.proofPreviewUrl = URL.createObjectURL(file);
    }
  }

  clearProof() {
    this.revokePreview();
    this.proofFile = null;
    this.proofPreviewUrl = null;
  }

  private revokePreview() {
    if (this.proofPreviewUrl) {
      URL.revokeObjectURL(this.proofPreviewUrl);
      this.proofPreviewUrl = null;
    }
  }

  async searchCustomers() {
    const phone = this.searchPhone.trim();
    const name = this.searchName.trim();
    if (!phone && !name) {
      this.toastService.error('Enter a phone number or customer name to search');
      return;
    }
    this.searchingCustomers = true;
    try {
      this.customerMatches = await this.adminService.searchOfflineCustomers({ phone, name });
      if (!this.customerMatches.length) {
        this.toastService.success('No existing customer found — you can create a new one');
      }
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Customer search failed'));
    } finally {
      this.searchingCustomers = false;
    }
  }

  reuseCustomer(match: any) {
    this.form.customer_name = match.customer_name || '';
    this.form.phone = match.phone ? String(match.phone).replace(/\D/g, '').slice(-10) : '';
    this.reuseUserId = match.user_id || null;
    this.toastService.success('Customer details loaded');
  }

  clearCustomerSearch() {
    this.customerMatches = [];
    this.reuseUserId = null;
  }

  async submitBooking() {
    if (!this.canSubmit() || this.submitting) return;
    this.submitting = true;
    try {
      const useFormData = this.paymentMode === 'complete_now' && !!this.proofFile;
      let created: any;

      if (useFormData) {
        const fd = new FormData();
        fd.append('slot_id', this.form.slot_id);
        fd.append('vehicle_id', this.form.vehicle_id);
        fd.append('customer_name', this.form.customer_name.trim());
        fd.append('payment_mode', 'complete_now');
        if (this.form.course_id) fd.append('course_id', this.form.course_id);
        if (this.form.phone.trim()) fd.append('phone', this.form.phone.trim());
        if (this.form.age !== '' && this.form.age != null) fd.append('age', String(this.form.age));
        if (this.form.gender.trim()) fd.append('gender', this.form.gender.trim());
        if (this.form.notes.trim()) fd.append('notes', this.form.notes.trim());
        if (this.reuseUserId) fd.append('reuse_user_id', this.reuseUserId);
        fd.append('payment_method', this.paymentForm.payment_method);
        fd.append('amount_paid', String(this.paymentForm.amount_paid));
        fd.append('payment_date', this.paymentForm.payment_date);
        fd.append('payment_status', this.paymentForm.payment_status);
        if (this.paymentForm.reference_number.trim()) {
          fd.append('reference_number', this.paymentForm.reference_number.trim());
        }
        if (this.paymentForm.payment_notes.trim()) {
          fd.append('payment_notes', this.paymentForm.payment_notes.trim());
        }
        fd.append('payment_proof', this.proofFile as File);
        created = await this.adminService.createOfflineBookingFormData(fd);
      } else {
        const payload: Record<string, unknown> = {
          slot_id: this.form.slot_id,
          vehicle_id: this.form.vehicle_id,
          customer_name: this.form.customer_name.trim(),
          payment_mode: this.paymentMode
        };
        if (this.form.course_id) payload['course_id'] = this.form.course_id;
        if (this.form.phone.trim()) payload['phone'] = this.form.phone.trim();
        if (this.form.age !== '' && this.form.age != null) payload['age'] = Number(this.form.age);
        if (this.form.gender.trim()) payload['gender'] = this.form.gender.trim();
        if (this.form.notes.trim()) payload['notes'] = this.form.notes.trim();
        if (this.reuseUserId) payload['reuse_user_id'] = this.reuseUserId;

        if (this.paymentMode === 'complete_now') {
          payload['payment_method'] = this.paymentForm.payment_method;
          payload['amount_paid'] = Number(this.paymentForm.amount_paid);
          payload['payment_date'] = this.paymentForm.payment_date;
          payload['payment_status'] = this.paymentForm.payment_status;
          if (this.paymentForm.reference_number.trim()) {
            payload['reference_number'] = this.paymentForm.reference_number.trim();
          }
          if (this.paymentForm.payment_notes.trim()) {
            payload['payment_notes'] = this.paymentForm.payment_notes.trim();
          }
        }

        created = await this.adminService.createOfflineBooking(payload);
      }

      const payStatus = created?.payment?.status;
      const msg =
        this.paymentMode === 'complete_now' && (payStatus === 'verified' || payStatus === 'partial')
          ? `Offline booking ${created.offline_reference_number || ''} created — payment approved`.trim()
          : `Offline booking ${created.offline_reference_number || ''} created — pending payment`.trim();
      this.toastService.success(msg);
      this.resetForm();
      await Promise.all([this.onDateChange(), this.loadRecent()]);
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to create offline booking'));
    } finally {
      this.submitting = false;
    }
  }

  async loadRecent() {
    this.loadingRecent = true;
    try {
      const res = await this.adminService.getAllBookings({
        source: 'OFFLINE',
        limit: 8,
        offset: 0
      });
      this.recentBookings = res.bookings;
    } catch {
      this.recentBookings = [];
    } finally {
      this.loadingRecent = false;
    }
  }

  getCreatedByLabel(booking: any): string {
    if (booking.booking_source !== 'OFFLINE') return '';
    const name = booking.created_by_admin_name;
    if (!name) return 'Admin';
    const role = booking.created_by_admin_role;
    if (role === 'subadmin') return `${name} (Sub Admin)`;
    if (role === 'superadmin') return `${name} (Super Admin)`;
    return name;
  }

  formatDateTime(value?: string): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  }

  statusBadgeClass(status: string): string {
    const s = (status || '').toLowerCase();
    if (s === 'completed' || s === 'confirmed') return 'admin-badge-success';
    if (s === 'cancelled') return 'admin-badge-danger';
    if (s === 'pending' || s === 'pending_payment') return 'admin-badge-warning';
    return 'admin-badge-neutral';
  }
}
