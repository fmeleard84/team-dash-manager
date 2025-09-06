-- Migration pour créer le trigger de création automatique des profils
-- Cette migration doit être exécutée via Supabase CLI ou dans le dashboard

-- 1. Supprimer les anciens triggers et fonctions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- 2. Créer la fonction de gestion des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Log pour debug
  RAISE LOG 'handle_new_user triggered for user %', new.id;
  
  -- Déterminer le rôle (candidat par défaut)
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
  
  -- Si c'est un candidat, créer le profil candidat
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
  
  -- Si c'est un client, créer le profil client  
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
    -- Log l'erreur mais ne pas bloquer la création de l'utilisateur
    RAISE WARNING 'Erreur dans handle_new_user pour %: %', new.email, SQLERRM;
    RETURN new;
END;
$$;

-- 3. Créer le trigger sur auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. S'assurer que le trigger est activé
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- 5. Créer aussi un trigger de mise à jour pour gérer la confirmation d'email
CREATE OR REPLACE FUNCTION public.handle_user_email_confirmed()
RETURNS trigger 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si l'email vient d'être confirmé
  IF old.email_confirmed_at IS NULL AND new.email_confirmed_at IS NOT NULL THEN
    -- Mettre à jour le statut dans candidate_profiles
    UPDATE public.candidate_profiles
    SET is_email_verified = true
    WHERE id = new.id;
  END IF;
  
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_email_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_email_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (old.email_confirmed_at IS DISTINCT FROM new.email_confirmed_at)
  EXECUTE FUNCTION public.handle_user_email_confirmed();

-- 6. Vérification finale
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  ) THEN
    RAISE NOTICE 'Trigger on_auth_user_created créé avec succès';
  ELSE
    RAISE WARNING 'Le trigger on_auth_user_created n''a pas pu être créé';
  END IF;
END $$;