import { Router } from '@angular/router';
import type { UserProfile } from '../services/auth.service';
import { isGooglePhonePlaceholder } from './phone-display';
import { isValidIndianMobile } from './phone-normalize';

const LOOP_KEY = 'phone_redirect_count';
export const PHONE_REDIRECT_LIMIT = 2;

/** Customer booking gate. Trainer and admin accounts are not sent to complete-profile. */
const PHONE_GATE_EXEMPT_ROLES = ['admin', 'superadmin', 'subadmin', 'trainer'];

export function customerNeedsPhone(user: UserProfile | null | undefined): boolean {
  if (!user) return false;
  if (PHONE_GATE_EXEMPT_ROLES.includes(user.role)) return false;
  if (user.phone_complete === true) return false;
  if (user.phone_complete === false) return true;
  return isGooglePhonePlaceholder(user.phone) || !isValidIndianMobile(String(user.phone || ''));
}

/** Only in-app paths. Drops open redirects and the profile page itself. */
export function safeInternalNext(url: string | null | undefined): string {
  const value = String(url || '').trim();
  if (!value.startsWith('/') || value.startsWith('//') || value.includes('://')) {
    return '/booking';
  }
  const path = value.split('?')[0];
  if (path === '/complete-profile') return '/booking';
  return value;
}

export function clearPhoneRedirectLoop(): void {
  try {
    sessionStorage.removeItem(LOOP_KEY);
  } catch {
    /* ignore */
  }
}

export function phoneRedirectCount(): number {
  try {
    return Number(sessionStorage.getItem(LOOP_KEY) || '0') || 0;
  } catch {
    return 0;
  }
}

export function redirectToCompleteProfile(router: Router, nextUrl: string): false {
  const path = (router.url || '').split('?')[0];
  if (path === '/complete-profile') return false;

  const count = phoneRedirectCount() + 1;
  try {
    sessionStorage.setItem(LOOP_KEY, String(count));
  } catch {
    /* ignore */
  }

  const next = safeInternalNext(nextUrl);
  const retry = count > PHONE_REDIRECT_LIMIT;
  void router.navigate(['/complete-profile'], {
    queryParams: retry ? { next, retry: '1' } : { next },
    replaceUrl: retry
  });
  return false;
}
