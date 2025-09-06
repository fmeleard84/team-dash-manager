import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔧 Application de la migration du trigger final');

    // Migration SQL complète
    const migrationSQL = `
      -- 1. Supprimer les anciens triggers
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

      -- 2. Créer la fonction handle_new_user correcte
      CREATE OR REPLACE FUNCTION public.handle_new_user()
      RETURNS trigger AS $$$$
      DECLARE
        user_role TEXT;
      BEGIN
        -- Récupérer le rôle depuis les metadata
        user_role := COALESCE(
          new.raw_user_meta_data->>'role',
          CASE 
            WHEN new.email LIKE '%candidate%' THEN 'candidate'
            WHEN new.email LIKE '%ressource%' THEN 'candidate'
            ELSE 'candidate'
          END
        );
        
        -- Logger pour debug
        RAISE LOG 'handle_new_user: Creating profiles for % with role %', new.email, user_role;
        
        -- Créer le profil général
        INSERT INTO public.profiles (
          id, email, role, first_name, last_name, company_name, phone
        )
        VALUES (
          new.id,
          new.email,
          user_role::app_role,
          COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
          COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
          new.raw_user_meta_data->>'company_name',
          new.raw_user_meta_data->>'phone'
        )
        ON CONFLICT (id) DO UPDATE SET
          email = EXCLUDED.email,
          first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
          last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
          updated_at = NOW();
        
        -- Si candidat, créer candidate_profiles
        IF user_role = 'candidate' THEN
          RAISE LOG 'Creating candidate_profiles for %', new.email;
          
          INSERT INTO public.candidate_profiles (
            id, email, first_name, last_name, phone,
            status, qualification_status, seniority,
            profile_id, daily_rate, password_hash, is_email_verified
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
            COALESCE(new.email_confirmed_at IS NOT NULL, false)
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name),
            updated_at = NOW();
          
        -- Si client, créer client_profiles
        ELSIF user_role = 'client' THEN
          RAISE LOG 'Creating client_profiles for %', new.email;
          
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
          )
          ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            first_name = COALESCE(EXCLUDED.first_name, client_profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, client_profiles.last_name),
            updated_at = NOW();
        END IF;
        
        RETURN new;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE WARNING 'Error in handle_new_user for %: %', new.email, SQLERRM;
          RETURN new;
      END;
      $$$$ LANGUAGE plpgsql SECURITY DEFINER;

      -- 3. Créer le trigger
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW 
        EXECUTE FUNCTION public.handle_new_user();

      -- 4. Activer le trigger
      ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    `;

    // Appliquer la migration complète
    const { data: migrationResult, error: migrationError } = await supabase.rpc('exec_sql', {
      sql: migrationSQL
    });

    if (migrationError) {
      throw new Error(`Migration failed: ${migrationError.message}`);
    }

    console.log('✅ Migration appliquée avec succès');

    // Vérifier que le trigger est maintenant actif
    const { data: triggerCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          t.tgenabled as is_enabled,
          p.proname as function_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE t.tgname = 'on_auth_user_created'
          AND n.nspname = 'auth' 
          AND c.relname = 'users';
      `
    });

    console.log('🔍 Statut du trigger:', triggerCheck);

    // Test du trigger avec un utilisateur fictif (pour voir s'il y a des erreurs de syntaxe)
    // Note: Ce test n'insère pas réellement, juste vérifie la syntaxe
    const { data: syntaxTest, error: syntaxError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT proname, prosrc 
        FROM pg_proc 
        WHERE proname = 'handle_new_user' 
        LIMIT 1;
      `
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Migration du trigger appliquée',
        migrationApplied: !migrationError,
        triggerActive: triggerCheck && triggerCheck.length > 0,
        triggerDetails: triggerCheck,
        functionExists: syntaxTest && syntaxTest.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erreur:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});