import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminService, SubAdmin } from '../../../services/admin.service';
import { ModulePermission } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { AdminModalComponent } from '../../components/admin-modal/admin-modal.component';
import { AdminPaginationComponent } from '../../components/admin-pagination/admin-pagination.component';

const MODULES = [
  'dashboard', 'users', 'trainers', 'vehicles', 'bookings', 'slots', 'branches', 'payments',
  'audit_logs', 'settings', 'gallery', 'testimonials', 'blogs', 'coupons'
];

type AccountRole = 'admin' | 'subadmin';
type FormField = 'full_name' | 'email' | 'phone' | 'password' | 'confirm_password';

function defaultPermissions(): ModulePermission[] {
  return MODULES.map((module) => ({
    module,
    can_view: true,
    can_create: false,
    can_edit: false,
    can_delete: false
  }));
}

@Component({
  selector: 'app-admin-sub-admins',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminModalComponent, AdminPaginationComponent],
  template: `
    <div class="admin-page">
      <div class="admin-page-header">
        <h1 class="admin-page-title">Admin Accounts</h1>
        <div class="admin-page-actions">
          <button type="button" class="admin-btn admin-btn-primary" (click)="openCreateModal()">Create Account</button>
        </div>
      </div>

      <h2 class="section-title">Admins</h2>
      <div class="admin-table-container">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Password</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loadingAdmins">
              <td colspan="6" class="admin-cell-muted">Loading…</td>
            </tr>
            <tr *ngIf="!loadingAdmins && admins.length === 0">
              <td colspan="6" class="admin-cell-muted">No admin accounts</td>
            </tr>
            <tr *ngFor="let admin of getPaginatedAdmins()">
              <td>{{ admin.full_name }}</td>
              <td>{{ admin.email }}</td>
              <td>{{ admin.phone || '—' }}</td>
              <td>
                <span class="admin-badge" [ngClass]="admin.admin_is_active ? 'admin-badge-success' : 'admin-badge-danger'">
                  {{ admin.admin_is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <span class="pwd-flag" *ngIf="admin.must_change_password">Must change on login</span>
                <span *ngIf="!admin.must_change_password">—</span>
              </td>
              <td>
                <div class="admin-action-group">
                  <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="openEditModal(admin, 'admin')">Edit</button>
                  <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="openResetModal(admin)">Reset Password</button>
                  <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" (click)="openDeleteModal(admin, 'admin')">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <app-admin-pagination
        *ngIf="!loadingAdmins && admins.length > 0"
        [currentPage]="adminsPage"
        [totalPages]="adminsTotalPages"
        [totalRecords]="admins.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="admins"
        (pageChange)="adminsPage = $event"
        (pageSizeChange)="onAdminsPageSize($event)">
      </app-admin-pagination>

      <h2 class="section-title">Sub Admins</h2>
      <div class="admin-table-container">
        <table class="admin-data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Status</th>
              <th>Password</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngIf="loading">
              <td colspan="7" class="admin-cell-muted">Loading…</td>
            </tr>
            <tr *ngIf="!loading && subAdmins.length === 0">
              <td colspan="7" class="admin-cell-muted">No sub admins yet</td>
            </tr>
            <tr *ngFor="let sa of getPaginatedSubAdmins()">
              <td>{{ sa.full_name }}</td>
              <td>{{ sa.email }}</td>
              <td>{{ sa.phone || '—' }}</td>
              <td>
                <span class="admin-badge" [ngClass]="sa.admin_is_active ? 'admin-badge-success' : 'admin-badge-danger'">
                  {{ sa.admin_is_active ? 'Active' : 'Inactive' }}
                </span>
              </td>
              <td>
                <span class="pwd-flag" *ngIf="sa.must_change_password">Must change on login</span>
                <span *ngIf="!sa.must_change_password">—</span>
              </td>
              <td>{{ sa.created_at | date:'mediumDate' }}</td>
              <td>
                <div class="admin-action-group">
                  <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="openEditModal(sa, 'subadmin')">Edit</button>
                  <button type="button" class="admin-btn admin-btn-secondary admin-btn-sm" (click)="openResetModal(sa)">Reset Password</button>
                  <button type="button" class="admin-btn admin-btn-danger admin-btn-sm" (click)="openDeleteModal(sa, 'subadmin')">Delete</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <app-admin-pagination
        *ngIf="!loading && subAdmins.length > 0"
        [currentPage]="subAdminsPage"
        [totalPages]="subAdminsTotalPages"
        [totalRecords]="subAdmins.length"
        [pageSize]="itemsPerPage"
        [pageSizeOptions]="[10, 25, 50, 100]"
        label="sub admins"
        (pageChange)="subAdminsPage = $event"
        (pageSizeChange)="onSubAdminsPageSize($event)">
      </app-admin-pagination>
    </div>

    <!-- Create / Edit -->
    <app-admin-modal
      #accountModal
      [open]="showModal"
      [title]="editingId ? 'Edit Account' : 'Create Account'"
      [wide]="true"
      [dirty]="formDirty"
      (closed)="closeModal()">
      <div class="admin-form-grid">
        <label class="field-label" for="account-full-name" [class.field-invalid]="showFieldError('full_name')">Name <span class="required">*</span>
          <input
            id="account-full-name"
            class="admin-input full-width"
            [(ngModel)]="form.full_name"
            (ngModelChange)="formDirty = true"
            (blur)="markTouched('full_name')"
            autocomplete="name" />
          <span class="field-error" *ngIf="showFieldError('full_name')">Name is required</span>
        </label>
        <label class="field-label" for="account-email" [class.field-invalid]="showFieldError('email')">Email <span class="required">*</span>
          <input
            id="account-email"
            class="admin-input full-width"
            type="email"
            [(ngModel)]="form.email"
            (ngModelChange)="formDirty = true"
            (blur)="markTouched('email')"
            autocomplete="email" />
          <span class="field-error" *ngIf="showFieldError('email')">
            {{ !form.email.trim() ? 'Email is required' : 'Enter a valid email address' }}
          </span>
        </label>

        <label class="field-label" for="account-phone" [class.field-invalid]="showFieldError('phone')">Phone Number
          <input
            id="account-phone"
            class="admin-input full-width"
            [(ngModel)]="form.phone"
            (ngModelChange)="formDirty = true"
            (blur)="markTouched('phone')"
            placeholder="10-digit mobile"
            maxlength="10"
            inputmode="numeric" />
          <span class="field-error" *ngIf="showFieldError('phone')">Phone must be exactly 10 digits</span>
        </label>
        <label class="field-label" for="account-role">Role <span class="required" *ngIf="!editingId">*</span>
          <select
            *ngIf="!editingId"
            id="account-role"
            class="admin-select full-width"
            [(ngModel)]="form.role"
            (ngModelChange)="onRoleChange(); formDirty = true">
            <option value="admin">Admin</option>
            <option value="subadmin">Sub Admin</option>
          </select>
          <input
            *ngIf="editingId"
            id="account-role"
            class="admin-input full-width"
            [value]="form.role === 'subadmin' ? 'Sub Admin' : 'Admin'"
            disabled />
        </label>

        <label class="field-label full" for="account-status">Status
          <select id="account-status" class="admin-select full-width" [(ngModel)]="form.status" (ngModelChange)="formDirty = true">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </label>

        <ng-container *ngIf="!editingId">
          <label class="field-label" for="account-password" [class.field-invalid]="showFieldError('password')">Password <span class="required">*</span>
            <input
              id="account-password"
              class="admin-input full-width"
              type="password"
              [(ngModel)]="form.password"
              (ngModelChange)="formDirty = true"
              (blur)="markTouched('password')"
              minlength="8"
              autocomplete="new-password" />
            <span class="field-error" *ngIf="showFieldError('password')">Password must be at least 8 characters</span>
          </label>
          <label class="field-label" for="account-confirm-password" [class.field-invalid]="showFieldError('confirm_password')">Confirm Password <span class="required">*</span>
            <input
              id="account-confirm-password"
              class="admin-input full-width"
              type="password"
              [(ngModel)]="form.confirm_password"
              (ngModelChange)="formDirty = true"
              (blur)="markTouched('confirm_password')"
              minlength="8"
              autocomplete="new-password" />
            <span class="field-error" *ngIf="showFieldError('confirm_password')">Passwords must match</span>
          </label>
        </ng-container>
      </div>

      <div class="permission-section" *ngIf="form.role === 'subadmin'" aria-labelledby="permission-matrix-title">
        <h3 id="permission-matrix-title" class="matrix-title">Permission Matrix</h3>
        <p class="matrix-hint admin-cell-muted">Scroll horizontally on small screens to view all permission columns.</p>
        <div class="permission-matrix-wrap" tabindex="0" role="region" aria-label="Module permissions">
          <table class="permission-matrix admin-data-table">
            <thead>
              <tr>
                <th scope="col">Module</th>
                <th scope="col">View</th>
                <th scope="col">Create</th>
                <th scope="col">Edit</th>
                <th scope="col">Delete</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let row of form.permissions">
                <td class="module-name">{{ formatModule(row.module) }}</td>
                <td>
                  <label class="perm-check" [attr.aria-label]="formatModule(row.module) + ' view'">
                    <input type="checkbox" [(ngModel)]="row.can_view" [name]="row.module + '_view'" (ngModelChange)="formDirty = true" />
                  </label>
                </td>
                <td>
                  <label class="perm-check" [attr.aria-label]="formatModule(row.module) + ' create'">
                    <input type="checkbox" [(ngModel)]="row.can_create" [name]="row.module + '_create'" [disabled]="!row.can_view" (ngModelChange)="formDirty = true" />
                  </label>
                </td>
                <td>
                  <label class="perm-check" [attr.aria-label]="formatModule(row.module) + ' edit'">
                    <input type="checkbox" [(ngModel)]="row.can_edit" [name]="row.module + '_edit'" [disabled]="!row.can_view" (ngModelChange)="formDirty = true" />
                  </label>
                </td>
                <td>
                  <label class="perm-check" [attr.aria-label]="formatModule(row.module) + ' delete'">
                    <input type="checkbox" [(ngModel)]="row.can_delete" [name]="row.module + '_delete'" [disabled]="!row.can_view" (ngModelChange)="formDirty = true" />
                  </label>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div adminModalFooter>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="accountModal.requestClose()">Cancel</button>
        <button
          type="button"
          class="admin-btn admin-btn-primary"
          [disabled]="saving || !isFormValid"
          (click)="save()">
          {{ saving ? 'Saving…' : (editingId ? 'Update' : 'Create') }}
        </button>
      </div>
    </app-admin-modal>

    <!-- Reset password -->
    <app-admin-modal
      #resetModal
      [open]="showResetModal"
      title="Reset Password"
      [subtitle]="(resetTarget?.full_name || '') + (resetTarget ? ' · ' + resetTarget.email : '')"
      [dirty]="!!resetPassword || !!resetPasswordConfirm"
      size="sm"
      (closed)="closeResetModal()">
      <p id="reset-modal-hint" class="admin-cell-muted">User will be required to change this password on next login.</p>
      <div class="admin-form-grid">
        <label class="full" for="reset-password">New Password <span class="required">*</span>
          <input
            id="reset-password"
            class="admin-input full-width"
            type="password"
            [(ngModel)]="resetPassword"
            minlength="8"
            autocomplete="new-password" />
        </label>
        <label class="full" for="reset-password-confirm">Confirm Password <span class="required">*</span>
          <input
            id="reset-password-confirm"
            class="admin-input full-width"
            type="password"
            [(ngModel)]="resetPasswordConfirm"
            minlength="8"
            autocomplete="new-password" />
        </label>
      </div>
      <div adminModalFooter>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="resetModal.requestClose()">Cancel</button>
        <button type="button" class="admin-btn admin-btn-primary" [disabled]="resetting" (click)="confirmReset()">
          {{ resetting ? 'Resetting…' : 'Reset Password' }}
        </button>
      </div>
    </app-admin-modal>

    <!-- Delete confirmation -->
    <app-admin-modal
      #deleteModal
      [open]="showDeleteModal"
      title="Delete Account"
      [subtitle]="(deleteTarget?.full_name || '') + (deleteTarget ? ' · ' + deleteTarget.email : '')"
      [dirty]="false"
      size="sm"
      (closed)="closeDeleteModal()">
      <p>Are you sure you want to delete <strong>{{ deleteTarget?.full_name }}</strong>?</p>
      <p id="delete-modal-hint" class="admin-alert-warning">This action cannot be undone.</p>
      <div adminModalFooter>
        <button type="button" class="admin-btn admin-btn-secondary" (click)="deleteModal.requestClose()">Cancel</button>
        <button type="button" class="admin-btn admin-btn-danger" [disabled]="deleting" (click)="confirmDelete()">
          {{ deleting ? 'Deleting…' : 'Delete' }}
        </button>
      </div>
    </app-admin-modal>
  `,
  styles: []
})
export class AdminSubAdminsComponent implements OnInit {
  subAdmins: SubAdmin[] = [];
  admins: SubAdmin[] = [];
  loading = false;
  loadingAdmins = false;
  itemsPerPage = 25;
  adminsPage = 1;
  subAdminsPage = 1;

