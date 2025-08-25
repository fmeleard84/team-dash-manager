-- Fix notification description to handle NULL project descriptions
-- AND prevent duplicate notifications on simple updates

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
    -- For UPDATE operations, only process if status CHANGES to 'recherche'
    IF TG_OP = 'UPDATE' THEN
        IF OLD.booking_status = NEW.booking_status THEN
            -- Status didn't change, skip notification creation
            RETURN NEW;
        END IF;
    END IF;
    
    -- Only process if NEW status is 'recherche'
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
        -- Check if notification doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM public.candidate_notifications
            WHERE candidate_id = candidate_record.candidate_id
            AND resource_assignment_id = NEW.id
        ) THEN
            INSERT INTO public.candidate_notifications (
                candidate_id,
                project_id,
                resource_assignment_id,
                title,
                description
            ) VALUES (
                candidate_record.candidate_id,
                assignment_record.project_id,
                NEW.id,
                'Nouvelle mission: ' || COALESCE(assignment_record.project_title, 'Projet sans titre'),
                COALESCE(
                    'Poste: ' || assignment_record.profile_name || 
                    E'\nSéniorité: ' || COALESCE(assignment_record.seniority, 'Non spécifiée') ||
                    E'\nDescription: ' || COALESCE(assignment_record.project_description, 'Non disponible'),
                    'Description non disponible'
                )
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;