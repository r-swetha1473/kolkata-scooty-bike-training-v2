-- =============================================================================
-- Kolkata Scooty Bike Training — complete baseline schema
-- Generated: 2026-07-27
--
-- Fresh install:
--   1. CREATE DATABASE kolkata_bike_training;
--   2. psql -U postgres -d kolkata_bike_training -f database/schema.sql
--
-- This file replaces incremental supabase/migrations for greenfield setups.
-- =============================================================================

--
-- PostgreSQL database dump
--



-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trainers DROP CONSTRAINT IF EXISTS trainers_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trainers DROP CONSTRAINT IF EXISTS trainers_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.trainer_leave DROP CONSTRAINT IF EXISTS trainer_leave_trainer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.testimonials DROP CONSTRAINT IF EXISTS testimonials_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.sub_admin_permissions DROP CONSTRAINT IF EXISTS sub_admin_permissions_profile_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_recognition DROP CONSTRAINT IF EXISTS student_recognition_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.student_entitlements DROP CONSTRAINT IF EXISTS student_entitlements_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.slots DROP CONSTRAINT IF EXISTS slots_trainer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.slots DROP CONSTRAINT IF EXISTS slots_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.slot_vehicle_capacity DROP CONSTRAINT IF EXISTS slot_vehicle_capacity_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY public.slot_vehicle_capacity DROP CONSTRAINT IF EXISTS slot_vehicle_capacity_slot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.slot_templates DROP CONSTRAINT IF EXISTS slot_templates_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.schedule_exceptions DROP CONSTRAINT IF EXISTS schedule_exceptions_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY public.schedule_exceptions DROP CONSTRAINT IF EXISTS schedule_exceptions_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ratings DROP CONSTRAINT IF EXISTS ratings_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ratings DROP CONSTRAINT IF EXISTS ratings_trainer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.ratings DROP CONSTRAINT IF EXISTS ratings_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_reviewed_by_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_recorded_by_fkey;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_events DROP CONSTRAINT IF EXISTS payment_events_payment_id_fkey;
ALTER TABLE IF EXISTS ONLY public.payment_events DROP CONSTRAINT IF EXISTS payment_events_actor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.gallery_items DROP CONSTRAINT IF EXISTS gallery_items_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_trainer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_course_id_fkey;
ALTER TABLE IF EXISTS ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.branch_working_hours DROP CONSTRAINT IF EXISTS branch_working_hours_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.branch_holidays DROP CONSTRAINT IF EXISTS branch_holidays_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_vehicle_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_updated_by_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_trainer_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_slot_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_created_by_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_course_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_cancelled_by_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_branch_id_fkey;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_attendance_updated_by_fkey;
ALTER TABLE IF EXISTS ONLY public.booking_events DROP CONSTRAINT IF EXISTS booking_events_booking_id_fkey;
ALTER TABLE IF EXISTS ONLY public.booking_events DROP CONSTRAINT IF EXISTS booking_events_actor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_profile_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_created_by_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_notification_reads DROP CONSTRAINT IF EXISTS admin_notification_reads_notification_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_notification_reads DROP CONSTRAINT IF EXISTS admin_notification_reads_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_admin_id_fkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_actor_id_fkey;
ALTER TABLE IF EXISTS ONLY public.account_reactivation_requests DROP CONSTRAINT IF EXISTS account_reactivation_requests_user_id_fkey;
ALTER TABLE IF EXISTS ONLY public.account_reactivation_requests DROP CONSTRAINT IF EXISTS account_reactivation_requests_reviewed_by_fkey;
DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
DROP TRIGGER IF EXISTS update_trainers_updated_at ON public.trainers;
DROP TRIGGER IF EXISTS update_testimonials_updated_at ON public.testimonials;
DROP TRIGGER IF EXISTS update_slots_updated_at ON public.slots;
DROP TRIGGER IF EXISTS update_slot_vehicle_capacity_updated_at ON public.slot_vehicle_capacity;
DROP TRIGGER IF EXISTS update_settings_updated_at ON public.settings;
DROP TRIGGER IF EXISTS update_ratings_updated_at ON public.ratings;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
DROP TRIGGER IF EXISTS update_gallery_items_updated_at ON public.gallery_items;
DROP TRIGGER IF EXISTS update_coupons_updated_at ON public.coupons;
DROP TRIGGER IF EXISTS update_bookings_updated_at ON public.bookings;
DROP TRIGGER IF EXISTS update_blog_posts_updated_at ON public.blog_posts;
DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
DROP TRIGGER IF EXISTS trigger_validate_booking_vehicle_capacity ON public.bookings;
DROP TRIGGER IF EXISTS trigger_update_slot_visibility ON public.slots;
DROP TRIGGER IF EXISTS trigger_set_slot_date ON public.slots;
DROP TRIGGER IF EXISTS trigger_set_booking_vehicle_type ON public.bookings;
DROP TRIGGER IF EXISTS trigger_set_booking_cancellation_deadline ON public.bookings;
DROP INDEX IF EXISTS public.profiles_phone_key;
DROP INDEX IF EXISTS public.idx_vehicles_name;
DROP INDEX IF EXISTS public.idx_vehicles_is_active;
DROP INDEX IF EXISTS public.idx_vehicles_branch_name_unique;
DROP INDEX IF EXISTS public.idx_vehicles_branch;
DROP INDEX IF EXISTS public.idx_trainers_user_id;
DROP INDEX IF EXISTS public.idx_trainers_on_duty;
DROP INDEX IF EXISTS public.idx_trainers_is_active;
DROP INDEX IF EXISTS public.idx_trainers_branch;
DROP INDEX IF EXISTS public.idx_trainer_leave_trainer_date;
DROP INDEX IF EXISTS public.idx_testimonials_branch;
DROP INDEX IF EXISTS public.idx_testimonials_active_order;
DROP INDEX IF EXISTS public.idx_sub_admin_permissions_profile;
DROP INDEX IF EXISTS public.idx_student_recognition_user_status;
DROP INDEX IF EXISTS public.idx_student_recognition_user_id;
DROP INDEX IF EXISTS public.idx_student_recognition_status;
DROP INDEX IF EXISTS public.idx_student_entitlements_user_id;
DROP INDEX IF EXISTS public.idx_student_entitlements_expiry_date;
DROP INDEX IF EXISTS public.idx_slots_vehicle_capacity;
DROP INDEX IF EXISTS public.idx_slots_unique_unassigned;
DROP INDEX IF EXISTS public.idx_slots_unique_slot;
DROP INDEX IF EXISTS public.idx_slots_unique_assigned;
DROP INDEX IF EXISTS public.idx_slots_trainer_id;
DROP INDEX IF EXISTS public.idx_slots_status;
DROP INDEX IF EXISTS public.idx_slots_start_time;
DROP INDEX IF EXISTS public.idx_slots_slot_date;
DROP INDEX IF EXISTS public.idx_slots_is_visible;
DROP INDEX IF EXISTS public.idx_slots_end_time;
DROP INDEX IF EXISTS public.idx_slots_date_visible;
DROP INDEX IF EXISTS public.idx_slots_date_status;
DROP INDEX IF EXISTS public.idx_slots_branch_start_unique;
DROP INDEX IF EXISTS public.idx_slots_branch_start;
DROP INDEX IF EXISTS public.idx_slots_branch_date;
DROP INDEX IF EXISTS public.idx_slot_vehicle_capacity_vehicle_id;
DROP INDEX IF EXISTS public.idx_slot_vehicle_capacity_slot_vehicle;
DROP INDEX IF EXISTS public.idx_slot_vehicle_capacity_slot_id;
DROP INDEX IF EXISTS public.idx_schedule_exceptions_branch_date_time;
DROP INDEX IF EXISTS public.idx_schedule_exceptions_branch_date;
DROP INDEX IF EXISTS public.idx_reactivation_requests_status_requested;
DROP INDEX IF EXISTS public.idx_reactivation_one_pending_per_user;
DROP INDEX IF EXISTS public.idx_ratings_user_id;
DROP INDEX IF EXISTS public.idx_ratings_trainer_id;
DROP INDEX IF EXISTS public.idx_ratings_booking_id;
DROP INDEX IF EXISTS public.idx_profiles_weekly_reset;
DROP INDEX IF EXISTS public.idx_profiles_phone_unique;
DROP INDEX IF EXISTS public.idx_profiles_inactive_blocked_customers;
DROP INDEX IF EXISTS public.idx_profiles_auth_provider;
DROP INDEX IF EXISTS public.idx_payments_user_id;
DROP INDEX IF EXISTS public.idx_payments_user_created;
DROP INDEX IF EXISTS public.idx_payments_status_created;
DROP INDEX IF EXISTS public.idx_payments_status;
DROP INDEX IF EXISTS public.idx_payments_payment_method;
DROP INDEX IF EXISTS public.idx_payments_booking_id;
DROP INDEX IF EXISTS public.idx_payment_events_payment_id;
DROP INDEX IF EXISTS public.idx_gallery_items_branch;
DROP INDEX IF EXISTS public.idx_gallery_items_active_sort;
DROP INDEX IF EXISTS public.idx_courses_is_active;
DROP INDEX IF EXISTS public.idx_course_enrollments_user;
DROP INDEX IF EXISTS public.idx_course_enrollments_demo;
DROP INDEX IF EXISTS public.idx_course_enrollments_course;
DROP INDEX IF EXISTS public.idx_coupons_code;
DROP INDEX IF EXISTS public.idx_coupons_active;
DROP INDEX IF EXISTS public.idx_branches_slug;
DROP INDEX IF EXISTS public.idx_branches_is_active;
DROP INDEX IF EXISTS public.idx_branch_working_hours_branch;
DROP INDEX IF EXISTS public.idx_branch_holidays_branch_date;
DROP INDEX IF EXISTS public.idx_bookings_vehicle_type;
DROP INDEX IF EXISTS public.idx_bookings_vehicle_id;
DROP INDEX IF EXISTS public.idx_bookings_user_id;
DROP INDEX IF EXISTS public.idx_bookings_user_created;
DROP INDEX IF EXISTS public.idx_bookings_updated_by_admin_id;
DROP INDEX IF EXISTS public.idx_bookings_unique_user_slot_active;
DROP INDEX IF EXISTS public.idx_bookings_trainer_id;
DROP INDEX IF EXISTS public.idx_bookings_status;
DROP INDEX IF EXISTS public.idx_bookings_slot_vehicle_type;
DROP INDEX IF EXISTS public.idx_bookings_slot_vehicle_status;
DROP INDEX IF EXISTS public.idx_bookings_slot_vehicle;
DROP INDEX IF EXISTS public.idx_bookings_slot_trainer_active;
DROP INDEX IF EXISTS public.idx_bookings_slot_id;
DROP INDEX IF EXISTS public.idx_bookings_phone_created_week;
DROP INDEX IF EXISTS public.idx_bookings_phone;
DROP INDEX IF EXISTS public.idx_bookings_pending_payment_created;
DROP INDEX IF EXISTS public.idx_bookings_offline_reference_number;
DROP INDEX IF EXISTS public.idx_bookings_created_by_admin_id;
DROP INDEX IF EXISTS public.idx_bookings_course_id;
DROP INDEX IF EXISTS public.idx_bookings_cancellation_deadline;
DROP INDEX IF EXISTS public.idx_bookings_branch_status;
DROP INDEX IF EXISTS public.idx_bookings_booking_source;
DROP INDEX IF EXISTS public.idx_bookings_booking_reference;
DROP INDEX IF EXISTS public.idx_bookings_attendance_status;
DROP INDEX IF EXISTS public.idx_booking_events_booking_id;
DROP INDEX IF EXISTS public.idx_blog_posts_status_published;
DROP INDEX IF EXISTS public.idx_blog_posts_slug;
DROP INDEX IF EXISTS public.idx_audit_logs_user_id;
DROP INDEX IF EXISTS public.idx_audit_logs_entity;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_admins_role;
DROP INDEX IF EXISTS public.idx_admins_profile_id;
DROP INDEX IF EXISTS public.idx_admins_is_active;
DROP INDEX IF EXISTS public.idx_admins_created_by;
DROP INDEX IF EXISTS public.idx_admin_notifications_created;
DROP INDEX IF EXISTS public.idx_admin_notification_reads_admin;
DROP INDEX IF EXISTS public.idx_admin_audit_log_entity_type;
DROP INDEX IF EXISTS public.idx_admin_audit_log_entity;
DROP INDEX IF EXISTS public.idx_admin_audit_log_created_at;
DROP INDEX IF EXISTS public.idx_admin_audit_log_admin_id;
DROP INDEX IF EXISTS public.idx_admin_audit_log_action_type;
DROP INDEX IF EXISTS public.idx_admin_audit_log_action;
DROP INDEX IF EXISTS public.idx_activity_logs_created;
DROP INDEX IF EXISTS public.idx_activity_logs_actor;
DROP INDEX IF EXISTS public.idx_activity_logs_action;
ALTER TABLE IF EXISTS ONLY public.vehicles DROP CONSTRAINT IF EXISTS vehicles_pkey;
ALTER TABLE IF EXISTS ONLY public.trainers DROP CONSTRAINT IF EXISTS trainers_user_id_key;
ALTER TABLE IF EXISTS ONLY public.trainers DROP CONSTRAINT IF EXISTS trainers_pkey;
ALTER TABLE IF EXISTS ONLY public.trainer_leave DROP CONSTRAINT IF EXISTS trainer_leave_trainer_id_leave_date_key;
ALTER TABLE IF EXISTS ONLY public.trainer_leave DROP CONSTRAINT IF EXISTS trainer_leave_pkey;
ALTER TABLE IF EXISTS ONLY public.testimonials DROP CONSTRAINT IF EXISTS testimonials_pkey;
ALTER TABLE IF EXISTS ONLY public.sub_admin_permissions DROP CONSTRAINT IF EXISTS sub_admin_permissions_profile_id_module_key;
ALTER TABLE IF EXISTS ONLY public.sub_admin_permissions DROP CONSTRAINT IF EXISTS sub_admin_permissions_pkey;
ALTER TABLE IF EXISTS ONLY public.student_recognition DROP CONSTRAINT IF EXISTS student_recognition_pkey;
ALTER TABLE IF EXISTS ONLY public.student_entitlements DROP CONSTRAINT IF EXISTS student_entitlements_user_id_key;
ALTER TABLE IF EXISTS ONLY public.student_entitlements DROP CONSTRAINT IF EXISTS student_entitlements_pkey;
ALTER TABLE IF EXISTS ONLY public.slots DROP CONSTRAINT IF EXISTS slots_pkey;
ALTER TABLE IF EXISTS ONLY public.slot_vehicle_capacity DROP CONSTRAINT IF EXISTS slot_vehicle_capacity_slot_id_vehicle_id_key;
ALTER TABLE IF EXISTS ONLY public.slot_vehicle_capacity DROP CONSTRAINT IF EXISTS slot_vehicle_capacity_pkey;
ALTER TABLE IF EXISTS ONLY public.slot_templates DROP CONSTRAINT IF EXISTS slot_templates_pkey;
ALTER TABLE IF EXISTS ONLY public.slot_templates DROP CONSTRAINT IF EXISTS slot_templates_branch_id_key;
ALTER TABLE IF EXISTS ONLY public.settings DROP CONSTRAINT IF EXISTS settings_pkey;
ALTER TABLE IF EXISTS ONLY public.schedule_exceptions DROP CONSTRAINT IF EXISTS schedule_exceptions_pkey;
ALTER TABLE IF EXISTS ONLY public.ratings DROP CONSTRAINT IF EXISTS ratings_pkey;
ALTER TABLE IF EXISTS ONLY public.ratings DROP CONSTRAINT IF EXISTS ratings_booking_id_user_id_key;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_pkey;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_google_id_key;
ALTER TABLE IF EXISTS ONLY public.profiles DROP CONSTRAINT IF EXISTS profiles_email_key;
ALTER TABLE IF EXISTS ONLY public.payments DROP CONSTRAINT IF EXISTS payments_pkey;
ALTER TABLE IF EXISTS ONLY public.payment_events DROP CONSTRAINT IF EXISTS payment_events_pkey;
ALTER TABLE IF EXISTS ONLY public.gallery_items DROP CONSTRAINT IF EXISTS gallery_items_pkey;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_slug_key;
ALTER TABLE IF EXISTS ONLY public.courses DROP CONSTRAINT IF EXISTS courses_pkey;
ALTER TABLE IF EXISTS ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_user_id_course_id_branch_id_key;
ALTER TABLE IF EXISTS ONLY public.course_enrollments DROP CONSTRAINT IF EXISTS course_enrollments_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_pkey;
ALTER TABLE IF EXISTS ONLY public.coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
ALTER TABLE IF EXISTS ONLY public.branches DROP CONSTRAINT IF EXISTS branches_slug_key;
ALTER TABLE IF EXISTS ONLY public.branches DROP CONSTRAINT IF EXISTS branches_pkey;
ALTER TABLE IF EXISTS ONLY public.branch_working_hours DROP CONSTRAINT IF EXISTS branch_working_hours_pkey;
ALTER TABLE IF EXISTS ONLY public.branch_working_hours DROP CONSTRAINT IF EXISTS branch_working_hours_branch_id_day_of_week_key;
ALTER TABLE IF EXISTS ONLY public.branch_holidays DROP CONSTRAINT IF EXISTS branch_holidays_pkey;
ALTER TABLE IF EXISTS ONLY public.branch_holidays DROP CONSTRAINT IF EXISTS branch_holidays_branch_id_holiday_date_key;
ALTER TABLE IF EXISTS ONLY public.bookings DROP CONSTRAINT IF EXISTS bookings_pkey;
ALTER TABLE IF EXISTS ONLY public.booking_events DROP CONSTRAINT IF EXISTS booking_events_pkey;
ALTER TABLE IF EXISTS ONLY public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_slug_key;
ALTER TABLE IF EXISTS ONLY public.blog_posts DROP CONSTRAINT IF EXISTS blog_posts_pkey;
ALTER TABLE IF EXISTS ONLY public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_profile_id_key;
ALTER TABLE IF EXISTS ONLY public.admins DROP CONSTRAINT IF EXISTS admins_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_notifications DROP CONSTRAINT IF EXISTS admin_notifications_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_notification_reads DROP CONSTRAINT IF EXISTS admin_notification_reads_pkey;
ALTER TABLE IF EXISTS ONLY public.admin_audit_log DROP CONSTRAINT IF EXISTS admin_audit_log_pkey;
ALTER TABLE IF EXISTS ONLY public.activity_logs DROP CONSTRAINT IF EXISTS activity_logs_pkey;
ALTER TABLE IF EXISTS ONLY public.account_reactivation_requests DROP CONSTRAINT IF EXISTS account_reactivation_requests_pkey;
DROP TABLE IF EXISTS public.vehicles;
DROP TABLE IF EXISTS public.trainers;
DROP TABLE IF EXISTS public.trainer_leave;
DROP TABLE IF EXISTS public.testimonials;
DROP TABLE IF EXISTS public.sub_admin_permissions;
DROP TABLE IF EXISTS public.student_recognition;
DROP TABLE IF EXISTS public.student_entitlements;
DROP TABLE IF EXISTS public.slots;
DROP TABLE IF EXISTS public.slot_vehicle_capacity;
DROP TABLE IF EXISTS public.slot_templates;
DROP TABLE IF EXISTS public.settings;
DROP TABLE IF EXISTS public.schedule_exceptions;
DROP TABLE IF EXISTS public.ratings;
DROP TABLE IF EXISTS public.profiles;
DROP TABLE IF EXISTS public.payments;
DROP TABLE IF EXISTS public.payment_events;
DROP SEQUENCE IF EXISTS public.offline_booking_reference_seq;
DROP TABLE IF EXISTS public.gallery_items;
DROP TABLE IF EXISTS public.courses;
DROP TABLE IF EXISTS public.course_enrollments;
DROP TABLE IF EXISTS public.coupons;
DROP TABLE IF EXISTS public.branches;
DROP TABLE IF EXISTS public.branch_working_hours;
DROP TABLE IF EXISTS public.branch_holidays;
DROP TABLE IF EXISTS public.bookings;
DROP SEQUENCE IF EXISTS public.booking_reference_seq;
DROP TABLE IF EXISTS public.booking_events;
DROP TABLE IF EXISTS public.blog_posts;
DROP TABLE IF EXISTS public.audit_logs;
DROP TABLE IF EXISTS public.admins;
DROP TABLE IF EXISTS public.admin_notifications;
DROP TABLE IF EXISTS public.admin_notification_reads;
DROP TABLE IF EXISTS public.admin_audit_log;
DROP TABLE IF EXISTS public.activity_logs;
DROP TABLE IF EXISTS public.account_reactivation_requests;
DROP FUNCTION IF EXISTS public.validate_booking_vehicle_capacity();
DROP FUNCTION IF EXISTS public.update_updated_at_column();
DROP FUNCTION IF EXISTS public.update_slot_visibility();
DROP FUNCTION IF EXISTS public.update_slot_vehicle_capacity_updated_at();
DROP FUNCTION IF EXISTS public.update_all_slots_visibility();
DROP FUNCTION IF EXISTS public.set_slot_date();
DROP FUNCTION IF EXISTS public.set_booking_vehicle_type_from_vehicle();
DROP FUNCTION IF EXISTS public.set_booking_cancellation_deadline();
DROP FUNCTION IF EXISTS public.prune_inactive_slot_vehicle_capacities(p_slot_ids uuid[]);
DROP FUNCTION IF EXISTS public.is_slot_visible(slot_start_time timestamp with time zone);
DROP FUNCTION IF EXISTS public.increment_weekly_booking_count(user_id_param uuid);
DROP FUNCTION IF EXISTS public.get_vehicle_capacity_for_slot(p_slot_id uuid, p_vehicle_id uuid);
DROP FUNCTION IF EXISTS public.get_vehicle_booked_count(p_slot_id uuid, p_vehicle_id uuid);
DROP FUNCTION IF EXISTS public.get_slot_vehicle_capacity(p_slot_id uuid, p_vehicle_id uuid);
DROP FUNCTION IF EXISTS public.generate_slots_for_date(target_date date);
DROP FUNCTION IF EXISTS public.generate_offline_reference_number();
DROP FUNCTION IF EXISTS public.generate_booking_reference();
DROP FUNCTION IF EXISTS public.ensure_slot_vehicle_capacities(p_slot_id uuid);
DROP FUNCTION IF EXISTS public.ensure_daily_slots(target_date date);
DROP FUNCTION IF EXISTS public.check_weekly_booking_limit(user_id_param uuid);
DROP FUNCTION IF EXISTS public.check_vehicle_capacity(p_slot_id uuid, p_vehicle_type public.vehicle_type_enum);
DROP FUNCTION IF EXISTS public.can_cancel_booking(booking_id_param uuid);
DROP FUNCTION IF EXISTS public.can_admin_perform_action(p_admin_id uuid, p_required_role text);
DROP TYPE IF EXISTS public.vehicle_type_enum;
DROP TYPE IF EXISTS public.payment_status_enum;
DROP TYPE IF EXISTS public.booking_source_enum;
DROP TYPE IF EXISTS public.attendance_status_enum;
DROP EXTENSION IF EXISTS "uuid-ossp";
--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: attendance_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.attendance_status_enum AS ENUM (
    'SCHEDULED',
    'ATTENDED',
    'NO_SHOW',
    'CANCELLED'
);


