-- Migration pour synchroniser le téléphone entre profiles et candidate_profiles

-- 1. D'abord, synchronisons les données existantes
-- Copier les téléphones de candidate_profiles vers profiles où manquant
UPDATE profiles p
SET phone = cp.phone
FROM candidate_profiles cp
WHERE p.id = cp.user_id
  AND p.phone IS NULL
  AND cp.phone IS NOT NULL;

-- 2. Créer un trigger pour synchroniser les mises à jour du téléphone
-- Quand on met à jour candidate_profiles, on met aussi à jour profiles
CREATE OR REPLACE FUNCTION sync_candidate_phone_to_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le téléphone dans profiles quand il change dans candidate_profiles
  IF NEW.phone IS DISTINCT FROM OLD.phone THEN
    UPDATE profiles 
    SET phone = NEW.phone,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  -- Synchroniser aussi first_name et last_name pour cohérence
  IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
    UPDATE profiles 
    SET first_name = NEW.first_name,
        last_name = NEW.last_name,
        updated_at = NOW()
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS sync_candidate_phone ON candidate_profiles;

-- Créer le trigger
CREATE TRIGGER sync_candidate_phone
AFTER UPDATE ON candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_candidate_phone_to_profile();

-- 3. Créer aussi un trigger inverse pour synchroniser de profiles vers candidate_profiles
CREATE OR REPLACE FUNCTION sync_profile_phone_to_candidate()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le téléphone dans candidate_profiles quand il change dans profiles
  IF NEW.role = 'candidate' THEN
    IF NEW.phone IS DISTINCT FROM OLD.phone THEN
      UPDATE candidate_profiles 
      SET phone = NEW.phone
      WHERE user_id = NEW.id;
    END IF;
    
    -- Synchroniser aussi first_name et last_name pour cohérence
    IF NEW.first_name IS DISTINCT FROM OLD.first_name OR NEW.last_name IS DISTINCT FROM OLD.last_name THEN
      UPDATE candidate_profiles 
      SET first_name = NEW.first_name,
          last_name = NEW.last_name
      WHERE user_id = NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS sync_profile_phone ON profiles;

-- Créer le trigger
CREATE TRIGGER sync_profile_phone
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_phone_to_candidate();

-- 4. S'assurer que lors de l'inscription, le téléphone est bien sauvé dans les deux tables
-- Mise à jour de la fonction handle_new_user pour inclure le téléphone
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Insert into profiles
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
  
  -- Si c'est un candidat, créer aussi candidate_profile
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