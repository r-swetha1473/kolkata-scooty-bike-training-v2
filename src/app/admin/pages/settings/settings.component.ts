import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SettingsService, SiteSettings, BookingRulesSettings } from '../../../services/settings.service';
import { CmsContentService, HeroContent } from '../../../services/cms-content.service';
import { ToastService } from '../../../services/toast.service';
import { ApiService } from '../../../services/api.service';
import { getApiErrorMessage } from '../../../utils/api-error';
import { pickUploadedImageUrl } from '../../../utils/media-url';

@Component({
  selector: 'app-admin-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-page admin-page">
      <div class="admin-sticky-toolbar settings-header-sticky">
        <header class="admin-hero">
          <div>
            <h1>Settings</h1>
            <p>Site information, contact details, booking policies, and slot capacity rules.</p>
          </div>
          <div class="admin-hero-actions">
          <button 
            class="admin-btn admin-btn-primary" 
            (click)="saveSettings()" 
            [disabled]="!hasChanges || saving"
            [class.success]="saveSuccess">
            <svg *ngIf="saveSuccess" class="admin-btn-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            {{ saving ? 'Saving...' : (saveSuccess ? 'Saved!' : 'Save Changes') }}
          </button>
        </div>
        </header>
      </div>

      <div class="settings-content">
        <!-- Site Information -->
        <section class="settings-section">
          <h2 class="section-title">Site Information</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Site Name</label>
              <input 
                type="text" 
                [(ngModel)]="settings.site_name" 
                (ngModelChange)="onChange()"
                placeholder="Kolkata Scooty"
                class="admin-input">
            </div>
            <div class="form-group">
              <label>Site Logo</label>
              <div class="image-upload-row">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onLogoImageSelected($event)" [disabled]="uploadingLogo" />
                <span class="upload-hint" *ngIf="uploadingLogo">Uploading logo…</span>
              </div>
              <input 
                type="text" 
                [(ngModel)]="settings.site_logo" 
                (ngModelChange)="onChange()"
                placeholder="Cloudinary HTTPS URL (or upload above)"
                class="admin-input">
            </div>
          </div>
        </section>

        <!-- Contact Information -->
        <section class="settings-section">
          <h2 class="section-title">Contact Information</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Contact Email</label>
              <input 
                type="email" 
                [(ngModel)]="settings.contact_email" 
                (ngModelChange)="onChange()"
                placeholder="contact@example.com"
                class="admin-input">
            </div>
            <div class="form-group">
              <label>Contact Phone</label>
              <input 
                type="tel" 
                [(ngModel)]="settings.contact_phone" 
                (ngModelChange)="onChange()"
                placeholder="+91 1234567890"
                class="admin-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group form-group-full">
              <label>Address</label>
              <textarea 
                [(ngModel)]="settings.contact_address" 
                (ngModelChange)="onChange()"
                rows="2" 
                placeholder="Your business address"
                class="admin-textarea"></textarea>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>WhatsApp Number</label>
              <input type="tel" [(ngModel)]="settings.contact_whatsapp" (ngModelChange)="onChange()" class="admin-input" placeholder="+91 98765 43210" />
            </div>
            <div class="form-group">
              <label>Working Hours</label>
              <input type="text" [(ngModel)]="settings.contact_working_hours" (ngModelChange)="onChange()" class="admin-input" placeholder="Mon–Sat: 9 AM – 9 PM" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group form-group-full">
              <label>Google Maps URL</label>
              <input type="url" [(ngModel)]="settings.contact_maps_url" (ngModelChange)="onChange()" class="admin-input" placeholder="https://www.google.com/maps/..." />
            </div>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="section-title">Homepage Banner</h2>
          <p class="section-hint">Only the homepage hero banner is editable here. All other homepage sections use fixed content.</p>
          <div class="form-row">
            <div class="form-group form-group-full">
              <label>Banner image</label>
              <div class="image-upload-row">
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" (change)="onBannerImageSelected($event)" [disabled]="uploadingBanner" />
                <span class="upload-hint" *ngIf="uploadingBanner">Uploading to Cloudinary…</span>
              </div>
              <input class="admin-input" [(ngModel)]="heroForm.image" (ngModelChange)="syncHero()" placeholder="Cloudinary HTTPS URL (or upload above)" />
              <img *ngIf="heroForm.image" [src]="heroForm.image" alt="Banner preview" class="banner-preview" />
            </div>
          </div>
          <div class="form-row">
            <div class="form-group form-group-full"><label>Banner title</label><input class="admin-input" [(ngModel)]="heroForm.title" (ngModelChange)="syncHero()" /></div>
          </div>
          <div class="form-row">
            <div class="form-group form-group-full"><label>Banner subtitle</label><textarea class="admin-textarea" rows="2" [(ngModel)]="heroForm.subtitle" (ngModelChange)="syncHero()"></textarea></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Banner button text</label><input class="admin-input" [(ngModel)]="heroForm.ctaPrimaryText" (ngModelChange)="syncHero()" /></div>
            <div class="form-group"><label>Banner button link</label><input class="admin-input" [(ngModel)]="heroForm.ctaPrimaryLink" (ngModelChange)="syncHero()" placeholder="/booking" /></div>
          </div>
        </section>

        <section class="settings-section">
          <h2 class="section-title">FAQ CMS</h2>
          <div class="form-group form-group-full">
            <label>Courses page FAQs JSON</label>
            <textarea class="admin-textarea" rows="5" [(ngModel)]="faqsCoursesJson" (ngModelChange)="syncJsonFields()"></textarea>
          </div>
          <div class="form-group form-group-full">
            <label>Contact page FAQs JSON</label>
            <textarea class="admin-textarea" rows="5" [(ngModel)]="faqsContactJson" (ngModelChange)="syncJsonFields()"></textarea>
          </div>
        </section>

        <!-- Social Media Links -->
        <section class="settings-section">
          <h2 class="section-title">Social Media Links</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Facebook Page URL</label>
              <input 
                type="url" 
                [(ngModel)]="settings.social_facebook" 
                (ngModelChange)="onChange()"
                placeholder="https://facebook.com/yourpage"
                class="admin-input">
            </div>
            <div class="form-group">
              <label>Instagram Profile URL</label>
              <input 
                type="url" 
                [(ngModel)]="settings.social_instagram" 
                (ngModelChange)="onChange()"
                placeholder="https://instagram.com/yourprofile"
                class="admin-input">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label>YouTube Channel URL</label>
              <input 
                type="url" 
                [(ngModel)]="settings.social_youtube" 
                (ngModelChange)="onChange()"
                placeholder="https://youtube.com/yourchannel"
                class="admin-input">
            </div>
            <div class="form-group"></div>
          </div>
        </section>

        <!-- Booking Settings -->
        <section class="settings-section">
          <h2 class="section-title">Booking Settings</h2>
          <p class="section-hint">These rules apply to the customer booking flow immediately after save (no code deploy).</p>

          <div class="form-row">
            <div class="form-group">
              <label>Minimum Advance Booking (hours)</label>
              <input type="number" min="0" max="336" class="admin-input"
                [(ngModel)]="bookingRules.min_advance_hours" (ngModelChange)="onBookingChange()" />
              <small>Customers must book at least this many hours before the slot starts.</small>
            </div>
            <div class="form-group">
              <label>Booking Cancellation Window (hours)</label>
              <input type="number" min="0" max="336" class="admin-input"
                [(ngModel)]="bookingRules.cancellation_window_hours" (ngModelChange)="onBookingChange()" />
              <small>Customers may cancel only if more than this many hours remain.</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Booking Window Value</label>
              <input type="number" min="1" max="90" class="admin-input"
                [(ngModel)]="bookingRules.booking_window_value" (ngModelChange)="onBookingChange()" />
            </div>
            <div class="form-group">
              <label>Booking Window Unit</label>
              <select class="admin-input" [(ngModel)]="bookingRules.booking_window_unit" (ngModelChange)="onBookingChange()">
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
              </select>
              <small>Resolved window: {{ resolvedBookingWindowLabel }}</small>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Maximum Bookings Per User Per Week</label>
              <input type="number" min="1" max="50" class="admin-input"
                [(ngModel)]="bookingRules.max_bookings_per_week" (ngModelChange)="onBookingChange()" />
            </div>
            <div class="form-group">
              <label>Minimum Gap Between Bookings (hours)</label>
              <input type="number" min="0" max="720" class="admin-input"
                [(ngModel)]="bookingRules.booking_gap_hours" (ngModelChange)="onBookingChange()" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Slot Visibility Mode</label>
              <select class="admin-input" [(ngModel)]="bookingRules.slot_visibility_mode" (ngModelChange)="onBookingChange()">
                <option value="hide_unavailable">Hide unavailable slots</option>
                <option value="disable_unavailable">Disable unavailable slots</option>
                <option value="show_all_with_status">Show all slots with status</option>
              </select>
            </div>
            <div class="form-group"></div>
          </div>

          <div class="toggle-grid">
            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="bookingRules.allow_same_day_booking" (ngModelChange)="onBookingChange()" />
              <span>Allow same-day booking</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="bookingRules.show_fully_booked_slots" (ngModelChange)="onBookingChange()" />
              <span>Show fully booked slots</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="bookingRules.show_slots_outside_window" (ngModelChange)="onBookingChange()" />
              <span>Show future slots outside booking window (“opens later”)</span>
            </label>
            <label class="checkbox-row">
              <input type="checkbox" [(ngModel)]="bookingRules.holiday_booking_allowed" (ngModelChange)="onBookingChange()" />
              <span>Allow holiday booking</span>
            </label>
          </div>
        </section>

        <!-- Slot Capacity -->
        <section class="settings-section">
          <h2 class="section-title">Slot Capacity</h2>
          <label class="checkbox-row">
            <input
              type="checkbox"
              [(ngModel)]="autoSlotCapacityFromVehicles"
              (ngModelChange)="onSlotCapacityChange()"
            />
            <span>Auto calculate slot capacity from active vehicles</span>
          </label>
          <small class="checkbox-hint">
            When enabled, each slot's capacity equals the number of active vehicles (e.g. 3 vehicles → 3 bookings per slot).
          </small>
          <button
            type="button"
            class="admin-btn admin-btn-secondary recalc-btn"
            (click)="recalculateSlotCapacity()"
            [disabled]="recalculating">
            {{ recalculating ? 'Recalculating…' : 'Recalculate all future slot capacities' }}
          </button>
        </section>

        <!-- Footer Settings -->
        <section class="settings-section">
          <h2 class="section-title">Footer Settings</h2>
          <div class="form-row">
            <div class="form-group">
              <label>Copyright Text</label>
              <input 
                type="text" 
                [(ngModel)]="settings.footer_copyright" 
                (ngModelChange)="onChange()"
                placeholder="© 2025 Your Company. All rights reserved."
                class="admin-input">
            </div>
            <div class="form-group"></div>
          </div>
          <div class="form-row">
            <div class="form-group form-group-full">
              <label>About Text</label>
              <textarea 
                [(ngModel)]="settings.about_text" 
                (ngModelChange)="onChange()"
                rows="3" 
                placeholder="Brief description about your business"
                class="admin-textarea"></textarea>
            </div>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .settings-page { max-width: 1200px; padding-bottom: var(--space-10); }
    .section-hint { margin: -0.5rem 0 1rem; color: var(--admin-text-secondary); font-size: var(--text-body-sm); }
    .toggle-grid { display: grid; gap: 0.75rem; margin-top: 0.5rem; }
    .toggle-grid .checkbox-row { display: flex; align-items: flex-start; gap: 0.6rem; }
    .image-upload-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
    .upload-hint { font-size: var(--text-body-sm); color: var(--color-muted); }
    .banner-preview { display: block; margin-top: 0.75rem; width: 100%; max-width: 420px; aspect-ratio: 16 / 9; object-fit: cover; border-radius: 8px; border: 1px solid var(--color-border); }
  `]
})
export class AdminSettingsComponent implements OnInit {
  settings: SiteSettings = {
    site_name: '',
    site_logo: '',
    contact_email: '',
    contact_phone: '',
    contact_address: '',
    social_facebook: '',
    social_instagram: '',
    social_youtube: '',
    footer_copyright: '',
    about_text: ''
  };
  originalSettings: SiteSettings = { ...this.settings };
  bookingRules: BookingRulesSettings = this.defaultBookingRules();
  originalBookingRules: BookingRulesSettings = this.defaultBookingRules();
  autoSlotCapacityFromVehicles = true;
  originalAutoSlotCapacityFromVehicles = true;
  saving = false;
  saveSuccess = false;
  hasChanges = false;
  recalculating = false;
  uploadingBanner = false;
  uploadingLogo = false;
  heroForm: HeroContent = {
    title: '',
    subtitle: '',
    image: '',
    image_url: '',
    ctaPrimaryText: 'Book Your Training',
    ctaPrimaryLink: '/booking',
    ctaSecondaryText: 'Find Your Course',
    ctaSecondaryLink: '/courses'
  };
  faqsCoursesJson = '';
  faqsContactJson = '';

  constructor(
    private settingsService: SettingsService,
    private cms: CmsContentService,
    private toastService: ToastService,
    private apiService: ApiService
  ) {}

  get resolvedBookingWindowLabel(): string {
    const v = Number(this.bookingRules.booking_window_value) || 0;
    const u = this.bookingRules.booking_window_unit || 'days';
    const hours =
      u === 'weeks' ? v * 168 : u === 'days' ? v * 24 : v;
    return `${v} ${u} (${hours} hours)`;
  }

  private defaultBookingRules(): BookingRulesSettings {
    return {
      min_advance_hours: 5,
      booking_window_value: 7,
      booking_window_unit: 'days',
      booking_window_hours: 168,
      max_bookings_per_week: 2,
      booking_gap_hours: 48,
      allow_same_day_booking: true,
      show_fully_booked_slots: false,
      show_slots_outside_window: true,
      slot_visibility_mode: 'hide_unavailable',
      holiday_booking_allowed: false,
      cancellation_window_hours: 5
    };
  }

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    try {
      await this.settingsService.loadSettings();
      this.settings = { ...this.settingsService.getSettings() };
      this.originalSettings = { ...this.settings };
      this.hydrateCmsForms();

      try {
        const rules = await this.settingsService.getBookingRules();
        this.bookingRules = { ...this.defaultBookingRules(), ...rules };
        this.originalBookingRules = { ...this.bookingRules };
      } catch {
        this.bookingRules = this.defaultBookingRules();
        this.originalBookingRules = { ...this.bookingRules };
      }

      const adminSettings = await this.apiService.get<Record<string, { value: unknown }>>('/admin/settings');
      const raw = adminSettings?.auto_slot_capacity_from_vehicles?.value;
      this.autoSlotCapacityFromVehicles = raw === true || raw === 'true' || (typeof raw === 'string' && raw.includes('true')) || raw == null;
      this.originalAutoSlotCapacityFromVehicles = this.autoSlotCapacityFromVehicles;

      this.hasChanges = false;
      this.saveSuccess = false;
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to load settings'));
    }
  }

  onChange() {
    this.updateHasChanges();
  }

  onBookingChange() {
    this.updateHasChanges();
  }

  onSlotCapacityChange() {
    this.updateHasChanges();
  }

  private updateHasChanges() {
    this.syncJsonFields(false);
    this.syncHero(false);
    this.hasChanges =
      JSON.stringify(this.settings) !== JSON.stringify(this.originalSettings) ||
      JSON.stringify(this.bookingRules) !== JSON.stringify(this.originalBookingRules) ||
      this.autoSlotCapacityFromVehicles !== this.originalAutoSlotCapacityFromVehicles;
    this.saveSuccess = false;
  }

  syncHero(markDirty = true) {
    this.settings.homepage_hero = { ...this.heroForm };
    if (markDirty) this.updateHasChanges();
  }

  async onBannerImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingBanner = true;
    try {
      const result = await this.settingsService.uploadImage(file);
      this.heroForm.image = pickUploadedImageUrl(result);
      this.syncHero();
      this.toastService.success('Banner uploaded to Cloudinary');
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to upload banner image'));
    } finally {
      this.uploadingBanner = false;
      input.value = '';
    }
  }

  async onLogoImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.uploadingLogo = true;
    try {
      const result = await this.settingsService.uploadLogo(file);
      this.settings.site_logo = pickUploadedImageUrl(result);
      this.onChange();
      this.toastService.success('Logo uploaded to Cloudinary');
    } catch (e) {
      this.toastService.error(getApiErrorMessage(e, 'Failed to upload logo'));
    } finally {
      this.uploadingLogo = false;
      input.value = '';
    }
  }

  syncJsonFields(markDirty = true) {
    this.settings.faqs_courses = this.safeParse(this.faqsCoursesJson, this.settings.faqs_courses);
    this.settings.faqs_contact = this.safeParse(this.faqsContactJson, this.settings.faqs_contact);
    if (markDirty) this.updateHasChanges();
  }

  private hydrateCmsForms() {
    this.heroForm = this.cms.getHero(this.settings);
    this.faqsCoursesJson = JSON.stringify(this.cms.parseArray(this.settings.faqs_courses, []), null, 2);
    this.faqsContactJson = JSON.stringify(this.cms.parseArray(this.settings.faqs_contact, []), null, 2);
  }

  private safeParse(raw: string, fallback: unknown) {
    try {
      return JSON.parse(raw);
    } catch {
      return fallback;
    }
  }

  async saveSettings() {
    if (!this.hasChanges || this.saving) return;

    this.saving = true;
    this.saveSuccess = false;

    try {
      const sitePayload: Record<string, unknown> = { ...this.settings };
      const bookingKeys = [
        'booking_window_hours',
        'booking_window_value',
        'booking_window_unit',
        'min_advance_hours',
        'max_bookings_per_week',
        'booking_gap_hours',
        'allow_same_day_booking',
        'show_fully_booked_slots',
        'show_slots_outside_window',
        'slot_visibility_mode',
        'holiday_booking_allowed',
        'cancellation_window_hours'
      ];
      for (const k of bookingKeys) delete sitePayload[k];

      await this.settingsService.updateSettings(sitePayload as any);
      const bookingDirty =
        JSON.stringify(this.bookingRules) !== JSON.stringify(this.originalBookingRules);
      if (bookingDirty) {
        const saved = await this.settingsService.saveBookingRules(this.bookingRules);
        this.bookingRules = { ...this.defaultBookingRules(), ...saved };
        this.originalBookingRules = { ...this.bookingRules };
      }
      await this.settingsService.loadSettings();
      this.settings = { ...this.settingsService.getSettings() };
      this.hydrateCmsForms();
      await this.apiService.put('/admin/settings', {
        auto_slot_capacity_from_vehicles: {
          value: this.autoSlotCapacityFromVehicles,
          description: 'Auto calculate slot capacity from active vehicles'
        }
      });
      this.originalSettings = { ...this.settings };
      this.originalAutoSlotCapacityFromVehicles = this.autoSlotCapacityFromVehicles;
      this.hasChanges = false;
      this.saveSuccess = true;
      this.toastService.success('Settings saved successfully');

      // Reset success state after 2 seconds
      setTimeout(() => {
        this.saveSuccess = false;
      }, 2000);
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to save settings'));
    } finally {
      this.saving = false;
    }
  }

  async recalculateSlotCapacity() {
    if (this.recalculating) return;
    this.recalculating = true;
    try {
      const result = await this.apiService.post<{
        message?: string;
        updated?: number;
        capacity?: number;
        active_vehicles?: number;
      }>('/admin/slots/recalculate-capacity', {});
      const updated = result?.updated ?? 0;
      const capacity = result?.capacity ?? '?';
      this.toastService.success(
        result?.message || `Updated ${updated} slot(s) to capacity ${capacity}`
      );
    } catch (err) {
      this.toastService.error(getApiErrorMessage(err, 'Failed to recalculate slot capacities'));
    } finally {
      this.recalculating = false;
    }
  }
}
