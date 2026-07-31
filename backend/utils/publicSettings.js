/**
 * Site settings safe to expose via unauthenticated GET /api/settings.
 * Operational/admin keys must not be included here.
 */
const PUBLIC_SETTINGS_KEYS = [
  'site_name',
  'site_logo',
  'contact_email',
  'contact_phone',
  'contact_address',
  'contact_whatsapp',
  'contact_maps_url',
  'contact_working_hours',
  'social_facebook',
  'social_instagram',
  'social_youtube',
  'social_linkedin',
  'footer_copyright',
  'about_text',
  'homepage_hero',
  'homepage_trust_badges',
  'homepage_features',
  'homepage_how_it_works',
  'homepage_statistics',
  'homepage_testimonials',
  'faqs_courses',
  'faqs_contact',
  // Booking rules (customer booking page + admin preview)
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

function isPublicSettingsKey(key) {
  return PUBLIC_SETTINGS_KEYS.includes(String(key || '').trim());
}

function filterPublicSettings(rows) {
  const settings = {};
  for (const row of rows) {
    if (isPublicSettingsKey(row.key)) {
      settings[row.key] = row.value;
    }
  }
  return settings;
}

module.exports = {
  PUBLIC_SETTINGS_KEYS,
  isPublicSettingsKey,
  filterPublicSettings
};
