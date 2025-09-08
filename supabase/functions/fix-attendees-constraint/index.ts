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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    console.log('🔧 Ajout contrainte unique pour project_event_attendees')

    // Ajouter la contrainte unique manquante
    const sql = `
      -- Supprimer l'ancienne contrainte si elle existe
      ALTER TABLE project_event_attendees 
      DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;

      -- Ajouter la contrainte unique sur (event_id, email)
      ALTER TABLE project_event_attendees 
      ADD CONSTRAINT project_event_attendees_event_email_unique 
      UNIQUE (event_id, email);
    `

    const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql })
    
    if (error) {
      console.error('❌ Erreur:', error)
      throw error
    }

    console.log('✅ Contrainte unique ajoutée')
    console.log('📊 Résultat:', data)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Contrainte unique ajoutée avec succès',
        data 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})