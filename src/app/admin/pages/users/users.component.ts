import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { getApiErrorMessage } from '../../../utils/api-error';
import { formatUserPhoneDisplay } from '../../../utils/phone-display';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminModalComponent],
  template: `
    <div class="users-page admin-page">
      <div class="admin-sticky-toolbar">
      <header class="admin-hero">
        <div>
          <h1>Users Management</h1>
          <p>Search users, review account status, and export records.</p>
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
              [ngModel]="searchTerm"
              (ngModelChange)="onSearchChange($event)"
              (keyup.enter)="applyFilters()"
              placeholder="Search users..." 
              class="admin-search-input"
              aria-label="Search users">
          </div>
          <select [(ngModel)]="roleFilter" (change)="applyFilters()" class="admin-select">
            <option value="">All Roles</option>
            <option value="customer">Customer</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
            <option value="superadmin">Superadmin</option>
            <option value="subadmin">Sub Admin</option>
          </select>
          <div class="admin-filter-spacer"></div>
          <button class="admin-btn admin-btn-secondary" (click)="exportUsers()" [disabled]="loadingList || users.length === 0" title="Export to CSV">
            <svg class="admin-btn-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            Export
          </button>
        </div>
      </div>
      </div>

      <div class="admin-table-skeleton" *ngIf="loadingList" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
      </div>

      <div class="admin-empty-state" *ngIf="!loadingList && users.length === 0">
        <div class="admin-empty-state-icon" aria-hidden="true">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3>{{ loadError ? 'Unable to load users' : 'No users found' }}</h3>
        <p>{{ loadError
          ? 'Something went wrong while loading this page. Check your connection and try again.'
          : (searchTerm.trim() || roleFilter
              ? 'No users match the current search or role filter. Clear filters to see everyone.'
              : 'There are no user records to show yet.') }}</p>
        <button type="button" class="admin-btn admin-btn-secondary" *ngIf="loadError" (click)="loadUsers()">Retry</button>
        <button
          type="button"
          class="admin-btn admin-btn-secondary"
          *ngIf="!loadError && (searchTerm.trim() || roleFilter)"
          (click)="clearFilters()">
          Clear filters
        </button>
      </div>

      <div class="admin-table-container admin-table-sticky users-table-wrap" *ngIf="!loadingList && users.length > 0">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Account</th>
              <th>Role</th>
              <th>Joined</th>
              <th *ngIf="showActionsColumn">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>
                <div class="user-name-cell">
                  <span class="user-name">{{ user.full_name || '—' }}</span>
                  <button
                    type="button"
                    class="admin-action-btn"
                    (click)="openActivity(user)"
                    title="View activity"
                    aria-label="View user activity">
                    <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>
                </div>
              </td>
              <td class="email-cell">{{ user.email }}</td>
              <td class="phone-cell" [class.phone-missing]="displayPhone(user) === 'Not Provided'">
                {{ displayPhone(user) }}
              </td>
              <td>
                <span *ngIf="user.inactive_blocked" class="admin-badge admin-badge-danger">Blocked</span>
                <span *ngIf="!user.inactive_blocked" class="admin-badge admin-badge-success">Active</span>
              </td>
              <td><span class="role-badge">{{ user.role }}</span></td>
              <td>{{ formatDate(user.created_at) }}</td>
              <td *ngIf="showActionsColumn">
                <button
                  *ngIf="needsReactivate(user)"
                  type="button"
                  class="admin-btn admin-btn-primary admin-btn-sm"
                  (click)="reactivateCustomer(user.id)">
                  Reactivate
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="!loadingList && totalRecords > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="totalRecords"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="users"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <app-admin-modal
        #activityModal
        [open]="activityOpen"
        title="User activity"
        [subtitle]="activityUser?.full_name || activityUser?.email || ''"
        [wide]="true"
        [dirty]="false"
        (closed)="closeActivity()">
        <div class="admin-filter-group admin-search-group activity-search">
          <svg class="admin-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="search"
            [(ngModel)]="activitySearch"
            (ngModelChange)="onActivitySearchChange($event)"
            placeholder="Search activity..."
            class="admin-search-input"
            aria-label="Search activity">
        </div>

        <div class="admin-table-skeleton" *ngIf="activityLoading" aria-busy="true">
          <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3]"></div>
        </div>

        <div class="admin-empty-state compact" *ngIf="!activityLoading && activityEvents.length === 0">
          <p>No activity recorded for this user.</p>
        </div>

        <div class="activity-timeline" *ngIf="!activityLoading && activityEvents.length > 0">
          <article class="activity-item" *ngFor="let event of activityEvents">
            <div class="activity-dot"></div>
            <div class="activity-body">
              <div class="activity-title">{{ event.title }}</div>
              <div class="activity-meta admin-cell-muted">
                {{ formatDateTime(event.created_at) }}
                <span *ngIf="event.actor_name"> · {{ event.actor_name }}</span>
                <span *ngIf="event.ip_address"> · IP {{ event.ip_address }}</span>
              </div>
              <div class="activity-desc" *ngIf="event.description">{{ event.description }}</div>
              <span class="admin-badge admin-badge-neutral activity-type">{{ formatEventType(event.type) }}</span>
            </div>
          </article>
        </div>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="activityModal.requestClose()">Close</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .users-page { max-width: 1400px; }
    .users-table-wrap { overflow-x: auto; }
    .admin-data-table { min-width: 820px; }
    .user-name-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      max-width: 100%;
    }
    .user-name { font-weight: 600; }
    .activity-search { margin-bottom: 1rem; width: 100%; }
    .activity-timeline { display: flex; flex-direction: column; gap: 0; }
    .activity-item { display: flex; gap: 0.75rem; padding-bottom: 1rem; border-bottom: 1px solid var(--color-border); margin-bottom: 0.75rem; }
    .activity-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-primary); margin-top: 0.4rem; flex-shrink: 0; }
    .activity-title { font-weight: 600; font-size: 0.875rem; }
    .activity-meta { font-size: 0.75rem; margin-top: 0.15rem; }
    .activity-desc { font-size: 0.8125rem; margin-top: 0.35rem; }
    .activity-type { margin-top: 0.35rem; font-size: 0.6875rem; }
    .admin-empty-state.compact { padding: 1.5rem; }
  `]
})
export class AdminUsersComponent implements OnInit, OnDestroy {
  users: any[] = [];
  totalRecords = 0;
  searchTerm = '';
  roleFilter = '';
  loadingList = false;
  loadError = false;

  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 1;
  private searchDebounce: ReturnType<typeof setTimeout> | null = null;

