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
    
    IF assignment_record IS NULL THEN
        RETURN NEW;
    END IF;
    
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