-- =====================================================
-- FIX PERMANENT : TRIGGER DE CRÉATION DE PROFILS
-- Migration: 20250906_fix_trigger_final
-- =====================================================

-- 1. Supprimer les anciens triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;

-- 2. Supprimer l'ancienne fonction s'il y en a une
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 3. Créer la fonction handle_new_user correcte
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
      COALESCE(new.email_confirmed_at IS NOT NULL, false)
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

-- 4. Créer le trigger APRÈS INSERT sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- 5. S'assurer que le trigger est actif
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 6. Vérification et rapport final
DO $$
DECLARE
  trigger_count INTEGER;
  function_count INTEGER;
BEGIN
  -- Compter les triggers
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth' 
    AND c.relname = 'users' 
    AND t.tgname = 'on_auth_user_created';
  
  -- Compter les fonctions
  SELECT COUNT(*) INTO function_count
  FROM pg_proc 
  WHERE proname = 'handle_new_user';
  
  -- Rapport
  IF trigger_count > 0 AND function_count > 0 THEN
    RAISE NOTICE '✅ SUCCESS: Trigger on_auth_user_created est ACTIF avec fonction handle_new_user';
    RAISE NOTICE '🔧 Les nouveaux candidats auront automatiquement un profil créé';
  ELSE
    RAISE WARNING '❌ PROBLÈME: Trigger: %, Fonction: %', trigger_count, function_count;
  END IF;
END $$;