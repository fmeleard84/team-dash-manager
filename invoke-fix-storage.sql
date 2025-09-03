-- Script pour invoquer la fonction de correction RLS
-- À exécuter dans le Dashboard SQL Editor

-- Méthode 1: Via HTTP (nécessite extension http)
-- CREATE EXTENSION IF NOT EXISTS http;
-- SELECT http_post(
--   'https://egdelmcijszuapcpglsy.supabase.co/functions/v1/fix-storage-rls-policies',
--   '{}',
--   'application/json'
-- );

-- Méthode 2: Utiliser directement les commandes SQL dans le Dashboard
-- IMPORTANT: Exécutez ces instructions DANS L'INTERFACE WEB de Supabase

-- Allez dans Dashboard > Storage > Policies
-- OU Dashboard > Authentication > Policies > storage.objects

-- Si vous ne trouvez pas ces options, utilisez l'URL directe:
-- https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/auth/policies

-- Ensuite:
-- 1. Cherchez la table "storage.objects"
-- 2. Cliquez sur "New Policy" ou "Add Policy"
-- 3. Créez ces 4 politiques:

/*
=====================================
POLITIQUE 1: Nom = storage_upload_simple
Operation = INSERT
Roles = authenticated
=====================================
WITH CHECK:
bucket_id = 'project-files' AND name LIKE 'projects/%'

=====================================
POLITIQUE 2: Nom = storage_view_simple
Operation = SELECT
Roles = authenticated
=====================================
USING:
bucket_id = 'project-files' AND name LIKE 'projects/%'

=====================================
POLITIQUE 3: Nom = storage_update_simple
Operation = UPDATE
Roles = authenticated
=====================================
USING:
bucket_id = 'project-files' AND name LIKE 'projects/%'

WITH CHECK:
bucket_id = 'project-files' AND name LIKE 'projects/%'

=====================================
POLITIQUE 4: Nom = storage_delete_simple
Operation = DELETE
Roles = authenticated
=====================================
USING:
bucket_id = 'project-files' AND name LIKE 'projects/%'
*/

-- Ces politiques SIMPLES permettront à TOUS les utilisateurs authentifiés
-- d'accéder aux fichiers dans projects/
-- C'est temporaire pour débloquer rapidement

-- Une fois que ça marche, on pourra affiner avec les conditions spécifiques
-- pour vérifier les candidats acceptés