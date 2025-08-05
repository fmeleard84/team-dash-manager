-- Remove the incorrect foreign key constraint on candidate_profiles.profile_id
ALTER TABLE candidate_profiles DROP CONSTRAINT IF EXISTS candidate_profiles_profile_id_fkey;

-- The profile_id column in candidate_profiles should not reference hr_profiles
-- hr_profiles contains job/skill profiles, not user profiles
-- We'll keep the column for now but remove the constraint