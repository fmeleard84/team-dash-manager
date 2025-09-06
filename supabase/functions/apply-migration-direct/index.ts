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
    
    // Utiliser createClient avec autoRefreshToken false pour éviter les problèmes
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('🔧 APPLICATION DIRECTE DE LA MIGRATION DU TRIGGER');

    // Exécuter la migration en utilisant le service role qui a les privilèges nécessaires
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Suppression des anciens triggers et fonctions
        DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
        DROP TRIGGER IF EXISTS handle_new_user ON auth.users CASCADE;
        DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

        -- Création de la fonction
        CREATE OR REPLACE FUNCTION public.handle_new_user()
        RETURNS trigger 
        LANGUAGE plpgsql
        SECURITY DEFINER
        SET search_path = public
        AS $$
        DECLARE
          user_role TEXT;
        BEGIN
          -- Déterminer le rôle
          user_role := COALESCE(
            new.raw_user_meta_data->>'role',
            new.raw_app_meta_data->>'role',
            'candidate'
          );
          
          -- Créer le profil général
          INSERT INTO public.profiles (
            id, email, role, first_name, last_name, phone, company_name
          ) VALUES (
            new.id,
            new.email,
            user_role::app_role,
            COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
            COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
            new.raw_user_meta_data->>'phone',
            new.raw_user_meta_data->>'company_name'
          ) ON CONFLICT (id) DO UPDATE SET
            role = EXCLUDED.role,
            first_name = COALESCE(NULLIF(profiles.first_name, ''), EXCLUDED.first_name),
            last_name = COALESCE(NULLIF(profiles.last_name, ''), EXCLUDED.last_name),
            phone = COALESCE(profiles.phone, EXCLUDED.phone);
          
          -- Si candidat
          IF user_role = 'candidate' THEN
            INSERT INTO public.candidate_profiles (
              id, email, first_name, last_name, phone,
              status, qualification_status, seniority, profile_id,
              daily_rate, password_hash, is_email_verified
            ) VALUES (
              new.id,
              new.email,
              COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
              COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
              new.raw_user_meta_data->>'phone',
              'disponible',
              'pending',
              'junior',
              NULL,
              0,
              '',
              new.email_confirmed_at IS NOT NULL
            ) ON CONFLICT (id) DO UPDATE SET
              is_email_verified = new.email_confirmed_at IS NOT NULL;
          
          -- Si client
          ELSIF user_role = 'client' THEN
            INSERT INTO public.client_profiles (
              id, email, first_name, last_name, company_name, phone, user_id
            ) VALUES (
              new.id,
              new.email,
              COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
              COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
              new.raw_user_meta_data->>'company_name',
              new.raw_user_meta_data->>'phone',
              new.id::text
            ) ON CONFLICT (id) DO NOTHING;
          END IF;
          
          RETURN new;
        EXCEPTION
          WHEN OTHERS THEN
            RAISE WARNING 'Erreur dans handle_new_user pour %: %', new.email, SQLERRM;
            RETURN new;
        END;
        $$;

        -- Création du trigger
        CREATE TRIGGER on_auth_user_created
          AFTER INSERT ON auth.users
          FOR EACH ROW
          EXECUTE FUNCTION public.handle_new_user();

        -- Activer le trigger
        ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
      `
    });

    if (error) {
      console.error('Erreur lors de l\'exécution:', error);
      throw error;
    }

    // Vérifier que le trigger existe maintenant
    const { data: checkData, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname AS trigger_name,
          t.tgenabled AS enabled,
          p.proname AS function_name
        FROM pg_trigger t
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgname = 'on_auth_user_created';
      `
    });

    let triggerStatus = {
      exists: false,
      enabled: false,
      functionName: null
    };

    if (!checkError && checkData?.rows?.length > 0) {
      const trigger = checkData.rows[0];
      triggerStatus = {
        exists: true,
        enabled: trigger.enabled === 'O',
        functionName: trigger.function_name
      };
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration du trigger appliquée avec succès',
        trigger: triggerStatus,
        details: {
          migrationExecuted: !error,
          triggerCreated: triggerStatus.exists,
          triggerEnabled: triggerStatus.enabled
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
    console.error('Erreur globale:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Erreur lors de l\'application de la migration'
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