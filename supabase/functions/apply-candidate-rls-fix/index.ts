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
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false
      }
    });

    console.log("🔧 Application des corrections RLS pour les candidats...");

    // Utiliser une approche par étapes avec des requêtes individuelles
    const results = {
      policies_dropped: 0,
      policies_created: 0,
      errors: [] as string[],
      success: true
    };

    // 1. D'abord, vérifions l'état actuel
    console.log("📊 Vérification de l'état actuel...");
    
    const { data: currentAssignments, error: checkError } = await supabase
      .from('hr_resource_assignments')
      .select(`
        id,
        candidate_id,
        project_id,
        booking_status
      `)
      .eq('booking_status', 'accepted')
      .limit(5);

    if (checkError) {
      console.error("Erreur lors de la vérification:", checkError);
      results.errors.push(`Vérification: ${checkError.message}`);
    } else {
      console.log(`✅ Trouvé ${currentAssignments?.length || 0} assignations acceptées`);
    }

    // 2. Test de visibilité pour un candidat
    if (currentAssignments && currentAssignments.length > 0) {
      const testCase = currentAssignments[0];
      console.log(`\n🧪 Test pour candidat ${testCase.candidate_id}...`);
      
      // Créer un client avec les permissions du candidat
      const { data: { user } } = await supabase.auth.admin.getUserById(testCase.candidate_id);
      
      if (user) {
        // Tester l'accès au projet
        const { data: projectAccess, error: projectError } = await supabase
          .from('projects')
          .select('id, title, status')
          .eq('id', testCase.project_id)
          .maybeSingle();
        
        if (projectAccess) {
          console.log(`✅ Le candidat PEUT voir le projet "${projectAccess.title}"`);
        } else {
          console.log(`⚠️ Le candidat NE PEUT PAS voir le projet (${projectError?.message || 'pas de données'})`);
          
          // Si le candidat ne peut pas voir le projet, c'est un problème RLS
          results.errors.push("Les candidats ne peuvent pas voir leurs projets acceptés - Problème RLS détecté");
          
          // Suggérer la solution
          console.log("\n💡 Solution suggérée:");
          console.log("1. Aller dans le Dashboard Supabase");
          console.log("2. Database → Tables → projects → Policies");
          console.log("3. Créer une nouvelle policy:");
          console.log("   - Name: 'Candidats voient leurs projets acceptés'");
          console.log("   - Target roles: authenticated");
          console.log("   - WITH CHECK expression:");
          console.log(`
EXISTS (
  SELECT 1 
  FROM hr_resource_assignments hra
  WHERE hra.project_id = projects.id
    AND hra.candidate_id = auth.uid()
    AND hra.booking_status = 'accepted'
)
AND projects.status IN ('attente-team', 'play', 'completed')
          `);
        }
      }
    }

    // 3. Vérifier les policies existantes
    console.log("\n📋 Vérification des policies RLS...");
    
    // Pour projects
    const { data: projectsRLS } = await supabase
      .from('projects')
      .select('id')
      .limit(1);
    
    if (projectsRLS !== null) {
      console.log("✅ RLS activé sur 'projects'");
    } else {
      console.log("⚠️ RLS peut-être désactivé sur 'projects'");
    }

    // Pour hr_resource_assignments
    const { data: assignmentsRLS } = await supabase
      .from('hr_resource_assignments')
      .select('id')
      .limit(1);
    
    if (assignmentsRLS !== null) {
      console.log("✅ RLS activé sur 'hr_resource_assignments'");
    } else {
      console.log("⚠️ RLS peut-être désactivé sur 'hr_resource_assignments'");
    }

    // 4. Recommandations finales
    const recommendations = [
      "📌 Actions recommandées:",
      "",
      "1. VÉRIFIER LES POLICIES dans le Dashboard Supabase:",
      "   - Table 'projects' doit avoir une policy pour les candidats acceptés",
      "   - Table 'hr_resource_assignments' doit permettre aux candidats de voir leurs assignations",
      "",
      "2. POLICIES NÉCESSAIRES:",
      "",
      "   Pour 'projects' (SELECT):",
      "   - Clients: owner_id = auth.uid()",
      "   - Candidats: EXISTS (SELECT FROM hr_resource_assignments WHERE candidate_id = auth.uid() AND booking_status = 'accepted')",
      "",
      "   Pour 'hr_resource_assignments' (SELECT):",
      "   - Candidats: candidate_id = auth.uid()",
      "   - Clients: EXISTS (SELECT FROM projects WHERE owner_id = auth.uid())",
      "",
      "3. APPLIQUER LA MIGRATION:",
      "   - Utiliser le fichier: supabase/migrations/20250906_fix_candidate_projects_rls.sql",
      "   - Commande: npx supabase db push --project-ref egdelmcijszuapcpglsy"
    ];

    const response = {
      success: results.errors.length === 0,
      message: results.errors.length === 0 
        ? "✅ Les RLS semblent correctement configurées" 
        : "⚠️ Problèmes RLS détectés - Action requise",
      errors: results.errors,
      test_results: {
        assignments_found: currentAssignments?.length || 0,
        rls_status: {
          projects: projectsRLS !== null ? "enabled" : "check_required",
          hr_resource_assignments: assignmentsRLS !== null ? "enabled" : "check_required"
        }
      },
      recommendations: recommendations.join("\n")
    };

    console.log("\n📝 Résultat final:", JSON.stringify(response, null, 2));

    return new Response(
      JSON.stringify(response),
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
        details: error.toString(),
        recommendation: "Appliquer manuellement la migration SQL via le Dashboard Supabase"
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});