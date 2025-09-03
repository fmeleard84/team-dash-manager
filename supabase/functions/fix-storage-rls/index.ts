import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

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

    // Créer les politiques directement en utilisant les commandes admin
    const statements = [
      // Supprimer les anciennes politiques
      `DROP POLICY IF EXISTS "storage_upload_for_project_members" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_view_for_project_members" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_update_for_project_members" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_delete_for_project_members" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_upload_simple" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_view_simple" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_update_simple" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_delete_simple" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_allow_upload" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_allow_view" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_allow_update" ON storage.objects`,
      `DROP POLICY IF EXISTS "storage_allow_delete" ON storage.objects`,
      
      // Activer RLS
      `ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY`,
      
      // Créer les nouvelles politiques simples
      `CREATE POLICY "drive_upload_policy" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'project-files' AND name LIKE 'projects/%')`,
      `CREATE POLICY "drive_view_policy" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'project-files' AND name LIKE 'projects/%')`,
      `CREATE POLICY "drive_update_policy" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'project-files' AND name LIKE 'projects/%') WITH CHECK (bucket_id = 'project-files' AND name LIKE 'projects/%')`,
      `CREATE POLICY "drive_delete_policy" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'project-files' AND name LIKE 'projects/%')`
    ];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Exécuter chaque statement
    for (const sql of statements) {
      try {
        // Utiliser l'API REST pour exécuter le SQL
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'POST',
          headers: {
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            query: sql
          })
        });

        const isDropStatement = sql.startsWith('DROP');
        const isCreateStatement = sql.startsWith('CREATE');
        
        if (response.ok || (isDropStatement && response.status === 404)) {
          successCount++;
          if (isCreateStatement) {
            const policyName = sql.match(/"([^"]+)"/)?.[1];
            results.push(`✅ Politique créée: ${policyName}`);
          }
        } else {
          errorCount++;
          console.error(`Erreur SQL: ${sql.substring(0, 50)}...`);
        }
      } catch (e) {
        console.error(`Erreur: ${e.message}`);
        errorCount++;
      }
    }

    // Vérifier les candidats qui devraient avoir accès
    const { data: candidates } = await supabase
      .from('hr_resource_assignments')
      .select(`
        project_id,
        candidate_profiles!inner(
          user_id,
          first_name,
          last_name
        )
      `)
      .eq('booking_status', 'accepted')
      .not('candidate_profiles.user_id', 'is', null)
      .limit(5);

    return new Response(
      JSON.stringify({
        success: successCount > 0,
        message: successCount >= 4 
          ? '✅ Les politiques RLS ont été appliquées avec succès !' 
          : 'Application partielle des politiques',
        details: {
          totalStatements: statements.length,
          successful: successCount,
          failed: errorCount,
          policiesCreated: results
        },
        candidatesWithAccess: candidates?.map(c => ({
          name: `${c.candidate_profiles.first_name} ${c.candidate_profiles.last_name}`,
          project_id: c.project_id
        })) || [],
        instructions: successCount >= 4
          ? ['Les candidats peuvent maintenant uploader des fichiers !', 'Testez l\'upload dans le Drive candidat.']
          : ['Certaines politiques n\'ont pas pu être créées.', 'Essayez d\'exécuter la fonction à nouveau.']
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});