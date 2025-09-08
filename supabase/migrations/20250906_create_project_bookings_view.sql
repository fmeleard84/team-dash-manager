-- Migration pour créer une vue project_bookings compatible avec l'ancien code
-- Cette vue mappe hr_resource_assignments vers l'ancienne structure project_bookings

-- Supprimer la vue si elle existe
DROP VIEW IF EXISTS project_bookings CASCADE;

-- Créer la vue project_bookings qui pointe vers hr_resource_assignments
CREATE VIEW project_bookings AS
SELECT 
    hra.id,
    hra.project_id,
    hra.candidate_id,
    CASE 
      WHEN hra.booking_status = 'accepted' THEN 'confirmed'
      WHEN hra.booking_status = 'declined' THEN 'cancelled'
      WHEN hra.booking_status = 'recherche' THEN 'pending'
      ELSE hra.booking_status
    END as status,
    hra.created_at,
    hra.updated_at,
    hra.id as resource_assignment_id
FROM hr_resource_assignments hra
WHERE hra.candidate_id IS NOT NULL;

-- Donner les permissions sur la vue
GRANT SELECT ON project_bookings TO authenticated;

-- Commentaire pour documentation
COMMENT ON VIEW project_bookings IS 'Vue de compatibilité pour l''ancien système project_bookings. Mappe hr_resource_assignments vers l''ancienne structure pour éviter de casser le code existant.';