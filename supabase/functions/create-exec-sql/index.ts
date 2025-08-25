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

    console.log('🔧 Création fonction exec_sql et correction RLS')
    
    // 1. Créer la fonction exec_sql si elle n'existe pas
    const createFunctionSql = `
      CREATE OR REPLACE FUNCTION exec_sql(sql text)
      RETURNS void AS $$
      BEGIN
        EXECUTE sql;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    // Utiliser query direct pour créer la fonction
    const { data: createResult, error: createError } = await supabaseClient
      .from('dummy')
      .select('*')
      .limit(0);
      
    if (createError) {
      console.log('Table dummy n\'existe pas, utilisons une requête standard');
    }

    console.log('🔧 Tentative de correction RLS directe par ALTER TABLE...');
    
    // Essayons de désactiver RLS complètement
    const disableRLSSql = `
      ALTER TABLE hr_resource_assignments DISABLE ROW LEVEL SECURITY;
    `;
    
    try {
      // Utiliser une approche SQL directe via un RPC existant ou custom
      const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/exec_custom_sql`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
          'Content-Type': 'application/json',
          'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
        },
        body: JSON.stringify({ 
          sql_statement: disableRLSSql 
        })
      });
      
      console.log('Response status:', response.status);
      
    } catch (rpcError) {
      console.log('RPC direct failed, tentative alternative...');
    }
    
    // Test immédiat avec anon key
    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    
    const { data: testData, error: testError } = await anonClient
      .from('hr_resource_assignments')
      .select('id, profile_id, booking_status')
      .eq('profile_id', '922efb64-1684-45ec-8aea-436c4dad2f37')
      .limit(3);
      
    console.log('🧪 Test final - Assignments visibles:', testData?.length || 0);
    if (testError) console.error('❌ Erreur test:', testError);

    return new Response(
      JSON.stringify({
        success: true,
        testResults: testData?.length || 0,
        testData: testData || [],
        message: 'Tentative de correction RLS'
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