-- Candidate management (separate from customer profiles and course_enrollments).
-- Idempotent. Does not alter existing tables. Due amount is not stored.

CREATE TABLE IF NOT EXISTS public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  mobile text NOT NULL,
  admission_date date NOT NULL DEFAULT (NOW() AT TIME ZONE 'Asia/Kolkata')::date,
  trainer_id uuid NULL REFERENCES public.trainers(id) ON DELETE SET NULL,
  branch_id uuid NULL REFERENCES public.branches(id) ON DELETE SET NULL,
  profile_id uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'ACTIVE',
  notes text NULL,
  created_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT candidates_name_not_blank CHECK (length(trim(name)) > 0),
  CONSTRAINT candidates_mobile_format CHECK (mobile ~ '^[6-9][0-9]{9}$'),
  CONSTRAINT candidates_status_check CHECK (status IN ('ACTIVE', 'COMPLETED', 'DROPPED'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidates_mobile ON public.candidates (mobile);
CREATE INDEX IF NOT EXISTS idx_candidates_trainer_id ON public.candidates (trainer_id);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON public.candidates (status);
CREATE INDEX IF NOT EXISTS idx_candidates_admission_date ON public.candidates (admission_date);

CREATE TABLE IF NOT EXISTS public.candidate_fee_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL UNIQUE REFERENCES public.candidates(id) ON DELETE CASCADE,
  total_fee numeric(12,2) NOT NULL,
  course_label text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT candidate_fee_plans_total_nonnegative CHECK (total_fee >= 0)
);

CREATE TABLE IF NOT EXISTS public.candidate_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL,
  paid_on date NOT NULL,
  method text NOT NULL,
  reference text NULL,
  note text NULL,
  recorded_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  idempotency_key text NULL,
  voided_at timestamptz NULL,
  voided_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  void_reason text NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT candidate_payments_amount_positive CHECK (amount > 0),
  CONSTRAINT candidate_payments_method_check CHECK (method IN ('CASH', 'UPI', 'CARD', 'BANK', 'OTHER'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_candidate_payments_idempotency
  ON public.candidate_payments (candidate_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_candidate_payments_candidate_id
  ON public.candidate_payments (candidate_id);

CREATE TABLE IF NOT EXISTS public.candidate_classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  class_date date NOT NULL,
  trainer_id uuid NULL REFERENCES public.trainers(id) ON DELETE SET NULL,
  vehicle_id uuid NULL REFERENCES public.vehicles(id) ON DELETE SET NULL,
  attendance text NOT NULL DEFAULT 'SCHEDULED',
  booking_id uuid NULL REFERENCES public.bookings(id) ON DELETE SET NULL,
  note text NULL,
  marked_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  CONSTRAINT candidate_classes_attendance_check CHECK (
    attendance IN ('SCHEDULED', 'ATTENDED', 'NO_SHOW', 'CANCELLED')
  )
);

CREATE INDEX IF NOT EXISTS idx_candidate_classes_candidate_date
  ON public.candidate_classes (candidate_id, class_date);

CREATE OR REPLACE VIEW public.candidate_bill_summary AS
SELECT
  c.id AS candidate_id,
  COALESCE(fp.total_fee, 0)::numeric(12,2) AS total_fee,
  COALESCE(pay.paid_total, 0)::numeric(12,2) AS paid_total,
  (COALESCE(fp.total_fee, 0) - COALESCE(pay.paid_total, 0))::numeric(12,2) AS due_total,
  COALESCE(cls.classes_completed, 0)::int AS classes_completed
FROM public.candidates c
LEFT JOIN public.candidate_fee_plans fp ON fp.candidate_id = c.id
LEFT JOIN LATERAL (
  SELECT COALESCE(SUM(p.amount), 0) AS paid_total
  FROM public.candidate_payments p
  WHERE p.candidate_id = c.id AND p.voided_at IS NULL
) pay ON true
LEFT JOIN LATERAL (
  SELECT COUNT(*)::int AS classes_completed
  FROM public.candidate_classes cl
  WHERE cl.candidate_id = c.id AND cl.attendance = 'ATTENDED'
) cls ON true;
