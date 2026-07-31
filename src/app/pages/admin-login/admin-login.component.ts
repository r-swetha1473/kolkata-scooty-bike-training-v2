import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { PermissionService } from '../../services/permission.service';

import { BrandLogoComponent } from '../../shared/components/brand-logo/brand-logo.component';

@Component({
  selector: 'app-admin-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, BrandLogoComponent],
  template: `
    <div class="admin-login-page">
      <div class="login-bg" aria-hidden="true"></div>
      <div class="login-container">
        <div class="login-card">
          <div class="logo-section">
            <app-brand-logo variant="mark" [markSize]="56"></app-brand-logo>
            <h1>Admin sign in</h1>
            <p class="subtitle">Kolkata Scooty operations portal</p>
          </div>

          <form (ngSubmit)="onSubmit()" class="login-form">
            <div class="form-group">
              <label for="email">Email address</label>
              <input
                type="email"
                id="email"
                [(ngModel)]="credentials.email"
                name="email"
                placeholder="admin@example.com"
                required
                [disabled]="loading"
                autocomplete="email">
            </div>

            <div class="form-group">
              <label for="password">Password</label>
              <input
                type="password"
                id="password"
                [(ngModel)]="credentials.password"
                name="password"
                placeholder="Enter your password"
                required
                [disabled]="loading"
                autocomplete="current-password">
            </div>

            <div class="error-message" *ngIf="errorMessage" role="alert">
              {{ errorMessage }}
            </div>

            <button
              type="submit"
              class="btn-login"
              [disabled]="loading || !credentials.email || !credentials.password">
              <span *ngIf="!loading">Sign in</span>
              <span *ngIf="loading">Signing in…</span>
            </button>
          </form>

          <div class="info-message">
            <p>Staff access only. <a routerLink="/">Return to public site</a></p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .admin-login-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      position: relative;
      overflow: hidden;
    }

    .login-container {
      width: 100%;
      max-width: 420px;
      position: relative;
      z-index: 1;
    }

    .logo-section {
      text-align: center;
      margin-bottom: 2rem;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }

    input:disabled {
      background: var(--color-bg);
      cursor: not-allowed;
    }

    .btn-login:disabled {
      opacity: 0.55;
      cursor: not-allowed;
    }

    .login-bg {
      position: absolute;
      inset: 0;
      background: linear-gradient(135deg, var(--color-dark) 0%, #1E293B 50%, #1E3A8A 100%);
    }

    .login-bg::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(ellipse 50% 40% at 80% 20%, rgba(37, 99, 235, 0.25), transparent 55%);
    }

    .login-card {
      background: var(--color-card);
      border-radius: var(--radius-xl);
      box-shadow: var(--shadow-xl);
      padding: 2rem;
      animation: ds-fade-up 0.4s ease both;
    }

    .logo-mark {
      width: 52px;
      height: 52px;
      margin: 0 auto 1rem;
      border-radius: var(--radius-lg);
      display: grid;
      place-items: center;
      background: var(--color-primary);
      color: #fff;
      font-weight: 700;
      font-size: var(--text-body-sm);
    }

    h1 {
      margin: 0 0 0.35rem;
      font-size: var(--text-display-sm);
      color: var(--color-ink);
      font-weight: 700;
    }

    .subtitle {
      margin: 0;
      color: var(--color-muted);
      font-size: var(--text-body-sm);
    }

    label {
      font-weight: 500;
      color: var(--color-ink-soft);
      font-size: var(--text-body-sm);
    }

    input {
      padding: 0.625rem 0.875rem;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      font-size: var(--text-body);
      outline: none;
      transition: border-color var(--dur-fast), box-shadow var(--dur-fast);
    }

    input:focus {
      border-color: var(--color-primary);
      box-shadow: var(--shadow-focus);
    }

    .error-message {
      background: rgba(239, 68, 68, 0.08);
      color: var(--color-danger);
      padding: 0.75rem 1rem;
      border-radius: var(--radius-md);
      font-size: var(--text-body-sm);
      border: 1px solid rgba(239, 68, 68, 0.2);
    }

    .btn-login {
      min-height: 44px;
      padding: 0.75rem 1.25rem;
      background: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: var(--radius-md);
      font-size: var(--text-btn);
      font-weight: 600;
      cursor: pointer;
      transition: background var(--dur-fast);
      margin-top: 0.25rem;
    }

    .btn-login:hover:not(:disabled) {
      background: var(--color-primary-hover);
    }

    .info-message {
      margin-top: 1.5rem;
      padding-top: 1.25rem;
      border-top: 1px solid var(--color-border);
      text-align: center;
    }

    .info-message p {
      margin: 0;
      color: var(--color-muted);
      font-size: var(--text-body-sm);
    }

    .info-message a {
      color: var(--color-primary);
      font-weight: 600;
    }

    @media (max-width: 480px) {
      .login-card { padding: 1.5rem; }
      h1 { font-size: 1.4rem; }
    }
  `]
})
export class AdminLoginComponent {
  credentials = {
    email: '',
    password: ''
  };

  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private perms: PermissionService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async onSubmit() {
    this.loading = true;
    this.errorMessage = '';

    try {
      await this.authService.signInWithEmailPassword(
        this.credentials.email,
        this.credentials.password
      );

      const profile = this.authService.getUserProfile();
      if (profile && ['admin', 'superadmin', 'subadmin'].includes(profile.role)) {
        if (profile.must_change_password) {
          this.router.navigate(['/admin/change-password']);
          return;
        }
        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        const defaultRoute = this.perms.getFirstAllowedAdminRoute();
        const target =
          returnUrl && returnUrl.startsWith('/admin') && !returnUrl.includes('change-password')
            ? returnUrl
            : defaultRoute;
        this.router.navigateByUrl(target);
      } else {
        this.errorMessage = 'Access denied. Admin credentials required.';
        await this.authService.signOut();
      }
    } catch (error: any) {
      this.errorMessage =
        error?.error?.message || error?.message || 'Invalid email or password';
    } finally {
      this.loading = false;
    }
  }
}
