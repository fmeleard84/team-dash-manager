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
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: { schema: 'public' }
    })

    console.log('🔧 Fixing message_attachments table...')

    // Récupérer tous les attachements sans file_url
    const { data: attachments, error: fetchError } = await supabase
      .from('message_attachments')
      .select('*')
      .is('file_url', null)

    if (fetchError) {
      console.error('Error fetching attachments:', fetchError)
      // La colonne file_url n'existe probablement pas, essayons de l'ajouter
      
      // Créer une migration pour ajouter la colonne
      const migrationSQL = `
        -- Ajouter la colonne file_url si elle n'existe pas
        ALTER TABLE message_attachments 
        ADD COLUMN IF NOT EXISTS file_url TEXT;
        
        -- Mettre à jour les enregistrements existants
        UPDATE message_attachments 
        SET file_url = 'https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/' || file_path
        WHERE file_url IS NULL AND file_path IS NOT NULL;
      `
      
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Column file_url needs to be added',
          migration_needed: true,
          sql: migrationSQL
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Si on a des attachements sans URL, les mettre à jour
    if (attachments && attachments.length > 0) {
      console.log(`Found ${attachments.length} attachments without file_url`)
      
      for (const attachment of attachments) {
        const fileUrl = `https://egdelmcijszuapcpglsy.supabase.co/storage/v1/object/public/kanban-files/${attachment.file_path}`
        
        const { error: updateError } = await supabase
          .from('message_attachments')
          .update({ file_url: fileUrl })
          .eq('id', attachment.id)
        
        if (updateError) {
          console.error(`Error updating attachment ${attachment.id}:`, updateError)
        }
      }
      
      console.log('✅ Updated all attachments with file_url')
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Message attachments fixed',
        updated_count: attachments?.length || 0
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