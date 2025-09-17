import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

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

    console.log('Modification de la table candidate_qualification_results...')

    // Corriger le type de test_id dans candidate_qualification_results
    const { error: fixError } = await supabase.rpc('exec_sql', {
      sql: `
        -- 1. Supprimer toutes les contraintes liées à test_id
        ALTER TABLE candidate_qualification_results
        DROP CONSTRAINT IF EXISTS candidate_qualification_results_test_id_fkey;

        -- 2. Modifier le type de la colonne test_id pour accepter TEXT
        DO $$
        BEGIN
          -- Vérifier si la colonne est UUID et la changer en TEXT
          IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'candidate_qualification_results'
            AND column_name = 'test_id'
            AND data_type = 'uuid'
          ) THEN
            ALTER TABLE candidate_qualification_results
            ALTER COLUMN test_id TYPE TEXT USING test_id::TEXT;
          END IF;
        END $$;

        -- 3. Permettre NULL pour test_id
        ALTER TABLE candidate_qualification_results
        ALTER COLUMN test_id DROP NOT NULL;

        -- 4. Corriger aussi le statut du candidat si nécessaire
        ALTER TABLE public.candidate_profiles
        DROP CONSTRAINT IF EXISTS candidate_profiles_status_check;

        ALTER TABLE public.candidate_profiles
        ADD CONSTRAINT candidate_profiles_status_check
        CHECK (status IN ('qualification', 'disponible', 'en_pause', 'indisponible'));
      `
    })

    if (fixError) {
      console.error('Error fixing table:', fixError)
      throw fixError
    }

    // Vérifier la structure finale
    const { data: verifyStructure } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'candidate_qualification_results'
        AND column_name = 'test_id';
      `
    })

    console.log('Structure finale:', verifyStructure)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Tables corrigées avec succès',
        structure: verifyStructure
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})