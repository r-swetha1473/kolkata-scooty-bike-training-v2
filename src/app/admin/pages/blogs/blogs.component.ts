import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BlogPost, BlogService } from '../../../services/blog.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { pickUploadedImageUrl } from '../../../utils/media-url';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

@Component({
  selector: 'app-admin-blogs',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <div class="admin-sticky-toolbar">
        <header class="admin-hero">
          <div>
            <h1>Blogs</h1>
            <p>Publish training tips and centre news for the public site.</p>
          </div>
          <div class="admin-hero-actions">
            <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">New post</button>
          </div>
        </header>
      </div>

      <div class="admin-table-skeleton" *ngIf="loading" aria-busy="true">
        <div class="admin-table-skeleton-row" *ngFor="let _ of [1,2,3,4]"></div>
      </div>

      <div class="admin-table-container admin-table-sticky" *ngIf="!loading && posts.length">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Post</th>
              <th>Category</th>
              <th>Author</th>
              <th>Status</th>
              <th>Published</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let post of getPaginated()">
              <td>
                <div class="post-cell">
                  <img *ngIf="post.featured_image_url" [src]="previewUrl(post.featured_image_url)" [alt]="post.title" class="thumb" />
                  <div>
                    <strong>{{ post.title }}</strong>
                    <div class="cell-sub">{{ post.slug }}</div>
                  </div>
                </div>
              </td>
              <td>{{ post.category || '—' }}</td>
              <td>{{ post.author_name || '—' }}</td>
              <td>
                <span class="admin-badge"
                  [class.admin-badge-success]="post.status === 'published'"
                  [class.admin-badge-neutral]="post.status !== 'published'">
                  {{ post.status === 'published' ? 'Published' : 'Draft' }}
                </span>
              </td>
              <td>{{ formatDate(post.published_at) }}</td>
              <td class="actions-cell">
                <div class="admin-action-group">
                  <button type="button" class="admin-action-btn" (click)="openEdit(post)" title="Edit" aria-label="Edit post">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                  </button>
                  <button type="button" class="admin-action-btn danger" (click)="confirmDelete(post)" [disabled]="deletingId === post.id" title="Delete" aria-label="Delete post">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <app-admin-pagination
        *ngIf="!loading && posts.length > 0"
        [currentPage]="currentPage"
        [totalPages]="totalPages"
        [totalRecords]="posts.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="posts"
        (pageChange)="goToPage($event)"
        (pageSizeChange)="onPageSizeChange($event)">
      </app-admin-pagination>

      <div class="admin-empty-state" *ngIf="!loading && !posts.length">
        <h3>No blog posts yet</h3>
        <p>Write your first article for SEO and student tips.</p>
        <button type="button" class="admin-btn admin-btn-primary" (click)="openCreate()">New post</button>
      </div>

      <app-admin-modal
        #blogModal
        [open]="showDrawer"
        [title]="editing ? 'Edit post' : 'New post'"
        subtitle="Drafts stay private until you publish."
        [wide]="true"
        [dirty]="formDirty"
        (closed)="closeDrawer()">
        <form (ngSubmit)="save()" id="blog-form">
          <div class="form-group"><label>Title *</label><input class="admin-input" [(ngModel)]="form.title" name="title" required (ngModelChange)="markDirty()" /></div>
          <div class="form-group"><label>Slug</label><input class="admin-input" [(ngModel)]="form.slug" name="slug" placeholder="auto-generated if empty" [disabled]="!!editing" (ngModelChange)="markDirty()" /></div>
          <div class="form-group"><label>Excerpt</label><textarea class="admin-textarea" rows="2" [(ngModel)]="form.excerpt" name="excerpt" (ngModelChange)="markDirty()"></textarea></div>

          <div class="form-group">
            <label>Content</label>
            <div class="editor-toolbar">
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="exec('bold')" title="Bold"><b>B</b></button>
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="exec('italic')" title="Italic"><i>I</i></button>
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="exec('insertUnorderedList')" title="Bullet list">• List</button>
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="exec('insertOrderedList')" title="Numbered list">1. List</button>
              <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="insertLink()" title="Link">Link</button>
            </div>
            <div
              #contentEditor
              class="content-editor admin-textarea"
              contenteditable="true"
              (input)="onEditorInput()"
              (blur)="onEditorInput()"
              aria-label="Post content"></div>
          </div>

          <div class="form-group">
            <label>Featured image</label>
            <div class="image-upload-row">
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onImageSelected($event)" [disabled]="uploadingImage" />
              <span class="upload-hint" *ngIf="uploadingImage">Uploading…</span>
            </div>
            <input class="admin-input" [(ngModel)]="form.featured_image_url" name="featured_image_url" placeholder="Image URL or upload above" (ngModelChange)="markDirty()" />
            <img *ngIf="form.featured_image_url" [src]="previewUrl(form.featured_image_url)" alt="Preview" class="image-preview" />
          </div>

          <div class="form-row-grid">
            <div class="form-group"><label>Category</label><input class="admin-input" [(ngModel)]="form.category" name="category" (ngModelChange)="markDirty()" /></div>
            <div class="form-group"><label>Author</label><input class="admin-input" [(ngModel)]="form.author_name" name="author_name" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-row-grid">
            <div class="form-group">
              <label>Status</label>
              <select class="admin-input" [(ngModel)]="form.status" name="status" (ngModelChange)="markDirty()">
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
            <div class="form-group"><label>Meta title</label><input class="admin-input" [(ngModel)]="form.meta_title" name="meta_title" (ngModelChange)="markDirty()" /></div>
          </div>
          <div class="form-group"><label>Meta description</label><textarea class="admin-textarea" rows="2" [(ngModel)]="form.meta_description" name="meta_description" (ngModelChange)="markDirty()"></textarea></div>
        </form>
        <div adminModalFooter>
          <button type="button" class="admin-btn admin-btn-secondary" (click)="blogModal.requestClose()">Cancel</button>
          <button type="submit" form="blog-form" class="admin-btn admin-btn-primary" [disabled]="saving">{{ saving ? 'Saving…' : 'Save post' }}</button>
        </div>
      </app-admin-modal>
    </div>
  `,
  styles: [`
    .cell-sub { font-size: var(--text-body-sm); color: var(--color-muted); margin-top: 2px; }
    .post-cell { display: flex; align-items: center; gap: var(--space-3); }
    .thumb { width: 48px; height: 36px; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .actions-cell { min-width: 5.5rem; }
    .form-row-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }
    .image-upload-row { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
    .upload-hint { font-size: var(--text-body-sm); color: var(--color-muted); }
    .image-preview { display: block; margin-top: var(--space-3); width: 100%; max-width: 240px; aspect-ratio: 16 / 10; object-fit: cover; border-radius: var(--radius-md); border: 1px solid var(--color-border); }
    .editor-toolbar { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-2); }
    .content-editor {
      min-height: 180px;
      max-height: 360px;
      overflow: auto;
      padding: var(--space-3);
      white-space: pre-wrap;
    }
    .content-editor:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; }
    @media (max-width: 640px) { .form-row-grid { grid-template-columns: 1fr; } }
  `]
})
export class AdminBlogsComponent implements OnInit {
  @ViewChild('contentEditor') contentEditor?: ElementRef<HTMLDivElement>;

  posts: BlogPost[] = [];
  loading = true;
  showDrawer = false;
  formDirty = false;
  saving = false;
  uploadingImage = false;
  deletingId = '';
  editing: BlogPost | null = null;
  form: Partial<BlogPost> = this.emptyForm();
  currentPage = 1;
  itemsPerPage = 25;
  private editorReady = false;

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.posts.length / this.itemsPerPage));
  }

  constructor(
    private api: BlogService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await this.load();
  }

  getPaginated(): BlogPost[] {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    return this.posts.slice(start, start + this.itemsPerPage);
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

  emptyForm(): Partial<BlogPost> {
    return {
      title: '',
      slug: '',
      excerpt: '',
      content: '',
      featured_image_url: '',
      category: '',
      author_name: '',
      status: 'draft',
      meta_title: '',
      meta_description: ''
    };
  }

  previewUrl(url?: string | null): string {
    return this.api.resolveImageUrl(url);
  }

  formatDate(value?: string | null): string {
    if (!value) return '—';
    try {
      return new Date(value).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return '—';
    }
  }

  async load() {
    this.loading = true;
    try {
      this.posts = await this.api.listAdmin();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to load blogs'));
    } finally {
      this.loading = false;
    }
  }

  openCreate() {
    this.editing = null;
    this.form = this.emptyForm();
    this.formDirty = false;
    this.showDrawer = true;
    this.syncEditorHtml('');
  }

  openEdit(post: BlogPost) {
    this.editing = post;
    this.form = { ...post };
    this.formDirty = false;
    this.showDrawer = true;
    this.syncEditorHtml(post.content || '');
  }

  private syncEditorHtml(html: string) {
    this.editorReady = false;
    setTimeout(() => {
      if (this.contentEditor?.nativeElement) {
        this.contentEditor.nativeElement.innerHTML = html || '';
        this.editorReady = true;
      }
    }, 0);
  }

  closeDrawer() {
    this.showDrawer = false;
    this.editing = null;
    this.saving = false;
    this.uploadingImage = false;
    this.formDirty = false;
    this.editorReady = false;
  }

  onEditorInput() {
    if (!this.editorReady || !this.contentEditor?.nativeElement) return;
    this.form.content = this.contentEditor.nativeElement.innerHTML;
    this.markDirty();
  }

  exec(command: string) {
    document.execCommand(command, false);
    this.onEditorInput();
    this.contentEditor?.nativeElement.focus();
  }

  insertLink() {
    const url = window.prompt('Link URL');
    if (!url) return;
    document.execCommand('createLink', false, url);
    this.onEditorInput();
    this.contentEditor?.nativeElement.focus();
  }

  async onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingImage = true;
    try {
      const result = await this.api.uploadImage(file);
      this.form.featured_image_url = pickUploadedImageUrl(result);
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
    if (!this.form.title?.trim()) {
      this.toast.error('Title is required');
      return;
    }
    this.onEditorInput();
    this.saving = true;
    const payload: Partial<BlogPost> = { ...this.form };
    try {
      if (this.editing) {
        await this.api.update(this.editing.id, payload);
        this.toast.success('Post updated');
      } else {
        await this.api.create(payload);
        this.toast.success('Post created');
      }
      this.closeDrawer();
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to save post'));
    } finally {
      this.saving = false;
    }
  }

  async confirmDelete(post: BlogPost) {
    if (this.deletingId) return;
    if (!window.confirm(`Delete "${post.title}"? This cannot be undone.`)) return;
    this.deletingId = post.id;
    try {
      await this.api.delete(post.id);
      this.toast.success('Post deleted');
      await this.load();
    } catch (e) {
      this.toast.error(getApiErrorMessage(e, 'Failed to delete post'));
    } finally {
      this.deletingId = '';
    }
  }
}
