-- Ensure online booking reference generator exists (required by Hold slot / POST /bookings).
CREATE SEQUENCE IF NOT EXISTS public.booking_reference_seq
  START WITH 1
  INCREMENT BY 1
  NO MINVALUE
  NO MAXVALUE
  CACHE 1;

CREATE OR REPLACE FUNCTION public.generate_booking_reference() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_val BIGINT;
  yr TEXT;
  candidate TEXT;
BEGIN
  yr := to_char((CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Kolkata')::date, 'YYYY');
  LOOP
    next_val := nextval('booking_reference_seq');
    candidate := 'KSBT-' || yr || '-' || LPAD(next_val::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM bookings WHERE booking_reference = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;

COMMENT ON FUNCTION public.generate_booking_reference() IS
  'Generates unique online booking references: KSBT-YYYY-NNNNNN';
