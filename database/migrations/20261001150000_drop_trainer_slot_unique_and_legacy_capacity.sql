-- Seat capacity is slot_vehicle_capacity only.
-- One trainer may be assigned to many bookings in the same slot.
-- Legacy electric/petrol/bike columns on slots are kept but no longer enforced.
-- Does not update or delete booking rows.

DROP INDEX IF EXISTS public.idx_bookings_slot_trainer_active;

DROP TRIGGER IF EXISTS trigger_validate_booking_vehicle_capacity ON public.bookings;

DROP FUNCTION IF EXISTS public.validate_booking_vehicle_capacity();

DROP FUNCTION IF EXISTS public.check_vehicle_capacity(uuid, public.vehicle_type_enum);
