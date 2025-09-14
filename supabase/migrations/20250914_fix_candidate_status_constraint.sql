-- Drop the old constraint if it exists
ALTER TABLE public.candidate_profiles
DROP CONSTRAINT IF EXISTS candidate_profiles_status_check;

-- Add the new constraint with correct values
-- According to CLAUDE.md, valid statuses are: 'qualification', 'disponible', 'en_pause', 'indisponible'
ALTER TABLE public.candidate_profiles
ADD CONSTRAINT candidate_profiles_status_check
CHECK (status IN ('qualification', 'disponible', 'en_pause', 'indisponible'));

-- Update any invalid statuses to a valid default
UPDATE public.candidate_profiles
SET status = 'disponible'
WHERE status IS NULL OR status NOT IN ('qualification', 'disponible', 'en_pause', 'indisponible');

-- Also make sure the column can be null if needed (but default to 'disponible')
ALTER TABLE public.candidate_profiles
ALTER COLUMN status SET DEFAULT 'disponible';