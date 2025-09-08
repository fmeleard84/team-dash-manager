import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://egdelmcijszuapcpglsy.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVnZGVsbWNpanN6dWFwY3BnbHN5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDE2MjIwMCwiZXhwIjoyMDY5NzM4MjAwfQ.oYNLLJEW8Qv4zcEPUb-wuQR3SZ2pTKDR0M3pchP3fII';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkConstraint() {
  console.log('=== VÉRIFICATION CONTRAINTE chk_attendee_target ===\n');
  
  // Vérifier la contrainte
  const { data: constraint, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conname = 'chk_attendee_target'
    `
  });

  if (constraint) {
    console.log('Contrainte trouvée:', constraint);
  }

  // Vérifier toutes les contraintes sur project_event_attendees
  const { data: allConstraints } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT conname, contype, pg_get_constraintdef(oid) as definition
      FROM pg_constraint 
      WHERE conrelid = 'project_event_attendees'::regclass
    `
  });

  console.log('\n=== TOUTES LES CONTRAINTES ===');
  console.log(allConstraints);
}

checkConstraint();
