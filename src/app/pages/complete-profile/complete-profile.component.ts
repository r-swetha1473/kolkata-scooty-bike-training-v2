import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AuthService, UserProfile } from '../../services/auth.service';
import { HttpService } from '../../services/http.service';
import { getApiErrorMessage } from '../../utils/api-error';
import {
  INVALID_MOBILE_MESSAGE,
  normalizeStrictIndianMobile
} from '../../utils/phone-normalize';
import { clearPhoneRedirectLoop, customerNeedsPhone, safeInternalNext } from '../../utils/phone-gate';

@Component({
  selector: 'app-complete-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <section class="complete-profile">
      <div class="card">
        <h1>Add your mobile number</h1>
        <p class="reason">We call you about your class.</p>

        <p class="err" *ngIf="loadError">{{ loadError }}</p>
        <p class="err" *ngIf="loopStopped">We could not open the next page. Check your connection and try again.</p>

        <button type="button" class="btn secondary" *ngIf="loadError || loopStopped" (click)="retry()" [disabled]="loading">
          {{ loading ? 'Retrying…' : 'Retry' }}
        </button>

        <ng-container *ngIf="!loading && !profile && !loadError">
          <p>Sign in to add your mobile number.</p>
          <button type="button" class="btn" (click)="signIn()">Sign in with Google</button>
        </ng-container>

        <form *ngIf="profile" (ngSubmit)="save()" novalidate>
          <label for="fullName">Name</label>
          <input id="fullName" name="fullName" type="text" [(ngModel)]="fullName" autocomplete="name" />

          <label for="mobile">Mobile number</label>
          <input
            id="mobile"
            name="mobile"
            type="tel"
            inputmode="numeric"
            autocomplete="tel"
            enterkeyhint="done"
            maxlength="16"
            [(ngModel)]="phone"
            placeholder="9876543210"
            required />
          <p class="err" *ngIf="saveError">{{ saveError }}</p>

          <button type="submit" class="btn" [disabled]="saving">
            {{ saving ? 'Saving…' : 'Save and continue' }}
          </button>
        </form>

        <button type="button" class="logout" (click)="logout()">Log out</button>
      </div>
    </section>
  `,
  styles: [`
    .complete-profile {
      min-height: 70vh;
      display: flex;
      align-items: flex-start;
      justify-content: center;
      padding: 2rem 1rem 3rem;
    }
    .card {
      width: min(100%, 28rem);
      background: var(--color-card, #fff);
      border: 1px solid var(--color-border, #e5e7eb);
      border-radius: 16px;
      padding: 1.5rem 1.25rem 1.25rem;
      box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
    }
    h1 { margin: 0 0 0.35rem; font-size: 1.45rem; }
    .reason { margin: 0 0 1.25rem; color: var(--color-text-muted, #475569); }
    label { display: block; font-size: 0.875rem; font-weight: 600; margin: 0.85rem 0 0.35rem; }
    input {
      width: 100%;
      box-sizing: border-box;
      font-size: 16px;
      padding: 0.75rem 0.8rem;
      border-radius: 10px;
      border: 1px solid var(--color-border, #cbd5e1);
    }
    .btn {
      width: 100%;
      margin-top: 1.1rem;
      border: 0;
      border-radius: 10px;
      padding: 0.8rem 1rem;
      background: var(--color-primary, #1d4ed8);
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
    }
    .btn.secondary { background: transparent; color: inherit; border: 1px solid var(--color-border, #cbd5e1); }
    .btn:disabled { opacity: 0.7; cursor: default; }
    .err { color: #b91c1c; margin: 0.75rem 0 0; }
    .logout {
      margin-top: 1rem;
      background: none;
      border: 0;
      color: var(--color-text-muted, #475569);
      text-decoration: underline;
      cursor: pointer;
      font-size: 0.9rem;
      padding: 0;
    }
  `]
})
export class CompleteProfileComponent implements OnInit {
  profile: UserProfile | null = null;
  fullName = '';
  phone = '';
  loading = true;
  saving = false;
  loadError = '';
  saveError = '';
  loopStopped = false;
  private leaveAllowed = false;
  private nextUrl = '/booking';

  constructor(
    private authService: AuthService,
    private http: HttpService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.nextUrl = safeInternalNext(params.get('next'));
      this.loopStopped = params.get('retry') === '1';
    });
    void this.loadProfile();
  }

  allowLeave(): boolean {
    if (this.leaveAllowed) return true;
    if (this.loadError) return false;
    if (!this.profile) return !this.loading;
    return !customerNeedsPhone(this.profile);
  }

  async retry(): Promise<void> {
    clearPhoneRedirectLoop();
    this.loopStopped = false;
    await this.loadProfile();
  }

  signIn(): void {
    this.leaveAllowed = true;
    this.authService.signInWithGoogle(this.nextUrl);
  }

  async logout(): Promise<void> {
    this.leaveAllowed = true;
    clearPhoneRedirectLoop();
    await this.authService.signOut();
  }

  async save(): Promise<void> {
    this.saveError = '';
    const normalized = normalizeStrictIndianMobile(this.phone);
    if (!normalized) {
      this.saveError = INVALID_MOBILE_MESSAGE;
      return;
    }

    this.saving = true;
    try {
      const updated = await this.authService.updateProfile({
        full_name: this.fullName.trim() || this.profile?.full_name,
        phone: this.phone
      });
      this.profile = updated;
      this.phone = updated.phone || normalized;
      if (customerNeedsPhone(updated)) {
        this.saveError = INVALID_MOBILE_MESSAGE;
        return;
      }
      clearPhoneRedirectLoop();
      this.leaveAllowed = true;
      window.location.assign(this.nextUrl);
    } catch (error: unknown) {
      this.saveError = getApiErrorMessage(error, 'Could not save your mobile number. Retry.');
    } finally {
      this.saving = false;
    }
  }

  private async loadProfile(): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const profile = await firstValueFrom(this.http.get<UserProfile>('/auth/me'));
      this.authService.setCachedUserProfile(profile);
      this.profile = profile;
      this.fullName = profile.full_name || '';
      this.phone = customerNeedsPhone(profile) ? '' : profile.phone || '';
      if (!customerNeedsPhone(profile)) {
        clearPhoneRedirectLoop();
        this.leaveAllowed = true;
        window.location.assign(this.nextUrl);
      }
    } catch (error: unknown) {
      this.profile = null;
      const status = (error as { status?: number })?.status;
      if (status === 401) {
        this.loadError = '';
      } else {
        this.loadError = 'Could not load your profile. Retry';
      }
    } finally {
      this.loading = false;
    }
  }
}
