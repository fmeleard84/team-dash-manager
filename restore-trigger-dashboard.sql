-- ⚠️ À EXÉCUTER DANS LE DASHBOARD SUPABASE SQL
-- https://supabase.com/dashboard/project/egdelmcijszuapcpglsy/sql

-- Cette requête recrée le trigger qui existait avant la migration ID universel
-- et qui créait automatiquement les profils lors de l'inscription

-- 1. Créer la fonction (si elle n'existe pas)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Créer le profil général
  INSERT INTO public.profiles (
    id, 
    email, 
    role,
    first_name,
    last_name,
    phone,
    company_name
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'candidate')::app_role,
    COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
    COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name'
  ) ON CONFLICT (id) DO NOTHING;

  -- Si candidat, créer candidate_profiles
  IF COALESCE(new.raw_user_meta_data->>'role', 'candidate') = 'candidate' THEN
    INSERT INTO public.candidate_profiles (
      id,
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
      new.id,
      new.email,
      COALESCE(new.raw_user_meta_data->>'first_name', new.raw_user_meta_data->>'firstName', ''),
      COALESCE(new.raw_user_meta_data->>'last_name', new.raw_user_meta_data->>'lastName', ''),
      new.raw_user_meta_data->>'phone',
      'disponible',
      'pending',
      'junior',
      0,
      '',
      false
    ) ON CONFLICT (id) DO NOTHING;
    
  -- Si client, créer client_profiles
  ELSIF new.raw_user_meta_data->>'role' = 'client' THEN
    INSERT INTO public.client_profiles (
      id,
      email,
      first_name,
      last_name,
      company_name,
      phone,
      user_id
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
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Créer le trigger sur auth.users
-- Note: Ceci ne fonctionnera QUE dans le dashboard Supabase
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 3. Vérification
SELECT 
  'Trigger créé avec succès' AS status,
  tgname AS trigger_name
FROM pg_trigger 
WHERE tgname = 'on_auth_user_created';