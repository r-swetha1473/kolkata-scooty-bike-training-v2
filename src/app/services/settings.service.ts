import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { getAuthToken } from '../utils/auth-token.storage';

export interface Setting {
  key: string;
  value: any;
  description: string;
  updated_at: string;
  updated_by?: string;
}

export interface SiteSettings {
  site_name: string;
  site_logo: string;
  contact_email: string;
  contact_phone: string;
  contact_address: string;
  contact_whatsapp?: string;
  contact_maps_url?: string;
  contact_working_hours?: string;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  social_linkedin?: string;
  footer_copyright: string;
  about_text: string;
  homepage_hero?: unknown;
  homepage_trust_badges?: unknown;
  homepage_features?: unknown;
  homepage_how_it_works?: unknown;
  homepage_statistics?: unknown;
  homepage_testimonials?: unknown;
  faqs_courses?: unknown;
  faqs_contact?: unknown;
  /** Resolved hours ahead customers may book. */
  booking_window_hours?: string | number;
  booking_window_value?: string | number;
  booking_window_unit?: 'hours' | 'days' | 'weeks' | string;
  min_advance_hours?: string | number;
  max_bookings_per_week?: string | number;
  booking_gap_hours?: string | number;
  allow_same_day_booking?: boolean | string;
  show_fully_booked_slots?: boolean | string;
  show_slots_outside_window?: boolean | string;
  slot_visibility_mode?: string;
  holiday_booking_allowed?: boolean | string;
  cancellation_window_hours?: string | number;
}

export interface BookingRulesSettings {
  min_advance_hours: number;
  booking_window_value: number;
  booking_window_unit: 'hours' | 'days' | 'weeks';
  booking_window_hours: number;
  max_bookings_per_week: number;
  booking_gap_hours: number;
  allow_same_day_booking: boolean;
  show_fully_booked_slots: boolean;
  show_slots_outside_window: boolean;
  slot_visibility_mode: 'hide_unavailable' | 'disable_unavailable' | 'show_all_with_status';
  holiday_booking_allowed: boolean;
  cancellation_window_hours: number;
}

@Injectable({
  providedIn: 'root'
})
export class SettingsService {
  private apiUrl = environment.apiUrl || 'https://kolkata-scooty-bike-training.onrender.com/api';
  private settingsSubject = new BehaviorSubject<SiteSettings>({
    site_name: 'Kolkata Scooty Bike Training',
    site_logo: '/assets/brand/logo.svg',
    contact_email: 'info@kolkatascootytraining.com',
    contact_phone: '+91 98765 43210',
    contact_address: 'Salt Lake, Kolkata, West Bengal, India',
    social_facebook: 'https://www.facebook.com/kolkatascootytraining',
    social_instagram: 'https://www.instagram.com/kolkatascootytraining',
    social_youtube: 'https://www.youtube.com/@kolkatascootytraining',
    social_linkedin: 'https://www.linkedin.com/company/kolkata-scooty-bike-training',
    footer_copyright: '© 2026 Kolkata Scooty Bike Training. All rights reserved.',
    about_text: 'Kolkata Scooty Bike Training helps beginners and returning riders learn scooty and bike skills safely in Kolkata.'
  });

  public settings$: Observable<SiteSettings> = this.settingsSubject.asObservable();
  private loadingPromise: Promise<void> | null = null;

  constructor(private http: HttpClient) {
    this.loadSettings();
  }

  private getAuthHeaders(json = true): HttpHeaders {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return new HttpHeaders(headers);
  }

  async loadSettings(): Promise<void> {
    if (this.loadingPromise) {
      return this.loadingPromise;
    }

    this.loadingPromise = (async () => {
      try {
        const settings = await firstValueFrom(
          this.http.get<SiteSettings>(`${this.apiUrl}/settings`)
        );
        if (settings) {
          this.settingsSubject.next(settings);
        }
      } catch (error: any) {
        if (error?.status === 429) {
          return;
        }
      } finally {
        setTimeout(() => {
          this.loadingPromise = null;
        }, 5000);
      }
    })();

    return this.loadingPromise;
  }

  getSettings(): SiteSettings {
    return this.settingsSubject.value;
  }

  async getSetting(key: string): Promise<any> {
    try {
      const result = await firstValueFrom(
        this.http.get<{ key: string; value: any }>(`${this.apiUrl}/settings/${key}`)
      );
      return result.value;
    } catch (error: any) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  async updateSetting(key: string, value: any): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/settings/${key}`, { value }, {
        headers: this.getAuthHeaders()
      })
    );
    await this.loadSettings();
  }

  async updateSettings(settings: Partial<SiteSettings>): Promise<void> {
    await firstValueFrom(
      this.http.put(`${this.apiUrl}/settings`, settings, {
        headers: this.getAuthHeaders()
      })
    );
    await this.loadSettings();
  }

  async getAllSettings(): Promise<Setting[]> {
    return firstValueFrom(
      this.http.get<Setting[]>(`${this.apiUrl}/settings/all`, {
        headers: this.getAuthHeaders()
      })
    );
  }

  async getBookingRules(): Promise<BookingRulesSettings> {
    return firstValueFrom(this.http.get<BookingRulesSettings>(`${this.apiUrl}/settings/booking-rules`));
  }

  async saveBookingRules(payload: Partial<BookingRulesSettings> | Record<string, unknown>): Promise<BookingRulesSettings> {
    const res = await firstValueFrom(
      this.http.put<{ message: string; rules: BookingRulesSettings }>(
        `${this.apiUrl}/settings/booking-rules`,
        payload,
        { headers: this.getAuthHeaders() }
      )
    );
    await this.loadSettings();
    return res.rules;
  }

  /** Upload homepage/banner image → Cloudinary folder kolkata-bike-training/banner */
  uploadImage(file: File): Promise<{ image_url: string; url: string; secure_url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string; secure_url: string }>(
        `${this.apiUrl}/settings/upload-image`,
        formData,
        { headers: this.getAuthHeaders(false) }
      )
    );
  }

  /** Upload site logo → Cloudinary folder kolkata-bike-training/settings */
  uploadLogo(file: File): Promise<{ image_url: string; url: string; secure_url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    return firstValueFrom(
      this.http.post<{ image_url: string; url: string; secure_url: string }>(
        `${this.apiUrl}/settings/upload-logo`,
        formData,
        { headers: this.getAuthHeaders(false) }
      )
    );
  }
}
