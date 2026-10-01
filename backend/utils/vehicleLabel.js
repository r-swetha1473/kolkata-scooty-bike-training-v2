/**
 * Admin booking vehicle label.
 * Prefer bookings.vehicle_type, then the vehicles catalog (subtype, then type).
 */

function categoryFromBookingType(type) {
  const value = String(type || '').trim().toUpperCase();
  if (value === 'ELECTRIC') return 'EV Scooty';
  if (value === 'PETROL') return 'Petrol Scooty';
  if (value === 'BIKE') return 'Bike';
  return '';
}

function categoryFromVehicleFields(subtype, catalogType) {
  const blob = `${subtype || ''} ${catalogType || ''}`.trim().toLowerCase();
  if (!blob) return '';
  if (blob.includes('electric') || /(^|\s)ev(\s|$)/.test(blob)) return 'EV Scooty';
  if (blob.includes('petrol')) return 'Petrol Scooty';
  if (blob.includes('bike')) return 'Bike';
  return '';
}

function formatAdminVehicleLabel(row) {
  const name = String(row?.vehicle_name || '').trim();
  const hasVehicle = !!(row?.vehicle_id || name);
  if (!hasVehicle) return '—';

  const category =
    categoryFromBookingType(row?.vehicle_type) ||
    categoryFromVehicleFields(row?.vehicle_subtype, row?.vehicle_catalog_type);

  if (!category) return name || '—';
  if (!name) return category;
  return `${category} · ${name}`;
}

/** SQL expression. bookingAlias.vehicle_type wins over the vehicles row. */
function sqlAdminVehicleCategoryLabel(bookingAlias = 'b', vehicleAlias = 'v') {
  return `CASE
    WHEN ${bookingAlias}.vehicle_type IS NOT NULL THEN
      CASE ${bookingAlias}.vehicle_type::text
        WHEN 'ELECTRIC' THEN 'EV Scooty'
        WHEN 'PETROL' THEN 'Petrol Scooty'
        WHEN 'BIKE' THEN 'Bike'
        ELSE ''
      END
    WHEN COALESCE(${vehicleAlias}.vehicle_subtype, '') ILIKE '%Electric%'
      OR COALESCE(${vehicleAlias}.vehicle_type, '') ILIKE '%Electric%'
      OR COALESCE(${vehicleAlias}.vehicle_type, '') ~* '(^|[^a-z])ev([^a-z]|$)'
      THEN 'EV Scooty'
    WHEN COALESCE(${vehicleAlias}.vehicle_subtype, '') ILIKE '%Petrol%'
      OR COALESCE(${vehicleAlias}.vehicle_type, '') ILIKE '%Petrol%'
      THEN 'Petrol Scooty'
    WHEN COALESCE(${vehicleAlias}.vehicle_subtype, '') ILIKE '%Bike%'
      OR COALESCE(${vehicleAlias}.vehicle_type, '') ILIKE '%Bike%'
      OR COALESCE(${vehicleAlias}.type, '') ILIKE '%Bike%'
      THEN 'Bike'
    ELSE ''
  END`;
}

module.exports = {
  categoryFromBookingType,
  categoryFromVehicleFields,
  formatAdminVehicleLabel,
  sqlAdminVehicleCategoryLabel
};
