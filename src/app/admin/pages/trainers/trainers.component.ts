import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AdminService, TrainerDeletePreview } from '../../../services/admin.service';
import { Trainer } from '../../../services/trainer.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { firstValueFrom } from 'rxjs';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';

@Component({
  selector: 'app-admin-trainers',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent, AdminModalComponent],
  template: `
    <div class="trainers-page admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Trainers</h1>
            <p>Manage instructor profiles, ratings, and availability.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-primary" (click)="showCreateModal()">Add trainer</button>
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
              (input)="filterTrainers()"
              placeholder="Search name, email, specialization..." 
              class="admin-search-input">
          </div>
          <div class="admin-filter-group">
            <select [(ngModel)]="branchFilter" (change)="filterTrainers()" class="admin-select">
              <option value="all">All Branches</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="admin-filter-group">
            <select [(ngModel)]="statusFilter" (change)="filterTrainers()" class="admin-select">
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="on_leave">On Leave</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div class="admin-filter-group">
            <select [(ngModel)]="sortBy" (change)="filterTrainers()" class="admin-select">
              <option value="none">Sort by</option>
              <option value="rating">Rating</option>
              <option value="experience">Experience</option>
            </select>
          </div>
        </div>
        </div>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4,5,6]"></div>
      </div>

      <div class="admin-empty-state" *ngIf="!loading && !filteredTrainers.length">
        <div class="admin-empty-state-icon" aria-hidden="true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
          </svg>
        </div>
        <h3>No trainers found</h3>
        <p>Try another search or add a new trainer.</p>
        <button type="button" class="admin-btn admin-btn-primary" (click)="showCreateModal()">Add trainer</button>
      </div>

      <div class="admin-table-container admin-table-sticky" *ngIf="!loading && filteredTrainers.length">
        <table class="admin-data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Branch</th>
            <th>Exp</th>
            <th>Rating</th>
            <th>Specialization</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let trainer of getPaginatedTrainers()">
            <td>{{ trainer.profile?.full_name }}</td>
            <td class="email-cell">{{ trainer.profile?.email }}</td>
            <td>{{ branchName(trainer.branch_id) }}</td>
            <td>{{ trainer.experience_years }}y</td>
            <td>{{ trainer.rating || 0 }}/5</td>
            <td class="specialization-cell">
              <div class="specialization-text">{{ trainer.specialization?.join(', ') || 'N/A' }}</div>
            </td>
            <td>
              <span class="admin-badge" [class.admin-badge-success]="getTrainerStatus(trainer) === 'active'" [class.admin-badge-warning]="getTrainerStatus(trainer) === 'on_leave'" [class.admin-badge-danger]="getTrainerStatus(trainer) === 'inactive'">
                {{ getTrainerStatusLabel(trainer) }}
              </span>
            </td>
            <td>
              <div class="action-buttons">
                <button
                  type="button"
                  class="admin-action-btn"
                  (click)="showEditModal(trainer)"
                  title="Edit">
                  <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  class="admin-action-btn"
                  (click)="showLeaveModal(trainer)"
                  [disabled]="!trainer.is_active"
                  title="Manage leave">
                  <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                </button>
                <button
                  type="button"
                  class="admin-action-btn"
                  (click)="toggleActive(trainer.id, trainer.is_active)"
                  [title]="trainer.is_active ? 'Disable' : 'Enable'">
                  <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="trainer.is_active">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                  <svg class="icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" *ngIf="!trainer.is_active">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                </button>
                <button
                  type="button"
                  class="admin-action-btn danger"
                  (click)="confirmDelete(trainer)"
                  title="Delete"
                  [disabled]="trainer.is_active">
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
      </div>

      <app-admin-pagination
        *ngIf="!loading && filteredTrainers.length > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="filteredTrainers.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="trainers"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <app-admin-modal
        #deleteModal
        [open]="showDeleteModal"
        title="Delete trainer"
        [subtitle]="trainerToDelete?.profile?.full_name || ''"
        [wide]="true"
        [dirty]="false"
        (closed)="closeDeleteModal()">
        <div *ngIf="deletePreviewLoading" class="admin-cell-muted admin-loading-inline">Loading booking summary...</div>

        <ng-container *ngIf="!deletePreviewLoading && deletePreview">
          <p *ngIf="trainerToDelete?.is_active" class="admin-alert-warning">
            This trainer is still active. Deactivate them before deleting.
          </p>

          <ng-container *ngIf="!trainerToDelete?.is_active">
            <p *ngIf="deleteStep === 'summary' && deletePreview.canDeleteDirectly">
              Are you sure you want to delete <strong>{{ deletePreview.trainerName }}</strong>?
              This will remove the trainer record and revert their profile role to customer.
            </p>

            <ng-container *ngIf="deleteStep === 'summary' && !deletePreview.canDeleteDirectly">
              <p class="admin-alert-warning">
                Trainer has existing bookings. Some bookings may not have been marked as completed.
                Please review them before deleting this trainer.
              </p>
              <p class="admin-alert-warning" *ngIf="deletePreview.pastBlockingBookings > 0">
                {{ getPastBookingsWarning() }}
              </p>
              <div class="admin-stats-grid">
                <div class="admin-stat-card"><span>Total</span><strong>{{ deletePreview.totalBookings }}</strong></div>
                <div class="admin-stat-card"><span>Pending</span><strong>{{ deletePreview.pendingBookings }}</strong></div>
                <div class="admin-stat-card"><span>Active</span><strong>{{ deletePreview.activeBookings }}</strong></div>
                <div class="admin-stat-card"><span>Completed</span><strong>{{ deletePreview.completedBookings }}</strong></div>
                <div class="admin-stat-card" *ngIf="deletePreview.pastBlockingBookings > 0">
                  <span>Past (uncompleted)</span><strong>{{ deletePreview.pastBlockingBookings }}</strong>
                </div>
                <div class="admin-stat-card" *ngIf="deletePreview.futureBlockingBookings > 0">
                  <span>Upcoming</span><strong>{{ deletePreview.futureBlockingBookings }}</strong>
                </div>
              </div>
            </ng-container>

            <p *ngIf="deleteStep === 'complete_past_confirm'" class="admin-alert-warning">
              Mark <strong>{{ deletePreview.pastBlockingBookings }}</strong> past
              booking{{ deletePreview.pastBlockingBookings === 1 ? '' : 's' }} as <strong>Completed</strong>?
              <span *ngIf="deletePreview.futureBlockingBookings > 0">
                Upcoming bookings will not be changed.
              </span>
              <span *ngIf="deletePreview.futureBlockingBookings === 0">
                The trainer will be deleted if no other bookings remain.
              </span>
            </p>

            <p *ngIf="deleteStep === 'complete_confirm'" class="admin-alert-warning">
              Are you sure all trainer sessions are completed?
              This will mark all non-completed bookings as <strong>Completed</strong> before deleting the trainer.
            </p>

            <div *ngIf="deleteStep === 'reassign'" class="form-group">
              <label>Reassign active/pending bookings to</label>
              <select [(ngModel)]="reassignToTrainerId" name="reassignTrainer" class="admin-select reassign-select">
                <option value="">Select an active trainer</option>
                <option *ngFor="let t of deletePreview.availableReassignTrainers" [value]="t.id">
                  {{ t.name }}
                </option>
              </select>
              <p class="form-help">Booking history will be preserved. Only active and pending bookings are reassigned.</p>
            </div>
          </ng-container>
        </ng-container>

        <div adminModalFooter>
          <ng-container *ngIf="!deletePreviewLoading && deletePreview && !trainerToDelete?.is_active">
            <ng-container *ngIf="deleteStep === 'summary' && deletePreview.canDeleteDirectly">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteModal.requestClose()">Cancel</button>
              <button type="button" class="admin-btn admin-btn-danger" (click)="deleteTrainer('direct')" [disabled]="deletingTrainer">
                {{ deletingTrainer ? 'Deleting...' : 'Delete' }}
              </button>
            </ng-container>

            <ng-container *ngIf="deleteStep === 'summary' && !deletePreview.canDeleteDirectly">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteModal.requestClose()">Cancel Delete</button>
              <button
                type="button"
                class="admin-btn admin-btn-secondary"
                *ngIf="deletePreview.pastBlockingBookings > 0"
                (click)="deleteStep = 'complete_past_confirm'">
                Mark Past Bookings as Completed
              </button>
              <button type="button" class="admin-btn admin-btn-primary" (click)="deleteStep = 'complete_confirm'">
                Mark All Bookings as Completed
              </button>
              <button
                type="button"
                class="admin-btn admin-btn-primary"
                (click)="deleteStep = 'reassign'"
                [disabled]="deletePreview.availableReassignTrainers.length === 0">
                Reassign Trainer
              </button>
            </ng-container>

            <ng-container *ngIf="deleteStep === 'complete_past_confirm'">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteStep = 'summary'">Back</button>
              <button type="button" class="admin-btn admin-btn-danger" (click)="deleteTrainer('complete_past')" [disabled]="deletingTrainer">
                {{ deletingTrainer ? 'Processing...' : 'Mark Past & Continue' }}
              </button>
            </ng-container>

            <ng-container *ngIf="deleteStep === 'complete_confirm'">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteStep = 'summary'">Back</button>
              <button type="button" class="admin-btn admin-btn-danger" (click)="deleteTrainer('complete_all')" [disabled]="deletingTrainer">
                {{ deletingTrainer ? 'Processing...' : 'Confirm & Delete' }}
              </button>
            </ng-container>

            <ng-container *ngIf="deleteStep === 'reassign'">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteStep = 'summary'">Back</button>
              <button
                type="button"
                class="admin-btn admin-btn-danger"
                (click)="deleteTrainer('reassign')"
                [disabled]="!reassignToTrainerId || deletingTrainer">
                {{ deletingTrainer ? 'Processing...' : 'Reassign & Delete' }}
              </button>
            </ng-container>
          </ng-container>

          <ng-container *ngIf="!deletePreviewLoading && trainerToDelete?.is_active">
            <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteModal.requestClose()">Close</button>
          </ng-container>
        </div>
      </app-admin-modal>

      <app-admin-modal
        #trainerModal
        [open]="showModal"
        [title]="editingTrainer ? 'Edit trainer' : 'Add trainer'"
        subtitle="Profile details and specialization."
        [dirty]="formDirty"
        (closed)="closeModal()">
        <form id="trainer-form" (ngSubmit)="saveTrainer()">
          <div class="form-group">
            <label>Full Name *</label>
            <input type="text" class="admin-input" [(ngModel)]="trainerForm.full_name" name="full_name" required (ngModelChange)="formDirty = true" />
          </div>
          <div class="form-group">
            <label>Email *</label>
            <input type="email" class="admin-input" [(ngModel)]="trainerForm.email" name="email" required [disabled]="editingTrainer" (ngModelChange)="formDirty = true" />
          </div>
          <div class="form-group">
            <label>Phone</label>
            <input type="text" class="admin-input" [(ngModel)]="trainerForm.phone" name="phone" (ngModelChange)="formDirty = true" />
          </div>
          <div class="form-group">
            <label>Branch *</label>
            <select class="admin-select" [(ngModel)]="trainerForm.branch_id" name="branch_id" required (ngModelChange)="formDirty = true">
              <option value="">Select branch</option>
              <option *ngFor="let b of branches" [value]="b.id">{{ b.name }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>Bio *</label>
            <textarea class="admin-textarea" [(ngModel)]="trainerForm.bio" name="bio" rows="3" required (ngModelChange)="formDirty = true"></textarea>
          </div>
          <div class="form-group">
            <label>Experience Years *</label>
            <input type="number" class="admin-input" [(ngModel)]="trainerForm.experience_years" name="experience_years" min="0" required (ngModelChange)="formDirty = true" />
          </div>
          <div class="form-group">
            <label>Specialization (comma-separated)</label>
            <input type="text" class="admin-input" [(ngModel)]="specializationInput" name="specialization" placeholder="e.g., Beginner Training, Highway Riding" (ngModelChange)="formDirty = true" />
          </div>
          <div class="form-group">
            <label>Rating (0 - 5)</label>
            <input type="number" step="0.1" min="0" max="5" class="admin-input" [(ngModel)]="trainerForm.rating" name="rating" (ngModelChange)="formDirty = true" />
          </div>
        </form>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="trainerModal.requestClose()">Cancel</button>
          <button type="submit" form="trainer-form" class="admin-btn admin-btn-primary" [disabled]="savingTrainer">{{ savingTrainer ? 'Saving…' : (editingTrainer ? 'Save changes' : 'Create trainer') }}</button>
        </div>
      </app-admin-modal>

      <app-admin-modal
        #leaveModal
        [open]="showLeaveModalFlag"
        title="Trainer leave"
        [subtitle]="leaveTrainer?.profile?.full_name || ''"
        [dirty]="!!leaveForm.leave_date || !!leaveForm.reason"
        (closed)="closeLeaveModal()">
        <div class="form-group">
          <label>Leave date *</label>
          <input type="date" class="admin-input" [(ngModel)]="leaveForm.leave_date" name="leave_date" />
        </div>
        <div class="form-group">
          <label>Reason</label>
          <input type="text" class="admin-input" [(ngModel)]="leaveForm.reason" name="leave_reason" placeholder="Optional reason" />
        </div>
        <button type="button" class="admin-btn admin-btn-primary" (click)="addLeaveDate()" [disabled]="leaveSaving || !leaveForm.leave_date">
          {{ leaveSaving ? 'Saving…' : 'Mark leave' }}
        </button>

        <div class="form-group" *ngIf="leaveDates.length">
          <label>Upcoming leave dates</label>
          <div class="leave-date-row" *ngFor="let leave of leaveDates">
            <span>{{ leave.leave_date }}<span *ngIf="leave.reason"> — {{ leave.reason }}</span></span>
            <button type="button" class="admin-btn admin-btn-secondary" (click)="restoreLeaveDate(leave.leave_date)" [disabled]="leaveSaving">
              Restore
            </button>
          </div>
        </div>
        <p class="admin-cell-muted" *ngIf="!leaveDates.length">No upcoming leave dates.</p>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="leaveModal.requestClose()">Close</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .admin-data-table { min-width: 760px; }
    .specialization-cell { max-width: 200px; }
    .specialization-text {
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.4;
      font-size: var(--text-body-sm);
      color: var(--color-ink-soft);
    }
    .leave-date-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.5rem 0;
      border-bottom: 1px solid var(--color-border, #e5e7eb);
    }
  `]
})
export class AdminTrainersComponent implements OnInit {
  loading = false;
  trainers: Trainer[] = [];
  filteredTrainers: Trainer[] = [];
  showModal = false;
  formDirty = false;
  savingTrainer = false;
  showDeleteModal = false;
  deletingTrainer = false;
  deletePreviewLoading = false;
  deletePreview: TrainerDeletePreview | null = null;
  deleteStep: 'summary' | 'complete_past_confirm' | 'complete_confirm' | 'reassign' = 'summary';
  reassignToTrainerId = '';
  trainerToDelete: Trainer | null = null;
  editingTrainer: Trainer | null = null;
  specializationInput = '';
  searchTerm = '';
  branchFilter = 'all';
  statusFilter: 'all' | 'active' | 'on_leave' | 'inactive' = 'all';
  sortBy: 'none' | 'rating' | 'experience' = 'none';
  showLeaveModalFlag = false;
  leaveTrainer: Trainer | null = null;
  leaveDates: Array<{ leave_date: string; reason?: string | null }> = [];
  leaveSaving = false;
  leaveForm = { leave_date: '', reason: '' };
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 25;
  totalPages = 1;
  
