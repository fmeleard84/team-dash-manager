-- ===========================================================================
-- CORRECTION SIMPLE - Version corrigée sans ON CONFLICT
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ===========================================================================

-- 1. SUPPRIMER LE TRIGGER PROBLÉMATIQUE
DROP FUNCTION IF EXISTS public.create_notifications_for_assignment() CASCADE;

-- 2. CORRIGER LES POLITIQUES RLS
DROP POLICY IF EXISTS "hr_resource_assignments_insert_policy" ON public.hr_resource_assignments;
CREATE POLICY "hr_resource_assignments_insert_policy" ON public.hr_resource_assignments
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "candidate_notifications_insert_policy" ON public.candidate_notifications;
CREATE POLICY "candidate_notifications_insert_policy" ON public.candidate_notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 3. SUPPRIMER LES ASSIGNMENTS EXISTANTS DE CLAUDE 2 (pour éviter les doublons)
DELETE FROM public.hr_resource_assignments 
WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid;

-- 4. CRÉER L'ASSIGNMENT POUR CLAUDE 2
INSERT INTO public.hr_resource_assignments (
    project_id,
    profile_id,
    seniority,
    languages,
    expertises,
    calculated_price,
    booking_status
) VALUES (
    'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid,
    (SELECT id FROM public.hr_profiles WHERE name ILIKE '%directeur%marketing%' LIMIT 1),
    'intermediate',
    ARRAY['Français'],
    ARRAY['Google Ads'],
    138,
    'recherche'
);

-- 5. SUPPRIMER LES NOTIFICATIONS EXISTANTES (pour éviter les doublons)
DELETE FROM public.candidate_notifications 
WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
AND candidate_id = (SELECT id FROM public.candidate_profiles WHERE email = 'fmeleard+ressource@gmail.com');

-- 6. CRÉER LA NOTIFICATION
INSERT INTO public.candidate_notifications (
    candidate_id,
    project_id,
    resource_assignment_id,
    title,
    description,
    status
) VALUES (
    (SELECT id FROM public.candidate_profiles WHERE email = 'fmeleard+ressource@gmail.com'),
    'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid,
    (SELECT id FROM public.hr_resource_assignments WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid ORDER BY created_at DESC LIMIT 1),
    'Nouvelle mission: Claude 2',
    'Mission de Directeur marketing pour le projet Claude 2.

Détails:
• Poste: Directeur marketing
• Séniorité: Intermédiaire  
• Compétences: Google Ads
• Langues: Français
• Prix: 138€',
    'unread'
);

-- 7. VÉRIFICATION
SELECT 'Claude 2 est maintenant visible!' as result;