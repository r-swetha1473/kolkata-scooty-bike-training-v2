-- Idempotency for POST /api/bookings (Hold slot).
-- Claim key before create; same client key + user returns existing booking/payment.

CREATE TABLE IF NOT EXISTS public.booking_idempotency_keys (
  idempotency_key uuid NOT NULL,
  user_id uuid NOT NULL,
  booking_id uuid,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT booking_idempotency_keys_pkey PRIMARY KEY (idempotency_key),
  CONSTRAINT booking_idempotency_keys_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT booking_idempotency_keys_booking_id_fkey
    FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE
);

-- In case table already existed with NOT NULL booking_id from an earlier apply:
ALTER TABLE public.booking_idempotency_keys
  ALTER COLUMN booking_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_booking_idempotency_keys_user_created
  ON public.booking_idempotency_keys (user_id, created_at DESC);

COMMENT ON TABLE public.booking_idempotency_keys IS
  'Client idempotency keys for online booking create — prevents duplicate holds on retry';
