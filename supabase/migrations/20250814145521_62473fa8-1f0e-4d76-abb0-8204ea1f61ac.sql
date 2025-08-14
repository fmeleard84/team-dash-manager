-- Update the candidate matching function to work with the current data structure
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
    
    -- Return candidates that match the criteria
    -- For now, match all 'resource' type candidates with the required seniority
    -- In a production system, you might want more sophisticated matching
    RETURN QUERY
    SELECT cp.id as candidate_id, cp.email
    FROM public.candidate_profiles cp
    WHERE cp.profile_type::text = 'resource'
    AND cp.seniority::text = assignment_record.seniority::text
    AND (
        -- Check if candidate has at least one required expertise (if specified)
        assignment_record.expertises IS NULL
        OR array_length(assignment_record.expertises, 1) IS NULL
        OR EXISTS (
            SELECT 1 FROM public.candidate_expertises ce
            JOIN public.hr_expertises he ON he.id = ce.expertise_id
            WHERE ce.candidate_id = cp.id
            AND he.name = ANY(assignment_record.expertises)
        )
    )
    AND (
        -- Check if candidate has at least one required language (if specified)
        assignment_record.languages IS NULL
        OR array_length(assignment_record.languages, 1) IS NULL
        OR EXISTS (
            SELECT 1 FROM public.candidate_languages cl
            JOIN public.hr_languages hl ON hl.id = cl.language_id
            WHERE cl.candidate_id = cp.id
            AND hl.name = ANY(assignment_record.languages)
        )
    );
END;
$$;

-- Test the function with the Expert-comptable assignment
SELECT * FROM public.find_matching_candidates('96d02dab-8578-4751-b563-a78edd2c209d');