--
-- Name: booking_source_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.booking_source_enum AS ENUM (
    'ONLINE',
    'OFFLINE'
);


--
-- Name: payment_status_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.payment_status_enum AS ENUM (
    'pending_upload',
    'pending_verification',
    'verified',
    'rejected',
    'partial'
);


--
-- Name: vehicle_type_enum; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.vehicle_type_enum AS ENUM (
    'ELECTRIC',
    'PETROL',
    'BIKE'
);


--
-- Name: can_admin_perform_action(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_admin_perform_action(p_admin_id uuid, p_required_role text) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_admin_role TEXT;
  v_is_active BOOLEAN;
BEGIN
  SELECT role, is_active INTO v_admin_role, v_is_active
  FROM admins
  WHERE id = p_admin_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  IF NOT v_is_active THEN
    RETURN FALSE;
  END IF;
  
  -- SUPER_ADMIN can do everything
  IF v_admin_role = 'SUPER_ADMIN' THEN
    RETURN TRUE;
  END IF;
  
  -- ADMIN can only perform ADMIN-level actions
  IF p_required_role = 'ADMIN' AND v_admin_role = 'ADMIN' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;


--
-- Name: FUNCTION can_admin_perform_action(p_admin_id uuid, p_required_role text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.can_admin_perform_action(p_admin_id uuid, p_required_role text) IS 'Checks if admin has permission to perform action based on role';


--
-- Name: can_cancel_booking(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_cancel_booking(booking_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  slot_start_time TIMESTAMPTZ;
  hours_until_slot NUMERIC;
BEGIN
  SELECT s.start_time INTO slot_start_time
  FROM bookings b
  JOIN slots s ON b.slot_id = s.id
  WHERE b.id = booking_id_param;
  
  IF slot_start_time IS NULL THEN
    RETURN false;
  END IF;
  
  hours_until_slot := EXTRACT(EPOCH FROM (slot_start_time - NOW())) / 3600;
  
  -- Can cancel if more than 5 hours before slot
  RETURN hours_until_slot > 5;
END;
$$;


--
-- Name: check_vehicle_capacity(uuid, public.vehicle_type_enum); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_vehicle_capacity(p_slot_id uuid, p_vehicle_type public.vehicle_type_enum) RETURNS boolean
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
  -- Get slot capacities
  SELECT electric_capacity, petrol_capacity, bike_capacity
  INTO v_electric_capacity, v_petrol_capacity, v_bike_capacity
  FROM slots
  WHERE id = p_slot_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Get current bookings by vehicle type
  SELECT 
    COUNT(*) FILTER (WHERE vehicle_type = 'ELECTRIC'),
    COUNT(*) FILTER (WHERE vehicle_type = 'PETROL'),
    COUNT(*) FILTER (WHERE vehicle_type = 'BIKE')
  INTO v_electric_booked, v_petrol_booked, v_bike_booked
  FROM bookings
  WHERE slot_id = p_slot_id
    AND status NOT IN ('cancelled');
  
  -- Check capacity for requested vehicle type
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


--
-- Name: FUNCTION check_vehicle_capacity(p_slot_id uuid, p_vehicle_type public.vehicle_type_enum); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.check_vehicle_capacity(p_slot_id uuid, p_vehicle_type public.vehicle_type_enum) IS 'Checks if capacity is available for a specific vehicle type in a slot';


--
-- Name: check_weekly_booking_limit(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.check_weekly_booking_limit(user_id_param uuid) RETURNS boolean
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_week_start DATE;
  weekly_count INTEGER;
  reset_date DATE;
BEGIN
  -- Get current week start (Monday)
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  -- Get user's weekly reset date
  SELECT weekly_reset_date INTO reset_date FROM profiles WHERE id = user_id_param;
  
  -- If reset_date is NULL or before current week start, reset the count
  IF reset_date IS NULL OR reset_date < current_week_start THEN
    UPDATE profiles 
    SET weekly_booking_count = 0, weekly_reset_date = current_week_start 
    WHERE id = user_id_param;
    weekly_count := 0;
  ELSE
    SELECT weekly_booking_count INTO weekly_count FROM profiles WHERE id = user_id_param;
  END IF;
  
  -- Check if user has reached the limit (max 2 per week)
  RETURN weekly_count < 2;
END;
$$;


--
-- Name: ensure_daily_slots(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_daily_slots(target_date date DEFAULT CURRENT_DATE) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  slot_count INTEGER;
  slot_start_time TIMESTAMPTZ;
  slot_end_time TIMESTAMPTZ;
  current_slot_time TIMESTAMPTZ;
  slot_exists BOOLEAN;
BEGIN
  slot_count := 0;
  current_slot_time := target_date + INTERVAL '9 hours'; -- Start at 9 AM
  slot_end_time := target_date + INTERVAL '21 hours'; -- End at 9 PM
  
  WHILE current_slot_time < slot_end_time LOOP
    slot_start_time := current_slot_time;
    current_slot_time := current_slot_time + INTERVAL '30 minutes';
    
    -- Check if slot already exists
    SELECT EXISTS (
      SELECT 1 FROM slots 
      WHERE slot_date = target_date 
        AND start_time = slot_start_time 
        AND trainer_id IS NULL
        AND is_auto_generated = true
    ) INTO slot_exists;
    
    IF NOT slot_exists THEN
      INSERT INTO slots (
        trainer_id, 
        start_time, 
        end_time, 
        slot_date,
        capacity, 
        booked_count, 
        status, 
        is_auto_generated
      ) VALUES (
        NULL, 
        slot_start_time, 
        current_slot_time, 
        target_date,
        1, 
        0, 
        'available', 
        true
      );
      
      slot_count := slot_count + 1;
    END IF;
  END LOOP;
  
  RETURN slot_count;
END;
$$;


--
-- Name: ensure_slot_vehicle_capacities(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ensure_slot_vehicle_capacities(p_slot_id uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_branch_id UUID;
BEGIN
  SELECT branch_id INTO v_branch_id FROM slots WHERE id = p_slot_id;
  IF v_branch_id IS NULL THEN
    RETURN;
  END IF;

  -- Remove vehicles that do not belong to this slot's branch (or are inactive)
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

  -- Keep capacities in sync with current max_per_slot
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


--
-- Name: FUNCTION ensure_slot_vehicle_capacities(p_slot_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ensure_slot_vehicle_capacities(p_slot_id uuid) IS 'Ensures a slot has capacity entries only for active vehicles on the same branch.';


--
-- Name: generate_booking_reference(); Type: FUNCTION; Schema: public; Owner: -
--

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


--
-- Name: generate_offline_reference_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_offline_reference_number() RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
  next_val BIGINT;
  candidate TEXT;
BEGIN
  LOOP
    next_val := nextval('offline_booking_reference_seq');
    candidate := 'OFF-' || LPAD(next_val::TEXT, 6, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM bookings WHERE offline_reference_number = candidate
    );
  END LOOP;
  RETURN candidate;
END;
$$;


--
-- Name: generate_slots_for_date(date); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_slots_for_date(target_date date) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  slot_count INTEGER := 0;
  slot_start_time TIMESTAMPTZ;
  slot_end_time TIMESTAMPTZ;
  current_slot_time TIMESTAMPTZ;
  day_of_week INTEGER;
  slot_exists BOOLEAN;
BEGIN
  day_of_week := EXTRACT(DOW FROM target_date); -- 0=Sunday, 1=Monday, ..., 6=Saturday
  
  -- Monday-Saturday: 7 AM - 9 PM (last slot 8:30-9:00 PM)
  IF day_of_week >= 1 AND day_of_week <= 6 THEN
    current_slot_time := target_date + INTERVAL '7 hours'; -- Start at 7 AM
    slot_end_time := target_date + INTERVAL '21 hours'; -- End at 9 PM (8:30 PM is last slot start)
    
    WHILE current_slot_time < slot_end_time LOOP
      slot_start_time := current_slot_time;
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      
      -- Check if slot already exists
      SELECT EXISTS (
        SELECT 1 FROM slots 
        WHERE slot_date = target_date 
          AND start_time = slot_start_time 
          AND trainer_id IS NULL
          AND is_auto_generated = true
      ) INTO slot_exists;
      
      IF NOT slot_exists THEN
        INSERT INTO slots (
          trainer_id, start_time, end_time, slot_date,
          capacity, booked_count, status, is_auto_generated, is_visible,
          electric_capacity, petrol_capacity, bike_capacity
        ) VALUES (
          NULL, slot_start_time, current_slot_time, target_date,
          5, 0, 'available', true, 
          is_slot_visible(slot_start_time),
          3, 1, 1
        );
        slot_count := slot_count + 1;
      END IF;
    END LOOP;
  
  -- Sunday: Exact times only (10:30 AM-12:30 PM and 3:00 PM-8:00 PM)
  ELSIF day_of_week = 0 THEN
    -- Morning slots: 10:30, 11:00, 11:30, 12:00, 12:30
    -- Generate 10:30 AM slot
    slot_start_time := target_date + INTERVAL '10 hours 30 minutes';
    SELECT EXISTS (
      SELECT 1 FROM slots 
      WHERE slot_date = target_date 
        AND start_time = slot_start_time 
        AND trainer_id IS NULL
        AND is_auto_generated = true
    ) INTO slot_exists;
    IF NOT slot_exists THEN
      INSERT INTO slots (
        trainer_id, start_time, end_time, slot_date,
        capacity, booked_count, status, is_auto_generated, is_visible,
        electric_capacity, petrol_capacity, bike_capacity
      ) VALUES (
        NULL, slot_start_time, slot_start_time + INTERVAL '30 minutes', target_date,
        5, 0, 'available', true, is_slot_visible(slot_start_time),
        3, 1, 1
      );
      slot_count := slot_count + 1;
    END IF;
    
    -- Generate 11:00 AM slot
    slot_start_time := target_date + INTERVAL '11 hours';
    SELECT EXISTS (
      SELECT 1 FROM slots 
      WHERE slot_date = target_date 
        AND start_time = slot_start_time 
        AND trainer_id IS NULL
        AND is_auto_generated = true
    ) INTO slot_exists;
    IF NOT slot_exists THEN
      INSERT INTO slots (
        trainer_id, start_time, end_time, slot_date,
        capacity, booked_count, status, is_auto_generated, is_visible,
        electric_capacity, petrol_capacity, bike_capacity
      ) VALUES (
        NULL, slot_start_time, slot_start_time + INTERVAL '30 minutes', target_date,
        5, 0, 'available', true, is_slot_visible(slot_start_time),
        3, 1, 1
      );
      slot_count := slot_count + 1;
    END IF;
    
    -- Generate 11:30 AM slot
    slot_start_time := target_date + INTERVAL '11 hours 30 minutes';
    SELECT EXISTS (
      SELECT 1 FROM slots 
      WHERE slot_date = target_date 
        AND start_time = slot_start_time 
        AND trainer_id IS NULL
        AND is_auto_generated = true
    ) INTO slot_exists;
    IF NOT slot_exists THEN
      INSERT INTO slots (
        trainer_id, start_time, end_time, slot_date,
        capacity, booked_count, status, is_auto_generated, is_visible,
        electric_capacity, petrol_capacity, bike_capacity
      ) VALUES (
        NULL, slot_start_time, slot_start_time + INTERVAL '30 minutes', target_date,
        5, 0, 'available', true, is_slot_visible(slot_start_time),
        3, 1, 1
      );
      slot_count := slot_count + 1;
    END IF;
    
    -- Generate 12:00 PM slot
    slot_start_time := target_date + INTERVAL '12 hours';
    SELECT EXISTS (
      SELECT 1 FROM slots 
      WHERE slot_date = target_date 
        AND start_time = slot_start_time 
        AND trainer_id IS NULL
        AND is_auto_generated = true
    ) INTO slot_exists;
    IF NOT slot_exists THEN
      INSERT INTO slots (
        trainer_id, start_time, end_time, slot_date,
        capacity, booked_count, status, is_auto_generated, is_visible,
        electric_capacity, petrol_capacity, bike_capacity
      ) VALUES (
        NULL, slot_start_time, slot_start_time + INTERVAL '30 minutes', target_date,
        5, 0, 'available', true, is_slot_visible(slot_start_time),
        3, 1, 1
      );
      slot_count := slot_count + 1;
    END IF;
    
    -- Generate 12:30 PM slot
    slot_start_time := target_date + INTERVAL '12 hours 30 minutes';
    SELECT EXISTS (
      SELECT 1 FROM slots 
      WHERE slot_date = target_date 
        AND start_time = slot_start_time 
        AND trainer_id IS NULL
        AND is_auto_generated = true
    ) INTO slot_exists;
    IF NOT slot_exists THEN
      INSERT INTO slots (
        trainer_id, start_time, end_time, slot_date,
        capacity, booked_count, status, is_auto_generated, is_visible,
        electric_capacity, petrol_capacity, bike_capacity
      ) VALUES (
        NULL, slot_start_time, slot_start_time + INTERVAL '30 minutes', target_date,
        5, 0, 'available', true, is_slot_visible(slot_start_time),
        3, 1, 1
      );
      slot_count := slot_count + 1;
    END IF;
    
    -- Evening slots: 3:00 PM to 8:00 PM (every 30 minutes)
    current_slot_time := target_date + INTERVAL '15 hours'; -- 3:00 PM
    slot_end_time := target_date + INTERVAL '20 hours'; -- 8:00 PM
    
    WHILE current_slot_time <= slot_end_time LOOP
      slot_start_time := current_slot_time;
      current_slot_time := current_slot_time + INTERVAL '30 minutes';
      
      SELECT EXISTS (
        SELECT 1 FROM slots 
        WHERE slot_date = target_date 
          AND start_time = slot_start_time 
          AND trainer_id IS NULL
          AND is_auto_generated = true
      ) INTO slot_exists;
      
      IF NOT slot_exists THEN
        INSERT INTO slots (
          trainer_id, start_time, end_time, slot_date,
          capacity, booked_count, status, is_auto_generated, is_visible,
          electric_capacity, petrol_capacity, bike_capacity
        ) VALUES (
          NULL, slot_start_time, current_slot_time, target_date,
          5, 0, 'available', true,
          is_slot_visible(slot_start_time),
          3, 1, 1
        );
        slot_count := slot_count + 1;
      END IF;
    END LOOP;
  END IF;
  
  RETURN slot_count;
END;
$$;


--
-- Name: get_slot_vehicle_capacity(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_slot_vehicle_capacity(p_slot_id uuid, p_vehicle_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_capacity INTEGER;
BEGIN
  SELECT capacity INTO v_capacity
  FROM slot_vehicle_capacity
  WHERE slot_id = p_slot_id AND vehicle_id = p_vehicle_id;
  
  RETURN COALESCE(v_capacity, 0);
END;
$$;


--
-- Name: get_vehicle_booked_count(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_vehicle_booked_count(p_slot_id uuid, p_vehicle_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM bookings
  WHERE slot_id = p_slot_id
    AND vehicle_id = p_vehicle_id
    AND status NOT IN ('cancelled');
  
  RETURN COALESCE(v_count, 0);
END;
$$;


--
-- Name: get_vehicle_capacity_for_slot(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_vehicle_capacity_for_slot(p_slot_id uuid, p_vehicle_id uuid) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_max_per_slot INTEGER;
BEGIN
  SELECT max_per_slot INTO v_max_per_slot
  FROM vehicles
  WHERE id = p_vehicle_id AND is_active = true;
  
  RETURN COALESCE(v_max_per_slot, 0);
END;
$$;


--
-- Name: increment_weekly_booking_count(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.increment_weekly_booking_count(user_id_param uuid) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
  current_week_start DATE;
  reset_date DATE;
BEGIN
  current_week_start := DATE_TRUNC('week', CURRENT_DATE)::DATE;
  
  SELECT weekly_reset_date INTO reset_date FROM profiles WHERE id = user_id_param;
  
  -- Reset if needed
  IF reset_date IS NULL OR reset_date < current_week_start THEN
    UPDATE profiles 
    SET weekly_booking_count = 1, 
        weekly_reset_date = current_week_start,
        total_bookings = total_bookings + 1,
        last_booking_date = CURRENT_DATE
    WHERE id = user_id_param;
  ELSE
    UPDATE profiles 
    SET weekly_booking_count = weekly_booking_count + 1,
        total_bookings = total_bookings + 1,
        last_booking_date = CURRENT_DATE
    WHERE id = user_id_param;
  END IF;
END;
$$;


--
-- Name: is_slot_visible(timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_slot_visible(slot_start_time timestamp with time zone) RETURNS boolean
    LANGUAGE plpgsql STABLE
    AS $$
DECLARE
  window_hours INT := 168;
  raw TEXT;
BEGIN
  BEGIN
    SELECT value #>> '{}' INTO raw
    FROM settings
    WHERE key = 'booking_window_hours'
    LIMIT 1;
    IF raw IS NOT NULL AND TRIM(raw) <> '' THEN
      window_hours := TRIM(raw)::INT;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    window_hours := 168;
  END;

  IF window_hours IS NULL OR window_hours < 1 THEN
    window_hours := 168;
  END IF;

  RETURN slot_start_time > NOW()
    AND slot_start_time <= (NOW() + make_interval(hours => window_hours));
END;
$$;


--
-- Name: prune_inactive_slot_vehicle_capacities(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.prune_inactive_slot_vehicle_capacities(p_slot_ids uuid[] DEFAULT NULL::uuid[]) RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_deleted INTEGER;
BEGIN
  DELETE FROM slot_vehicle_capacity svc
  USING vehicles v, slots s
  WHERE svc.vehicle_id = v.id
    AND svc.slot_id = s.id
    AND v.is_active = false
    AND COALESCE(s.slot_date, (s.start_time AT TIME ZONE 'Asia/Kolkata')::date)
        >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date
    AND (p_slot_ids IS NULL OR svc.slot_id = ANY(p_slot_ids));

  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;


--
-- Name: FUNCTION prune_inactive_slot_vehicle_capacities(p_slot_ids uuid[]); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.prune_inactive_slot_vehicle_capacities(p_slot_ids uuid[]) IS 'Deletes slot_vehicle_capacity rows for inactive vehicles on today+ slots';


--
-- Name: set_booking_cancellation_deadline(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_booking_cancellation_deadline() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  slot_start_time TIMESTAMPTZ;
BEGIN
  SELECT start_time INTO slot_start_time FROM slots WHERE id = NEW.slot_id;
  IF slot_start_time IS NOT NULL THEN
    NEW.cancellation_deadline := slot_start_time - INTERVAL '5 hours';
    NEW.can_cancel := (slot_start_time - INTERVAL '5 hours') > NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: set_booking_vehicle_type_from_vehicle(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_booking_vehicle_type_from_vehicle() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF NEW.vehicle_type IS NOT NULL OR NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_name FROM vehicles WHERE id = NEW.vehicle_id;
  IF v_name IS NULL THEN
    NEW.vehicle_type := 'ELECTRIC'::vehicle_type_enum;
    RETURN NEW;
  END IF;

  IF v_name ILIKE '%petrol%' THEN
    NEW.vehicle_type := 'PETROL'::vehicle_type_enum;
  ELSIF v_name ILIKE '%bike%' THEN
    NEW.vehicle_type := 'BIKE'::vehicle_type_enum;
  ELSE
    NEW.vehicle_type := 'ELECTRIC'::vehicle_type_enum;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: set_slot_date(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_slot_date() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.slot_date = NEW.start_time::date;
  RETURN NEW;
END;
$$;


--
-- Name: update_all_slots_visibility(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_all_slots_visibility() RETURNS integer
    LANGUAGE plpgsql
    AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE slots
  SET is_visible = is_slot_visible(start_time)
  WHERE is_visible != is_slot_visible(start_time);
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;


--
-- Name: update_slot_vehicle_capacity_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slot_vehicle_capacity_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_slot_visibility(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_slot_visibility() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.is_visible := is_slot_visible(NEW.start_time);
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: validate_booking_vehicle_capacity(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_booking_vehicle_capacity() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  v_capacity_available BOOLEAN;
BEGIN
  -- Check if capacity is available for this vehicle type
  SELECT check_vehicle_capacity(NEW.slot_id, NEW.vehicle_type)
  INTO v_capacity_available;
  
  IF NOT v_capacity_available THEN
    RAISE EXCEPTION 'Vehicle capacity exceeded for vehicle type % in slot %', NEW.vehicle_type, NEW.slot_id;
  END IF;
  
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION validate_booking_vehicle_capacity(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.validate_booking_vehicle_capacity() IS 'Trigger function to validate vehicle capacity before booking insert';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account_reactivation_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_reactivation_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    admin_notes text,
    user_message text,
    CONSTRAINT account_reactivation_requests_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);


--
-- Name: TABLE account_reactivation_requests; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.account_reactivation_requests IS 'Customer reactivation requests when inactive_blocked is true';


--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actor_id uuid,
    actor_role text,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    meta jsonb DEFAULT '{}'::jsonb NOT NULL,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_audit_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_audit_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    admin_id uuid,
    action_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    before_value jsonb,
    after_value jsonb,
    details jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    ip_address text,
    user_agent text
);


--
-- Name: TABLE admin_audit_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admin_audit_log IS 'Audit log for admin actions and overrides';


--
-- Name: COLUMN admin_audit_log.action_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_audit_log.action_type IS 'Type of action: UPDATE_VEHICLE_CAPACITY, OVERRIDE_BOOKING, etc.';


--
-- Name: COLUMN admin_audit_log.entity_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_audit_log.entity_type IS 'Type of entity affected: slot, booking, trainer, etc.';


--
-- Name: COLUMN admin_audit_log.before_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_audit_log.before_value IS 'JSON representation of state before change';


--
-- Name: COLUMN admin_audit_log.after_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_audit_log.after_value IS 'JSON representation of state after change';


--
-- Name: COLUMN admin_audit_log.details; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admin_audit_log.details IS 'Additional details about the action';


--
-- Name: admin_notification_reads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notification_reads (
    notification_id uuid NOT NULL,
    admin_id uuid NOT NULL,
    read_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admin_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admin_notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    body text,
    entity_type text,
    entity_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: admins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.admins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid NOT NULL,
    role text DEFAULT 'ADMIN'::text NOT NULL,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    last_login_at timestamp with time zone,
    failed_login_attempts integer DEFAULT 0 NOT NULL,
    locked_until timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT admins_role_check CHECK ((role = ANY (ARRAY['ADMIN'::text, 'SUPER_ADMIN'::text])))
);


--
-- Name: TABLE admins; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.admins IS 'Admin and Super Admin accounts with role-based access control';


--
-- Name: COLUMN admins.profile_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.profile_id IS 'Reference to profiles table for user information';


--
-- Name: COLUMN admins.role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.role IS 'Admin role: ADMIN or SUPER_ADMIN';


--
-- Name: COLUMN admins.password_hash; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.password_hash IS 'Bcrypt hashed password';


--
-- Name: COLUMN admins.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.is_active IS 'Whether admin account is active';


--
-- Name: COLUMN admins.last_login_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.last_login_at IS 'Timestamp of last successful login';


--
-- Name: COLUMN admins.failed_login_attempts; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.failed_login_attempts IS 'Number of consecutive failed login attempts';


--
-- Name: COLUMN admins.locked_until; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.locked_until IS 'Account lock expiry timestamp (null if not locked)';


--
-- Name: COLUMN admins.created_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.admins.created_by IS 'Admin who created this admin account (SUPER_ADMIN only)';


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    action text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid,
    old_data jsonb,
    new_data jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: blog_posts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.blog_posts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    excerpt text,
    content text,
    featured_image_url text,
    category text,
    author_name text,
    status text DEFAULT 'draft'::text NOT NULL,
    published_at timestamp with time zone,
    meta_title text,
    meta_description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    meta_keywords text,
    reading_time_minutes integer,
    CONSTRAINT blog_posts_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text])))
);


--
-- Name: booking_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.booking_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    description text,
    actor_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE booking_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.booking_events IS 'Chronological booking activity for admin timeline views';


--
-- Name: booking_reference_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.booking_reference_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bookings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid,
    slot_id uuid NOT NULL,
    trainer_id uuid,
    status text DEFAULT 'pending'::text NOT NULL,
    notes text,
    cancelled_at timestamp with time zone,
    cancelled_by uuid,
    cancellation_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_type public.vehicle_type_enum NOT NULL,
    phone text,
    booking_source public.booking_source_enum DEFAULT 'ONLINE'::public.booking_source_enum NOT NULL,
    created_by_admin_id uuid,
    offline_customer_name text,
    offline_customer_age integer,
    offline_customer_gender text,
    offline_reference_number text,
    attendance_status public.attendance_status_enum DEFAULT 'SCHEDULED'::public.attendance_status_enum NOT NULL,
    attendance_updated_by uuid,
    attendance_updated_at timestamp with time zone,
    updated_by_admin_id uuid,
    vehicle_id uuid,
    can_cancel boolean DEFAULT true NOT NULL,
    cancellation_deadline timestamp with time zone,
    branch_id uuid NOT NULL,
    course_id uuid,
    booking_reference text NOT NULL,
    CONSTRAINT bookings_phone_format_check CHECK (((phone IS NULL) OR ((length(phone) = 10) AND (phone ~ '^[0-9]+$'::text)))),
    CONSTRAINT bookings_source_identity_check CHECK ((((booking_source = 'ONLINE'::public.booking_source_enum) AND (user_id IS NOT NULL)) OR ((booking_source = 'OFFLINE'::public.booking_source_enum) AND (offline_customer_name IS NOT NULL) AND (TRIM(BOTH FROM offline_customer_name) <> ''::text)))),
    CONSTRAINT bookings_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'pending_payment'::text, 'confirmed'::text, 'completed'::text, 'cancelled'::text, 'no_show'::text])))
);


--
-- Name: COLUMN bookings.trainer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.trainer_id IS 'Optional trainer assignment; NULL for customer self-service bookings until admin assigns';


--
-- Name: COLUMN bookings.vehicle_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.vehicle_type IS 'Vehicle type for this booking: ELECTRIC, PETROL, or BIKE';


--
-- Name: COLUMN bookings.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.phone IS 'Phone number of the user who made the booking (for phone-based validation)';


--
-- Name: COLUMN bookings.booking_source; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.booking_source IS 'ONLINE = customer self-booking; OFFLINE = admin walk-in booking';


--
-- Name: COLUMN bookings.created_by_admin_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.created_by_admin_id IS 'Admin/subadmin who created an offline booking';


--
-- Name: COLUMN bookings.offline_customer_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.offline_customer_name IS 'Walk-in customer name for offline bookings';


--
-- Name: COLUMN bookings.offline_reference_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.offline_reference_number IS 'Human-readable ref for offline bookings, e.g. OFF-000001';


--
-- Name: COLUMN bookings.attendance_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.attendance_status IS 'Attendance: SCHEDULED, ATTENDED, NO_SHOW, CANCELLED';


--
-- Name: COLUMN bookings.vehicle_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.vehicle_id IS 'Vehicle selected for this booking';


--
-- Name: COLUMN bookings.can_cancel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.can_cancel IS 'Whether booking can be cancelled (5-hour rule)';


--
-- Name: COLUMN bookings.cancellation_deadline; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bookings.cancellation_deadline IS 'Deadline for cancellation (5 hours before slot)';


--
-- Name: branch_holidays; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_holidays (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    holiday_date date NOT NULL,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE branch_holidays; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.branch_holidays IS 'Branch closure dates';


--
-- Name: branch_working_hours; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branch_working_hours (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    day_of_week integer NOT NULL,
    opens_at time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    closes_at time without time zone DEFAULT '21:00:00'::time without time zone NOT NULL,
    is_closed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT branch_working_hours_day_of_week_check CHECK (((day_of_week >= 0) AND (day_of_week <= 6)))
);


--
-- Name: TABLE branch_working_hours; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.branch_working_hours IS 'Per-branch daily open/close windows for dynamic scheduling';


--
-- Name: branches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.branches (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    address text DEFAULT ''::text NOT NULL,
    contact_phone text,
    contact_email text,
    maps_url text,
    working_days integer[] DEFAULT ARRAY[1, 2, 3, 4, 5, 6, 0] NOT NULL,
    opening_time time without time zone DEFAULT '07:00:00'::time without time zone NOT NULL,
    closing_time time without time zone DEFAULT '21:00:00'::time without time zone NOT NULL,
    slot_duration_minutes integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    default_slot_capacity integer DEFAULT 1 NOT NULL,
    CONSTRAINT branches_default_slot_capacity_check CHECK (((default_slot_capacity >= 1) AND (default_slot_capacity <= 100))),
    CONSTRAINT branches_slot_duration_minutes_check CHECK (((slot_duration_minutes > 0) AND (slot_duration_minutes <= 120)))
);


--
-- Name: TABLE branches; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.branches IS 'Training centre branches; slots/bookings/trainers/vehicles are branch-scoped';


--
-- Name: COLUMN branches.working_days; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branches.working_days IS 'JS-style day numbers: 0=Sun .. 6=Sat';


--
-- Name: COLUMN branches.image_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branches.image_url IS 'Optional branch photo URL (/api/branches/media/... or absolute URL).';


--
-- Name: COLUMN branches.default_slot_capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.branches.default_slot_capacity IS 'Fallback slot capacity for this branch when auto vehicle-sum is 0 or auto mode is disabled for branch override.';


--
-- Name: coupons; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coupons (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    code text NOT NULL,
    description text,
    discount_type text NOT NULL,
    discount_value numeric NOT NULL,
    start_at timestamp with time zone,
    end_at timestamp with time zone,
    min_amount numeric DEFAULT 0 NOT NULL,
    max_discount numeric,
    usage_limit integer,
    used_count integer DEFAULT 0 NOT NULL,
    branch_id uuid,
    vehicle_id uuid,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT coupons_discount_type_check CHECK ((discount_type = ANY (ARRAY['percent'::text, 'flat'::text])))
);


--
-- Name: course_enrollments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.course_enrollments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    course_id uuid NOT NULL,
    branch_id uuid,
    trainer_id uuid,
    classes_purchased integer DEFAULT 15 NOT NULL,
    classes_completed integer DEFAULT 0 NOT NULL,
    payment_status text DEFAULT 'pending'::text NOT NULL,
    certificate_status text DEFAULT 'pending'::text NOT NULL,
    course_status text DEFAULT 'in_progress'::text NOT NULL,
    last_class_at timestamp with time zone,
    next_class_at timestamp with time zone,
    enrolled_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_demo boolean DEFAULT false NOT NULL,
    CONSTRAINT course_enrollments_certificate_status_check CHECK ((certificate_status = ANY (ARRAY['pending'::text, 'issued'::text, 'not_applicable'::text]))),
    CONSTRAINT course_enrollments_classes_completed_check CHECK ((classes_completed >= 0)),
    CONSTRAINT course_enrollments_classes_purchased_check CHECK ((classes_purchased >= 0)),
    CONSTRAINT course_enrollments_course_status_check CHECK ((course_status = ANY (ARRAY['not_started'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text]))),
    CONSTRAINT course_enrollments_payment_status_check CHECK ((payment_status = ANY (ARRAY['pending'::text, 'uploaded'::text, 'approved'::text, 'rejected'::text, 'expired'::text])))
);


--
-- Name: TABLE course_enrollments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.course_enrollments IS 'Per-customer course package progress (classes purchased vs completed)';


--
-- Name: courses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.courses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    price_label text DEFAULT ''::text NOT NULL,
    amount_inr numeric(10,2) DEFAULT 0 NOT NULL,
    duration_label text,
    features jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    image_url text,
    tagline text,
    difficulty text DEFAULT 'Beginner'::text,
    highlights jsonb DEFAULT '[]'::jsonb NOT NULL,
    is_featured boolean DEFAULT false NOT NULL,
    cta_text text,
    cta_link text,
    class_count integer,
    banner_image_url text,
    thumbnail_url text,
    mobile_image_url text,
    CONSTRAINT courses_amount_inr_check CHECK ((amount_inr >= (0)::numeric))
);


--
-- Name: gallery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gallery_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    title text,
    category text DEFAULT ''::text NOT NULL,
    image_url text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offline_booking_reference_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.offline_booking_reference_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    payment_id uuid NOT NULL,
    actor_id uuid,
    event_type text NOT NULL,
    old_data jsonb,
    new_data jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid NOT NULL,
    user_id uuid,
    amount numeric(10,2) DEFAULT 0 NOT NULL,
    currency text DEFAULT 'INR'::text NOT NULL,
    reference_number text,
    receipt_path text,
    receipt_mime text,
    receipt_original_name text,
    status public.payment_status_enum DEFAULT 'pending_upload'::public.payment_status_enum NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    rejection_reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    payment_method text,
    payment_date timestamp with time zone,
    payment_notes text,
    recorded_by uuid,
    CONSTRAINT payments_amount_check CHECK ((amount >= (0)::numeric))
);


--
-- Name: TABLE payments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.payments IS 'Manual payment verification for online bookings (Phase 3)';


--
-- Name: COLUMN payments.payment_method; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.payment_method IS 'cash | upi | bank_transfer | card | other';


--
-- Name: COLUMN payments.payment_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.payment_date IS 'When payment was made (admin/customer recorded)';


--
-- Name: COLUMN payments.payment_notes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.payment_notes IS 'Admin or customer payment notes';


--
-- Name: COLUMN payments.recorded_by; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.payments.recorded_by IS 'Admin who recorded offline/complete payment';


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email text NOT NULL,
    full_name text NOT NULL,
    phone text NOT NULL,
    avatar_url text,
    role text DEFAULT 'customer'::text NOT NULL,
    password_hash text,
    google_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    inactive_blocked boolean DEFAULT false NOT NULL,
    total_bookings integer DEFAULT 0 NOT NULL,
    last_booking_date date,
    weekly_booking_count integer DEFAULT 0 NOT NULL,
    weekly_reset_date date,
    provider_id text,
    admin_is_active boolean DEFAULT true NOT NULL,
    must_change_password boolean DEFAULT false NOT NULL,
    auth_provider text DEFAULT 'google'::text,
    CONSTRAINT profiles_auth_provider_check CHECK ((auth_provider = ANY (ARRAY['google'::text, 'email'::text, 'phone'::text]))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['customer'::text, 'trainer'::text, 'admin'::text, 'superadmin'::text, 'subadmin'::text])))
);


--
-- Name: COLUMN profiles.phone; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.phone IS 'Unique phone number - acts as account identifier for customers';


--
-- Name: COLUMN profiles.inactive_blocked; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.inactive_blocked IS 'Set true when customer has no booking activity for 45 days; admin can clear.';


--
-- Name: COLUMN profiles.total_bookings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.total_bookings IS 'Total number of bookings made by customer';


--
-- Name: COLUMN profiles.weekly_booking_count; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.weekly_booking_count IS 'Number of bookings made in current week (resets weekly)';


--
-- Name: COLUMN profiles.provider_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.provider_id IS 'OAuth provider user ID (e.g., Google ID)';


--
-- Name: COLUMN profiles.auth_provider; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.profiles.auth_provider IS 'Authentication provider used (google, email, phone)';


--
-- Name: ratings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ratings (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    booking_id uuid,
    trainer_id uuid,
    user_id uuid,
    rating integer NOT NULL,
    comment text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ratings_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: TABLE ratings; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ratings IS 'Trainer ratings submitted by users after booking completion';


--
-- Name: COLUMN ratings.booking_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ratings.booking_id IS 'Booking this rating is for (one rating per booking per user)';


--
-- Name: COLUMN ratings.trainer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ratings.trainer_id IS 'Trainer being rated';


--
-- Name: COLUMN ratings.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ratings.user_id IS 'User who submitted the rating';


--
-- Name: COLUMN ratings.rating; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ratings.rating IS 'Rating value from 1 to 5';


--
-- Name: schedule_exceptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.schedule_exceptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    exception_date date NOT NULL,
    start_time timestamp with time zone,
    end_time timestamp with time zone,
    exception_type text NOT NULL,
    capacity_override integer,
    vehicle_id uuid,
    reason text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT schedule_exceptions_capacity_override_check CHECK (((capacity_override IS NULL) OR (capacity_override >= 0))),
    CONSTRAINT schedule_exceptions_exception_type_check CHECK ((exception_type = ANY (ARRAY['disabled'::text, 'capacity_override'::text, 'closed'::text])))
);


--
-- Name: TABLE schedule_exceptions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.schedule_exceptions IS 'Admin overrides: disable slot, capacity override, or close day';


--
-- Name: settings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.settings (
    key text NOT NULL,
    value jsonb NOT NULL,
    description text NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    branch_id uuid
);


--
-- Name: slot_templates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slot_templates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid NOT NULL,
    duration_minutes integer DEFAULT 30 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT slot_templates_duration_minutes_check CHECK (((duration_minutes > 0) AND (duration_minutes <= 240)))
);


--
-- Name: TABLE slot_templates; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.slot_templates IS 'Slot duration template per branch (not stored slot rows)';


--
-- Name: slot_vehicle_capacity; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slot_vehicle_capacity (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    slot_id uuid NOT NULL,
    vehicle_id uuid NOT NULL,
    capacity integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT slot_vehicle_capacity_capacity_check CHECK ((capacity > 0))
);


--
-- Name: TABLE slot_vehicle_capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.slot_vehicle_capacity IS 'Junction table storing capacity per vehicle per slot. Replaces hardcoded electric_capacity, petrol_capacity, bike_capacity columns.';


--
-- Name: COLUMN slot_vehicle_capacity.capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slot_vehicle_capacity.capacity IS 'Maximum number of this vehicle type that can be booked for this slot';


--
-- Name: slots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.slots (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    trainer_id uuid,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone NOT NULL,
    slot_date date NOT NULL,
    capacity integer NOT NULL,
    booked_count integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'available'::text NOT NULL,
    is_auto_generated boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_visible boolean DEFAULT true NOT NULL,
    electric_capacity integer DEFAULT 3 NOT NULL,
    petrol_capacity integer DEFAULT 1 NOT NULL,
    bike_capacity integer DEFAULT 1 NOT NULL,
    capacity_exceeded boolean DEFAULT false NOT NULL,
    branch_id uuid NOT NULL,
    CONSTRAINT slots_booked_count_check CHECK (((booked_count >= 0) AND (booked_count <= capacity))),
    CONSTRAINT slots_capacity_check CHECK (((capacity >= 1) AND (capacity <= 100))),
    CONSTRAINT slots_check CHECK ((end_time > start_time)),
    CONSTRAINT slots_check1 CHECK ((booked_count <= capacity)),
    CONSTRAINT slots_status_check CHECK ((status = ANY (ARRAY['available'::text, 'full'::text, 'cancelled'::text, 'completed'::text, 'disabled'::text])))
);


--
-- Name: TABLE slots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.slots IS 'Training slots; per-vehicle limits live in slot_vehicle_capacity';


--
-- Name: COLUMN slots.slot_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.slot_date IS 'Date of the slot (derived from start_time)';


--
-- Name: COLUMN slots.capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.capacity IS 'Maximum capacity per slot (max 5 trainees)';


--
-- Name: COLUMN slots.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.status IS 'Slot status: available, full, cancelled, completed, or disabled';


--
-- Name: COLUMN slots.is_auto_generated; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.is_auto_generated IS 'Whether slot was auto-generated by the system';


--
-- Name: COLUMN slots.is_visible; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.is_visible IS 'Whether slot is visible to customers (24-hour rule)';


--
-- Name: COLUMN slots.electric_capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.electric_capacity IS 'Number of electric scooty slots available (default: 3)';


--
-- Name: COLUMN slots.petrol_capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.petrol_capacity IS 'Number of petrol scooty slots available (default: 1)';


--
-- Name: COLUMN slots.bike_capacity; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.bike_capacity IS 'Number of bike slots available (default: 1)';


--
-- Name: COLUMN slots.capacity_exceeded; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.slots.capacity_exceeded IS 'True when booked_count > sum of active vehicle capacities';


--
-- Name: student_entitlements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_entitlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    total_slots integer DEFAULT 0 NOT NULL,
    used_slots integer DEFAULT 0 NOT NULL,
    first_booking_date date,
    expiry_date date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT student_entitlements_slots_check CHECK ((used_slots <= total_slots)),
    CONSTRAINT student_entitlements_total_slots_check CHECK ((total_slots >= 0)),
    CONSTRAINT student_entitlements_used_slots_check CHECK ((used_slots >= 0))
);


--
-- Name: TABLE student_entitlements; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_entitlements IS 'DEPRECATED Phase 3: no longer gates online booking; retained for history';


--
-- Name: COLUMN student_entitlements.first_booking_date; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_entitlements.first_booking_date IS 'Date of first booking made by user (used for entitlement tracking and expiry calculations)';


--
-- Name: student_recognition; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_recognition (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    phone_number character varying(20) NOT NULL,
    invoice_reference character varying(255),
    invoice_file_url text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    approved_at timestamp with time zone,
    CONSTRAINT student_recognition_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'approved'::character varying, 'rejected'::character varying])::text[])))
);


