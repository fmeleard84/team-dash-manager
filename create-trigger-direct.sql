-- Suppression des anciens triggers et fonctions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS handle_new_user ON auth.users CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Création de la fonction de gestion des nouveaux utilisateurs
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_role TEXT;
BEGIN
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
    RAISE WARNING 'Erreur dans handle_new_user pour %: %', new.email, SQLERRM;
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Création du trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Activer le trigger
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

-- Vérification
SELECT 
  t.tgname AS "Trigger Name",
  CASE t.tgenabled 
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    WHEN 'R' THEN 'REPLICA'
    WHEN 'A' THEN 'ALWAYS'
  END AS "Status",
  p.proname AS "Function"
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname = 'on_auth_user_created';