  get adminsTotalPages(): number {
    return Math.max(1, Math.ceil(this.admins.length / this.itemsPerPage));
  }

  get subAdminsTotalPages(): number {
    return Math.max(1, Math.ceil(this.subAdmins.length / this.itemsPerPage));
  }

  getPaginatedAdmins(): SubAdmin[] {
    const start = (this.adminsPage - 1) * this.itemsPerPage;
    return this.admins.slice(start, start + this.itemsPerPage);
  }

  getPaginatedSubAdmins(): SubAdmin[] {
    const start = (this.subAdminsPage - 1) * this.itemsPerPage;
    return this.subAdmins.slice(start, start + this.itemsPerPage);
  }

  onAdminsPageSize(size: number) {
    this.itemsPerPage = size || 25;
    this.adminsPage = 1;
  }

  onSubAdminsPageSize(size: number) {
    this.itemsPerPage = size || 25;
    this.subAdminsPage = 1;
  }
  saving = false;
  deleting = false;
  showModal = false;
  showResetModal = false;
  showDeleteModal = false;
  formDirty = false;
  resetting = false;
  editingId: string | null = null;
  editingRole: AccountRole | null = null;
  resetTarget: SubAdmin | null = null;
  deleteTarget: SubAdmin | null = null;
  deleteRole: AccountRole | null = null;
  resetPassword = '';
  resetPasswordConfirm = '';
  private touchedFields = new Set<FormField>();

