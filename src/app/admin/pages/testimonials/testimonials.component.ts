import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Testimonial, TestimonialService } from '../../../services/testimonial.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { pickUploadedImageUrl } from '../../../utils/media-url';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-testimonials',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Testimonials</h1>
            <p>Curate customer reviews shown on the marketing site.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add testimonial</button>
          </div>
        </header>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
      </div>

      <div class="admin-table-container admin-table-sticky" *ngIf="!loading && items.length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Customer</th>
              <th>Rating</th>
              <th>Review</th>
              <th>Order</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getPaginated()">
              <td>
                <div class="customer-cell">
                  <img *ngIf="item.photo_url" [src]="previewUrl(item.photo_url)" [alt]="item.customer_name" class="avatar" />
                  <div>
                    <strong>{{ item.customer_name }}</strong>
                    <div class="cell-sub" *ngIf="branchName(item.branch_id)">{{ branchName(item.branch_id) }}</div>
                  </div>
                </div>
              </td>
              <td>{{ item.rating }}/5</td>
              <td class="review-cell">{{ item.review }}</td>
              <td>{{ item.display_order }}</td>
              <td>
                <span class="admin-badge" [class.admin-badge-success]="item.is_active" [class.admin-badge-neutral]="!item.is_active">
                  {{ item.is_active ? 'Active' : 'Hidden' }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="admin-action-group">
                  <button type="button" class="admin-action-btn" (click)="openEdit(item)" title="Edit" aria-label="Edit testimonial">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button type="button" class="admin-action-btn danger" (click)="confirmDelete(item)" [disabled]="deletingId === item.id" title="Delete" aria-label="Delete testimonial">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="!loading && items.length > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="items.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="testimonials"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <div class="admin-empty-state" *ngIf="!loading && !items.length">
        <h3>No testimonials yet</h3>
        <p>Add customer reviews to build trust on the homepage.</p>
        <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add testimonial</button>
      </div>

      <app-admin-modal
        #testimonialModal
        [open]="showDrawer"
        [title]="editing ? 'Edit testimonial' : 'Add testimonial'"
        subtitle="Active testimonials appear on the public site."
        [wide]="true"
        [dirty]="formDirty"
        (closed)="closeDrawer()">
        <form (ngSubmit)="save()" id="testimonial-form">
          <div class="form-group"><label>Customer name *</label><input class="admin-input" [(ngModel)]="form.customer_name" name="customer_name" required (ngModelChange)="markDirty()" /></div>
          <div class="form-group"><label>Review *</label><textarea class="admin-textarea" rows="4" [(ngModel)]="form.review" name="review" required (ngModelChange)="markDirty()"></textarea></div>
          <div class="form-row-grid">
            <div class="form-group">
              <label>Rating</label>
              <select class="admin-input" [(ngModel)]="form.rating" name="rating" (ngModelChange)="markDirty()">
                <option *ngFor="let n of [5,4,3,2,1]" [ngValue]="n">{{ n }}</option>
              </select>
            </div>
            <div class="form-group"><label>Display order</label><input type="number" class="admin-input" [(ngModel)]="form.display_order" name="display_order" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-group">
            <label>Photo</label>
            <div class="image-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onImageSelected($event)" [disabled]="uploadingImage" />
              <span class="upload-hint" *ngIf="uploadingImage">Uploading…</span>
            </div>
            <input class="admin-input" [(ngModel)]="form.photo_url" name="photo_url" placeholder="Photo URL or upload above" (ngModelChange)="markDirty()" />
            <img *ngIf="form.photo_url" [src]="previewUrl(form.photo_url)" alt="Preview" class="image-preview" />
          </div>
          <div class="form-row-grid">
            <div class="form-group">
              <label>Branch (optional)</label>
              <select class="admin-input" [(ngModel)]="form.branch_id" name="branch_id" (ngModelChange)="markDirty()">
                <option [ngValue]="null">All branches</option>
                <option *ngFor="let b of branches" [ngValue]="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="form-group checkbox-stack">
              <label><input type="checkbox" [(ngModel)]="form.is_active" name="is_active" (ngModelChange)="markDirty()" /> Active on website</label>
            </div>
          </div>
        </form>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="testimonialModal.requestClose()">Cancel</button>
          <button type="submit" form="testimonial-form" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .cell-sub { font-size: var(--text-body-sm); color: var(--color-muted); margin-top: 2px; }
    .customer-cell { display: flex; align-items: center; gap: var(--space-3); }
    .avatar { width: 40px; height: 40px; border-radius: 999px; object-fit: cover; border: 1px solid var(--color-border); }
    .review-cell { max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--color-muted); }
    .actions-cell { min-width: 5.5rem; }
    .form-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .image-upload-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
    .upload-hint { font-size: var(--text-body-sm); color: var(--color-muted); }
    .image-preview { display: block; margin-top: var(--space-3); width: 80px; height: 80px; object-fit: cover; border-radius: 999px; border: 1px solid var(--color-border); }
    .checkbox-stack { display: flex; flex-direction: column; gap: var(--space-2); justify-content: flex-end; padding-bottom: 4px; }
    @media (max-width: 640px) { .form-row-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminTestimonialsComponent implements OnInit {
  items: Testimonial[] = [];
  branches: Branch[] = [];
  loading = true;
  showDrawer = false;
  formDirty = false;
  saving = false;
  uploadingImage = false;
  deletingId = '';
  editing: Testimonial | null = null;
  form: Partial<Testimonial> = this.emptyForm();
  currentPage = 1;
  itemsPerPage = 25;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.itemsPerPage));
  }

  constructor(
    private api: TestimonialService,
    private branchesApi: BranchService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadBranches()]);
  }

  getPaginated(): Testimonial[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.items.slice(start, start + this.itemsPerPage);
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

  emptyForm(): Partial<Testimonial> {
    return {
      customer_name: '',
      review: '',
      photo_url: '',
      rating: 5,
      display_order: 0,
      branch_id: null,
      is_active: true
    };
  }

  previewUrl(url?: string | null): string {
    return this.api.resolveImageUrl(url);
  }

  branchName(id?: string | null): string {
    if (!id) return '';
    return this.branches.find((b) => b.id === id)?.name || '';
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
      this.items = await this.api.list(false);
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to load testimonials'));
    } finally {
      this.loading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.form = this.emptyForm();
    this.formDirty = false;
    this.showDrawer = true;
  }

  openEdit(item: Testimonial) {
    this.editing = item;
    this.form = { ...item, branch_id: item.branch_id || null };
    this.formDirty = false;
    this.showDrawer = true;
  }

  closeDrawer() {
    this.showDrawer = false;
    this.editing = null;
    this.saving = false;
    this.uploadingImage = false;
    this.formDirty = false;
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingImage = true;
    try {
      const result = await this.api.uploadImage(file);
      this.form.photo_url = pickUploadedImageUrl(result);
      this.markDirty();
      this.toast.success('Photo uploaded');
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to upload photo'));
    } finally {
      this.uploadingImage = false;
      input.value = '';
    }
  }

  async save() {
    if (this.saving) return;
    if (!this.form.customer_name?.trim() || !this.form.review?.trim()) {
      this.toast.error('Customer name and review are required');
      return;
    }
    this.saving = true;
    const payload: Partial<Testimonial> = {
      ...this.form,
      branch_id: this.form.branch_id || null,
      photo_url: this.form.photo_url || null
    };
    try {
      if (this.editing) {
        await this.api.update(this.editing.id, payload);
        this.toast.success('Testimonial updated');
      } else {
        await this.api.create(payload);
        this.toast.success('Testimonial created');
      }
      this.closeDrawer();
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to save testimonial'));
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(item: Testimonial) {
    if (this.deletingId) return;
    if (!window.confirm(`Delete testimonial from "${item.customer_name}"?`)) return;
    this.deletingId = item.id;
    try {
      await this.api.delete(item.id);
      this.toast.success('Testimonial deleted');
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to delete testimonial'));
    } finally {
      this.deletingId = '';
    }
  }
}
