-- Migration pour ajouter le système de validation par IA

-- 1. Ajouter les colonnes nécessaires à candidate_profiles
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS is_validated BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS validation_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_method VARCHAR(50) DEFAULT 'ai_test',
ADD COLUMN IF NOT EXISTS test_attempts INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_test_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS validation_notes TEXT;

-- 2. Créer un index pour les candidats non validés
CREATE INDEX IF NOT EXISTS idx_candidate_validation_status 
ON candidate_profiles(is_validated, user_id);

-- 3. Mettre à jour la valeur par défaut de is_available pour les nouveaux candidats
ALTER TABLE candidate_profiles 
ALTER COLUMN is_available SET DEFAULT false;

-- 4. Créer une table pour l'historique des tests
CREATE TABLE IF NOT EXISTS candidate_test_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE CASCADE,
  test_date TIMESTAMPTZ DEFAULT NOW(),
  score INTEGER CHECK (score >= 0 AND score <= 10),
  status VARCHAR(20) CHECK (status IN ('validated', 'pending', 'rejected')),
  questions JSONB,
  answers JSONB,
  ai_feedback TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  review_date TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Créer un trigger pour activer automatiquement les candidats validés
CREATE OR REPLACE FUNCTION auto_activate_validated_candidate()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le candidat est validé, l'activer automatiquement
  IF NEW.is_validated = true AND OLD.is_validated = false THEN
    NEW.is_available := true;
    NEW.validation_date := NOW();
    
    -- Créer une notification pour le candidat
    INSERT INTO notifications (
      user_id,
      title,
      description,
      type,
      priority
    ) VALUES (
      NEW.user_id,
      'Profil validé !',
      'Félicitations ! Votre profil a été validé. Vous pouvez maintenant accéder aux missions disponibles.',
      'success',
      'high'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_activate_candidate ON candidate_profiles;
CREATE TRIGGER trigger_auto_activate_candidate
BEFORE UPDATE ON candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION auto_activate_validated_candidate();

-- 6. Créer une fonction pour vérifier si un candidat peut repasser le test
CREATE OR REPLACE FUNCTION can_retake_test(p_candidate_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_last_test_date TIMESTAMPTZ;
  v_test_attempts INTEGER;
  v_is_validated BOOLEAN;
BEGIN
  SELECT last_test_date, test_attempts, is_validated
  INTO v_last_test_date, v_test_attempts, v_is_validated
  FROM candidate_profiles
  WHERE id = p_candidate_id;
  
  -- Si déjà validé, pas besoin de repasser
  IF v_is_validated THEN
    RETURN FALSE;
  END IF;
  
  -- Première tentative
  IF v_test_attempts IS NULL OR v_test_attempts = 0 THEN
    RETURN TRUE;
  END IF;
  
  -- Attendre 24h entre chaque tentative
  IF v_last_test_date IS NOT NULL AND 
     v_last_test_date + INTERVAL '24 hours' > NOW() THEN
    RETURN FALSE;
  END IF;
  
  -- Maximum 3 tentatives
  IF v_test_attempts >= 3 THEN
    RETURN FALSE;
  END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- 7. Mettre à jour les candidats existants pour qu'ils soient marqués comme non validés
UPDATE candidate_profiles 
SET is_validated = false 
WHERE is_validated IS NULL;

-- 8. Créer une vue pour les candidats en attente de validation
CREATE OR REPLACE VIEW pending_validations AS
SELECT 
  cp.id,
  cp.user_id,
  cp.first_name,
  cp.last_name,
  cp.email,
  hp.name as job_title,
  hc.name as category,
  cp.seniority,
  cp.qualification_score,
  cp.qualification_status,
  cp.created_at,
  cth.test_date as last_test_date,
  cth.score as last_test_score
FROM candidate_profiles cp
LEFT JOIN hr_profiles hp ON cp.profile_id = hp.id
LEFT JOIN hr_categories hc ON hp.category_id = hc.id
LEFT JOIN LATERAL (
  SELECT test_date, score
  FROM candidate_test_history
  WHERE candidate_id = cp.id
  ORDER BY test_date DESC
  LIMIT 1
) cth ON true
WHERE cp.is_validated = false
  AND cp.qualification_status = 'pending'
ORDER BY cp.created_at DESC;

-- 9. Politique RLS pour candidate_test_history
ALTER TABLE candidate_test_history ENABLE ROW LEVEL SECURITY;

-- Les candidats peuvent voir leur propre historique
CREATE POLICY "Candidates can view own test history" ON candidate_test_history
  FOR SELECT
  USING (
    candidate_id IN (
      SELECT id FROM candidate_profiles 
      WHERE user_id = auth.uid()
    )
  );

-- Les admins peuvent tout voir et modifier
CREATE POLICY "Admins can manage all test history" ON candidate_test_history
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'hr_manager')
    )
  );

-- 10. Notification automatique pour les admins quand un candidat est en attente
CREATE OR REPLACE FUNCTION notify_admin_pending_validation()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut passe à 'pending'
  IF NEW.qualification_status = 'pending' AND 
     (OLD.qualification_status IS NULL OR OLD.qualification_status != 'pending') THEN
    
    -- Créer une notification pour tous les admins
    INSERT INTO notifications (
      user_id,
      title,
      description,
      type,
      priority,
      data
    )
    SELECT 
      p.id,
      'Validation candidat requise',
      format('Le candidat %s %s (score: %s/10) attend une validation manuelle.', 
             NEW.first_name, 
             NEW.last_name, 
             NEW.qualification_score),
      'admin_action',
      'high',
      jsonb_build_object(
        'candidate_id', NEW.id,
        'candidate_name', NEW.first_name || ' ' || NEW.last_name,
        'score', NEW.qualification_score
      )
    FROM profiles p
    WHERE p.role IN ('admin', 'hr_manager');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_notify_pending_validation ON candidate_profiles;
CREATE TRIGGER trigger_notify_pending_validation
AFTER UPDATE ON candidate_profiles
FOR EACH ROW
EXECUTE FUNCTION notify_admin_pending_validation();