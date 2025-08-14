-- Add contextualized columns to candidate_notifications
ALTER TABLE public.candidate_notifications 
ADD COLUMN profile_type text,
ADD COLUMN required_seniority text,
ADD COLUMN required_expertises text[],
ADD COLUMN required_languages text[],
ADD COLUMN calculated_price numeric DEFAULT 0;

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

-- Create function to automatically create notifications for resource assignments
CREATE OR REPLACE FUNCTION public.create_notifications_for_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    candidate_record record;
    assignment_record record;
    profile_record record;
BEGIN
    -- Only process if status is 'recherche'
    IF NEW.booking_status != 'recherche' THEN
        RETURN NEW;
    END IF;
    
    -- Get assignment and profile details
    SELECT ra.profile_id, ra.seniority, ra.expertises, ra.languages, ra.calculated_price,
           p.id as project_id, p.title as project_title, p.description as project_description,
           hp.name as profile_name
    INTO assignment_record
    FROM public.hr_resource_assignments ra
    JOIN public.projects p ON p.id = ra.project_id
    JOIN public.hr_profiles hp ON hp.id = ra.profile_id
    WHERE ra.id = NEW.id;
    
    -- Find and create notifications for matching candidates
    FOR candidate_record IN 
        SELECT * FROM public.find_matching_candidates(NEW.id)
    LOOP
        INSERT INTO public.candidate_notifications (
            candidate_id,
            project_id,
            resource_assignment_id,
            title,
            description,
            status,
            profile_type,
            required_seniority,
            required_expertises,
            required_languages,
            calculated_price
        ) VALUES (
            candidate_record.candidate_id,
            assignment_record.project_id,
            NEW.id,
            'Nouvelle mission: ' || assignment_record.project_title,
            assignment_record.project_description,
            'unread',
            assignment_record.profile_name,
            assignment_record.seniority::text,
            assignment_record.expertises,
            assignment_record.languages,
            assignment_record.calculated_price
        )
        ON CONFLICT (candidate_id, resource_assignment_id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            profile_type = EXCLUDED.profile_type,
            required_seniority = EXCLUDED.required_seniority,
            required_expertises = EXCLUDED.required_expertises,
            required_languages = EXCLUDED.required_languages,
            calculated_price = EXCLUDED.calculated_price,
            updated_at = now();
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- Create trigger for automatic notification creation
DROP TRIGGER IF EXISTS create_notifications_on_assignment ON public.hr_resource_assignments;
CREATE TRIGGER create_notifications_on_assignment
    AFTER INSERT OR UPDATE ON public.hr_resource_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.create_notifications_for_assignment();

-- Add unique constraint to prevent duplicate notifications
ALTER TABLE public.candidate_notifications 
DROP CONSTRAINT IF EXISTS unique_candidate_resource_assignment;
ALTER TABLE public.candidate_notifications 
ADD CONSTRAINT unique_candidate_resource_assignment 
UNIQUE (candidate_id, resource_assignment_id);

-- Backfill existing notifications for current resource assignments
INSERT INTO public.candidate_notifications (
    candidate_id,
    project_id,
    resource_assignment_id,
    title,
    description,
    status,
    profile_type,
    required_seniority,
    required_expertises,
    required_languages,
    calculated_price
)
SELECT 
    mc.candidate_id,
    ra.project_id,
    ra.id,
    'Nouvelle mission: ' || p.title,
    p.description,
    'unread',
    hp.name,
    ra.seniority::text,
    ra.expertises,
    ra.languages,
    ra.calculated_price
FROM public.hr_resource_assignments ra
JOIN public.projects p ON p.id = ra.project_id
JOIN public.hr_profiles hp ON hp.id = ra.profile_id
CROSS JOIN LATERAL public.find_matching_candidates(ra.id) mc
WHERE ra.booking_status = 'recherche'
ON CONFLICT (candidate_id, resource_assignment_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    profile_type = EXCLUDED.profile_type,
    required_seniority = EXCLUDED.required_seniority,
    required_expertises = EXCLUDED.required_expertises,
    required_languages = EXCLUDED.required_languages,
    calculated_price = EXCLUDED.calculated_price,
    updated_at = now();