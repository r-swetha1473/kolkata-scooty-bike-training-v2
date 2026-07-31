import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Coupon, CouponService } from '../../../services/coupon.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-coupons',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Coupons</h1>
            <p>Promotional codes and discounts for bookings.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add coupon</button>
          </div>
        </header>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
      </div>

      <div class="admin-table-container admin-table-sticky" *ngIf="!loading && coupons.length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Discount</th>
              <th>Usage</th>
              <th>Validity</th>
              <th>Active</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of getPaginated()">
              <td>
                <strong>{{ c.code }}</strong>
                <div class="cell-sub" *ngIf="c.description">{{ c.description }}</div>
              </td>
              <td>{{ discountLabel(c) }}</td>
              <td>{{ c.used_count || 0 }}{{ c.usage_limit != null ? ' / ' + c.usage_limit : '' }}</td>
              <td class="cell-sub">{{ validityLabel(c) }}</td>
              <td>
                <label class="active-toggle">
                  <input
                    type="checkbox"
                    [checked]="c.is_active"
                    [disabled]="togglingId === c.id"
                    (change)="toggleActive(c, $event)" />
                  <span class="admin-badge" [class.admin-badge-success]="c.is_active" [class.admin-badge-neutral]="!c.is_active">
                    {{ c.is_active ? 'Active' : 'Off' }}
                  </span>
                </label>
              </td>
              <td class="actions-cell">
                <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="openEdit(c)">Edit</button>
                <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" (click)="confirmDelete(c)" [disabled]="deletingId === c.id">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="!loading && coupons.length > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="coupons.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="coupons"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <div class="admin-empty-state" *ngIf="!loading && !coupons.length">
        <h3>No coupons yet</h3>
        <p>Create percentage or flat discounts for bookings.</p>
        <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add coupon</button>
      </div>

      <app-admin-modal
        #couponModal
        [open]="showDrawer"
        [title]="editing ? 'Edit coupon' : 'Add coupon'"
        subtitle="Codes are stored uppercase."
        [wide]="true"
        [dirty]="formDirty"
        (closed)="closeDrawer()">
        <form (ngSubmit)="save()" id="coupon-form">
          <div class="form-row-grid">
            <div class="form-group"><label>Code *</label><input class="admin-input" [(ngModel)]="form.code" name="code" required (ngModelChange)="markDirty()" /></div>
            <div class="form-group">
              <label>Discount type *</label>
              <select class="admin-input" [(ngModel)]="form.discount_type" name="discount_type" (ngModelChange)="markDirty()">
                <option value="percent">Percent</option>
                <option value="flat">Flat (INR)</option>
              </select>
            </div>
          </div>
          <div class="form-group"><label>Description</label><input class="admin-input" [(ngModel)]="form.description" name="description" (ngModelChange)="markDirty()" /></div>
          <div class="form-row-grid">
            <div class="form-group"><label>Discount value *</label><input type="number" class="admin-input" [(ngModel)]="form.discount_value" name="discount_value" min="0" required (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Max discount (optional)</label><input type="number" class="admin-input" [(ngModel)]="form.max_discount" name="max_discount" min="0" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-row-grid">
            <div class="form-group"><label>Min amount</label><input type="number" class="admin-input" [(ngModel)]="form.min_amount" name="min_amount" min="0" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Usage limit</label><input type="number" class="admin-input" [(ngModel)]="form.usage_limit" name="usage_limit" min="1" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-row-grid">
            <div class="form-group"><label>Starts at</label><input type="datetime-local" class="admin-input" [(ngModel)]="startLocal" name="start_at" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Ends at</label><input type="datetime-local" class="admin-input" [(ngModel)]="endLocal" name="end_at" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-row-grid">
            <div class="form-group">
              <label>Branch (optional)</label>
              <select class="admin-input" [(ngModel)]="form.branch_id" name="branch_id" (ngModelChange)="markDirty()">
                <option [ngValue]="null">Any branch</option>
                <option *ngFor="let b of branches" [ngValue]="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="form-group checkbox-stack">
              <label><input type="checkbox" [(ngModel)]="form.is_active" name="is_active" (ngModelChange)="markDirty()" /> Active</label>
            </div>
          </div>
        </form>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="couponModal.requestClose()">Cancel</button>
          <button type="submit" form="coupon-form" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save coupon' }}</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .cell-sub { font-size: var(--text-body-sm); color: var(--color-muted); margin-top: 2px; }
    .actions-cell { display: flex; gap: var(--space-2); flex-wrap: wrap; justify-content: flex-end; }
    .form-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .checkbox-stack { display: flex; flex-direction: column; gap: var(--space-2); justify-content: flex-end; padding-bottom: 4px; }
    .active-toggle { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
    .active-toggle input { margin: 0; }
    @media (max-width: 640px) { .form-row-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminCouponsComponent implements OnInit {
  coupons: Coupon[] = [];
  branches: Branch[] = [];
  loading = true;
  showDrawer = false;
  formDirty = false;
  saving = false;
  deletingId = '';
  togglingId = '';
  editing: Coupon | null = null;
  form: Partial<Coupon> = this.emptyForm();
  startLocal = '';
  endLocal = '';
  currentPage = 1;
  itemsPerPage = 25;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.coupons.length / this.itemsPerPage));
  }

  constructor(
    private api: CouponService,
    private branchesApi: BranchService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadBranches()]);
  }

  getPaginated(): Coupon[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.coupons.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 25;
    this.currentPage = 1;
  }

  markDirty() {
    this.formDirty = true;
  }

  emptyForm(): Partial<Coupon> {
    return {
      code: '',
      description: '',
      discount_type: 'percent',
      discount_value: 10,
      min_amount: 0,
      max_discount: null,
      usage_limit: null,
      branch_id: null,
      vehicle_id: null,
      is_active: true
    };
  }

  discountLabel(c: Coupon): string {
    if (c.discount_type === 'percent') {
      const max = c.max_discount != null ? ` (max ₹${c.max_discount})` : '';
      return `${c.discount_value}%${max}`;
    }
    return `₹${c.discount_value}`;
  }

  validityLabel(c: Coupon): string {
    const start = c.start_at ? new Date(c.start_at).toLocaleDateString('en-IN') : '—';
    const end = c.end_at ? new Date(c.end_at).toLocaleDateString('en-IN') : '—';
    return `${start} → ${end}`;
  }

  toLocalInput(iso?: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  fromLocalInput(local: string): string | null {
    if (!local?.trim()) return null;
    const d = new Date(local);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
  }

  async loadBranches() {
    try {
      this.branches = await this.branchesApi.list(false);
    } catch {
      this.branches = [];
    }
  }

  async load() {
    this.loading = true;
    try {
      this.coupons = await this.api.list(false);
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to load coupons'));
    } finally {
      this.loading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.form = this.emptyForm();
    this.startLocal = '';
    this.endLocal = '';
    this.formDirty = false;
    this.showDrawer = true;
  }

  openEdit(coupon: Coupon) {
    this.editing = coupon;
    this.form = {
      ...coupon,
      branch_id: coupon.branch_id || null,
      vehicle_id: coupon.vehicle_id || null,
      max_discount: coupon.max_discount ?? null,
      usage_limit: coupon.usage_limit ?? null
    };
    this.startLocal = this.toLocalInput(coupon.start_at);
    this.endLocal = this.toLocalInput(coupon.end_at);
    this.formDirty = false;
    this.showDrawer = true;
  }

  closeDrawer() {
    this.showDrawer = false;
    this.editing = null;
    this.saving = false;
    this.formDirty = false;
  }

  async toggleActive(coupon: Coupon, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    if (this.togglingId) {
      (event.target as HTMLInputElement).checked = coupon.is_active;
      return;
    }
    this.togglingId = coupon.id;
    try {
      await this.api.update(coupon.id, { is_active: checked });
      coupon.is_active = checked;
      this.toast.success(checked ? 'Coupon activated' : 'Coupon deactivated');
    } catch (e) {
      (event.target as HTMLInputElement).checked = coupon.is_active;
      this.toast.error(getApiErrorMessage(e, 'Failed to update coupon'));
    } finally {
      this.togglingId = '';
    }
  }

  async save() {
    if (this.saving) return;
    if (!this.form.code?.trim() || this.form.discount_value == null) {
      this.toast.error('Code and discount value are required');
      return;
    }
    this.saving = true;
    const payload: Partial<Coupon> = {
      ...this.form,
      code: String(this.form.code).trim().toUpperCase(),
      branch_id: this.form.branch_id || null,
      vehicle_id: this.form.vehicle_id || null,
      max_discount: this.form.max_discount ?? null,
      usage_limit: this.form.usage_limit ?? null,
      start_at: this.fromLocalInput(this.startLocal),
      end_at: this.fromLocalInput(this.endLocal)
    };
    try {
      if (this.editing) {
        await this.api.update(this.editing.id, payload);
        this.toast.success('Coupon updated');
      } else {
        await this.api.create(payload);
        this.toast.success('Coupon created');
      }
      this.closeDrawer();
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to save coupon'));
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(coupon: Coupon) {
    if (this.deletingId) return;
    if (!window.confirm(`Delete coupon "${coupon.code}"?`)) return;
    this.deletingId = coupon.id;
    try {
      await this.api.delete(coupon.id);
      this.toast.success('Coupon deleted');
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to delete coupon'));
    } finally {
      this.deletingId = '';
    }
  }
}
