import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { getApiErrorMessage } from '../../../utils/api-error';

@Component({
  selector: 'app-admin-change-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="admin-page">
      <div class="admin-page-header">
        <h1 class="admin-page-title">Change Password</h1>
      </div>

      <div class="admin-alert-warning" *ngIf="auth.getUserProfile()?.must_change_password">
        You must change your password before accessing the admin dashboard.
      </div>

      <section class="admin-panel">
        <form (ngSubmit)="onSubmit()" class="admin-form-grid" novalidate>
          <label class="full" for="current">Current Password
            <input
              id="current"
              type="password"
              class="admin-input full-width"
              [(ngModel)]="form.current_password"
              name="current_password"
              autocomplete="current-password"
              required
              [disabled]="saving" />
          </label>

          <label class="full" for="new">New Password
            <input
              id="new"
              type="password"
              class="admin-input full-width"
              [(ngModel)]="form.new_password"
              name="new_password"
              autocomplete="new-password"
              minlength="8"
              required
              [disabled]="saving" />
            <span class="admin-cell-muted">Minimum 8 characters</span>
          </label>

          <label class="full" for="confirm">Confirm Password
            <input
              id="confirm"
              type="password"
              class="admin-input full-width"
              [(ngModel)]="form.confirm_password"
              name="confirm_password"
              autocomplete="new-password"
              required
              [disabled]="saving" />
          </label>

          <div class="full admin-panel-actions">
            <button
              type="button"
              class="admin-btn admin-btn-secondary"
              *ngIf="!auth.getUserProfile()?.must_change_password"
              (click)="goBack()"
              [disabled]="saving">
              Cancel
            </button>
            <button type="submit" class="admin-btn admin-btn-primary" [disabled]="saving || !isFormValid()">
              {{ saving ? 'Saving…' : 'Update Password' }}
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
  styles: []
})
export class AdminChangePasswordComponent {
  form = {
    current_password: '',
    new_password: '',
    confirm_password: ''
  };
  saving = false;

  constructor(
    public auth: AuthService,
    private adminService: AdminService,
    private toast: ToastService,
    private router: Router
  ) {}

  isFormValid(): boolean {
    return !!(
      this.form.current_password &&
      this.form.new_password.length >= 8 &&
      this.form.confirm_password &&
      this.form.new_password === this.form.confirm_password
    );
  }

  async onSubmit() {
    if (!this.isFormValid()) {
      if (this.form.new_password !== this.form.confirm_password) {
        this.toast.error('Password confirmation must match');
      } else if (this.form.new_password.length < 8) {
        this.toast.error('New password must be at least 8 characters');
      }
      return;
    }

    this.saving = true;
    try {
      await firstValueFrom(
        this.adminService.changePassword({
          current_password: this.form.current_password,
          new_password: this.form.new_password,
          confirm_password: this.form.confirm_password
        })
      );

      this.auth.clearMustChangePassword();
      this.auth.reloadUserProfile();

      this.form = { current_password: '', new_password: '', confirm_password: '' };
      this.toast.success('Password updated successfully');
      this.router.navigate(['/admin']);
    } catch (err) {
      this.toast.error(getApiErrorMessage(err, 'Failed to change password'));
    } finally {
      this.saving = false;
    }
  }

  goBack() {
    this.router.navigate(['/admin']);
  }
}