  activityOpen = false;
  activityUser: any = null;
  activityEvents: any[] = [];
  activityLoading = false;
  activitySearch = '';
  private activitySearchDebounce: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService
  ) {}

  /** Actions column only when a visible blocked customer can be reactivated. */
  get showActionsColumn(): boolean {
    return this.users.some((user) => this.needsReactivate(user));
  }

  needsReactivate(user: { inactive_blocked?: boolean; role?: string } | null | undefined): boolean {
    return !!user?.inactive_blocked && user?.role === 'customer';
  }

  async ngOnInit() {
    await this.loadUsers();
  }

  clearFilters() {
    this.searchTerm = '';
    this.roleFilter = '';
    this.applyFilters();
  }

  ngOnDestroy() {
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    if (this.activitySearchDebounce) clearTimeout(this.activitySearchDebounce);
  }

  async loadUsers() {
    this.loadingList = true;
    this.loadError = false;
    const limit = Number(this.itemsPerPage) || 25;
    const offset = (this.currentPage - 1) * limit;
    try {
      const res = await this.adminService.getAllUsers({
        role: this.roleFilter || undefined,
        search: this.searchTerm.trim() || undefined,
        limit,
        offset
      });
      this.users = res.users;
      this.totalRecords = res.total;
      this.totalPages = Math.max(1, Math.ceil(this.totalRecords / limit));
      if (this.users.length === 0 && this.totalRecords > 0 && offset > 0) {
        this.currentPage = 1;
        await this.loadUsers();
        return;
      }
    } catch (err) {
      this.loadError = true;
      this.users = [];
      this.totalRecords = 0;
      console.error('[AdminUsers] load failed', err);
      this.toastService.error(getApiErrorMessage(err, 'Failed to load users'));
    } finally {
      this.loadingList = false;
    }
  }

  onSearchChange(value: string) {
    this.searchTerm = value ?? '';
    if (this.searchDebounce) clearTimeout(this.searchDebounce);
    this.searchDebounce = setTimeout(() => this.applyFilters(), 300);
  }

  applyFilters() {
    if (this.searchDebounce) {
      clearTimeout(this.searchDebounce);
      this.searchDebounce = null;
    }
    this.currentPage = 1;
    void this.loadUsers();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      void this.loadUsers();
    }
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 25;
    this.currentPage = 1;
    void this.loadUsers();
  }

  openActivity(user: any) {
    this.activityUser = user;
    this.activityOpen = true;
    this.activitySearch = '';
    void this.loadActivity();
  }

  closeActivity() {
    this.activityOpen = false;
    this.activityUser = null;
    this.activityEvents = [];
  }

  onActivitySearchChange(value: string) {
    this.activitySearch = value ?? '';
    if (this.activitySearchDebounce) clearTimeout(this.activitySearchDebounce);
    this.activitySearchDebounce = setTimeout(() => void this.loadActivity(), 300);
  }

  async loadActivity() {
    if (!this.activityUser?.id) return;
    this.activityLoading = true;
    try {
      const res = await this.adminService.getUserActivity(this.activityUser.id, {
        search: this.activitySearch.trim() || undefined,
        limit: 200
      });
      this.activityEvents = res?.events || res?.data?.events || [];
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to load activity'));
      this.activityEvents = [];
    } finally {
      this.activityLoading = false;
    }
  }

  async reactivateCustomer(userId: string) {
    try {
      await firstValueFrom(this.adminService.updateUser(userId, { inactive_blocked: false }));
      await this.loadUsers();
      this.toastService.success('Customer reactivated');
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to reactivate'));
    }
  }

  displayPhone(user: { phone?: string | null }): string {
    return formatUserPhoneDisplay(user?.phone);
  }

  formatDate(date: string) {
    return new Date(date).toLocaleDateString();
  }

  formatDateTime(value?: string): string {
    if (!value) return '—';
    return new Date(value).toLocaleString();
  }

  formatEventType(type?: string): string {
    return String(type || 'ACTIVITY')
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  exportUsers() {
    const headers = ['Name', 'Email', 'Phone', 'Role', 'Joined'];
    const rows = this.users.map(user => [
      user.full_name || '',
      user.email || '',
      this.displayPhone(user),
      user.role || '',
      this.formatDate(user.created_at)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.toastService.success('Users exported successfully');
  }
}
