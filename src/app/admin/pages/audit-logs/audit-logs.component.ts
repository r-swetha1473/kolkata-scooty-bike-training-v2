import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { ToastService } from '../../../services/toast.service';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name?: string;
  admin_email?: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  before_value: any;
  after_value: any;
  details: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

@Component({
  selector: 'app-admin-audit-logs',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminModalComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Audit & activity</h1>
            <p>Track admin actions across bookings, payments, slots, and settings.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-secondary" (click)="loadLogs()" [disabled]="loading" title="Refresh">
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
                type="text"
                [(ngModel)]="searchTerm"
                (input)="applyFilters()"
                placeholder="Search admin name, action, entity..."
                class="admin-search-input"
                aria-label="Search audit logs">
            </div>
            <div class="admin-filter-group">
              <select [(ngModel)]="entityTypeFilter" (change)="onServerFilterChange()" class="admin-select" aria-label="Filter by entity">
                <option value="">All Entities</option>
                <option value="auth">Auth</option>
                <option value="slot">Slots</option>
                <option value="vehicle">Vehicles</option>
                <option value="booking">Bookings</option>
                <option value="payment">Payments</option>
                <option value="trainer">Trainers</option>
                <option value="branch">Branches</option>
                <option value="course">Courses</option>
                <option value="user">Users</option>
                <option value="settings">Settings</option>
              </select>
            </div>
            <div class="admin-filter-group">
              <select [(ngModel)]="actionTypeFilter" (change)="onServerFilterChange()" class="admin-select" aria-label="Filter by action">
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">Login success</option>
                <option value="LOGIN_FAILED">Login failed</option>
                <option value="LOGOUT">Logout</option>
                <option value="BOOKING_CREATED">Booking created</option>
                <option value="CANCEL_BOOKING">Cancel booking</option>
                <option value="PAYMENT_APPROVED">Payment approved</option>
                <option value="PAYMENT_REJECTED">Payment rejected</option>
                <option value="CREATE_SLOT">Create slot</option>
                <option value="UPDATE_SLOT">Update slot</option>
                <option value="DELETE_SLOT">Delete slot</option>
                <option value="CREATE_VEHICLE">Create vehicle</option>
                <option value="UPDATE_VEHICLE">Update vehicle</option>
                <option value="DELETE_VEHICLE">Delete vehicle</option>
                <option value="CREATE_TRAINER">Create trainer</option>
                <option value="UPDATE_TRAINER">Update trainer</option>
                <option value="CREATE_COURSE">Create course</option>
                <option value="UPDATE_COURSE">Update course</option>
                <option value="DELETE_COURSE">Delete course</option>
                <option value="BRANCH_CREATE">Branch create</option>
                <option value="BRANCH_UPDATE">Branch update</option>
                <option value="UPDATE_SETTINGS">Update settings</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
      </div>

      <div class="admin-empty-state" *ngIf="!loading && getPaginatedLogs().length === 0">
        <div class="admin-empty-state-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="16" y1="13" x2="8" y2="13"></line>
            <line x1="16" y1="17" x2="8" y2="17"></line>
          </svg>
        </div>
        <h3>No audit logs found</h3>
        <p>Try another entity, action, or search term.</p>
      </div>

      <div class="admin-table-container" *ngIf="!loading && getPaginatedLogs().length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>IP / Browser</th>
              <th>Changes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let log of getPaginatedLogs()">
              <td>
                <div class="admin-cell-stack">
                  <div class="admin-cell-primary">{{ formatDateTime(log.created_at) }}</div>
                  <div class="admin-cell-muted">{{ getRelativeTime(log.created_at) }}</div>
                </div>
              </td>
              <td>
                <div class="admin-cell-stack">
                  <div class="admin-cell-primary">{{ log.admin_name || 'Unknown' }}</div>
                  <div class="admin-cell-muted">{{ log.admin_email || '' }}</div>
                </div>
              </td>
              <td>
                <span class="admin-badge" [ngClass]="badgeClass(log.action_type)">
                  {{ formatActionType(log.action_type) }}
                </span>
              </td>
              <td>
                <div class="admin-cell-stack">
                  <span class="admin-cell-primary">{{ log.entity_type }}</span>
                  <span class="admin-cell-muted" *ngIf="log.entity_id">{{ log.entity_id.substring(0, 8) }}...</span>
                </div>
              </td>
              <td>
                <div class="admin-cell-stack">
                  <div class="admin-cell-primary">{{ log.ip_address || log.details?.ip_address || '—' }}</div>
                  <div class="admin-cell-muted" [title]="log.user_agent || ''">{{ shortUa(log.user_agent) }}</div>
                </div>
              </td>
              <td>
                <button
                  type="button"
                  class="admin-btn admin-btn-secondary admin-btn-sm"
                  (click)="viewDetails(log)"
                  title="View details">
                  View Details
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="!loading && filteredLogs.length > 0"
        [currentPage]="currentPage"
        [totalPages]="getTotalPages()"
        [totalRecords]="filteredLogs.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="logs"
        (pageChange)="currentPage = $event"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>
    </div>

    <app-admin-modal
      #auditModal
      [open]="showDetailsModal"
      title="Audit Log Details"
      [subtitle]="selectedLog ? (formatActionType(selectedLog.action_type) + ' · ' + selectedLog.entity_type) : ''"
      [wide]="true"
      [dirty]="false"
      (closed)="closeDetails()">
      <ng-container *ngIf="selectedLog">
        <h3>Basic Information</h3>
        <div class="admin-detail-row">
          <span class="admin-detail-label">Admin:</span>
          <span>{{ selectedLog.admin_name || 'Unknown' }} ({{ selectedLog.admin_email || 'N/A' }})</span>
        </div>
        <div class="admin-detail-row">
          <span class="admin-detail-label">Action:</span>
          <span>{{ formatActionType(selectedLog.action_type) }}</span>
        </div>
        <div class="admin-detail-row">
          <span class="admin-detail-label">Entity:</span>
          <span>{{ selectedLog.entity_type }} ({{ selectedLog.entity_id }})</span>
        </div>
        <div class="admin-detail-row">
          <span class="admin-detail-label">Timestamp:</span>
          <span>{{ formatDateTime(selectedLog.created_at) }}</span>
        </div>

        <ng-container *ngIf="selectedLog.before_value">
          <h3>Before</h3>
          <pre class="admin-json-pre">{{ formatJSON(selectedLog.before_value) }}</pre>
        </ng-container>

        <ng-container *ngIf="selectedLog.after_value">
          <h3>After</h3>
          <pre class="admin-json-pre">{{ formatJSON(selectedLog.after_value) }}</pre>
        </ng-container>

        <ng-container *ngIf="selectedLog.details">
          <h3>Details</h3>
          <pre class="admin-json-pre">{{ formatJSON(selectedLog.details) }}</pre>
        </ng-container>
      </ng-container>
      <div adminModalFooter>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="auditModal.requestClose()">Close</button>
      </div>
    </app-admin-modal>
  `,
  styles: []
})
export class AdminAuditLogsComponent implements OnInit {
  logs: AuditLog[] = [];
  filteredLogs: AuditLog[] = [];
  searchTerm = '';
  entityTypeFilter = '';
  actionTypeFilter = '';
  currentPage = 1;
  itemsPerPage = 20;
  showDetailsModal = false;
  selectedLog: AuditLog | null = null;
  loading = false;

  constructor(
    private api: ApiService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.loadLogs();
  }

  async onServerFilterChange() {
    await this.loadLogs();
  }

  async loadLogs() {
    this.loading = true;
    try {
      const params: any = { limit: 500, offset: 0 };
      if (this.entityTypeFilter) params.entity_type = this.entityTypeFilter;
      if (this.actionTypeFilter) params.action_type = this.actionTypeFilter;

      const queryString = new URLSearchParams(params).toString();
      this.logs = await this.api.get<AuditLog[]>(`/admin/audit-logs?${queryString}`);
      this.applyFilters();
    } catch (error: any) {
      this.toast.error(error?.error?.error || 'Failed to load audit logs');
    } finally {
      this.loading = false;
    }
  }

  applyFilters() {
    let filtered = [...this.logs];

    // Search filter
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        (log.admin_name && log.admin_name.toLowerCase().includes(term)) ||
        (log.admin_email && log.admin_email.toLowerCase().includes(term)) ||
        log.action_type.toLowerCase().includes(term) ||
        log.entity_type.toLowerCase().includes(term) ||
        (log.entity_id && log.entity_id.toLowerCase().includes(term))
      );
    }

    this.filteredLogs = filtered;
    this.currentPage = 1;
  }

  getPaginatedLogs(): AuditLog[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredLogs.slice(start, end);
  }

  getTotalPages(): number {
    return Math.max(1, Math.ceil(this.filteredLogs.length / this.itemsPerPage));
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 20;
    this.currentPage = 1;
  }

  viewDetails(log: AuditLog) {
    this.selectedLog = log;
    this.showDetailsModal = true;
  }

  closeDetails() {
    this.showDetailsModal = false;
    this.selectedLog = null;
  }

  badgeClass(action: string): string {
    const a = (action || '').toLowerCase();
    if (a.includes('create')) return 'admin-badge-success';
    if (a.includes('delete') || a.includes('reject')) return 'admin-badge-danger';
    if (a.includes('update')) return 'admin-badge-info';
    if (a.includes('cancel')) return 'admin-badge-warning';
    return 'admin-badge-neutral';
  }

  formatActionType(actionType: string): string {
    return actionType
      .split('_')
      .map(word => word.charAt(0) + word.slice(1).toLowerCase())
      .join(' ');
  }

  shortUa(ua?: string | null): string {
    if (!ua) return '—';
    if (ua.length <= 42) return ua;
    return ua.slice(0, 42) + '…';
  }

  formatDateTime(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  getRelativeTime(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }

  formatJSON(obj: any): string {
    if (!obj) return 'N/A';
    try {
      return JSON.stringify(obj, null, 2);
    } catch {
      return String(obj);
    }
  }
}
