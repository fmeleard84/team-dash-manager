-- Migration pour ajouter les commentaires et améliorer la structure du wiki

-- 1. Ajouter des colonnes manquantes à wiki_pages pour l'arborescence
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE wiki_pages ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'FileText';

-- Générer les slugs pour les pages existantes
UPDATE wiki_pages 
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- 2. Créer la table pour les commentaires
CREATE TABLE IF NOT EXISTS wiki_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_id UUID NOT NULL REFERENCES wiki_pages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES wiki_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  is_resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_wiki_comments_page_id ON wiki_comments(page_id);
CREATE INDEX idx_wiki_comments_author_id ON wiki_comments(author_id);
CREATE INDEX idx_wiki_comments_parent_id ON wiki_comments(parent_comment_id);
CREATE INDEX idx_wiki_pages_slug ON wiki_pages(project_id, slug);
CREATE INDEX idx_wiki_pages_order ON wiki_pages(project_id, parent_id, display_order);

-- 3. Activer RLS pour les commentaires
ALTER TABLE wiki_comments ENABLE ROW LEVEL SECURITY;

-- Policy pour voir les commentaires (seulement sur les pages visibles)
CREATE POLICY "users_view_wiki_comments"
ON wiki_comments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM wiki_pages wp
    JOIN projects p ON p.id = wp.project_id
    WHERE wp.id = wiki_comments.page_id
    AND (
      -- La page doit être publique ou l'utilisateur en est l'auteur
      wp.is_public = true 
      OR wp.author_id = auth.uid()
    )
    AND (
      -- Et l'utilisateur doit avoir accès au projet
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour créer des commentaires (seulement sur les pages publiques)
CREATE POLICY "users_create_wiki_comments"
ON wiki_comments FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM wiki_pages wp
    JOIN projects p ON p.id = wp.project_id
    WHERE wp.id = page_id
    AND wp.is_public = true -- Seulement sur les pages publiques
    AND (
      p.owner_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
  AND author_id = auth.uid()
);

-- Policy pour mettre à jour ses propres commentaires
CREATE POLICY "users_update_own_comments"
ON wiki_comments FOR UPDATE
TO authenticated
USING (author_id = auth.uid())
WITH CHECK (author_id = auth.uid());

-- Policy pour supprimer ses propres commentaires
CREATE POLICY "users_delete_own_comments"
ON wiki_comments FOR DELETE
TO authenticated
USING (author_id = auth.uid());

-- 4. Activer le realtime pour les commentaires
ALTER PUBLICATION supabase_realtime ADD TABLE wiki_comments;

-- 5. Fonction pour récupérer l'arborescence des pages
CREATE OR REPLACE FUNCTION get_wiki_tree(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  WITH RECURSIVE page_tree AS (
    -- Pages racines visibles
    SELECT 
      wp.*,
      p.first_name || ' ' || p.last_name as author_name,
      0 as level
    FROM wiki_pages wp
    LEFT JOIN profiles p ON p.id = wp.author_id
    WHERE wp.project_id = p_project_id
      AND wp.parent_id IS NULL
      AND (wp.is_public = true OR wp.author_id = p_user_id)
    
    UNION ALL
    
    -- Pages enfants
    SELECT 
      wp.*,
      p.first_name || ' ' || p.last_name as author_name,
      pt.level + 1
    FROM wiki_pages wp
    LEFT JOIN profiles p ON p.id = wp.author_id
    JOIN page_tree pt ON wp.parent_id = pt.id
    WHERE (wp.is_public = true OR wp.author_id = p_user_id)
  )
  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'slug', slug,
      'icon', icon,
      'is_public', is_public,
      'author_id', author_id,
      'author_name', author_name,
      'parent_id', parent_id,
      'display_order', display_order,
      'level', level,
      'created_at', created_at
    ) ORDER BY display_order, created_at
  ) INTO result
  FROM page_tree;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Fonction pour récupérer les pages groupées par auteur
CREATE OR REPLACE FUNCTION get_wiki_pages_by_author(
  p_project_id UUID,
  p_user_id UUID
)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'author_id', author_id,
      'author_name', author_name,
      'author_email', author_email,
      'is_current_user', author_id = p_user_id,
      'pages', pages
    ) ORDER BY 
      CASE WHEN author_id = p_user_id THEN 0 ELSE 1 END,
      author_name
  ) INTO result
  FROM (
    SELECT 
      wp.author_id,
      COALESCE(p.first_name || ' ' || p.last_name, 'Utilisateur') as author_name,
      p.email as author_email,
      json_agg(
        json_build_object(
          'id', wp.id,
          'title', wp.title,
          'slug', wp.slug,
          'icon', wp.icon,
          'is_public', wp.is_public,
          'parent_id', wp.parent_id,
          'display_order', wp.display_order,
          'has_comments', EXISTS(
            SELECT 1 FROM wiki_comments wc 
            WHERE wc.page_id = wp.id
          ),
          'updated_at', wp.updated_at
        ) ORDER BY wp.display_order, wp.created_at
      ) as pages
    FROM wiki_pages wp
    LEFT JOIN profiles p ON p.id = wp.author_id
    WHERE wp.project_id = p_project_id
      AND (wp.is_public = true OR wp.author_id = p_user_id)
    GROUP BY wp.author_id, p.first_name, p.last_name, p.email
  ) grouped_pages;
  
  RETURN COALESCE(result, '[]'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Trigger pour mettre à jour updated_at sur les commentaires
CREATE OR REPLACE FUNCTION update_wiki_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_wiki_comments_updated_at_trigger
BEFORE UPDATE ON wiki_comments
FOR EACH ROW
EXECUTE FUNCTION update_wiki_comments_updated_at();

-- 8. Vue pour faciliter l'affichage des commentaires avec auteurs
CREATE OR REPLACE VIEW wiki_comments_with_authors AS
SELECT 
  wc.*,
  p.first_name || ' ' || p.last_name as author_name,
  p.email as author_email
FROM wiki_comments wc
LEFT JOIN profiles p ON p.id = wc.author_id;

-- Grant nécessaires
GRANT ALL ON wiki_comments TO authenticated;
GRANT ALL ON wiki_comments_with_authors TO authenticated;
GRANT EXECUTE ON FUNCTION get_wiki_tree TO authenticated;
GRANT EXECUTE ON FUNCTION get_wiki_pages_by_author TO authenticated;

-- Commentaires pour documentation
COMMENT ON TABLE wiki_comments IS 'Commentaires sur les pages wiki publiques';
COMMENT ON COLUMN wiki_pages.display_order IS 'Ordre d''affichage dans l''arborescence';
COMMENT ON COLUMN wiki_pages.slug IS 'URL slug pour la navigation';
COMMENT ON COLUMN wiki_pages.icon IS 'Icône Lucide à afficher pour cette page';
COMMENT ON FUNCTION get_wiki_pages_by_author IS 'Retourne les pages wiki groupées par auteur pour l''affichage dans la navigation';

-- Message de confirmation
SELECT 'Migration appliquée: Commentaires et structure améliorée du wiki' as message;