import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AdminService } from '../../../services/admin.service';
import { CandidateListRow, CandidatesService } from '../../../services/candidates.service';
import { PermissionService } from '../../../services/permission.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { balanceLabel, formatInr } from '../../../utils/candidate-money';

@Component({
  selector: 'app-admin-candidates',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="admin-page candidates-page">
      <header class="admin-hero">
        <div>
          <h1>Candidates</h1>
          <p>Admissions, fees, and classes in one list.</p>
        </div>
        <div class="admin-hero-actions">
          <button type="button" class="admin-btn admin-btn-secondary" (click)="exportCsv()" [disabled]="loading">Export</button>
          <a *ngIf="perms.can('candidates', 'create')" routerLink="/admin/candidates/new" class="admin-btn admin-btn-primary">New admission</a>
        </div>
      </header>

      <div class="filters">
        <input class="admin-input" [(ngModel)]="search" (keyup.enter)="reload(0)" placeholder="Search name or mobile" aria-label="Search candidates" />
        <select class="admin-select" [(ngModel)]="trainerId" (change)="reload(0)" aria-label="Filter by trainer">
          <option value="">All trainers</option>
          <option *ngFor="let trainer of trainers" [value]="trainer.id">{{ trainer.name }}</option>
        </select>
        <select class="admin-select" [(ngModel)]="status" (change)="reload(0)" aria-label="Filter by status">
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="COMPLETED">Completed</option>
          <option value="DROPPED">Dropped</option>
        </select>
        <label class="due-check"><input type="checkbox" [(ngModel)]="hasDue" (change)="reload(0)" /> Has due</label>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
      </div>

      <div class="admin-empty-state" *ngIf="!loading && !rows.length">
        <h3>No candidates</h3>
        <p>Try another search, or add an admission.</p>
      </div>

      <div class="admin-table-container" *ngIf="!loading && rows.length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Mobile</th>
              <th>Trainer</th>
              <th>Admitted</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Due</th>
              <th>Classes</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of rows" (click)="open(row)" class="click-row">
              <td>{{ row.name }}</td>
              <td>{{ row.mobile }}</td>
              <td>{{ row.trainer_label || 'Unassigned' }}</td>
              <td>{{ day(row.admission_date) }}</td>
              <td>{{ inr(row.total_fee) }}</td>
              <td>{{ inr(row.paid_total) }}</td>
              <td [class.due]="balance(row.due_total).tone === 'due'" [class.overpaid]="balance(row.due_total).tone === 'overpaid'">{{ balance(row.due_total).text }}</td>
              <td>{{ row.classes_completed }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="pager" *ngIf="total > limit">
        <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="reload(offset - limit)" [disabled]="offset === 0">Previous</button>
        <span>{{ offset + 1 }}–{{ endIndex }} of {{ total }}</span>
        <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="reload(offset + limit)" [disabled]="offset + limit >= total">Next</button>
      </div>
    </div>
  `,
  styles: [`
    .filters { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
    .filters .admin-input, .filters .admin-select { min-width: 10rem; flex: 1; font-size: 16px; }
    .due-check { display: flex; align-items: center; gap: 0.35rem; font-size: 0.875rem; }
    .click-row { cursor: pointer; }
    .due { color: #b91c1c; font-weight: 700; }
    .overpaid { color: #1d4ed8; font-weight: 700; }
    .pager { display: flex; gap: 0.75rem; align-items: center; margin-top: 0.75rem; }
    @media (max-width: 720px) {
      .admin-table-container { overflow-x: auto; }
    }
  `]
})
export class AdminCandidatesComponent implements OnInit {
  rows: CandidateListRow[] = [];
  trainers: Array<{ id: string; name: string }> = [];
  search = '';
  trainerId = '';
  status = '';
  hasDue = false;
  loading = false;
  total = 0;
  limit = 50;
  offset = 0;

  constructor(
    private candidates: CandidatesService,
    private adminService: AdminService,
    private router: Router,
    private toast: ToastService,
    public perms: PermissionService
  ) {}

  ngOnInit(): void {
    void this.loadTrainers();
    void this.reload(0);
  }

  get endIndex(): number {
    return Math.min(this.offset + this.rows.length, this.total);
  }

  inr(value: string): string {
    return formatInr(value);
  }

  day(value: string | null | undefined): string {
    return String(value || '').slice(0, 10);
  }

  balance(value: string) {
    return balanceLabel(value);
  }

  open(row: CandidateListRow): void {
    void this.router.navigate(['/admin/candidates', row.id]);
  }

  async reload(nextOffset: number): Promise<void> {
    this.loading = true;
    this.offset = Math.max(0, nextOffset);
    try {
      const result = await this.candidates.list({
        search: this.search.trim(),
        trainer_id: this.trainerId,
        status: this.status,
        due: this.hasDue ? 'true' : '',
        limit: String(this.limit),
        offset: String(this.offset)
      });
      this.rows = result.candidates || [];
      this.total = result.total || 0;
    } catch (error) {
      this.toast.error(getApiErrorMessage(error, 'Could not load candidates'));
    } finally {
      this.loading = false;
    }
  }

  async exportCsv(): Promise<void> {
    try {
      const blob = await this.candidates.exportCsv({
        search: this.search.trim(),
        trainer_id: this.trainerId,
        status: this.status,
        due: this.hasDue ? 'true' : ''
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'candidates.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.toast.error(getApiErrorMessage(error, 'Could not export candidates'));
    }
  }

  private async loadTrainers(): Promise<void> {
    try {
      const rows = await this.adminService.getAllTrainers();
      this.trainers = (rows || [])
        .filter((row) => row.is_active !== false)
        .map((row) => ({ id: row.id, name: row.profile?.full_name || row.full_name || 'Trainer' }));
    } catch {
      this.trainers = [];
    }
  }
}
