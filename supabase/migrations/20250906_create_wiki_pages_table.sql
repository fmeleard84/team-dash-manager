-- Migration pour créer la table wiki_pages pour la gestion des notes collaboratives

-- Créer la table wiki_pages
CREATE TABLE IF NOT EXISTS wiki_pages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  parent_id UUID REFERENCES wiki_pages(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_edited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour les performances
CREATE INDEX idx_wiki_pages_project_id ON wiki_pages(project_id);
CREATE INDEX idx_wiki_pages_parent_id ON wiki_pages(parent_id);
CREATE INDEX idx_wiki_pages_author_id ON wiki_pages(author_id);
CREATE INDEX idx_wiki_pages_created_at ON wiki_pages(created_at);

-- Activer RLS
ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;

-- Policy pour voir les pages wiki
CREATE POLICY "users_view_wiki_pages"
ON wiki_pages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = wiki_pages.project_id
    AND (
      -- Client propriétaire du projet
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour créer des pages wiki
CREATE POLICY "users_create_wiki_pages"
ON wiki_pages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      -- Client propriétaire du projet
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
  AND author_id = auth.uid()
);

-- Policy pour mettre à jour les pages wiki
CREATE POLICY "users_update_wiki_pages"
ON wiki_pages FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = wiki_pages.project_id
    AND (
      -- Client propriétaire du projet
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_id
    AND (
      -- Client propriétaire du projet
      p.owner_id = auth.uid()
      OR
      -- Candidat accepté sur le projet
      EXISTS (
        SELECT 1 FROM hr_resource_assignments hra
        WHERE hra.project_id = p.id
        AND hra.candidate_id = auth.uid()
        AND hra.booking_status = 'accepted'
      )
    )
  )
);

-- Policy pour supprimer les pages wiki (auteur ou client propriétaire seulement)
CREATE POLICY "users_delete_wiki_pages"
ON wiki_pages FOR DELETE
TO authenticated
USING (
  -- Auteur de la page ou client propriétaire du projet
  author_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = wiki_pages.project_id
    AND p.owner_id = auth.uid()
  )
);

-- Fonction pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_wiki_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour updated_at
CREATE TRIGGER update_wiki_pages_updated_at_trigger
BEFORE UPDATE ON wiki_pages
FOR EACH ROW
EXECUTE FUNCTION update_wiki_pages_updated_at();

-- Créer une page wiki d'exemple pour chaque projet existant
INSERT INTO wiki_pages (project_id, title, content, author_id, is_public)
SELECT 
  p.id,
  'Bienvenue dans le Wiki',
  '# Bienvenue dans le Wiki du projet

Ce wiki est votre espace de documentation collaboratif pour le projet.

## Fonctionnalités disponibles

- **Créer des pages** : Organisez votre documentation en pages hiérarchiques
- **Édition collaborative** : Tous les membres du projet peuvent contribuer
- **Historique des versions** : Suivez les modifications apportées aux pages
- **Visibilité contrôlée** : Rendez vos pages publiques ou privées

## Comment commencer

1. Cliquez sur "Nouvelle Page" pour créer votre première page
2. Utilisez le format Markdown pour enrichir votre contenu
3. Organisez vos pages en créant des sous-pages
4. Partagez des liens vers des pages spécifiques avec votre équipe

## Bonnes pratiques

- Gardez vos pages bien organisées avec une structure claire
- Utilisez des titres descriptifs
- Mettez à jour régulièrement la documentation
- Collaborez avec votre équipe pour maintenir le wiki à jour',
  p.owner_id,
  true
FROM projects p
WHERE p.status = 'play'
AND NOT EXISTS (
  SELECT 1 FROM wiki_pages wp
  WHERE wp.project_id = p.id
);

-- Commentaire pour la documentation
COMMENT ON TABLE wiki_pages IS 'Table pour stocker les pages wiki des projets (documentation collaborative)';
COMMENT ON COLUMN wiki_pages.project_id IS 'ID du projet auquel appartient cette page wiki';
COMMENT ON COLUMN wiki_pages.title IS 'Titre de la page wiki';
COMMENT ON COLUMN wiki_pages.content IS 'Contenu de la page (format Markdown supporté)';
COMMENT ON COLUMN wiki_pages.parent_id IS 'ID de la page parente pour créer une hiérarchie';
COMMENT ON COLUMN wiki_pages.author_id IS 'ID de l''utilisateur qui a créé la page';
COMMENT ON COLUMN wiki_pages.last_edited_by IS 'ID du dernier utilisateur ayant modifié la page';
COMMENT ON COLUMN wiki_pages.is_public IS 'Indique si la page est visible par tous les membres du projet';
COMMENT ON COLUMN wiki_pages.version IS 'Numéro de version de la page (incrémenté à chaque modification)';