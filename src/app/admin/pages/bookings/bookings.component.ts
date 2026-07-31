import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { ApiService } from '../../../services/api.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { firstValueFrom } from 'rxjs';
import { categorizeVehicleName } from '../../../utils/vehicle.utils';
import { PermissionService } from '../../../services/permission.service';
import { AdminBookingDetailsModalComponent } from '../../components/admin-booking-details-modal/admin-booking-details-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';

@Component({
  selector: 'app-admin-bookings',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminBookingDetailsModalComponent, AdminPaginationComponent, AdminModalComponent],
  template: `
    <div class="bookings-page admin-page">
      <div class="admin-sticky-toolbar">
      <div class="admin-page-header">
        <h1 class="admin-page-title">Booking management</h1>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="exportBookings()" [disabled]="loadingList">
          Export CSV
        </button>
      </div>

      <div class="admin-filters-bar">
        <div class="admin-filters-content">
          <div class="admin-filter-group admin-search-group">
            <svg class="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input 
              type="search"
              [ngModel]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
              (keyup.enter)="applySearch()"
              placeholder="Search customer, trainer, phone, vehicle, booking ID..." 
              class="admin-search-input"
              aria-label="Search bookings">
          </div>

          <select [(ngModel)]="branchFilter" (change)="onServerFiltersChange()" class="admin-select" aria-label="Filter by branch">
            <option value="">All Branches</option>
            <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
          </select>

          <select [(ngModel)]="trainerFilter" (change)="onServerFiltersChange()" class="admin-select" aria-label="Filter by trainer">
            <option value="">All Trainers</option>
            <option *ngFor="let t of filterTrainers" [value]="t.id">
              {{ t.profile?.full_name || t.full_name || 'Trainer' }}
            </option>
          </select>

          <select [(ngModel)]="vehicleFilter" (change)="onServerFiltersChange()" class="admin-select" aria-label="Filter by vehicle">
            <option value="">All Vehicles</option>
            <option *ngFor="let v of vehicles" [value]="v.id">{{ v.name }}</option>
          </select>

          <select [(ngModel)]="statusFilter" (change)="onServerFiltersChange()" class="admin-select" aria-label="Filter by booking status">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select [(ngModel)]="paymentStatusFilter" (change)="onServerFiltersChange()" class="admin-select" aria-label="Filter by payment status">
            <option value="">All Payments</option>
            <option value="pending_upload">Pending upload</option>
            <option value="pending_verification">Pending verification</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>

          <select [(ngModel)]="sourceFilter" (change)="onServerFiltersChange()" class="admin-select">
            <option value="">All Sources</option>
            <option value="ONLINE">Online</option>
            <option value="OFFLINE">Offline</option>
          </select>

          <select [(ngModel)]="attendanceFilter" (change)="onServerFiltersChange()" class="admin-select">
            <option value="">All Attendance</option>
            <option value="SCHEDULED">Scheduled</option>
            <option value="ATTENDED">Attended</option>
            <option value="NO_SHOW">No Show</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <div class="admin-filter-group">
            <select [(ngModel)]="datePreset" (change)="onDatePresetChange()" class="admin-select" aria-label="Date range preset">
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="tomorrow">Tomorrow</option>
              <option value="thisWeek">This Week</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="last7">Last 7 days</option>
              <option value="custom">Custom</option>
            </select>
            <div class="date-inputs" *ngIf="datePreset === 'custom'">
              <input
                type="date"
                [(ngModel)]="startDateFilter"
                (change)="onServerFiltersChange()"
                class="admin-select date-input">
              <span class="date-separator">–</span>
              <input
                type="date"
                [(ngModel)]="endDateFilter"
                (change)="onServerFiltersChange()"
                class="admin-select date-input">
            </div>
          </div>

          <button class="admin-btn admin-btn-secondary" (click)="resetFilters()" title="Reset filters">
            <svg class="admin-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <polyline points="23 20 23 14 17 14"></polyline>
              <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path>
            </svg>
            Reset
          </button>

          <button class="admin-btn admin-btn-secondary" (click)="refreshAll()" title="Refresh data">
            <svg class="admin-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>
      </div>

      <div class="admin-kpi-grid bookings-kpi" *ngIf="!loadingKpis">
        <article class="admin-kpi-card">
          <div class="kpi-value">{{ kpi.todayBookings }}</div>
          <div class="kpi-label">Today's Bookings</div>
        </article>
        <article class="admin-kpi-card">
          <div class="kpi-value">{{ kpi.pending }}</div>
          <div class="kpi-label">Pending</div>
        </article>
        <article class="admin-kpi-card">
          <div class="kpi-value">{{ kpi.completed }}</div>
          <div class="kpi-label">Completed</div>
        </article>
        <article class="admin-kpi-card">
          <div class="kpi-value">{{ kpi.cancelled }}</div>
          <div class="kpi-label">Cancelled</div>
        </article>
      </div>

      <div class="admin-table-skeleton" *ngIf="loadingList" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5,6]"></div>
      </div>

      <div class="admin-table-container bookings-table-wrap admin-table-sticky" *ngIf="!loadingList">
        <table class="admin-data-table bookings-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Slot Time</th>
              <th>Vehicle</th>
              <th>Trainer</th>
              <th>Status</th>
              <th>Attendance</th>
              <th>Source</th>
              <th>Created By</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let booking of bookings">
              <td>
                <button type="button" class="ref-link" (click)="openDetails(booking.id)">
                  {{ booking.booking_reference || booking.offline_reference_number || '—' }}
                </button>
              </td>
              <td>
                <div class="customer-info">
                  <div class="name">{{ getCustomerName(booking) }}</div>
                  <div class="email">{{ getCustomerSubline(booking) }}</div>
                </div>
              </td>
              <td>{{ booking.formatted_slot_time || (booking.slot?.start_time ? formatDateTime(booking.slot.start_time) : (booking.start_time ? formatDateTime(booking.start_time) : 'N/A')) }}</td>
              <td><span class="vehicle-pill">{{ getVehicleLabel(booking) }}</span></td>
              <td>
                <span class="trainer-pill" [class.unassigned]="!getTrainerName(booking)">
                  {{ getTrainerName(booking) || 'Unassigned' }}
                </span>
              </td>
              <td>
                <span class="admin-badge" [ngClass]="getStatusBadgeClass(booking.status)">
                  {{ booking.status }}
                </span>
              </td>
              <td><span class="attendance-pill">{{ formatAttendance(booking.attendance_status) }}</span></td>
              <td><span class="source-pill" [class.online]="booking.booking_source !== 'OFFLINE'" [class.offline]="booking.booking_source === 'OFFLINE'">{{ getSourceLabel(booking) }}</span></td>
              <td>{{ getCreatedByLabel(booking) }}</td>
              <td>{{ formatDate(booking.created_at) }}</td>
              <td>
                <div class="action-buttons">
                  <button type="button" class="admin-action-btn" (click)="openDetails(booking.id)" title="View details" aria-label="View details">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                  <button
                    type="button"
                    *ngIf="perms.can('bookings', 'edit') && !getTrainerName(booking)"
                    class="admin-action-btn"
                    (click)="openAssignTrainer(booking)"
                    title="Assign trainer"
                    aria-label="Assign trainer">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    *ngIf="booking.status === 'pending'"
                    class="admin-action-btn success"
                    (click)="updateStatus(booking.id, 'confirmed')"
                    title="Confirm booking"
                    aria-label="Confirm booking">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                      <polyline points="22 4 12 14.01 9 11.01"></polyline>
                    </svg>
                  </button>
                  <button
                    type="button"
                    *ngIf="booking.status === 'confirmed'"
                    class="admin-action-btn success"
                    (click)="updateStatus(booking.id, 'completed')"
                    title="Mark completed"
                    aria-label="Mark completed">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button
                    type="button"
                    *ngIf="['pending', 'confirmed'].includes(booking.status)"
                    class="admin-action-btn warning"
                    (click)="updateStatus(booking.id, 'cancelled')"
                    title="Cancel booking"
                    aria-label="Cancel booking">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="15" y1="9" x2="9" y2="15"></line>
                      <line x1="9" y1="9" x2="15" y2="15"></line>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="admin-action-btn danger"
                    (click)="deleteBooking(booking.id)"
                    title="Delete booking"
                    aria-label="Delete booking">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div *ngIf="bookings.length === 0 && !loadingList" class="admin-empty-state">
          <h3>No bookings found</h3>
          <p>Try adjusting filters or search.</p>
        </div>
      </div>

      <app-admin-pagination
        *ngIf="totalRecords > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="totalRecords"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="bookings"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <app-admin-modal
        #assignModal
        [open]="assignModalOpen"
        title="Assign trainer"
        [subtitle]="assignForm.customerName"
        [dirty]="true"
        (closed)="closeAssignTrainer()">
        <div class="admin-form-grid">
          <label class="form-group full">
            <span>Slot time</span>
            <div class="admin-field-readonly">{{ assignForm.slotTime }}</div>
          </label>
          <label class="form-group full">
            <span>Vehicle</span>
            <div class="admin-field-readonly">{{ assignForm.vehicle }}</div>
          </label>
          <label class="form-group full" for="trainerSelect">
            <span>Trainer</span>
            <select id="trainerSelect" [(ngModel)]="assignForm.trainerId" class="admin-select full-width">
              <option value="">Select trainer</option>
              <option *ngFor="let t of trainers" [value]="t.id">
                {{ t.profile?.full_name || t.full_name || 'Trainer' }}
              </option>
            </select>
          </label>
        </div>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="assignModal.requestClose()">Cancel</button>
          <button type="button" class="admin-btn admin-btn-primary" (click)="saveTrainerAssignment()" [disabled]="assignSaving || !assignForm.trainerId">
            {{ assignSaving ? 'Saving…' : 'Save assignment' }}
          </button>
        </div>
      </app-admin-modal>
    </div>

    <app-admin-booking-details-modal
      [open]="detailsOpen"
      [bookingId]="detailsBookingId"
      (closed)="closeDetails()"
      (updated)="refreshAll()"
      (assignTrainer)="onAssignTrainerFromDetails($event)">
    </app-admin-booking-details-modal>
  `,
  styles: [`
    .bookings-kpi { margin: 0 0 1rem; }
    .bookings-table-wrap {
      overflow-x: auto;
      overflow-y: visible;
      -webkit-overflow-scrolling: touch;
    }
    .bookings-table { min-width: 1100px; }
    .ref-link {
      background: none;
      border: none;
      padding: 0;
      font-family: ui-monospace, monospace;
      font-size: 0.8125rem;
      color: var(--color-primary);
      cursor: pointer;
      text-align: left;
    }
    .ref-link:hover { text-decoration: underline; }
    .action-buttons { display: flex; flex-wrap: nowrap; gap: 0.25rem; }
    .vehicle-pill, .trainer-pill, .attendance-pill {
      display: inline-flex;
      align-items: center;
      padding: 0.2rem 0.55rem;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 500;
      background: rgba(37, 99, 235, 0.08);
      color: var(--color-primary);
    }
    .trainer-pill.unassigned {
      background: rgba(245, 158, 11, 0.12);
      color: #B45309;
    }
  `]
})
export class AdminBookingsComponent implements OnInit {
  bookings: any[] = [];
  statusFilter = '';
  sourceFilter = '';
  attendanceFilter = '';
  branchFilter = '';
  trainerFilter = '';
  vehicleFilter = '';
  paymentStatusFilter = '';
  startDateFilter = '';
  endDateFilter = '';
  searchTerm = '';
  datePreset = 'all';
  loadingList = false;
  loadingKpis = false;
  totalRecords = 0;

