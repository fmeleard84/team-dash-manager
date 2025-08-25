-- Activer le realtime pour la table client_team_members
-- Exécutez ce script dans l'éditeur SQL de Supabase

-- Vérifier si la publication existe déjà
DO $$
BEGIN
    -- Essayer d'ajouter la table à la publication
    ALTER PUBLICATION supabase_realtime ADD TABLE public.client_team_members;
EXCEPTION
    WHEN duplicate_object THEN
        -- La table est déjà dans la publication, c'est OK
        NULL;
END $$;

-- Vérifier que le realtime est bien activé
SELECT 
    schemaname,
    tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
AND tablename = 'client_team_members';