import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Course, CourseService } from '../../../services/course.service';
import { CmsContentService } from '../../../services/cms-content.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { pickUploadedImageUrl } from '../../../utils/media-url';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-courses',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Courses</h1>
            <p>Manage official Kolkata Scooty courses shown on the homepage, courses page, and booking wizard.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add course</button>
          </div>
        </header>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
      </div>

      <div class="admin-table-container admin-table-sticky" *ngIf="!loading && courses.length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Course</th>
              <th>Price</th>
              <th>Duration</th>
              <th>Order</th>
              <th>Status</th>
              <th class="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of getPaginatedCourses()">
              <td>
                <div class="course-cell">
                  <img *ngIf="c.image_url" [src]="previewUrl(c.image_url)" [alt]="c.name" class="course-thumb" />
                  <div>
                    <strong>{{ c.name }}</strong>
                    <div class="cell-sub">
                      {{ c.slug }}
                      <span *ngIf="c.is_featured" class="featured-pill">Featured</span>
                    </div>
                  </div>
                </div>
              </td>
              <td class="cell-wrap">{{ c.price_label || '—' }}</td>
              <td class="cell-wrap">{{ c.duration_label || '—' }}</td>
              <td>{{ c.sort_order }}</td>
              <td>
                <span class="admin-badge" [class.admin-badge-success]="c.is_active" [class.admin-badge-neutral]="!c.is_active">
                  {{ c.is_active ? 'Active' : 'Hidden' }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="admin-action-group">
                  <button
                    type="button"
                    class="admin-action-btn"
                    (click)="openEdit(c)"
                    title="Edit"
                    aria-label="Edit course">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button
                    type="button"
                    class="admin-action-btn danger"
                    (click)="confirmDelete(c)"
                    [disabled]="deletingId === c.id"
                    title="Delete"
                    aria-label="Delete course">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="!loading && courses.length > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="courses.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="courses"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <div class="admin-empty-state" *ngIf="!loading && !courses.length">
        <h3>No courses yet</h3>
        <p>Add your first course to populate the website and booking flow.</p>
        <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">Add course</button>
      </div>

      <app-admin-modal
        #courseModal
        [open]="showDrawer"
        [title]="editing ? 'Edit course' : 'Add course'"
        subtitle="Changes appear immediately on the public site."
        [wide]="true"
        [dirty]="formDirty"
        (closed)="closeDrawer()">
        <form (ngSubmit)="save()" id="course-form">
          <div class="form-group"><label>Course title *</label><input class="admin-input" [(ngModel)]="form.name" name="name" required (ngModelChange)="markDirty()" /></div>
          <div class="form-group"><label>Slug</label><input class="admin-input" [(ngModel)]="form.slug" name="slug" placeholder="auto-generated if empty" [disabled]="!!editing" (ngModelChange)="markDirty()" /></div>
          <div class="form-group"><label>Tagline</label><input class="admin-input" [(ngModel)]="form.tagline" name="tagline" (ngModelChange)="markDirty()" /></div>
          <div class="form-group"><label>Description</label><textarea class="admin-textarea" rows="4" [(ngModel)]="form.description" name="description" (ngModelChange)="markDirty()"></textarea></div>
          <div class="form-row-grid">
            <div class="form-group"><label>Starting price</label><input class="admin-input" [(ngModel)]="form.price_label" name="price_label" placeholder="Starting from ₹2,500" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Amount (INR)</label><input type="number" class="admin-input" [(ngModel)]="form.amount_inr" name="amount_inr" min="0" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-row-grid">
            <div class="form-group"><label>Duration (optional)</label><input class="admin-input" [(ngModel)]="form.duration_label" name="duration_label" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Difficulty</label><input class="admin-input" [(ngModel)]="form.difficulty" name="difficulty" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-group">
            <label>Course image</label>
            <div class="image-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onImageSelected($event)" [disabled]="uploadingImage" />
              <span class="upload-hint" *ngIf="uploadingImage">Uploading…</span>
            </div>
            <input class="admin-input" [(ngModel)]="form.image_url" name="image_url" placeholder="Image URL or upload above" (ngModelChange)="markDirty()" />
            <img *ngIf="form.image_url" [src]="previewUrl(form.image_url)" alt="Course preview" class="image-preview" />
          </div>

          <div class="form-group">
            <div class="list-header">
              <label>Course includes</label>
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="addInclude()">Add bullet</button>
            </div>
            <div class="bullet-list" *ngIf="includes.length; else noIncludes">
              <div class="bullet-row" *ngFor="let item of includes; let i = index">
                <input class="admin-input" [(ngModel)]="includes[i]" [name]="'include_' + i" placeholder="Bullet point" (ngModelChange)="markDirty()" />
                <div class="bullet-actions">
                  <button type="button" class="admin-action-btn" (click)="moveInclude(i, -1)" [disabled]="i === 0" aria-label="Move up">↑</button>
                  <button type="button" class="admin-action-btn" (click)="moveInclude(i, 1)" [disabled]="i === includes.length - 1" aria-label="Move down">↓</button>
                  <button type="button" class="admin-action-btn danger" (click)="removeInclude(i)" aria-label="Remove">×</button>
                </div>
              </div>
            </div>
            <ng-template #noIncludes><p class="upload-hint">No includes yet. Add bullets for “Course Includes”.</p></ng-template>
          </div>

          <div class="form-row-grid">
            <div class="form-group"><label>CTA text</label><input class="admin-input" [(ngModel)]="form.cta_text" name="cta_text" placeholder="Book now" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>CTA link</label><input class="admin-input" [(ngModel)]="form.cta_link" name="cta_link" placeholder="/booking?course=slug" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-row-grid">
            <div class="form-group"><label>Display order</label><input type="number" class="admin-input" [(ngModel)]="form.sort_order" name="sort_order" (ngModelChange)="markDirty()" /></div>
            <div class="form-group checkbox-stack">
              <label><input type="checkbox" [(ngModel)]="form.is_active" name="is_active" (ngModelChange)="markDirty()" /> Active on website</label>
              <label><input type="checkbox" [(ngModel)]="form.is_featured" name="is_featured" (ngModelChange)="markDirty()" /> Featured course</label>
            </div>
          </div>
        </form>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="courseModal.requestClose()">Cancel</button>
          <button type="submit" form="course-form" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save course' }}</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .cell-sub { font-size: var(--text-body-sm); color: var(--color-muted); margin-top: 2px; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .featured-pill { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(37, 99, 235, 0.12); color: var(--color-primary); font-size: 0.75rem; font-weight: 600; }
    .course-cell { display: flex; align-items: center; gap: var(--space-3); }
    .course-thumb { width: 44px; height: 44px; border-radius: var(--radius-md); object-fit: cover; border: 1px solid var(--color-border); }
    .cell-wrap { max-width: 14rem; white-space: normal; word-break: break-word; }
    .actions-cell { min-width: 5.5rem; }
    .form-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .image-upload-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
    .upload-hint { font-size: var(--text-body-sm); color: var(--color-muted); }
    .image-preview { display: block; margin-top: var(--space-3); width: 100%; max-width: 240px; aspect-ratio: 16 / 10; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .list-header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-2); }
    .list-header label { margin: 0; }
    .bullet-list { display: flex; flex-direction: column; gap: var(--space-2); }
    .bullet-row { display: grid; grid-template-columns: 1fr auto; gap: var(--space-2); align-items: center; }
    .bullet-actions { display: flex; gap: 4px; }
    .checkbox-stack { display: flex; flex-direction: column; gap: var(--space-2); justify-content: flex-end; padding-bottom: 4px; }
    @media (max-width: 640px) { .form-row-grid { grid-template-columns: 1fr; } .bullet-row { grid-template-columns: 1fr; } }
  `]
})
export class AdminCoursesComponent implements OnInit {
  courses: Course[] = [];
  loading = true;
  showDrawer = false;
  formDirty = false;
  saving = false;
  uploadingImage = false;
  deletingId = '';
  editing: Course | null = null;
  includes: string[] = [];
  form: Partial<Course> = this.emptyForm();
  currentPage = 1;
  itemsPerPage = 25;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.courses.length / this.itemsPerPage));
  }

  getPaginatedCourses(): Course[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.courses.slice(start, start + this.itemsPerPage);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  onPageSizeChange(size: number) {
    this.itemsPerPage = size || 25;
    this.currentPage = 1;
  }

  constructor(
    private api: CourseService,
    private cms: CmsContentService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.load();
  }

  markDirty() {
    this.formDirty = true;
  }

  emptyForm(): Partial<Course> {
    return {
      name: '',
      slug: '',
      description: '',
      tagline: '',
      price_label: '',
      amount_inr: 0,
      duration_label: '',
      difficulty: 'Beginner',
      image_url: '',
      is_active: true,
      is_featured: false,
      sort_order: 0,
      cta_text: 'Book now',
      cta_link: '/booking'
    };
  }

  previewUrl(imageUrl?: string | null): string {
    return this.cms.resolveImageUrl(imageUrl);
  }

  async load() {
    this.loading = true;
    try {
      this.courses = await this.api.list(false);
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to load courses'));
    } finally {
      this.loading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.form = this.emptyForm();
    this.includes = [''];
    this.formDirty = false;
    this.showDrawer = true;
  }

  openEdit(course: Course) {
    this.editing = course;
    this.form = { ...course };
    this.includes = [...(course.features || [])];
    if (!this.includes.length) this.includes = [''];
    this.formDirty = false;
    this.showDrawer = true;
  }

  closeDrawer(_event?: Event) {
    this.showDrawer = false;
    this.editing = null;
    this.saving = false;
    this.uploadingImage = false;
    this.formDirty = false;
  }

  addInclude() {
    this.includes = [...this.includes, ''];
  }

  removeInclude(index: number) {
    this.includes = this.includes.filter((_, i) => i !== index);
  }

  moveInclude(index: number, delta: number) {
    const next = index + delta;
    if (next < 0 || next >= this.includes.length) return;
    const copy = [...this.includes];
    const [row] = copy.splice(index, 1);
    copy.splice(next, 0, row);
    this.includes = copy;
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadingImage = true;
    try {
      const result = await this.api.uploadImage(file);
      const url = pickUploadedImageUrl(result);
      this.form.image_url = url;
      // Keep variant fields aligned so list/pricing never keep a stale thumbnail_url.
      this.form.thumbnail_url = url;
      this.form.banner_image_url = url;
      this.form.mobile_image_url = url;
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
    if (this.saving || !this.form.name?.trim()) {
      this.toast.error('Course name is required');
      return;
    }
    this.saving = true;
    const imageUrl = (this.form.image_url || '').trim() || undefined;
    const payload: Partial<Course> = {
      ...this.form,
      image_url: imageUrl,
      // Single course image from Admin — sync all public surfaces to the same URL.
      thumbnail_url: imageUrl,
      banner_image_url: imageUrl,
      mobile_image_url: imageUrl,
      features: this.includes.map((s) => s.trim()).filter(Boolean),
      highlights: this.editing?.highlights || []
    };
    try {
      if (this.editing) {
        await this.api.update(this.editing.id, payload);
        this.toast.success('Course updated');
      } else {
        await this.api.create(payload);
        this.toast.success('Course created');
      }
      this.closeDrawer();
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to save course'));
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(course: Course) {
    if (this.deletingId) return;
    const ok = window.confirm(`Delete "${course.name}"? This cannot be undone.`);
    if (!ok) return;

    this.deletingId = course.id;
    try {
      await this.api.delete(course.id);
      this.toast.success('Course deleted');
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to delete course'));
    } finally {
      this.deletingId = '';
    }
  }
}
