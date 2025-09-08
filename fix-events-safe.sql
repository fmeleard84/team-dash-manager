-- Correctif sécurisé pour les événements
-- Version qui ne crée que ce qui n'existe pas

-- ========================================
-- 1. CORRIGER LES POLICIES RLS (sécurisé)
-- ========================================

-- Supprimer TOUTES les policies existantes d'abord
DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "authenticated_users_insert_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "project_members_create_notifications" ON candidate_event_notifications;
DROP POLICY IF EXISTS "authenticated_users_create_notifications" ON candidate_event_notifications;

-- Créer les nouvelles policies (maintenant safe car tout est supprimé)
CREATE POLICY "authenticated_users_insert_attendees" 
ON project_event_attendees FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "authenticated_users_create_notifications"
ON candidate_event_notifications FOR INSERT  
TO authenticated
WITH CHECK (true);

-- ========================================
-- 2. AJOUTER LA CONTRAINTE UNIQUE
-- ========================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

-- Ajouter la contrainte unique sur (event_id, email)
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_email_unique 
UNIQUE (event_id, email);

-- Message de confirmation
SELECT 'Correctif appliqué avec succès!' as status;