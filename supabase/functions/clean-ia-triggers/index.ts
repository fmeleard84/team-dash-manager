import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      }
    })

    console.log('🧹 Nettoyage des triggers IA inutiles...')

    // 1. Supprimer le trigger inutile de création de profil candidat
    const { error: dropTriggerError } = await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS create_ia_candidate_profile_trigger ON hr_profiles;
        DROP FUNCTION IF EXISTS create_candidate_profile_for_ia() CASCADE;
      `
    })

    if (dropTriggerError) {
      console.error('⚠️ Erreur lors de la suppression du trigger:', dropTriggerError)
    } else {
      console.log('✅ Trigger create_ia_candidate_profile_trigger supprimé')
    }

    // 2. Vérifier et corriger le trigger auto_accept_ia_bookings
    const { error: updateTriggerError } = await supabase.rpc('exec_sql', {
      sql: `
        -- Recréer la fonction d'auto-acceptation proprement
        CREATE OR REPLACE FUNCTION auto_accept_ia_bookings()
        RETURNS TRIGGER AS $$
        BEGIN
          -- Si on passe en recherche ET que c'est une ressource IA
          IF NEW.booking_status = 'recherche' AND
             (OLD.booking_status IS NULL OR OLD.booking_status != 'recherche') THEN

            -- Vérifier si c'est une ressource IA
            IF EXISTS (
              SELECT 1 FROM hr_profiles
              WHERE id = NEW.profile_id
              AND is_ai = true
            ) THEN
              -- Pour une IA, on auto-accepte et on met le candidate_id = profile_id
              -- C'est cohérent car l'IA doit avoir été créée avec un profil candidat ayant le même ID
              NEW.candidate_id := NEW.profile_id;
              NEW.booking_status := 'accepted';

              RAISE NOTICE 'Auto-acceptation IA: profile_id=%, candidate_id=%', NEW.profile_id, NEW.candidate_id;
            END IF;
          END IF;

          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        -- S'assurer que le trigger existe
        DROP TRIGGER IF EXISTS auto_accept_ia_trigger ON hr_resource_assignments;

        CREATE TRIGGER auto_accept_ia_trigger
        BEFORE INSERT OR UPDATE ON hr_resource_assignments
        FOR EACH ROW
        EXECUTE FUNCTION auto_accept_ia_bookings();
      `
    })

    if (updateTriggerError) {
      console.error('❌ Erreur mise à jour trigger auto_accept:', updateTriggerError)
      throw updateTriggerError
    }

    console.log('✅ Trigger auto_accept_ia_bookings vérifié et corrigé')

    // 3. Lister les triggers restants pour vérification
    const { data: triggers, error: listError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT
          tgname as trigger_name,
          tgrelid::regclass as table_name
        FROM pg_trigger
        WHERE tgname LIKE '%ia%' OR tgname LIKE '%auto_accept%'
        AND tgrelid::regclass::text NOT LIKE 'pg_%';
      `
    })

    if (!listError && triggers) {
      console.log('\n📋 Triggers IA restants:')
      if (Array.isArray(triggers) && triggers.length > 0) {
        triggers.forEach((t: any) => {
          console.log(`   - ${t.trigger_name} sur ${t.table_name}`)
        })
      } else {
        console.log('   Aucun trigger IA trouvé')
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Triggers IA nettoyés avec succès',
        removed: ['create_ia_candidate_profile_trigger'],
        kept: ['auto_accept_ia_trigger']
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    console.error('❌ Erreur globale:', error)
    return new Response(
      JSON.stringify({
        error: error.message,
        details: error
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})