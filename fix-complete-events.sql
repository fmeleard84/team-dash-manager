-- Correctif complet pour les événements
-- Étape 1: Corriger les policies RLS trop strictes
-- Étape 2: Ajouter la contrainte unique manquante

-- ========================================
-- 1. CORRIGER LES POLICIES RLS
-- ========================================

-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "project_members_create_notifications" ON candidate_event_notifications;

-- Créer les nouvelles policies simplifiées
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
-- Cela évite les doublons et permet l'utilisation d'ON CONFLICT
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_email_unique 
UNIQUE (event_id, email);

-- ========================================
-- 3. COMMENTAIRES
-- ========================================

COMMENT ON POLICY "authenticated_users_insert_attendees" ON project_event_attendees IS 
'Policy simplifiée: permet à tous les utilisateurs authentifiés d''insérer des attendees';

COMMENT ON CONSTRAINT project_event_attendees_event_email_unique ON project_event_attendees IS 
'Contrainte unique pour éviter les invitations multiples du même email au même événement';