-- First, remove duplicate entries in candidate_notifications
DELETE FROM public.candidate_notifications 
WHERE id NOT IN (
    SELECT DISTINCT ON (candidate_id, resource_assignment_id) id
    FROM public.candidate_notifications
    ORDER BY candidate_id, resource_assignment_id, created_at DESC
);

-- Add contextualized columns to candidate_notifications
ALTER TABLE public.candidate_notifications 
ADD COLUMN IF NOT EXISTS profile_type text,
ADD COLUMN IF NOT EXISTS required_seniority text,
ADD COLUMN IF NOT EXISTS required_expertises text[],
ADD COLUMN IF NOT EXISTS required_languages text[],
ADD COLUMN IF NOT EXISTS calculated_price numeric DEFAULT 0;

-- Add unique constraint to prevent duplicate notifications
ALTER TABLE public.candidate_notifications 
ADD CONSTRAINT unique_candidate_resource_assignment 
UNIQUE (candidate_id, resource_assignment_id);

-- Create function to find matching candidates for a resource assignment
CREATE OR REPLACE FUNCTION public.find_matching_candidates(assignment_id uuid)
RETURNS table(candidate_id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    assignment_record record;
BEGIN
    -- Get the resource assignment details
    SELECT ra.profile_id, ra.seniority, ra.expertises, ra.languages, ra.calculated_price,
           hp.name as profile_name
    INTO assignment_record
    FROM public.hr_resource_assignments ra
    JOIN public.hr_profiles hp ON hp.id = ra.profile_id
    WHERE ra.id = assignment_id;
    
    IF assignment_record IS NULL THEN
        RETURN;
    END IF;
    
    -- Return matching candidates
    RETURN QUERY
    SELECT cp.id as candidate_id, cp.email
    FROM public.candidate_profiles cp
    WHERE cp.profile_type::text = assignment_record.profile_name
    AND cp.seniority::text = assignment_record.seniority::text
    AND (
        -- Check if candidate has required expertises
        EXISTS (
            SELECT 1 FROM public.candidate_expertises ce
            JOIN public.hr_expertises he ON he.id = ce.expertise_id
            WHERE ce.candidate_id = cp.id
            AND he.name = ANY(assignment_record.expertises)
        )
        OR assignment_record.expertises IS NULL
        OR array_length(assignment_record.expertises, 1) IS NULL
    )
    AND (
        -- Check if candidate has required languages
        EXISTS (
            SELECT 1 FROM public.candidate_languages cl
            JOIN public.hr_languages hl ON hl.id = cl.language_id
            WHERE cl.candidate_id = cp.id
            AND hl.name = ANY(assignment_record.languages)
        )
        OR assignment_record.languages IS NULL
        OR array_length(assignment_record.languages, 1) IS NULL
    );
END;
$$;