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

    console.log('🔧 Correction du trigger de création de profils candidats');

    // Exécuter la migration du trigger directement
    const triggerSQL = `
-- =====================================================
-- FIX PERMANENT : TRIGGER DE CRÉATION DE PROFILS
-- =====================================================

-- 1. Supprimer les anciens triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 2. Créer la fonction handle_new_user correcte
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
  
  -- Logger pour debug (visible dans les logs Supabase)
  RAISE LOG 'handle_new_user: Creating profiles for % with role %', new.email, user_role;
  
  -- Créer le profil général (pour tous les utilisateurs)
  INSERT INTO public.profiles (
    id, 
    email, 
    role, 
    first_name, 
    last_name, 
    company_name, 
    phone
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
  
  -- Si c'est un candidat, créer aussi candidate_profiles
  IF user_role = 'candidate' THEN
    RAISE LOG 'Creating candidate_profiles for %', new.email;
    
    INSERT INTO public.candidate_profiles (
      id,  -- ID universel (auth.uid)
      email,
      first_name,
      last_name,
      phone,
      status,
      qualification_status,
      seniority,
      profile_id,  -- NULL pour forcer l'onboarding
      daily_rate,
      password_hash,
      is_email_verified
    ) VALUES (
      new.id,  -- ID universel
      new.email,
      COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
      COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
      new.raw_user_meta_data->>'phone',
      'disponible',
      'pending',
      'junior',
      NULL,  -- profile_id NULL pour déclencher l'onboarding
      0,
      '',
      false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      first_name = COALESCE(EXCLUDED.first_name, candidate_profiles.first_name),
      last_name = COALESCE(EXCLUDED.last_name, candidate_profiles.last_name),
      updated_at = NOW();
    
  -- Si c'est un client, créer aussi client_profiles
  ELSIF user_role = 'client' THEN
    RAISE LOG 'Creating client_profiles for %', new.email;
    
    INSERT INTO public.client_profiles (
      id,  -- ID universel (auth.uid)
      email,
      first_name,
      last_name,
      company_name,
      phone,
      user_id  -- Garder pour compatibilité
    ) VALUES (
      new.id,  -- ID universel
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
      updated_at = NOW();
  END IF;
  
  RETURN new;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer la création de l'utilisateur
    RAISE WARNING 'Error in handle_new_user for %: %', new.email, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Créer le trigger APRÈS INSERT sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 4. S'assurer que le trigger est actif
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;
    `;

    // Diviser en plusieurs requêtes pour éviter les erreurs
    const statements = triggerSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];
    
    for (const stmt of statements) {
      if (stmt.trim()) {
        console.log(`Exécution: ${stmt.substring(0, 50)}...`);
        try {
          const { data, error } = await supabase.rpc('exec_sql', {
            sql: stmt
          });
          
          if (error) {
            console.error(`❌ Erreur SQL:`, error);
            results.push({ statement: stmt.substring(0, 100), success: false, error: error.message });
          } else {
            console.log('✅ Succès');
            results.push({ statement: stmt.substring(0, 100), success: true });
          }
        } catch (err) {
          console.error(`❌ Exception:`, err);
          results.push({ statement: stmt.substring(0, 100), success: false, error: err.message });
        }
      }
    }

    // Vérification finale
    const { data: triggerCheck, error: checkError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
          t.tgname as trigger_name,
          t.tgenabled as is_enabled
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE t.tgname = 'on_auth_user_created'
          AND n.nspname = 'auth' 
          AND c.relname = 'users';
      `
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Trigger de création de profils corrigé',
        executionResults: results,
        triggerStatus: triggerCheck,
        triggerActive: triggerCheck && triggerCheck.length > 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('❌ Erreur globale:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});