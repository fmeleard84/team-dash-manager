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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Fixing admin template RLS policies...')

    // 1. Supprimer les anciennes politiques
    const dropPolicies = `
      DROP POLICY IF EXISTS "Admins can manage template categories" ON template_categories;
      DROP POLICY IF EXISTS "Admins can manage project templates" ON project_templates;
      DROP POLICY IF EXISTS "Users can view template categories" ON template_categories;
      DROP POLICY IF EXISTS "Users can view project templates" ON project_templates;
    `
    
    await supabaseClient.rpc('sql_executor', { sql_query: dropPolicies })
    console.log('Dropped old policies')

    // 2. Créer les nouvelles politiques pour les admins
    const createAdminPolicies = `
      CREATE POLICY "Admins can manage template categories"
      ON template_categories FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      );

      CREATE POLICY "Admins can manage project templates"
      ON project_templates FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = 'admin'
        )
      );
    `
    
    await supabaseClient.rpc('sql_executor', { sql_query: createAdminPolicies })
    console.log('Created admin policies')

    // 3. Créer les politiques de lecture pour tous les utilisateurs
    const createReadPolicies = `
      CREATE POLICY "Users can view template categories"
      ON template_categories FOR SELECT
      TO authenticated
      USING (true);

      CREATE POLICY "Users can view project templates"
      ON project_templates FOR SELECT
      TO authenticated
      USING (true);
    `
    
    await supabaseClient.rpc('sql_executor', { sql_query: createReadPolicies })
    console.log('Created read policies')

    // 4. Vérifier les politiques créées
    const { data: policies } = await supabaseClient.rpc('sql_executor', { 
      sql_query: `
        SELECT 
          schemaname,
          tablename,
          policyname,
          permissive,
          roles,
          cmd
        FROM pg_policies 
        WHERE tablename IN ('template_categories', 'project_templates')
        ORDER BY tablename, policyname;
      `
    })

    console.log('Current policies:', policies)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Admin template RLS policies fixed successfully',
        policies: policies
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})