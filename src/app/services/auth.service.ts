import { Injectable } from '@angular/core';

import { Router } from '@angular/router';

import { HttpService } from './http.service';

import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';

import { map } from 'rxjs/operators';

import { getAuthToken, setAuthToken, clearAuthToken } from '../utils/auth-token.storage';

import { customerNeedsPhone, safeInternalNext } from '../utils/phone-gate';



export interface ModulePermission {

  module: string;

  can_view: boolean;

  can_create: boolean;

  can_edit: boolean;

  can_delete: boolean;

}



export interface UserProfile {

  id: string;

  email: string;

  full_name: string;

  phone: string | null;

  phone_complete?: boolean;

  candidates_enabled?: boolean;

  avatar_url: string | null;

  role: 'customer' | 'trainer' | 'admin' | 'superadmin' | 'subadmin';

  inactive_blocked?: boolean;

  admin_is_active?: boolean;

  must_change_password?: boolean;

  last_booking_date?: string | null;

  created_at?: string | null;

  permissions?: ModulePermission[];

}



export interface AuthResponse {

  token?: string;

  user: UserProfile;

}



@Injectable({

  providedIn: 'root'

})

export class AuthService {

  private pendingOAuthReturn = false;

  private userProfileSubject = new BehaviorSubject<UserProfile | null>(null);

  userProfile$: Observable<UserProfile | null> = this.userProfileSubject.asObservable();



  constructor(

    private http: HttpService,

    private router: Router

  ) {

    this.handleOAuthRedirect();

    this.loadUserFromToken();

  }



  private static readonly OAUTH_RETURN_KEY = 'oauth_return_url';

  private handleOAuthRedirect(): void {

    try {

      const url = new URL(window.location.href);
      const token = url.searchParams.get('token')?.trim();
      const oauthSuccess = url.searchParams.get('oauth') === 'success';

      if (token) {
        setAuthToken(token);
        url.searchParams.delete('token');
      }

      if (oauthSuccess) {
        url.searchParams.delete('oauth');
      }

      if (token || oauthSuccess) {
        window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
        this.pendingOAuthReturn = true;
      }

    } catch {

      /* ignore */

    }

  }

  private routeAfterGoogleSignIn(user: UserProfile): void {
    const stored = sessionStorage.getItem(AuthService.OAUTH_RETURN_KEY);
    sessionStorage.removeItem(AuthService.OAUTH_RETURN_KEY);
    const next = safeInternalNext(stored || '/booking');
    if (customerNeedsPhone(user)) {
      void this.router.navigate(['/complete-profile'], { queryParams: { next } });
      return;
    }
    const path = next.split('?')[0];
    if (window.location.pathname !== path) {
      void this.router.navigateByUrl(next);
    }
  }



  private loadUserFromToken() {

    this.http.get<UserProfile>('/auth/me').subscribe({

      next: (user) => {
        this.userProfileSubject.next(user);
        if (this.pendingOAuthReturn) {
          this.pendingOAuthReturn = false;
          this.routeAfterGoogleSignIn(user);
        }
      },

      error: () => {

        clearAuthToken();

        this.userProfileSubject.next(null);

        this.pendingOAuthReturn = false;

      }

    });

  }



  reloadUserProfile(): void {

    this.loadUserFromToken();

  }

  /** Hydrate profile into the shared subject without a round-trip (e.g. after /auth/me). */
  setCachedUserProfile(profile: UserProfile | null): void {
    this.userProfileSubject.next(profile);
  }

  signInWithGoogle(returnUrl?: string): void {
    const path = returnUrl || `${window.location.pathname}${window.location.search}`;
    sessionStorage.setItem(AuthService.OAUTH_RETURN_KEY, path || '/booking');
    window.location.href = `${this.http['apiUrl']}/auth/google`;
  }



  async signInWithEmailPassword(email: string, password: string): Promise<UserProfile | null> {

    const response = await firstValueFrom(this.http.post<AuthResponse>('/auth/login', { email, password }));

    if (response?.token) {

      setAuthToken(response.token);

    }

    if (response?.user) {

      this.userProfileSubject.next(response.user);

      return response.user;

    }

    return null;

  }



  async signOut(): Promise<void> {

    try {

      await firstValueFrom(this.http.post('/auth/logout', {}));

    } catch {

      /* still clear local session */

    } finally {

      clearAuthToken();

      this.userProfileSubject.next(null);

      this.router.navigate(['/']);

    }

  }



  readonly isAuthenticated$ = this.userProfile$.pipe(map((user) => !!user));



  isAuthenticated(): boolean {

    return !!this.userProfileSubject.value;

  }



  getUserProfile(): UserProfile | null {

    return this.userProfileSubject.value;

  }



  hasRole(roles: string[]): boolean {

    const profile = this.getUserProfile();

    return profile ? roles.includes(profile.role) : false;

  }



  isAdmin(): boolean {

    return this.hasRole(['admin', 'superadmin', 'subadmin']);

  }



  isSuperAdmin(): boolean {

    return this.hasRole(['superadmin']);

  }



  isSubAdmin(): boolean {

    return this.hasRole(['subadmin']);

  }

  clearMustChangePassword(): void {
    const profile = this.getUserProfile();
    if (profile) {
      this.userProfileSubject.next({ ...profile, must_change_password: false });
    }
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {

    const updatedProfile = await firstValueFrom(this.http.put<UserProfile>('/profiles/me', updates));

    if (updatedProfile) {

      this.userProfileSubject.next(updatedProfile);

      return updatedProfile;

    }

    throw new Error('Failed to update profile');

  }

}