--
-- Name: TABLE student_recognition; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.student_recognition IS 'DEPRECATED Phase 3: no longer gates online booking; retained for history';


--
-- Name: COLUMN student_recognition.user_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.user_id IS 'Reference to the user profile';


--
-- Name: COLUMN student_recognition.phone_number; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.phone_number IS 'Phone number associated with the invoice';


--
-- Name: COLUMN student_recognition.invoice_reference; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.invoice_reference IS 'Invoice reference number';


--
-- Name: COLUMN student_recognition.invoice_file_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.invoice_file_url IS 'URL to the uploaded invoice file';


--
-- Name: COLUMN student_recognition.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.status IS 'Status: pending, approved, or rejected';


--
-- Name: COLUMN student_recognition.created_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.created_at IS 'When the record was created';


--
-- Name: COLUMN student_recognition.approved_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.student_recognition.approved_at IS 'When the record was approved (NULL if not approved)';


--
-- Name: sub_admin_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sub_admin_permissions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    profile_id uuid NOT NULL,
    module text NOT NULL,
    can_view boolean DEFAULT false NOT NULL,
    can_create boolean DEFAULT false NOT NULL,
    can_edit boolean DEFAULT false NOT NULL,
    can_delete boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sub_admin_permissions_module_check CHECK ((module = ANY (ARRAY['dashboard'::text, 'users'::text, 'trainers'::text, 'vehicles'::text, 'bookings'::text, 'slots'::text, 'branches'::text, 'payments'::text, 'audit_logs'::text, 'settings'::text, 'gallery'::text, 'testimonials'::text, 'blogs'::text, 'coupons'::text])))
);


