-- ===========================================================================
-- CORRECTION DÉFINITIVE DU TRIGGER PROBLÉMATIQUE
-- À exécuter dans le dashboard Supabase → SQL Editor
-- ===========================================================================

-- 1. DIAGNOSTIC: Voir les triggers actuels
SELECT 
    tgname as trigger_name,
    tgrelid::regclass as table_name,
    tgfoid::regproc as function_name
FROM pg_trigger 
WHERE tgname LIKE '%notification%' OR tgfoid::regproc::text LIKE '%notification%';

-- 2. SUPPRIMER LE TRIGGER PROBLÉMATIQUE
DROP TRIGGER IF EXISTS trigger_create_notifications_on_assignment_change ON public.hr_resource_assignments;
DROP FUNCTION IF EXISTS public.create_notifications_for_assignment();

-- 3. VÉRIFIER LA STRUCTURE DE candidate_notifications
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'candidate_notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. CRÉER UNE FONCTION CORRECTE (si nécessaire)
CREATE OR REPLACE FUNCTION public.create_notifications_for_assignment_fixed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    candidate_record record;
    assignment_record record;
    notification_description text;
BEGIN
    -- Seulement si le statut est "recherche"
    IF NEW.booking_status != 'recherche' THEN
        RETURN NEW;
    END IF;
    
    -- Récupérer les détails du projet et du profil
    SELECT 
        ra.profile_id, ra.seniority, ra.expertises, ra.languages, ra.calculated_price,
        p.id as project_id, p.title as project_title, 
        COALESCE(p.description, 'Description non disponible') as project_description,
        hp.name as profile_name
    INTO assignment_record
    FROM public.hr_resource_assignments ra
    JOIN public.projects p ON ra.project_id = p.id
    JOIN public.hr_profiles hp ON ra.profile_id = hp.id
    WHERE ra.id = NEW.id;

    -- Créer une description complète
    notification_description := format(
        'Poste: %s\nSéniorité: %s\nCompétences: %s\nLangues: %s\nDescription: %s',
        COALESCE(assignment_record.profile_name, 'Non spécifié'),
        COALESCE(assignment_record.seniority, 'Non spécifiée'),
        COALESCE(array_to_string(assignment_record.expertises, ', '), 'Aucune'),
        COALESCE(array_to_string(assignment_record.languages, ', '), 'Aucune'),
        COALESCE(assignment_record.project_description, 'Non disponible')
    );

    -- Créer notifications pour candidats correspondants
    FOR candidate_record IN
        SELECT DISTINCT cp.id as candidate_id
        FROM public.candidate_profiles cp
        WHERE (cp.seniority = assignment_record.seniority OR assignment_record.seniority IS NULL)
        AND (cp.profile_id = assignment_record.profile_id OR assignment_record.profile_id IS NULL)
    LOOP
        -- Vérifier si la notification n'existe pas déjà
        IF NOT EXISTS (
            SELECT 1 FROM public.candidate_notifications
            WHERE candidate_id = candidate_record.candidate_id
            AND project_id = assignment_record.project_id
        ) THEN
            INSERT INTO public.candidate_notifications (
                candidate_id,
                project_id,
                resource_assignment_id,
                title,
                description,
                status
            ) VALUES (
                candidate_record.candidate_id,
                assignment_record.project_id,
                NEW.id,
                'Nouvelle mission: ' || COALESCE(assignment_record.project_title, 'Projet sans titre'),
                notification_description,
                'unread'
            );
        END IF;
    END LOOP;
    
    RETURN NEW;
END;
$$;

-- 5. RECRÉER LE TRIGGER AVEC LA FONCTION CORRIGÉE
CREATE TRIGGER trigger_create_notifications_fixed
    AFTER INSERT OR UPDATE ON public.hr_resource_assignments
    FOR EACH ROW 
    WHEN (NEW.booking_status = 'recherche')
    EXECUTE FUNCTION public.create_notifications_for_assignment_fixed();

-- 6. TEST: Vérifier que tout fonctionne
SELECT 'Migration trigger fix appliquée avec succès' as status;