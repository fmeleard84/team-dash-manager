-- Script de migration des chemins de stockage
-- Ce script migre les anciens chemins 'project/' vers 'projects/'

-- 1. Vérifier combien de fichiers utilisent l'ancien format
SELECT COUNT(*) as fichiers_a_migrer
FROM storage.objects
WHERE bucket_id = 'project-files'
AND name LIKE 'project/%';

-- 2. Afficher un échantillon des fichiers à migrer
SELECT 
    id,
    name as ancien_chemin,
    REPLACE(name, 'project/', 'projects/') as nouveau_chemin,
    created_at
FROM storage.objects
WHERE bucket_id = 'project-files'
AND name LIKE 'project/%'
ORDER BY created_at DESC
LIMIT 20;

-- 3. Effectuer la migration (ATTENTION: cette opération est irréversible)
-- Décommentez la ligne suivante pour exécuter la migration
-- UPDATE storage.objects 
-- SET name = REPLACE(name, 'project/', 'projects/')
-- WHERE bucket_id = 'project-files' 
-- AND name LIKE 'project/%';

-- 4. Vérifier que la migration est complète
SELECT 
    CASE 
        WHEN name LIKE 'project/%' THEN 'Ancien format (à migrer)'
        WHEN name LIKE 'projects/%' THEN 'Nouveau format (OK)'
        ELSE 'Autre format'
    END as format_chemin,
    COUNT(*) as nombre_fichiers
FROM storage.objects
WHERE bucket_id = 'project-files'
GROUP BY 
    CASE 
        WHEN name LIKE 'project/%' THEN 'Ancien format (à migrer)'
        WHEN name LIKE 'projects/%' THEN 'Nouveau format (OK)'
        ELSE 'Autre format'
    END;

-- 5. Créer une fonction pour migrer automatiquement
CREATE OR REPLACE FUNCTION migrate_storage_paths()
RETURNS TABLE(
    migrated_count integer,
    sample_files text[]
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    files_to_migrate text[];
    total_migrated integer;
BEGIN
    -- Récupérer un échantillon des fichiers à migrer
    SELECT array_agg(name) INTO files_to_migrate
    FROM (
        SELECT name 
        FROM storage.objects
        WHERE bucket_id = 'project-files'
        AND name LIKE 'project/%'
        LIMIT 10
    ) t;
    
    -- Effectuer la migration
    UPDATE storage.objects 
    SET name = REPLACE(name, 'project/', 'projects/')
    WHERE bucket_id = 'project-files' 
    AND name LIKE 'project/%';
    
    -- Compter le nombre de fichiers migrés
    GET DIAGNOSTICS total_migrated = ROW_COUNT;
    
    RETURN QUERY
    SELECT total_migrated, files_to_migrate;
END;
$$;

-- Pour exécuter la migration via la fonction :
-- SELECT * FROM migrate_storage_paths();