--
-- Name: testimonials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.testimonials (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    branch_id uuid,
    customer_name text NOT NULL,
    photo_url text,
    rating integer DEFAULT 5 NOT NULL,
    review text NOT NULL,
    display_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    course_name text,
    training_date date,
    CONSTRAINT testimonials_rating_check CHECK (((rating >= 1) AND (rating <= 5)))
);


--
-- Name: trainer_leave; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainer_leave (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    trainer_id uuid NOT NULL,
    leave_date date NOT NULL,
    reason text,
    is_demo boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE trainer_leave; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trainer_leave IS 'Trainer unavailability by date';


--
-- Name: trainers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trainers (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    bio text NOT NULL,
    experience_years integer DEFAULT 0 NOT NULL,
    specialization text[] DEFAULT '{}'::text[] NOT NULL,
    rating numeric(3,2) DEFAULT 0 NOT NULL,
    total_sessions integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    on_duty boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    branch_id uuid NOT NULL,
    CONSTRAINT trainers_rating_check CHECK (((rating >= (0)::numeric) AND (rating <= (5)::numeric)))
);


--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    type text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    vehicle_subtype text,
    max_per_slot integer DEFAULT 1 NOT NULL,
    branch_id uuid NOT NULL,
    operational_status text DEFAULT 'active'::text NOT NULL,
    vehicle_type text,
    CONSTRAINT vehicles_max_per_slot_check CHECK ((max_per_slot > 0)),
    CONSTRAINT vehicles_operational_status_check CHECK ((operational_status = ANY (ARRAY['active'::text, 'maintenance'::text, 'inactive'::text]))),
    CONSTRAINT vehicles_type_check CHECK ((type = ANY (ARRAY['Scooty'::text, 'Bike'::text]))),
    CONSTRAINT vehicles_vehicle_subtype_check CHECK ((vehicle_subtype = ANY (ARRAY['Electric Scooty'::text, 'Petrol Scooty'::text, 'Bike'::text])))
);


