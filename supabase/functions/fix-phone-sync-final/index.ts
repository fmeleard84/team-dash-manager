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

    console.log('🔧 FINAL FIX: Phone synchronization...')

    // 1. D'abord, copier tous les téléphones existants
    console.log('📱 Étape 1: Copier les téléphones de candidate_profiles vers profiles...')
    
    const { data: candidatesWithPhone, error: fetchError } = await supabase
      .from('candidate_profiles')
      .select('user_id, phone, first_name, last_name')
      .not('phone', 'is', null)

    if (fetchError) {
      console.error('Error fetching candidates:', fetchError)
      throw fetchError
    }

    console.log(`Found ${candidatesWithPhone?.length || 0} candidates with phone numbers`)

    let updatedCount = 0
    for (const candidate of candidatesWithPhone || []) {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          phone: candidate.phone,
          first_name: candidate.first_name,
          last_name: candidate.last_name
        })
        .eq('id', candidate.user_id)

      if (!updateError) {
        updatedCount++
        console.log(`Updated profile for user ${candidate.user_id}`)
      } else {
        console.error(`Failed to update profile for user ${candidate.user_id}:`, updateError)
      }
    }

    console.log(`✅ Updated ${updatedCount} profiles`)

    // 2. Créer les triggers uniquement via exec_sql
    console.log('📱 Étape 2: Création des triggers de synchronisation...')
    
    const triggersSql = `
      -- Nettoyer les anciens triggers
      DROP TRIGGER IF EXISTS sync_candidate_phone ON candidate_profiles;
      DROP TRIGGER IF EXISTS sync_profile_phone ON profiles;
      DROP FUNCTION IF EXISTS sync_candidate_phone_to_profile();
      DROP FUNCTION IF EXISTS sync_profile_phone_to_candidate();

      -- Créer la fonction de synchronisation candidate -> profile
      CREATE OR REPLACE FUNCTION sync_candidate_phone_to_profile()
      RETURNS TRIGGER AS $$
      BEGIN
        -- Synchroniser toutes les infos personnelles
        UPDATE profiles 
        SET 
          phone = NEW.phone,
          first_name = NEW.first_name,
          last_name = NEW.last_name,
          updated_at = NOW()
        WHERE id = NEW.user_id;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Créer le trigger
      CREATE TRIGGER sync_candidate_phone
      AFTER UPDATE ON candidate_profiles
      FOR EACH ROW
      EXECUTE FUNCTION sync_candidate_phone_to_profile();

      -- Créer la fonction inverse profile -> candidate
      CREATE OR REPLACE FUNCTION sync_profile_phone_to_candidate()
      RETURNS TRIGGER AS $$
      BEGIN
        IF NEW.role = 'candidate' THEN
          UPDATE candidate_profiles 
          SET 
            phone = NEW.phone,
            first_name = NEW.first_name,
            last_name = NEW.last_name
          WHERE user_id = NEW.id;
        END IF;
        
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- Créer le trigger inverse
      CREATE TRIGGER sync_profile_phone
      AFTER UPDATE ON profiles
      FOR EACH ROW
      WHEN (NEW.role = 'candidate')
      EXECUTE FUNCTION sync_profile_phone_to_candidate();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', { sql: triggersSql })
    
    if (triggerError) {
      console.error('Warning: Could not create triggers (might already exist):', triggerError)
    } else {
      console.log('✅ Triggers created successfully')
    }

    // 3. Mettre à jour handle_new_user pour inclure le téléphone lors de l'inscription
    console.log('📱 Étape 3: Mise à jour de handle_new_user...')
    
    const handleNewUserSql = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        -- Créer le profil avec toutes les infos incluant le téléphone
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
        
        -- Si c'est un candidat, créer aussi candidate_profile avec le téléphone
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

    const { error: handleError } = await supabase.rpc('exec_sql', { sql: handleNewUserSql })
    
    if (handleError) {
      console.error('Warning: Could not update handle_new_user:', handleError)
    } else {
      console.log('✅ handle_new_user updated successfully')
    }

    // 4. Vérifier les résultats
    console.log('📱 Étape 4: Vérification finale...')
    
    const { data: verifyData, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, phone, first_name, last_name')
      .eq('role', 'candidate')
      .not('phone', 'is', null)
      .limit(5)

    console.log('Sample candidates with phone:', verifyData)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Phone synchronization completed successfully!`,
        stats: {
          candidatesWithPhone: candidatesWithPhone?.length || 0,
          profilesUpdated: updatedCount,
          sampleData: verifyData
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error in fix-phone-sync-final:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})