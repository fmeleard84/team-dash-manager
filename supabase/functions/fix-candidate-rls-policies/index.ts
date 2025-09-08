import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("🔧 Application des corrections RLS pour les candidats et leurs projets...");

    // Exécuter la migration SQL directement
    const { data, error } = await supabase.rpc('query', {
      query_text: `
        -- ========================================
        -- ÉTAPE 1: NETTOYER LES ANCIENNES POLICIES
        -- ========================================
        
        DO $$ 
        BEGIN
          -- Supprimer toutes les anciennes policies sur projects
          DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
          DROP POLICY IF EXISTS "Clients can view their projects" ON projects;
          DROP POLICY IF EXISTS "Candidats voient projets où ils sont assignés" ON projects;
          DROP POLICY IF EXISTS "Candidats accèdent à leurs projets acceptés" ON projects;
          DROP POLICY IF EXISTS "Users can view projects they are assigned to" ON projects;
          DROP POLICY IF EXISTS "Enable read access for authenticated users" ON projects;
          DROP POLICY IF EXISTS "Clients voient leurs propres projets" ON projects;
          DROP POLICY IF EXISTS "Candidats voient projets où ils sont acceptés" ON projects;
          DROP POLICY IF EXISTS "Admins voient tous les projets" ON projects;
          
          -- Supprimer toutes les anciennes policies sur hr_resource_assignments
          DROP POLICY IF EXISTS "Candidats voient leurs assignations" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Candidats peuvent voir leurs propres assignations" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Users can view resource assignments for their projects" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Enable read access for authenticated users" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Candidats peuvent accepter/refuser" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Candidats peuvent accepter ou refuser" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Candidats modifient leur statut booking" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Clients voient assignations de leurs projets" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Admins gèrent toutes les assignations" ON hr_resource_assignments;
          
          RAISE NOTICE 'Anciennes policies supprimées';
        END $$;
        
        -- ========================================
        -- ÉTAPE 2: CRÉER LES NOUVELLES POLICIES POUR PROJECTS
        -- ========================================
        
        -- Policy pour les clients (propriétaires)
        CREATE POLICY "clients_full_access_own_projects"
        ON projects FOR ALL
        TO authenticated
        USING (owner_id = auth.uid())
        WITH CHECK (owner_id = auth.uid());
        
        -- Policy pour les candidats assignés et acceptés
        CREATE POLICY "candidates_view_accepted_projects"
        ON projects FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 
            FROM hr_resource_assignments hra
            WHERE hra.project_id = projects.id
              AND hra.candidate_id = auth.uid()
              AND hra.booking_status = 'accepted'
          )
          AND projects.status IN ('attente-team', 'play', 'completed')
        );
        
        -- ========================================
        -- ÉTAPE 3: CRÉER LES POLICIES POUR HR_RESOURCE_ASSIGNMENTS
        -- ========================================
        
        -- Policy pour les clients voir les assignations
        CREATE POLICY "clients_view_project_assignments"
        ON hr_resource_assignments FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = hr_resource_assignments.project_id
            AND p.owner_id = auth.uid()
          )
        );
        
        -- Policy pour les candidats voir leurs assignations
        CREATE POLICY "candidates_view_own_assignments"
        ON hr_resource_assignments FOR SELECT
        TO authenticated
        USING (candidate_id = auth.uid());
        
        -- Policy pour les candidats accepter/refuser
        CREATE POLICY "candidates_update_booking_status"
        ON hr_resource_assignments FOR UPDATE
        TO authenticated
        USING (
          candidate_id = auth.uid()
          AND booking_status = 'recherche'
        )
        WITH CHECK (
          candidate_id = auth.uid()
          AND booking_status IN ('accepted', 'declined')
        );
        
        -- ========================================
        -- ÉTAPE 4: POLICIES POUR TABLES ASSOCIÉES
        -- ========================================
        
        -- Project Events
        DROP POLICY IF EXISTS "Users can view events for their projects" ON project_events;
        DROP POLICY IF EXISTS "Utilisateurs voient événements de leurs projets" ON project_events;
        
        CREATE POLICY "users_view_project_events"
        ON project_events FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_events.project_id
            AND (
              p.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM hr_resource_assignments hra
                WHERE hra.project_id = p.id
                  AND hra.candidate_id = auth.uid()
                  AND hra.booking_status = 'accepted'
                  AND p.status IN ('attente-team', 'play', 'completed')
              )
            )
          )
        );
        
        -- Kanban Columns
        DROP POLICY IF EXISTS "Users can view kanban columns for their projects" ON kanban_columns;
        DROP POLICY IF EXISTS "Utilisateurs voient colonnes kanban de leurs projets" ON kanban_columns;
        
        CREATE POLICY "users_view_kanban_columns"
        ON kanban_columns FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = kanban_columns.project_id
            AND p.status = 'play'
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
        );
        
        -- Kanban Tasks
        DROP POLICY IF EXISTS "Users can view kanban tasks for their projects" ON kanban_tasks;
        DROP POLICY IF EXISTS "Utilisateurs voient tâches kanban de leurs projets" ON kanban_tasks;
        
        CREATE POLICY "users_view_kanban_tasks"
        ON kanban_tasks FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 
            FROM kanban_columns kc
            JOIN projects p ON p.id = kc.project_id
            WHERE kc.id = kanban_tasks.column_id
            AND p.status = 'play'
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
        );
        
        -- Messages
        DROP POLICY IF EXISTS "Users can view messages for their projects" ON messages;
        DROP POLICY IF EXISTS "Utilisateurs voient messages de leurs projets" ON messages;
        
        CREATE POLICY "users_view_project_messages"
        ON messages FOR SELECT
        TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = messages.project_id
            AND p.status = 'play'
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
        );
        
        -- ========================================
        -- ÉTAPE 5: ACTIVER RLS
        -- ========================================
        
        ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hr_resource_assignments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE project_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE kanban_columns ENABLE ROW LEVEL SECURITY;
        ALTER TABLE kanban_tasks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
      `
    });

    if (error) {
      console.error("Erreur lors de l'exécution de la requête:", error);
      throw error;
    }

    console.log("✅ Policies RLS mises à jour avec succès!");

    // Vérifier les résultats
    const { data: testData, error: testError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        project_id,
        booking_status,
        projects!inner(
          title,
          status
        )
      `)
      .eq('booking_status', 'accepted')
      .limit(3);

    const stats = {
      success: true,
      message: "Règles RLS corrigées avec succès",
      policies_created: [
        "projects: clients_full_access_own_projects",
        "projects: candidates_view_accepted_projects",
        "hr_resource_assignments: clients_view_project_assignments",
        "hr_resource_assignments: candidates_view_own_assignments",
        "hr_resource_assignments: candidates_update_booking_status",
        "project_events: users_view_project_events",
        "kanban_columns: users_view_kanban_columns",
        "kanban_tasks: users_view_kanban_tasks",
        "messages: users_view_project_messages"
      ],
      test_cases: testData || [],
      notes: [
        "Les candidats peuvent maintenant voir les projets où ils ont accepté",
        "Seuls les projets 'attente-team', 'play' ou 'completed' sont visibles",
        "Les outils collaboratifs sont limités aux projets 'play'",
        "Les candidats peuvent accepter/refuser les missions en 'recherche'"
      ]
    };

    return new Response(
      JSON.stringify(stats),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Erreur générale:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});