import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GalleryItem, GalleryService } from '../../../services/gallery.service';
import { Branch, BranchService } from '../../../services/branch.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { pickUploadedImageUrl } from '../../../utils/media-url';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-gallery',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Gallery</h1>
            <p>Manage training photos and campus visuals shown on the public gallery.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add photos</button>
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
              <th>Image</th>
              <th>Title</th>
              <th>Category</th>
              <th>Order</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let item of getPaginated()">
              <td>
                <img *ngIf="item.image_url" [src]="previewUrl(item.image_url)" [alt]="item.title || 'Gallery'" class="thumb" />
              </td>
              <td>
                <strong>{{ item.title || 'Untitled' }}</strong>
                <div class="cell-sub" *ngIf="branchName(item.branch_id)">{{ branchName(item.branch_id) }}</div>
              </td>
              <td>{{ item.category || '—' }}</td>
              <td>{{ item.sort_order }}</td>
              <td>
                <span class="admin-badge" [class.admin-badge-success]="item.is_active" [class.admin-badge-neutral]="!item.is_active">
                  {{ item.is_active ? 'Active' : 'Hidden' }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="admin-action-group">
                  <button type="button" class="admin-action-btn" (click)="openEdit(item)" title="Edit" aria-label="Edit photo">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button type="button" class="admin-action-btn danger" (click)="confirmDelete(item)" [disabled]="deletingId === item.id" title="Delete" aria-label="Delete photo">
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
        label="photos"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <div class="admin-empty-state" *ngIf="!loading && !items.length">
        <h3>No gallery photos yet</h3>
        <p>Upload images to populate the public gallery page.</p>
        <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add photos</button>
      </div>

      <app-admin-modal
        #galleryModal
        [open]="showDrawer"
        [title]="editing ? 'Edit photo' : 'Add photos'"
        subtitle="Images appear on the public gallery when active."
        [wide]="true"
        [dirty]="formDirty"
        (closed)="closeDrawer()">
        <form (ngSubmit)="save()" id="gallery-form">
          <div class="form-group" *ngIf="!editing">
            <label>Images *</label>
            <div class="image-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple (change)="onImagesSelected($event)" [disabled]="uploadingImage" />
              <span class="upload-hint" *ngIf="uploadingImage">Uploading…</span>
            </div>
            <div class="upload-preview-grid" *ngIf="pendingUrls.length">
              <div class="upload-preview" *ngFor="let url of pendingUrls; let i = index">
                <img [src]="previewUrl(url)" alt="Upload preview" />
                <button type="button" class="admin-action-btn danger" (click)="removePending(i)" aria-label="Remove">×</button>
              </div>
            </div>
          </div>
          <div class="form-group" *ngIf="editing">
            <label>Image</label>
            <div class="image-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onSingleImageSelected($event)" [disabled]="uploadingImage" />
              <span class="upload-hint" *ngIf="uploadingImage">Uploading…</span>
            </div>
            <input class="admin-input" [(ngModel)]="form.image_url" name="image_url" placeholder="Image URL" (ngModelChange)="markDirty()" />
            <img *ngIf="form.image_url" [src]="previewUrl(form.image_url)" alt="Preview" class="image-preview" />
          </div>
          <div class="form-group"><label>Title</label><input class="admin-input" [(ngModel)]="form.title" name="title" (ngModelChange)="markDirty()" /></div>
          <div class="form-row-grid">
            <div class="form-group"><label>Category</label><input class="admin-input" [(ngModel)]="form.category" name="category" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Display order</label><input type="number" class="admin-input" [(ngModel)]="form.sort_order" name="sort_order" (ngModelChange)="markDirty()" /></div>
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
          <button type="button" class="admin-btn admin-btn-secondary" (click)="galleryModal.requestClose()">Cancel</button>
          <button type="submit" form="gallery-form" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save' }}</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .cell-sub { font-size: var(--text-body-sm); color: var(--color-muted); margin-top: 2px; }
    .thumb { width: 56px; height: 40px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .actions-cell { min-width: 5.5rem; }
    .form-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .image-upload-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
    .upload-hint { font-size: var(--text-body-sm); color: var(--color-muted); }
    .image-preview { display: block; margin-top: var(--space-3); width: 100%; max-width: 240px; aspect-ratio: 16 / 10; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .upload-preview-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: var(--space-2); margin-top: var(--space-2); }
    .upload-preview { position: relative; }
    .upload-preview img { width: 100%; aspect-ratio: 1; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .upload-preview .admin-action-btn { position: absolute; top: 4px; right: 4px; }
    .checkbox-stack { display: flex; flex-direction: column; gap: var(--space-2); justify-content: flex-end; padding-bottom: 4px; }
    @media (max-width: 640px) { .form-row-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminGalleryComponent implements OnInit {
  items: GalleryItem[] = [];
  branches: Branch[] = [];
  loading = true;
  showDrawer = false;
  formDirty = false;
  saving = false;
  uploadingImage = false;
  deletingId = '';
  editing: GalleryItem | null = null;
  form: Partial<GalleryItem> = this.emptyForm();
  pendingUrls: string[] = [];
  currentPage = 1;
  itemsPerPage = 25;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.items.length / this.itemsPerPage));
  }

  constructor(
    private api: GalleryService,
    private branchesApi: BranchService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadBranches()]);
  }

  getPaginated(): GalleryItem[] {
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

  emptyForm(): Partial<GalleryItem> {
    return {
      title: '',
      category: '',
      image_url: '',
      branch_id: null,
      sort_order: 0,
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
      this.toast.error(getApiErrorMessage(e, 'Failed to load gallery'));
    } finally {
      this.loading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.form = this.emptyForm();
    this.pendingUrls = [];
    this.formDirty = false;
    this.showDrawer = true;
  }

  openEdit(item: GalleryItem) {
    this.editing = item;
    this.form = { ...item, branch_id: item.branch_id || null };
    this.pendingUrls = [];
    this.formDirty = false;
    this.showDrawer = true;
  }

  closeDrawer() {
    this.showDrawer = false;
    this.editing = null;
    this.saving = false;
    this.uploadingImage = false;
    this.formDirty = false;
    this.pendingUrls = [];
  }

  removePending(index: number) {
    this.pendingUrls = this.pendingUrls.filter((_, i) => i !== index);
    this.markDirty();
  }

  async onImagesSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (!files.length) return;
    this.uploadingImage = true;
    try {
      for (const file of files) {
        const result = await this.api.uploadImage(file);
        this.pendingUrls = [...this.pendingUrls, pickUploadedImageUrl(result)];
      }
      this.markDirty();
      this.toast.success(files.length === 1 ? 'Image uploaded' : `${files.length} images uploaded`);
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to upload image'));
    } finally {
      this.uploadingImage = false;
      input.value = '';
    }
  }

  async onSingleImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingImage = true;
    try {
      const result = await this.api.uploadImage(file);
      this.form.image_url = pickUploadedImageUrl(result);
      this.markDirty();
      this.toast.success('Image uploaded');
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to upload image'));
    } finally {
      this.uploadingImage = false;
      input.value = '';
    }
  }

  async save() {
    if (this.saving) return;
    if (this.editing) {
      if (!this.form.image_url?.trim()) {
        this.toast.error('Image is required');
        return;
      }
    } else if (!this.pendingUrls.length) {
      this.toast.error('Upload at least one image');
      return;
    }
    this.saving = true;
    try {
      if (this.editing) {
        await this.api.update(this.editing.id, {
          ...this.form,
          branch_id: this.form.branch_id || null
        });
        this.toast.success('Photo updated');
      } else {
        for (const image_url of this.pendingUrls) {
          await this.api.create({
            image_url,
            title: this.form.title || null,
            category: this.form.category || '',
            branch_id: this.form.branch_id || null,
            sort_order: this.form.sort_order ?? 0,
            is_active: this.form.is_active !== false
          });
        }
        this.toast.success(this.pendingUrls.length === 1 ? 'Photo added' : `${this.pendingUrls.length} photos added`);
      }
      this.closeDrawer();
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to save gallery item'));
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(item: GalleryItem) {
    if (this.deletingId) return;
    if (!window.confirm(`Delete "${item.title || 'this photo'}"? This cannot be undone.`)) return;
    this.deletingId = item.id;
    try {
      await this.api.delete(item.id);
      this.toast.success('Photo deleted');
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to delete photo'));
    } finally {
      this.deletingId = '';
    }
  }
}
