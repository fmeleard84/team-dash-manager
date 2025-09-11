import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Checking and adding file_url column to message_attachments table...')

    // Vérifier si la colonne existe déjà
    const { data: columns, error: columnsError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = 'message_attachments' 
          AND column_name = 'file_url';
        `
      })

    if (columnsError) {
      console.error('Error checking columns:', columnsError)
      // Si la fonction n'existe pas, essayons directement d'ajouter la colonne
    }

    // Ajouter la colonne si elle n'existe pas
    const { error: alterError } = await supabase
      .rpc('exec_sql', {
        sql: `
          ALTER TABLE message_attachments 
          ADD COLUMN IF NOT EXISTS file_url TEXT;
        `
      })

    if (alterError) {
      console.error('Error adding column:', alterError)
      // Essayons une approche directe avec le client admin
      const { data, error } = await supabase.from('message_attachments').select('*').limit(1)
      
      if (error) {
        throw new Error(`Failed to check table: ${error.message}`)
      }

      // Si on arrive ici, la table existe. Essayons d'ajouter la colonne via SQL direct
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`
        },
        body: JSON.stringify({
          sql: `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS file_url TEXT;`
        })
      })

      if (!response.ok) {
        // La fonction exec_sql n'existe pas, créons-la
        console.log('Creating exec_sql function...')
        
        // Utilisons une requête SQL brute via psql
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION exec_sql(sql text)
          RETURNS void
          LANGUAGE plpgsql
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE sql;
          END;
          $$;

          ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS file_url TEXT;
        `

        // Comme nous ne pouvons pas exécuter du SQL arbitraire, retournons les instructions
        return new Response(
          JSON.stringify({
            success: false,
            message: 'La colonne file_url doit être ajoutée manuellement',
            sql_to_execute: `ALTER TABLE message_attachments ADD COLUMN IF NOT EXISTS file_url TEXT;`
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    console.log('✅ Column file_url has been added or already exists')

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Column file_url has been added or already exists'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})