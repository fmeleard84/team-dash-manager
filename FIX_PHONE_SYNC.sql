-- Fix pour synchroniser le téléphone entre profiles et candidate_profiles
-- et assurer l'affichage correct dans les paramètres candidat

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
    SET phone = NEW.phone
    WHERE id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS sync_candidate_phone ON candidate_profiles;

-- Créer le trigger
CREATE TRIGGER sync_candidate_phone
AFTER UPDATE OF phone ON candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION sync_candidate_phone_to_profile();

-- 3. Créer aussi un trigger inverse pour synchroniser de profiles vers candidate_profiles
CREATE OR REPLACE FUNCTION sync_profile_phone_to_candidate()
RETURNS TRIGGER AS $$
BEGIN
  -- Mettre à jour le téléphone dans candidate_profiles quand il change dans profiles
  IF NEW.phone IS DISTINCT FROM OLD.phone AND NEW.role = 'candidate' THEN
    UPDATE candidate_profiles 
    SET phone = NEW.phone
    WHERE user_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS sync_profile_phone ON profiles;

-- Créer le trigger
CREATE TRIGGER sync_profile_phone
AFTER UPDATE OF phone ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_phone_to_candidate();

-- 4. Afficher les résultats pour vérifier
SELECT 
  p.id,
  p.email,
  p.phone as profile_phone,
  cp.phone as candidate_phone,
  p.first_name,
  p.last_name
FROM profiles p
LEFT JOIN candidate_profiles cp ON p.id = cp.user_id
WHERE p.role = 'candidate'
ORDER BY p.created_at DESC;