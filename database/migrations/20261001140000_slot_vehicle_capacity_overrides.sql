-- Per-slot vehicle availability. Safe to re-run.
-- Does not update or delete booking rows.

ALTER TABLE public.slot_vehicle_capacity
  ADD COLUMN IF NOT EXISTS is_enabled boolean NOT NULL DEFAULT true;

ALTER TABLE public.slot_vehicle_capacity
  ADD COLUMN IF NOT EXISTS is_manual_override boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.slot_vehicle_capacity.is_enabled IS
  'When false, this vehicle has no seats on this slot only. Existing bookings are kept.';

COMMENT ON COLUMN public.slot_vehicle_capacity.is_manual_override IS
  'When true, capacity sync must not overwrite capacity or is_enabled and must not delete the row.';

CREATE OR REPLACE FUNCTION public.ensure_slot_vehicle_capacities(p_slot_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  SELECT branch_id INTO v_branch_id FROM slots WHERE id = p_slot_id;
  IF v_branch_id IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO slot_vehicle_capacity (slot_id, vehicle_id, capacity, is_enabled, is_manual_override)
  SELECT p_slot_id, v.id, v.max_per_slot, true, false
  FROM vehicles v
  WHERE v.is_active = true
    AND v.branch_id = v_branch_id
    AND NOT EXISTS (
      SELECT 1 FROM slot_vehicle_capacity svc
      WHERE svc.slot_id = p_slot_id AND svc.vehicle_id = v.id
    )
  ON CONFLICT (slot_id, vehicle_id) DO NOTHING;

  -- Non-manual rows follow the vehicle's current max_per_slot.
  UPDATE slot_vehicle_capacity svc
  SET capacity = v.max_per_slot,
      updated_at = NOW()
  FROM vehicles v
  WHERE svc.slot_id = p_slot_id
    AND svc.vehicle_id = v.id
    AND v.branch_id = v_branch_id
    AND v.is_active = true
    AND svc.is_manual_override = false;

  -- Keep manual rows and per-slot disables. Drop only automatic rows for
  -- retired vehicles or vehicles that belong to another branch.
  DELETE FROM slot_vehicle_capacity svc
  USING vehicles v
  WHERE svc.slot_id = p_slot_id
    AND svc.vehicle_id = v.id
    AND svc.is_manual_override = false
    AND COALESCE(svc.is_enabled, true) = true
    AND (v.is_active = false OR v.branch_id IS DISTINCT FROM v_branch_id);
END;
$$;

COMMENT ON FUNCTION public.ensure_slot_vehicle_capacities(p_slot_id uuid) IS
  'Adds missing active-vehicle rows for one slot. Does not overwrite or delete manual overrides or per-slot disables.';
