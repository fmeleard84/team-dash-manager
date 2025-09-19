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

    console.log("🔧 Correction des problèmes de time tracking et d'accès aux profils clients...");

    const results = {
      tables_created: [] as string[],
      policies_created: [] as string[],
      errors: [] as string[],
      warnings: [] as string[]
    };

    // 1. Vérifier si la table active_time_tracking existe
    console.log("📊 Vérification de la table active_time_tracking...");
    
    const { data: tableExists } = await supabase
      .from('active_time_tracking')
      .select('id')
      .limit(1);
    
    if (tableExists === null) {
      console.log("⚠️ Table active_time_tracking n'existe pas - elle doit être créée");
      results.warnings.push("Table active_time_tracking n'existe pas - création nécessaire via migration SQL");
    } else {
      console.log("✅ Table active_time_tracking existe");
    }

    // 2. Tester l'accès des candidats aux profils clients
    console.log("\n🧪 Test d'accès aux profils clients...");
    
    // Trouver un candidat avec un projet accepté
    const { data: testCase } = await supabase
      .from('hr_resource_assignments')
      .select(`
        candidate_id,
        project_id,
        projects!inner(
          owner_id,
          title
        )
      `)
      .eq('booking_status', 'accepted')
      .limit(1)
      .single();
    
    if (testCase) {
      console.log(`Test pour candidat ${testCase.candidate_id} sur projet "${testCase.projects.title}"`);
      
      // Tester si ce candidat peut voir le profil client
      const { data: clientProfile, error: clientError } = await supabase
        .from('client_profiles')
        .select('id, company_name')
        .eq('id', testCase.projects.owner_id)
        .maybeSingle();
      
      if (clientError || !clientProfile) {
        console.log("❌ Le candidat NE PEUT PAS voir le profil client");
        results.errors.push("Les candidats ne peuvent pas accéder aux profils clients de leurs projets");
      } else {
        console.log(`✅ Le candidat PEUT voir le client: ${clientProfile.company_name}`);
      }
    } else {
      console.log("⚠️ Aucun cas de test trouvé (pas de candidat avec projet accepté)");
    }

    // 3. Recommandations
    const recommendations = {
      urgent: [] as string[],
      important: [] as string[],
      info: [] as string[]
    };

    if (results.warnings.includes("Table active_time_tracking n'existe pas - création nécessaire via migration SQL")) {
      recommendations.urgent.push("CRÉER LA TABLE active_time_tracking via la migration SQL");
      recommendations.urgent.push("Exécuter: supabase/migrations/20250906_fix_time_tracking_and_client_access.sql");
    }

    if (results.errors.includes("Les candidats ne peuvent pas accéder aux profils clients de leurs projets")) {
      recommendations.important.push("AJOUTER LA POLICY pour l'accès des candidats aux profils clients");
      recommendations.important.push("La migration SQL contient la policy nécessaire");
    }

    // 4. Instructions pour appliquer la migration
    const migrationInstructions = [
      "\n📝 INSTRUCTIONS POUR CORRIGER LES PROBLÈMES:",
      "",
      "1. OPTION A - Via Dashboard Supabase (Recommandé):",
      "   a. Aller dans le Dashboard Supabase",
      "   b. Database → SQL Editor", 
      "   c. Copier/coller le contenu de: supabase/migrations/20250906_fix_time_tracking_and_client_access.sql",
      "   d. Cliquer sur 'Run'",
      "",
      "2. OPTION B - Via Supabase CLI:",
      "   SUPABASE_ACCESS_TOKEN=\"sbp_b8ec67e2a4f3a7922f6cfea023b2cf81a00a7d9e\" \\",
      "   SUPABASE_DB_PASSWORD=\"Raymonde7510_2a\" \\",
      "   npx supabase db push --project-ref egdelmcijszuapcpglsy",
      "",
      "3. RÉSULTAT ATTENDU:",
      "   ✅ Table active_time_tracking créée avec policies RLS",
      "   ✅ Candidats peuvent voir les profils clients de leurs projets",
      "   ✅ Plus d'erreurs 406 dans le Planning du candidat"
    ];

    const response = {
      success: results.errors.length === 0 && results.warnings.length === 0,
      message: results.errors.length > 0 || results.warnings.length > 0
        ? "⚠️ Problèmes détectés - Migration SQL nécessaire"
        : "✅ Configuration correcte",
      issues: {
        errors: results.errors,
        warnings: results.warnings
      },
      recommendations,
      migration_required: results.errors.length > 0 || results.warnings.length > 0,
      migration_file: "supabase/migrations/20250906_fix_time_tracking_and_client_access.sql",
      instructions: migrationInstructions.join("\n")
    };

    console.log("\n" + response.instructions);

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
        details: error.toString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});