import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.K3m7mUvhUJcSmuMQs-yXnhXQRMBc_CJwmz-dIX6bU1Q'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixStatusConstraint() {
  try {
    console.log('🔧 Fixing candidate_profiles status constraint...')

    // Execute SQL to fix the constraint
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: `
        -- Drop the old constraint if it exists
        ALTER TABLE public.candidate_profiles
        DROP CONSTRAINT IF EXISTS candidate_profiles_status_check;

        -- Add the new constraint with correct values
        ALTER TABLE public.candidate_profiles
        ADD CONSTRAINT candidate_profiles_status_check
        CHECK (status IN ('qualification', 'disponible', 'en_pause', 'indisponible'));

        -- Update any invalid statuses to a valid default
        UPDATE public.candidate_profiles
        SET status = 'disponible'
        WHERE status IS NULL OR status NOT IN ('qualification', 'disponible', 'en_pause', 'indisponible');

        -- Set default value
        ALTER TABLE public.candidate_profiles
        ALTER COLUMN status SET DEFAULT 'disponible';
      `
    })

    if (error) {
      console.error('❌ Error:', error)
      return
    }

    console.log('✅ Constraint fixed successfully!')

    // Verify the fix
    const { data: testUpdate, error: testError } = await supabase
      .from('candidate_profiles')
      .update({ status: 'disponible' })
      .eq('id', '771a8efe-5a0d-4a7c-86a0-1881784f8850')

    if (testError) {
      console.error('❌ Test update failed:', testError)
    } else {
      console.log('✅ Test update successful!')
    }

  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

fixStatusConstraint()