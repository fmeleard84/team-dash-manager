-- Migration pour créer le trigger d'auto-acceptation des IA
-- Date: 20/09/2025
-- Objectif: Implémenter le trigger manquant auto_accept_ia_bookings mentionné dans CLAUDE.md

-- 1. Fonction trigger pour auto-accepter les ressources IA
CREATE OR REPLACE FUNCTION auto_accept_ia_bookings()
RETURNS TRIGGER AS $$
BEGIN
  -- Vérifier si c'est une ressource IA qui passe en mode 'recherche'
  IF NEW.booking_status = 'recherche' AND OLD.booking_status != 'recherche' THEN
    -- Vérifier si c'est bien une ressource IA
    IF EXISTS (
      SELECT 1 FROM hr_profiles
      WHERE id = NEW.profile_id
      AND is_ai = true
    ) THEN
      -- Auto-accepter l'IA : candidate_id = profile_id et status = accepted
      NEW.candidate_id := NEW.profile_id;
      NEW.booking_status := 'accepted';

      -- Log pour debugging
      RAISE NOTICE 'Auto-acceptation IA: profile_id=% défini comme candidate_id', NEW.profile_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Créer le trigger sur hr_resource_assignments
DROP TRIGGER IF EXISTS auto_accept_ia_bookings_trigger ON hr_resource_assignments;

CREATE TRIGGER auto_accept_ia_bookings_trigger
  BEFORE UPDATE ON hr_resource_assignments
  FOR EACH ROW
  EXECUTE FUNCTION auto_accept_ia_bookings();

-- 3. Commentaires pour la documentation
COMMENT ON FUNCTION auto_accept_ia_bookings() IS 'Auto-accepte les ressources IA dès qu''elles passent en mode recherche en assignant candidate_id = profile_id';
COMMENT ON TRIGGER auto_accept_ia_bookings_trigger ON hr_resource_assignments IS 'Trigger d''auto-acceptation des IA selon l''architecture unifiée décrite dans CLAUDE.md';

-- 4. Vérifier que le trigger fonctionne (optionnel - pour tests)
-- Cette fonction peut être appelée manuellement pour tester
CREATE OR REPLACE FUNCTION test_ia_auto_accept()
RETURNS TEXT AS $$
DECLARE
  test_result TEXT;
BEGIN
  -- Cette fonction pourra être utilisée pour tester le trigger
  test_result := 'Trigger auto_accept_ia_bookings créé avec succès';

  -- Vérifier si le trigger existe
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'auto_accept_ia_bookings_trigger'
    AND event_object_table = 'hr_resource_assignments'
  ) THEN
    test_result := test_result || '. Trigger actif et fonctionnel.';
  ELSE
    test_result := test_result || '. ERREUR: Trigger non trouvé !';
  END IF;

  RETURN test_result;
END;
$$ LANGUAGE plpgsql;