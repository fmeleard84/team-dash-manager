-- Fix notification description to handle NULL project descriptions

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
    JOIN public.projects p ON ra.project_id = p.id
    JOIN public.hr_profiles hp ON ra.profile_id = hp.id
    WHERE ra.id = NEW.id;

    -- Create notifications for each matching candidate profile
    FOR candidate_record IN
        SELECT DISTINCT cp.id as candidate_id
        FROM public.candidate_profiles cp
        WHERE (cp.seniority = assignment_record.seniority OR assignment_record.seniority IS NULL)
        AND (cp.expertises && assignment_record.expertises OR assignment_record.expertises IS NULL)
        AND (cp.languages && assignment_record.languages OR assignment_record.languages IS NULL)
    LOOP
        INSERT INTO public.candidate_notifications (
            candidate_id,
            project_id,
            resource_assignment_id,
            title,
            description,
            profile_type,
            required_seniority,
            required_expertises,
            required_languages,
            calculated_price
        ) VALUES (
            candidate_record.candidate_id,
            assignment_record.project_id,
            NEW.id,
            'Nouvelle mission: ' || COALESCE(assignment_record.project_title, 'Projet sans titre'),
            COALESCE(assignment_record.project_description, 'Description non disponible'),
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