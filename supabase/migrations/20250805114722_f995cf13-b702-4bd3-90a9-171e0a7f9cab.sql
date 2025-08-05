-- Add status column to candidate_profiles
ALTER TABLE public.candidate_profiles 
ADD COLUMN status text NOT NULL DEFAULT 'disponible';

-- Add constraint to ensure valid status values
ALTER TABLE public.candidate_profiles 
ADD CONSTRAINT candidate_profiles_status_check 
CHECK (status IN ('disponible', 'en_pause', 'en_mission'));

-- Update RLS policy to allow candidates to update their own status
CREATE POLICY "Candidates can update their own status" 
ON public.candidate_profiles 
FOR UPDATE 
USING (email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text))
WITH CHECK (email = ((current_setting('request.jwt.claims'::text, true))::json ->> 'email'::text));