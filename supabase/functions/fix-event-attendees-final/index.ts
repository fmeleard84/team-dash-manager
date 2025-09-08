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

    console.log('🔧 Correction finale de project_event_attendees')

    // ÉTAPE 1: Corriger le schéma de la table
    console.log('📋 Étape 1: Correction du schéma')
    const schemaSql = `
      -- Ajouter les colonnes manquantes
      ALTER TABLE project_event_attendees 
      ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;
      
      ALTER TABLE project_event_attendees 
      ADD COLUMN IF NOT EXISTS response_status TEXT DEFAULT 'pending';
      
      ALTER TABLE project_event_attendees 
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      -- Renommer 'status' en 'response_status' si nécessaire
      DO $$ 
      BEGIN
          IF EXISTS (SELECT 1 FROM information_schema.columns 
                     WHERE table_name = 'project_event_attendees' 
                     AND column_name = 'status') 
          AND NOT EXISTS (SELECT 1 FROM information_schema.columns 
                          WHERE table_name = 'project_event_attendees' 
                          AND column_name = 'response_status') THEN
              ALTER TABLE project_event_attendees RENAME COLUMN status TO response_status;
          END IF;
      END $$;
    `

    const { error: schemaError } = await supabaseAdmin.rpc('exec_sql', { sql: schemaSql })
    if (schemaError) {
      console.error('❌ Erreur schéma:', schemaError)
      throw schemaError
    }
    console.log('✅ Schéma corrigé')

    // ÉTAPE 2: Ajouter la contrainte unique
    console.log('📋 Étape 2: Ajout contrainte unique')
    const constraintSql = `
      ALTER TABLE project_event_attendees 
      DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;
      
      ALTER TABLE project_event_attendees 
      ADD CONSTRAINT project_event_attendees_event_email_unique 
      UNIQUE (event_id, email);
    `

    const { error: constraintError } = await supabaseAdmin.rpc('exec_sql', { sql: constraintSql })
    if (constraintError) {
      console.error('❌ Erreur contrainte:', constraintError)
      throw constraintError
    }
    console.log('✅ Contrainte unique ajoutée')

    // ÉTAPE 3: Corriger les policies RLS
    console.log('📋 Étape 3: Correction des policies RLS')
    const rlsSql = `
      -- Supprimer toutes les anciennes policies
      DROP POLICY IF EXISTS "users_insert_event_attendees" ON project_event_attendees;
      DROP POLICY IF EXISTS "authenticated_users_insert_attendees" ON project_event_attendees;
      DROP POLICY IF EXISTS "users_view_event_attendees" ON project_event_attendees;
      DROP POLICY IF EXISTS "users_update_event_attendees" ON project_event_attendees;
      DROP POLICY IF EXISTS "users_delete_event_attendees" ON project_event_attendees;

      -- Créer les nouvelles policies fonctionnelles
      CREATE POLICY "attendees_all_operations"
      ON project_event_attendees FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
    `

    const { error: rlsError } = await supabaseAdmin.rpc('exec_sql', { sql: rlsSql })
    if (rlsError) {
      console.error('❌ Erreur RLS:', rlsError)
      throw rlsError
    }
    console.log('✅ Policies RLS corrigées')

    // ÉTAPE 4: Test de fonctionnement
    console.log('📋 Étape 4: Test de fonctionnement')
    const testData = {
      event_id: crypto.randomUUID(),
      email: 'test@example.com',
      required: true,
      response_status: 'pending'
    }

    const { data: testResult, error: testError } = await supabaseAdmin
      .from('project_event_attendees')
      .upsert([testData], { onConflict: 'event_id,email' })
      .select()

    if (testError) {
      console.error('❌ Test échoué:', testError)
      throw testError
    }

    console.log('✅ Test réussi:', testResult)

    // Nettoyer le test
    await supabaseAdmin
      .from('project_event_attendees')
      .delete()
      .eq('email', 'test@example.com')

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Correction finale appliquée avec succès',
        steps: [
          'Schéma corrigé',
          'Contrainte unique ajoutée',
          'Policies RLS corrigées',
          'Test de fonctionnement réussi'
        ]
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