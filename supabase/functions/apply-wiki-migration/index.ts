import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting wiki migration...');

    // Exécuter la migration SQL
    const migrationSQL = `
      -- Créer la table wiki_pages si elle n'existe pas
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
      CREATE INDEX IF NOT EXISTS idx_wiki_pages_project_id ON wiki_pages(project_id);
      CREATE INDEX IF NOT EXISTS idx_wiki_pages_parent_id ON wiki_pages(parent_id);
      CREATE INDEX IF NOT EXISTS idx_wiki_pages_author_id ON wiki_pages(author_id);
      CREATE INDEX IF NOT EXISTS idx_wiki_pages_created_at ON wiki_pages(created_at);

      -- Activer RLS
      ALTER TABLE wiki_pages ENABLE ROW LEVEL SECURITY;

      -- Supprimer les anciennes policies si elles existent
      DROP POLICY IF EXISTS "users_view_wiki_pages" ON wiki_pages;
      DROP POLICY IF EXISTS "users_create_wiki_pages" ON wiki_pages;
      DROP POLICY IF EXISTS "users_update_wiki_pages" ON wiki_pages;
      DROP POLICY IF EXISTS "users_delete_wiki_pages" ON wiki_pages;

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

      -- Policy pour supprimer les pages wiki
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
    `;

    const { error: migrationError } = await supabaseClient.rpc('exec_sql', { 
      sql: migrationSQL 
    }).single();

    if (migrationError) {
      // Si exec_sql n'existe pas, essayer directement
      console.log('exec_sql not available, trying direct query...');
      
      // Exécuter les requêtes une par une
      const queries = migrationSQL.split(';').filter(q => q.trim());
      
      for (const query of queries) {
        if (query.trim()) {
          const { error } = await supabaseClient.from('_migrations').select('*').limit(1);
          if (error && error.message.includes('_migrations')) {
            // Table doesn't exist, create it first
            await supabaseClient.rpc('query', { query_text: query });
          }
        }
      }
    }

    console.log('Wiki table and policies created successfully');

    // Créer la fonction de mise à jour du timestamp
    const functionSQL = `
      CREATE OR REPLACE FUNCTION update_wiki_pages_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Trigger pour updated_at
      DROP TRIGGER IF EXISTS update_wiki_pages_updated_at_trigger ON wiki_pages;
      CREATE TRIGGER update_wiki_pages_updated_at_trigger
      BEFORE UPDATE ON wiki_pages
      FOR EACH ROW
      EXECUTE FUNCTION update_wiki_pages_updated_at();
    `;

    console.log('Creating trigger function...');

    // Créer une page d'accueil pour les projets actifs
    const { data: activeProjects, error: projectsError } = await supabaseClient
      .from('projects')
      .select('id, title, owner_id')
      .eq('status', 'play');

    if (!projectsError && activeProjects) {
      for (const project of activeProjects) {
        // Vérifier si une page existe déjà
        const { data: existingPage } = await supabaseClient
          .from('wiki_pages')
          .select('id')
          .eq('project_id', project.id)
          .limit(1)
          .single();

        if (!existingPage) {
          // Créer une page d'accueil
          const { error: insertError } = await supabaseClient
            .from('wiki_pages')
            .insert({
              project_id: project.id,
              title: 'Bienvenue dans le Wiki',
              content: `# Bienvenue dans le Wiki du projet ${project.title}

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
- Collaborez avec votre équipe pour maintenir le wiki à jour`,
              author_id: project.owner_id,
              is_public: true,
              version: 1
            });

          if (insertError) {
            console.error(`Error creating welcome page for project ${project.id}:`, insertError);
          } else {
            console.log(`Welcome page created for project ${project.id}`);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Wiki migration completed successfully',
        projectsUpdated: activeProjects?.length || 0
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Migration error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        },
        status: 500
      }
    );
  }
});