-- Profile phone must stay NOT NULL (already enforced).
-- Allowed: a 10-digit mobile starting with 6-9, or a placeholder
-- starting with GOOGLE_, TRAINER_, or ADMIN_.
-- Idempotent. Replaces an older copy of this constraint.
-- Does not update or delete existing rows.
-- If any row would violate the check, this migration stops and changes nothing.

DO $$
DECLARE
  bad_count integer;
BEGIN
  ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_digits_or_placeholder;

  SELECT COUNT(*)::int INTO bad_count
  FROM profiles
  WHERE phone IS NULL
     OR NOT (
       phone ~ '^(GOOGLE_|TRAINER_|ADMIN_)'
       OR phone ~ '^[6-9][0-9]{9}$'
     );

  IF bad_count > 0 THEN
    RAISE EXCEPTION
      'profiles_phone_digits_or_placeholder: % profile row(s) are not a 10-digit mobile starting with 6-9, or a GOOGLE_, TRAINER_, or ADMIN_ placeholder. Fix those rows, then re-run this migration.',
      bad_count;
  END IF;

  ALTER TABLE profiles
    ADD CONSTRAINT profiles_phone_digits_or_placeholder
    CHECK (
      phone ~ '^(GOOGLE_|TRAINER_|ADMIN_)'
      OR phone ~ '^[6-9][0-9]{9}$'
    );
END $$;