--
-- Name: TABLE vehicles; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.vehicles IS 'Dynamic vehicle management table. Each vehicle has a max_per_slot capacity.';


--
-- Name: COLUMN vehicles.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicles.is_active IS 'Whether this vehicle is currently available for booking';


--
-- Name: COLUMN vehicles.max_per_slot; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.vehicles.max_per_slot IS 'Maximum number of this vehicle type that can be booked per slot';


--
-- Name: account_reactivation_requests account_reactivation_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reactivation_requests
    ADD CONSTRAINT account_reactivation_requests_pkey PRIMARY KEY (id);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: admin_audit_log admin_audit_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_pkey PRIMARY KEY (id);


--
-- Name: admin_notification_reads admin_notification_reads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notification_reads
    ADD CONSTRAINT admin_notification_reads_pkey PRIMARY KEY (notification_id, admin_id);


--
-- Name: admin_notifications admin_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notifications
    ADD CONSTRAINT admin_notifications_pkey PRIMARY KEY (id);


--
-- Name: admins admins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_pkey PRIMARY KEY (id);


--
-- Name: admins admins_profile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_profile_id_key UNIQUE (profile_id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_pkey PRIMARY KEY (id);


--
-- Name: blog_posts blog_posts_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.blog_posts
    ADD CONSTRAINT blog_posts_slug_key UNIQUE (slug);


--
-- Name: booking_events booking_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_events
    ADD CONSTRAINT booking_events_pkey PRIMARY KEY (id);


--
-- Name: bookings bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_pkey PRIMARY KEY (id);


--
-- Name: branch_holidays branch_holidays_branch_id_holiday_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_holidays
    ADD CONSTRAINT branch_holidays_branch_id_holiday_date_key UNIQUE (branch_id, holiday_date);


--
-- Name: branch_holidays branch_holidays_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_holidays
    ADD CONSTRAINT branch_holidays_pkey PRIMARY KEY (id);


--
-- Name: branch_working_hours branch_working_hours_branch_id_day_of_week_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_working_hours
    ADD CONSTRAINT branch_working_hours_branch_id_day_of_week_key UNIQUE (branch_id, day_of_week);


--
-- Name: branch_working_hours branch_working_hours_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_working_hours
    ADD CONSTRAINT branch_working_hours_pkey PRIMARY KEY (id);


--
-- Name: branches branches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_pkey PRIMARY KEY (id);


--
-- Name: branches branches_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branches
    ADD CONSTRAINT branches_slug_key UNIQUE (slug);


--
-- Name: coupons coupons_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_code_key UNIQUE (code);


--
-- Name: coupons coupons_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_pkey PRIMARY KEY (id);


--
-- Name: course_enrollments course_enrollments_user_id_course_id_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_course_id_branch_id_key UNIQUE (user_id, course_id, branch_id);


--
-- Name: courses courses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_pkey PRIMARY KEY (id);


--
-- Name: courses courses_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.courses
    ADD CONSTRAINT courses_slug_key UNIQUE (slug);


--
-- Name: gallery_items gallery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_items
    ADD CONSTRAINT gallery_items_pkey PRIMARY KEY (id);


--
-- Name: payment_events payment_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_pkey PRIMARY KEY (id);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_google_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_google_id_key UNIQUE (google_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: ratings ratings_booking_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_booking_id_user_id_key UNIQUE (booking_id, user_id);


--
-- Name: ratings ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_pkey PRIMARY KEY (id);


--
-- Name: schedule_exceptions schedule_exceptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_pkey PRIMARY KEY (id);


--
-- Name: settings settings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_pkey PRIMARY KEY (key);


--
-- Name: slot_templates slot_templates_branch_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_templates
    ADD CONSTRAINT slot_templates_branch_id_key UNIQUE (branch_id);


--
-- Name: slot_templates slot_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_templates
    ADD CONSTRAINT slot_templates_pkey PRIMARY KEY (id);


--
-- Name: slot_vehicle_capacity slot_vehicle_capacity_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_vehicle_capacity
    ADD CONSTRAINT slot_vehicle_capacity_pkey PRIMARY KEY (id);


--
-- Name: slot_vehicle_capacity slot_vehicle_capacity_slot_id_vehicle_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_vehicle_capacity
    ADD CONSTRAINT slot_vehicle_capacity_slot_id_vehicle_id_key UNIQUE (slot_id, vehicle_id);


--
-- Name: slots slots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_pkey PRIMARY KEY (id);


--
-- Name: student_entitlements student_entitlements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_entitlements
    ADD CONSTRAINT student_entitlements_pkey PRIMARY KEY (id);


--
-- Name: student_entitlements student_entitlements_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_entitlements
    ADD CONSTRAINT student_entitlements_user_id_key UNIQUE (user_id);


--
-- Name: student_recognition student_recognition_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_recognition
    ADD CONSTRAINT student_recognition_pkey PRIMARY KEY (id);


--
-- Name: sub_admin_permissions sub_admin_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_admin_permissions
    ADD CONSTRAINT sub_admin_permissions_pkey PRIMARY KEY (id);


--
-- Name: sub_admin_permissions sub_admin_permissions_profile_id_module_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_admin_permissions
    ADD CONSTRAINT sub_admin_permissions_profile_id_module_key UNIQUE (profile_id, module);


--
-- Name: testimonials testimonials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_pkey PRIMARY KEY (id);


--
-- Name: trainer_leave trainer_leave_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_leave
    ADD CONSTRAINT trainer_leave_pkey PRIMARY KEY (id);


--
-- Name: trainer_leave trainer_leave_trainer_id_leave_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_leave
    ADD CONSTRAINT trainer_leave_trainer_id_leave_date_key UNIQUE (trainer_id, leave_date);


--
-- Name: trainers trainers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_pkey PRIMARY KEY (id);


--
-- Name: trainers trainers_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_user_id_key UNIQUE (user_id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_logs_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_action ON public.activity_logs USING btree (action);


--
-- Name: idx_activity_logs_actor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_actor ON public.activity_logs USING btree (actor_id);


--
-- Name: idx_activity_logs_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_activity_logs_created ON public.activity_logs USING btree (created_at DESC);


--
-- Name: idx_admin_audit_log_action; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_action ON public.admin_audit_log USING btree (action_type);


--
-- Name: idx_admin_audit_log_action_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_action_type ON public.admin_audit_log USING btree (action_type);


--
-- Name: idx_admin_audit_log_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_admin_id ON public.admin_audit_log USING btree (admin_id);


--
-- Name: idx_admin_audit_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_created_at ON public.admin_audit_log USING btree (created_at DESC);


--
-- Name: idx_admin_audit_log_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_entity ON public.admin_audit_log USING btree (entity_type, entity_id);


--
-- Name: idx_admin_audit_log_entity_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_audit_log_entity_type ON public.admin_audit_log USING btree (entity_type);


--
-- Name: idx_admin_notification_reads_admin; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notification_reads_admin ON public.admin_notification_reads USING btree (admin_id);


--
-- Name: idx_admin_notifications_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admin_notifications_created ON public.admin_notifications USING btree (created_at DESC);


--
-- Name: idx_admins_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_created_by ON public.admins USING btree (created_by);


--
-- Name: idx_admins_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_is_active ON public.admins USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_admins_profile_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_profile_id ON public.admins USING btree (profile_id);


--
-- Name: idx_admins_role; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_admins_role ON public.admins USING btree (role);


--
-- Name: idx_audit_logs_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_created_at ON public.audit_logs USING btree (created_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_audit_logs_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_user_id ON public.audit_logs USING btree (user_id);


--
-- Name: idx_blog_posts_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_blog_posts_slug ON public.blog_posts USING btree (slug);


--
-- Name: idx_blog_posts_status_published; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_blog_posts_status_published ON public.blog_posts USING btree (status, published_at DESC);


--
-- Name: idx_booking_events_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_booking_events_booking_id ON public.booking_events USING btree (booking_id, created_at DESC);


--
-- Name: idx_bookings_attendance_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_attendance_status ON public.bookings USING btree (attendance_status);


--
-- Name: idx_bookings_booking_reference; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_booking_reference ON public.bookings USING btree (booking_reference);


--
-- Name: idx_bookings_booking_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_booking_source ON public.bookings USING btree (booking_source);


--
-- Name: idx_bookings_branch_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_branch_status ON public.bookings USING btree (branch_id, status);


--
-- Name: idx_bookings_cancellation_deadline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_cancellation_deadline ON public.bookings USING btree (cancellation_deadline);


--
-- Name: idx_bookings_course_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_course_id ON public.bookings USING btree (course_id);


--
-- Name: idx_bookings_created_by_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_created_by_admin_id ON public.bookings USING btree (created_by_admin_id) WHERE (created_by_admin_id IS NOT NULL);


--
-- Name: idx_bookings_offline_reference_number; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_offline_reference_number ON public.bookings USING btree (offline_reference_number) WHERE (offline_reference_number IS NOT NULL);


--
-- Name: idx_bookings_pending_payment_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_pending_payment_created ON public.bookings USING btree (created_at) WHERE (status = 'pending_payment'::text);


--
-- Name: idx_bookings_phone; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_phone ON public.bookings USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: idx_bookings_phone_created_week; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_phone_created_week ON public.bookings USING btree (phone, created_at) WHERE ((phone IS NOT NULL) AND (status <> 'cancelled'::text));


--
-- Name: INDEX idx_bookings_phone_created_week; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_bookings_phone_created_week IS 'Optimizes weekly booking limit checks';


--
-- Name: idx_bookings_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_slot_id ON public.bookings USING btree (slot_id);


--
-- Name: idx_bookings_slot_trainer_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_slot_trainer_active ON public.bookings USING btree (slot_id, trainer_id) WHERE ((trainer_id IS NOT NULL) AND (status <> 'cancelled'::text));


--
-- Name: INDEX idx_bookings_slot_trainer_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_bookings_slot_trainer_active IS 'Prevents assigning the same trainer to more than one active booking for the same time slot.';


--
-- Name: idx_bookings_slot_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_slot_vehicle ON public.bookings USING btree (slot_id, vehicle_id) WHERE (status <> 'cancelled'::text);


--
-- Name: idx_bookings_slot_vehicle_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_slot_vehicle_status ON public.bookings USING btree (slot_id, vehicle_id, status) WHERE (status <> 'cancelled'::text);


--
-- Name: INDEX idx_bookings_slot_vehicle_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_bookings_slot_vehicle_status IS 'Optimizes vehicle capacity checks during booking creation';


--
-- Name: idx_bookings_slot_vehicle_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_slot_vehicle_type ON public.bookings USING btree (slot_id, vehicle_type, status) WHERE (status <> 'cancelled'::text);


--
-- Name: idx_bookings_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_status ON public.bookings USING btree (status);


--
-- Name: idx_bookings_trainer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_trainer_id ON public.bookings USING btree (trainer_id);


--
-- Name: idx_bookings_unique_user_slot_active; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_bookings_unique_user_slot_active ON public.bookings USING btree (user_id, slot_id) WHERE (status IS DISTINCT FROM 'cancelled'::text);


--
-- Name: idx_bookings_updated_by_admin_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_updated_by_admin_id ON public.bookings USING btree (updated_by_admin_id) WHERE (updated_by_admin_id IS NOT NULL);


--
-- Name: idx_bookings_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user_created ON public.bookings USING btree (user_id, created_at DESC);


--
-- Name: idx_bookings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_user_id ON public.bookings USING btree (user_id);


--
-- Name: idx_bookings_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_vehicle_id ON public.bookings USING btree (vehicle_id);


--
-- Name: idx_bookings_vehicle_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bookings_vehicle_type ON public.bookings USING btree (vehicle_type);


--
-- Name: idx_branch_holidays_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_holidays_branch_date ON public.branch_holidays USING btree (branch_id, holiday_date);


--
-- Name: idx_branch_working_hours_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branch_working_hours_branch ON public.branch_working_hours USING btree (branch_id);


--
-- Name: idx_branches_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_is_active ON public.branches USING btree (is_active);


--
-- Name: idx_branches_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_branches_slug ON public.branches USING btree (slug);


--
-- Name: idx_coupons_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_active ON public.coupons USING btree (is_active);


--
-- Name: idx_coupons_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coupons_code ON public.coupons USING btree (code);


--
-- Name: idx_course_enrollments_course; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_enrollments_course ON public.course_enrollments USING btree (course_id);


--
-- Name: idx_course_enrollments_demo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_enrollments_demo ON public.course_enrollments USING btree (is_demo) WHERE (is_demo = true);


--
-- Name: idx_course_enrollments_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_course_enrollments_user ON public.course_enrollments USING btree (user_id);


--
-- Name: idx_courses_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_courses_is_active ON public.courses USING btree (is_active);


--
-- Name: idx_gallery_items_active_sort; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gallery_items_active_sort ON public.gallery_items USING btree (is_active, sort_order);


--
-- Name: idx_gallery_items_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gallery_items_branch ON public.gallery_items USING btree (branch_id);


--
-- Name: idx_payment_events_payment_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_events_payment_id ON public.payment_events USING btree (payment_id);


--
-- Name: idx_payments_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_payments_booking_id ON public.payments USING btree (booking_id);


--
-- Name: idx_payments_payment_method; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_payment_method ON public.payments USING btree (payment_method);


--
-- Name: idx_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status ON public.payments USING btree (status);


--
-- Name: idx_payments_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_status_created ON public.payments USING btree (status, created_at DESC);


--
-- Name: idx_payments_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user_created ON public.payments USING btree (user_id, created_at DESC);


--
-- Name: idx_payments_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_user_id ON public.payments USING btree (user_id);


--
-- Name: idx_profiles_auth_provider; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_auth_provider ON public.profiles USING btree (auth_provider);


--
-- Name: idx_profiles_inactive_blocked_customers; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_inactive_blocked_customers ON public.profiles USING btree (inactive_blocked) WHERE ((role = 'customer'::text) AND (inactive_blocked = true));


--
-- Name: idx_profiles_phone_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_profiles_phone_unique ON public.profiles USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: INDEX idx_profiles_phone_unique; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_profiles_phone_unique IS 'Enforces phone number uniqueness as per business rule: phone number = unique identity';


--
-- Name: idx_profiles_weekly_reset; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_weekly_reset ON public.profiles USING btree (weekly_reset_date, weekly_booking_count);


--
-- Name: idx_ratings_booking_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_booking_id ON public.ratings USING btree (booking_id);


--
-- Name: idx_ratings_trainer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_trainer_id ON public.ratings USING btree (trainer_id);


--
-- Name: idx_ratings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ratings_user_id ON public.ratings USING btree (user_id);


--
-- Name: idx_reactivation_one_pending_per_user; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_reactivation_one_pending_per_user ON public.account_reactivation_requests USING btree (user_id) WHERE (status = 'pending'::text);


--
-- Name: idx_reactivation_requests_status_requested; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_reactivation_requests_status_requested ON public.account_reactivation_requests USING btree (status, requested_at DESC);


--
-- Name: idx_schedule_exceptions_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_exceptions_branch_date ON public.schedule_exceptions USING btree (branch_id, exception_date);


--
-- Name: idx_schedule_exceptions_branch_date_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_schedule_exceptions_branch_date_time ON public.schedule_exceptions USING btree (branch_id, exception_date, start_time);


--
-- Name: idx_slot_vehicle_capacity_slot_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slot_vehicle_capacity_slot_id ON public.slot_vehicle_capacity USING btree (slot_id);


--
-- Name: idx_slot_vehicle_capacity_slot_vehicle; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slot_vehicle_capacity_slot_vehicle ON public.slot_vehicle_capacity USING btree (slot_id, vehicle_id);


--
-- Name: INDEX idx_slot_vehicle_capacity_slot_vehicle; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.idx_slot_vehicle_capacity_slot_vehicle IS 'Optimizes slot vehicle capacity lookups';


--
-- Name: idx_slot_vehicle_capacity_vehicle_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slot_vehicle_capacity_vehicle_id ON public.slot_vehicle_capacity USING btree (vehicle_id);


--
-- Name: idx_slots_branch_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_branch_date ON public.slots USING btree (branch_id, slot_date);


--
-- Name: idx_slots_branch_start; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_branch_start ON public.slots USING btree (branch_id, start_time);


--
-- Name: idx_slots_branch_start_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_slots_branch_start_unique ON public.slots USING btree (branch_id, start_time) WHERE (branch_id IS NOT NULL);


--
-- Name: idx_slots_date_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_date_status ON public.slots USING btree (slot_date, status) WHERE (status = ANY (ARRAY['available'::text, 'disabled'::text]));


--
-- Name: idx_slots_date_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_date_visible ON public.slots USING btree (slot_date, is_visible) WHERE (is_visible = true);


--
-- Name: idx_slots_end_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_end_time ON public.slots USING btree (end_time);


--
-- Name: idx_slots_is_visible; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_is_visible ON public.slots USING btree (is_visible) WHERE (is_visible = true);


--
-- Name: idx_slots_slot_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_slot_date ON public.slots USING btree (slot_date);


--
-- Name: idx_slots_start_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_start_time ON public.slots USING btree (start_time);


--
-- Name: idx_slots_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_status ON public.slots USING btree (status);


--
-- Name: idx_slots_trainer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_trainer_id ON public.slots USING btree (trainer_id);


--
-- Name: idx_slots_unique_assigned; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_slots_unique_assigned ON public.slots USING btree (trainer_id, start_time, end_time) WHERE (trainer_id IS NOT NULL);


--
-- Name: idx_slots_unique_slot; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_slots_unique_slot ON public.slots USING btree (slot_date, start_time, trainer_id) WHERE (trainer_id IS NOT NULL);


--
-- Name: idx_slots_unique_unassigned; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_slots_unique_unassigned ON public.slots USING btree (start_time, end_time) WHERE (trainer_id IS NULL);


--
-- Name: idx_slots_vehicle_capacity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_slots_vehicle_capacity ON public.slots USING btree (electric_capacity, petrol_capacity, bike_capacity);


--
-- Name: idx_student_entitlements_expiry_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_entitlements_expiry_date ON public.student_entitlements USING btree (expiry_date) WHERE (expiry_date IS NOT NULL);


--
-- Name: idx_student_entitlements_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_entitlements_user_id ON public.student_entitlements USING btree (user_id);


--
-- Name: idx_student_recognition_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_recognition_status ON public.student_recognition USING btree (status) WHERE ((status)::text = 'approved'::text);


--
-- Name: idx_student_recognition_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_recognition_user_id ON public.student_recognition USING btree (user_id);


--
-- Name: idx_student_recognition_user_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_student_recognition_user_status ON public.student_recognition USING btree (user_id, status);


--
-- Name: idx_sub_admin_permissions_profile; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sub_admin_permissions_profile ON public.sub_admin_permissions USING btree (profile_id);


--
-- Name: idx_testimonials_active_order; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_testimonials_active_order ON public.testimonials USING btree (is_active, display_order);


--
-- Name: idx_testimonials_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_testimonials_branch ON public.testimonials USING btree (branch_id);


--
-- Name: idx_trainer_leave_trainer_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainer_leave_trainer_date ON public.trainer_leave USING btree (trainer_id, leave_date);


--
-- Name: idx_trainers_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainers_branch ON public.trainers USING btree (branch_id);


--
-- Name: idx_trainers_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainers_is_active ON public.trainers USING btree (is_active);


--
-- Name: idx_trainers_on_duty; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainers_on_duty ON public.trainers USING btree (on_duty);


--
-- Name: idx_trainers_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trainers_user_id ON public.trainers USING btree (user_id);


--
-- Name: idx_vehicles_branch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_branch ON public.vehicles USING btree (branch_id);


--
-- Name: idx_vehicles_branch_name_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_vehicles_branch_name_unique ON public.vehicles USING btree (branch_id, lower(name)) WHERE (branch_id IS NOT NULL);


--
-- Name: idx_vehicles_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_is_active ON public.vehicles USING btree (is_active) WHERE (is_active = true);


--
-- Name: idx_vehicles_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_vehicles_name ON public.vehicles USING btree (name);


--
-- Name: profiles_phone_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX profiles_phone_key ON public.profiles USING btree (phone) WHERE (phone IS NOT NULL);


--
-- Name: bookings trigger_set_booking_cancellation_deadline; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_booking_cancellation_deadline BEFORE INSERT OR UPDATE OF slot_id ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_cancellation_deadline();


--
-- Name: bookings trigger_set_booking_vehicle_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_booking_vehicle_type BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.set_booking_vehicle_type_from_vehicle();


--
-- Name: slots trigger_set_slot_date; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_set_slot_date BEFORE INSERT OR UPDATE OF start_time ON public.slots FOR EACH ROW EXECUTE FUNCTION public.set_slot_date();


--
-- Name: slots trigger_update_slot_visibility; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_slot_visibility BEFORE INSERT OR UPDATE OF start_time ON public.slots FOR EACH ROW EXECUTE FUNCTION public.update_slot_visibility();


--
-- Name: bookings trigger_validate_booking_vehicle_capacity; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_validate_booking_vehicle_capacity BEFORE INSERT ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.validate_booking_vehicle_capacity();


--
-- Name: admins update_admins_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admins_updated_at BEFORE UPDATE ON public.admins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: blog_posts update_blog_posts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bookings update_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: coupons update_coupons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_coupons_updated_at BEFORE UPDATE ON public.coupons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: gallery_items update_gallery_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_gallery_items_updated_at BEFORE UPDATE ON public.gallery_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ratings update_ratings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON public.ratings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: settings update_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: slot_vehicle_capacity update_slot_vehicle_capacity_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_slot_vehicle_capacity_updated_at BEFORE UPDATE ON public.slot_vehicle_capacity FOR EACH ROW EXECUTE FUNCTION public.update_slot_vehicle_capacity_updated_at();


--
-- Name: slots update_slots_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_slots_updated_at BEFORE UPDATE ON public.slots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: testimonials update_testimonials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_testimonials_updated_at BEFORE UPDATE ON public.testimonials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: trainers update_trainers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_trainers_updated_at BEFORE UPDATE ON public.trainers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: vehicles update_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: account_reactivation_requests account_reactivation_requests_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reactivation_requests
    ADD CONSTRAINT account_reactivation_requests_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: account_reactivation_requests account_reactivation_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_reactivation_requests
    ADD CONSTRAINT account_reactivation_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: activity_logs activity_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_audit_log admin_audit_log_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_audit_log
    ADD CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: admin_notification_reads admin_notification_reads_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notification_reads
    ADD CONSTRAINT admin_notification_reads_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: admin_notification_reads admin_notification_reads_notification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admin_notification_reads
    ADD CONSTRAINT admin_notification_reads_notification_id_fkey FOREIGN KEY (notification_id) REFERENCES public.admin_notifications(id) ON DELETE CASCADE;


--
-- Name: admins admins_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.admins(id);


--
-- Name: admins admins_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.admins
    ADD CONSTRAINT admins_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id);


--
-- Name: booking_events booking_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_events
    ADD CONSTRAINT booking_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: booking_events booking_events_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.booking_events
    ADD CONSTRAINT booking_events_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_attendance_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_attendance_updated_by_fkey FOREIGN KEY (attendance_updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


--
-- Name: bookings bookings_cancelled_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_cancelled_by_fkey FOREIGN KEY (cancelled_by) REFERENCES public.profiles(id);


--
-- Name: bookings bookings_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_created_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_created_by_admin_id_fkey FOREIGN KEY (created_by_admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_updated_by_admin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_updated_by_admin_id_fkey FOREIGN KEY (updated_by_admin_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: bookings bookings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: bookings bookings_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bookings
    ADD CONSTRAINT bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: branch_holidays branch_holidays_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_holidays
    ADD CONSTRAINT branch_holidays_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: branch_working_hours branch_working_hours_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.branch_working_hours
    ADD CONSTRAINT branch_working_hours_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: coupons coupons_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: coupons coupons_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coupons
    ADD CONSTRAINT coupons_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: course_enrollments course_enrollments_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: course_enrollments course_enrollments_course_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;


--
-- Name: course_enrollments course_enrollments_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: course_enrollments course_enrollments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.course_enrollments
    ADD CONSTRAINT course_enrollments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: gallery_items gallery_items_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gallery_items
    ADD CONSTRAINT gallery_items_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: payment_events payment_events_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: payment_events payment_events_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_events
    ADD CONSTRAINT payment_events_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payments payments_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: payments payments_recorded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: payments payments_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: payments payments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ratings ratings_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: ratings ratings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ratings
    ADD CONSTRAINT ratings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: schedule_exceptions schedule_exceptions_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: schedule_exceptions schedule_exceptions_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.schedule_exceptions
    ADD CONSTRAINT schedule_exceptions_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE SET NULL;


--
-- Name: settings settings_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: settings settings_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.settings
    ADD CONSTRAINT settings_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: slot_templates slot_templates_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_templates
    ADD CONSTRAINT slot_templates_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE CASCADE;


--
-- Name: slot_vehicle_capacity slot_vehicle_capacity_slot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_vehicle_capacity
    ADD CONSTRAINT slot_vehicle_capacity_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.slots(id) ON DELETE CASCADE;


--
-- Name: slot_vehicle_capacity slot_vehicle_capacity_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slot_vehicle_capacity
    ADD CONSTRAINT slot_vehicle_capacity_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id) ON DELETE CASCADE;


--
-- Name: slots slots_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


--
-- Name: slots slots_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.slots
    ADD CONSTRAINT slots_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE SET NULL;


--
-- Name: student_entitlements student_entitlements_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_entitlements
    ADD CONSTRAINT student_entitlements_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: student_recognition student_recognition_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_recognition
    ADD CONSTRAINT student_recognition_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: sub_admin_permissions sub_admin_permissions_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sub_admin_permissions
    ADD CONSTRAINT sub_admin_permissions_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: testimonials testimonials_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.testimonials
    ADD CONSTRAINT testimonials_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE SET NULL;


--
-- Name: trainer_leave trainer_leave_trainer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainer_leave
    ADD CONSTRAINT trainer_leave_trainer_id_fkey FOREIGN KEY (trainer_id) REFERENCES public.trainers(id) ON DELETE CASCADE;


--
-- Name: trainers trainers_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


--
-- Name: trainers trainers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trainers
    ADD CONSTRAINT trainers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: vehicles vehicles_branch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_branch_id_fkey FOREIGN KEY (branch_id) REFERENCES public.branches(id) ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--






-- =============================================================================
-- Essential reference seed (settings, courses, branches, vehicles)
-- =============================================================================
SET search_path TO public;
SET session_replication_role = replica;
--
-- PostgreSQL database dump
--

\restrict aabdwVfVdBTa90qaG57eHIRAtmbfVZbGksSaG4OIydMYscgcRCAHgzMbEO7DSzv

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: branches; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.branches (id, name, slug, address, contact_phone, contact_email, maps_url, working_days, opening_time, closing_time, slot_duration_minutes, is_active, created_at, updated_at, image_url, default_slot_capacity) VALUES ('0f1a7b34-0f35-4c7b-a85d-0e1f472884ed', 'Kolkata Main', 'kolkata-main', 'Plot No. 45, Sector V, Salt Lake, Kolkata - 700091, Near City Centre Mall', '+91-98765-43210', 'info@kolkatascootytraining.com', 'https://www.google.com/maps/search/?api=1&query=Salt+Lake+Sector+5+Kolkata', '{1,2,3,4,5,6,0}', '07:00:00', '19:00:00', 30, true, '2026-07-24 12:00:26.24241+05:30', '2026-07-27 18:59:59.178796+05:30', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80', 1);
INSERT INTO public.branches (id, name, slug, address, contact_phone, contact_email, maps_url, working_days, opening_time, closing_time, slot_duration_minutes, is_active, created_at, updated_at, image_url, default_slot_capacity) VALUES ('b8d78a18-58f3-4608-b009-5eceb63ba307', 'Netaji Metro Branch', 'netaji-metro', 'Netaji Metro Station, Kolkata', NULL, NULL, 'https://www.google.com/maps/search/?api=1&query=Netaji+Metro+Station,+Kolkata', '{1,2,3,4,5,6}', '07:00:00', '21:00:00', 30, true, '2026-07-24 17:43:29.065775+05:30', '2026-07-27 19:12:36.579451+05:30', NULL, 6);
INSERT INTO public.branches (id, name, slug, address, contact_phone, contact_email, maps_url, working_days, opening_time, closing_time, slot_duration_minutes, is_active, created_at, updated_at, image_url, default_slot_capacity) VALUES ('64653d86-5b27-4e26-bf91-b771923217c0', 'Garia Branch', 'garia', 'Garia, Kolkata', NULL, NULL, 'https://www.google.com/maps/search/?api=1&query=Garia,+Kolkata', '{1,2,3,4,5,6,0}', '08:00:00', '20:00:00', 45, true, '2026-07-24 17:44:09.056817+05:30', '2026-07-27 19:12:36.579451+05:30', NULL, 4);
INSERT INTO public.branches (id, name, slug, address, contact_phone, contact_email, maps_url, working_days, opening_time, closing_time, slot_duration_minutes, is_active, created_at, updated_at, image_url, default_slot_capacity) VALUES ('25466996-c30d-411e-9011-206511fe901b', 'Salt Lake Branch', 'salt-lake', 'Salt Lake Sector V, Kolkata', NULL, NULL, 'https://www.google.com/maps/search/?api=1&query=Salt+Lake+Sector+V,+Kolkata', '{1,2,3,4,5}', '09:00:00', '18:00:00', 60, true, '2026-07-24 17:44:09.07627+05:30', '2026-07-27 19:12:36.579451+05:30', NULL, 5);
INSERT INTO public.branches (id, name, slug, address, contact_phone, contact_email, maps_url, working_days, opening_time, closing_time, slot_duration_minutes, is_active, created_at, updated_at, image_url, default_slot_capacity) VALUES ('6cd6985a-687f-4133-b4a1-360ba99ac768', 'Garia', 'Central South Kolkata hub', 'Garia Station, Baghajatin, Santoshpur', '9585087171', 'annaswetha1473@gmail.com', 'https://www.google.com/maps/search/?api=1&query=Garia+Station,+Baghajatin,+Santoshpur', '{1,2,3,4,5,6}', '07:00:00', '12:00:00', 30, true, '2026-07-24 12:13:13.427501+05:30', '2026-07-27 19:12:36.579451+05:30', '', 1);


--
-- Data for Name: courses; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('1dc87f25-d867-4683-bd00-6e18b7c3d4c5', 'Basic Scooty Training', 'basic-scooty', 'Learn scooty riding from scratch with our 15-class Scooty Training Course.

No cycle balancing required.

Perfect for beginners, women, students and working professionals.', 'Starting from ₹2,500', 2500.00, '15-class programme', '["Theory Class", "Acceleration & Brake Control", "Balance & Survival Skills", "Turning & Indicator Practice", "Petrol Scooty Practice"]', true, 1, '2026-07-24 15:31:14.193697+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/basic-scooty-card.webp', 'Learn scooty riding from scratch with our 15-class Scooty Training Course.', 'Beginner', '[]', true, 'Book now', '/booking?course=basic-scooty', 15, '/media/courses/basic-scooty-banner.webp', '/media/courses/basic-scooty-thumb.webp', '/media/courses/basic-scooty-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('f4226553-cbcc-4fcd-805f-72678e343a47', 'Advanced Scooty Training', 'advanced-scooty', 'For riders who know the basics and want to gain confidence on busy roads.', 'Starting from ₹2,500', 2500.00, NULL, '["Busy Road Practice", "Speed Breaker Handling", "Double Carry Riding", "Safe Overtaking", "Defensive Riding"]', true, 2, '2026-07-24 15:31:14.193697+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/advanced-scooty-card.webp', 'For riders who know the basics and want to gain confidence on busy roads.', 'Intermediate', '[]', false, 'Book now', '/booking?course=advanced-scooty', 10, '/media/courses/advanced-scooty-banner.webp', '/media/courses/advanced-scooty-thumb.webp', '/media/courses/advanced-scooty-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('3b1ea485-3916-4a2f-b235-34ead815fba1', 'Bike Training', 'bike-training', 'Basic cycle balancing is required.', 'Starting from ₹2,500', 2500.00, NULL, '["Scooty Mastery", "Bike Theory", "Clutch & Gear Control", "Busy Road Practice", "RTO Test Preparation"]', true, 3, '2026-07-24 15:31:14.193697+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/bike-training-card.webp', 'Basic cycle balancing is required.', 'Intermediate', '[]', false, 'Book now', '/booking?course=bike-training', 12, '/media/courses/bike-training-banner.webp', '/media/courses/bike-training-thumb.webp', '/media/courses/bike-training-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('814c1532-079d-46ee-876c-cf80b6cafdff', 'Doorstep Scooty & Bike Training', 'doorstep', 'Learn near your home.

Available within 10 km of Netaji Metro Station.

Charges are dynamic depending on travel distance.', 'Charges are dynamic depending on travel distance.', 0.00, 'Within 10 km of Netaji Metro Station', '[]', true, 4, '2026-07-24 15:31:14.193697+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/doorstep-card.webp', 'Learn near your home.', 'Flexible', '[]', false, 'Enquire', '/contact', 8, '/media/courses/doorstep-banner.webp', '/media/courses/doorstep-thumb.webp', '/media/courses/doorstep-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('c517e522-ca02-4029-a26e-367692c86e58', 'RTO License & Exam Assistance', 'rto-assistance', 'Guidance for:', '', 0.00, NULL, '["RTO Driving Test", "Practical Preparation", "Riding Confidence", "License Process Assistance"]', true, 5, '2026-07-24 15:31:14.193697+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/rto-assistance-card.webp', 'Guidance for RTO driving test and licence process.', 'Assistance', '[]', false, 'Enquire', '/contact', 5, '/media/courses/rto-assistance-banner.webp', '/media/courses/rto-assistance-thumb.webp', '/media/courses/rto-assistance-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('29984019-b95b-48a5-8c0a-cc498929d8ca', 'Ladies Special Training', 'ladies-special', 'Women-focused scooty training with patient coaching, safe grounds, and confidence-first pacing.', 'Starting from ₹2,500', 2500.00, 'Flexible batches', '["Women-friendly coaching", "Helmet & safety briefing", "Balance & control drills", "Quiet-lane practice"]', true, 50, '2026-07-27 19:12:36.579451+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/ladies-special-card.webp', 'Designed for women learners seeking independence on Kolkata roads.', 'Beginner', '["No prior cycling required", "Supportive one-to-one guidance"]', false, 'Book now', '/booking?course=ladies-special', NULL, '/media/courses/ladies-special-banner.webp', '/media/courses/ladies-special-thumb.webp', '/media/courses/ladies-special-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('1917f544-5673-4d33-82ed-883a44268134', 'Road Confidence Training', 'road-confidence', 'Guided practice for riders who know the basics and want calm confidence in real Kolkata traffic.', 'Starting from ₹3,000', 3000.00, 'Road-focused modules', '["Junction scanning", "Lane positioning", "Defensive riding", "Peak-hour strategies"]', true, 50, '2026-07-27 19:12:36.579451+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/road-confidence-card.webp', 'From training ground to busy junctions — with a coach.', 'Intermediate', '["Ideal after basic scooty or bike course"]', false, 'Book now', '/booking?course=road-confidence', NULL, '/media/courses/road-confidence-banner.webp', '/media/courses/road-confidence-thumb.webp', '/media/courses/road-confidence-mobile.webp');
INSERT INTO public.courses (id, name, slug, description, price_label, amount_inr, duration_label, features, is_active, sort_order, created_at, updated_at, image_url, tagline, difficulty, highlights, is_featured, cta_text, cta_link, class_count, banner_image_url, thumbnail_url, mobile_image_url) VALUES ('a72b197a-e7c9-441c-9457-c248315fa63d', 'Refresher Course', 'refresher', 'Short refresher for returning riders who need to rebuild balance, braking feel, and traffic confidence.', 'Starting from ₹1,800', 1800.00, 'Short programme', '["Skill assessment", "Targeted drills", "Optional road practice"]', true, 50, '2026-07-27 19:12:36.579451+05:30', '2026-07-27 19:12:36.579451+05:30', '/media/courses/refresher-card.webp', 'Get your confidence back — quickly and safely.', 'All levels', '["Perfect after a long break from riding"]', false, 'Book now', '/booking?course=refresher', NULL, '/media/courses/refresher-banner.webp', '/media/courses/refresher-thumb.webp', '/media/courses/refresher-mobile.webp');


--
-- Data for Name: settings; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('homepage_hero', '{"image": "", "title": "Learn two-wheeler riding with confidence", "subtitle": "Professional scooty and bike training for women and men in Kolkata — safe grounds, patient coaches, and real-road practice.", "ctaPrimaryLink": "/booking", "ctaPrimaryText": "Book a class", "ctaSecondaryLink": "/courses", "ctaSecondaryText": "View courses"}', 'Public homepage hero', '2026-07-27 18:59:59.178796+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('contact_address', '"Kolkata, West Bengal, India"', '', '2026-07-24 12:16:30.882189+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('contact_maps_url', '"https://www.google.com/maps/search/?api=1&query=Kolkata+Scooty+Bike+Training+Salt+Lake"', 'Public contact_maps_url', '2026-07-27 19:12:36.579451+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('social_facebook', '"https://www.facebook.com/kolkatascootytraining"', '', '2026-07-27 19:15:02.904629+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('auto_slot_capacity_from_vehicles', 'true', 'Auto calculate slot capacity from active vehicles', '2026-07-24 12:16:30.906541+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('min_advance_hours', '5', 'Minimum hours before slot start for customer bookings.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('booking_window_value', '7', 'Numeric part of the customer booking window (paired with booking_window_unit).', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('booking_window_unit', '"days"', 'Unit for booking window: hours | days | weeks.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('booking_window_hours', '168', 'Resolved booking window in hours (synced from value+unit). Default 168 = 7 days.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('max_bookings_per_week', '2', 'Maximum bookings a customer may hold in a calendar week.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('booking_gap_hours', '48', 'Minimum gap in hours between a customer''s bookings.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('allow_same_day_booking', 'true', 'When false, customers cannot book slots that start today (Asia/Kolkata).', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('show_fully_booked_slots', 'false', 'When true, fully booked slots remain visible (disabled) on the booking page.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('show_slots_outside_window', 'true', 'When true, slots outside the booking window are shown as "opens later"; when false they are hidden.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('slot_visibility_mode', '"hide_unavailable"', 'hide_unavailable | disable_unavailable | show_all_with_status', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('holiday_booking_allowed', 'false', 'When false, branch holidays block customer availability for that date.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('cancellation_window_hours', '5', 'Customers may cancel only if more than this many hours remain before slot start.', '2026-07-27 17:14:29.37161+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('social_instagram', '"https://www.instagram.com/kolkatascootytraining"', '', '2026-07-27 19:15:02.904629+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('social_youtube', '"https://www.youtube.com/@kolkatascootytraining"', '', '2026-07-27 19:15:02.904629+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('social_linkedin', '"https://www.linkedin.com/company/kolkata-scooty-bike-training"', 'LinkedIn URL', '2026-07-27 19:15:02.904629+05:30', NULL, NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('contact_phone', '"+91-98765-43210"', '', '2026-07-27 18:38:38.913971+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('contact_email', '"info@kolkatascootytraining.com"', '', '2026-07-27 18:38:38.913971+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('about_text', '"Kolkata Scooty Bike Training helps beginners and returning riders learn scooty and bike skills safely in Kolkata. Women-friendly coaching, certified trainers, and practical road confidence."', '', '2026-07-27 18:59:59.178796+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('footer_copyright', '"© 2026 Kolkata Scooty Bike Training. All rights reserved."', '', '2026-07-27 18:59:59.178796+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('site_name', '"Kolkata Scooty Bike Training"', '', '2026-07-27 19:15:02.904629+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);
INSERT INTO public.settings (key, value, description, updated_at, updated_by, branch_id) VALUES ('site_logo', '"/assets/brand/logo.svg"', '', '2026-07-27 19:15:02.904629+05:30', 'e07500fb-eb5a-4f5d-aa3b-1ff776e95f1a', NULL);


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: -
--

INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('def21216-3f8e-4c44-8c4e-6004d981819f', 'Bike 02', 'Bike', NULL, false, '2026-07-24 17:44:27.554041+05:30', '2026-07-24 17:45:37.74807+05:30', NULL, 1, '64653d86-5b27-4e26-bf91-b771923217c0', 'inactive', 'Bike');
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('b81de30f-ce29-4754-8824-59ef54834a20', 'Scooty 04', 'Scooty', NULL, true, '2026-07-24 17:44:27.557927+05:30', '2026-07-24 17:45:37.749351+05:30', NULL, 2, '25466996-c30d-411e-9011-206511fe901b', 'active', 'Scooty Petrol');
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('b3ec2f06-1bbf-4be8-93b6-f5146112612f', 'Scooty 05', 'Scooty', NULL, true, '2026-07-24 17:44:27.560558+05:30', '2026-07-24 17:45:37.750533+05:30', NULL, 3, '25466996-c30d-411e-9011-206511fe901b', 'active', 'Scooty Electric');
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('1431133b-b219-43f4-95c5-e4391e7e36ab', 'scooty TN93AB1234', 'Scooty', NULL, true, '2026-07-27 11:40:30.271406+05:30', '2026-07-27 11:40:30.271406+05:30', NULL, 1, '64653d86-5b27-4e26-bf91-b771923217c0', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('d2f250a2-76ed-4746-a686-9a2ed58756d1', 'kolkata_bike_training', 'Scooty', NULL, true, '2026-07-27 11:41:06.73984+05:30', '2026-07-27 11:41:06.73984+05:30', NULL, 1, '25466996-c30d-411e-9011-206511fe901b', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('baa6d658-5667-47e9-a48d-018142d8d0f5', 'Electric Scooty 1', 'Scooty', 'Electric scooter for training', true, '2026-07-24 11:40:30.515502+05:30', '2026-07-24 12:00:26.270942+05:30', 'Electric Scooty', 3, '0f1a7b34-0f35-4c7b-a85d-0e1f472884ed', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('febbabb1-4f7f-41ee-b201-e5be044a01db', 'Electric Scooty 2', 'Scooty', 'Electric scooter for training', true, '2026-07-24 11:40:30.515502+05:30', '2026-07-24 12:00:26.270942+05:30', 'Electric Scooty', 3, '0f1a7b34-0f35-4c7b-a85d-0e1f472884ed', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('fceab7ff-fcb0-47ed-854d-05a6fba39dc9', 'Electric Scooty 3', 'Scooty', 'Electric scooter for training', true, '2026-07-24 11:40:30.515502+05:30', '2026-07-24 12:00:26.270942+05:30', 'Electric Scooty', 3, '0f1a7b34-0f35-4c7b-a85d-0e1f472884ed', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('3578c463-1221-4506-b4f0-dcf4dc5f373f', 'Petrol Scooty', 'Scooty', 'Petrol scooter for training', true, '2026-07-24 11:40:30.515502+05:30', '2026-07-24 12:00:26.270942+05:30', 'Petrol Scooty', 1, '0f1a7b34-0f35-4c7b-a85d-0e1f472884ed', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('d051d637-d5a5-4a0a-8d2e-96a0d60177da', 'Scooty', 'Scooty', 'Two-wheeler scooter for training', false, '2026-07-24 11:40:30.341252+05:30', '2026-07-24 12:00:26.270942+05:30', NULL, 1, '0f1a7b34-0f35-4c7b-a85d-0e1f472884ed', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('69f117fb-dada-48ff-98b5-590cf5ba20f0', 'Bike', 'Bike', 'Motorcycle for training', true, '2026-07-24 11:40:30.341252+05:30', '2026-07-27 17:08:46.912001+05:30', 'Bike', 1, '6cd6985a-687f-4133-b4a1-360ba99ac768', 'active', NULL);
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('ecfee21f-bf14-4034-9080-cbff98483fcf', 'Scooty 03', 'Scooty', NULL, true, '2026-07-24 17:44:27.551103+05:30', '2026-07-27 17:45:22.037429+05:30', NULL, 3, '64653d86-5b27-4e26-bf91-b771923217c0', 'active', 'Scooty Electric');
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('c311820f-305a-461e-8523-8f58d0b29347', 'Scooty 01', 'Scooty', NULL, true, '2026-07-24 17:44:27.532622+05:30', '2026-07-24 17:45:37.740754+05:30', NULL, 2, 'b8d78a18-58f3-4608-b009-5eceb63ba307', 'active', 'Scooty Petrol');
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('7ace8d40-c96e-402a-8598-f9fe0cca7c68', 'Scooty 02', 'Scooty', NULL, true, '2026-07-24 17:44:27.54522+05:30', '2026-07-24 17:45:37.743681+05:30', NULL, 2, 'b8d78a18-58f3-4608-b009-5eceb63ba307', 'active', 'Scooty Petrol');
INSERT INTO public.vehicles (id, name, type, description, is_active, created_at, updated_at, vehicle_subtype, max_per_slot, branch_id, operational_status, vehicle_type) VALUES ('50f29903-5b15-455f-b499-52641c15b08b', 'Bike 01', 'Bike', NULL, true, '2026-07-24 17:44:27.548226+05:30', '2026-07-24 17:45:37.745234+05:30', NULL, 1, 'b8d78a18-58f3-4608-b009-5eceb63ba307', 'maintenance', 'Bike');


--
-- PostgreSQL database dump complete
--

\unrestrict aabdwVfVdBTa90qaG57eHIRAtmbfVZbGksSaG4OIydMYscgcRCAHgzMbEO7DSzv


SET session_replication_role = DEFAULT;
UPDATE public.settings SET updated_by = NULL WHERE updated_by IS NOT NULL;
