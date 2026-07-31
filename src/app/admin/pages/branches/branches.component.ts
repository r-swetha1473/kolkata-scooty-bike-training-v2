import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Branch, BranchService } from '../../../services/branch.service';
import { PermissionService } from '../../../services/permission.service';
import { ToastService } from '../../../services/toast.service';
import { pickUploadedImageUrl } from '../../../utils/media-url';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

const DAY_OPTIONS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' }
];

@Component({
  selector: 'app-admin-branches',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <header class="admin-hero">
        <div>
          <h1>Branch management</h1>
          <p>Locations, hours, slot timing, and capacity for each training centre.</p>
        </div>
        <div class="admin-hero-actions">
          <button type="button" class="admin-btn admin-btn-primary" *ngIf="perms.can('branches','create')" (click)="startCreate()">
            Add branch
          </button>
        </div>
      </header>

      <section class="admin-panel" *ngIf="editing">
        <h2>{{ form.id ? 'Edit branch' : 'New branch' }}</h2>
        <form class="admin-form-grid" (ngSubmit)="save()">
          <label>Name <input [(ngModel)]="form.name" name="name" required /></label>
          <label>Slug <input [(ngModel)]="form.slug" name="slug" /></label>
          <label class="full">Address <textarea [(ngModel)]="form.address" name="address" rows="2"></textarea></label>
          <label>Phone <input [(ngModel)]="form.contact_phone" name="phone" /></label>
          <label>Email <input [(ngModel)]="form.contact_email" name="email" /></label>
          <label class="full">Google Maps URL <input [(ngModel)]="form.maps_url" name="maps" placeholder="https://maps.google.com/..." /></label>
          <label>Opening <input type="time" [(ngModel)]="form.opening_time" name="open" /></label>
          <label>Closing <input type="time" [(ngModel)]="form.closing_time" name="close" /></label>
          <label>Slot minutes <input type="number" [(ngModel)]="form.slot_duration_minutes" name="dur" min="15" max="120" /></label>
          <label>
            Default slot capacity
            <input type="number" [(ngModel)]="form.default_slot_capacity" name="cap" min="1" max="100" />
          </label>
          <div class="full days-block">
            <span class="days-label">Operating days</span>
            <div class="days-row">
              <label class="day-chip" *ngFor="let d of dayOptions">
                <input type="checkbox" [checked]="hasDay(d.value)" (change)="toggleDay(d.value, $event)" />
                {{ d.label }}
              </label>
            </div>
          </div>
          <div class="full">
            <label class="block-label">Branch image</label>
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onImageSelected($event)" [disabled]="uploadingImage" />
            <input [(ngModel)]="form.image_url" name="image_url" placeholder="Image URL or upload above" />
            <img *ngIf="form.image_url" [src]="previewUrl(form.image_url)" alt="Branch preview" class="image-preview" />
            <p class="hint">Live slot capacity also uses the sum of this branch’s active vehicle max-per-slot values when auto-capacity is enabled.</p>
          </div>
          <label class="check"><span>Active</span>
            <input type="checkbox" [(ngModel)]="form.is_active" name="active" />
          </label>
          <div class="full actions">
            <button type="submit" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
            <button type="button" class="admin-btn admin-btn-secondary" (click)="editing=false">Cancel</button>
          </div>
        </form>
      </section>

      <div class="admin-empty" *ngIf="!branches.length">
        <h3>No branches yet</h3>
        <p>Create your first training location to start assigning slots.</p>
      </div>

      <div class="admin-table-wrap admin-table-container admin-table-sticky" *ngIf="branches.length">
        <table class="admin-data-table admin-hide-mobile">
          <thead>
            <tr>
              <th>Name</th><th>Address</th><th>Hours</th><th>Slot</th><th>Status</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let b of getPaginatedBranches()">
              <td>
                <div class="name-cell">
                  <img *ngIf="b.image_url" [src]="previewUrl(b.image_url)" [alt]="b.name" class="thumb" />
                  <strong>{{ b.name }}</strong>
                </div>
              </td>
              <td>{{ b.address }}</td>
              <td>{{ formatTime(b.opening_time) }} – {{ formatTime(b.closing_time) }}</td>
              <td>{{ b.slot_duration_minutes }} min · cap {{ b.default_slot_capacity || 1 }}</td>
              <td>
                <span class="admin-badge" [class.admin-badge-success]="b.is_active" [class.admin-badge-danger]="!b.is_active">
                  {{ b.is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="admin-action-group" *ngIf="perms.can('branches','edit')">
                  <button
                    type="button"
                    class="admin-action-btn"
                    (click)="edit(b)"
                    title="Edit"
                    aria-label="Edit branch">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button
                    type="button"
                    class="admin-action-btn"
                    [class.danger]="b.is_active"
                    [class.success]="!b.is_active"
                    (click)="toggleActive(b)"
                    [title]="b.is_active ? 'Disable' : 'Enable'"
                    [attr.aria-label]="b.is_active ? 'Disable branch' : 'Enable branch'">
                    <svg *ngIf="b.is_active" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M4.9 4.9l14.2 14.2"/></svg>
                    <svg *ngIf="!b.is_active" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="admin-mobile-cards">
          <article class="admin-mobile-card" *ngFor="let b of getPaginatedBranches()">
            <div class="card-title">{{ b.name }}</div>
            <div class="card-meta">{{ b.address }}</div>
            <div class="card-meta">{{ formatTime(b.opening_time) }} – {{ formatTime(b.closing_time) }}</div>
            <span class="admin-badge" [class.admin-badge-success]="b.is_active" [class.admin-badge-danger]="!b.is_active">
              {{ b.is_active ? 'Active' : 'Inactive' }}
            </span>
            <div class="card-actions admin-action-group" *ngIf="perms.can('branches','edit')">
              <button type="button" class="admin-btn admin-btn-secondary" (click)="edit(b)">Edit</button>
              <button type="button" class="admin-btn admin-btn-secondary" (click)="toggleActive(b)">
                {{ b.is_active ? 'Disable' : 'Enable' }}
              </button>
            </div>
          </article>
        </div>
      </div>

      <app-admin-pagination
        *ngIf="branches.length > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="branches.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="branches"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>
    </div>
  `,
  styles: [`
    .check {
      flex-direction: row !important;
      align-items: center;
      gap: 0.65rem !important;
    }
    .check input { width: auto; min-height: auto; }
    .actions { display: flex; gap: 0.5rem; margin-top: 0.35rem; flex-wrap: wrap; }
    .card-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; margin-top: 0.75rem; }
    .days-block { display: flex; flex-direction: column; gap: 0.5rem; }
    .days-label, .block-label { font-weight: 600; font-size: 0.875rem; }
    .days-row { display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .day-chip {
      display: inline-flex !important;
      flex-direction: row !important;
      align-items: center;
      gap: 0.35rem !important;
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 0.35rem 0.55rem;
      margin: 0;
    }
    .day-chip input { width: auto; min-height: auto; }
    .hint { margin: 0.35rem 0 0; font-size: 0.8rem; color: var(--color-muted); }
    .image-preview { display: block; margin-top: 0.5rem; width: 100%; max-width: 220px; aspect-ratio: 16/10; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border); }
    .name-cell { display: flex; align-items: center; gap: 0.5rem; }
    .thumb { width: 36px; height: 36px; border-radius: 6px; object-fit: cover; border: 1px solid var(--color-border); }
  `]
})
export class AdminBranchesComponent implements OnInit {
  branches: Branch[] = [];
  editing = false;
  saving = false;
  uploadingImage = false;
  form: any = this.empty();
  dayOptions = DAY_OPTIONS;
  currentPage = 1;
  itemsPerPage = 25;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.branches.length / this.itemsPerPage));
  }

  getPaginatedBranches(): Branch[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.branches.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 25;
    this.currentPage = 1;
  }

  constructor(
    private api: BranchService,
    public perms: PermissionService,
    private toast: ToastService
  ) {}

  empty() {
    return {
      id: '',
      name: '',
      slug: '',
      address: '',
      contact_phone: '',
      contact_email: '',
      maps_url: '',
      opening_time: '07:00',
      closing_time: '21:00',
      slot_duration_minutes: 30,
      default_slot_capacity: 1,
      image_url: '',
      is_active: true,
      working_days: [1, 2, 3, 4, 5, 6, 0]
    };
  }

  async ngOnInit() {
    await this.reload();
  }

  async reload() {
    try {
      this.branches = await this.api.list(false);
    } catch (e: any) {
      this.toast.error(e?.message || 'Failed to load branches');
    }
  }

  startCreate() {
    this.form = this.empty();
    this.editing = true;
  }

  edit(b: Branch) {
    this.form = {
      ...b,
      opening_time: this.formatTime(b.opening_time),
      closing_time: this.formatTime(b.closing_time),
      working_days: [...(b.working_days || [1, 2, 3, 4, 5, 6, 0])],
      default_slot_capacity: b.default_slot_capacity || 1,
      image_url: b.image_url || ''
    };
    this.editing = true;
  }

  formatTime(value?: string): string {
    return String(value || '07:00').slice(0, 5);
  }

  previewUrl(url?: string | null): string {
    return this.api.resolveImageUrl(url);
  }

  hasDay(day: number): boolean {
    return (this.form.working_days || []).includes(day);
  }

  toggleDay(day: number, event: Event) {
    const checked = (event.target as HTMLInputElement).checked;
    const current: number[] = [...(this.form.working_days || [])];
    if (checked && !current.includes(day)) current.push(day);
    if (!checked) {
      this.form.working_days = current.filter((d) => d !== day);
      return;
    }
    this.form.working_days = current.sort((a, b) => {
      const order = [1, 2, 3, 4, 5, 6, 0];
      return order.indexOf(a) - order.indexOf(b);
    });
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingImage = true;
    try {
      const result = await this.api.uploadImage(file);
      this.form.image_url = pickUploadedImageUrl(result);
      this.toast.success('Image uploaded');
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Upload failed');
    } finally {
      this.uploadingImage = false;
      input.value = '';
    }
  }

  async toggleActive(branch: Branch) {
    try {
      await this.api.update(branch.id, { is_active: !branch.is_active });
      this.toast.success(branch.is_active ? 'Branch disabled' : 'Branch enabled');
      await this.reload();
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Update failed');
    }
  }

  async save() {
    if (this.saving) return;
    if (!this.form.name?.trim()) {
      this.toast.error('Branch name is required');
      return;
    }
    if (!(this.form.working_days || []).length) {
      this.toast.error('Select at least one operating day');
      return;
    }
    this.saving = true;
    try {
      if (this.form.id) {
        await this.api.update(this.form.id, this.form);
      } else {
        await this.api.create(this.form);
      }
      this.toast.success('Branch saved');
      this.editing = false;
      await this.reload();
    } catch (e: any) {
      this.toast.error(e?.error?.message || e?.message || 'Save failed');
    } finally {
      this.saving = false;
    }
  }
}