  currentPage = 1;
  itemsPerPage = 20;
  totalPages = 1;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  branches: Branch[] = [];
  filterTrainers: any[] = [];
  vehicles: any[] = [];

  kpi = {
    todayBookings: 0,
    pending: 0,
    completed: 0,
    cancelled: 0
  };

  assignModalOpen = false;
  assignSaving = false;
  trainers: any[] = [];
  assignForm = {
    bookingId: '',
    customerName: '',
    slotTime: '',
    vehicle: '',
    trainerId: ''
  };

  detailsOpen = false;
  detailsBookingId: string | null = null;

  constructor(
    private adminService: AdminService,
    private apiService: ApiService,
    private branchService: BranchService,
    private route: ActivatedRoute,
    private toastService: ToastService,
    private confirmDialog: ConfirmDialogService,
    public perms: PermissionService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadFilterOptions(), this.loadKpis(), this.loadBookings()]);
    const detailsId = this.route.snapshot.queryParamMap.get('details');
    if (detailsId) {
      this.openDetails(detailsId);
    }
  }

  private listFilters() {
    return {
      status: this.statusFilter || undefined,
      source: this.sourceFilter || undefined,
      attendance: this.attendanceFilter || undefined,
      startDate: this.startDateFilter || undefined,
      endDate: this.endDateFilter || undefined,
      search: this.searchTerm.trim() || undefined,
      branchId: this.branchFilter || undefined,
      trainerId: this.trainerFilter || undefined,
      vehicleId: this.vehicleFilter || undefined,
      paymentStatus: this.paymentStatusFilter || undefined
    };
  }

  async loadFilterOptions() {
    try {
      const [branches, trainers, vehicles] = await Promise.all([
        this.branchService.list(true).catch(() => [] as Branch[]),
        this.adminService.getAllTrainers().catch(() => [] as any[]),
        firstValueFrom(this.apiService.getVehicles()).catch(() => [] as any[])
      ]);
      this.branches = Array.isArray(branches) ? branches : [];
      this.filterTrainers = (Array.isArray(trainers) ? trainers : []).filter((t) => t.is_active !== false);
      this.vehicles = Array.isArray(vehicles) ? vehicles : [];
    } catch {
      this.branches = [];
      this.filterTrainers = [];
      this.vehicles = [];
    }
  }

  async loadKpis() {
    this.loadingKpis = true;
    try {
      const stats = await this.adminService.getDashboardStats();
      this.kpi.todayBookings = Number(stats?.todayBookings) || 0;
      this.kpi.pending = Number(stats?.pendingBookings) || 0;
      this.kpi.completed = Number(stats?.completedBookings) || 0;
      this.kpi.cancelled = Number(stats?.cancelledBookings) || 0;
    } catch {
      // Keep previous KPI values on failure
    } finally {
      this.loadingKpis = false;
    }
  }

  async refreshAll() {
    await Promise.all([this.loadKpis(), this.loadBookings()]);
  }

  async loadBookings() {
    this.loadingList = true;
    try {
      const limit = Number(this.itemsPerPage) || 20;
      const offset = (this.currentPage - 1) * limit;
      const res = await this.adminService.getAllBookings({
        ...this.listFilters(),
        limit,
        offset
      });
      this.bookings = res.bookings;
      this.totalRecords = res.total;
      this.totalPages = Math.max(1, Math.ceil(this.totalRecords / limit));
      if (this.bookings.length === 0 && this.totalRecords > 0 && offset > 0) {
        this.currentPage = 1;
        await this.loadBookings();
        return;
      }
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to load bookings'));
      this.bookings = [];
      this.totalRecords = 0;
    } finally {
      this.loadingList = false;
    }
  }

  onServerFiltersChange() {
    this.currentPage = 1;
    void this.loadBookings();
  }

  onSearchChange(value: string) {
    this.searchTerm = value ?? '';
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => {
      this.applySearch();
    }, 300);
  }

  applySearch() {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.currentPage = 1;
    void this.loadBookings();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      void this.loadBookings();
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      } else if (current >= total - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = total - 3; i <= total; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = current - 1; i <= current + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(total);
      }
    }
    
    return pages;
  }

  onPageSizeChange(size?: number) {
    if (size != null) this.itemsPerPage = size;
    this.currentPage = 1;
    void this.loadBookings();
  }

  /** Local calendar date (YYYY-MM-DD) — avoids UTC shift from toISOString(). */
  private formatDateForFilter(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  private startOfWeek(date: Date): Date {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday start
    d.setDate(d.getDate() + diff);
    return d;
  }

  onDatePresetChange() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (this.datePreset) {
      case 'today': {
        const todayStr = this.formatDateForFilter(today);
        this.startDateFilter = todayStr;
        this.endDateFilter = todayStr;
        break;
      }
      case 'tomorrow': {
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = this.formatDateForFilter(tomorrow);
        this.startDateFilter = tomorrowStr;
        this.endDateFilter = tomorrowStr;
        break;
      }
      case 'thisWeek': {
        const weekStart = this.startOfWeek(today);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        this.startDateFilter = this.formatDateForFilter(weekStart);
        this.endDateFilter = this.formatDateForFilter(weekEnd);
        break;
      }
      case 'last7': {
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 6);
        this.startDateFilter = this.formatDateForFilter(last7);
        this.endDateFilter = this.formatDateForFilter(today);
        break;
      }
      case 'thisMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        this.startDateFilter = this.formatDateForFilter(firstDay);
        this.endDateFilter = this.formatDateForFilter(lastDay);
        break;
      }
      case 'lastMonth': {
        const firstDay = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth(), 0);
        this.startDateFilter = this.formatDateForFilter(firstDay);
        this.endDateFilter = this.formatDateForFilter(lastDay);
        break;
      }
      case 'all':
        this.startDateFilter = '';
        this.endDateFilter = '';
        break;
      case 'custom':
        // Keep existing dates or leave empty
        break;
    }
    this.onServerFiltersChange();
  }

  resetFilters() {
    this.searchTerm = '';
    this.statusFilter = '';
    this.sourceFilter = '';
    this.attendanceFilter = '';
    this.branchFilter = '';
    this.trainerFilter = '';
    this.vehicleFilter = '';
    this.paymentStatusFilter = '';
    this.datePreset = 'all';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.currentPage = 1;
    void this.loadBookings();
  }

  getStartIndex(): number {
    return this.totalRecords === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.totalRecords ? this.totalRecords : end;
  }

  getTrainerName(booking: any): string {
    return booking?.trainer?.profile?.full_name || booking?.trainer_name || '';
  }

  async openAssignTrainer(booking: any) {
    this.assignForm = {
      bookingId: booking.id,
      customerName: this.getCustomerName(booking),
      slotTime:
        booking.formatted_slot_time ||
        (booking.slot?.start_time ? this.formatDateTime(booking.slot.start_time) : 'N/A'),
      vehicle: this.getVehicleLabel(booking),
      trainerId: booking.trainer_id || ''
    };
    if (!this.trainers.length) {
      try {
        this.trainers = (await this.adminService.getAllTrainers()).filter((t) => t.is_active !== false);
      } catch {
        this.trainers = [];
      }
    }
    this.assignModalOpen = true;
  }

  closeAssignTrainer() {
    this.assignModalOpen = false;
    this.assignSaving = false;
  }

  async onAssignTrainerFromDetails(bookingId: string) {
    const booking = this.bookings.find((b) => b.id === bookingId);
    if (booking) {
      await this.openAssignTrainer(booking);
    } else {
      try {
        const detail = await this.adminService.getBookingDetail(bookingId);
        await this.openAssignTrainer(detail);
      } catch {
        this.toastService.error('Could not open trainer assignment');
      }
    }
  }

  async saveTrainerAssignment() {
    if (!this.assignForm.bookingId || !this.assignForm.trainerId) return;
    this.assignSaving = true;
    try {
      await firstValueFrom(
        this.adminService.assignBookingTrainer(this.assignForm.bookingId, this.assignForm.trainerId)
      );
      this.toastService.success('Trainer assigned successfully');
      this.closeAssignTrainer();
      await this.loadBookings();
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to assign trainer'));
    } finally {
      this.assignSaving = false;
    }
  }

  async updateStatus(bookingId: string, status: string) {
    const ok = await this.confirmDialog.confirm({
      title: 'Update booking status',
      message: `Are you sure you want to mark this booking as ${status}?`,
      confirmLabel: 'Yes, update',
      variant: status === 'cancelled' ? 'danger' : 'warning'
    });
    if (!ok) return;

    try {
      await firstValueFrom(this.adminService.updateBookingStatus(bookingId, status));

      // Reload bookings to get updated data
      await Promise.all([this.loadBookings(), this.loadKpis()]);
      
      // Show success message
      const statusMessages: { [key: string]: string } = {
        'completed': 'Booking marked as completed successfully',
        'confirmed': 'Booking confirmed successfully',
        'cancelled': 'Booking cancelled successfully',
        'pending': 'Booking status set to pending',
        'no_show': 'Booking marked as no-show'
      };
      
      this.toastService.success(statusMessages[status] || `Booking ${status} successfully`);
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to update booking status'));
    }
  }

  getVehicleLabel(booking: { vehicle_name?: string }): string {
    const name = booking?.vehicle_name || '';
    const category = categorizeVehicleName(name);
    if (category === 'ev_scooty') return 'Electric Scooty';
    if (category === 'petrol_scooty') return 'Petrol Scooty';
    if (category === 'bike') return 'Bike';
    return name || 'N/A';
  }

  getCustomerName(booking: any): string {
    if (booking?.booking_source === 'OFFLINE') {
      return booking.offline_customer_name || 'Walk-in customer';
    }
    return booking.user?.full_name || booking.user_name || 'N/A';
  }

  getCustomerSubline(booking: any): string {
    if (booking?.booking_source === 'OFFLINE') {
      return booking.phone || booking.user?.email || booking.user_email || '';
    }
    return booking.user?.email || booking.user_email || '';
  }

  getSourceLabel(booking: any): string {
    return booking?.booking_source === 'OFFLINE' ? 'Offline' : 'Online';
  }

  getCreatedByLabel(booking: any): string {
    if (booking?.booking_source !== 'OFFLINE') {
      return 'Self';
    }
    const name = booking.created_by_admin_name;
    if (!name) return 'Admin';
    if (booking.created_by_admin_role === 'subadmin') return `${name} (Sub Admin)`;
    if (booking.created_by_admin_role === 'superadmin') return `${name} (Super Admin)`;
    return name;
  }

  formatAttendance(value?: string): string {
    const map: Record<string, string> = {
      SCHEDULED: 'Scheduled',
      ATTENDED: 'Attended',
      NO_SHOW: 'No Show',
      CANCELLED: 'Cancelled'
    };
    return map[String(value || 'SCHEDULED').toUpperCase()] || 'Scheduled';
  }

  getStatusBadgeClass(status?: string): string {
    const s = String(status || '').toLowerCase();
    if (s === 'completed' || s === 'confirmed') return 'admin-badge-success';
    if (s === 'cancelled') return 'admin-badge-danger';
    if (s === 'pending') return 'admin-badge-warning';
    return 'admin-badge-neutral';
  }

  openDetails(bookingId: string) {
    this.detailsBookingId = bookingId;
    this.detailsOpen = true;
  }

  closeDetails() {
    this.detailsOpen = false;
    this.detailsBookingId = null;
  }

  async exportBookings() {
    try {
      const blob = await this.adminService.exportBookings(this.listFilters());
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bookings_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      this.toastService.success('Bookings exported');
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Export failed'));
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatDateTime(dateString: string): string {
    return new Date(dateString).toLocaleString();
  }

  async deleteBooking(bookingId: string) {
    const ok = await this.confirmDialog.confirm({
      title: 'Delete booking',
      message: 'Are you sure you want to permanently delete this booking? This action cannot be undone.',
      confirmLabel: 'Delete',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await firstValueFrom(this.adminService.deleteBooking(bookingId));
      await Promise.all([this.loadBookings(), this.loadKpis()]);
      this.toastService.success('Booking deleted successfully');
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to delete booking'));
    }
  }
}
