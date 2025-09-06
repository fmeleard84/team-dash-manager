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

-- 5. Créer les profils manquants pour les utilisateurs existants
DO $$
DECLARE
  user_record RECORD;
  user_role TEXT;
BEGIN
  -- Pour chaque utilisateur dans auth.users
  FOR user_record IN 
    SELECT id, email, raw_user_meta_data, email_confirmed_at
    FROM auth.users
    WHERE id NOT IN (SELECT id FROM profiles)
  LOOP
    -- Déterminer le rôle
    user_role := COALESCE(
      user_record.raw_user_meta_data->>'role',
      CASE 
        WHEN user_record.email LIKE '%candidate%' THEN 'candidate'
        WHEN user_record.email LIKE '%ressource%' THEN 'candidate'
        WHEN user_record.email LIKE '%client%' THEN 'client'
        ELSE 'candidate'
      END
    );
    
    -- Créer le profil général
    INSERT INTO public.profiles (id, email, role)
    VALUES (user_record.id, user_record.email, user_role::app_role)
    ON CONFLICT DO NOTHING;
    
    -- Si candidat et pas de profil candidat
    IF user_role = 'candidate' AND 
       NOT EXISTS (SELECT 1 FROM candidate_profiles WHERE id = user_record.id) THEN
      
      INSERT INTO public.candidate_profiles (
        id, email, first_name, last_name, status, 
        qualification_status, seniority, daily_rate, 
        password_hash, is_email_verified
      )
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'first_name', ''),
        COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
        'disponible',
        'pending',
        'junior',
        0,
        '',
        user_record.email_confirmed_at IS NOT NULL
      )
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Created missing candidate profile for %', user_record.email;
    END IF;
    
    -- Si client et pas de profil client
    IF user_role = 'client' AND 
       NOT EXISTS (SELECT 1 FROM client_profiles WHERE id = user_record.id) THEN
      
      INSERT INTO public.client_profiles (
        id, email, first_name, last_name, user_id
      )
      VALUES (
        user_record.id,
        user_record.email,
        COALESCE(user_record.raw_user_meta_data->>'first_name', ''),
        COALESCE(user_record.raw_user_meta_data->>'last_name', ''),
        user_record.id::text
      )
      ON CONFLICT DO NOTHING;
      
      RAISE NOTICE 'Created missing client profile for %', user_record.email;
    END IF;
  END LOOP;
END $$;

-- 6. Vérification finale
DO $$
DECLARE
  trigger_count INTEGER;
BEGIN
  -- Compter les triggers sur auth.users
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON t.tgrelid = c.oid
  JOIN pg_namespace n ON c.relnamespace = n.oid
  WHERE n.nspname = 'auth' AND c.relname = 'users';
  
  RAISE NOTICE '✅ Triggers sur auth.users: %', trigger_count;
  
  -- Vérifier que le trigger spécifique existe
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE '✅ Trigger on_auth_user_created est actif';
  ELSE
    RAISE WARNING '❌ Trigger on_auth_user_created n''existe pas!';
  END IF;
END $$;