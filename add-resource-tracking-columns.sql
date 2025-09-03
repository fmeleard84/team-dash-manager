-- Ajouter les colonnes pour le tracking des changements de ressources
ALTER TABLE hr_resource_assignments
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS completion_reason TEXT CHECK (
  completion_reason IN (
    'requirements_changed',
    'project_completed', 
    'candidate_unavailable',
    'client_request',
    'other'
  )
),
ADD COLUMN IF NOT EXISTS previous_assignment_id UUID REFERENCES hr_resource_assignments(id);

-- Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_completed_at 
ON hr_resource_assignments(completed_at) 
WHERE completed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_hr_resource_assignments_previous 
ON hr_resource_assignments(previous_assignment_id) 
WHERE previous_assignment_id IS NOT NULL;

-- Vérifier les colonnes
SELECT 
  column_name, 
  data_type, 
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'hr_resource_assignments'
  AND column_name IN ('completed_at', 'completion_reason', 'previous_assignment_id')
ORDER BY column_name;