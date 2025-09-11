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
    const supabaseDbUrl = Deno.env.get('SUPABASE_DB_URL')!
    
    console.log('🔧 Applying file_url migration to message_attachments table...')

    // Connexion directe à la base de données
    const dbUrl = supabaseDbUrl || `postgresql://postgres.egdelmcijszuapcpglsy:${Deno.env.get('SUPABASE_DB_PASSWORD')}@aws-0-eu-central-1.pooler.supabase.com:6543/postgres`
    
    // Utiliser le module Postgres de Deno
    const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts")
    
    const client = new Client(dbUrl)
    await client.connect()
    
    try {
      // Vérifier si la colonne existe
      const checkResult = await client.queryObject`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'message_attachments' 
        AND column_name = 'file_url'
      `
      
      if (checkResult.rows.length === 0) {
        console.log('Adding file_url column...')
        
        // Ajouter la colonne
        await client.queryObject`
          ALTER TABLE message_attachments 
          ADD COLUMN file_url TEXT
        `
        
        console.log('✅ Column file_url added')
        
        // Mettre à jour les enregistrements existants
        const updateResult = await client.queryObject`
          UPDATE message_attachments 
          SET file_url = 'https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/' || file_path
          WHERE file_url IS NULL AND file_path IS NOT NULL
        `
        
        console.log(`✅ Updated ${updateResult.rowCount} rows with file_url`)
      } else {
        console.log('Column file_url already exists')
        
        // Mettre à jour les enregistrements qui n'ont pas de file_url
        const updateResult = await client.queryObject`
          UPDATE message_attachments 
          SET file_url = 'https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/' || file_path
          WHERE file_url IS NULL AND file_path IS NOT NULL
        `
        
        if (updateResult.rowCount > 0) {
          console.log(`✅ Updated ${updateResult.rowCount} rows with file_url`)
        }
      }
      
    } finally {
      await client.end()
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Migration applied successfully'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})