  trainerForm: any = {
    full_name: '',
    email: '',
    phone: '',
    bio: '',
    experience_years: 0,
    specialization: [],
    rating: 0,
    branch_id: ''
  };
  branches: Branch[] = [];

  constructor(
    private adminService: AdminService,
    private branchService: BranchService,
    private toastService: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.loadTrainers(), this.loadBranches()]);
  }

  async loadBranches() {
    try {
      this.branches = await this.branchService.list(false);
    } catch {
      this.branches = [];
    }
  }

  async loadTrainers() {
    this.loading = true;
    try {
      this.trainers = await this.adminService.getAllTrainers();
      this.filterTrainers();
    } catch {
      this.toastService.error('Failed to load trainers');
    } finally {
      this.loading = false;
    }
  }

  branchName(branchId?: string): string {
    if (!branchId) return '—';
    return this.branches.find((b) => b.id === branchId)?.name || '—';
  }

  getTrainerStatus(trainer: Trainer): 'active' | 'on_leave' | 'inactive' {
    if (trainer.status) return trainer.status;
    if (!trainer.is_active) return 'inactive';
    if (trainer.on_leave_today) return 'on_leave';
    return 'active';
  }

  getTrainerStatusLabel(trainer: Trainer): string {
    const status = this.getTrainerStatus(trainer);
    if (status === 'on_leave') return 'On Leave';
    if (status === 'inactive') return 'Inactive';
    return 'Active';
  }

  filterTrainers() {
    let filtered = [...this.trainers];
    
    // Search filter
    const term = this.searchTerm.toLowerCase().trim();
    if (term) {
      filtered = filtered.filter(trainer => 
        trainer.profile?.full_name?.toLowerCase().includes(term) ||
        trainer.profile?.email?.toLowerCase().includes(term) ||
        trainer.specialization?.some(s => s.toLowerCase().includes(term))
      );
    }
    
    // Branch filter
    if (this.branchFilter !== 'all') {
      filtered = filtered.filter((trainer) => trainer.branch_id === this.branchFilter);
    }

    // Status filter
    if (this.statusFilter !== 'all') {
      filtered = filtered.filter((trainer) => {
        const status = this.getTrainerStatus(trainer);
        if (this.statusFilter === 'on_leave') {
          return status === 'on_leave' || (trainer.leave_dates?.length || 0) > 0;
        }
        return status === this.statusFilter;
      });
    }
    
    // Sort
    if (this.sortBy === 'rating') {
      filtered.sort((a, b) => (b.rating || 0) - (a.rating || 0));
    } else if (this.sortBy === 'experience') {
      filtered.sort((a, b) => (b.experience_years || 0) - (a.experience_years || 0));
    }
    
    this.filteredTrainers = filtered;
    this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredTrainers.length / this.itemsPerPage);
  }

  getPaginatedTrainers(): Trainer[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    return this.filteredTrainers.slice(start, end);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): (number | string)[] {
    const pages: (number | string)[] = [];
    const total = this.totalPages;
    const current = this.currentPage;
    
    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else if (current <= 3) {
      for (let i = 1; i <= 4; i++) pages.push(i);
      pages.push('...');
      pages.push(total);
    } else if (current >= total - 2) {
      pages.push(1, '...');
      for (let i = total - 3; i <= total; i++) pages.push(i);
    } else {
      pages.push(1, '...');
      pages.push(current - 1, current, current + 1);
      pages.push('...', total);
    }
    return pages;
  }

  getStartIndex(): number {
    return this.filteredTrainers.length === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
  }

  getEndIndex(): number {
    const end = this.currentPage * this.itemsPerPage;
    return end > this.filteredTrainers.length ? this.filteredTrainers.length : end;
  }

  onPageSizeChange(size?: number) {
    if (size != null) this.itemsPerPage = size;
    this.currentPage = 1;
    this.updatePagination();
  }


  showCreateModal() {
    this.editingTrainer = null;
    this.trainerForm = {
      full_name: '',
      email: '',
      phone: '',
      bio: '',
      experience_years: 0,
      specialization: [],
      rating: 0,
      branch_id: this.branches[0]?.id || ''
    };
    this.specializationInput = '';
    this.formDirty = false;
    this.showModal = true;
  }

  showEditModal(trainer: Trainer) {
    this.editingTrainer = trainer;
    this.trainerForm = {
      full_name: trainer.profile?.full_name || '',
      email: trainer.profile?.email || '',
      phone: trainer.profile?.phone || '',
      bio: trainer.bio,
      experience_years: trainer.experience_years,
      specialization: trainer.specialization,
      rating: trainer.rating || 0,
      branch_id: trainer.branch_id || ''
    };
    this.specializationInput = trainer.specialization?.join(', ') || '';
    this.formDirty = false;
    this.showModal = true;
  }

  closeModal(event?: Event) {
    event?.preventDefault();
    event?.stopPropagation();
    this.showModal = false;
    this.editingTrainer = null;
    this.savingTrainer = false;
    this.formDirty = false;
  }

  async saveTrainer() {
    if (this.savingTrainer) return;
    if (!this.trainerForm.full_name?.trim()) {
      this.toastService.error('Full name is required');
      return;
    }
    if (!this.editingTrainer && !this.trainerForm.email?.trim()) {
      this.toastService.error('Email is required');
      return;
    }
    const bio = this.trainerForm.bio?.trim() || '';
    if (!bio) {
      this.toastService.error('Bio is required');
      return;
    }
    if (bio.length < 10) {
      this.toastService.error('Bio must be at least 10 characters');
      return;
    }
    if (!this.trainerForm.branch_id) {
      this.toastService.error('Branch is required');
      return;
    }
    const phone = String(this.trainerForm.phone || '').trim();
    if (phone && !/^[0-9]{10}$/.test(phone)) {
      this.toastService.error('Phone number must be exactly 10 digits');
      return;
    }

    this.savingTrainer = true;
    const wasEdit = !!this.editingTrainer;
    try {
      const specialization = this.specializationInput
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

      if (this.editingTrainer) {
        const data = {
          full_name: this.trainerForm.full_name.trim(),
          phone: phone || null,
          bio,
          experience_years: parseInt(this.trainerForm.experience_years, 10) || 0,
          specialization,
          rating: parseFloat(this.trainerForm.rating) || 0,
          branch_id: this.trainerForm.branch_id
        };
        await firstValueFrom(this.adminService.updateTrainer(this.editingTrainer.id, data));
      } else {
        const data = {
          email: this.trainerForm.email.trim(),
          full_name: this.trainerForm.full_name.trim(),
          phone: phone || null,
          bio,
          experience_years: parseInt(this.trainerForm.experience_years, 10) || 0,
          specialization,
          rating: parseFloat(this.trainerForm.rating) || 0,
          branch_id: this.trainerForm.branch_id
        };
        await firstValueFrom(this.adminService.createTrainer(data));
      }

      this.showModal = false;
      this.editingTrainer = null;
      this.formDirty = false;
      await this.loadTrainers();
      this.toastService.success(wasEdit ? 'Trainer updated successfully' : 'Trainer created successfully');
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to save trainer'));
    } finally {
      this.savingTrainer = false;
    }
  }

  async toggleActive(trainerId: string, currentStatus: boolean) {
    try {
      await firstValueFrom(this.adminService.updateTrainer(trainerId, { is_active: !currentStatus }));
      await this.loadTrainers();
      this.toastService.success(`Trainer ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to update trainer status'));
    }
  }

  showLeaveModal(trainer: Trainer) {
    this.leaveTrainer = trainer;
    this.leaveForm = { leave_date: '', reason: '' };
    this.leaveDates = (trainer.leave_dates || []).slice().sort((a, b) => a.leave_date.localeCompare(b.leave_date));
    this.showLeaveModalFlag = true;
  }

  closeLeaveModal() {
    this.showLeaveModalFlag = false;
    this.leaveTrainer = null;
    this.leaveDates = [];
    this.leaveForm = { leave_date: '', reason: '' };
    this.leaveSaving = false;
  }

  async addLeaveDate() {
    if (!this.leaveTrainer || !this.leaveForm.leave_date || this.leaveSaving) return;
    this.leaveSaving = true;
    try {
      const result = await firstValueFrom(
        this.adminService.addTrainerLeave(
          this.leaveTrainer.id,
          this.leaveForm.leave_date,
          this.leaveForm.reason?.trim() || undefined
        )
      );
      this.leaveDates = (result?.trainer?.leave_dates || result?.leave_dates || this.leaveDates).slice();
      this.leaveForm = { leave_date: '', reason: '' };
      await this.loadTrainers();
      this.toastService.success('Leave date added successfully');
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to add leave date'));
    } finally {
      this.leaveSaving = false;
    }
  }

  async restoreLeaveDate(leaveDate: string) {
    if (!this.leaveTrainer || this.leaveSaving) return;
    this.leaveSaving = true;
    try {
      const result = await firstValueFrom(
        this.adminService.restoreTrainerLeave(this.leaveTrainer.id, leaveDate)
      );
      this.leaveDates = (result?.trainer?.leave_dates || []).slice();
      await this.loadTrainers();
      this.toastService.success('Leave date restored successfully');
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to restore leave date'));
    } finally {
      this.leaveSaving = false;
    }
  }

  async confirmDelete(trainer: Trainer) {
    this.trainerToDelete = trainer;
    this.deleteStep = 'summary';
    this.reassignToTrainerId = '';
    this.deletePreview = null;
    this.showDeleteModal = true;

    if (trainer.is_active) {
      return;
    }

    this.deletePreviewLoading = true;
    try {
      this.deletePreview = await firstValueFrom(
        this.adminService.getTrainerDeletePreview(trainer.id)
      );
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to load trainer booking summary'));
      this.closeDeleteModal();
    } finally {
      this.deletePreviewLoading = false;
    }
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.trainerToDelete = null;
    this.deletePreview = null;
    this.deleteStep = 'summary';
    this.reassignToTrainerId = '';
    this.deletePreviewLoading = false;
  }

  getPastBookingsWarning(): string {
    const count = this.deletePreview?.pastBlockingBookings ?? 0;
    if (count <= 0) {
      return '';
    }
    const label = count === 1 ? 'booking' : 'bookings';
    const verb = count === 1 ? 'is' : 'are';
    return `${count} ${label} appear to be in the past but ${verb} not marked completed.`;
  }

  async refreshDeletePreview() {
    if (!this.trainerToDelete) {
      return;
    }
    this.deletePreviewLoading = true;
    try {
      this.deletePreview = await firstValueFrom(
        this.adminService.getTrainerDeletePreview(this.trainerToDelete.id)
      );
      this.deleteStep = 'summary';
    } catch (error: unknown) {
      this.toastService.error(getApiErrorMessage(error, 'Failed to refresh booking summary'));
    } finally {
      this.deletePreviewLoading = false;
    }
  }

  async deleteTrainer(strategy: 'direct' | 'complete_all' | 'complete_past' | 'reassign') {
    if (!this.trainerToDelete || this.trainerToDelete.is_active) {
      return;
    }

    if (strategy === 'reassign' && !this.reassignToTrainerId) {
      this.toastService.error('Please select a trainer to reassign bookings to');
      return;
    }

    this.deletingTrainer = true;
    try {
      const result = await firstValueFrom(
        this.adminService.deleteTrainer(this.trainerToDelete.id, {
          strategy,
          reassignToTrainerId: strategy === 'reassign' ? this.reassignToTrainerId : undefined
        })
      );

      if (result?.deleted === false) {
        this.toastService.success(result.message || 'Past bookings marked as completed');
        await this.refreshDeletePreview();
        return;
      }

      let message = result?.message || 'Trainer deleted successfully';
      if (strategy === 'complete_all' && result?.updatedCount > 0) {
        message = `Marked ${result.updatedCount} booking(s) as completed and deleted trainer`;
      } else if (strategy === 'reassign' && result?.reassignedCount > 0) {
        message = `Reassigned ${result.reassignedCount} booking(s) and deleted trainer`;
      }

      this.closeDeleteModal();
      await this.loadTrainers();
      this.toastService.success(message);
    } catch (error: unknown) {
      this.toastService.error(
        getApiErrorMessage(error, 'This trainer has existing bookings. Please complete or reassign them before deleting.')
      );
    } finally {
      this.deletingTrainer = false;
    }
  }
}
