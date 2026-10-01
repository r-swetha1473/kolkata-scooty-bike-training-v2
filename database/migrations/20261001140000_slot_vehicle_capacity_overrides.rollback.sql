-- Rollback for 20261001140000_slot_vehicle_capacity_overrides.sql
-- Restores the previous ensure_slot_vehicle_capacities behaviour, then drops the new columns.
-- Does not update or delete booking rows.

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

  DELETE FROM slot_vehicle_capacity svc
  USING vehicles v
  WHERE svc.slot_id = p_slot_id
    AND svc.vehicle_id = v.id
    AND (v.is_active = false OR v.branch_id IS DISTINCT FROM v_branch_id);

  INSERT INTO slot_vehicle_capacity (slot_id, vehicle_id, capacity)
  SELECT p_slot_id, v.id, v.max_per_slot
  FROM vehicles v
  WHERE v.is_active = true
    AND v.branch_id = v_branch_id
    AND NOT EXISTS (
      SELECT 1 FROM slot_vehicle_capacity svc
      WHERE svc.slot_id = p_slot_id AND svc.vehicle_id = v.id
    )
  ON CONFLICT (slot_id, vehicle_id) DO NOTHING;

  UPDATE slot_vehicle_capacity svc
  SET capacity = v.max_per_slot,
      updated_at = NOW()
  FROM vehicles v
  WHERE svc.slot_id = p_slot_id
    AND svc.vehicle_id = v.id
    AND v.branch_id = v_branch_id
    AND v.is_active = true;
END;
$$;

COMMENT ON FUNCTION public.ensure_slot_vehicle_capacities(p_slot_id uuid) IS
  'Ensures a slot has capacity entries only for active vehicles on the same branch.';

ALTER TABLE public.slot_vehicle_capacity
  DROP COLUMN IF EXISTS is_manual_override;

ALTER TABLE public.slot_vehicle_capacity
  DROP COLUMN IF EXISTS is_enabled;
