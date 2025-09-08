import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('=== Début de la migration project_event_attendees ===')

    // 1. Ajouter la colonne user_id si elle n'existe pas
    console.log('1. Ajout de la colonne user_id...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        
        CREATE INDEX IF NOT EXISTS idx_event_attendees_user_id ON project_event_attendees(user_id);
        CREATE INDEX IF NOT EXISTS idx_event_attendees_event_user ON project_event_attendees(event_id, user_id);
      `
    }).then(result => {
      if (result.error) console.error('Erreur ajout user_id:', result.error)
      else console.log('✅ Colonne user_id ajoutée')
    })

    // 2. Renommer status en response_status
    console.log('2. Renommage de status en response_status...')
    await supabase.rpc('exec_sql', {
      sql: `
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
    }).then(result => {
      if (result.error) console.error('Erreur renommage:', result.error)
      else console.log('✅ Colonne renommée en response_status')
    })

    // 3. Ajouter les colonnes required et role
    console.log('3. Ajout des colonnes required et role...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        ADD COLUMN IF NOT EXISTS required BOOLEAN DEFAULT true;
        
        ALTER TABLE project_event_attendees 
        ADD COLUMN IF NOT EXISTS role TEXT;
      `
    }).then(result => {
      if (result.error) console.error('Erreur ajout colonnes:', result.error)
      else console.log('✅ Colonnes required et role ajoutées')
    })

    // 4. Migrer les données existantes
    console.log('4. Migration des données existantes...')
    
    // Migrer depuis profile_id
    const { data: profileMigrations, error: profileError } = await supabase
      .from('project_event_attendees')
      .select('id, profile_id')
      .not('profile_id', 'is', null)
      .is('user_id', null)

    if (profileMigrations && profileMigrations.length > 0) {
      console.log(`Trouvé ${profileMigrations.length} enregistrements avec profile_id`)
      
      for (const record of profileMigrations) {
        // Récupérer l'ID depuis profiles
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', record.profile_id)
          .single()
        
        if (profile) {
          await supabase
            .from('project_event_attendees')
            .update({ user_id: profile.id })
            .eq('id', record.id)
        }
      }
      console.log('✅ Migration depuis profile_id complétée')
    }

    // Migrer depuis email
    const { data: emailMigrations, error: emailError } = await supabase
      .from('project_event_attendees')
      .select('id, email')
      .not('email', 'is', null)
      .is('user_id', null)

    if (emailMigrations && emailMigrations.length > 0) {
      console.log(`Trouvé ${emailMigrations.length} enregistrements avec email seulement`)
      
      for (const record of emailMigrations) {
        // Essayer de trouver dans client_profiles
        const { data: clientProfile } = await supabase
          .from('client_profiles')
          .select('id')
          .eq('email', record.email)
          .single()
        
        if (clientProfile) {
          await supabase
            .from('project_event_attendees')
            .update({ 
              user_id: clientProfile.id,
              role: 'client'
            })
            .eq('id', record.id)
          continue
        }
        
        // Sinon essayer dans candidate_profiles
        const { data: candidateProfile } = await supabase
          .from('candidate_profiles')
          .select('id')
          .eq('email', record.email)
          .single()
        
        if (candidateProfile) {
          await supabase
            .from('project_event_attendees')
            .update({ 
              user_id: candidateProfile.id,
              role: 'resource'
            })
            .eq('id', record.id)
        }
      }
      console.log('✅ Migration depuis email complétée')
    }

    // 5. Créer la contrainte unique
    console.log('5. Création de la contrainte unique...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_email_unique;
        
        ALTER TABLE project_event_attendees 
        DROP CONSTRAINT IF EXISTS project_event_attendees_event_user_unique;
        
        ALTER TABLE project_event_attendees 
        ADD CONSTRAINT project_event_attendees_event_user_unique 
        UNIQUE(event_id, user_id);
      `
    }).then(result => {
      if (result.error) console.error('Erreur contrainte:', result.error)
      else console.log('✅ Contrainte unique créée')
    })

    // 6. Mettre à jour les policies RLS
    console.log('6. Mise à jour des policies RLS...')
    await supabase.rpc('exec_sql', {
      sql: `
        -- Supprimer les anciennes policies
        DROP POLICY IF EXISTS "Members can view attendees" ON project_event_attendees;
        DROP POLICY IF EXISTS "Members can manage attendees" ON project_event_attendees;
        
        -- Créer les nouvelles policies
        CREATE POLICY IF NOT EXISTS "Users can view event attendees"
        ON project_event_attendees FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND (
              p.owner_id = auth.uid()
              OR EXISTS (
                SELECT 1 FROM hr_resource_assignments hra
                WHERE hra.project_id = p.id
                AND hra.candidate_id = auth.uid()
                AND hra.booking_status = 'accepted'
              )
            )
          )
        );
        
        CREATE POLICY IF NOT EXISTS "Project owners can manage attendees"
        ON project_event_attendees FOR ALL
        USING (
          EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND p.owner_id = auth.uid()
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM project_events pe
            JOIN projects p ON p.id = pe.project_id
            WHERE pe.id = project_event_attendees.event_id
            AND p.owner_id = auth.uid()
          )
        );
      `
    }).then(result => {
      if (result.error) console.error('Erreur policies:', result.error)
      else console.log('✅ Policies RLS mises à jour')
    })

    // 7. Créer la vue helper
    console.log('7. Création de la vue helper...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE VIEW project_event_attendees_with_profiles AS
        SELECT 
          pea.*,
          COALESCE(cp.first_name, canp.first_name) as first_name,
          COALESCE(cp.last_name, canp.last_name) as last_name,
          COALESCE(cp.email, canp.email) as attendee_email,
          CASE 
            WHEN cp.id IS NOT NULL THEN 'client'
            WHEN canp.id IS NOT NULL THEN 'candidate'
            ELSE 'unknown'
          END as user_type
        FROM project_event_attendees pea
        LEFT JOIN client_profiles cp ON cp.id = pea.user_id
        LEFT JOIN candidate_profiles canp ON canp.id = pea.user_id;
        
        GRANT SELECT ON project_event_attendees_with_profiles TO authenticated;
      `
    }).then(result => {
      if (result.error) console.error('Erreur vue:', result.error)
      else console.log('✅ Vue helper créée')
    })

    console.log('=== Migration terminée avec succès ===')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration project_event_attendees complétée avec succès'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('Erreur lors de la migration:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})