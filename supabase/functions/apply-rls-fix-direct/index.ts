import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('🔧 Application directe correction RLS hr_resource_assignments')
    
    // Supprimer et recréer les politiques RLS
    const sqlCommands = [
      // Supprimer toutes les politiques existantes
      "DROP POLICY IF EXISTS \"hr_resource_assignments_select\" ON hr_resource_assignments;",
      "DROP POLICY IF EXISTS \"hr_resource_assignments_read_all\" ON hr_resource_assignments;", 
      "DROP POLICY IF EXISTS \"hr_resource_assignments_write_auth\" ON hr_resource_assignments;",
      "DROP POLICY IF EXISTS \"Enable read access for all users\" ON hr_resource_assignments;",
      "DROP POLICY IF EXISTS \"Enable insert for authenticated users only\" ON hr_resource_assignments;",
      "DROP POLICY IF EXISTS \"Enable update for authenticated users only\" ON hr_resource_assignments;", 
      "DROP POLICY IF EXISTS \"Enable delete for authenticated users only\" ON hr_resource_assignments;",
      "DROP POLICY IF EXISTS \"permit_all_reads\" ON hr_resource_assignments;",
      
      // Créer nouvelle politique permissive
      "CREATE POLICY \"hr_assignments_public_read\" ON hr_resource_assignments FOR SELECT USING (true);",
      "CREATE POLICY \"hr_assignments_auth_write\" ON hr_resource_assignments FOR ALL USING (auth.role() = 'authenticated');"
    ];
    
    let results = [];
    let errors = [];
    
    for (const sql of sqlCommands) {
      try {
        console.log('Exécution:', sql);
        const { data, error } = await supabaseClient.rpc('exec_sql', { sql });
        
        if (error) {
          console.error('Erreur SQL:', error);
          errors.push({ sql, error: error.message });
        } else {
          console.log('✅ Succès:', sql);
          results.push({ sql, success: true });
        }
      } catch (e) {
        console.error('Exception:', e);
        errors.push({ sql, error: e.message });
      }
    }
    
    // Test immédiat avec anon key
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    console.log('🧪 Test lecture avec anon key...');
    const { data: testData, error: testError } = await anonClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status')
      .eq('profile_id', '922efb64-1684-45ec-8aea-436c4dad2f37')
      .in('booking_status', ['recherche', 'pending'])
      .limit(5);
      
    console.log('✅ Test résultat:', testData?.length || 0, 'assignments trouvés');
    if (testError) console.error('❌ Erreur test:', testError);

    return new Response(
      JSON.stringify({
        success: true,
        sqlResults: results,
        sqlErrors: errors,
        testResults: testData?.length || 0,
        testData: testData || [],
        message: 'Correction RLS appliquée'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Erreur globale:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})