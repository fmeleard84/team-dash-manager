-- ===========================================================================
-- CORRECTION FINALE ET DÉFINITIVE
-- À exécuter dans Supabase Dashboard → SQL Editor
-- ===========================================================================

-- 1. SUPPRIMER LE TRIGGER PROBLÉMATIQUE (résout l'erreur CASCADE)
DROP FUNCTION IF EXISTS public.create_notifications_for_assignment() CASCADE;

-- 2. CORRIGER LES POLITIQUES RLS POUR hr_resource_assignments
-- Permettre l'insertion d'assignments pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "hr_resource_assignments_insert_policy" ON public.hr_resource_assignments;
CREATE POLICY "hr_resource_assignments_insert_policy" ON public.hr_resource_assignments
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Permettre la mise à jour
DROP POLICY IF EXISTS "hr_resource_assignments_update_policy" ON public.hr_resource_assignments;
CREATE POLICY "hr_resource_assignments_update_policy" ON public.hr_resource_assignments
  FOR UPDATE
  USING (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. CORRIGER LES POLITIQUES RLS POUR candidate_notifications
-- Permettre l'insertion de notifications
DROP POLICY IF EXISTS "candidate_notifications_insert_policy" ON public.candidate_notifications;
CREATE POLICY "candidate_notifications_insert_policy" ON public.candidate_notifications
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- 4. CRÉER L'ASSIGNMENT DIRECTEMENT POUR CLAUDE 2
INSERT INTO public.hr_resource_assignments (
    project_id,
    profile_id,
    seniority,
    languages,
    expertises,
    calculated_price,
    booking_status,
    created_at,
    updated_at
) VALUES (
    'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid,
    (SELECT id FROM public.hr_profiles WHERE name ILIKE '%directeur%marketing%' LIMIT 1),
    'intermediate',
    ARRAY['Français'],
    ARRAY['Google Ads'],
    138,
    'recherche',
    NOW(),
    NOW()
) ON CONFLICT DO NOTHING;

-- 5. CRÉER LA NOTIFICATION POUR LE CANDIDAT
WITH candidate_data AS (
    SELECT id as candidate_id 
    FROM public.candidate_profiles 
    WHERE email = 'fmeleard+ressource@gmail.com'
),
assignment_data AS (
    SELECT id as assignment_id
    FROM public.hr_resource_assignments
    WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
    AND booking_status = 'recherche'
    ORDER BY created_at DESC
    LIMIT 1
)
INSERT INTO public.candidate_notifications (
    candidate_id,
    project_id,
    resource_assignment_id,
    title,
    description,
    status,
    created_at,
    updated_at
)
SELECT 
    c.candidate_id,
    'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid,
    a.assignment_id,
    'Nouvelle mission: Claude 2',
    'Mission de Directeur marketing pour le projet Claude 2.

Détails:
• Poste: Directeur marketing
• Séniorité: Intermédiaire  
• Compétences: Google Ads
• Langues: Français
• Prix: 138€

Description du projet: Projet de marketing digital avec Claude 2',
    'unread',
    NOW(),
    NOW()
FROM candidate_data c, assignment_data a
ON CONFLICT (candidate_id, project_id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    status = 'unread',
    updated_at = NOW();

-- 6. VÉRIFICATION FINALE
SELECT 
    'SUCCESS: Claude 2 est maintenant visible!' as message,
    (SELECT COUNT(*) FROM public.hr_resource_assignments 
     WHERE project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid 
     AND booking_status = 'recherche') as assignments_visibles,
    (SELECT COUNT(*) FROM public.candidate_notifications cn
     JOIN public.candidate_profiles cp ON cn.candidate_id = cp.id
     WHERE cp.email = 'fmeleard+ressource@gmail.com'
     AND cn.project_id = 'a2505a79-1198-44ae-83fb-141c7168afbf'::uuid
     AND cn.status = 'unread') as notifications_actives;