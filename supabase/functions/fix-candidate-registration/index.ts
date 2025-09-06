import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔧 Correction du trigger handle_new_user pour l\'ID universel...');

    // 1. Supprimer l'ancien trigger
    const dropTriggerQuery = `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
    `;

    await supabase.rpc('exec_sql', { sql: dropTriggerQuery });
    console.log('✅ Ancien trigger supprimé');

    // 2. Créer la nouvelle fonction handle_new_user avec ID universel
    const createFunctionQuery = `
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$
      BEGIN
        -- Insert into profiles (pour tous les utilisateurs)
        INSERT INTO public.profiles (id, email, role, first_name, last_name, company_name, phone)
        VALUES (
          new.id, 
          new.email,
          COALESCE(new.raw_user_meta_data->>'role', 'candidate')::app_role,
          new.raw_user_meta_data->>'first_name',
          new.raw_user_meta_data->>'last_name',
          new.raw_user_meta_data->>'company_name',
          new.raw_user_meta_data->>'phone'
        )
        ON CONFLICT (id) DO NOTHING;
        
        -- Si c'est un candidat, créer aussi candidate_profiles avec ID universel
        IF COALESCE(new.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
          INSERT INTO public.candidate_profiles (
            id,  -- ID universel (auth.uid)
            email,
            first_name,
            last_name,
            phone,
            status,
            qualification_status,
            seniority,
            daily_rate,
            password_hash,
            is_email_verified
          ) VALUES (
            new.id,  -- Utiliser l'ID universel comme clé primaire
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'phone',
            'qualification',  -- Statut initial
            'pending',  -- En attente de qualification
            'junior',  -- Séniorité par défaut
            0,  -- Taux journalier par défaut
            '',  -- Password hash vide (auth géré par Supabase Auth)
            false  -- Email non vérifié par défaut
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name),
            phone = COALESCE(EXCLUDED.phone, candidate_profiles.phone),
            updated_at = NOW();
        
        -- Si c'est un client, créer aussi client_profiles avec ID universel  
        ELSIF new.raw_user_meta_data->>'role' = 'client' THEN
          INSERT INTO public.client_profiles (
            id,  -- ID universel (auth.uid)
            email,
            first_name,
            last_name,
            company_name,
            phone,
            user_id  -- Garder pour compatibilité
          ) VALUES (
            new.id,  -- Utiliser l'ID universel comme clé primaire
            new.email,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'company_name',
            new.raw_user_meta_data->>'phone',
            new.id::text
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, client_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, client_profiles.last_name),
            company_name = COALESCE(EXCLUDED.company_name, client_profiles.company_name),
            phone = COALESCE(EXCLUDED.phone, client_profiles.phone),
            updated_at = NOW();
        END IF;
        
        RETURN new;
      EXCEPTION
        WHEN OTHERS THEN
          -- Log l'erreur mais ne pas bloquer la création de l'utilisateur
          RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
          RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: functionError } = await supabase.rpc('exec_sql', {
      sql: createFunctionQuery
    });

    if (functionError) {
      console.error('Erreur création fonction:', functionError);
      throw functionError;
    }

    console.log('✅ Nouvelle fonction créée avec ID universel');

    // 3. Recréer le trigger
    const createTriggerQuery = `
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
    `;

    const { error: triggerError } = await supabase.rpc('exec_sql', {
      sql: createTriggerQuery
    });

    if (triggerError) {
      console.error('Erreur création trigger:', triggerError);
      throw triggerError;
    }

    console.log('✅ Trigger recréé');

    // 4. Vérifier la structure
    const checkQuery = `
      SELECT 
        event_object_schema,
        event_object_table,
        trigger_name,
        action_timing,
        event_manipulation
      FROM information_schema.triggers
      WHERE trigger_name = 'on_auth_user_created';
    `;

    const { data: checkData } = await supabase.rpc('exec_sql', {
      sql: checkQuery
    });

    console.log('📊 Trigger vérifié:', checkData);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trigger handle_new_user corrigé pour utiliser l\'ID universel',
        details: {
          function_updated: true,
          trigger_recreated: true,
          changes: [
            'candidate_profiles.id = auth.uid (ID universel)',
            'client_profiles.id = auth.uid (ID universel)',
            'Gestion des erreurs améliorée',
            'Support des deux formats de metadata (first_name et firstName)'
          ]
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Erreur lors de la correction du trigger'
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        }, 
        status: 500 
      }
    );
  }
});