-- Rollback for 20261001150000_drop_trainer_slot_unique_and_legacy_capacity.sql
-- Recreating the unique index fails if any slot already has two active bookings
-- with the same trainer_id. Resolve those rows before running this file.

CREATE OR REPLACE FUNCTION public.check_vehicle_capacity(p_slot_id uuid, p_vehicle_type public.vehicle_type_enum) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_electric_capacity INTEGER;
  v_petrol_capacity INTEGER;
  v_bike_capacity INTEGER;
  v_electric_booked INTEGER;
  v_petrol_booked INTEGER;
  v_bike_booked INTEGER;
BEGIN
  SELECT electric_capacity, petrol_capacity, bike_capacity
  INTO v_electric_capacity, v_petrol_capacity, v_bike_capacity
  FROM slots
  WHERE id = p_slot_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  SELECT
    COUNT(*) FILTER (WHERE vehicle_type = 'ELECTRIC'),
    COUNT(*) FILTER (WHERE vehicle_type = 'PETROL'),
    COUNT(*) FILTER (WHERE vehicle_type = 'BIKE')
  INTO v_electric_booked, v_petrol_booked, v_bike_booked
  FROM bookings
  WHERE slot_id = p_slot_id
    AND status NOT IN ('cancelled');

  CASE p_vehicle_type
    WHEN 'ELECTRIC' THEN
      RETURN v_electric_booked < v_electric_capacity;
    WHEN 'PETROL' THEN
      RETURN v_petrol_booked < v_petrol_capacity;
    WHEN 'BIKE' THEN
      RETURN v_bike_booked < v_bike_capacity;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_booking_vehicle_capacity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_capacity_available BOOLEAN;
BEGIN
  SELECT check_vehicle_capacity(NEW.slot_id, NEW.vehicle_type)
  INTO v_capacity_available;

  IF NOT v_capacity_available THEN
    RAISE EXCEPTION 'Vehicle capacity exceeded for vehicle type % in slot %', NEW.vehicle_type, NEW.slot_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_validate_booking_vehicle_capacity ON public.bookings;

CREATE TRIGGER trigger_validate_booking_vehicle_capacity
  BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.validate_booking_vehicle_capacity();

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_slot_trainer_active
  ON public.bookings USING btree (slot_id, trainer_id)
  WHERE ((trainer_id IS NOT NULL) AND (status <> 'cancelled'::text));
