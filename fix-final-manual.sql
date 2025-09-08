-- SOLUTION FINALE MANUELLE pour project_event_attendees
-- À exécuter dans le Dashboard Supabase

-- ========================================
-- 1. CORRIGER LE SCHÉMA (colonnes manquantes)
-- ========================================

-- Ajouter required si manquante
ALTER TABLE project_event_attendees 
ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;

-- Ajouter response_status si manquante (ou renommer status)
DO $$ 
BEGIN
    -- Si 'status' existe mais pas 'response_status', renommer
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'project_event_attendees' AND column_name = 'status')
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'project_event_attendees' AND column_name = 'response_status') THEN
        ALTER TABLE project_event_attendees RENAME COLUMN status TO response_status;
    -- Sinon, ajouter response_status si elle n'existe pas du tout
    ELSIF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                      WHERE table_name = 'project_event_attendees' AND column_name = 'response_status') THEN
        ALTER TABLE project_event_attendees ADD COLUMN response_status TEXT DEFAULT 'pending';
    END IF;
END $$;

-- Ajouter updated_at si manquante
ALTER TABLE project_event_attendees 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ========================================
-- 2. AJOUTER LA CONTRAINTE UNIQUE
-- ========================================

-- Supprimer l'ancienne contrainte si elle existe
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

-- Ajouter la contrainte unique (nécessaire pour ON CONFLICT)
ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_email_unique 
UNIQUE (event_id, email);

-- ========================================
-- 3. CORRIGER LES POLICIES RLS (très permissives)
-- ========================================

-- Supprimer TOUTES les policies existantes
DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "authenticated_users_insert_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "users_view_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "users_update_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "users_delete_event_attendees" ON project_event_attendees;
DROP POLICY IF EXISTS "attendees_all_operations" ON project_event_attendees;

-- Créer UNE SEULE policy très permissive pour tous les opérations
CREATE POLICY "attendees_full_access"
ON project_event_attendees FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ========================================
-- 4. VÉRIFICATIONS
-- ========================================

-- Afficher la structure finale
SELECT 
    column_name, 
    data_type, 
    is_nullable, 
    column_default
FROM information_schema.columns 
WHERE table_name = 'project_event_attendees'
ORDER BY ordinal_position;

-- Afficher les contraintes
SELECT 
    constraint_name, 
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name = 'project_event_attendees';

-- Message de confirmation
SELECT '✅ CORRECTION FINALE APPLIQUÉE - Testez maintenant la création d''événement!' as status;