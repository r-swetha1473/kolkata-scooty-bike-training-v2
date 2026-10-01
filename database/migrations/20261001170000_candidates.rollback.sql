-- Removes the candidate system. Does not touch profiles, bookings, or course_enrollments.

DROP VIEW IF EXISTS public.candidate_bill_summary;
DROP TABLE IF EXISTS public.candidate_classes;
DROP TABLE IF EXISTS public.candidate_payments;
DROP TABLE IF EXISTS public.candidate_fee_plans;
DROP TABLE IF EXISTS public.candidates;
