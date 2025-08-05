-- Make profile_id nullable in candidate_profiles table since it's no longer used as a foreign key
ALTER TABLE candidate_profiles ALTER COLUMN profile_id DROP NOT NULL;