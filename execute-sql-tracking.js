import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcyNDU3OTMxOCwiZXhwIjoyMDQwMTU1MzE4fQ.gWednDnp8lWXKN7MNnMBRYCqVDWbgVQNHziAkcHtcH8';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function executeSql() {
  try {
    // Ajouter les colonnes
    const { data, error } = await supabase.rpc('exec_sql', {
      sql_query: `
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
      `
    });

    if (error) {
      console.error('Error executing SQL:', error);
      return;
    }

    console.log('✅ Tracking columns added successfully');

    // Vérifier les colonnes
    const { data: columns, error: colError } = await supabase.rpc('exec_sql', {
      sql_query: `
        SELECT 
          column_name, 
          data_type, 
          is_nullable
        FROM information_schema.columns
        WHERE table_schema = 'public' 
          AND table_name = 'hr_resource_assignments'
          AND column_name IN ('completed_at', 'completion_reason', 'previous_assignment_id')
        ORDER BY column_name;
      `
    });

    if (colError) {
      console.error('Error checking columns:', colError);
      return;
    }

    console.log('📋 Column check result:', columns);

  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

executeSql();