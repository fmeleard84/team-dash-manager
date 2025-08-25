-- ====================================================
-- ACTIVEZ LE REALTIME POUR LA TABLE CLIENT_TEAM_MEMBERS
-- ====================================================
-- Exécutez ce script dans Supabase SQL Editor
-- https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql

-- 1. Activer le realtime pour la table
ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;

-- 2. Vérifier que c'est activé
SELECT 
    'Realtime activé pour:' as status,
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'client_team_members';

-- Si vous voyez la table dans les résultats, le realtime est activé !
-- Les nouveaux membres apparaîtront instantanément sans rafraîchir la page.