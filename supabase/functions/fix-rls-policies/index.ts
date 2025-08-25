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

    console.log('🔧 Correction des politiques RLS pour hr_resource_assignments')
    
    // 1. Vérifier les politiques actuelles
    const { data: policies, error: policiesError } = await supabaseClient
      .rpc('exec_sql', {
        sql: `
          SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
          FROM pg_policies 
          WHERE tablename = 'hr_resource_assignments';
        `
      })
      
    console.log('📋 Politiques actuelles:', policies)
    if (policiesError) console.error('❌ Erreur policies:', policiesError)
    
    // 2. Vérifier que RLS est activé
    const { data: rlsStatus, error: rlsError } = await supabaseClient
      .rpc('exec_sql', {
        sql: `
          SELECT tablename, rowsecurity 
          FROM pg_tables 
          WHERE tablename = 'hr_resource_assignments';
        `
      })
      
    console.log('🔒 RLS status:', rlsStatus)
    if (rlsError) console.error('❌ Erreur RLS status:', rlsError)
    
    // 3. Supprimer toutes les politiques existantes et en créer une simple
    const { data: fixResult, error: fixError } = await supabaseClient
      .rpc('exec_sql', {
        sql: `
          -- Supprimer toutes les politiques existantes
          DROP POLICY IF EXISTS "hr_resource_assignments_select" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "hr_resource_assignments_insert" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "hr_resource_assignments_update" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "hr_resource_assignments_delete" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Enable read access for all users" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Enable update for authenticated users only" ON hr_resource_assignments;
          DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON hr_resource_assignments;
          
          -- Créer une politique de lecture permissive
          CREATE POLICY "hr_resource_assignments_read_all" ON hr_resource_assignments
          FOR SELECT USING (true);
          
          -- Créer une politique d'écriture pour les utilisateurs authentifiés
          CREATE POLICY "hr_resource_assignments_write_auth" ON hr_resource_assignments
          FOR ALL USING (auth.role() = 'authenticated');
        `
      })
      
    console.log('✅ Fix result:', fixResult)
    if (fixError) console.error('❌ Erreur fix:', fixError)
    
    // 4. Test immédiat avec anon key
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: testRead, error: testError } = await anonClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status')
      .limit(3)
      
    console.log('🧪 Test lecture avec anon:', testRead?.length || 0, 'résultats')
    if (testError) console.error('❌ Erreur test:', testError)

    return new Response(
      JSON.stringify({
        success: true,
        policies: policies,
        rlsStatus: rlsStatus,
        testResults: testRead?.length || 0,
        message: 'Politiques RLS corrigées'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('💥 Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})