  form = {
    full_name: '',
    email: '',
    phone: '',
    role: 'subadmin' as AccountRole,
    password: '',
    confirm_password: '',
    status: 'active' as 'active' | 'inactive',
    permissions: defaultPermissions()
  };

  constructor(
    private adminService: AdminService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    await Promise.all([this.load(), this.loadAdmins()]);
  }

  async load() {
    this.loading = true;
    try {
      this.subAdmins = await firstValueFrom(this.adminService.getSubAdmins());
    } catch (err) {
      this.toast.error(getApiErrorMessage(err, 'Failed to load sub admins'));
    } finally {
      this.loading = false;
    }
  }

  async loadAdmins() {
    this.loadingAdmins = true;
    try {
      this.admins = await firstValueFrom(this.adminService.getAdmins());
    } catch (err) {
      this.toast.error(getApiErrorMessage(err, 'Failed to load admins'));
    } finally {
      this.loadingAdmins = false;
    }
  }

  formatModule(module: string): string {
    return module.replace(/_/g, ' ');
  }

  get isFormValid(): boolean {
    if (!this.form.full_name.trim()) return false;
    if (!this.form.email.trim() || !this.isEmailValid(this.form.email)) return false;
    if (this.form.phone.trim() && !/^[0-9]{10}$/.test(this.form.phone.trim())) return false;
    if (!this.editingId) {
      if (!this.form.password || this.form.password.length < 8) return false;
      if (this.form.password !== this.form.confirm_password) return false;
    }
    return true;
  }

