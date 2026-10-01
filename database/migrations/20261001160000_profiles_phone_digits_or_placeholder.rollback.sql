-- Removes the profile phone format check. Does not change stored phone values.
-- TRAINER_ and ADMIN_ placeholders are left in place. Putting back an older
-- check that allows only GOOGLE_ or any 10 digits would reject those rows.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_phone_digits_or_placeholder;
