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

    console.log('🔧 Correction de la contrainte unique sur project_event_attendees...')

    // 1. Supprimer l'ancienne contrainte si elle existe
    await supabaseClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;
      `
    })
    console.log('✅ Ancienne contrainte supprimée')

    // 2. Supprimer les doublons éventuels avant d'ajouter la contrainte
    await supabaseClient.rpc('exec_sql', {
      sql: `
        DELETE FROM project_event_attendees
        WHERE id NOT IN (
          SELECT MIN(id)
          FROM project_event_attendees
          GROUP BY event_id, email
        );
      `
    })
    console.log('✅ Doublons supprimés')

    // 3. Ajouter la contrainte unique
    await supabaseClient.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        ADD CONSTRAINT project_event_attendees_event_email_unique 
        UNIQUE (event_id, email);
      `
    })
    console.log('✅ Contrainte unique ajoutée')

    // 4. Ajouter les colonnes manquantes si nécessaire
    await supabaseClient.rpc('exec_sql', {
      sql: `
        DO $$ 
        BEGIN
            -- Ajouter 'required' si manquante
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'project_event_attendees' 
                          AND column_name = 'required') THEN
                ALTER TABLE project_event_attendees ADD COLUMN required BOOLEAN DEFAULT true;
            END IF;
            
            -- Ajouter 'updated_at' si manquante
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'project_event_attendees' 
                          AND column_name = 'updated_at') THEN
                ALTER TABLE project_event_attendees ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
            END IF;
        END $$;
      `
    })
    console.log('✅ Colonnes manquantes ajoutées')

    // 5. Vérifier la structure finale
    const { data: tableInfo } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'project_event_attendees' 
        ORDER BY ordinal_position;
      `
    })

    const { data: constraints } = await supabaseClient.rpc('exec_sql', {
      sql: `
        SELECT constraint_name, constraint_type 
        FROM information_schema.table_constraints 
        WHERE table_name = 'project_event_attendees';
      `
    })

    return new Response(JSON.stringify({
      success: true,
      message: 'Contrainte unique corrigée avec succès',
      table_structure: tableInfo,
      constraints: constraints
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Erreur:', error)
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})