import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, firstValueFrom } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import { ApiService } from '../../services/api.service';

interface ProfilePrefs {
  emailNotifications: boolean;
  smsNotifications: boolean;
  bookingReminders: boolean;
  preferredContact: 'email' | 'phone' | 'whatsapp';
  preferredTime: 'morning' | 'afternoon' | 'evening' | 'any';
}

const PREFS_KEY = 'kbt_profile_prefs';
const DEFAULT_PREFS: ProfilePrefs = {
  emailNotifications: true,
  smsNotifications: false,
  bookingReminders: true,
  preferredContact: 'email',
  preferredTime: 'any'
};

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="portal-page profile-page">
      <div *ngIf="loading && !userProfile" class="portal-skeleton" aria-busy="true" aria-label="Loading profile">
        <div class="portal-skel-card"></div>
        <div class="portal-skel-card short"></div>
      </div>

      <div *ngIf="showInactiveBanner" class="banner-inactive" role="alert">
        <p class="banner-text">Your account is inactive. Contact admin.</p>
        <button
          *ngIf="userProfile?.inactive_blocked"
          type="button"
          class="btn-reactivation"
          (click)="openReactivationModal()"
          [disabled]="reactivationSubmitting || reactivationStatus?.status === 'pending'">
          {{ reactivationStatus?.status === 'pending' ? 'Request Pending' : 'Request Account Reactivation' }}
        </button>
        <p *ngIf="reactivationStatus" class="reactivation-status" [class]="'status-' + reactivationStatus.status">
          Request status: {{ reactivationStatus.status_label }}
        </p>
        <p *ngIf="reactivationStatus?.user_message" class="reactivation-message">
          {{ reactivationStatus.user_message }}
        </p>
      </div>

      <ng-container *ngIf="userProfile">
        <header class="portal-card profile-header">
          <div class="avatar-wrap">
            <img
              *ngIf="userProfile.avatar_url"
              [src]="userProfile.avatar_url"
              [alt]="userProfile.full_name"
              class="avatar-img" />
            <div *ngIf="!userProfile.avatar_url" class="avatar-placeholder">
              {{ getInitials(userProfile.full_name) }}
            </div>
          </div>
          <div class="header-meta">
            <h1>{{ userProfile.full_name || 'User' }}</h1>
            <p class="email">{{ userProfile.email }}</p>
            <p class="phone-line">
              <ng-container *ngIf="!isPlaceholderPhone(userProfile.phone); else phPlaceholder">
                {{ displayPhoneLabel(userProfile.phone!) }}
              </ng-container>
              <ng-template #phPlaceholder>
                <span class="muted">Phone not saved yet</span>
              </ng-template>
            </p>
            <p class="member-since" *ngIf="memberSinceLabel">Member since {{ memberSinceLabel }}</p>
            <p class="acct-status">
              Status:
              <span [class.inactive-label]="userProfile.inactive_blocked === true">
                {{ accountStatusLabel() }}
              </span>
            </p>
          </div>
        </header>

        <section class="stats-row" aria-label="Booking stats">
          <div class="stat-card">
            <span class="stat-value">{{ stats.total }}</span>
            <span class="stat-label">Total bookings</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.completed }}</span>
            <span class="stat-label">Completed</span>
          </div>
          <div class="stat-card">
            <span class="stat-value">{{ stats.cancelled }}</span>
            <span class="stat-label">Cancelled</span>
          </div>
        </section>

        <section class="portal-card section-card">
          <h2 class="card-title">Personal info</h2>
          <p class="hint" *ngIf="isPlaceholderPhone(userProfile.phone)">
            Add your 10-digit mobile for bookings and confirmations.
          </p>
          <div class="form-group">
            <label for="profilePhone">Mobile</label>
            <input
              id="profilePhone"
              type="tel"
              maxlength="10"
              inputmode="numeric"
              autocomplete="tel"
              [(ngModel)]="phoneEditValue"
              (ngModelChange)="phoneUpdateSuccess = ''; phoneUpdateError = ''"
              placeholder="9876543210"
              class="phone-input" />
          </div>
          <button
            type="button"
            class="btn-save"
            (click)="saveMobileNumber()"
            [disabled]="savingPhone || !isPhoneInputValid()">
            {{ savingPhone ? 'Saving…' : 'Save mobile number' }}
          </button>
          <p class="ok" *ngIf="phoneUpdateSuccess">{{ phoneUpdateSuccess }}</p>
          <p class="err" *ngIf="phoneUpdateError">{{ phoneUpdateError }}</p>
          <p class="nav-links">
            <a routerLink="/my-bookings">View my bookings</a>
            <a routerLink="/my-payments">View payments</a>
            <a routerLink="/admin/change-password" *ngIf="canChangePassword">Change password</a>
          </p>
        </section>

        <section class="portal-card section-card">
          <h2 class="card-title">Notification settings</h2>
          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="prefs.emailNotifications" (ngModelChange)="savePrefs()" />
            <span>Email notifications</span>
          </label>
          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="prefs.smsNotifications" (ngModelChange)="savePrefs()" />
            <span>SMS notifications</span>
          </label>
          <label class="toggle-row">
            <input type="checkbox" [(ngModel)]="prefs.bookingReminders" (ngModelChange)="savePrefs()" />
            <span>Booking reminders</span>
          </label>
        </section>

        <section class="portal-card section-card">
          <h2 class="card-title">Booking preferences</h2>
          <div class="form-group">
            <label for="prefContact">Preferred contact</label>
            <select id="prefContact" [(ngModel)]="prefs.preferredContact" (ngModelChange)="savePrefs()">
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="whatsapp">WhatsApp</option>
            </select>
          </div>
          <div class="form-group">
            <label for="prefTime">Preferred training time</label>
            <select id="prefTime" [(ngModel)]="prefs.preferredTime" (ngModelChange)="savePrefs()">
              <option value="any">Any time</option>
              <option value="morning">Morning</option>
              <option value="afternoon">Afternoon</option>
              <option value="evening">Evening</option>
            </select>
          </div>
          <p class="prefs-note">Preferences are saved on this device only.</p>
        </section>

        <section class="portal-card section-card security-notes">
          <h2 class="card-title">Security notes</h2>
          <ul>
            <li>Never share your login link or OTP with anyone claiming to be staff.</li>
            <li>Sign out on shared devices after viewing bookings or payments.</li>
            <li>Use a personal email for your account; contact support if you lose access.</li>
            <li>Payment receipts are verified manually — upload only genuine UPI/bank proofs.</li>
          </ul>
        </section>
      </ng-container>

      <div class="modal-overlay" *ngIf="showReactivationModal" (click)="closeReactivationModal()">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <button type="button" class="close-btn" (click)="closeReactivationModal()" aria-label="Close">×</button>
          <h2>Request Account Reactivation</h2>
          <p class="modal-subtitle">
            Your account is currently inactive.
            Do you want to send a reactivation request to the administrator?
          </p>
          <p class="err" *ngIf="reactivationError">{{ reactivationError }}</p>
          <div class="modal-actions">
            <button type="button" class="btn-cancel" (click)="closeReactivationModal()">Cancel</button>
            <button
              type="button"
              class="btn-save"
              (click)="submitReactivationRequest()"
              [disabled]="reactivationSubmitting">
              {{ reactivationSubmitting ? 'Sending…' : 'Send Request' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .profile-page { animation: ks-fade-up 0.4s ease both; }
      .portal-skeleton { display: grid; gap: 0.85rem; }
      .portal-skel-card {
        height: 160px;
        border-radius: var(--radius-lg);
        background: linear-gradient(90deg, var(--color-border) 25%, var(--color-card) 50%, var(--color-border) 75%);
        background-size: 200% 100%;
        animation: skel 1.2s ease infinite;
      }
      .portal-skel-card.short { height: 100px; }
      @keyframes skel {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
      .banner-inactive {
        background: rgba(192, 57, 43, 0.08);
        border: 1px solid rgba(192, 57, 43, 0.25);
        color: #991b1b;
        padding: 14px 18px;
        border-radius: var(--radius-md);
        margin-bottom: 1.25rem;
      }
      .banner-text { margin: 0 0 12px; font-weight: 600; }
      .btn-reactivation {
        padding: 10px 16px;
        background: #991b1b;
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        min-height: 44px;
      }
      .btn-reactivation:disabled { opacity: 0.6; cursor: not-allowed; }
      .reactivation-status { margin: 12px 0 0; font-size: 14px; font-weight: 600; }
      .status-pending { color: #b45309; }
      .status-approved { color: #059669; }
      .status-rejected { color: #991b1b; }
      .reactivation-message { margin: 8px 0 0; font-size: 14px; color: #7f1d1d; }
      .profile-header {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        margin-bottom: 1rem;
      }
      .avatar-wrap {
        width: 96px;
        height: 96px;
        border-radius: 50%;
        overflow: hidden;
        background: var(--color-bg);
        flex-shrink: 0;
        border: 1px solid var(--color-border);
      }
      .avatar-img { width: 100%; height: 100%; object-fit: cover; }
      .avatar-placeholder {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        font-weight: 700;
        color: var(--color-primary);
      }
      .header-meta h1 {
        margin: 0 0 0.35rem;
        font-size: 1.5rem;
      }
      .email, .phone-line, .member-since, .acct-status {
        margin: 0.2rem 0;
        font-size: 0.9rem;
        color: var(--color-muted);
      }
      .muted { color: var(--color-muted); }
      .inactive-label { color: #b91c1c; font-weight: 600; }
      .stats-row {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 0.75rem;
        margin-bottom: 1rem;
      }
      .stat-card {
        background: var(--color-card);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-lg);
        padding: 1rem;
        text-align: center;
      }
      .stat-value {
        display: block;
        font-size: 1.5rem;
        font-weight: 700;
        color: var(--color-ink);
      }
      .stat-label {
        display: block;
        margin-top: 0.25rem;
        font-size: 0.75rem;
        color: var(--color-muted);
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .section-card { margin-bottom: 1rem; }
      .card-title { margin: 0 0 0.85rem; font-size: 1.05rem; }
      .hint { color: var(--color-muted); font-size: 0.875rem; margin: 0 0 1rem; }
      .form-group { margin-bottom: 0.85rem; }
      .form-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.35rem;
        font-size: 0.85rem;
      }
      .phone-input, select {
        width: 100%;
        max-width: 280px;
        padding: 10px 12px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        font-size: 1rem;
        background: var(--color-card);
      }
      .btn-save {
        padding: 10px 18px;
        background: var(--color-primary);
        color: #fff;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        min-height: 44px;
      }
      .btn-save:disabled { opacity: 0.55; cursor: not-allowed; }
      .ok { color: #059669; font-size: 14px; margin-top: 10px; }
      .err { color: #dc2626; font-size: 14px; margin-top: 10px; }
      .nav-links {
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid var(--color-border);
        display: flex;
        flex-wrap: wrap;
        gap: 1rem;
      }
      .nav-links a {
        color: var(--color-primary);
        font-weight: 600;
        text-decoration: none;
        font-size: 0.9rem;
      }
      .toggle-row {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        margin-bottom: 0.75rem;
        font-size: 0.9rem;
        cursor: pointer;
      }
      .prefs-note {
        margin: 0.5rem 0 0;
        font-size: 0.8rem;
        color: var(--color-muted);
      }
      .security-notes ul {
        margin: 0;
        padding-left: 1.15rem;
        color: var(--color-muted);
        font-size: 0.9rem;
        line-height: 1.55;
      }
      .security-notes li { margin-bottom: 0.45rem; }
      .modal-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 16px;
      }
      .modal-content {
        background: var(--color-card);
        border-radius: 12px;
        padding: 24px;
        width: min(440px, 100%);
        position: relative;
      }
      .modal-content h2 { margin: 0 0 8px; font-size: 1.25rem; }
      .modal-subtitle { margin: 0 0 16px; color: var(--color-muted); line-height: 1.5; }
      .close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        border: none;
        background: transparent;
        font-size: 24px;
        cursor: pointer;
        color: var(--color-muted);
      }
      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        flex-wrap: wrap;
      }
      .btn-cancel {
        padding: 10px 16px;
        border: 1px solid var(--color-border);
        border-radius: 8px;
        background: var(--color-bg);
        cursor: pointer;
        min-height: 44px;
      }
      @media (max-width: 600px) {
        .profile-header { flex-direction: column; text-align: center; }
        .stats-row { grid-template-columns: 1fr; }
        .modal-actions { flex-direction: column-reverse; }
        .modal-actions button { width: 100%; }
      }
    `
  ]
})
export class ProfileComponent implements OnInit, OnDestroy {
  userProfile: UserProfile | null = null;
  loading = false;
  phoneEditValue = '';
  savingPhone = false;
  phoneUpdateSuccess = '';
  phoneUpdateError = '';
  showInactiveBanner = false;
  showReactivationModal = false;
  reactivationSubmitting = false;
  reactivationError = '';
  reactivationStatus: {
    status: string;
    status_label: string;
    user_message?: string;
  } | null = null;
  prefs: ProfilePrefs = { ...DEFAULT_PREFS };
  stats = { total: 0, completed: 0, cancelled: 0 };
  private profileSub: Subscription | null = null;

  constructor(
    private authService: AuthService,
    private route: ActivatedRoute,
    private httpService: HttpService,
    private apiService: ApiService
  ) {}

  get memberSinceLabel(): string {
    const raw = (this.userProfile as any)?.created_at;
    if (!raw) return '';
    const d = new Date(raw);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  }

  get canChangePassword(): boolean {
    const role = this.userProfile?.role;
    return role === 'admin' || role === 'superadmin' || role === 'subadmin';
  }

  async ngOnInit() {
    this.loading = true;
    this.loadPrefs();
    try {
      if (this.route.snapshot.queryParamMap.get('oauth') === 'success') {
        this.authService.reloadUserProfile();
      }
      this.showInactiveBanner =
        this.route.snapshot.queryParamMap.get('inactive') === '1';

      this.userProfile = this.authService.getUserProfile();
      if (!this.userProfile) {
        try {
          const profile = await firstValueFrom(this.httpService.get<UserProfile>('/auth/me'));
          if (profile) {
            this.userProfile = profile;
            this.authService.setCachedUserProfile(profile);
          }
        } catch {
          /* unauthenticated */
        }
      }

      this.syncPhoneInputFromProfile();
      await this.loadBookingStats();

      this.profileSub = this.authService.userProfile$.subscribe((profile) => {
        this.userProfile = profile;
        this.syncPhoneInputFromProfile();
        if (profile?.inactive_blocked) {
          this.showInactiveBanner = true;
          void this.loadReactivationStatus();
        } else {
          this.reactivationStatus = null;
          this.showInactiveBanner = false;
        }
      });

      if (this.userProfile?.inactive_blocked) {
        await this.loadReactivationStatus();
      }
    } finally {
      this.loading = false;
    }
  }

  ngOnDestroy(): void {
    this.profileSub?.unsubscribe();
  }

  private loadPrefs(): void {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.prefs = { ...DEFAULT_PREFS, ...parsed };
    } catch {
      this.prefs = { ...DEFAULT_PREFS };
    }
  }

  savePrefs(): void {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(this.prefs));
    } catch {
      /* ignore quota */
    }
  }

  async loadBookingStats(): Promise<void> {
    try {
      const bookings = await firstValueFrom(this.apiService.getMyBookings());
      const list = bookings || [];
      this.stats = {
        total: list.length,
        completed: list.filter((b: any) => b.status === 'completed').length,
        cancelled: list.filter((b: any) => b.status === 'cancelled').length
      };
    } catch {
      this.stats = { total: 0, completed: 0, cancelled: 0 };
    }
  }

  async loadReactivationStatus(): Promise<void> {
    try {
      const res = await firstValueFrom(
        this.httpService.get<{ request: any }>('/profile/reactivation-status')
      );
      this.reactivationStatus = res?.request || null;
      if (this.reactivationStatus?.status === 'approved') {
        this.authService.reloadUserProfile();
      }
    } catch {
      /* optional endpoint */
    }
  }

  openReactivationModal(): void {
    this.reactivationError = '';
    this.showReactivationModal = true;
  }

  closeReactivationModal(): void {
    this.showReactivationModal = false;
    this.reactivationError = '';
  }

  async submitReactivationRequest(): Promise<void> {
    this.reactivationSubmitting = true;
    this.reactivationError = '';
    try {
      await firstValueFrom(
        this.httpService.post<{ success: boolean; message: string }>(
          '/profile/reactivation-request',
          {}
        )
      );
      this.closeReactivationModal();
      await this.loadReactivationStatus();
    } catch (error: any) {
      const body = error?.error;
      this.reactivationError =
        body?.message || body?.error || error?.message || 'Could not send request.';
    } finally {
      this.reactivationSubmitting = false;
    }
  }

  accountStatusLabel(): string {
    if (!this.userProfile) return '—';
    if (this.userProfile.role !== 'customer') return 'Active (staff)';
    return this.userProfile.inactive_blocked === true ? 'Inactive — contact admin' : 'Active';
  }

  isPlaceholderPhone(phone: string | null | undefined): boolean {
    if (phone == null || String(phone).trim() === '') return true;
    return String(phone).startsWith('GOOGLE_');
  }

  displayPhoneLabel(phone: string): string {
    const d = String(phone).replace(/\D/g, '');
    if (d.length >= 10) return d.slice(-10);
    return phone;
  }

  private syncPhoneInputFromProfile(): void {
    const p = this.userProfile?.phone ?? null;
    if (this.isPlaceholderPhone(p)) {
      this.phoneEditValue = '';
      return;
    }
    this.phoneEditValue = this.displayPhoneLabel(p!);
  }

  isPhoneInputValid(): boolean {
    return /^[0-9]{10}$/.test((this.phoneEditValue || '').trim());
  }

  async saveMobileNumber(): Promise<void> {
    if (!this.isPhoneInputValid()) {
      this.phoneUpdateError = 'Enter a valid 10-digit mobile number.';
      this.phoneUpdateSuccess = '';
      return;
    }
    this.savingPhone = true;
    this.phoneUpdateError = '';
    this.phoneUpdateSuccess = '';
    try {
      const digits = (this.phoneEditValue || '').trim();
      await this.authService.updateProfile({ phone: digits });
      this.phoneUpdateSuccess = 'Mobile number saved.';
    } catch (error: any) {
      const body = error?.error;
      this.phoneUpdateError =
        body?.message ||
        (Array.isArray(body?.errors) && body.errors[0]?.message) ||
        body?.error ||
        error?.message ||
        'Could not update mobile number.';
    } finally {
      this.savingPhone = false;
    }
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }
}
