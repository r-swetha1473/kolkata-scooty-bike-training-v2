import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { ToastService } from '../../../services/toast.service';
import { ConfirmDialogService } from '../../../services/confirm-dialog.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { formatUserPhoneDisplay } from '../../../utils/phone-display';

@Component({
  selector: 'app-admin-reactivation-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Reactivation Requests</h1>
            <p>Review and approve or reject customer account reactivation requests.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-secondary" (click)="loadRequests()" [disabled]="loading" title="Refresh">
              {{ loading ? 'Loading…' : 'Refresh' }}
            </button>
          </div>
        </header>

        <div class="admin-filters-bar">
          <div class="admin-filters-content">
            <select [(ngModel)]="statusFilter" (change)="loadRequests()" class="admin-select" aria-label="Filter by status">
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5]"></div>
      </div>

      <div class="admin-empty-state" *ngIf="!loading && requests.length === 0">
        <div class="admin-empty-state-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
        </div>
        <h3>No reactivation requests found</h3>
        <p>Try another status filter or refresh.</p>
      </div>

      <div class="admin-table-container" *ngIf="!loading && requests.length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Customer Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Request Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of requests">
              <td>{{ row.user_name || 'N/A' }}</td>
              <td>{{ row.user_email || 'N/A' }}</td>
              <td>{{ displayPhone(row.user_phone) }}</td>
              <td>{{ formatDate(row.requested_at) }}</td>
              <td>
                <span class="admin-badge" [ngClass]="statusBadgeClass(row.status)">{{ statusLabel(row.status) }}</span>
              </td>
              <td>
                <div class="admin-action-group" *ngIf="row.status === 'pending'">
                  <button type="button" class="admin-btn admin-btn-primary admin-btn-sm" (click)="approve(row.id)" [disabled]="actionId === row.id">
                    Approve
                  </button>
                  <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" (click)="reject(row.id)" [disabled]="actionId === row.id">
                    Reject
                  </button>
                </div>
                <span *ngIf="row.status !== 'pending'" class="admin-cell-muted">Reviewed</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: []
})
export class AdminReactivationRequestsComponent implements OnInit {
  requests: any[] = [];
  loading = false;
  statusFilter = 'pending';
  actionId: string | null = null;

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private confirmDialog: ConfirmDialogService
  ) {}

  ngOnInit() {
    void this.loadRequests();
  }

  async loadRequests() {
    this.loading = true;
    try {
      const result = await this.adminService.getReactivationRequests({
        status: this.statusFilter || undefined
      });
      this.requests = result.requests || [];
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to load reactivation requests'));
      this.requests = [];
    } finally {
      this.loading = false;
    }
  }

  displayPhone(phone: string | null | undefined): string {
    return formatUserPhoneDisplay(phone);
  }

  formatDate(value: string): string {
    if (!value) return 'N/A';
    return new Date(value).toLocaleString();
  }

  statusLabel(status: string): string {
    if (status === 'pending') return 'Pending';
    if (status === 'approved') return 'Approved';
    if (status === 'rejected') return 'Rejected';
    return status;
  }

  statusBadgeClass(status: string): string {
    if (status === 'pending') return 'admin-badge-warning';
    if (status === 'approved') return 'admin-badge-success';
    if (status === 'rejected') return 'admin-badge-danger';
    return 'admin-badge-neutral';
  }

  async approve(id: string) {
    const ok = await this.confirmDialog.confirm({
      title: 'Approve reactivation',
      message: 'Approve this reactivation request and reactivate the customer account?',
      confirmLabel: 'Approve',
      variant: 'success'
    });
    if (!ok) return;
    this.actionId = id;
    try {
      await firstValueFrom(this.adminService.approveReactivationRequest(id));
      this.toastService.success('Account reactivated');
      await this.loadRequests();
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to approve request'));
    } finally {
      this.actionId = null;
    }
  }

  async reject(id: string) {
    const ok = await this.confirmDialog.confirm({
      title: 'Reject reactivation',
      message: 'Reject this reactivation request?',
      confirmLabel: 'Reject',
      variant: 'danger'
    });
    if (!ok) return;
    this.actionId = id;
    try {
      await firstValueFrom(this.adminService.rejectReactivationRequest(id));
      this.toastService.success('Request rejected');
      await this.loadRequests();
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to reject request'));
    } finally {
      this.actionId = null;
    }
  }
}
