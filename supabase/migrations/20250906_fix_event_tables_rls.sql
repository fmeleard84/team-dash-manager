-- Migration pour corriger les RLS des tables d'événements après l'unification des IDs
-- Corrige les erreurs 403 sur project_event_attendees et candidate_event_notifications

-- ========================================
-- 1. POLICIES POUR project_event_attendees
-- ========================================

-- Activer RLS
ALTER TABLE project_event_attendees ENABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes policies
DROP POLICY IF EXISTS "Users can view event attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "Users can manage attendees for their events" ON project_event_attendees;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_event_attendees;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON project_event_attendees;
DROP POLICY IF EXISTS "users_view_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "users_update_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "users_delete_event_attendees" ON project_event_attendees;

-- Policy pour voir les participants (tous les utilisateurs authentifiés du projet)
CREATE POLICY "users_view_event_attendees"
ON project_event_attendees FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_events pe
    JOIN projects p ON p.id = pe.project_id
    WHERE pe.id = project_event_attendees.event_id
    AND (
      -- Client propriétaire du projet
      p.owner_id = auth.uid()
      OR
      -- Candidat assigné au projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour insérer des participants (tous les membres du projet)
CREATE POLICY "users_insert_event_attendees"
ON project_event_attendees FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_events pe
    JOIN projects p ON p.id = pe.project_id
    WHERE pe.id = event_id
    AND (
      -- Client propriétaire
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet (peut créer des événements)
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour mettre à jour (répondre à une invitation)
CREATE POLICY "users_update_event_attendees"
ON project_event_attendees FOR UPDATE
TO authenticated
USING (
  -- L'utilisateur peut mettre à jour sa propre participation
  email = (SELECT email FROM profiles WHERE id = auth.uid())
)
WITH CHECK (
  email = (SELECT email FROM profiles WHERE id = auth.uid())
);

-- Policy pour supprimer des participants
CREATE POLICY "users_delete_event_attendees"
ON project_event_attendees FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_events pe
    WHERE pe.id = event_id
    AND pe.created_by = auth.uid()
  )
);

-- ========================================
-- 2. POLICIES POUR project_events (pour que les candidats puissent créer des événements)
-- ========================================

-- Supprimer les anciennes policies sur project_events si elles existent
DROP POLICY IF EXISTS "Users can create events for their projects" ON project_events;
DROP POLICY IF EXISTS "Users can view events for their projects" ON project_events;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON project_events;
DROP POLICY IF EXISTS "project_members_create_events" ON project_events;
DROP POLICY IF EXISTS "project_members_view_events" ON project_events;
DROP POLICY IF EXISTS "event_creators_update_events" ON project_events;
DROP POLICY IF EXISTS "event_creators_delete_events" ON project_events;

-- Policy pour que tous les membres du projet puissent créer des événements
CREATE POLICY "project_members_create_events"
ON project_events FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      -- Client propriétaire
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour voir les événements du projet
CREATE POLICY "project_members_view_events"
ON project_events FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      -- Client propriétaire
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour mettre à jour les événements (créateur ou client)
CREATE POLICY "event_creators_update_events"
ON project_events FOR UPDATE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.owner_id = auth.uid()
  )
)
WITH CHECK (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.owner_id = auth.uid()
  )
);

-- Policy pour supprimer les événements (créateur ou client)
CREATE POLICY "event_creators_delete_events"
ON project_events FOR DELETE
TO authenticated
USING (
  created_by = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND p.owner_id = auth.uid()
  )
);

-- ========================================
-- 3. POLICIES POUR candidate_event_notifications
-- ========================================

-- Activer RLS
ALTER TABLE candidate_event_notifications ENABLE ROW LEVEL SECURITY;

-- Supprimer les anciennes policies
DROP POLICY IF EXISTS "Candidates can view their notifications" ON candidate_event_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON candidate_event_notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON candidate_event_notifications;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON candidate_event_notifications;
DROP POLICY IF EXISTS "candidates_view_own_notifications" ON candidate_event_notifications;
DROP POLICY IF EXISTS "project_members_create_notifications" ON candidate_event_notifications;
DROP POLICY IF EXISTS "candidates_update_own_notifications" ON candidate_event_notifications;
DROP POLICY IF EXISTS "candidates_delete_own_notifications" ON candidate_event_notifications;

-- Policy pour que les candidats voient leurs notifications
CREATE POLICY "candidates_view_own_notifications"
ON candidate_event_notifications FOR SELECT
TO authenticated
USING (candidate_id = auth.uid());

-- Policy pour créer des notifications (tous les membres du projet)
CREATE POLICY "project_members_create_notifications"
ON candidate_event_notifications FOR INSERT
TO authenticated
WITH CHECK (
  -- Vérifier que l'utilisateur fait partie du projet
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      -- Client propriétaire
      p.owner_id = auth.uid()
      OR
      -- Candidat assigné
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour mettre à jour le statut (candidat concerné uniquement)
CREATE POLICY "candidates_update_own_notifications"
ON candidate_event_notifications FOR UPDATE
TO authenticated
USING (candidate_id = auth.uid())
WITH CHECK (candidate_id = auth.uid());

-- Policy pour supprimer (candidat concerné uniquement)
CREATE POLICY "candidates_delete_own_notifications"
ON candidate_event_notifications FOR DELETE
TO authenticated
USING (candidate_id = auth.uid());

-- ========================================
-- 4. VÉRIFIER LES FOREIGN KEYS
-- ========================================

-- Vérifier que candidate_event_notifications pointe vers le bon ID
ALTER TABLE candidate_event_notifications
DROP CONSTRAINT IF EXISTS candidate_event_notifications_candidate_id_fkey CASCADE;

ALTER TABLE candidate_event_notifications
ADD CONSTRAINT candidate_event_notifications_candidate_id_fkey
FOREIGN KEY (candidate_id)
REFERENCES candidate_profiles(id)
ON DELETE CASCADE;

-- ========================================
-- 5. COMMENTAIRES
-- ========================================

COMMENT ON POLICY "users_view_event_attendees" ON project_event_attendees IS 
'Permet aux membres du projet (client et candidats acceptés) de voir les participants aux événements';

COMMENT ON POLICY "users_insert_event_attendees" ON project_event_attendees IS 
'Permet aux membres du projet de créer des invitations aux événements';

COMMENT ON POLICY "candidates_view_own_notifications" ON candidate_event_notifications IS 
'Permet aux candidats de voir leurs propres notifications avec le système d''ID unifié';

COMMENT ON POLICY "project_members_create_notifications" ON candidate_event_notifications IS 
'Permet aux membres du projet de créer des notifications pour les événements';