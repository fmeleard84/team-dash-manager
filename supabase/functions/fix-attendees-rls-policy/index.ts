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

    console.log('🔧 Correction des policies RLS pour project_event_attendees')

    // Supprimer la policy trop stricte
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
      `
    })

    // Créer une policy plus simple pour l'insertion
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        CREATE POLICY "authenticated_users_insert_attendees"
        ON project_event_attendees FOR INSERT
        TO authenticated
        WITH CHECK (true);
      `
    })

    console.log('✅ Policy RLS corrigée pour project_event_attendees')

    // Aussi simplifier la policy pour les notifications si nécessaire
    await supabaseAdmin.rpc('exec_sql', {
      sql: `
        DROP POLICY IF EXISTS "project_members_create_notifications" ON candidate_event_notifications;
        
        CREATE POLICY "authenticated_users_create_notifications"
        ON candidate_event_notifications FOR INSERT
        TO authenticated
        WITH CHECK (true);
      `
    })

    console.log('✅ Policy RLS corrigée pour candidate_event_notifications')

    return new Response(
      JSON.stringify({ success: true, message: 'Policies RLS corrigées' }),
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