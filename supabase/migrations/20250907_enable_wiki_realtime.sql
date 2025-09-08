-- Migration pour activer le realtime sur la table wiki_pages
-- Cela permettra la synchronisation en temps réel des pages entre les membres de l'équipe

-- 1. Activer la réplication pour la table wiki_pages
ALTER PUBLICATION supabase_realtime ADD TABLE wiki_pages;

-- 2. S'assurer que les triggers de mise à jour sont en place
CREATE OR REPLACE FUNCTION update_wiki_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recréer le trigger au cas où
DROP TRIGGER IF EXISTS update_wiki_pages_updated_at_trigger ON wiki_pages;
CREATE TRIGGER update_wiki_pages_updated_at_trigger
BEFORE UPDATE ON wiki_pages
FOR EACH ROW
EXECUTE FUNCTION update_wiki_pages_updated_at();

-- 3. Créer une fonction pour notifier les changements de visibilité
CREATE OR REPLACE FUNCTION notify_wiki_visibility_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Notifier uniquement si la visibilité change
  IF OLD.is_public IS DISTINCT FROM NEW.is_public THEN
    PERFORM pg_notify(
      'wiki_visibility_change',
      json_build_object(
        'project_id', NEW.project_id,
        'page_id', NEW.id,
        'is_public', NEW.is_public,
        'author_id', NEW.author_id,
        'title', NEW.title
      )::text
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour les changements de visibilité
DROP TRIGGER IF EXISTS wiki_visibility_change_trigger ON wiki_pages;
CREATE TRIGGER wiki_visibility_change_trigger
AFTER UPDATE ON wiki_pages
FOR EACH ROW
EXECUTE FUNCTION notify_wiki_visibility_change();

-- 4. Optimiser les index pour les requêtes realtime
DROP INDEX IF EXISTS idx_wiki_pages_project_visibility;
CREATE INDEX idx_wiki_pages_project_visibility ON wiki_pages(project_id, is_public, author_id);

-- 5. Ajouter une colonne pour le suivi des renommages (si elle n'existe pas)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'wiki_pages' 
                 AND column_name = 'original_title') THEN
    ALTER TABLE wiki_pages ADD COLUMN original_title TEXT;
  END IF;
END $$;

-- 6. Fonction pour l'historique des modifications
CREATE OR REPLACE FUNCTION track_wiki_page_changes()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le titre change, stocker l'ancien titre
  IF OLD.title IS DISTINCT FROM NEW.title AND OLD.original_title IS NULL THEN
    NEW.original_title = OLD.title;
  END IF;
  
  -- Incrémenter la version
  NEW.version = COALESCE(OLD.version, 0) + 1;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger pour tracker les changements
DROP TRIGGER IF EXISTS track_wiki_changes_trigger ON wiki_pages;
CREATE TRIGGER track_wiki_changes_trigger
BEFORE UPDATE ON wiki_pages
FOR EACH ROW
EXECUTE FUNCTION track_wiki_page_changes();

-- 7. Vue pour les pages visibles par utilisateur (pour optimiser les requêtes)
CREATE OR REPLACE VIEW wiki_pages_visible AS
SELECT 
  wp.*,
  p.title as project_title,
  p.owner_id as project_owner_id
FROM wiki_pages wp
JOIN projects p ON p.id = wp.project_id
WHERE p.status = 'play';

-- 8. Fonction pour récupérer les pages visibles pour un utilisateur
CREATE OR REPLACE FUNCTION get_visible_wiki_pages(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS SETOF wiki_pages AS $$
BEGIN
  RETURN QUERY
  SELECT wp.*
  FROM wiki_pages wp
  WHERE wp.project_id = p_project_id
    AND (
      wp.is_public = true 
      OR wp.author_id = p_user_id
      OR EXISTS (
        SELECT 1 FROM projects p 
        WHERE p.id = wp.project_id 
        AND p.owner_id = p_user_id
      )
    )
  ORDER BY wp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Grant nécessaires pour le realtime
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON wiki_pages TO authenticated;
GRANT SELECT ON wiki_pages TO anon;

-- 10. Commenter pour documentation
COMMENT ON FUNCTION notify_wiki_visibility_change() IS 'Notifie les changements de visibilité des pages wiki pour synchronisation realtime';
COMMENT ON FUNCTION track_wiki_page_changes() IS 'Track les modifications des pages wiki incluant les renommages';
COMMENT ON FUNCTION get_visible_wiki_pages(UUID, UUID) IS 'Retourne les pages wiki visibles pour un utilisateur donné';

-- Message de confirmation
SELECT 'Realtime activé pour wiki_pages. Les changements seront synchronisés en temps réel.' as message;