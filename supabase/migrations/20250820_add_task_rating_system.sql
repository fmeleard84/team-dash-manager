-- Migration pour ajouter le système de notation des tâches

-- Table pour stocker les notations des tâches
CREATE TABLE IF NOT EXISTS task_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES kanban_cards(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES candidate_profiles(id) ON DELETE SET NULL,
  client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Un client ne peut noter qu'une fois par tâche
  UNIQUE(task_id, client_id)
);

-- Indexes pour améliorer les performances
CREATE INDEX idx_task_ratings_task_id ON task_ratings(task_id);
CREATE INDEX idx_task_ratings_candidate_id ON task_ratings(candidate_id);
CREATE INDEX idx_task_ratings_project_id ON task_ratings(project_id);
CREATE INDEX idx_task_ratings_client_id ON task_ratings(client_id);

-- Vue pour obtenir la moyenne des notations par candidat
CREATE OR REPLACE VIEW candidate_ratings_summary AS
SELECT 
  candidate_id,
  COUNT(*) as total_ratings,
  AVG(rating)::DECIMAL(3,2) as average_rating,
  MIN(rating) as min_rating,
  MAX(rating) as max_rating,
  MAX(created_at) as last_rating_date,
  COUNT(DISTINCT project_id) as projects_rated
FROM task_ratings
WHERE candidate_id IS NOT NULL
GROUP BY candidate_id;

-- Vue pour obtenir les statistiques de notation par projet
CREATE OR REPLACE VIEW project_ratings_summary AS
SELECT 
  project_id,
  COUNT(*) as total_ratings,
  AVG(rating)::DECIMAL(3,2) as average_rating,
  COUNT(DISTINCT candidate_id) as candidates_rated,
  MAX(created_at) as last_rating_date
FROM task_ratings
GROUP BY project_id;

-- RLS (Row Level Security)
ALTER TABLE task_ratings ENABLE ROW LEVEL SECURITY;

-- Les clients peuvent voir et créer leurs propres notations
CREATE POLICY "Clients can view their own ratings"
  ON task_ratings FOR SELECT
  USING (
    auth.uid() = client_id OR
    auth.uid() = candidate_id OR
    auth.uid() IN (
      SELECT owner_id FROM projects WHERE id = project_id
    )
  );

CREATE POLICY "Clients can create ratings for their projects"
  ON task_ratings FOR INSERT
  WITH CHECK (
    auth.uid() = client_id AND
    auth.uid() IN (
      SELECT owner_id FROM projects WHERE id = project_id
    )
  );

-- Les candidats peuvent voir leurs notations mais pas les modifier
CREATE POLICY "Candidates can view their ratings"
  ON task_ratings FOR SELECT
  USING (
    auth.uid() = candidate_id
  );

-- Fonction pour notifier un candidat quand il reçoit une nouvelle note
CREATE OR REPLACE FUNCTION notify_candidate_on_rating()
RETURNS TRIGGER AS $$
BEGIN
  -- Créer une notification pour le candidat
  IF NEW.candidate_id IS NOT NULL THEN
    INSERT INTO notifications (
      user_id,
      title,
      message,
      type,
      related_id,
      related_type
    ) VALUES (
      NEW.candidate_id,
      'Nouvelle évaluation reçue',
      'Vous avez reçu une note de ' || NEW.rating || ' étoiles pour une tâche',
      'rating',
      NEW.task_id,
      'task'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour les notifications
CREATE TRIGGER on_task_rating_created
  AFTER INSERT ON task_ratings
  FOR EACH ROW
  EXECUTE FUNCTION notify_candidate_on_rating();

-- Fonction pour calculer le nouveau tarif horaire basé sur la moyenne des notes
CREATE OR REPLACE FUNCTION calculate_candidate_hourly_rate(p_candidate_id UUID)
RETURNS DECIMAL AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_base_rate DECIMAL := 50.00; -- Tarif de base en euros
  v_bonus_per_star DECIMAL := 5.00; -- Bonus par étoile au-dessus de 3
BEGIN
  -- Récupérer la moyenne des notes
  SELECT average_rating INTO v_avg_rating
  FROM candidate_ratings_summary
  WHERE candidate_id = p_candidate_id;
  
  -- Si pas de notes, retourner le tarif de base
  IF v_avg_rating IS NULL THEN
    RETURN v_base_rate;
  END IF;
  
  -- Calculer le tarif avec bonus/malus
  -- 3 étoiles = tarif de base
  -- Chaque étoile au-dessus de 3 = +5€
  -- Chaque étoile en-dessous de 3 = -5€
  RETURN v_base_rate + ((v_avg_rating - 3) * v_bonus_per_star);
END;
$$ LANGUAGE plpgsql;

-- Ajouter une colonne pour stocker le tarif calculé dans le profil candidat
ALTER TABLE candidate_profiles 
ADD COLUMN IF NOT EXISTS hourly_rate DECIMAL(10,2) DEFAULT 50.00,
ADD COLUMN IF NOT EXISTS rating_average DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS rating_count INTEGER DEFAULT 0;

-- Fonction pour mettre à jour automatiquement le tarif horaire après chaque notation
CREATE OR REPLACE FUNCTION update_candidate_hourly_rate()
RETURNS TRIGGER AS $$
DECLARE
  v_new_rate DECIMAL;
  v_avg_rating DECIMAL(3,2);
  v_rating_count INTEGER;
BEGIN
  -- Calculer le nouveau tarif
  v_new_rate := calculate_candidate_hourly_rate(NEW.candidate_id);
  
  -- Récupérer les statistiques
  SELECT average_rating, total_ratings 
  INTO v_avg_rating, v_rating_count
  FROM candidate_ratings_summary
  WHERE candidate_id = NEW.candidate_id;
  
  -- Mettre à jour le profil candidat
  UPDATE candidate_profiles
  SET 
    hourly_rate = v_new_rate,
    rating_average = v_avg_rating,
    rating_count = v_rating_count,
    updated_at = NOW()
  WHERE id = NEW.candidate_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour le tarif après chaque nouvelle note
CREATE TRIGGER update_hourly_rate_on_rating
  AFTER INSERT OR UPDATE ON task_ratings
  FOR EACH ROW
  WHEN (NEW.candidate_id IS NOT NULL)
  EXECUTE FUNCTION update_candidate_hourly_rate();

-- Commentaires pour la documentation
COMMENT ON TABLE task_ratings IS 'Stocke les évaluations des tâches terminées par les clients';
COMMENT ON COLUMN task_ratings.rating IS 'Note de 1 à 5 étoiles';
COMMENT ON COLUMN task_ratings.comment IS 'Commentaire optionnel du client sur la qualité du livrable';
COMMENT ON VIEW candidate_ratings_summary IS 'Vue agrégée des notations par candidat';
COMMENT ON FUNCTION calculate_candidate_hourly_rate IS 'Calcule le tarif horaire en fonction de la moyenne des notes';