import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('🔧 Starting phone synchronization fix...')

    // 1. Synchroniser les téléphones existants de candidate_profiles vers profiles
    const { data: candidatesWithPhone, error: fetchError } = await supabase
      .from('candidate_profiles')
      .select('user_id, phone')
      .not('phone', 'is', null)

    if (fetchError) {
      console.error('Error fetching candidates:', fetchError)
      throw fetchError
    }

    console.log(`📱 Found ${candidatesWithPhone?.length || 0} candidates with phone numbers`)

    // Mettre à jour chaque profil
    let updatedCount = 0
    for (const candidate of candidatesWithPhone || []) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ phone: candidate.phone })
        .eq('id', candidate.user_id)
        .is('phone', null) // Ne mettre à jour que si le phone est null

      if (!updateError) {
        updatedCount++
      }
    }

    console.log(`✅ Updated ${updatedCount} profiles with phone numbers`)

    // 2. Créer les triggers de synchronisation
    const createTriggersSql = `
      -- Trigger pour synchroniser candidate_profiles -> profiles
      CREATE OR REPLACE FUNCTION sync_candidate_phone_to_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.phone IS DISTINCT FROM OLD.phone THEN
          UPDATE profiles 
          SET phone = NEW.phone
          WHERE id = NEW.user_id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS sync_candidate_phone ON candidate_profiles;
      CREATE TRIGGER sync_candidate_phone
      AFTER UPDATE OF phone ON candidate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION sync_candidate_phone_to_profile();

      -- Trigger pour synchroniser profiles -> candidate_profiles
      CREATE OR REPLACE FUNCTION sync_profile_phone_to_candidate()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.role = 'candidate' THEN
          UPDATE candidate_profiles 
          SET phone = NEW.phone
          WHERE user_id = NEW.id;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS sync_profile_phone ON profiles;
      CREATE TRIGGER sync_profile_phone
      AFTER UPDATE OF phone ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION sync_profile_phone_to_candidate();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: createTriggersSql })
    
    if (triggerError) {
      console.error('Error creating triggers:', triggerError)
      // Continue anyway, triggers might already exist
    } else {
      console.log('✅ Triggers created successfully')
    }

    // 3. Vérifier les résultats
    const { data: results, error: resultError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        phone,
        first_name,
        last_name,
        role,
        candidate_profiles!inner(phone)
      `)
      .eq('role', 'candidate')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('📊 Sample results:', results?.map(r => ({
      email: r.email,
      profile_phone: r.phone,
      candidate_phone: r.candidate_profiles?.[0]?.phone
    })))

    return new Response(
      JSON.stringify({
        success: true,
        message: `Phone synchronization completed. Updated ${updatedCount} profiles.`,
        sampleResults: results
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in sync-phone-data:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})