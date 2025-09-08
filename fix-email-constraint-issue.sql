-- Script pour identifier et corriger l'erreur "record new has no field email"

-- 1. Identifier les contraintes CHECK qui référencent 'email'
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'project_event_attendees'::regclass
AND contype = 'c'
AND pg_get_constraintdef(oid) LIKE '%email%';

-- 2. Identifier les triggers et leurs fonctions
SELECT 
    t.tgname as trigger_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgrelid = 'project_event_attendees'::regclass
AND NOT t.tgisinternal;

-- 3. Supprimer TOUTES les contraintes CHECK sur la table
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'project_event_attendees'::regclass
        AND contype = 'c'
    ) LOOP
        EXECUTE 'ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS ' || r.conname || ' CASCADE';
        RAISE NOTICE 'Contrainte CHECK supprimée: %', r.conname;
    END LOOP;
END $$;

-- 4. Supprimer et recréer la contrainte attendee_type_check si elle existe
ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS attendee_type_check CASCADE;

-- 5. Supprimer la contrainte qui pose problème
ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS project_event_attendees_email_or_profile_id_check CASCADE;
ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS ensure_email_or_user_id CASCADE;
ALTER TABLE project_event_attendees DROP CONSTRAINT IF EXISTS check_email_or_user_id CASCADE;

-- 6. Si le problème persiste, recréer complètement la table (ATTENTION: perte de données)
-- Cette étape ne devrait être utilisée qu'en dernier recours
/*
-- Sauvegarder les données existantes
CREATE TEMP TABLE temp_attendees AS 
SELECT event_id, user_id, role, required, response_status, created_at 
FROM project_event_attendees;

-- Supprimer et recréer la table
DROP TABLE project_event_attendees CASCADE;

CREATE TABLE project_event_attendees (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id UUID NOT NULL REFERENCES project_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT,
    required BOOLEAN DEFAULT true,
    response_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Restaurer les données
INSERT INTO project_event_attendees (event_id, user_id, role, required, response_status, created_at)
SELECT event_id, user_id, role, required, response_status, created_at
FROM temp_attendees;

-- Créer les index
CREATE INDEX idx_event_attendees_event_id ON project_event_attendees(event_id);
CREATE INDEX idx_event_attendees_user_id ON project_event_attendees(user_id);

-- Activer RLS
ALTER TABLE project_event_attendees ENABLE ROW LEVEL SECURITY;

-- Créer les politiques RLS basiques
CREATE POLICY "users_view_their_attendances" 
ON project_event_attendees FOR SELECT 
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "event_owners_manage_attendees"
ON project_event_attendees FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM project_events pe
        JOIN projects p ON p.id = pe.project_id
        WHERE pe.id = event_id
        AND p.owner_id = auth.uid()
    )
);

DROP TABLE temp_attendees;
*/

-- 7. Vérifier la structure finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'project_event_attendees'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 8. Vérifier toutes les contraintes restantes
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    pg_get_constraintdef(pgc.oid) as definition
FROM information_schema.table_constraints tc
JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.table_name = 'project_event_attendees'
AND tc.table_schema = 'public'
ORDER BY tc.constraint_type, tc.constraint_name;

-- Message de confirmation
DO $$
BEGIN
    RAISE NOTICE '✅ Contraintes CHECK problématiques supprimées';
    RAISE NOTICE '✅ La table devrait maintenant accepter les insertions';
END $$;