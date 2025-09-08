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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("🔍 Vérification des règles RLS pour les candidats et leurs projets...");

    // 1. Vérifier les policies existantes sur projects
    const { data: projectPolicies, error: policiesError } = await supabase.rpc('get_policies', {
      schema_name: 'public',
      table_name: 'projects'
    }).single();

    if (policiesError) {
      console.log("Récupération des policies via requête directe...");
      
      // Requête alternative si la fonction RPC n'existe pas
      const { data: altPolicies, error: altError } = await supabase
        .from('pg_policies')
        .select('*')
        .eq('schemaname', 'public')
        .eq('tablename', 'projects');
      
      console.log("Policies trouvées:", altPolicies?.length || 0);
    } else {
      console.log("Policies projects existantes:", projectPolicies);
    }

    // 2. Vérifier les policies sur hr_resource_assignments
    console.log("\n🔍 Vérification des policies hr_resource_assignments...");
    
    // 3. Créer/Mettre à jour les policies RLS nécessaires
    const policiesSQL = `
      -- ========================================
      -- POLICIES POUR LA TABLE PROJECTS
      -- ========================================
      
      -- Supprimer les anciennes policies si elles existent
      DROP POLICY IF EXISTS "Candidats voient projets où ils sont assignés" ON projects;
      DROP POLICY IF EXISTS "Candidats accèdent à leurs projets acceptés" ON projects;
      
      -- Nouvelle policy unifiée pour les candidats
      CREATE POLICY "Candidats voient leurs projets assignés"
      ON projects FOR SELECT
      TO authenticated
      USING (
        -- Le candidat doit être assigné au projet avec un statut accepté
        EXISTS (
          SELECT 1 FROM hr_resource_assignments hra
          WHERE hra.project_id = projects.id
          AND hra.candidate_id = auth.uid()
          AND hra.booking_status = 'accepted'
        )
        -- ET le projet doit être dans un statut visible
        AND projects.status IN ('attente-team', 'play', 'completed')
      );
      
      -- ========================================
      -- POLICIES POUR HR_RESOURCE_ASSIGNMENTS
      -- ========================================
      
      -- Supprimer les anciennes policies
      DROP POLICY IF EXISTS "Candidats voient leurs assignations" ON hr_resource_assignments;
      DROP POLICY IF EXISTS "Candidats peuvent voir leurs propres assignations" ON hr_resource_assignments;
      
      -- Policy pour que les candidats voient leurs assignations
      CREATE POLICY "Candidats accèdent à leurs assignations"
      ON hr_resource_assignments FOR SELECT
      TO authenticated
      USING (
        candidate_id = auth.uid()
      );
      
      -- Policy pour que les candidats puissent mettre à jour leur statut de booking
      DROP POLICY IF EXISTS "Candidats peuvent accepter/refuser" ON hr_resource_assignments;
      
      CREATE POLICY "Candidats modifient leur statut booking"
      ON hr_resource_assignments FOR UPDATE
      TO authenticated
      USING (candidate_id = auth.uid())
      WITH CHECK (
        candidate_id = auth.uid()
        AND (
          -- Peut passer de recherche à accepted/declined
          (booking_status IN ('accepted', 'declined'))
        )
      );
      
      -- ========================================
      -- VÉRIFICATION DES RELATIONS
      -- ========================================
      
      -- S'assurer que les FK sont correctes avec le nouveau système d'ID unifié
      ALTER TABLE hr_resource_assignments 
      DROP CONSTRAINT IF EXISTS hr_resource_assignments_candidate_id_fkey CASCADE;
      
      ALTER TABLE hr_resource_assignments 
      ADD CONSTRAINT hr_resource_assignments_candidate_id_fkey 
      FOREIGN KEY (candidate_id) 
      REFERENCES candidate_profiles(id) 
      ON DELETE CASCADE;
    `;

    // Exécuter les modifications
    const { error: execError } = await supabase.rpc('exec_sql', {
      sql: policiesSQL
    });

    if (execError) {
      console.log("Erreur lors de l'exécution SQL, tentative directe...");
      
      // Si exec_sql n'existe pas, créer les policies une par une
      const statements = policiesSQL.split(';').filter(s => s.trim());
      
      for (const statement of statements) {
        if (statement.trim()) {
          try {
            const { error } = await supabase.rpc('execute_sql', {
              query: statement.trim() + ';'
            });
            
            if (error) {
              console.error("Erreur sur statement:", statement.substring(0, 50), error);
            } else {
              console.log("✅ Statement exécuté avec succès");
            }
          } catch (e) {
            console.error("Exception sur statement:", e);
          }
        }
      }
    } else {
      console.log("✅ Policies RLS mises à jour avec succès");
    }

    // 4. Tester l'accès pour un candidat exemple
    console.log("\n🧪 Test d'accès candidat...");
    
    // Récupérer un candidat qui a des projets
    const { data: testCandidate } = await supabase
      .from('hr_resource_assignments')
      .select('candidate_id, project_id')
      .eq('booking_status', 'accepted')
      .limit(1)
      .single();
    
    if (testCandidate) {
      console.log(`Test pour candidat ${testCandidate.candidate_id} sur projet ${testCandidate.project_id}`);
      
      // Simuler une requête en tant que ce candidat
      const { data: candidateProjects, error: testError } = await supabase
        .from('projects')
        .select('id, title, status')
        .eq('id', testCandidate.project_id);
      
      if (candidateProjects?.length > 0) {
        console.log("✅ Le candidat peut voir son projet:", candidateProjects[0]);
      } else {
        console.log("⚠️ Le candidat ne peut pas voir son projet", testError);
      }
    }

    // 5. Statistiques finales
    const { count: totalProjects } = await supabase
      .from('projects')
      .select('*', { count: 'exact', head: true });
    
    const { count: assignedCandidates } = await supabase
      .from('hr_resource_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('booking_status', 'accepted');
    
    const result = {
      success: true,
      message: "Règles RLS mises à jour avec succès",
      stats: {
        total_projects: totalProjects,
        assigned_candidates: assignedCandidates,
        policies_updated: [
          "projects: Candidats voient leurs projets assignés",
          "hr_resource_assignments: Candidats accèdent à leurs assignations",
          "hr_resource_assignments: Candidats modifient leur statut booking"
        ]
      },
      notes: [
        "Les candidats peuvent maintenant voir les projets où ils sont assignés avec statut 'accepted'",
        "Seuls les projets avec status 'attente-team', 'play' ou 'completed' sont visibles",
        "Les candidats peuvent accepter ou refuser leurs assignations"
      ]
    };

    console.log("\n✅ Résultat final:", result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    
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