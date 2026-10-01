/** Admin booking label. bookings.vehicle_type wins over the vehicles catalog. */

export interface AdminVehicleLabelInput {
  vehicle_id?: string | null;
  vehicle_name?: string | null;
  vehicle_type?: string | null;
  vehicle_subtype?: string | null;
  vehicle_catalog_type?: string | null;
}

function categoryFromBookingType(type: string | null | undefined): string {
  const value = String(type || '').trim().toUpperCase();
  if (value === 'ELECTRIC') return 'EV Scooty';
  if (value === 'PETROL') return 'Petrol Scooty';
  if (value === 'BIKE') return 'Bike';
  return '';
}

function categoryFromVehicleFields(
  subtype: string | null | undefined,
  catalogType: string | null | undefined
): string {
  const blob = `${subtype || ''} ${catalogType || ''}`.trim().toLowerCase();
  if (!blob) return '';
  if (blob.includes('electric') || /(^|\s)ev(\s|$)/.test(blob)) return 'EV Scooty';
  if (blob.includes('petrol')) return 'Petrol Scooty';
  if (blob.includes('bike')) return 'Bike';
  return '';
}

export function formatAdminVehicleLabel(row: AdminVehicleLabelInput | null | undefined): string {
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
