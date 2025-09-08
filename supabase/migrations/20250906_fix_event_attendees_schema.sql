-- Migration pour corriger le schéma de project_event_attendees
-- Corrige l'incohérence entre le schéma DB et le code TypeScript

-- ========================================
-- 1. VÉRIFIER LA STRUCTURE ACTUELLE
-- ========================================

-- Afficher la structure actuelle pour debug
\d project_event_attendees

-- ========================================
-- 2. AJOUTER LES COLONNES MANQUANTES
-- ========================================

-- Ajouter la colonne 'required' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_event_attendees' 
                   AND column_name = 'required') THEN
        ALTER TABLE project_event_attendees ADD COLUMN required BOOLEAN DEFAULT true;
        COMMENT ON COLUMN project_event_attendees.required IS 'Indique si la participation est requise ou optionnelle';
    END IF;
END $$;

-- Ajouter la colonne 'updated_at' si elle n'existe pas
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'project_event_attendees' 
                   AND column_name = 'updated_at') THEN
        ALTER TABLE project_event_attendees ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        COMMENT ON COLUMN project_event_attendees.updated_at IS 'Date de dernière mise à jour';
    END IF;
END $$;

-- ========================================
-- 3. RENOMMER LES COLONNES EXISTANTES
-- ========================================

-- Renommer 'status' en 'response_status' si nécessaire
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'project_event_attendees' 
               AND column_name = 'status') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'project_event_attendees' 
                    AND column_name = 'response_status') THEN
        ALTER TABLE project_event_attendees RENAME COLUMN status TO response_status;
        COMMENT ON COLUMN project_event_attendees.response_status IS 'Statut de réponse: pending, accepted, declined';
    END IF;
END $$;

-- ========================================
-- 4. CRÉER UN TRIGGER POUR updated_at
-- ========================================

-- Fonction pour auto-update de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Créer le trigger si il n'existe pas
DROP TRIGGER IF EXISTS update_project_event_attendees_updated_at ON project_event_attendees;
CREATE TRIGGER update_project_event_attendees_updated_at 
    BEFORE UPDATE ON project_event_attendees 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. METTRE À JOUR LES DONNÉES EXISTANTES
-- ========================================

-- Mettre à jour les enregistrements existants avec des valeurs par défaut
UPDATE project_event_attendees 
SET 
    required = COALESCE(required, true),
    updated_at = COALESCE(updated_at, created_at)
WHERE required IS NULL OR updated_at IS NULL;

-- ========================================
-- 6. VÉRIFIER LA CONTRAINTE UNIQUE
-- ========================================

-- S'assurer que la contrainte unique existe (pour éviter l'erreur ON CONFLICT)
ALTER TABLE project_event_attendees 
DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

ALTER TABLE project_event_attendees 
ADD CONSTRAINT project_event_attendees_event_email_unique 
UNIQUE (event_id, email);

-- ========================================
-- 7. AFFICHER LA STRUCTURE FINALE
-- ========================================

\d project_event_attendees

-- Message de confirmation
SELECT 'Schema project_event_attendees corrigé avec succès!' as status;