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

    console.log('🔧 Applying phone synchronization fix...')

    // Exécuter la migration SQL
    const migrationSql = `
      -- 1. Synchroniser les données existantes
      UPDATE profiles p
      SET phone = cp.phone
      FROM candidate_profiles cp
      WHERE p.id = cp.user_id
        AND p.phone IS NULL
        AND cp.phone IS NOT NULL;

      -- 2. Créer le trigger de synchronisation candidate -> profile
      CREATE OR REPLACE FUNCTION sync_candidate_phone_to_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.phone IS DISTINCT FROM OLD.phone THEN
          UPDATE profiles 
          SET phone = NEW.phone,
              updated_at = NOW()
          WHERE id = NEW.user_id;
        END IF;
        
        IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
          UPDATE profiles 
          SET first_name = NEW.first_name,
              last_name = NEW.last_name,
              updated_at = NOW()
          WHERE id = NEW.user_id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS sync_candidate_phone ON candidate_profiles;
      CREATE TRIGGER sync_candidate_phone
      AFTER UPDATE ON candidate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION sync_candidate_phone_to_profile();

      -- 3. Créer le trigger de synchronisation profile -> candidate
      CREATE OR REPLACE FUNCTION sync_profile_phone_to_candidate()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.role = 'candidate' THEN
          IF NEW.phone IS DISTINCT FROM OLD.phone THEN
            UPDATE candidate_profiles 
            SET phone = NEW.phone
            WHERE user_id = NEW.id;
          END IF;
          
          IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
            UPDATE candidate_profiles 
            SET first_name = NEW.first_name,
                last_name = NEW.last_name
            WHERE user_id = NEW.id;
          END IF;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS sync_profile_phone ON profiles;
      CREATE TRIGGER sync_profile_phone
      AFTER UPDATE ON profiles
      FOR EACH ROW
      EXECUTE FUNCTION sync_profile_phone_to_candidate();

      -- 4. Mettre à jour handle_new_user pour inclure le téléphone
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, role, first_name, last_name, company_name, phone)
        VALUES (
          new.id, 
          new.email,
          COALESCE(new.raw_user_meta_data->>'role', 'candidate')::app_role,
          new.raw_user_meta_data->>'first_name',
          new.raw_user_meta_data->>'last_name',
          new.raw_user_meta_data->>'company_name',
          new.raw_user_meta_data->>'phone'
        );
        
        IF COALESCE(new.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
          INSERT INTO public.candidate_profiles (
            user_id,
            email,
            first_name,
            last_name,
            phone,
            onboarding_status,
            onboarding_current_step
          ) VALUES (
            new.id,
            new.email,
            new.raw_user_meta_data->>'first_name',
            new.raw_user_meta_data->>'last_name',
            new.raw_user_meta_data->>'phone',
            'pending',
            1
          );
        END IF;
        
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: sqlError } = await supabase.rpc('exec_sql', { sql: migrationSql })
    
    if (sqlError) {
      console.error('Error executing migration:', sqlError)
      throw sqlError
    }

    console.log('✅ Migration applied successfully')

    // Vérifier combien de candidats ont été mis à jour
    const { data: updatedCandidates, error: checkError } = await supabase
      .from('profiles')
      .select(`
        id,
        email,
        phone,
        first_name,
        last_name,
        candidate_profiles!inner(phone)
      `)
      .eq('role', 'candidate')
      .not('phone', 'is', null)

    const count = updatedCandidates?.length || 0
    console.log(`📊 ${count} candidates now have phone numbers in profiles table`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Phone synchronization applied successfully. ${count} candidates have phone numbers.`,
        updatedCount: count
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in apply-phone-sync:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})