  markTouched(field: FormField) {
    this.touchedFields.add(field);
  }

  private resetTouched() {
    this.touchedFields.clear();
  }

  private touchAllFields() {
    this.touchedFields.add('full_name');
    this.touchedFields.add('email');
    this.touchedFields.add('phone');
    if (!this.editingId) {
      this.touchedFields.add('password');
      this.touchedFields.add('confirm_password');
    }
  }

  showFieldError(field: FormField): boolean {
    if (!this.touchedFields.has(field)) return false;
    return this.isFieldInvalid(field);
  }

  private isFieldInvalid(field: FormField): boolean {
    switch (field) {
      case 'full_name':
        return !this.form.full_name.trim();
      case 'email':
        return !this.form.email.trim() || !this.isEmailValid(this.form.email);
      case 'phone':
        return !!this.form.phone.trim() && !/^[0-9]{10}$/.test(this.form.phone.trim());
      case 'password':
        return !this.editingId && (!this.form.password || this.form.password.length < 8);
      case 'confirm_password':
        return !this.editingId && this.form.password !== this.form.confirm_password;
      default:
        return false;
    }
  }

  private isEmailValid(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  }

  onRoleChange() {
    if (this.form.role === 'subadmin' && !this.editingId) {
      this.form.permissions = defaultPermissions();
    }
  }

  openCreateModal() {
    this.resetTouched();
    this.editingId = null;
    this.editingRole = null;
    this.form = {
      full_name: '',
      email: '',
      phone: '',
      role: 'subadmin',
      password: '',
      confirm_password: '',
      status: 'active',
      permissions: defaultPermissions()
    };
    this.formDirty = false;
    this.showModal = true;
  }

