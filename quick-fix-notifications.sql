-- Quick fix pour le problème de notifications
-- ============================================
-- Copier-coller ce SQL directement dans Supabase Dashboard

-- 1. Ajouter les colonnes manquantes
ALTER TABLE candidate_notifications 
ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'general',
ADD COLUMN IF NOT EXISTS title TEXT,
ADD COLUMN IF NOT EXISTS message TEXT,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unread';

-- 2. Vérifier que les colonnes sont bien ajoutées
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'candidate_notifications' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Si tout est ok, l'archivage devrait maintenant fonctionner!