  openEditModal(account: SubAdmin, role: AccountRole) {
    this.resetTouched();
    this.editingId = account.id;
    this.editingRole = role;
    this.form = {
      full_name: account.full_name,
      email: account.email,
      phone: account.phone || '',
      role,
      password: '',
      confirm_password: '',
      status: account.admin_is_active ? 'active' : 'inactive',
      permissions: account.permissions?.length
        ? account.permissions.map((p) => ({ ...p }))
        : defaultPermissions()
    };
    this.formDirty = false;
    this.showModal = true;
  }

  openResetModal(account: SubAdmin) {
    this.resetTarget = account;
    this.resetPassword = '';
    this.resetPasswordConfirm = '';
    this.showResetModal = true;
  }

  openDeleteModal(account: SubAdmin, role: AccountRole) {
    this.deleteTarget = account;
    this.deleteRole = role;
    this.showDeleteModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.editingId = null;
    this.editingRole = null;
    this.formDirty = false;
    this.resetTouched();
  }

  closeResetModal() {
    this.showResetModal = false;
    this.resetTarget = null;
    this.resetPassword = '';
    this.resetPasswordConfirm = '';
  }

  closeDeleteModal() {
    this.showDeleteModal = false;
    this.deleteTarget = null;
    this.deleteRole = null;
  }

  private isActive(): boolean {
    return this.form.status === 'active';
  }

  async save() {
    this.touchAllFields();
    if (!this.isFormValid) {
      this.toast.error('Please fix the highlighted fields');
      return;
    }

    this.saving = true;
    try {
      const phone = this.form.phone.trim() || undefined;
      const adminIsActive = this.isActive();

      if (this.editingId && this.editingRole) {
        if (this.editingRole === 'subadmin') {
          await firstValueFrom(
            this.adminService.updateSubAdmin(this.editingId, {
              full_name: this.form.full_name.trim(),
              email: this.form.email.trim(),
              phone,
              admin_is_active: adminIsActive,
              permissions: this.form.permissions
            })
          );
          this.toast.success('Sub admin updated');
          await this.load();
        } else {
          await firstValueFrom(
            this.adminService.updateAdmin(this.editingId, {
              full_name: this.form.full_name.trim(),
              email: this.form.email.trim(),
              phone,
              admin_is_active: adminIsActive
            })
          );
          this.toast.success('Admin updated');
          await this.loadAdmins();
        }
      } else if (this.form.role === 'subadmin') {
        await firstValueFrom(
          this.adminService.createSubAdmin({
            full_name: this.form.full_name.trim(),
            email: this.form.email.trim(),
            phone,
            password: this.form.password,
            confirm_password: this.form.confirm_password,
            admin_is_active: adminIsActive,
            permissions: this.form.permissions
          })
        );
        this.toast.success('Sub admin created');
        await this.load();
      } else {
        await firstValueFrom(
          this.adminService.createAdmin({
            full_name: this.form.full_name.trim(),
            email: this.form.email.trim(),
            phone,
            password: this.form.password,
            confirm_password: this.form.confirm_password,
            admin_is_active: adminIsActive
          })
        );
        this.toast.success('Admin created');
        await this.loadAdmins();
      }

      this.closeModal();
    } catch (err) {
      this.toast.error(getApiErrorMessage(err, 'Failed to save account'));
    } finally {
      this.saving = false;
    }
  }

  async confirmReset() {
    if (!this.resetTarget) return;
    if (!this.resetPassword || this.resetPassword.length < 8) {
      this.toast.error('Password must be at least 8 characters');
      return;
    }
    if (this.resetPassword !== this.resetPasswordConfirm) {
      this.toast.error('Password confirmation must match');
      return;
    }

    this.resetting = true;
    try {
      await firstValueFrom(this.adminService.resetUserPassword(this.resetTarget.id, this.resetPassword));
      this.toast.success('Password reset successfully');
      this.closeResetModal();
      await Promise.all([this.load(), this.loadAdmins()]);
    } catch (err) {
      this.toast.error(getApiErrorMessage(err, 'Failed to reset password'));
    } finally {
      this.resetting = false;
    }
  }

  async confirmDelete() {
    if (!this.deleteTarget || !this.deleteRole) return;

    this.deleting = true;
    try {
      if (this.deleteRole === 'subadmin') {
        await firstValueFrom(this.adminService.deleteSubAdmin(this.deleteTarget.id));
        this.toast.success('Sub admin deleted');
        await this.load();
      } else {
        await firstValueFrom(this.adminService.deleteAdmin(this.deleteTarget.id));
        this.toast.success('Admin deleted');
        await this.loadAdmins();
      }
      this.closeDeleteModal();
    } catch (err) {
      this.toast.error(getApiErrorMessage(err, 'Failed to delete account'));
    } finally {
      this.deleting = false;
    }
  }
}
